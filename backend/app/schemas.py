from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class Login(Input):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class Profile(Input):
    name: str = Field(min_length=2, max_length=80)
    bio: str = Field(max_length=1200)
    skills: str = Field(max_length=300)
    telegram: str = Field(pattern=r"^(@?[a-zA-Z][a-zA-Z0-9_]{4,31})?$")


class PublicationInput(Input):
    request_id: UUID
    kind: Literal["startup", "vacancy"]
    project: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=30, max_length=6000)
    roles: str = Field(min_length=2, max_length=300)
    commitment: str = Field(min_length=2, max_length=80)
    location: str = Field(min_length=2, max_length=80)
    reward: str = Field(min_length=2, max_length=200)
    status: Literal["draft", "active"] = "active"


class PublicationStatus(Input):
    status: Literal["draft", "active", "closed"]


class ApplicationInput(Input):
    message: str = Field(min_length=15, max_length=2000)


class Decision(Input):
    status: Literal["accepted", "rejected", "withdrawn"]
