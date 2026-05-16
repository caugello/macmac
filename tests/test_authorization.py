"""Tests for authorization helpers."""

import uuid

import pytest
from fastapi import HTTPException

from services.recipes.models import Recipe
from services.shared.lib.authorization import (
    apply_ownership_filter,
    check_owner_only,
    check_owner_or_group,
)

# ===== check_owner_only =====


@pytest.mark.unit
def test_check_owner_only_passes(mock_user_context):
    from services.framework.user_context import require_user_context

    user_ctx = require_user_context()
    check_owner_only(user_ctx.user_id, "update")


@pytest.mark.unit
def test_check_owner_only_rejects():
    other_user = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        check_owner_only(other_user, "delete")
    assert exc_info.value.status_code == 403
    assert "Only resource owner" in str(exc_info.value.detail)


@pytest.mark.unit
def test_check_owner_only_custom_message():
    other_user = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        check_owner_only(other_user, "update this recipe")
    assert "update this recipe" in str(exc_info.value.detail)


# ===== check_owner_or_group =====


@pytest.mark.unit
def test_check_owner_or_group_owner():
    from services.framework.user_context import require_user_context

    user_ctx = require_user_context()
    check_owner_or_group(user_ctx.user_id, None, "recipe")


@pytest.mark.unit
def test_check_owner_or_group_group_member():
    from services.framework.user_context import require_user_context

    user_ctx = require_user_context()
    other_user = uuid.uuid4()
    shared_group = user_ctx.group_ids[0]
    check_owner_or_group(other_user, shared_group, "recipe")


@pytest.mark.unit
def test_check_owner_or_group_rejects_no_group():
    other_user = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        check_owner_or_group(other_user, None, "recipe")
    assert exc_info.value.status_code == 403
    assert "Access denied" in str(exc_info.value.detail)


@pytest.mark.unit
def test_check_owner_or_group_rejects_wrong_group():
    other_user = uuid.uuid4()
    other_group = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        check_owner_or_group(other_user, other_group, "meal plan")
    assert exc_info.value.status_code == 403
    assert "meal plan" in str(exc_info.value.detail)


# ===== apply_ownership_filter =====


@pytest.mark.unit
def test_apply_ownership_filter(mock_db):
    from services.framework.user_context import require_user_context

    user_ctx = require_user_context()

    own_recipe = Recipe(
        title="My Recipe",
        normalized_title="my recipe",
        user_id=user_ctx.user_id,
        group_id=None,
    )
    other_user = uuid.uuid4()
    shared_recipe = Recipe(
        title="Shared Recipe",
        normalized_title="shared recipe",
        user_id=other_user,
        group_id=user_ctx.group_ids[0],
    )
    private_recipe = Recipe(
        title="Private Recipe",
        normalized_title="private recipe",
        user_id=other_user,
        group_id=None,
    )

    mock_db.add_all([own_recipe, shared_recipe, private_recipe])
    mock_db.commit()

    query = mock_db.query(Recipe)
    filtered = apply_ownership_filter(query, Recipe).all()

    titles = {r.title for r in filtered}
    assert "My Recipe" in titles
    assert "Shared Recipe" in titles
    assert "Private Recipe" not in titles
    assert len(filtered) == 2
