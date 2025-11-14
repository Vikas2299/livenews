from __future__ import annotations
import enum
from sqlalchemy import (
    Column, Text, DateTime, ForeignKey, UniqueConstraint, Index, text
)

from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, ENUM
from pgvector.sqlalchemy import Vector

Base = declarative_base()


# ------------------ constants ------------------
EMBED_DIM = 768                                                 # set to embedding dimension


# -------------------- enums --------------------
class LeaningEnum(str, enum.Enum):
    LEFT = "LEFT"
    CENTER = "CENTER"
    RIGHT = "RIGHT"


leaning_enum = ENUM(LeaningEnum, name="leaning_enum", create_type=True)

# ------------------ tables -------------------

class RSSFeed(Base):
    __tablename__ = "rss_feed"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    source = Column(Text, nullable=False)
    feed_url = Column(Text, nullable=False, unique=True)
    leaning= Column(leaning_enum, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
                        

    # relationships
    # OneToMany from RSSFeed to Article
    articles = relationship("Article", back_populates="feed")


class Cluster(Base):
    __tablename__ = "cluster"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    title = Column(Text)
    centroid = Column(Vector(EMBED_DIM))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # relationships
    articles = relationship("Article", back_populates="cluster")
    summaries = relationship("Summary", back_populates="cluster", cascade="all, delete-orphan")


    __table_args__ = ( 
        # ANN index on centroid (requires pgvector)
        # add manually in the migration

        Index("idx_cluster_centroid_ann", "centroid",
              postgresql_using="ivfflat",
              postgresql_with={"lists": "50"},
              postgresql_ops={"centroid": "vector_cosine_ops"}),
    )


class Article(Base):
    __tablename__ = "article"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    feed_id = Column(UUID(as_uuid=True),                                                            #FK
                    ForeignKey("rss_feed.id", ondelete= "SET NULL"), nullable=True)
    cluster_id = Column(UUID(as_uuid=True),                                                         #FK
                    ForeignKey("cluster.id", ondelete= "SET NULL"), nullable=True)
    
    title = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    published_at = Column(DateTime(timezone=True))
    scraped_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    embedding = Column(Vector(EMBED_DIM))
    scraped_text = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # relationships
    feed = relationship("RSSFeed", back_populates="articles")
    cluster = relationship("Cluster", back_populates="articles")
    images = relationship("Image", back_populates="article", cascade="all, delete-orphan")


    __table_args__ = (
        UniqueConstraint("url", name="uq_article_url"),
        Index("idx_article_published_at", "published_at"),
        Index("idx_article_feed_id", "feed_id"),
        Index("idx_article_cluster_id", "cluster_id"),
        
        # ANN index for fast similarity search on embeddings
        Index("idx_article_embedding_ann", "embedding", 
              postgresql_using="ivfflat",
              postgresql_with={"lists": "100"},
              postgresql_ops={"embedding": "vector_cosine_ops"})
    )



class Image(Base):
    __tablename__ = "image"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    article_id = Column(UUID(as_uuid=True),
                        ForeignKey("article.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    article = relationship("Article", back_populates="images")

    __table_args__ =(
        UniqueConstraint("article_id", "image_url", name="uq_image_article_url"),
        Index("idx_image_article_id", "article_id")
    )


class Summary(Base):
    __tablename__ = "summary"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    cluster_id = Column(UUID(as_uuid=True),
                        ForeignKey("cluster.id", ondelete="CASCADE"),
                        nullable=False)
    leaning = Column(leaning_enum, nullable=False)
    summary_text = Column(Text, nullable=False)
    summarized_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # relationships
    cluster = relationship("Cluster", back_populates="summaries")

    __table_args__ = (
        UniqueConstraint("cluster_id", "leaning", name="uq_summary_cluster_leaning"), 
        Index("idx_summary_cluster_id", "cluster_id"),
    )







