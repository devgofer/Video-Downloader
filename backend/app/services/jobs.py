from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock
from typing import Optional
from uuid import uuid4

from app.services.downloader import download_video

@dataclass
class DownloadJob:
    id: str
    url: str
    quality: str
    status: str = "queued"
    progress: float = 0.0
    speed: Optional[str] = None
    eta: Optional[str] = None
    title: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None
    download_url: Optional[str] = None
    _lock: Lock = field(default_factory=Lock, repr=False)

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "job_id": self.id,
                "status": self.status,
                "progress": round(self.progress, 1),
                "speed": self.speed,
                "eta": self.eta,
                "title": self.title,
                "filename": self.filename,
                "error": self.error,
                "download_url": self.download_url,
            }

jobs: dict[str, DownloadJob] = {}
jobs_lock = Lock()

def create_job(url: str, quality: str) -> DownloadJob:
    job = DownloadJob(id=uuid4().hex, url=url, quality=quality)
    with jobs_lock:
        jobs[job.id] = job
    return job

def get_job(job_id: str) -> Optional[DownloadJob]:
    with jobs_lock:
        return jobs.get(job_id)

def run_job(job: DownloadJob, download_dir: Path) -> None:
    def on_progress(data: dict) -> None:
        with job._lock:
            status = data.get("status")
            if status == "downloading":
                job.status = "downloading"
                total = data.get("total_bytes") or data.get("total_bytes_estimate")
                downloaded = data.get("downloaded_bytes", 0)
                if total:
                    job.progress = min(100.0, downloaded / total * 100)
                job.speed = data.get("_speed_str") or data.get("speed")
                job.eta = data.get("_eta_str") or (
                    f"{data['eta']}s" if data.get("eta") is not None else None
                )
            elif status == "finished":
                job.status = "processing"
                job.progress = 100.0

    try:
        with job._lock:
            job.status = "starting"
        output_path, title = download_video(
            job.url,
            job.quality,
            download_dir,
            progress_hook=on_progress,
        )
        with job._lock:
            job.status = "completed"
            job.progress = 100.0
            job.title = title
            job.filename = output_path.name
            job.download_url = f"/api/files/{output_path.name}"
    except Exception as exc:
        with job._lock:
            job.status = "failed"
            job.error = str(exc)
