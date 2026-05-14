import os
import re
import uuid
from pathlib import Path


def get_storage_root() -> Path:
    return Path(os.getenv("STORAGE_ROOT", "/app/storage"))


def _sanitize_filename(filename: str) -> str:
    name = filename.replace(" ", "_")
    name = re.sub(r"[^\w.\-]", "", name)
    return f"{str(uuid.uuid4())[:8]}_{name}"


def save_file(data: bytes, subdir: str, filename: str) -> tuple[str, int]:
    storage_root = get_storage_root()
    target_dir = storage_root / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    safe_name = _sanitize_filename(filename)
    full_path = target_dir / safe_name
    full_path.write_bytes(data)
    relative_path = str(Path(subdir) / safe_name)
    return relative_path, len(data)


def resolve_path(relative_path: str) -> Path:
    storage_root = get_storage_root()
    resolved = (storage_root / relative_path).resolve()
    if not str(resolved).startswith(str(storage_root.resolve())):
        raise ValueError(f"Ungültiger Dateipfad: {relative_path}")
    return resolved


def delete_file(relative_path: str) -> None:
    resolved = resolve_path(relative_path)
    if resolved.exists():
        resolved.unlink()


def read_file(relative_path: str) -> bytes:
    resolved = resolve_path(relative_path)
    return resolved.read_bytes()
