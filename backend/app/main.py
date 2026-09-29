from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl

MAX_BATCH_SIZE = 20

from app.services.detector import detect_platform
from app.services.downloader import get_video_info
from app.services.jobs import create_job, get_job, run_job

BASE_DIR = Path(__file__).resolve().parents[1]
DOWNLOAD_DIR = BASE_DIR / "downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Video Downloader API", version="0.2.0")
executor = ThreadPoolExecutor(max_workers=2)

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

class BatchDownloadRequest(BaseModel):
    urls: list[HttpUrl]
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
        "preview_url": info.get("url"),
        "duration": info.get("duration"),
        "uploader": info.get("uploader") or info.get("channel"),
    }

@app.post("/api/downloads", status_code=202)
def create_download(request: DownloadRequest):
    url = str(request.url)
    platform = detect_platform(url)
    if platform == "unknown":
        raise HTTPException(400, "Unsupported or unrecognized video URL.")
    job = create_job(url, request.quality)
    executor.submit(run_job, job, DOWNLOAD_DIR)
    return job.snapshot() | {"platform": platform}

@app.post("/api/downloads/batch", status_code=202)
def create_batch_download(request: BatchDownloadRequest):
    urls = list(dict.fromkeys(str(url) for url in request.urls))
    if not urls:
        raise HTTPException(400, "Provide at least one video URL.")
    if len(urls) > MAX_BATCH_SIZE:
        raise HTTPException(400, f"You can download up to {MAX_BATCH_SIZE} URLs at once.")

    jobs = []
    for url in urls:
        platform = detect_platform(url)
        if platform == "unknown":
            continue
        job = create_job(url, request.quality)
        executor.submit(run_job, job, DOWNLOAD_DIR)
        jobs.append(job.snapshot() | {"platform": platform, "url": url})

    if not jobs:
        raise HTTPException(400, "No supported video URLs were found.")
    return {"jobs": jobs, "skipped": len(urls) - len(jobs)}

@app.get("/api/downloads/{job_id}")
def download_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Download job not found.")
    return job.snapshot()

@app.get("/api/files/{filename}")
def get_file(filename: str):
    safe_name = Path(filename).name
    path = DOWNLOAD_DIR / safe_name
    if not path.is_file():
        raise HTTPException(404, "File not found.")
    return FileResponse(path, media_type="application/octet-stream", filename=path.name)
