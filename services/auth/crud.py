import logging
import uuid

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from services.framework.tracing import traced
from services.framework.user_context import require_user_context
from services.shared.lib.jwt import decode_access_token, revoke_token
from services.shared.schemas import auth as auth_schemas

from .models import Group, GroupInvitation, User
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

    pending_count = (
        db.query(GroupInvitation)
        .filter(
            func.lower(GroupInvitation.email) == email.lower(),
            GroupInvitation.status == "pending",
        )
        .count()
    )

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
            pending_invitations=pending_count,
        ),
    )


@traced
async def get_current_user(db: Session) -> auth_schemas.UserOut:
    user_ctx = require_user_context()

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pending_count = (
        db.query(GroupInvitation)
        .filter(
            func.lower(GroupInvitation.email) == user.email.lower(),
            GroupInvitation.status == "pending",
        )
        .count()
    )

    return auth_schemas.UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        groups=[group.id for group in user.groups],
        pending_invitations=pending_count,
    )


@traced
async def create_group(data: auth_schemas.GroupCreate, db: Session) -> auth_schemas.GroupOut:
    user_ctx = require_user_context()

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found — please log in again")

    group = Group(
        name=data.name,
        owner_id=user.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    user.groups.append(group)
    db.commit()

    return _group_out(group)


def _group_out(group: Group) -> auth_schemas.GroupOut:
    return auth_schemas.GroupOut(
        id=group.id,
        name=group.name,
        owner_id=group.owner_id,
        member_count=len(group.members),
        members=[
            auth_schemas.GroupMember(id=m.id, username=m.username, email=m.email)
            for m in group.members
        ],
    )


@traced
async def list_groups(
    db: Session, limit: int = 20, offset: int = 0, search: str | None = None, **kwargs
) -> auth_schemas.GroupListResponse:
    user_ctx = require_user_context()

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    all_groups = user.groups
    if search:
        search_lower = search.lower()
        all_groups = [g for g in all_groups if search_lower in g.name.lower()]

    groups = [_group_out(group) for group in all_groups[offset : offset + limit]]

    return auth_schemas.GroupListResponse(total=len(all_groups), data=groups)


@traced
async def invite_user_to_group(group_id: str, data: auth_schemas.InviteMemberRequest, db: Session):
    user_ctx = require_user_context()
    group_id = uuid.UUID(group_id)

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can invite members")

    existing_user = db.query(User).filter(func.lower(User.email) == data.email.lower()).first()
    if existing_user and existing_user in group.members:
        raise HTTPException(status_code=400, detail="User is already a member of this group")

    existing_invite = (
        db.query(GroupInvitation)
        .filter(
            GroupInvitation.group_id == group_id,
            func.lower(GroupInvitation.email) == data.email.lower(),
            GroupInvitation.status == "pending",
        )
        .first()
    )
    if existing_invite:
        raise HTTPException(
            status_code=400, detail="An invitation is already pending for this email"
        )

    invitation = GroupInvitation(
        group_id=group_id,
        email=data.email.lower(),
        invited_by=user_ctx.user_id,
        status="pending",
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    return {"message": f"Invitation sent to '{data.email}'", "invitation_id": str(invitation.id)}


@traced
async def list_my_invitations(
    db: Session, limit: int = 20, offset: int = 0, **kwargs
) -> auth_schemas.InvitationListResponse:
    user_ctx = require_user_context()

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = db.query(GroupInvitation).filter(
        func.lower(GroupInvitation.email) == user.email.lower(),
        GroupInvitation.status == "pending",
    )
    total = query.count()
    invitations = query.offset(offset).limit(limit).all()

    data = []
    for inv in invitations:
        data.append(
            auth_schemas.InvitationOut(
                id=inv.id,
                group_id=inv.group_id,
                group_name=inv.group.name,
                email=inv.email,
                invited_by=inv.invited_by,
                inviter_name=inv.inviter.username,
                status=inv.status,
                created_at=inv.created_at,
            )
        )

    return auth_schemas.InvitationListResponse(total=total, data=data)


@traced
async def respond_to_invitation(
    invitation_id: str, data: auth_schemas.InvitationActionRequest, db: Session
):
    user_ctx = require_user_context()
    invitation_id = uuid.UUID(invitation_id)

    invitation = db.query(GroupInvitation).filter(GroupInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user or user.email.lower() != invitation.email.lower():
        raise HTTPException(status_code=403, detail="This invitation is not for you")

    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation already {invitation.status}")

    if data.action == "accept":
        group = db.query(Group).filter(Group.id == invitation.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group no longer exists")
        group.members.append(user)
        invitation.status = "accepted"
    else:
        invitation.status = "declined"

    db.commit()

    return {
        "message": (
            f"Invitation {data.action}d" if data.action == "decline" else "Invitation accepted"
        )
    }


@traced
async def list_group_invitations(
    group_id: str, db: Session, **kwargs
) -> auth_schemas.InvitationListResponse:
    user_ctx = require_user_context()
    group_id = uuid.UUID(group_id)

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can view invitations")

    query = db.query(GroupInvitation).filter(
        GroupInvitation.group_id == group_id,
        GroupInvitation.status == "pending",
    )
    total = query.count()
    invitations = query.all()

    data = []
    for inv in invitations:
        data.append(
            auth_schemas.InvitationOut(
                id=inv.id,
                group_id=inv.group_id,
                group_name=inv.group.name,
                email=inv.email,
                invited_by=inv.invited_by,
                inviter_name=inv.inviter.username,
                status=inv.status,
                created_at=inv.created_at,
            )
        )

    return auth_schemas.InvitationListResponse(total=total, data=data)


@traced
async def cancel_invitation(group_id: str, invitation_id: str, db: Session):
    user_ctx = require_user_context()
    group_id = uuid.UUID(group_id)
    invitation_id = uuid.UUID(invitation_id)

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can cancel invitations")

    invitation = (
        db.query(GroupInvitation)
        .filter(GroupInvitation.id == invitation_id, GroupInvitation.group_id == group_id)
        .first()
    )
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation already {invitation.status}")

    db.delete(invitation)
    db.commit()

    return {"message": "Invitation cancelled"}


@traced
async def remove_user_from_group(group_id: str, user_id: str, db: Session):
    user_ctx = require_user_context()
    group_id = uuid.UUID(group_id)
    user_id = uuid.UUID(user_id)

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


@traced
async def leave_group(group_id: str, db: Session):
    user_ctx = require_user_context()
    group_id = uuid.UUID(group_id)

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.owner_id == user_ctx.user_id:
        raise HTTPException(
            status_code=400,
            detail="Group owner cannot leave. Delete the group instead.",
        )

    user = db.query(User).filter(User.id == user_ctx.user_id).first()
    if not user or user not in group.members:
        raise HTTPException(status_code=400, detail="You are not a member of this group")

    group.members.remove(user)
    db.commit()

    return {"message": f"You left group '{group.name}'"}


@traced
async def delete_group(group_id: str, db: Session):
    user_ctx = require_user_context()
    group_id = uuid.UUID(group_id)

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.owner_id != user_ctx.user_id:
        raise HTTPException(status_code=403, detail="Only group owner can delete the group")

    db.query(GroupInvitation).filter(GroupInvitation.group_id == group_id).delete()
    group.members.clear()
    db.delete(group)
    db.commit()

    return {"message": f"Group '{group.name}' deleted"}


@traced
async def logout(data: auth_schemas.LogoutRequest, db: Session):
    try:
        payload = decode_access_token(data.access_token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token") from None

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=400, detail="Token missing jti claim")

    revoke_token(jti)
    return {"message": "Successfully logged out"}
