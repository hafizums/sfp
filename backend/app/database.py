from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_assets_table()


def _migrate_sqlite_assets_table() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "assets" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("assets")}
    migrations = {
        "original_filename": "ALTER TABLE assets ADD COLUMN original_filename VARCHAR(500) DEFAULT '' NOT NULL",
        "stored_filename": "ALTER TABLE assets ADD COLUMN stored_filename VARCHAR(500) DEFAULT '' NOT NULL",
        "relative_path": "ALTER TABLE assets ADD COLUMN relative_path VARCHAR(700) DEFAULT '' NOT NULL",
        "mime_type": "ALTER TABLE assets ADD COLUMN mime_type VARCHAR(160) DEFAULT '' NOT NULL",
        "size_bytes": "ALTER TABLE assets ADD COLUMN size_bytes INTEGER DEFAULT 0 NOT NULL",
    }
    with engine.begin() as connection:
        for column_name, statement in migrations.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
