"""add_developer_fields_to_tools

Revision ID: bc7d9fe12ca3
Revises: 7b9543a2c575
Create Date: 2025-07-20 12:32:35.105314

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bc7d9fe12ca3'
down_revision: Union[str, None] = '7b9543a2c575'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
