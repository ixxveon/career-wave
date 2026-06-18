"""
file_parser.py 로컬 테스트 스크립트
S3 없이 로컬 파일로 PDF/DOCX 파싱 함수를 직접 검증한다.

사용법:
    python test_file_parser.py <파일경로>
    python test_file_parser.py resume.pdf
    python test_file_parser.py resume.docx
"""
import sys
import os
import tempfile

# fastapi/ 디렉터리를 모듈 경로에 추가
sys.path.insert(0, os.path.dirname(__file__))

from user.resume.service.file_parser import (
    FileParseError,
    SupportedExtension,
    _extract_pdf,
    _extract_docx,
    _resolve_extension,
    _safe_remove,
)


def test_parse(file_path: str) -> None:
    print(f"\n{'='*50}")
    print(f"테스트 파일: {file_path}")
    print(f"{'='*50}")

    if not os.path.exists(file_path):
        print(f"[ERROR] 파일을 찾을 수 없습니다: {file_path}")
        return

    _, ext = os.path.splitext(file_path.lower())

    try:
        if ext == SupportedExtension.PDF:
            text = _extract_pdf("test-doc-id", file_path)
        elif ext == SupportedExtension.DOCX:
            text = _extract_docx("test-doc-id", file_path)
        else:
            print(f"[ERROR] 지원하지 않는 확장자: {ext}")
            return

        print(f"[OK] 추출 성공 — {len(text)}자")
        print(f"\n--- 텍스트 미리보기 (최대 500자) ---")
        print(text[:500])
        print("..." if len(text) > 500 else "")

    except FileParseError as e:
        print(f"[FileParseError] {e.user_message}")
        if e.cause:
            print(f"  원인: {e.cause}")


def test_extension_validation() -> None:
    print(f"\n{'='*50}")
    print("확장자 검증 테스트")
    print(f"{'='*50}")

    cases = [
        ("resume.pdf", None, True),
        ("resume.DOCX", None, True),
        ("resume.hwp", None, False),
        ("resume.txt", None, False),
        ("https://s3.amazonaws.com/bucket/abc?X-Amz=sig", "이력서.pdf", True),
    ]

    for file_url, original_name, should_pass in cases:
        try:
            ext = _resolve_extension(file_url, original_name)
            status = "[OK]" if should_pass else "[FAIL] 통과되면 안 됨"
            print(f"{status} {original_name or file_url} → {ext}")
        except FileParseError as e:
            status = "[OK] 거부됨" if not should_pass else "[FAIL] 거부되면 안 됨"
            print(f"{status} {original_name or file_url} → {e.user_message}")


if __name__ == "__main__":
    test_extension_validation()

    if len(sys.argv) > 1:
        for path in sys.argv[1:]:
            test_parse(path)
    else:
        print("\n[안내] 파일 경로를 인수로 넘기면 파싱 테스트도 실행됩니다.")
        print("  예시: python test_file_parser.py resume.pdf")
