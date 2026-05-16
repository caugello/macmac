import logging

from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy.orm import Session

from services.framework.tracing import traced
from services.framework.user_context import require_user_context
from services.shared.schemas import auth as auth_schemas

from .models import Group, User
from .security import create_access_token, verify_firebase_token

logger = logging.getLogger(__name__)


@traced
async def login(data: auth_schemas.FirebaseLoginRequest, db: Session) -> auth_schemas.LoginResponse:
    try:
        decoded_token = verify_firebase_token(data.id_token)
    except ValueError as e:
        logger.warning(f"Firebase token domain/verification check failed: {e}")
        raise HTTPException(status_code=403, detail=str(e)) from None
    except Exception as e:
        logger.warning(f"Firebase token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Firebase token") from None

    firebase_uid = decoded_token["uid"]
    email = decoded_token["email"]
    name = decoded_token.get("name", email.split("@")[0])

    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.firebase_uid = firebase_uid
            user.username = name
            user.is_active = True
            db.commit()
            db.refresh(user)
        else:
            user = User(
                username=name,
                email=email,
                firebase_uid=firebase_uid,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        user.username = name
        user.email = email
        db.commit()

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
    user_ctx = require_user_context()

    group = Group(
        name=data.name,
        owner_id=user_ctx.user_id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

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
    user_ctx = require_user_context()
    group_id = UUID4(path_params["group_id"])

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can add members")

    user_to_add = db.query(User).filter(User.username == data.username).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail=f"User '{data.username}' not found")

    if user_to_add in group.members:
        raise HTTPException(status_code=400, detail="User is already a member of this group")

    group.members.append(user_to_add)
    db.commit()

    return {"message": f"User '{data.username}' added to group '{group.name}'"}


@traced
async def remove_user_from_group(path_params: dict, db: Session):
    user_ctx = require_user_context()
    group_id = UUID4(path_params["group_id"])
    user_id = UUID4(path_params["user_id"])

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can remove members")

    user_to_remove = db.query(User).filter(User.id == user_id).first()
    if not user_to_remove:
        raise HTTPException(status_code=404, detail="User not found")

    if user_to_remove not in group.members:
        raise HTTPException(status_code=400, detail="User is not a member of this group")

    if user_id == user_ctx.user_id:
        raise HTTPException(
            status_code=400,
            detail="Group owner cannot remove themselves. Delete the group instead.",
        )

    group.members.remove(user_to_remove)
    db.commit()

    return {"message": f"User removed from group '{group.name}'"}
