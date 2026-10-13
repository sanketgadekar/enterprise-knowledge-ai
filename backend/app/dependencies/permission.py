from fastapi import Depends, HTTPException, status

from app.dependencies.auth_dependency import get_current_user
from core.permissions import ROLE_PERMISSIONS, Permission


def require_permission(required_permission: Permission):
    async def permission_dependency(
        current_user=Depends(get_current_user),
    ):
        user_role = current_user["role"]

        if required_permission not in ROLE_PERMISSIONS.get(user_role, set()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied.",
            )

        return current_user

    return permission_dependency
