from __future__ import annotations

from sqlalchemy import (
    Column,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import leaning_enum


class Summary(Base):
    __tablename__ = "summary"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    cluster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cluster.id", ondelete="CASCADE"),
        nullable=False,
    )
    leaning = Column(leaning_enum, nullable=False)
    summary_text = Column(Text, nullable=False)
    summarized_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # relationships
    cluster = relationship("Cluster", back_populates="summaries")

    __table_args__ = (
        UniqueConstraint("cluster_id", "leaning", name="uq_summary_cluster_leaning"),
        Index("idx_summary_cluster_id", "cluster_id"),
    )