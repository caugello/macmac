import re

from pydantic import UUID4, BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    """Request body for login"""

    username: str = Field(..., min_length=3, max_length=50, description="Username")
    password: str = Field(..., min_length=1, max_length=128, description="Password")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        # Allow alphanumeric, underscore, hyphen, and dot
        if not re.match(r"^[a-zA-Z0-9._-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, dots, underscores, and hyphens"
            )
        return v.lower()  # Normalize to lowercase


class UserOut(BaseModel):
    """User response model"""

    id: UUID4
    username: str
    email: EmailStr
    groups: list[UUID4]

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """Response from login endpoint"""

    access_token: str
    token_type: str
    user: UserOut


class GroupCreate(BaseModel):
    """Request to create a new group"""

    name: str = Field(..., min_length=1, max_length=100, description="Group name")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        # Trim whitespace
        v = v.strip()
        if not v:
            raise ValueError("Group name cannot be empty")
        return v


class GroupOut(BaseModel):
    """Group response model"""

    id: UUID4
    name: str
    owner_id: UUID4 | None
    member_count: int

    model_config = {"from_attributes": True}


class GroupListResponse(BaseModel):
    """Response from list groups endpoint"""

    total: int
    data: list[GroupOut]


class AddMemberRequest(BaseModel):
    """Request to add a member to a group"""

    username: str = Field(..., min_length=3, max_length=50, description="Username to add")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9._-]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, dots, underscores, and hyphens"
            )
        return v.lower()


class UserContext(BaseModel):
    """User context for authenticated requests"""

    user_id: UUID4
    username: str
    group_ids: list[UUID4]
