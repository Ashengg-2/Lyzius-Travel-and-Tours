"""Test-only Flask configuration (in-memory SQLite)."""


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    BRAND_NAME = "Lyzius Travel & Tours"
