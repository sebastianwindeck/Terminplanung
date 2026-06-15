"""Add Excel template upload to company_settings

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("company_settings", sa.Column("template_filename", sa.String(500), nullable=True))
    op.add_column("company_settings", sa.Column("template_stored_path", sa.String(1000), nullable=True))
    op.add_column("company_settings", sa.Column("template_mime_type", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("company_settings", "template_mime_type")
    op.drop_column("company_settings", "template_stored_path")
    op.drop_column("company_settings", "template_filename")
