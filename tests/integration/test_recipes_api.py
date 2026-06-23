"""HTTP-level integration tests for the recipes service.

Recipes enforce ownership: ``list_recipes`` calls ``require_user_context()`` and
``apply_ownership_filter()``, so an anonymous request is rejected and user B can
never see user A's recipes. These tests verify the ``ingredient`` query param is
applied and that ownership isolation holds across the full HTTP path.
"""

import uuid

import pytest

from .conftest import run_async, set_test_user


def _create_recipe(recipes_db, title, catalog_item_id):
    from services.recipes.crud import create_recipe
    from services.shared.schemas.ingredient import IngredientCreate
    from services.shared.schemas.recipe import RecipeCreate

    data = RecipeCreate(
        title=title,
        ingredients=[
            IngredientCreate(catalog_item_id=catalog_item_id, qty=1, unit="pc"),
        ],
    )
    return run_async(create_recipe(data, recipes_db))


@pytest.mark.integration
class TestRecipesQueryParams:
    def test_ingredient_filter_applied(self, recipes_client, recipes_db, auth_headers_a, user_a_id):
        """GET /recipes?ingredient=<id> must filter by catalog_item_id."""
        target_id = uuid.uuid4()
        other_id = uuid.uuid4()

        set_test_user(user_a_id)
        _create_recipe(recipes_db, "Recipe With Target", target_id)
        _create_recipe(recipes_db, "Recipe Without Target", other_id)

        resp = recipes_client.get(f"/recipes?ingredient={target_id}", headers=auth_headers_a)
        assert resp.status_code == 200
        titles = [r["title"] for r in resp.json()["data"]]
        assert "Recipe With Target" in titles
        assert "Recipe Without Target" not in titles

    def test_ownership_isolation(
        self, recipes_client, recipes_db, auth_headers_a, auth_headers_b, user_a_id
    ):
        """User B must not see user A's recipes."""
        set_test_user(user_a_id)
        _create_recipe(recipes_db, "User A Private Recipe", uuid.uuid4())

        # User A sees their own recipe.
        resp_a = recipes_client.get("/recipes", headers=auth_headers_a)
        assert resp_a.status_code == 200
        titles_a = [r["title"] for r in resp_a.json()["data"]]
        assert "User A Private Recipe" in titles_a

        # User B sees nothing.
        resp_b = recipes_client.get("/recipes", headers=auth_headers_b)
        assert resp_b.status_code == 200
        assert resp_b.json()["data"] == []

    def test_unauthenticated_returns_401(self, recipes_client):
        """No Authorization header -> require_user_context() raises 401."""
        resp = recipes_client.get("/recipes")
        assert resp.status_code == 401
