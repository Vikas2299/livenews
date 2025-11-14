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
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from app.models.constants import EMBED_DIM


class Article(Base):
    __tablename__ = "article"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    feed_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rss_feed.id", ondelete="SET NULL"),
        nullable=True,
    )
    cluster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cluster.id", ondelete="SET NULL"),
        nullable=True,
    )

    title = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    published_at = Column(DateTime(timezone=True))
    scraped_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    embedding = Column(Vector(EMBED_DIM))
    scraped_text = Column(Text)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # relationships
    feed = relationship("RSSFeed", back_populates="articles")
    cluster = relationship("Cluster", back_populates="articles")
    images = relationship(
        "Image",
        back_populates="article",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("url", name="uq_article_url"),
        Index("idx_article_published_at", "published_at"),
        Index("idx_article_feed_id", "feed_id"),
        Index("idx_article_cluster_id", "cluster_id"),
        Index(
            "idx_article_embedding_ann",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_with={"lists": "100"},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )