from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl

from app.services.detector import detect_platform
from app.services.downloader import get_video_info, download_video

BASE_DIR = Path(__file__).resolve().parents[1]
DOWNLOAD_DIR = BASE_DIR / "downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Video Downloader API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: HttpUrl

class DownloadRequest(BaseModel):
    url: HttpUrl
    quality: str = "best"

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/inspect")
def inspect_video(request: URLRequest):
    url = str(request.url)
    platform = detect_platform(url)
    if platform == "unknown":
        raise HTTPException(400, "Unsupported or unrecognized video URL.")
    try:
        info = get_video_info(url)
    except Exception as exc:
        raise HTTPException(422, f"Unable to inspect this URL: {exc}") from exc
    return {
        "platform": platform,
        "title": info.get("title") or "Untitled video",
        "thumbnail": info.get("thumbnail"),
        "duration": info.get("duration"),
        "uploader": info.get("uploader") or info.get("channel"),
    }

@app.post("/api/download")
def download(request: DownloadRequest):
    url = str(request.url)
    platform = detect_platform(url)
    if platform == "unknown":
        raise HTTPException(400, "Unsupported or unrecognized video URL.")
    try:
        output_path, title = download_video(url, request.quality, DOWNLOAD_DIR)
    except Exception as exc:
        raise HTTPException(422, f"Download failed: {exc}") from exc
    return {
        "platform": platform,
        "title": title,
        "filename": output_path.name,
        "download_url": f"/api/files/{output_path.name}",
    }

@app.get("/api/files/{filename}")
def get_file(filename: str):
    safe_name = Path(filename).name
    path = DOWNLOAD_DIR / safe_name
    if not path.is_file():
        raise HTTPException(404, "File not found.")
    return FileResponse(path, media_type="application/octet-stream", filename=path.name)
