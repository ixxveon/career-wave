import logging
import os
import tempfile
from enum import StrEnum

import boto3
import httpx
import pdfplumber
from botocore.exceptions import BotoCoreError, ClientError
from botocore.config import Config
from docx import Document

from core.config import get_settings

logger = logging.getLogger(__name__)

_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
_CHUNK_SIZE = 1024 * 256  # 256KB


class FileParseError(Exception):
    def __init__(self, user_message: str, cause: Exception | None = None):
        super().__init__(user_message)
        self.user_message = user_message
        self.cause = cause


class SupportedExtension(StrEnum):
    PDF = ".pdf"
    DOCX = ".docx"


def _get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
        endpoint_url=settings.aws_s3_endpoint or None,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if settings.aws_s3_force_path_style else "auto"},
        ),
    )


def _resolve_extension(file_url: str, original_name: str | None) -> str:
    name = original_name or file_url.split("?")[0].split("/")[-1]
    _, ext = os.path.splitext(name.lower())
    if ext not in (SupportedExtension.PDF, SupportedExtension.DOCX):
        raise FileParseError("지원하지 않는 파일 형식입니다. (지원: PDF, DOCX)")
    return ext


def _parse_s3_url(file_url: str) -> tuple[str, str]:
    """S3 URL에서 bucket과 key를 추출한다."""
    settings = get_settings()
    bucket = settings.aws_s3_bucket
    # presigned URL: https://{bucket}.s3.{region}.amazonaws.com/{key}?...
    # 또는 path-style:  https://s3.{region}.amazonaws.com/{bucket}/{key}?...
    url_without_qs = file_url.split("?")[0]
    if f"{bucket}.s3." in url_without_qs:
        key = url_without_qs.split(f"{bucket}.s3.")[1].split("/", 1)[-1]
    elif f"/{bucket}/" in url_without_qs:
        key = url_without_qs.split(f"/{bucket}/", 1)[1]
    else:
        raise FileParseError("S3 URL 형식을 파싱할 수 없습니다.")
    return bucket, key


def _download_via_http(document_id: str, file_url: str) -> str:
    """S3가 아닌 HTTP URL에서 파일을 다운로드한다 (로컬 개발용)."""
    _, ext = os.path.splitext(file_url.split("?")[0])
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext or ".tmp")
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(file_url)
            response.raise_for_status()
            if len(response.content) > _MAX_FILE_SIZE_BYTES:
                raise FileParseError(f"파일 크기가 제한({_MAX_FILE_SIZE_BYTES // 1024 // 1024}MB)을 초과합니다.")
            with os.fdopen(tmp_fd, "wb") as f:
                f.write(response.content)
    except FileParseError:
        _safe_remove(tmp_path)
        raise
    except httpx.HTTPError as e:
        _safe_remove(tmp_path)
        raise FileParseError("파일 다운로드 중 오류가 발생했습니다.", cause=e)
    logger.info(f"[{document_id}] HTTP download complete — {len(response.content)} bytes → {tmp_path}")
    return tmp_path


def _download_to_tempfile(document_id: str, file_url: str) -> str:
    """파일을 다운로드하여 임시 파일 경로를 반환한다."""
    # presigned URL(쿼리 파라미터 포함)은 인증 정보가 URL에 내장되어 있으므로 httpx로 직접 다운로드
    # boto3 재인증이 필요한 경우는 쿼리 파라미터 없는 순수 S3 경로일 때만 해당
    if "amazonaws.com" not in file_url or "?" in file_url:
        return _download_via_http(document_id, file_url)

    bucket, key = _parse_s3_url(file_url)
    s3 = _get_s3_client()

    try:
        head = s3.head_object(Bucket=bucket, Key=key)
        file_size = head.get("ContentLength", 0)
        if file_size > _MAX_FILE_SIZE_BYTES:
            raise FileParseError(
                f"파일 크기가 제한({_MAX_FILE_SIZE_BYTES // 1024 // 1024}MB)을 초과합니다."
            )
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code in ("403", "404"):
            raise FileParseError("파일에 접근할 수 없습니다. S3 경로를 확인해 주세요.", cause=e)
        raise FileParseError("파일 다운로드 중 오류가 발생했습니다.", cause=e)
    except BotoCoreError as e:
        raise FileParseError("파일 다운로드 중 오류가 발생했습니다.", cause=e)

    _, ext = os.path.splitext(key.split("?")[0])
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext or ".tmp")

    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        downloaded = 0
        with os.fdopen(tmp_fd, "wb") as f:
            for chunk in response["Body"].iter_chunks(chunk_size=_CHUNK_SIZE):
                downloaded += len(chunk)
                if downloaded > _MAX_FILE_SIZE_BYTES:
                    raise FileParseError(
                        f"파일 크기가 제한({_MAX_FILE_SIZE_BYTES // 1024 // 1024}MB)을 초과합니다."
                    )
                f.write(chunk)
    except FileParseError:
        _safe_remove(tmp_path)
        raise
    except (ClientError, BotoCoreError) as e:
        _safe_remove(tmp_path)
        raise FileParseError("파일 다운로드 중 오류가 발생했습니다.", cause=e)

    logger.info(f"[{document_id}] S3 download complete — {downloaded} bytes → {tmp_path}")
    return tmp_path


def _extract_pdf(document_id: str, tmp_path: str) -> str:
    try:
        with pdfplumber.open(tmp_path) as pdf:
            if pdf.metadata.get("Encrypt"):
                raise FileParseError("암호화된 PDF 파일은 분석할 수 없습니다.")
            pages_text = [page.extract_text() or "" for page in pdf.pages]
            text = "\n".join(pages_text).strip()
    except FileParseError:
        raise
    except Exception as e:
        raise FileParseError("PDF 텍스트 추출에 실패했습니다. 이미지 기반 PDF일 수 있습니다.", cause=e)

    if not text:
        raise FileParseError("PDF에서 텍스트를 추출할 수 없습니다. 이미지 기반 PDF일 수 있습니다.")

    logger.info(f"[{document_id}] PDF parsed — {len(text)} chars extracted")
    return text


def _extract_docx(document_id: str, tmp_path: str) -> str:
    try:
        doc = Document(tmp_path)
        text = "\n".join(p.text for p in doc.paragraphs).strip()
    except Exception as e:
        raise FileParseError("DOCX 텍스트 추출에 실패했습니다.", cause=e)

    if not text:
        raise FileParseError("DOCX에서 텍스트를 추출할 수 없습니다.")

    logger.info(f"[{document_id}] DOCX parsed — {len(text)} chars extracted")
    return text


def _safe_remove(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        logger.warning(f"임시 파일 삭제 실패: {path}")


def parse_resume_file(document_id: str, file_url: str, original_name: str | None) -> str:
    """S3에서 이력서 파일을 다운로드하여 텍스트를 추출한다."""
    ext = _resolve_extension(file_url, original_name)
    tmp_path = _download_to_tempfile(document_id, file_url)
    try:
        if ext == SupportedExtension.PDF:
            return _extract_pdf(document_id, tmp_path)
        return _extract_docx(document_id, tmp_path)
    finally:
        _safe_remove(tmp_path)
