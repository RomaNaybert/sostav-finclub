import time
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from app.db import SessionLocal, engine
from app.main import app
from app.models import LoginSession, User
from fastapi.testclient import TestClient
from sqlalchemy import select


def proposal(**overrides):
    return {
        "request_id": str(uuid4()),
        "kind": "startup",
        "project": "Новый проект",
        "title": "Ищем разработчика в команду",
        "description": "Делаем полезный сервис для студентов и собираем команду для запуска первого прототипа.",
        "roles": "Python, React",
        "commitment": "10 часов в неделю",
        "location": "Москва",
        "reward": "Доля в проекте",
        **overrides,
    }


def test_full_lifecycle(maria, alex):
    pub = maria.post("/api/publications", json=proposal()).json()
    assert pub["owner"]["name"] == "Мария Волкова"
    assert pub["id"] in [p["id"] for p in alex.get("/api/publications").json()["items"]]
    response = alex.post(
        f"/api/publications/{pub['id']}/applications",
        json={"message": "Хочу помочь с Python, есть опыт разработки API."},
    )
    assert response.status_code == 201
    item = response.json()
    assert (
        maria.get("/api/applications?direction=received").json()[0]["id"] == item["id"]
    )
    assert alex.get("/api/applications").json()[0]["contact"] is None
    assert (
        maria.patch(
            f"/api/applications/{item['id']}", json={"status": "accepted"}
        ).json()["status"]
        == "accepted"
    )
    sent = alex.get("/api/applications").json()[0]
    assert sent["status"] == "accepted" and sent["contact"] == "maria_sostav"
    assert (
        maria.get("/api/applications?direction=received").json()[0]["contact"]
        == "alex_sostav"
    )


def test_repeat_publication_and_application(maria, alex):
    body = proposal()
    one = maria.post("/api/publications", json=body).json()
    assert maria.post("/api/publications", json=body).json()["id"] == one["id"]
    path = f"/api/publications/{one['id']}/applications"
    data = {"message": "Я умею писать на Python и хочу присоединиться."}
    assert alex.post(path, json=data).json() == alex.post(path, json=data).json()
    assert len(alex.get("/api/applications").json()) == 1


def test_access_controls(maria, alex):
    assert (
        maria.post(
            "/api/publications/2/applications",
            json={"message": "Это моя публикация, откликнуться нельзя."},
        ).status_code
        == 409
    )
    assert (
        alex.patch("/api/publications/2/status", json={"status": "closed"}).status_code
        == 403
    )
    assert alex.put("/api/publications/2", json=proposal()).status_code == 403
    own = maria.post(
        "/api/publications/1/applications",
        json={"message": "Хочу в вашу команду, умею делать дизайн."},
    ).json()
    assert (
        maria.patch(
            f"/api/applications/{own['id']}", json={"status": "accepted"}
        ).status_code
        == 403
    )
    assert (
        alex.patch(
            f"/api/applications/{own['id']}", json={"status": "withdrawn"}
        ).status_code
        == 403
    )
    assert alex.get("/api/applications").json() == []
    assert maria.get("/api/applications?direction=received").json() == []
    assert "telegram" not in maria.get("/api/publications/1").json()["owner"]


def test_draft_and_closed(maria, alex):
    pub = maria.post("/api/publications", json=proposal(status="draft")).json()
    path = f"/api/publications/{pub['id']}"
    assert alex.get(path).status_code == 404
    assert pub["id"] not in [
        p["id"] for p in alex.get("/api/publications").json()["items"]
    ]
    assert (
        alex.post(
            path + "/applications",
            json={"message": "Хочу к вам в команду, есть нужный опыт."},
        ).status_code
        == 409
    )
    assert maria.patch(path + "/status", json={"status": "active"}).status_code == 200
    pending = alex.post(
        path + "/applications",
        json={"message": "Хочу к вам в команду, есть нужный опыт."},
    ).json()
    assert maria.patch(path + "/status", json={"status": "closed"}).status_code == 200
    assert alex.get("/api/applications").json()[0]["status"] == "rejected"
    assert (
        maria.patch(
            f"/api/applications/{pending['id']}", json={"status": "accepted"}
        ).status_code
        == 409
    )
    assert maria.patch(path + "/status", json={"status": "active"}).status_code == 200
    assert (
        alex.post(
            path + "/applications",
            json={"message": "Хочу к вам в команду, есть нужный опыт."},
        ).json()["id"]
        == pending["id"]
    )
    assert maria.patch(path + "/status", json={"status": "draft"}).status_code == 409


def test_decisions_are_terminal_and_idempotent(maria, alex):
    item = maria.post(
        "/api/publications/1/applications",
        json={"message": "Я готова помочь с дизайном вашего продукта."},
    ).json()
    path = f"/api/applications/{item['id']}"
    assert maria.patch(path, json={"status": "withdrawn"}).status_code == 200
    assert maria.patch(path, json={"status": "withdrawn"}).status_code == 200
    assert alex.patch(path, json={"status": "accepted"}).status_code == 409


