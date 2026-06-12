from datetime import datetime

from pydantic import UUID4, BaseModel, EmailStr, Field, field_validator


class FirebaseLoginRequest(BaseModel):
    """Request body for Firebase authentication"""

    id_token: str = Field(..., min_length=1, description="Firebase ID token from Google sign-in")


class UserOut(BaseModel):
    """User response model"""

    id: UUID4
    username: str
    email: EmailStr
    groups: list[UUID4]
    pending_invitations: int = 0

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
        v = v.strip()
        if not v:
            raise ValueError("Group name cannot be empty")
        return v


class GroupUpdate(BaseModel):
    """Request to rename a group"""

    name: str = Field(..., min_length=1, max_length=100, description="New group name")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Group name cannot be empty")
        return v


class GroupMember(BaseModel):
    """A member within a group"""

    id: UUID4
    username: str
    email: str


class GroupOut(BaseModel):
    """Group response model"""

    id: UUID4
    name: str
    owner_id: UUID4 | None
    member_count: int
    members: list[GroupMember] = []

    model_config = {"from_attributes": True}


class GroupListResponse(BaseModel):
    """Response from list groups endpoint"""

    total: int
    data: list[GroupOut]


class InviteMemberRequest(BaseModel):
    """Request to invite a user to a group by email"""

    email: EmailStr = Field(..., description="Email of the user to invite")


class InvitationOut(BaseModel):
    """Response model for a single invitation"""

    id: UUID4
    group_id: UUID4
    group_name: str
    email: EmailStr
    invited_by: UUID4
    inviter_name: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InvitationListResponse(BaseModel):
    """Response for listing invitations"""

    total: int
    data: list[InvitationOut]


class InvitationActionRequest(BaseModel):
    """Request to accept or decline an invitation"""

    action: str = Field(
        ..., pattern=r"^(accept|decline)$", description="Either 'accept' or 'decline'"
    )


class InvitationActionResponse(BaseModel):
    """Response from accepting/declining an invitation"""

    message: str
    access_token: str | None = Field(
        None, description="Refreshed JWT with updated groups (only on accept)"
    )


class LogoutRequest(BaseModel):
    access_token: str = Field(..., min_length=1)


class UserContext(BaseModel):
    """User context for authenticated requests"""

    user_id: UUID4
    username: str
    group_ids: list[UUID4]
