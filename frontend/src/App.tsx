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
  url?: string;
  platform?: string;
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

function parseUrls(value: string) {
  return [...new Set(value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

export default function App() {
  const [url, setUrl] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [quality, setQuality] = useState("best");
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pollRefs = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  async function inspect(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setMessage("");
    setJobs([]);
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
      setJobs((current) => current.map((item) => item.job_id === jobId ? {...item, ...data} : item));

      if (data.status === "completed") {
        if (data.download_url) window.open(`${API_BASE}${data.download_url}`, "_blank");
        return;
      }
      if (data.status === "failed") return;
      pollRefs.current[jobId] = window.setTimeout(() => pollJob(jobId), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read download status.");
    }
  }

  async function startDownload(urlToDownload: string) {
    const response = await fetch(`${API_BASE}/api/downloads`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({url: urlToDownload, quality}),
    });
    return response;
  }

  async function download() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await startDownload(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Download failed.");
      setJobs([data]);
      setLoading(false);
      pollJob(data.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
      setLoading(false);
    }
  }

  async function batchDownload() {
    const urls = parseUrls(batchUrls);
    setLoading(true);
    setError("");
    setMessage("");
    setInfo(null);
    setJobs([]);
    if (!urls.length) {
      setError("Paste at least one video URL, one per line.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/downloads/batch`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({urls, quality}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Batch download failed.");
      setJobs(data.jobs);
      setLoading(false);
      if (data.skipped) {
        setMessage(`${data.jobs.length} job(s) started. ${data.skipped} unsupported URL(s) skipped.`);
      } else {
        setMessage(`${data.jobs.length} download job(s) started.`);
      }
      data.jobs.forEach((item: DownloadJob) => pollJob(item.job_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch download failed.");
      setLoading(false);
    }
  }

  const activeJobs = jobs.filter((item) => !["completed", "failed"].includes(item.status));
  const completedCount = jobs.filter((item) => item.status === "completed").length;

  return (
    <main className="page">
      <section className="shell">
        <header className="hero">
          <div className="logo">↓</div>
          <p className="eyebrow">LOCAL-FIRST VIDEO TOOL</p>
          <h1>Paste a URL.<br/><span>Get your video.</span></h1>
          <p className="subtitle">One simple downloader for supported social and video platforms.</p>
        </header>

        <section className="mode-switch" aria-label="Download mode">
          <button type="button" className={!batchMode ? "mode active" : "mode"} onClick={() => setBatchMode(false)}>Single URL</button>
          <button type="button" className={batchMode ? "mode active" : "mode"} onClick={() => setBatchMode(true)}>Batch URLs</button>
        </section>

        {!batchMode ? (
          <>
            <form className="input-card" onSubmit={inspect}>
              <label htmlFor="url">Video URL</label>
              <div className="input-row">
                <input id="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.instagram.com/... or any supported URL" autoComplete="off" inputMode="url" />
                <button type="submit" disabled={loading}>{loading ? "Checking..." : "Inspect"}</button>
              </div>
            </form>

            {info && (
              <section className="result-card">
                <div className="preview">
                  {info.preview_url ? (
                    <video className="video-preview" src={info.preview_url} poster={info.thumbnail} controls playsInline preload="metadata" />
                  ) : info.thumbnail ? (
                    <img className="thumbnail" src={info.thumbnail} alt="" />
                  ) : (
                    <div className="preview-empty">Preview unavailable</div>
                  )}
                </div>
                <div className="result-content">
                  <div className="badge">{platformNames[info.platform] || info.platform}</div>
                  <h2>{info.title}</h2>
                  {(info.uploader || info.duration) && <p className="meta">{info.uploader || ""}{info.uploader && info.duration ? " · " : ""}{formatDuration(info.duration)}</p>}
                  <div className="options">
                    <label>Quality
                      <select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={activeJobs.length > 0}>
                        <option value="best">Best available</option>
                        <option value="1080p">Up to 1080p</option>
                        <option value="720p">Up to 720p</option>
                        <option value="480p">Up to 480p</option>
                        <option value="audio">Audio only (MP3)</option>
                      </select>
                    </label>
                    <button className="download-button" onClick={download} disabled={loading || activeJobs.length > 0}>Download</button>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="input-card batch-card">
            <label htmlFor="batch-urls">Video URLs</label>
            <textarea id="batch-urls" value={batchUrls} onChange={(event) => setBatchUrls(event.target.value)} placeholder={"Paste one URL per line\nhttps://www.youtube.com/...\nhttps://www.instagram.com/...\nhttps://www.tiktok.com/..."} rows={7} />
            <div className="batch-controls">
              <label>Quality
                <select value={quality} onChange={(event) => setQuality(event.target.value)} disabled={activeJobs.length > 0}>
                  <option value="best">Best available</option>
                  <option value="1080p">Up to 1080p</option>
                  <option value="720p">Up to 720p</option>
                  <option value="480p">Up to 480p</option>
                  <option value="audio">Audio only (MP3)</option>
                </select>
              </label>
              <button type="button" className="download-button" onClick={batchDownload} disabled={loading || activeJobs.length > 0}>Download all</button>
            </div>
            <p className="hint">Up to 20 URLs. Duplicate lines are automatically removed.</p>
          </section>
        )}

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {jobs.length > 0 && (
          <section className="jobs-card" aria-live="polite">
            <div className="jobs-head">
              <strong>Downloads</strong>
              <span>{completedCount}/{jobs.length} completed</span>
            </div>
            <div className="job-list">
              {jobs.map((item) => {
                const progress = Math.max(0, Math.min(100, item.progress));
                return (
                  <article className="job-item" key={item.job_id}>
                    <div className="job-title-row">
                      <strong>{item.title || item.url || "Video"}</strong>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{width: `${progress}%`}} /></div>
                    <div className="progress-meta">
                      <span>{statusLabel(item.status)}{item.platform ? ` · ${platformNames[item.platform] || item.platform}` : ""}</span>
                      <span>{item.status === "failed" ? item.error : item.eta ? `ETA ${item.eta}` : item.speed || ""}</span>
                    </div>
                    {item.status === "completed" && item.download_url && (
                      <a className="file-link" href={`${API_BASE}${item.download_url}`} target="_blank" rel="noreferrer">Open downloaded file</a>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <footer>Download only content you have permission to download. No login, DRM, private-content, or access-control bypassing is supported.</footer>
      </section>
    </main>
  );
}
