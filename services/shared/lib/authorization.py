"""
Authorization helpers for MacMac services.

This module provides reusable authorization functions for multi-tenant access control.
Eliminates duplicate authorization checks across services.

Common patterns:
- Owner-only operations (update, delete)
- Owner-or-group read access (shared resources)
- List filtering by ownership
"""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Query

from services.framework.user_context import require_user_context


def check_owner_only(resource_user_id: UUID, operation: str = "perform this operation"):
    """
    Verify that the current user is the resource owner.

    Raises HTTPException(403) if the current user is not the owner.
    Use before update/delete operations that should only be performed by the owner.

    Args:
        resource_user_id: The user_id of the resource owner
        operation: Description of the operation for error message (e.g., "update", "delete")

    Raises:
        HTTPException(403): If current user is not the resource owner

    Example:
        >>> # In update_recipe():
        >>> recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        >>> check_owner_only(recipe.user_id, "update")
        >>> # If user is not owner, raises 403
        >>> # Otherwise, continue with update...

    Replaces pattern:
        if recipe.user_id != user_ctx.user_id:
            raise HTTPException(403, "Only recipe owner can update")
    """
    user_ctx = require_user_context()

    if resource_user_id != user_ctx.user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Only resource owner can {operation}"
        )


def check_owner_or_group(
    resource_user_id: UUID,
    resource_group_id: UUID | None,
    resource_type: str = "resource"
):
    """
    Verify that the current user can access a resource (owner or group member).

    Raises HTTPException(403) if:
    - User is not the owner AND
    - Resource has no group OR user is not a member of the resource's group

    Use before read operations on resources that support group sharing.

    Args:
        resource_user_id: The user_id of the resource owner
        resource_group_id: The group_id the resource is shared with (None if private)
        resource_type: Name of resource type for error message (e.g., "recipe", "meal plan")

    Raises:
        HTTPException(403): If user cannot access the resource

    Example:
        >>> # In get_recipe():
        >>> recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        >>> check_owner_or_group(recipe.user_id, recipe.group_id, "recipe")
        >>> # If user has no access, raises 403
        >>> # Otherwise, return recipe...

    Replaces pattern:
        if recipe.user_id != user_ctx.user_id and (not recipe.group_id or recipe.group_id not in user_ctx.group_ids):
            raise HTTPException(403, "Access denied to this recipe")
    """
    user_ctx = require_user_context()

    # If user is the owner, allow access
    if resource_user_id == user_ctx.user_id:
        return

    # User is not owner - check group membership
    if not resource_group_id:
        # Resource is private (no group sharing)
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to this {resource_type}"
        )

    if resource_group_id not in user_ctx.group_ids:
        # User is not in the resource's group
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to this {resource_type}"
        )


def apply_ownership_filter(query: Query, model_class: type) -> Query:
    """
    Filter a query to only return resources owned by or shared with the current user.

    Applies multi-tenant isolation by filtering for:
    - Resources where user_id matches current user OR
    - Resources where group_id is in current user's groups

    Use in list endpoints to enforce access control.

    Args:
        query: SQLAlchemy query to filter
        model_class: Model class with user_id and group_id columns (e.g., Recipe, MealPlan)

    Returns:
        Filtered query

    Example:
        >>> # In list_recipes():
        >>> query = db.query(Recipe)
        >>> query = apply_ownership_filter(query, Recipe)
        >>> # Now query only returns recipes user can access
        >>> recipes = query.all()

    Replaces pattern:
        query = query.filter(
            or_(
                Recipe.user_id == user_ctx.user_id,
                Recipe.group_id.in_(user_ctx.group_ids) if user_ctx.group_ids else False
            )
        )
    """
    user_ctx = require_user_context()

    # Build ownership filter
    ownership_conditions = [
        model_class.user_id == user_ctx.user_id,
    ]

    # Add group filter if user is in any groups
    if user_ctx.group_ids:
        ownership_conditions.append(
            model_class.group_id.in_(user_ctx.group_ids)
        )

    return query.filter(or_(*ownership_conditions))
