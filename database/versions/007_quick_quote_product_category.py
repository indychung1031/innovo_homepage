"""007 — quick_quote_inquiries.product_category 컬럼 추가."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_quick_quote_product_category"
down_revision: Union[str, None] = "006_wizard_admin_note"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("quick_quote_inquiries", sa.Column("product_category", sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column("quick_quote_inquiries", "product_category")
