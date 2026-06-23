"""HTTP-level integration tests for the meal-plans service.

Meal plans enforce ownership and support a ``start_date``/``end_date`` range
filter. These tests verify the date range actually reaches the SQL query (rather
than defaulting to the current week) and that user B cannot see user A's plans.
"""

import uuid
from datetime import date

import pytest

from .conftest import run_async, set_test_user


def _create_meal_plan(meal_plans_db, on_date, meal_type="lunch"):
    from services.meal_plans.crud import create_meal_plan
    from services.shared.schemas.meal_plan import MealPlanCreate

    data = MealPlanCreate(date=on_date, meal_type=meal_type, recipe_id=uuid.uuid4())
    return run_async(create_meal_plan(data, meal_plans_db))


@pytest.mark.integration
class TestMealPlansQueryParams:
    def test_date_range_applied(self, meal_plans_client, meal_plans_db, auth_headers_a, user_a_id):
        """start_date/end_date must reach the DB query, not default to current week."""
        monday = date(2026, 1, 5)
        next_monday = date(2026, 1, 12)

        set_test_user(user_a_id)
        _create_meal_plan(meal_plans_db, monday, meal_type="lunch")

        # A different week must return empty.
        resp = meal_plans_client.get(
            f"/meal-plans?start_date={next_monday}&end_date=2026-01-18",
            headers=auth_headers_a,
        )
        assert resp.status_code == 200
        assert resp.json()["data"] == []

        # The correct week must return the plan.
        resp = meal_plans_client.get(
            f"/meal-plans?start_date={monday}&end_date=2026-01-11",
            headers=auth_headers_a,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 1
        assert body["data"][0]["date"] == monday.isoformat()

    def test_ownership_isolation(
        self,
        meal_plans_client,
        meal_plans_db,
        auth_headers_a,
        auth_headers_b,
        user_a_id,
    ):
        """User B must not see user A's meal plans for the same week."""
        monday = date(2026, 2, 2)
        params = f"start_date={monday}&end_date=2026-02-08"

        set_test_user(user_a_id)
        _create_meal_plan(meal_plans_db, monday, meal_type="dinner")

        # User A sees their plan.
        resp_a = meal_plans_client.get(f"/meal-plans?{params}", headers=auth_headers_a)
        assert resp_a.status_code == 200
        assert len(resp_a.json()["data"]) == 1

        # User B sees nothing.
        resp_b = meal_plans_client.get(f"/meal-plans?{params}", headers=auth_headers_b)
        assert resp_b.status_code == 200
        assert resp_b.json()["data"] == []

    def test_unauthenticated_returns_401(self, meal_plans_client):
        """No Authorization header -> require_user_context() raises 401."""
        resp = meal_plans_client.get("/meal-plans")
        assert resp.status_code == 401