def test_validation_search_and_empty(maria):
    assert maria.post("/api/publications", json=proposal(title=" ")).status_code == 422
    assert (
        maria.post("/api/publications", json=proposal(description="short")).status_code
        == 422
    )
    assert maria.post("/api/publications", json=proposal(owner_id=2)).status_code == 422
    assert (
        maria.post(
            "/api/publications/1/applications", json={"message": "  "}
        ).status_code
        == 422
    )
    assert maria.get("/api/publications?q=неттакогопроекта").json()["items"] == []
    assert maria.get("/api/publications?q=%25").json()["items"] == []
    assert maria.get("/api/publications?q=Python").json()["total"] == 1
    assert maria.get("/api/publications?kind=vacancy").json()["total"] == 2
    assert maria.get("/api/publications?kind=garbage").status_code == 422
    assert maria.get("/api/publications?offset=-1").status_code == 422
    assert maria.get("/api/publications?limit=1000").status_code == 422
    assert maria.get("/api/publications/9999").status_code == 404
    assert (
        maria.patch("/api/applications/999", json={"status": "accepted"}).status_code
        == 404
    )


def test_session_security(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/publications").status_code == 401
    assert (
        client.post(
            "/api/auth/login", json={"email": "wrong", "password": "wrong"}
        ).status_code
        == 401
    )
    response = client.post(
        "/api/auth/login", json={"email": "maria@demo.local", "password": "Demo2026!"}
    )
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert "password" not in response.text
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/me").status_code == 401
    client.post(
        "/api/auth/login", json={"email": "maria@demo.local", "password": "Demo2026!"}
    )
    with SessionLocal() as db:
        session = db.scalar(select(LoginSession))
        session.expires = int(time.time()) - 1
        db.commit()
    assert client.get("/api/me").status_code == 401


def test_csrf_and_rate_limit(client):
    with TestClient(app) as unsafe:
        assert unsafe.post("/api/auth/logout").status_code == 403
    assert (
        client.post(
            "/api/auth/logout", headers={"Origin": "https://evil.example"}
        ).status_code
        == 403
    )
    for _ in range(10):
        assert (
            client.post(
                "/api/auth/login",
                json={"email": "maria@demo.local", "password": "wrong"},
            ).status_code
            == 401
        )
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "maria@demo.local", "password": "Demo2026!"},
        ).status_code
        == 429
    )


def test_profile_and_persistence(maria):
    body = {
        "name": "Мария Тестовая",
        "bio": "Создаю продукты.",
        "skills": "Python, Figma",
        "telegram": "@maria_demo",
    }
    assert maria.patch("/api/me", json=body).status_code == 200
    assert maria.get("/api/me").json()["name"] == body["name"]
    with SessionLocal() as db:
        assert (
            db.scalar(select(User).where(User.email == "maria@demo.local")).name
            == body["name"]
        )
    assert (
        maria.patch(
            "/api/me", json={**body, "telegram": "javascript:alert(1)"}
        ).status_code
        == 422
    )


def test_parallel_duplicate_apply(maria):
    if engine.dialect.name != "postgresql":
        import pytest

        pytest.skip("Row locking requires PostgreSQL")
    cookies = dict(maria.cookies)

    def apply():
        with TestClient(app, headers={"X-Sostav-Request": "1"}, cookies=cookies) as c:
            return c.post(
                "/api/publications/1/applications",
                json={"message": "Хочу помочь с разработкой и дизайном продукта."},
            )

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: apply(), range(4)))
    assert all(r.status_code == 201 for r in results)
    assert len({r.json()["id"] for r in results}) == 1
    assert len(maria.get("/api/applications").json()) == 1


def test_concurrent_decisions(maria, alex):
    if engine.dialect.name != "postgresql":
        import pytest

        pytest.skip("Row locking requires PostgreSQL")
    item = maria.post(
        "/api/publications/1/applications",
        json={"message": "Хочу помочь с разработкой вашего продукта."},
    ).json()
    cookies = dict(alex.cookies)

    def decide(status):
        with TestClient(app, headers={"X-Sostav-Request": "1"}, cookies=cookies) as c:
            return c.patch(f"/api/applications/{item['id']}", json={"status": status})

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(decide, ["accepted", "rejected"]))
    assert sorted(r.status_code for r in results) == [200, 409]
    assert maria.get("/api/applications").json()[0]["status"] in (
        "accepted",
        "rejected",
    )


def test_concurrent_publication_retry(maria):
    if engine.dialect.name != "postgresql":
        import pytest

        pytest.skip("This check targets PostgreSQL uniqueness")
    body = proposal()
    cookies = dict(maria.cookies)

    def create(_):
        with TestClient(app, headers={"X-Sostav-Request": "1"}, cookies=cookies) as c:
            return c.post("/api/publications", json=body)

    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(create, range(3)))
    assert all(r.status_code == 201 for r in results)
    assert len({r.json()["id"] for r in results}) == 1
