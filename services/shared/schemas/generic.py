from pydantic import BaseModel


class DeleteResponse(BaseModel):
    """
    A generic response for delete operations
    """

    success: bool
