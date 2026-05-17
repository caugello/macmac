"""Tests for the group invitation system."""

import os
import uuid

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-min-32-chars")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
from fastapi import HTTPException

from services.auth.crud import (
    cancel_invitation,
    delete_group,
    invite_user_to_group,
    leave_group,
    list_group_invitations,
    list_my_invitations,
    respond_to_invitation,
)
from services.auth.models import Group, GroupInvitation, User
from services.framework.user_context import set_user_context
from services.shared.schemas.auth import (
    InvitationActionRequest,
    InviteMemberRequest,
)


def _create_user(db, username="owner", email="owner@test.com"):
    user = User(username=username, email=email, firebase_uid=f"fb_{username}", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_group_for_user(db, user, name="Test Group"):
    group = Group(name=name, owner_id=user.id)
    db.add(group)
    db.commit()
    db.refresh(group)
    group.members.append(user)
    db.commit()
    return group


@pytest.mark.unit
@pytest.mark.asyncio
async def test_invite_user_to_group(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner)
    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    result = await invite_user_to_group(
        str(group.id),
        InviteMemberRequest(email="invited@test.com"),
        mock_auth_db,
    )

    assert "invitation_id" in result
    invitation = mock_auth_db.query(GroupInvitation).first()
    assert invitation.email == "invited@test.com"
    assert invitation.status == "pending"
    assert invitation.group_id == group.id
    assert invitation.invited_by == owner.id


@pytest.mark.unit
@pytest.mark.asyncio
async def test_invite_duplicate_returns_400(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner)
    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    await invite_user_to_group(
        str(group.id),
        InviteMemberRequest(email="invited@test.com"),
        mock_auth_db,
    )

    with pytest.raises(HTTPException) as exc_info:
        await invite_user_to_group(
            str(group.id),
            InviteMemberRequest(email="invited@test.com"),
            mock_auth_db,
        )
    assert exc_info.value.status_code == 400
    assert "already pending" in exc_info.value.detail


@pytest.mark.unit
@pytest.mark.asyncio
async def test_invite_existing_member_returns_400(mock_auth_db):
    owner = _create_user(mock_auth_db)
    member = _create_user(mock_auth_db, username="member", email="member@test.com")
    group = _create_group_for_user(mock_auth_db, owner)
    group.members.append(member)
    mock_auth_db.commit()
    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    with pytest.raises(HTTPException) as exc_info:
        await invite_user_to_group(
            str(group.id),
            InviteMemberRequest(email="member@test.com"),
            mock_auth_db,
        )
    assert exc_info.value.status_code == 400
    assert "already a member" in exc_info.value.detail


@pytest.mark.unit
@pytest.mark.asyncio
async def test_invite_non_owner_returns_403(mock_auth_db):
    owner = _create_user(mock_auth_db)
    non_owner = _create_user(mock_auth_db, username="other", email="other@test.com")
    group = _create_group_for_user(mock_auth_db, owner)
    set_user_context(user_id=non_owner.id, username=non_owner.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await invite_user_to_group(
            str(group.id),
            InviteMemberRequest(email="invited@test.com"),
            mock_auth_db,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.unit
@pytest.mark.asyncio
async def test_invite_nonexistent_group_returns_404(mock_auth_db):
    owner = _create_user(mock_auth_db)
    set_user_context(user_id=owner.id, username=owner.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await invite_user_to_group(
            str(uuid.uuid4()),
            InviteMemberRequest(email="invited@test.com"),
            mock_auth_db,
        )
    assert exc_info.value.status_code == 404


@pytest.mark.unit
@pytest.mark.asyncio
async def test_list_my_invitations(mock_auth_db):
    owner = _create_user(mock_auth_db)
    invitee = _create_user(mock_auth_db, username="invitee", email="invitee@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    invitation = GroupInvitation(
        group_id=group.id,
        email="invitee@test.com",
        invited_by=owner.id,
        status="pending",
    )
    mock_auth_db.add(invitation)
    mock_auth_db.commit()

    set_user_context(user_id=invitee.id, username=invitee.username, group_ids=[])

    result = await list_my_invitations(mock_auth_db)
    assert result.total == 1
    assert result.data[0].group_name == "Test Group"
    assert result.data[0].inviter_name == "owner"
    assert result.data[0].status == "pending"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_list_invitations_excludes_non_pending(mock_auth_db):
    owner = _create_user(mock_auth_db)
    invitee = _create_user(mock_auth_db, username="invitee", email="invitee@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    for status in ["pending", "accepted", "declined"]:
        inv = GroupInvitation(
            group_id=group.id,
            email="invitee@test.com",
            invited_by=owner.id,
            status=status,
        )
        mock_auth_db.add(inv)
    mock_auth_db.commit()

    set_user_context(user_id=invitee.id, username=invitee.username, group_ids=[])

    result = await list_my_invitations(mock_auth_db)
    assert result.total == 1


@pytest.mark.unit
@pytest.mark.asyncio
async def test_accept_invitation(mock_auth_db):
    owner = _create_user(mock_auth_db)
    invitee = _create_user(mock_auth_db, username="invitee", email="invitee@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    invitation = GroupInvitation(
        group_id=group.id,
        email="invitee@test.com",
        invited_by=owner.id,
        status="pending",
    )
    mock_auth_db.add(invitation)
    mock_auth_db.commit()
    mock_auth_db.refresh(invitation)

    set_user_context(user_id=invitee.id, username=invitee.username, group_ids=[])

    result = await respond_to_invitation(
        str(invitation.id),
        InvitationActionRequest(action="accept"),
        mock_auth_db,
    )

    assert "accepted" in result["message"]
    mock_auth_db.refresh(invitation)
    assert invitation.status == "accepted"
    assert invitee in group.members


@pytest.mark.unit
@pytest.mark.asyncio
async def test_decline_invitation(mock_auth_db):
    owner = _create_user(mock_auth_db)
    invitee = _create_user(mock_auth_db, username="invitee", email="invitee@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    invitation = GroupInvitation(
        group_id=group.id,
        email="invitee@test.com",
        invited_by=owner.id,
        status="pending",
    )
    mock_auth_db.add(invitation)
    mock_auth_db.commit()
    mock_auth_db.refresh(invitation)

    set_user_context(user_id=invitee.id, username=invitee.username, group_ids=[])

    result = await respond_to_invitation(
        str(invitation.id),
        InvitationActionRequest(action="decline"),
        mock_auth_db,
    )

    assert "declined" in result["message"]
    mock_auth_db.refresh(invitation)
    assert invitation.status == "declined"
    assert invitee not in group.members


@pytest.mark.unit
@pytest.mark.asyncio
async def test_respond_wrong_user_returns_403(mock_auth_db):
    owner = _create_user(mock_auth_db)
    wrong_user = _create_user(mock_auth_db, username="wrong", email="wrong@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    invitation = GroupInvitation(
        group_id=group.id,
        email="someone_else@test.com",
        invited_by=owner.id,
        status="pending",
    )
    mock_auth_db.add(invitation)
    mock_auth_db.commit()
    mock_auth_db.refresh(invitation)

    set_user_context(user_id=wrong_user.id, username=wrong_user.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await respond_to_invitation(
            str(invitation.id),
            InvitationActionRequest(action="accept"),
            mock_auth_db,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.unit
@pytest.mark.asyncio
async def test_respond_already_acted_returns_400(mock_auth_db):
    owner = _create_user(mock_auth_db)
    invitee = _create_user(mock_auth_db, username="invitee", email="invitee@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    invitation = GroupInvitation(
        group_id=group.id,
        email="invitee@test.com",
        invited_by=owner.id,
        status="accepted",
    )
    mock_auth_db.add(invitation)
    mock_auth_db.commit()
    mock_auth_db.refresh(invitation)

    set_user_context(user_id=invitee.id, username=invitee.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await respond_to_invitation(
            str(invitation.id),
            InvitationActionRequest(action="accept"),
            mock_auth_db,
        )
    assert exc_info.value.status_code == 400
    assert "already accepted" in exc_info.value.detail


@pytest.mark.unit
@pytest.mark.asyncio
async def test_respond_nonexistent_invitation_returns_404(mock_auth_db):
    user = _create_user(mock_auth_db)
    set_user_context(user_id=user.id, username=user.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await respond_to_invitation(
            str(uuid.uuid4()),
            InvitationActionRequest(action="accept"),
            mock_auth_db,
        )
    assert exc_info.value.status_code == 404


@pytest.mark.unit
@pytest.mark.asyncio
async def test_list_group_invitations(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner)

    inv = GroupInvitation(
        group_id=group.id, email="invited@test.com", invited_by=owner.id, status="pending"
    )
    mock_auth_db.add(inv)
    mock_auth_db.commit()

    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    result = await list_group_invitations(str(group.id), mock_auth_db)
    assert result.total == 1
    assert result.data[0].email == "invited@test.com"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_list_group_invitations_non_owner_returns_403(mock_auth_db):
    owner = _create_user(mock_auth_db)
    non_owner = _create_user(mock_auth_db, username="other", email="other@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    set_user_context(user_id=non_owner.id, username=non_owner.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await list_group_invitations(str(group.id), mock_auth_db)
    assert exc_info.value.status_code == 403


@pytest.mark.unit
@pytest.mark.asyncio
async def test_cancel_invitation(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner)

    inv = GroupInvitation(
        group_id=group.id, email="invited@test.com", invited_by=owner.id, status="pending"
    )
    mock_auth_db.add(inv)
    mock_auth_db.commit()
    mock_auth_db.refresh(inv)

    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    result = await cancel_invitation(str(group.id), str(inv.id), mock_auth_db)
    assert "cancelled" in result["message"]
    assert mock_auth_db.query(GroupInvitation).filter(GroupInvitation.id == inv.id).first() is None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_cancel_invitation_non_owner_returns_403(mock_auth_db):
    owner = _create_user(mock_auth_db)
    non_owner = _create_user(mock_auth_db, username="other", email="other@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    inv = GroupInvitation(
        group_id=group.id, email="invited@test.com", invited_by=owner.id, status="pending"
    )
    mock_auth_db.add(inv)
    mock_auth_db.commit()
    mock_auth_db.refresh(inv)

    set_user_context(user_id=non_owner.id, username=non_owner.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await cancel_invitation(str(group.id), str(inv.id), mock_auth_db)
    assert exc_info.value.status_code == 403


@pytest.mark.unit
@pytest.mark.asyncio
async def test_cancel_already_accepted_returns_400(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner)

    inv = GroupInvitation(
        group_id=group.id, email="invited@test.com", invited_by=owner.id, status="accepted"
    )
    mock_auth_db.add(inv)
    mock_auth_db.commit()
    mock_auth_db.refresh(inv)

    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    with pytest.raises(HTTPException) as exc_info:
        await cancel_invitation(str(group.id), str(inv.id), mock_auth_db)
    assert exc_info.value.status_code == 400


@pytest.mark.unit
@pytest.mark.asyncio
async def test_leave_group(mock_auth_db):
    owner = _create_user(mock_auth_db)
    member = _create_user(mock_auth_db, username="member", email="member@test.com")
    group = _create_group_for_user(mock_auth_db, owner)
    group.members.append(member)
    mock_auth_db.commit()

    set_user_context(user_id=member.id, username=member.username, group_ids=[group.id])

    result = await leave_group(str(group.id), mock_auth_db)
    assert "left" in result["message"]
    assert member not in group.members


@pytest.mark.unit
@pytest.mark.asyncio
async def test_leave_group_owner_returns_400(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner)

    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    with pytest.raises(HTTPException) as exc_info:
        await leave_group(str(group.id), mock_auth_db)
    assert exc_info.value.status_code == 400
    assert "owner cannot leave" in exc_info.value.detail.lower()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_leave_group_non_member_returns_400(mock_auth_db):
    owner = _create_user(mock_auth_db)
    non_member = _create_user(mock_auth_db, username="outsider", email="outsider@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    set_user_context(user_id=non_member.id, username=non_member.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await leave_group(str(group.id), mock_auth_db)
    assert exc_info.value.status_code == 400


@pytest.mark.unit
@pytest.mark.asyncio
async def test_delete_group(mock_auth_db):
    owner = _create_user(mock_auth_db)
    member = _create_user(mock_auth_db, username="member", email="member@test.com")
    group = _create_group_for_user(mock_auth_db, owner)
    group.members.append(member)
    mock_auth_db.commit()

    inv = GroupInvitation(
        group_id=group.id, email="pending@test.com", invited_by=owner.id, status="pending"
    )
    mock_auth_db.add(inv)
    mock_auth_db.commit()

    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    result = await delete_group(str(group.id), mock_auth_db)
    assert "deleted" in result["message"]
    assert mock_auth_db.query(Group).filter(Group.id == group.id).first() is None
    assert (
        mock_auth_db.query(GroupInvitation).filter(GroupInvitation.group_id == group.id).first()
        is None
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_delete_group_non_owner_returns_403(mock_auth_db):
    owner = _create_user(mock_auth_db)
    non_owner = _create_user(mock_auth_db, username="other", email="other@test.com")
    group = _create_group_for_user(mock_auth_db, owner)

    set_user_context(user_id=non_owner.id, username=non_owner.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await delete_group(str(group.id), mock_auth_db)
    assert exc_info.value.status_code == 403
