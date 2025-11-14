from __future__ import annotations

from sqlalchemy import Column, Text, DateTime, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from app.models.constants import EMBED_DIM


class Cluster(Base):
    __tablename__ = "cluster"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    title = Column(Text)
    centroid = Column(Vector(EMBED_DIM))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # relationships
    articles = relationship("Article", back_populates="cluster")
    summaries = relationship(
        "Summary",
        back_populates="cluster",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "idx_cluster_centroid_ann",
            "centroid",
            postgresql_using="ivfflat",
            postgresql_with={"lists": "50"},
            postgresql_ops={"centroid": "vector_cosine_ops"},
        ),
    )