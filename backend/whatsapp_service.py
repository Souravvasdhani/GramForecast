"""Twilio WhatsApp delivery with a demo-safe preview fallback."""

import httpx

from config import settings


def send_whatsapp(to_number: str, message: str) -> bool:
    """Send through the Twilio Sandbox when configured; return False on fallback."""
    if not all((settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_WHATSAPP_FROM)):
        return False

    to = to_number.strip()
    if not to.startswith("whatsapp:"):
        to = f"whatsapp:{to if to.startswith('+') else '+91' + to.lstrip('0')}"
    from_number = settings.TWILIO_WHATSAPP_FROM
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"

    try:
        response = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
            data={"From": from_number, "To": to, "Body": message},
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=15,
        )
        response.raise_for_status()
        return True
    except httpx.HTTPError:
        return False