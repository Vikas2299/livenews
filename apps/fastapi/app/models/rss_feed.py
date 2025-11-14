from __future__ import annotations

from sqlalchemy import Column, Text, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import leaning_enum


class RSSFeed(Base):
    __tablename__ = "rss_feed"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    source = Column(Text, nullable=False)
    feed_url = Column(Text, nullable=False, unique=True)
    leaning = Column(leaning_enum, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # relationships
    articles = relationship("Article", back_populates="feed")