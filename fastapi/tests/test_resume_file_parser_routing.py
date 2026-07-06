"""
_download_to_tempfile() URL 분기 회귀 테스트

presigned URL(쿼리 파라미터 포함) → _download_via_http 경로
순수 S3 URL(쿼리 파라미터 없음)   → boto3(_download_via_s3) 경로
비-S3 URL                         → _download_via_http 경로
"""
from unittest.mock import MagicMock, patch

from user.resume.service.file_parser import _download_to_tempfile


PRESIGNED_URL = (
    "https://career-wave-bucket.s3.ap-northeast-2.amazonaws.com"
    "/resumes/abc.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=sig"
)
PLAIN_S3_URL = (
    "https://career-wave-bucket.s3.ap-northeast-2.amazonaws.com/resumes/abc.pdf"
)
EXTERNAL_URL = "https://cdn.example.com/files/resume.pdf"

FAKE_PATH = "/tmp/resume.pdf"


@patch("user.resume.service.file_parser._download_via_http", return_value=FAKE_PATH)
@patch("user.resume.service.file_parser._get_s3_client")
def test_presigned_s3_url_routes_to_http(mock_s3, mock_http):
    """presigned URL은 boto3를 거치지 않고 HTTP 다운로드 경로를 사용해야 한다."""
    result = _download_to_tempfile("doc-1", PRESIGNED_URL)

    mock_http.assert_called_once_with("doc-1", PRESIGNED_URL)
    mock_s3.assert_not_called()
    assert result == FAKE_PATH


@patch("user.resume.service.file_parser._download_via_http", return_value=FAKE_PATH)
@patch("user.resume.service.file_parser._get_s3_client")
def test_external_url_routes_to_http(mock_s3, mock_http):
    """amazonaws.com이 없는 외부 URL도 HTTP 다운로드 경로를 사용해야 한다."""
    result = _download_to_tempfile("doc-2", EXTERNAL_URL)

    mock_http.assert_called_once_with("doc-2", EXTERNAL_URL)
    mock_s3.assert_not_called()
    assert result == FAKE_PATH


@patch("user.resume.service.file_parser._download_via_http")
@patch("user.resume.service.file_parser._get_s3_client")
@patch("user.resume.service.file_parser._parse_s3_url", return_value=("bucket", "resumes/abc.pdf"))
def test_plain_s3_url_routes_to_boto3(mock_parse, mock_s3_factory, mock_http):
    """쿼리 파라미터 없는 순수 S3 URL은 boto3 경로를 사용해야 한다."""
    mock_client = MagicMock()
    mock_client.head_object.return_value = {"ContentLength": 1024}

    mock_s3_factory.return_value = mock_client

    # boto3 download_fileobj 호출까지 흉내내기 위해 tempfile 경로만 확인
    with patch("user.resume.service.file_parser.tempfile.mkstemp", return_value=(0, FAKE_PATH)), \
         patch("os.fdopen"), \
         patch("user.resume.service.file_parser._safe_remove"):
        result = _download_to_tempfile("doc-3", PLAIN_S3_URL)

    mock_http.assert_not_called()
    mock_client.head_object.assert_called_once()
    assert result == FAKE_PATH
