from enum import Enum
from core.constants import UserRole


class Permission(str, Enum):
    USERS_CREATE = "users:create"
    USERS_READ = "users:read"
    USERS_UPDATE = "users:update"
    USERS_DELETE = "users:delete"

    DOCUMENT_UPLOAD = "documents:upload"
    DOCUMENT_SEARCH = "documents:search"
    DOCUMENT_DELETE = "documents:delete"


ROLE_PERMISSIONS = {
    UserRole.ADMIN: {
        Permission.USERS_CREATE,
        Permission.USERS_READ,
        Permission.USERS_UPDATE,
        Permission.USERS_DELETE,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_SEARCH,
        Permission.DOCUMENT_DELETE,
    },
    UserRole.MANAGER: {
        Permission.USERS_READ,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_SEARCH,
    },
    UserRole.USER: {
        Permission.DOCUMENT_SEARCH,
    },
    UserRole.VIEWER: {
        Permission.DOCUMENT_SEARCH,
    },
}
