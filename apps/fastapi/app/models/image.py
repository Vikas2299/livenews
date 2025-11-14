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


class Image(Base):
    __tablename__ = "image"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    article_id = Column(
        UUID(as_uuid=True),
        ForeignKey("article.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_url = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    article = relationship("Article", back_populates="images")

    __table_args__ = (
        UniqueConstraint("article_id", "image_url", name="uq_image_article_url"),
        Index("idx_image_article_id", "article_id"),
    )