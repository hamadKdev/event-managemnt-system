from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    attendee = "attendee"


class EventStatus(str, Enum):
    draft = "draft"
    published = "published"
    completed = "completed"
    cancelled = "cancelled"


class RegistrationStatus(str, Enum):
    active = "active"
    cancelled = "cancelled"


# ---------------- AUTH ----------------

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    admin_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------- EVENTS ----------------

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str    # "YYYY-MM-DD"
    time: str    # "HH:MM"
    location: str
    capacity: int = Field(gt=0)


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = Field(default=None, gt=0)


class EventStatusUpdate(BaseModel):
    status: EventStatus


class EventOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    date: str
    time: str
    location: str
    capacity: int
    status: EventStatus
    registered_count: int = 0
    available_spots: int = 0
    created_at: Optional[datetime] = None


# ---------------- REGISTRATIONS ----------------

class RegistrationOut(BaseModel):
    id: str
    event_id: str
    user_id: str
    status: RegistrationStatus
    created_at: Optional[datetime] = None
    event: Optional[EventOut] = None


class AttendeeOut(BaseModel):
    registration_id: str
    user_id: str
    name: str
    email: EmailStr
    status: RegistrationStatus
    registered_at: Optional[datetime] = None


class DashboardOut(BaseModel):
    total_events: int
    published_events: int
    total_registrations: int
    active_registrations: int
    total_capacity: int
    total_available: int
    