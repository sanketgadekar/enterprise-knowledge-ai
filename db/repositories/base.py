from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class TenantRepository:

    def __init__(self, db: AsyncSession, company_id):
        self.db = db
        self.company_id = company_id

    def _tenant_filter(self, model):
        """
        Apply tenant filter automatically.
        """
        return select(model).where(
            model.company_id == self.company_id
        )

    async def get_all(self, model):
        query = self._tenant_filter(model)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, model, obj_id):
        query = self._tenant_filter(model).where(
            model.id == obj_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
