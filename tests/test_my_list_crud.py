"""Tests for My List CRUD operations (server-backed personal product list)."""

import uuid

import pytest
from fastapi import HTTPException

from services.framework.user_context import set_user_context
from services.meal_plans.my_list_crud import (
    add_my_list_item,
    clear_my_list,
    list_my_list,
    merge_my_list,
    remove_my_list_item,
)
from services.shared.schemas.my_list import MyListItemCreate, MyListMergeRequest

CATALOG_A = uuid.UUID("aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa")
CATALOG_B = uuid.UUID("bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb")
CATALOG_C = uuid.UUID("cccccccc-cccc-4ccc-bccc-cccccccccccc")


def _item(catalog_item_id: uuid.UUID, name: str = "Product") -> MyListItemCreate:
    return MyListItemCreate(
        catalog_item_id=catalog_item_id,
        name=name,
        brand="Brand",
        price=1.99,
        image_url="https://example.com/p.png",
        nutriscore="a",
    )


def _switch_user(group_ids=None):
    user_id = uuid.uuid4()
    set_user_context(user_id=user_id, username=f"user-{user_id}", group_ids=group_ids or [])
    return user_id


# ===== CRUD BASICS =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_empty(mock_meal_plans_db):
    result = await list_my_list(mock_meal_plans_db)
    assert result.total == 0
    assert result.data == []


@pytest.mark.asyncio
@pytest.mark.unit
async def test_add_item(mock_meal_plans_db):
    out = await add_my_list_item(_item(CATALOG_A, "Coca-Cola"), mock_meal_plans_db)
    assert out.catalog_item_id == CATALOG_A
    assert out.name == "Coca-Cola"

    result = await list_my_list(mock_meal_plans_db)
    assert result.total == 1
    assert result.data[0].catalog_item_id == CATALOG_A


@pytest.mark.asyncio
@pytest.mark.unit
async def test_add_item_is_idempotent(mock_meal_plans_db):
    first = await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)
    second = await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)

    assert first.id == second.id
    result = await list_my_list(mock_meal_plans_db)
    assert result.total == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_remove_item(mock_meal_plans_db):
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)
    await add_my_list_item(_item(CATALOG_B), mock_meal_plans_db)

    resp = await remove_my_list_item(CATALOG_A, mock_meal_plans_db)
    assert resp.success is True

    result = await list_my_list(mock_meal_plans_db)
    assert result.total == 1
    assert result.data[0].catalog_item_id == CATALOG_B


@pytest.mark.asyncio
@pytest.mark.unit
async def test_remove_missing_item_404(mock_meal_plans_db):
    with pytest.raises(HTTPException) as exc_info:
        await remove_my_list_item(CATALOG_A, mock_meal_plans_db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_clear(mock_meal_plans_db):
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)
    await add_my_list_item(_item(CATALOG_B), mock_meal_plans_db)

    resp = await clear_my_list(mock_meal_plans_db)
    assert resp.success is True

    result = await list_my_list(mock_meal_plans_db)
    assert result.total == 0


# ===== MERGE (login sync) =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_merge_adds_new_items(mock_meal_plans_db):
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)

    result = await merge_my_list(
        MyListMergeRequest(items=[_item(CATALOG_B), _item(CATALOG_C)]),
        mock_meal_plans_db,
    )

    assert result.total == 3
    assert {i.catalog_item_id for i in result.data} == {CATALOG_A, CATALOG_B, CATALOG_C}


@pytest.mark.asyncio
@pytest.mark.unit
async def test_merge_skips_existing_and_duplicates(mock_meal_plans_db):
    await add_my_list_item(_item(CATALOG_A, "Server name"), mock_meal_plans_db)

    result = await merge_my_list(
        MyListMergeRequest(
            items=[_item(CATALOG_A, "Local name"), _item(CATALOG_B), _item(CATALOG_B)]
        ),
        mock_meal_plans_db,
    )

    assert result.total == 2
    # Existing server item is not overwritten by the local copy.
    a = next(i for i in result.data if i.catalog_item_id == CATALOG_A)
    assert a.name == "Server name"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_merge_empty_is_noop(mock_meal_plans_db):
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)
    result = await merge_my_list(MyListMergeRequest(items=[]), mock_meal_plans_db)
    assert result.total == 1


# ===== OWNERSHIP ISOLATION =====


@pytest.mark.asyncio
@pytest.mark.unit
async def test_list_is_isolated_per_user(mock_meal_plans_db):
    # User A adds an item.
    user_a = _switch_user()
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)

    # User B sees an empty list.
    _switch_user()
    result_b = await list_my_list(mock_meal_plans_db)
    assert result_b.total == 0

    # User A still sees their item.
    set_user_context(user_id=user_a, username="user-a", group_ids=[])
    result_a = await list_my_list(mock_meal_plans_db)
    assert result_a.total == 1


@pytest.mark.asyncio
@pytest.mark.unit
async def test_user_cannot_remove_another_users_item(mock_meal_plans_db):
    # User A saves a product.
    _switch_user()
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)

    # User B cannot remove it (it is not in their list -> 404).
    _switch_user()
    with pytest.raises(HTTPException) as exc_info:
        await remove_my_list_item(CATALOG_A, mock_meal_plans_db)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.unit
async def test_clear_only_affects_current_user(mock_meal_plans_db):
    # User A saves a product.
    user_a = _switch_user()
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)

    # User B saves a product then clears their own list.
    _switch_user()
    await add_my_list_item(_item(CATALOG_B), mock_meal_plans_db)
    await clear_my_list(mock_meal_plans_db)

    # User A's list is untouched.
    set_user_context(user_id=user_a, username="user-a", group_ids=[])
    result_a = await list_my_list(mock_meal_plans_db)
    assert result_a.total == 1
    assert result_a.data[0].catalog_item_id == CATALOG_A


@pytest.mark.asyncio
@pytest.mark.unit
async def test_same_catalog_item_can_be_saved_by_two_users(mock_meal_plans_db):
    # The unique constraint is per-user, so two users may each save the same product.
    _switch_user()
    await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)

    user_b = _switch_user()
    out = await add_my_list_item(_item(CATALOG_A), mock_meal_plans_db)
    assert out.catalog_item_id == CATALOG_A

    set_user_context(user_id=user_b, username="user-b", group_ids=[])
    result_b = await list_my_list(mock_meal_plans_db)
    assert result_b.total == 1
