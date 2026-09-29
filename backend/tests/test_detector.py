from app.services.detector import detect_platform

def test_supported_platforms():
    assert detect_platform("https://www.instagram.com/reel/example/") == "instagram"
    assert detect_platform("https://www.facebook.com/watch/example") == "facebook"
    assert detect_platform("https://youtu.be/example") == "youtube"
    assert detect_platform("https://www.tiktok.com/@user/video/123") == "tiktok"
    assert detect_platform("https://x.com/example/status/123") == "x"
    assert detect_platform("https://www.reddit.com/r/videos/comments/example/test/") == "reddit"

def test_unknown_platform():
    assert detect_platform("https://example.com/video") == "unknown"
