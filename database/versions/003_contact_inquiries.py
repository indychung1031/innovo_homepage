"""003 — contact_inquiries."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_contact_inquiries"
down_revision: Union[str, None] = "002_users_and_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contact_inquiries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("company_name", sa.String(length=100), nullable=False),
        sa.Column("contact_name", sa.String(length=50), nullable=False),
        sa.Column("contact_email", sa.String(length=254), nullable=False),
        sa.Column("contact_phone", sa.String(length=30), nullable=True),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("attachment_path", sa.String(length=500), nullable=True),
        sa.Column("attachment_name", sa.String(length=255), nullable=True),
        sa.Column("attachment_size", sa.Integer(), nullable=True),
        sa.Column("attachment_mime", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="new", nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("privacy_agreed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lang", sa.String(length=2), server_default="en", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contact_inquiries_created_at", "contact_inquiries", ["created_at"])
    op.create_index("ix_contact_inquiries_status", "contact_inquiries", ["status"])
    op.create_index("ix_contact_inquiries_category", "contact_inquiries", ["category"])


def downgrade() -> None:
    op.drop_index("ix_contact_inquiries_category", table_name="contact_inquiries")
    op.drop_index("ix_contact_inquiries_status", table_name="contact_inquiries")
    op.drop_index("ix_contact_inquiries_created_at", table_name="contact_inquiries")
    op.drop_table("contact_inquiries")
