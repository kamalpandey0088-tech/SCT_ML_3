"""initial schema

Revision ID: 001
Revises: 
Create Date: 2026-07-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create predictions table
    op.create_table(
        'predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('label', sa.String(length=10), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('confidence_pct', sa.Float(), nullable=False),
        sa.Column('probabilities', sa.JSON(), nullable=False),
        sa.Column('inference_ms', sa.Float(), nullable=False),
        sa.Column('gradcam_b64', sa.Text(), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    # Indexes on predictions for performant lookups
    op.create_index('idx_predictions_created_at', 'predictions', ['created_at'], unique=False)
    op.create_index('idx_predictions_ip_hash', 'predictions', ['ip_hash'], unique=False)

    # Create feedback table
    op.create_table(
        'feedback',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('prediction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('correct', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['prediction_id'], ['predictions.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('prediction_id')
    )

def downgrade() -> None:
    op.drop_index('idx_predictions_ip_hash', table_name='predictions')
    op.drop_index('idx_predictions_created_at', table_name='predictions')
    op.drop_table('feedback')
    op.drop_table('predictions')
