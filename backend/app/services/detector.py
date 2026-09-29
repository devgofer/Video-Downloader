from urllib.parse import urlparse

PLATFORM_HOSTS = {
    "instagram": {"instagram.com", "www.instagram.com"},
    "facebook": {"facebook.com", "www.facebook.com", "fb.watch"},
    "youtube": {"youtube.com", "www.youtube.com", "youtu.be"},
    "tiktok": {"tiktok.com", "www.tiktok.com"},
    "x": {"x.com", "www.x.com", "twitter.com", "www.twitter.com"},
    "reddit": {"reddit.com", "www.reddit.com", "old.reddit.com"},
}

def detect_platform(url: str) -> str:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return "unknown"
    for platform, hosts in PLATFORM_HOSTS.items():
        if host in hosts or any(host.endswith("." + item) for item in hosts):
            return platform
    return "unknown"
