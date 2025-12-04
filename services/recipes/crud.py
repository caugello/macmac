from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy import asc, desc
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.framework.logging import Span
from services.framework.tracing import traced
from services.shared.schemas import recipe as rs

from .models import Recipe


@traced
async def create_recipe(data: rs.RecipeCreate, db: Session):
    """
    Creates a new recipe in the database.
    """

    with Span("db_create_recipe"):
        normalized_title = data.title.strip().lower()

        recipe = Recipe(
            title=data.title,
            normalized_title=normalized_title,
            description=data.description,
            ingredients=[i.dict() for i in data.ingredients],
            steps=data.steps,
        )

        db.add(recipe)
        try:
            db.commit()
            db.refresh(recipe)
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Recipe '{data.title}' already exists. {exc.detail}",
            )

        return rs.RecipeOut.model_validate(recipe)


@traced
async def list_recipes(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    search: str | None = None,
    ingredient: str | None = None,
    sort: str | None = None,
):
    """
    Lists recipes with optional filtering, searching, and sorting.
    """
    with Span("db_list_recipes"):
        query = db.query(Recipe)

        # ---- TEXT SEARCH (case-insensitive)
        if search:
            s = f"%{search.lower()}%"
            query = query.filter(Recipe.normalized_title.ilike(s))

        # ---- INGREDIENT FILTER
        if ingredient:
            i = ingredient.lower().strip()
            query = query.filter(Recipe.ingredients.cast(JSONB).contains([{"name": i}]))

        # ---- SORTING
        if sort:
            try:
                field, direction = sort.split(":")
                direction = direction.lower()
                field_obj = getattr(Recipe, field)
                if direction == "asc":
                    query = query.order_by(asc(field_obj))
                elif direction == "desc":
                    query = query.order_by(desc(field_obj))
                else:
                    raise ValueError()
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid sort value. Use field:asc or field:desc",
                )

        # ---- TOTAL COUNT (before applying limit/offset)
        total = query.count()

        # ---- PAGINATION
        items = query.offset(offset).limit(limit).all()

        # Return with metadata
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "data": [rs.RecipeOut.model_validate(r) for r in items],
        }


@traced
async def get_recipe(recipe_id: UUID4, db: Session) -> rs.RecipeOut:
    """
    Retrieves a single recipe by its ID.
    """
    with Span("db_query_recipe"):
        recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")
        return rs.RecipeOut.model_validate(recipe)


@traced
async def update_recipe(id: UUID4, data: rs.RecipeUpdate, db: Session):
    """
    Updates an existing recipe in the database.
    """
    with Span("db_update_recipe"):
        recipe = db.query(Recipe).filter(Recipe.id == id).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")

        # title + normalized_title
        if data.title is not None:
            recipe.title = data.title
            recipe.normalized_title = data.title.strip().lower()

        # simple scalars
        if data.description is not None:
            recipe.description = data.description

        # ingredients: list[Ingredient]
        if data.ingredients is not None:
            recipe.ingredients = [ing.model_dump() for ing in data.ingredients]

        # steps: list[str]
        if data.steps is not None:
            recipe.steps = data.steps

        try:
            db.commit()
            db.refresh(recipe)
        except IntegrityError:
            db.rollback()
            raise HTTPException(400, "Recipe title already exists")

        return rs.RecipeOut.model_validate(recipe)


@traced
async def delete_recipe(recipe_id: UUID4, db: Session):
    """
    Deletes a recipe by its ID.
    """
    with Span("db_delete_recipe"):
        recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")

        db.delete(recipe)
        db.commit()

        return {"success": True}
