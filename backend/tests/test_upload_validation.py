"""Tests for file upload validation — size, type, empty files."""
import pytest
from fastapi.testclient import TestClient


def _app():
    from app.main import app
    return app


class TestUploadValidation:
    def test_non_eml_file_rejected(self):
        client = TestClient(_app())
        resp = client.post(
            "/api/investigations/upload",
            files={"file": ("test.txt", b"not an eml", "text/plain")},
        )
        assert resp.status_code == 400
        body = resp.json()
        assert body["success"] is False
        assert body["error"]["code"] == "INVALID_FILE_TYPE"

    def test_empty_file_rejected(self):
        client = TestClient(_app())
        resp = client.post(
            "/api/investigations/upload",
            files={"file": ("empty.eml", b"", "message/rfc822")},
        )
        assert resp.status_code == 400
        body = resp.json()
        assert body["success"] is False

    def test_structured_error_format(self):
        """Errors must follow {success: false, error: {code, message}} format."""
        client = TestClient(_app())
        resp = client.post(
            "/api/investigations/upload",
            files={"file": ("bad.pdf", b"pdf content", "application/pdf")},
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "success" in body
        assert body["success"] is False
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]

    def test_non_eml_txt_file_rejected_with_message(self):
        client = TestClient(_app())
        resp = client.post(
            "/api/investigations/upload",
            files={"file": ("report.csv", b"a,b,c", "text/csv")},
        )
        assert resp.status_code == 400
        body = resp.json()
        assert body["error"]["code"] == "INVALID_FILE_TYPE"
        assert ".eml" in body["error"]["message"].lower()
