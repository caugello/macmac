"""
CRUD helper utilities for MacMac services.

This module provides reusable functions for common CRUD patterns:
- Sorting: Apply field:asc or field:desc sorting to queries
- Pagination: Apply offset/limit with total count
- Safe commits: Context manager for IntegrityError handling

These helpers eliminate 15-20 lines of duplicate code per CRUD file.
"""

from contextlib import contextmanager
from typing import Tuple

from fastapi import HTTPException
from sqlalchemy import asc, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Query, Session


def apply_sorting(query: Query, model_class: type, sort_param: str | None) -> Query:
    """
    Apply field:asc or field:desc sorting to a SQLAlchemy query.

    Replaces the common 15-line try/except sorting pattern with a single function call.

    Args:
        query: SQLAlchemy query to apply sorting to
        model_class: Model class (e.g., Recipe, CatalogItem) to get field from
        sort_param: Sort parameter in format "field:direction" (e.g., "title:asc", "created_at:desc")
                    None or empty string means no sorting

    Returns:
        Query with sorting applied (or original query if sort_param is None/empty)

    Raises:
        HTTPException(400): If sort parameter is invalid (wrong format, invalid field, invalid direction)

    Example:
        >>> from services.recipes.models import Recipe
        >>> query = db.query(Recipe)
        >>> query = apply_sorting(query, Recipe, "title:asc")
        >>> # Equivalent to: query.order_by(asc(Recipe.title))

    Common usage in list endpoints:
        >>> query = db.query(Recipe).filter(...)
        >>> query = apply_sorting(query, Recipe, sort)
        >>> items = query.offset(offset).limit(limit).all()
    """
    if not sort_param:
        return query

    try:
        field, direction = sort_param.split(":")
        direction = direction.lower()

        # Get field from model
        if not hasattr(model_class, field):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid sort field '{field}'. Field does not exist on {model_class.__name__}",
            )

        field_obj = getattr(model_class, field)

        # Apply sorting direction
        if direction == "asc":
            return query.order_by(asc(field_obj))
        elif direction == "desc":
            return query.order_by(desc(field_obj))
        else:
            raise ValueError(f"Invalid direction: {direction}")

    except ValueError as e:
        raise HTTPException(
            status_code=400, detail="Invalid sort value. Use format 'field:asc' or 'field:desc'"
        ) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sort error: {str(e)}") from e


def apply_pagination(query: Query, limit: int, offset: int) -> Tuple[int, list]:
    """
    Apply pagination to a query and return total count + paginated results.

    Handles the common pattern of:
    1. Get total count before pagination
    2. Apply offset and limit
    3. Return both total and items

    Args:
        query: SQLAlchemy query to paginate
        limit: Maximum number of items to return
        offset: Number of items to skip

    Returns:
        Tuple of (total_count, items)
        - total_count: Total number of items matching the query (before pagination)
        - items: List of items after applying offset and limit

    Example:
        >>> query = db.query(Recipe).filter(...)
        >>> total, items = apply_pagination(query, limit=20, offset=0)
        >>> # Equivalent to:
        >>> # total = query.count()
        >>> # items = query.offset(0).limit(20).all()

    Common usage in list endpoints:
        >>> query = db.query(Recipe).filter(...)
        >>> query = apply_sorting(query, Recipe, sort)
        >>> total, items = apply_pagination(query, limit, offset)
        >>> return {
        ...     "total": total,
        ...     "limit": limit,
        ...     "offset": offset,
        ...     "data": [schema.model_validate(item) for item in items]
        ... }
    """
    # Get total count BEFORE applying pagination
    total = query.count()

    # Apply pagination
    items = query.offset(offset).limit(limit).all()

    return total, items


@contextmanager
def safe_commit(db: Session, error_message: str):
    """
    Context manager for safe database commits with IntegrityError handling.

    Automatically catches IntegrityError (unique constraint violations, foreign key violations)
    and converts them to HTTPException(400) with a custom error message.

    Replaces the common 8-line try/except/rollback pattern with a 3-line context manager.

    Args:
        db: SQLAlchemy database session
        error_message: Error message to show user if IntegrityError occurs
                      (e.g., "Recipe already exists", "Duplicate catalog item")

    Yields:
        None

    Raises:
        HTTPException(400): If IntegrityError occurs (duplicate key, constraint violation)

    Example:
        >>> # Instead of:
        >>> try:
        ...     db.add(recipe)
        ...     db.commit()
        ...     db.refresh(recipe)
        ... except IntegrityError as exc:
        ...     db.rollback()
        ...     raise HTTPException(400, f"Recipe exists. {exc.detail}") from exc
        >>>
        >>> # Use:
        >>> with safe_commit(db, "Recipe already exists"):
        ...     db.add(recipe)
        >>> db.refresh(recipe)

    Note:
        The context manager only wraps db.commit() - you still need to refresh
        the object after the context manager exits.
    """
    try:
        yield
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # Extract detail from SQLAlchemy exception if available
        detail = getattr(exc, "detail", None)
        if detail:
            full_message = f"{error_message}. {detail}"
        else:
            full_message = error_message
        raise HTTPException(
            status_code=400,
            detail=full_message,
        ) from exc
