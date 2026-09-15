import os
import requests

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")


def send_to_n8n(event_type: str, data: dict) -> None:
    if not N8N_WEBHOOK_URL:
        return

    try:
        payload = {"event_type": event_type, **data}
        requests.post(N8N_WEBHOOK_URL, json=payload, timeout=5)
    except requests.RequestException:
        pass

