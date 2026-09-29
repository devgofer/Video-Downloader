# Video Downloader

A local-first web tool for downloading public videos you have permission to download from supported platforms.

## Features

- Paste a URL and inspect the video metadata.
- Video preview when the extractor exposes a browser-playable media URL, with thumbnail fallback.
- Quality selection: best, 1080p, 720p, 480p, or MP3 audio.
- Background download jobs powered by yt-dlp.
- Live download progress, speed, ETA, and processing state.
- Responsive UI for desktop and mobile.
- Extensible platform adapter architecture.

Current adapters include Instagram, Facebook, YouTube, TikTok, X, and Reddit.

## Stack

- React + Vite + TypeScript
- FastAPI
- yt-dlp
- FFmpeg

## Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## API

- `GET /api/health`
- `POST /api/inspect`
- `POST /api/downloads` → creates a background download job
- `GET /api/downloads/{job_id}` → returns live job status
- `GET /api/files/{filename}` → serves a completed file

The current job store is in-memory and intended for a local-first single-process deployment. A later production-oriented version can move jobs and progress state to Redis or another persistent queue.

## Usage restrictions

Only download content you have permission to download. This project does not bypass authentication, private-content restrictions, DRM, paywalls, or other access controls.
