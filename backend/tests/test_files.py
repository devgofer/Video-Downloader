from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import DOWNLOAD_DIR, app
from app.services.jobs import create_job, run_job


def test_run_job_serves_file_by_job_id(tmp_path):
    job = create_job("https://www.youtube.com/watch?v=example", "best")
    output = tmp_path / "Don't push #English #TVSeries｜Eve [1115238854794299].mp4"
    output.write_bytes(b"video-bytes")

    with patch("app.services.jobs.download_video", return_value=(output, "Eve")):
        run_job(job, tmp_path)

    assert job.download_url == f"/api/files/{job.id}"
    assert "#" not in job.download_url
    assert job.filename == output.name


def test_get_file_serves_by_job_id_when_filename_has_hash():
    job = create_job("https://www.youtube.com/watch?v=example", "best")
    filename = "Don't push #English #TVSeries｜Eve [1115238854794299].mp4"
    path = DOWNLOAD_DIR / filename
    path.write_bytes(b"video-bytes")
    with job._lock:
        job.status = "completed"
        job.filename = filename
        job.download_url = f"/api/files/{job.id}"

    try:
        response = TestClient(app).get(job.download_url)
        assert response.status_code == 200
        assert response.content == b"video-bytes"
        assert "Eve" in response.headers.get("content-disposition", "")
    finally:
        path.unlink(missing_ok=True)


def test_get_file_unknown_job_returns_404():
    response = TestClient(app).get("/api/files/missingjob")
    assert response.status_code == 404
    assert response.json()["detail"] == "File not found."
