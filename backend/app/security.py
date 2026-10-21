import hashlib
import time

from fastapi import Depends, HTTPException, Request
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .db import database
from .models import LoginSession, User

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("dummy-password-for-timing")


def digest(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def current_user(request: Request, db: Session = Depends(database)):
    session = db.get(LoginSession, digest(request.cookies.get("sostav_session", "")))
    if not session or session.expires <= int(time.time()):
        raise HTTPException(401, "Войдите в аккаунт, чтобы продолжить")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, "Аккаунт не найден")
    return user
