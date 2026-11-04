"""Detect exam file types from the bytes themselves, not the client header."""

PDF = "application/pdf"
JPEG = "image/jpeg"
PNG = "image/png"
GIF = "image/gif"
WEBP = "image/webp"
DOC = "application/msword"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def sniff_exam_type(data: bytes) -> str | None:
    if not data:
        return None
    if data.startswith(b"%PDF-"):
        return PDF
    if data.startswith(b"\xff\xd8\xff"):
        return JPEG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return PNG
    if data.startswith((b"GIF87a", b"GIF89a")):
        return GIF
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return WEBP
    if data.startswith(b"\xd0\xcf\x11\xe0"):
        return DOC
    head = data[:8192]
    if data.startswith(b"PK") and (b"word/" in head or b"[Content_Types].xml" in head):
        return DOCX
    return None


def media_type_for_download(data: bytes) -> str:
    return sniff_exam_type(data) or "application/octet-stream"
