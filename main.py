import os
import uuid
from datetime import datetime, date as date_cls
from notification import send_to_n8n
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from database import supabase
from models import (
    UserSignup, UserLogin, UserOut, Token, UserRole,
    EventCreate, EventUpdate, EventStatusUpdate, EventOut, EventStatus,
    RegistrationOut, AttendeeOut, DashboardOut, RegistrationStatus,
)
from auth import hash_password, verify_password, create_access_token, get_current_user, require_admin

app = FastAPI(title="Event Registration & Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ADMIN_SIGNUP_CODE = os.getenv("ADMIN_SIGNUP_CODE", "")


@app.get("/")
def root():
    return {"message": "Event Registration & Management System API is running"}

@app.get("/debug/env-check")
def debug_env_check():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY", "")
    return {
        "supabase_url": url,
        "key_length": len(key),
        "key_start": key[:15] if key else None,
        "key_end": key[-6:] if key else None,
    }


@app.post("/auth/register", response_model=Token)
def register(payload: UserSignup):
    existing = supabase.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = UserRole.attendee
    if payload.admin_code and ADMIN_SIGNUP_CODE and payload.admin_code == ADMIN_SIGNUP_CODE:
        role = UserRole.admin

    user_id = str(uuid.uuid4())
    supabase.table("users").insert({
        "id": user_id,
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": role.value,
    }).execute()

    token = create_access_token(user_id, role.value)
    user_out = UserOut(id=user_id, name=payload.name, email=payload.email, role=role)
    return Token(access_token=token, user=user_out)

@app.post("/auth/login", response_model=Token)
def login(payload: UserLogin):
    result = supabase.table("users").select("*").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"], user["role"])
    user_out = UserOut(id=user["id"], name=user["name"], email=user["email"], role=user["role"])
    return Token(access_token=token, user=user_out)

@app.get("/auth/me", response_model=UserOut)
def me(current_user: UserOut = Depends(get_current_user)):
    return current_user

def _active_registration_count(event_id: str) -> int:
    result = (
        supabase.table("registrations")
        .select("id", count="exact")
        .eq("event_id", event_id)
        .eq("status", RegistrationStatus.active.value)
        .execute()
    )
    return result.count or 0


def _event_to_out(event: dict) -> EventOut:
    registered = _active_registration_count(event["id"])
    return EventOut(
        id=event["id"],
        title=event["title"],
        description=event.get("description"),
        date=event["date"],
        time=event["time"],
        location=event["location"],
        capacity=event["capacity"],
        status=event["status"],
        registered_count=registered,
        available_spots=max(event["capacity"] - registered, 0),
        created_at=event.get("created_at"),
    )


def _is_future(event_date: str, event_time: str) -> bool:
    try:
        dt = datetime.strptime(f"{event_date} {event_time}", "%Y-%m-%d %H:%M")
        return dt > datetime.now()
    except ValueError:
        return True


# ===========================================================================
# EVENTS — admin management
# ===========================================================================

@app.post("/admin/events", response_model=EventOut)
def create_event(payload: EventCreate, admin: UserOut = Depends(require_admin)):
    event_id = str(uuid.uuid4())
    data = payload.dict()
    data.update({"id": event_id, "status": EventStatus.draft.value, "created_by": admin.id})
    result = supabase.table("events").insert(data).execute()
    return _event_to_out(result.data[0])

@app.put("/admin/events/{event_id}", response_model=EventOut)
def update_event(event_id: str, payload: EventUpdate, admin: UserOut = Depends(require_admin)):
    existing = supabase.table("events").select("*").eq("id", event_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Event not found")

    updates = {k: v for k, v in payload.dict().items() if v is not None}

    if "capacity" in updates:
        active_count = _active_registration_count(event_id)
        if updates["capacity"] < active_count:
            raise HTTPException(
                status_code=400,
                detail=f"Capacity cannot be reduced below {active_count} active registrations",
            )

    if updates:
        supabase.table("events").update(updates).eq("id", event_id).execute()

    result = supabase.table("events").select("*").eq("id", event_id).execute()
    return _event_to_out(result.data[0])

@app.patch("/admin/events/{event_id}/status", response_model=EventOut)
def change_event_status(event_id: str, payload: EventStatusUpdate, admin: UserOut = Depends(require_admin)):
    existing = supabase.table("events").select("*").eq("id", event_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Event not found")

    supabase.table("events").update({"status": payload.status.value}).eq("id", event_id).execute()
    result = supabase.table("events").select("*").eq("id", event_id).execute()
    event = result.data[0]

    if payload.status == EventStatus.cancelled:
        # n8n will look up all registered attendees for this event_id via
        # Supabase and email each one — we just tell it which event was cancelled.
        send_to_n8n("event_cancelled", {
            "event_id": event["id"],
            "event_title": event["title"],
            "event_date": event["date"],
            "event_time": event["time"],
            "location": event["location"],
        })

    return _event_to_out(event)



@app.get("/admin/events", response_model=list[EventOut])
def list_all_events(admin: UserOut = Depends(require_admin)):
    result = supabase.table("events").select("*").order("date").execute()
    return [_event_to_out(e) for e in result.data]


@app.get("/admin/events/{event_id}/attendees", response_model=list[AttendeeOut])
def list_event_attendees(event_id: str, admin: UserOut = Depends(require_admin)):
    result = (
        supabase.table("registrations")
        .select("id, status, created_at, users(id, name, email)")
        .eq("event_id", event_id)
        .execute()
    )
    attendees = []
    for row in result.data:
        user = row["users"]
        attendees.append(AttendeeOut(
            registration_id=row["id"],
            user_id=user["id"],
            name=user["name"],
            email=user["email"],
            status=row["status"],
            registered_at=row.get("created_at"),
        ))
    return attendees


@app.get("/admin/dashboard", response_model=DashboardOut)
def dashboard(admin: UserOut = Depends(require_admin)):
    events_result = supabase.table("events").select("id, status, capacity").execute()
    events = events_result.data

    regs_result = supabase.table("registrations").select("id, status").execute()
    regs = regs_result.data

    total_capacity = sum(e["capacity"] for e in events)
    active_regs = [r for r in regs if r["status"] == RegistrationStatus.active.value]

    return DashboardOut(
        total_events=len(events),
        published_events=len([e for e in events if e["status"] == EventStatus.published.value]),
        total_registrations=len(regs),
        active_registrations=len(active_regs),
        total_capacity=total_capacity,
        total_available=max(total_capacity - len(active_regs), 0),
    )
# ===========================================================================
# EVENTS — public / attendee discovery
# ===========================================================================

@app.get("/events", response_model=list[EventOut])
def list_published_events():
    today = date_cls.today().isoformat()
    result = (
        supabase.table("events")
        .select("*")
        .eq("status", EventStatus.published.value)
        .gte("date", today)
        .order("date")
        .execute()
    )
    return [_event_to_out(e) for e in result.data]


@app.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: str):
    result = supabase.table("events").select("*").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_to_out(result.data[0])

# ===========================================================================
# REGISTRATIONS — attendee
# ===========================================================================

@app.post("/events/{event_id}/register", response_model=RegistrationOut)
def register_for_event(event_id: str, current_user: UserOut = Depends(get_current_user)):
    event_result = supabase.table("events").select("*").eq("id", event_id).execute()
    if not event_result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    event = event_result.data[0]

    if event["status"] != EventStatus.published.value:
        raise HTTPException(status_code=400, detail="This event is not open for registration")

    if not _is_future(event["date"], event["time"]):
        raise HTTPException(status_code=400, detail="This event has already taken place")

    existing = (
        supabase.table("registrations")
        .select("id")
        .eq("event_id", event_id)
        .eq("user_id", current_user.id)
        .eq("status", RegistrationStatus.active.value)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="You are already registered for this event")

    active_count = _active_registration_count(event_id)
    if active_count >= event["capacity"]:
        raise HTTPException(status_code=400, detail="This event is full")

    reg_id = str(uuid.uuid4())
    supabase.table("registrations").insert({
        "id": reg_id,
        "event_id": event_id,
        "user_id": current_user.id,
        "status": RegistrationStatus.active.value,
    }).execute()

    result = supabase.table("registrations").select("*").eq("id", reg_id).execute()
    reg = result.data[0]

    # Notify n8n so it can send the confirmation email (to attendee + admin)
    send_to_n8n("registration_created", {
        "name": current_user.name,
        "email": current_user.email,
        "event_title": event["title"],
        "event_date": event["date"],
        "event_time": event["time"],
        "location": event["location"],
        "registration_id": reg_id,
    })

    return RegistrationOut(
        id=reg["id"], event_id=reg["event_id"], user_id=reg["user_id"],
        status=reg["status"], created_at=reg.get("created_at"),
    )

@app.get("/me/registrations", response_model=list[RegistrationOut])
def my_registrations(current_user: UserOut = Depends(get_current_user)):
    result = (
        supabase.table("registrations")
        .select("*, events(*)")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .execute()
    )
    out = []
    for reg in result.data:
        event = reg.get("events")
        out.append(RegistrationOut(
            id=reg["id"], event_id=reg["event_id"], user_id=reg["user_id"],
            status=reg["status"], created_at=reg.get("created_at"),
            event=_event_to_out(event) if event else None,
        ))
    return out

@app.delete("/registrations/{registration_id}")
def cancel_registration(registration_id: str, current_user: UserOut = Depends(get_current_user)):
    result = supabase.table("registrations").select("*").eq("id", registration_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Registration not found")

    reg = result.data[0]
    if reg["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You can only cancel your own registration")

    if reg["status"] == RegistrationStatus.cancelled.value:
        raise HTTPException(status_code=400, detail="Registration is already cancelled")

    supabase.table("registrations").update(
        {"status": RegistrationStatus.cancelled.value}
    ).eq("id", registration_id).execute()

    # Notify n8n so it can send the cancellation email
    event_result = supabase.table("events").select("*").eq("id", reg["event_id"]).execute()
    event = event_result.data[0] if event_result.data else {}
    send_to_n8n("registration_cancelled", {
        "name": current_user.name,
        "email": current_user.email,
        "event_title": event.get("title"),
        "event_date": event.get("date"),
        "event_time": event.get("time"),
        "location": event.get("location"),
        "registration_id": registration_id,
    })

    return {"message": "Registration cancelled"}
