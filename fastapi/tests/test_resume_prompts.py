"""
resume_prompts.py — 언어 감지 및 user prompt 빌드 단위 테스트

검증 항목:
- 한국어 이력서 → 한국어 프롬프트
- 영어 이력서 → 영어 프롬프트
- 3,000자 초과 혼합 언어: 앞부분(모델 전달 범위) 기준으로 언어 판단
- 텍스트 없음 → 한국어 폴백
"""

from user.resume.prompts.resume_prompts import _detect_language, build_resume_user_prompt


# ── _detect_language ──────────────────────────────────────────────────────────

def test_detect_language_korean():
    ko_text = "저는 백엔드 개발자로 3년간 Spring Boot와 Redis를 활용한 서비스를 개발했습니다."
    assert _detect_language(ko_text) == "ko"


def test_detect_language_english():
    en_text = "I am a backend engineer with 3 years of experience building scalable services with Spring Boot."
    assert _detect_language(en_text) == "en"


def test_detect_language_empty():
    assert _detect_language("") == "ko"


def test_detect_language_numbers_only():
    assert _detect_language("12345 67890") == "ko"


# ── build_resume_user_prompt ──────────────────────────────────────────────────

def test_prompt_korean_resume():
    # 영어 기술 키워드 없이 순수 한국어로 구성된 이력서
    ko_resume = "이름: 홍길동\n경력: 삼년\n주요 기술: 자바, 스프링, 데이터베이스 관리\n자기소개: 저는 백엔드 개발자입니다."
    prompt = build_resume_user_prompt(ko_resume)
    assert "다음 이력서를 분석해 주세요" in prompt
    assert ko_resume in prompt


def test_prompt_english_resume():
    en_resume = "Name: John Doe\nExperience: 3 years\nSkills: Java, Spring Boot, MySQL, Redis"
    prompt = build_resume_user_prompt(en_resume)
    assert "Please analyze" in prompt
    assert "English" in prompt
    assert en_resume in prompt


def test_prompt_truncates_long_resume():
    long_resume = "A" * 5000
    prompt = build_resume_user_prompt(long_resume)
    # 3000자만 전달됨
    assert "A" * 3000 in prompt
    assert "A" * 3001 not in prompt


def test_prompt_mixed_language_truncation_uses_truncated_text():
    """앞 3,000자는 한국어, 이후는 영어인 경우 — 모델 전달 범위(앞부분) 기준으로 한국어 판단."""
    ko_front = "안녕하세요 " * 500          # ~3,000자 한국어 (앞부분)
    en_back = "I am an engineer. " * 200   # 영어 (뒷부분, 모델에 전달 안 됨)
    mixed = ko_front + en_back

    assert len(mixed) > 3000
    prompt = build_resume_user_prompt(mixed)
    # 앞 3000자가 한국어이므로 한국어 프롬프트여야 함
    assert "다음 이력서를 분석해 주세요" in prompt


def test_prompt_mixed_language_english_front():
    """앞 3,000자가 영어, 이후가 한국어인 경우 — 앞부분 기준으로 영어 판단."""
    en_front = "I am a software engineer. " * 120   # ~3,000자 영어 (앞부분)
    ko_back = "저는 개발자입니다. " * 200             # 한국어 (뒷부분)
    mixed = en_front + ko_back

    assert len(mixed) > 3000
    prompt = build_resume_user_prompt(mixed)
    assert "Please analyze" in prompt
    assert "English" in prompt
