"""005 — wizard_quotes, lead_time_rules."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_wizard_quotes"
down_revision: Union[str, None] = "004_staff_accounts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lead_time_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("socket_type", sa.String(50), nullable=False),
        sa.Column("qty_min", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("qty_max", sa.Integer(), nullable=True),
        sa.Column("lead_time_label", sa.String(100), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("INSERT INTO lead_time_rules (socket_type, qty_min, qty_max, lead_time_label) VALUES ('all', 1, 20, '3 Weeks')")
    op.execute("INSERT INTO lead_time_rules (socket_type, qty_min, qty_max, lead_time_label) VALUES ('all', 21, NULL, 'To be confirmed by sales')")

    op.create_table(
        "wizard_quotes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("lang", sa.String(2), nullable=False, server_default="en"),
        sa.Column("series", sa.String(20), nullable=False),
        sa.Column("ic_type", sa.String(100), nullable=False),
        sa.Column("ic_code", sa.String(100), nullable=False),
        sa.Column("ic_package_code", sa.String(20), nullable=False),
        sa.Column("dimension_d", sa.Numeric(8, 3), nullable=True),
        sa.Column("dimension_e", sa.Numeric(8, 3), nullable=True),
        sa.Column("dimension_a", sa.Numeric(8, 3), nullable=True),
        sa.Column("pitch", sa.String(20), nullable=True),
        sa.Column("pin_count", sa.Integer(), nullable=True),
        sa.Column("socket_type_id", sa.Integer(), nullable=True),
        sa.Column("socket_type_name", sa.String(100), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("cover_type_id", sa.Integer(), nullable=True),
        sa.Column("material_type_id", sa.Integer(), nullable=True),
        sa.Column("spec_notes", sa.Text(), nullable=True),
        sa.Column("attachment_name", sa.String(255), nullable=True),
        sa.Column("matched", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("unit_price", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(10), nullable=True, server_default="KRW"),
        sa.Column("total_price", sa.Integer(), nullable=True),
        sa.Column("lead_time_label", sa.String(100), nullable=True),
        sa.Column("contact_name", sa.String(50), nullable=False),
        sa.Column("contact_company", sa.String(100), nullable=False),
        sa.Column("contact_email", sa.String(254), nullable=False),
        sa.Column("contact_phone", sa.String(30), nullable=True),
        sa.Column("membership_tier", sa.String(20), nullable=False, server_default="general"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("wizard_quotes")
    op.drop_table("lead_time_rules")
