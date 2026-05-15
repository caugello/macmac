import bcrypt
from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy.orm import Session

from services.framework.tracing import traced
from services.framework.user_context import require_user_context
from services.shared.schemas import auth as auth_schemas

from .models import Group, User
from .security import create_access_token, keycloak_openid, verify_password

# Pre-computed valid bcrypt hash for constant-time comparison on unknown usernames
_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt()).decode("utf-8")


@traced
async def login(data: auth_schemas.LoginRequest, db: Session) -> auth_schemas.LoginResponse:
    """
    Authenticate user via Keycloak and return token.
    Falls back to local authentication if Keycloak fails.
    """
    try:
        # Try Keycloak authentication first
        token_response = keycloak_openid.token(
            username=data.username, password=data.password, grant_type="password"
        )

        access_token = token_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get user info from Keycloak
        user_info = keycloak_openid.userinfo(access_token)
        keycloak_id = user_info.get("sub")
        username = user_info.get("preferred_username") or user_info.get("username")
        email = user_info.get("email", f"{username}@example.com")

        # Sync user to local database
        user = db.query(User).filter(User.keycloak_id == keycloak_id).first()

        if not user:
            # Check if user exists by email (might have been created locally)
            user = db.query(User).filter(User.email == email).first()
            if user:
                # Link existing user to Keycloak
                user.keycloak_id = keycloak_id
                user.username = username
                user.is_active = True
                db.commit()
                db.refresh(user)
            else:
                # Create new user from Keycloak info
                user = User(
                    username=username,
                    email=email,
                    keycloak_id=keycloak_id,
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
        else:
            # Update existing user info
            user.username = username
            user.email = email
            db.commit()

        # Get user's groups from local database
        group_ids = [group.id for group in user.groups]

        # Create local JWT with user's local ID (not the raw Keycloak token)
        token = create_access_token(user.id, user.username, group_ids)

        return auth_schemas.LoginResponse(
            access_token=token,
            token_type="bearer",
            user=auth_schemas.UserOut(
                id=user.id,
                username=user.username,
                email=user.email,
                groups=group_ids,
            ),
        )

    except Exception as keycloak_error:
        # Log Keycloak error for debugging but don't expose to user
        import logging

        logger = logging.getLogger(__name__)
        logger.warning(
            f"Keycloak authentication failed for user '{data.username}': {keycloak_error}"
        )

        # Fall back to local authentication
        # Check if user exists in DB with local password
        user = db.query(User).filter(User.username == data.username).first()

        # Always hash password to prevent timing attacks (even if user doesn't exist)
        if not user:
            verify_password(data.password, _DUMMY_HASH)
            raise HTTPException(status_code=401, detail="Invalid username or password") from None

        if not user.hashed_password or not verify_password(data.password, user.hashed_password):
            logger.warning(f"Failed login attempt for user '{data.username}'")
            raise HTTPException(status_code=401, detail="Invalid username or password") from None

        if not user.is_active:
            logger.warning(f"Login attempt for inactive user '{data.username}'")
            raise HTTPException(status_code=401, detail="Invalid username or password") from None

        # Create self-signed token for local auth
        group_ids = [group.id for group in user.groups]
        token = create_access_token(user.id, user.username, group_ids)

        return auth_schemas.LoginResponse(
            access_token=token,
            token_type="bearer",
            user=auth_schemas.UserOut(
                id=user.id,
                username=user.username,
                email=user.email,
                groups=group_ids,
            ),
        )


@traced
async def get_current_user(db: Session, path_params: dict) -> auth_schemas.UserOut:
    """Get current user info from token user_id"""
    user_ctx = require_user_context()

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return auth_schemas.UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        groups=[group.id for group in user.groups],
    )


@traced
async def create_group(data: auth_schemas.GroupCreate, db: Session) -> auth_schemas.GroupOut:
    """Create a new group with current user as owner"""
    user_ctx = require_user_context()

    # Create group
    group = Group(
        name=data.name,
        owner_id=user_ctx.user_id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Add owner to group members
    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if user:
        user.groups.append(group)
        db.commit()

    return auth_schemas.GroupOut(
        id=group.id,
        name=group.name,
        owner_id=group.owner_id,
        member_count=len(group.members),
    )


@traced
async def list_groups(db: Session, query_params: dict) -> auth_schemas.GroupListResponse:
    """List groups the current user is a member of"""
    user_ctx = require_user_context()

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    groups = [
        auth_schemas.GroupOut(
            id=group.id,
            name=group.name,
            owner_id=group.owner_id,
            member_count=len(group.members),
        )
        for group in user.groups
    ]

    return auth_schemas.GroupListResponse(total=len(groups), data=groups)


@traced
async def add_user_to_group(data: auth_schemas.AddMemberRequest, path_params: dict, db: Session):
    """Add a user to a group (must be group owner)"""
    user_ctx = require_user_context()
    group_id = UUID4(path_params["group_id"])

    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if current user is owner
    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can add members")

    # Find user to add
    user_to_add = db.query(User).filter(User.username == data.username).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail=f"User '{data.username}' not found")

    # Check if user is already a member
    if user_to_add in group.members:
        raise HTTPException(status_code=400, detail="User is already a member of this group")

    # Add user to group
    group.members.append(user_to_add)
    db.commit()

    return {"message": f"User '{data.username}' added to group '{group.name}'"}


@traced
async def remove_user_from_group(path_params: dict, db: Session):
    """Remove a user from a group (must be group owner)"""
    user_ctx = require_user_context()
    group_id = UUID4(path_params["group_id"])
    user_id = UUID4(path_params["user_id"])

    # Get group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if current user is owner
    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can remove members")

    # Find user to remove
    user_to_remove = db.query(User).filter(User.id == user_id).first()
    if not user_to_remove:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user is a member
    if user_to_remove not in group.members:
        raise HTTPException(status_code=400, detail="User is not a member of this group")

    # Don't allow owner to remove themselves
    if user_id == user_ctx.user_id:
        raise HTTPException(
            status_code=400,
            detail="Group owner cannot remove themselves. Delete the group instead.",
        )

    # Remove user from group
    group.members.remove(user_to_remove)
    db.commit()

    return {"message": f"User removed from group '{group.name}'"}
