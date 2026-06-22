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
    _migrate_sqlite_tables()


def _migrate_sqlite_tables() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    migrations_by_table = {
        "assets": {
            "original_filename": "ALTER TABLE assets ADD COLUMN original_filename VARCHAR(500) DEFAULT '' NOT NULL",
            "stored_filename": "ALTER TABLE assets ADD COLUMN stored_filename VARCHAR(500) DEFAULT '' NOT NULL",
            "relative_path": "ALTER TABLE assets ADD COLUMN relative_path VARCHAR(700) DEFAULT '' NOT NULL",
            "mime_type": "ALTER TABLE assets ADD COLUMN mime_type VARCHAR(160) DEFAULT '' NOT NULL",
            "size_bytes": "ALTER TABLE assets ADD COLUMN size_bytes INTEGER DEFAULT 0 NOT NULL",
        },
        "characters": {
            "anchor_asset_id": "ALTER TABLE characters ADD COLUMN anchor_asset_id INTEGER",
            "anchor_locked": "ALTER TABLE characters ADD COLUMN anchor_locked BOOLEAN DEFAULT 0 NOT NULL",
            "face_identity_notes": "ALTER TABLE characters ADD COLUMN face_identity_notes TEXT DEFAULT '' NOT NULL",
            "outfit_lock_notes": "ALTER TABLE characters ADD COLUMN outfit_lock_notes TEXT DEFAULT '' NOT NULL",
            "color_palette_notes": "ALTER TABLE characters ADD COLUMN color_palette_notes TEXT DEFAULT '' NOT NULL",
            "prop_notes": "ALTER TABLE characters ADD COLUMN prop_notes TEXT DEFAULT '' NOT NULL",
            "anchor_review_notes": "ALTER TABLE characters ADD COLUMN anchor_review_notes TEXT DEFAULT '' NOT NULL",
        },
        "locations": {
            "anchor_asset_id": "ALTER TABLE locations ADD COLUMN anchor_asset_id INTEGER",
            "anchor_locked": "ALTER TABLE locations ADD COLUMN anchor_locked BOOLEAN DEFAULT 0 NOT NULL",
            "layout_notes": "ALTER TABLE locations ADD COLUMN layout_notes TEXT DEFAULT '' NOT NULL",
            "lighting_lock_notes": "ALTER TABLE locations ADD COLUMN lighting_lock_notes TEXT DEFAULT '' NOT NULL",
            "color_palette_notes": "ALTER TABLE locations ADD COLUMN color_palette_notes TEXT DEFAULT '' NOT NULL",
            "geography_notes": "ALTER TABLE locations ADD COLUMN geography_notes TEXT DEFAULT '' NOT NULL",
            "anchor_review_notes": "ALTER TABLE locations ADD COLUMN anchor_review_notes TEXT DEFAULT '' NOT NULL",
        },
    }
    with engine.begin() as connection:
        for table_name, migrations in migrations_by_table.items():
            if table_name not in table_names:
                continue
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, statement in migrations.items():
                if column_name not in existing_columns:
                    connection.execute(text(statement))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
