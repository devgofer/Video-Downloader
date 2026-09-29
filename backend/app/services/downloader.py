from pathlib import Path
from typing import Callable, Optional

import yt_dlp

QUALITY_FORMATS = {
    "best": "bv*+ba/b",
    "1080p": "bv*[height<=1080]+ba/b[height<=1080]",
    "720p": "bv*[height<=720]+ba/b[height<=720]",
    "480p": "bv*[height<=480]+ba/b[height<=480]",
    "audio": "ba/b",
}

def _base_options() -> dict:
    return {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "windowsfilenames": True,
        "ignoreerrors": False,
    }

def get_video_info(url: str) -> dict:
    options = {**_base_options(), "skip_download": True}
    with yt_dlp.YoutubeDL(options) as ydl:
        return ydl.extract_info(url, download=False)

def download_video(
    url: str,
    quality: str,
    download_dir: Path,
    progress_hook: Optional[Callable[[dict], None]] = None,
) -> tuple[Path, str]:
    format_selector = QUALITY_FORMATS.get(quality, QUALITY_FORMATS["best"])
    is_audio = quality == "audio"
    options = {
        **_base_options(),
        "format": format_selector,
        "outtmpl": str(download_dir / "%(title).180s [%(id)s].%(ext)s"),
        "merge_output_format": "mp4",
    }
    if progress_hook:
        options["progress_hooks"] = [progress_hook]
    if is_audio:
        options["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }]
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=True)
        requested = Path(ydl.prepare_filename(info))
    output_path = requested.with_suffix(".mp3" if is_audio else ".mp4")
    if not output_path.exists():
        candidates = sorted(
            download_dir.glob(f"{requested.stem}.*"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            raise FileNotFoundError("No output file was produced.")
        output_path = candidates[0]
    return output_path, info.get("title") or output_path.stem
