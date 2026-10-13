from db.models import User
from db.repositories.base import TenantRepository


class UserRepository(TenantRepository):

    async def get_all_users(self):
        return await self.get_all(User)

    async def get_user_by_id(self, user_id):
        return await self.get_by_id(User, user_id)
