"""Tests for group update (rename)."""

import os
import uuid

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-min-32-chars")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
from fastapi import HTTPException

from services.auth.crud import update_group
from services.auth.models import Group, User
from services.framework.user_context import set_user_context
from services.shared.schemas.auth import GroupUpdate


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
async def test_update_group_rename(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner, name="Old Name")
    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    result = await update_group(str(group.id), GroupUpdate(name="New Name"), mock_auth_db)

    assert result.name == "New Name"
    assert result.id == group.id


@pytest.mark.unit
@pytest.mark.asyncio
async def test_update_group_not_found(mock_auth_db):
    owner = _create_user(mock_auth_db)
    set_user_context(user_id=owner.id, username=owner.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await update_group(str(uuid.uuid4()), GroupUpdate(name="New"), mock_auth_db)
    assert exc_info.value.status_code == 404


@pytest.mark.unit
@pytest.mark.asyncio
async def test_update_group_non_owner_rejected(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner, name="Owner's Group")

    other = _create_user(mock_auth_db, username="other", email="other@test.com")
    set_user_context(user_id=other.id, username=other.username, group_ids=[])

    with pytest.raises(HTTPException) as exc_info:
        await update_group(str(group.id), GroupUpdate(name="Hijacked"), mock_auth_db)
    assert exc_info.value.status_code == 403


@pytest.mark.unit
@pytest.mark.asyncio
async def test_update_group_trims_whitespace(mock_auth_db):
    owner = _create_user(mock_auth_db)
    group = _create_group_for_user(mock_auth_db, owner, name="Old")
    set_user_context(user_id=owner.id, username=owner.username, group_ids=[group.id])

    result = await update_group(str(group.id), GroupUpdate(name="  Trimmed  "), mock_auth_db)

    assert result.name == "Trimmed"
