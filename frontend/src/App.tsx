import { FormEvent, useEffect, useRef, useState } from "react";

type VideoInfo = {
  platform: string;
  title: string;
  thumbnail?: string;
  preview_url?: string;
  duration?: number;
  uploader?: string;
};

type DownloadJob = {
  job_id: string;
  status: "queued" | "starting" | "downloading" | "processing" | "completed" | "failed";
  progress: number;
  speed?: string;
  eta?: string;
  title?: string;
  filename?: string;
  error?: string;
  download_url?: string;
};

const API_BASE = "http://localhost:8000";

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  reddit: "Reddit",
};

function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function statusLabel(status: DownloadJob["status"]) {
  return {
    queued: "Queued",
    starting: "Starting",
    downloading: "Downloading",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
  }[status];
}

export default function App() {
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("best");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, []);

  async function inspect(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setJob(null);
    setInfo(null);
    if (!url.trim()) {
      setError("Paste a video URL first.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/inspect`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not inspect this URL.");
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function pollJob(jobId: string) {
    try {
      const response = await fetch(`${API_BASE}/api/downloads/${jobId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not read download status.");
      setJob(data);

      if (data.status === "completed") {
        setMessage(`Downloaded: ${data.filename}`);
        if (data.download_url) window.open(`${API_BASE}${data.download_url}`, "_blank");
        return;
      }
      if (data.status === "failed") {
        setError(data.error || "Download failed.");
        return;
      }
      pollRef.current = window.setTimeout(() => pollJob(jobId), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read download status.");
    }
  }

  async function download() {
    setLoading(true);
    setError("");
    setMessage("");
    setJob(null);
    try {
      const response = await fetch(`${API_BASE}/api/downloads`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url, quality}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Download failed.");
      setJob(data);
      setLoading(false);
      pollJob(data.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
      setLoading(false);
    }
  }

  const progress = Math.max(0, Math.min(100, job?.progress ?? 0));

  return (
    <main className="page">
      <section className="shell">
        <header className="hero">
          <div className="logo">↓</div>
          <p className="eyebrow">LOCAL-FIRST VIDEO TOOL</p>
          <h1>Paste a URL.<br/><span>Get your video.</span></h1>
          <p className="subtitle">
            One simple downloader for supported social and video platforms.
          </p>
        </header>

        <form className="input-card" onSubmit={inspect}>
          <label htmlFor="url">Video URL</label>
          <div className="input-row">
            <input
              id="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.instagram.com/... or any supported URL"
              autoComplete="off"
              inputMode="url"
            />
            <button type="submit" disabled={loading}>
              {loading ? "Checking..." : "Inspect"}
            </button>
          </div>
        </form>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {info && (
          <section className="result-card">
            <div className="preview">
              {info.preview_url ? (
                <video
                  className="video-preview"
                  src={info.preview_url}
                  poster={info.thumbnail}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : info.thumbnail ? (
                <img className="thumbnail" src={info.thumbnail} alt="" />
              ) : (
                <div className="preview-empty">Preview unavailable</div>
              )}
            </div>
            <div className="result-content">
              <div className="badge">{platformNames[info.platform] || info.platform}</div>
              <h2>{info.title}</h2>
              {(info.uploader || info.duration) && (
                <p className="meta">
                  {info.uploader || ""}
                  {info.uploader && info.duration ? " · " : ""}
                  {formatDuration(info.duration)}
                </p>
              )}

              <div className="options">
                <label>
                  Quality
                  <select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={!!job && !["completed", "failed"].includes(job.status)}>
                    <option value="best">Best available</option>
                    <option value="1080p">Up to 1080p</option>
                    <option value="720p">Up to 720p</option>
                    <option value="480p">Up to 480p</option>
                    <option value="audio">Audio only (MP3)</option>
                  </select>
                </label>
                <button className="download-button" onClick={download} disabled={loading || (!!job && !["completed", "failed"].includes(job.status))}>
                  {job && !["completed", "failed"].includes(job.status) ? statusLabel(job.status) : "Download"}
                </button>
              </div>
            </div>
          </section>
        )}

        {job && !["completed", "failed"].includes(job.status) && (
          <section className="progress-card" aria-live="polite">
            <div className="progress-head">
              <strong>{statusLabel(job.status)}</strong>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{width: `${progress}%`}} />
            </div>
            <div className="progress-meta">
              <span>{job.speed || "Preparing download..."}</span>
              <span>{job.eta ? `ETA ${job.eta}` : ""}</span>
            </div>
          </section>
        )}

        <footer>
          Download only content you have permission to download. No login, DRM,
          private-content, or access-control bypassing is supported.
        </footer>
      </section>
    </main>
  );
}
