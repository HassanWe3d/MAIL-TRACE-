"""Hashing utilities for attachments."""
import hashlib
from typing import Optional


def calculate_md5(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def calculate_sha1(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_attachment(data: bytes) -> dict:
    return {
        "md5": calculate_md5(data),
        "sha1": calculate_sha1(data),
        "sha256": calculate_sha256(data),
        "size": len(data),
    }
