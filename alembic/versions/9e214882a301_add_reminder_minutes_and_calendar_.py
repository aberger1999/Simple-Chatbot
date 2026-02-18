"""add reminder_minutes and calendar_reminders_enabled

Revision ID: 9e214882a301
Revises: ce9a48b12f0e
Create Date: 2026-02-18 00:21:03.636193

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9e214882a301'
down_revision: Union[str, None] = 'ce9a48b12f0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('calendar_events', sa.Column('reminder_minutes', sa.Integer(), nullable=True))
    op.add_column('notification_preferences', sa.Column('calendar_reminders_enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade() -> None:
    op.drop_column('notification_preferences', 'calendar_reminders_enabled')
    op.drop_column('calendar_events', 'reminder_minutes')
