import time

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(80))
    bio: Mapped[str] = mapped_column(Text, default="")
    skills: Mapped[str] = mapped_column(String(300), default="")
    telegram: Mapped[str] = mapped_column(String(32), default="")
    avatar: Mapped[str] = mapped_column(String(30), default="maria")


class LoginSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    expires: Mapped[int]


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(64), index=True)
    created: Mapped[int] = mapped_column(default=lambda: int(time.time()))


class Publication(Base):
    __tablename__ = "publications"
    __table_args__ = (
        UniqueConstraint("owner_id", "request_id"),
        CheckConstraint("kind IN ('startup','vacancy')"),
        CheckConstraint("status IN ('draft','active','closed')"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    owner: Mapped[User] = relationship()
    request_id: Mapped[str] = mapped_column(String(36))
    kind: Mapped[str] = mapped_column(String(10))
    project: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    roles: Mapped[str] = mapped_column(String(300))
    commitment: Mapped[str] = mapped_column(String(80))
    location: Mapped[str] = mapped_column(String(80))
    reward: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(10), default="active", index=True)
    created: Mapped[int] = mapped_column(default=lambda: int(time.time()))


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("publication_id", "applicant_id"),
        CheckConstraint("status IN ('pending','accepted','rejected','withdrawn')"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    publication_id: Mapped[int] = mapped_column(
        ForeignKey("publications.id"), index=True
    )
    publication: Mapped[Publication] = relationship()
    applicant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    applicant: Mapped[User] = relationship()
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="pending")
    created: Mapped[int] = mapped_column(default=lambda: int(time.time()))
