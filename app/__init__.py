import os

from flask import Flask

from app.config import INSTANCE_DIR
from app.models.database import db


def create_app(config_object="app.config.Config"):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_object)

    os.makedirs(INSTANCE_DIR, exist_ok=True)

    db.init_app(app)

    from app.routes.main import bp as main_bp
    from app.routes.itineraries import bp as itineraries_bp
    from app.routes.accounting import bp as accounting_bp
    from app.routes.api import bp as api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(itineraries_bp)
    app.register_blueprint(accounting_bp)
    app.register_blueprint(api_bp)

    with app.app_context():
        db.create_all()
        from app.models.accounting import ensure_accounting_row

        ensure_accounting_row()

    return app
