"""Unit tests for app.services.storage."""
from pathlib import Path

import pytest

from app.services.storage import save_file, read_file, delete_file, resolve_path


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    """Point STORAGE_ROOT at a fresh temp directory for every test."""
    root = tmp_path / "storage"
    root.mkdir()
    monkeypatch.setenv("STORAGE_ROOT", str(root))
    # Force module-level cache to re-read env (get_storage_root reads os.getenv each call)
    yield root


# ---------------------------------------------------------------------------
# 1. save_file() creates the file at the returned path under STORAGE_ROOT
# ---------------------------------------------------------------------------

def test_save_file_creates_file(isolated_storage):
    rel_path, _ = save_file(b"hello", "subdir", "test.txt")
    full_path = isolated_storage / rel_path
    assert full_path.exists()


def test_save_file_returns_correct_size(isolated_storage):
    data = b"hello world"
    _, size = save_file(data, "subdir", "test.txt")
    assert size == len(data)


def test_save_file_written_content_matches(isolated_storage):
    data = b"binary content \x00\xff"
    rel_path, _ = save_file(data, "subdir", "bin.bin")
    assert (isolated_storage / rel_path).read_bytes() == data


# ---------------------------------------------------------------------------
# 2. save_file() sanitizes filename (replaces spaces, adds uuid prefix)
# ---------------------------------------------------------------------------

def test_save_file_sanitizes_spaces(isolated_storage):
    rel_path, _ = save_file(b"x", "sub", "my file name.txt")
    filename = Path(rel_path).name
    assert " " not in filename


def test_save_file_adds_uuid_prefix(isolated_storage):
    rel_path, _ = save_file(b"x", "sub", "file.txt")
    filename = Path(rel_path).name
    # UUID prefix is 8 hex chars followed by underscore
    prefix = filename.split("_")[0]
    assert len(prefix) == 8
    int(prefix, 16)  # raises ValueError if not hex → test fails


def test_save_file_removes_special_chars(isolated_storage):
    rel_path, _ = save_file(b"x", "sub", "file;rm -rf.txt")
    filename = Path(rel_path).name
    assert ";" not in filename
    assert " " not in filename


# ---------------------------------------------------------------------------
# 3. read_file() returns correct bytes
# ---------------------------------------------------------------------------

def test_read_file_returns_correct_bytes(isolated_storage):
    data = b"read me back"
    rel_path, _ = save_file(data, "sub", "r.txt")
    assert read_file(rel_path) == data


def test_read_file_nonexistent_raises(isolated_storage):
    with pytest.raises(Exception):
        read_file("nonexistent/path.txt")


# ---------------------------------------------------------------------------
# 4. delete_file() removes the file; second call does not raise
# ---------------------------------------------------------------------------

def test_delete_file_removes_file(isolated_storage):
    rel_path, _ = save_file(b"bye", "sub", "del.txt")
    delete_file(rel_path)
    assert not (isolated_storage / rel_path).exists()


def test_delete_file_second_call_does_not_raise(isolated_storage):
    rel_path, _ = save_file(b"bye", "sub", "del2.txt")
    delete_file(rel_path)
    delete_file(rel_path)  # must not raise


# ---------------------------------------------------------------------------
# 5. Path traversal attempt raises ValueError
# ---------------------------------------------------------------------------

def test_path_traversal_raises_value_error(isolated_storage):
    with pytest.raises(ValueError):
        resolve_path("../../etc/passwd")


def test_path_traversal_with_subdir_prefix_raises(isolated_storage):
    with pytest.raises(ValueError):
        resolve_path("sub/../../etc/hosts")


# ---------------------------------------------------------------------------
# 6. resolve_path() with valid relative path returns absolute path under root
# ---------------------------------------------------------------------------

def test_resolve_path_returns_absolute_path(isolated_storage):
    result = resolve_path("sub/file.txt")
    assert result.is_absolute()


def test_resolve_path_is_under_storage_root(isolated_storage):
    result = resolve_path("sub/file.txt")
    assert str(result).startswith(str(isolated_storage.resolve()))


def test_resolve_path_reconstructs_correct_path(isolated_storage):
    # Create the file so resolve can find a real path
    target = isolated_storage / "sub" / "hello.txt"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"hi")
    result = resolve_path("sub/hello.txt")
    assert result == target.resolve()
