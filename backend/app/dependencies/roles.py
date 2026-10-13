from fastapi import Depends, HTTPException, status
from app.dependencies.auth_dependency import get_current_user


async def get_current_admin(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
 