import os
import secrets
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .db import Base, SessionLocal, database, engine
from .models import Application, LoginAttempt, LoginSession, Publication, User
from .schemas import (
    ApplicationInput,
    Decision,
    Login,
    Profile,
    PublicationInput,
    PublicationStatus,
)
from .security import DUMMY_HASH, current_user, digest, passwords
from .seed import seed


@asynccontextmanager
async def lifespan(app):
    # Single initial schema for the prototype. Use migrations before evolving deployed data.
    Base.metadata.create_all(engine)
    if os.getenv("SEED_DEMO", "true").lower() == "true":
        with SessionLocal() as db:
            seed(db)
    yield


app = FastAPI(title="СОСТАВ API", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def same_origin(request: Request, call_next):
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        # Custom header is forbidden to cross-origin forms; no CORS is enabled.
        if request.headers.get("x-sostav-request") != "1":
            return JSONResponse({"detail": "Небезопасный запрос"}, status_code=403)
        origin = request.headers.get("origin")
        expected = os.getenv("APP_ORIGIN", "http://localhost:4181")
        if origin and origin.rstrip("/") != expected.rstrip("/"):
            return JSONResponse(
                {"detail": "Недопустимый источник запроса"}, status_code=403
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "same-origin"
    return response


def user_out(user, private=False):
    value = dict(
        id=user.id, name=user.name, bio=user.bio, skills=user.skills, avatar=user.avatar
    )
    if private:
        value.update(email=user.email, telegram=user.telegram)
    return value


def pub_out(pub):
    return {
        **{
            key: getattr(pub, key)
            for key in (
                "id",
                "owner_id",
                "kind",
                "project",
                "title",
                "description",
                "roles",
                "commitment",
                "location",
                "reward",
                "status",
                "created",
            )
        },
        "owner": user_out(pub.owner),
    }


def find_publication(db, publication_id, lock=False):
    stmt = select(Publication).where(Publication.id == publication_id)
    if lock:
        stmt = stmt.with_for_update()
    pub = db.scalar(stmt)
    if not pub:
        raise HTTPException(404, "Объявление не найдено")
    return pub


@app.get("/api/health")
def health(db: Session = Depends(database)):
    db.execute(select(1))
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(
    body: Login, request: Request, response: Response, db: Session = Depends(database)
):
    email = body.email.lower()
    key = digest(f"{request.client.host}:{email}")
    now = int(time.time())
    count = db.scalar(
        select(func.count())
        .select_from(LoginAttempt)
        .where(LoginAttempt.key == key, LoginAttempt.created > now - 900)
    )
    if count >= 10:
        raise HTTPException(429, "Слишком много попыток. Попробуйте через 15 минут")
    user = db.scalar(select(User).where(User.email == email))
    valid = passwords.verify(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        db.add(LoginAttempt(key=key))
        db.commit()
        raise HTTPException(401, "Неверная почта или пароль")
    previous = request.cookies.get("sostav_session")
    if previous:
        old = db.get(LoginSession, digest(previous))
        if old:
            db.delete(old)
    token = secrets.token_urlsafe(48)
    db.add(LoginSession(token_hash=digest(token), user_id=user.id, expires=now + 86400))
    db.commit()
    response.set_cookie(
        "sostav_session",
        token,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        max_age=86400,
        path=os.getenv("COOKIE_PATH", "/"),
    )
    return user_out(user, True)


@app.post("/api/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(database)):
    session = db.get(LoginSession, digest(request.cookies.get("sostav_session", "")))
    if session:
        db.delete(session)
        db.commit()
    response.delete_cookie("sostav_session", path=os.getenv("COOKIE_PATH", "/"))


@app.get("/api/me")
def me(user: User = Depends(current_user)):
    return user_out(user, True)


@app.patch("/api/me")
def profile(
    body: Profile, user: User = Depends(current_user), db: Session = Depends(database)
):
    for key, value in body.model_dump().items():
        setattr(user, key, value)
    db.commit()
    return user_out(user, True)


@app.get("/api/publications")
def publications(
    q: str = Query("", max_length=120),
    kind: str = "",
    mine: bool = False,
    offset: int = Query(0, ge=0),
    limit: int = Query(40, ge=1, le=100),
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    stmt = select(Publication).options(selectinload(Publication.owner))
    stmt = (
        stmt.where(Publication.owner_id == user.id)
        if mine
        else stmt.where(Publication.status == "active")
    )
    if kind:
        if kind not in ("startup", "vacancy"):
            raise HTTPException(422, "Неизвестный тип объявления")
        stmt = stmt.where(Publication.kind == kind)
    if q.strip():
        escaped = (
            q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        )
        stmt = stmt.where(
            or_(
                *[
                    getattr(Publication, column).ilike(f"%{escaped}%", escape="\\")
                    for column in ("project", "title", "description", "roles")
                ]
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    # Seed order is stable, new publications come first.
    rows = db.scalars(
        stmt.order_by(Publication.created.desc(), Publication.id.asc())
        .offset(offset)
        .limit(limit)
    ).all()
    return {"items": [pub_out(p) for p in rows], "total": total}


@app.get("/api/publications/{publication_id}")
def detail(
    publication_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    pub = find_publication(db, publication_id)
    if pub.status == "draft" and pub.owner_id != user.id:
        raise HTTPException(404, "Объявление не найдено")
    return pub_out(pub)


@app.post("/api/publications", status_code=201)
def create_publication(
    body: PublicationInput,
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    values = body.model_dump()
    values["request_id"] = str(body.request_id)
    existing = db.scalar(
        select(Publication).where(
            Publication.owner_id == user.id,
            Publication.request_id == values["request_id"],
        )
    )
    if existing:
        return pub_out(existing)
    pub = Publication(owner_id=user.id, **values)
    db.add(pub)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        pub = db.scalar(
            select(Publication).where(
                Publication.owner_id == user.id,
                Publication.request_id == values["request_id"],
            )
        )
        if not pub:
            raise
    return pub_out(pub)


@app.put("/api/publications/{publication_id}")
def edit_publication(
    publication_id: int,
    body: PublicationInput,
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    pub = find_publication(db, publication_id, True)
    if pub.owner_id != user.id:
        raise HTTPException(403, "Изменить объявление может только автор")
    if pub.status == "closed":
        raise HTTPException(409, "Сначала откройте набор заново")
    for key, value in body.model_dump(exclude={"request_id", "status"}).items():
        setattr(pub, key, value)
    db.commit()
    return pub_out(pub)


@app.patch("/api/publications/{publication_id}/status")
def publication_status(
    publication_id: int,
    body: PublicationStatus,
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    pub = find_publication(db, publication_id, True)
    if pub.owner_id != user.id:
        raise HTTPException(403, "Управлять набором может только автор")
    if body.status == pub.status:
        return pub_out(pub)
    if (pub.status, body.status) not in {
        ("draft", "active"),
        ("active", "closed"),
        ("closed", "active"),
    }:
        raise HTTPException(409, "Такой переход недоступен")
    pub.status = body.status
    if body.status == "closed":
        db.execute(
            update(Application)
            .where(
                Application.publication_id == pub.id, Application.status == "pending"
            )
            .values(status="rejected")
        )
    db.commit()
    return pub_out(pub)


@app.post("/api/publications/{publication_id}/applications", status_code=201)
def apply(
    publication_id: int,
    body: ApplicationInput,
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    pub = find_publication(db, publication_id, True)
    if pub.owner_id == user.id:
        raise HTTPException(409, "На своё объявление откликнуться нельзя")
    existing = db.scalar(
        select(Application).where(
            Application.publication_id == pub.id, Application.applicant_id == user.id
        )
    )
    if existing:
        return {"id": existing.id, "status": existing.status}
    if pub.status != "active":
        raise HTTPException(409, "Набор в проект уже закрыт")
    item = Application(
        publication_id=pub.id, applicant_id=user.id, message=body.message
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        item = db.scalar(
            select(Application).where(
                Application.publication_id == pub.id,
                Application.applicant_id == user.id,
            )
        )
        if not item:
            raise
    return {"id": item.id, "status": item.status}


@app.get("/api/applications")
def applications(
    direction: str = "sent",
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    if direction not in ("sent", "received"):
        raise HTTPException(422, "Неизвестное направление")
    stmt = (
        select(Application)
        .join(Publication)
        .options(
            selectinload(Application.publication).selectinload(Publication.owner),
            selectinload(Application.applicant),
        )
    )
    stmt = (
        stmt.where(Application.applicant_id == user.id)
        if direction == "sent"
        else stmt.where(Publication.owner_id == user.id)
    )
    rows = db.scalars(
        stmt.order_by(Application.created.desc(), Application.id.desc())
    ).all()
    return [
        {
            "id": a.id,
            "status": a.status,
            "message": a.message,
            "created": a.created,
            "publication": pub_out(a.publication),
            "applicant": user_out(a.applicant),
            "contact": (
                a.publication.owner.telegram
                if direction == "sent"
                else a.applicant.telegram
            )
            if a.status == "accepted"
            else None,
        }
        for a in rows
    ]


@app.patch("/api/applications/{application_id}")
def decide(
    application_id: int,
    body: Decision,
    user: User = Depends(current_user),
    db: Session = Depends(database),
):
    # Same lock order as closing a publication: publication, then application.
    initial = db.get(Application, application_id)
    if not initial:
        raise HTTPException(404, "Отклик не найден")
    pub = find_publication(db, initial.publication_id, True)
    item = db.scalar(
        select(Application)
        .where(Application.id == application_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    allowed = (
        item.applicant_id == user.id
        if body.status == "withdrawn"
        else pub.owner_id == user.id
    )
    if not allowed:
        raise HTTPException(403, "Нет доступа к этому действию")
    if item.status == body.status:
        return {"id": item.id, "status": item.status}
    if item.status != "pending":
        raise HTTPException(409, "Решение по этому отклику уже принято")
    item.status = body.status
    db.commit()
    return {"id": item.id, "status": item.status}
