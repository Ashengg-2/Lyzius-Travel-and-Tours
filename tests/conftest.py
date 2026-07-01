import pytest

from app import create_app
from app.models.database import db


@pytest.fixture
def app():
    application = create_app("tests.config.TestConfig")
    with application.app_context():
        db.create_all()
        from app.models.accounting import ensure_accounting_row

        ensure_accounting_row()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()
