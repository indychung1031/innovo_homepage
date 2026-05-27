"""quick_quote_inquiries 테이블 생성

Revision ID: 001_quick_quote
Revises:
Create Date: 2026-05-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_quick_quote"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quick_quote_inquiries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ic_type", sa.String(length=50), nullable=True),
        sa.Column("ic_package_type", sa.String(length=20), nullable=False),
        sa.Column("ic_code", sa.String(length=100), nullable=True),
        sa.Column("pin_count", sa.Integer(), nullable=False),
        sa.Column("pitch", sa.String(length=10), nullable=False),
        sa.Column("package_d", sa.Numeric(precision=8, scale=3), nullable=False),
        sa.Column("package_e", sa.Numeric(precision=8, scale=3), nullable=False),
        sa.Column("package_a", sa.Numeric(precision=8, scale=3), nullable=True),
        sa.Column("company_name", sa.String(length=100), nullable=False),
        sa.Column("contact_name", sa.String(length=50), nullable=False),
        sa.Column("contact_email", sa.String(length=254), nullable=False),
        sa.Column("contact_phone", sa.String(length=30), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("desired_delivery", sa.Date(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("erp_inquiry_id", sa.Integer(), nullable=True),
        sa.Column("privacy_agreed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("quick_quote_inquiries")
