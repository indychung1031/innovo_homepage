"""006 — wizard_quotes.admin_note 컬럼 추가."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_wizard_admin_note"
down_revision: Union[str, None] = "005_wizard_quotes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("wizard_quotes", sa.Column("admin_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("wizard_quotes", "admin_note")
