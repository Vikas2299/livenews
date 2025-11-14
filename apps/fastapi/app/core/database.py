from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]  # .../apps/fastapi
load_dotenv(BASE_DIR / ".env")


DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=False, future = True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_ = Session)

class Base(DeclarativeBase):
    pass

from fastapi import Depends

def get_db() -> Session:
    db = SessionLocal() 
    try: 
        yield db
    finally:
        db.close()