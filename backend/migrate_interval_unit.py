import sys
sys.path.insert(0, '.')
from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        sql = "ALTER TABLE bps_api_configs ADD COLUMN sync_interval_unit VARCHAR(20) DEFAULT 'hours'"
        db.session.execute(text(sql))
        db.session.commit()
        print("Column sync_interval_unit added successfully.")
    except Exception as e:
        msg = str(e).lower()
        if 'already exists' in msg or 'duplicate column' in msg or 'column' in msg:
            print(f"Column likely already exists: {e}")
        else:
            print(f"Migration error: {e}")
