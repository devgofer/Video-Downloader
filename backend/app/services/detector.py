from urllib.parse import urlparse

from app.platforms.adapters import PLATFORM_ADAPTERS

def detect_platform(url: str) -> str:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return "unknown"

    for adapter in PLATFORM_ADAPTERS:
        if adapter.can_handle(host):
            return adapter.name
    return "unknown"
