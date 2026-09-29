from app.platforms.base import HostPlatformAdapter

class InstagramAdapter(HostPlatformAdapter):
    name = "instagram"
    hosts = {"instagram.com", "www.instagram.com"}

class FacebookAdapter(HostPlatformAdapter):
    name = "facebook"
    hosts = {"facebook.com", "www.facebook.com", "fb.watch"}

class YouTubeAdapter(HostPlatformAdapter):
    name = "youtube"
    hosts = {"youtube.com", "www.youtube.com", "youtu.be"}

class TikTokAdapter(HostPlatformAdapter):
    name = "tiktok"
    hosts = {"tiktok.com", "www.tiktok.com"}

class XAdapter(HostPlatformAdapter):
    name = "x"
    hosts = {"x.com", "www.x.com", "twitter.com", "www.twitter.com"}

class RedditAdapter(HostPlatformAdapter):
    name = "reddit"
    hosts = {"reddit.com", "www.reddit.com", "old.reddit.com"}

PLATFORM_ADAPTERS = [
    InstagramAdapter(),
    FacebookAdapter(),
    YouTubeAdapter(),
    TikTokAdapter(),
    XAdapter(),
    RedditAdapter(),
]
