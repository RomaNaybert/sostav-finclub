import os

import pytest
from fastapi.testclient import TestClient

url = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test-sostav.sqlite")
if not (url.startswith("sqlite") or url.rsplit("/", 1)[-1].endswith("_test")):
    raise RuntimeError("TEST_DATABASE_URL must point to a dedicated *_test database")
os.environ["DATABASE_URL"] = url
os.environ["SEED_DEMO"] = "false"
from app.db import Base, SessionLocal, engine  # noqa: E402 - configure test database before importing app
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


@pytest.fixture
def client():
    with TestClient(app, headers={"X-Sostav-Request": "1"}) as c:
        yield c


@pytest.fixture
def maria(client):
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "maria@demo.local", "password": "Demo2026!"},
        ).status_code
        == 200
    )
    return client


@pytest.fixture
def alex():
    with TestClient(app, headers={"X-Sostav-Request": "1"}) as c:
        assert (
            c.post(
                "/api/auth/login",
                json={"email": "alex@demo.local", "password": "Demo2026!"},
            ).status_code
            == 200
        )
        yield c
