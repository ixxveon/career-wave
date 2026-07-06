"""
LLM 면접 질문 생성용 시스템 프롬프트 및 폴백 질문 목록.

temperature는 0.7로 고정하여 답변 재현성을 보장한다.
"""
from typing import Final

TEMPERATURE: Final[float] = 0.7
MAX_ANSWER_HISTORY: Final[int] = 10  # LLM 컨텍스트 초과 방지
MAX_RAG_CONTEXT_CHARS: Final[int] = 3000  # 토큰 블로트 방지


# ── 시스템 프롬프트 ─────────────────────────────────────────────────────────

_BASE_SYSTEM = """당신은 전문 면접관입니다. 지원자의 답변을 듣고 다음 면접 질문을 생성하는 역할입니다.

규칙:
- 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
- {"question": "질문 내용", "questionType": "FOLLOW_UP|PRESSURE|NEXT"}
- questionType 선택 기준:
  - FOLLOW_UP: 이전 답변에 대한 꼬리 질문 (구체적인 사례나 심화 내용 요청)
  - PRESSURE: 압박 질문 (모순점 지적, 더 어려운 시나리오 제시)
  - NEXT: 새로운 주제로 전환하는 질문
- 질문은 명확하고 구체적으로 작성하세요.
- 존댓말을 사용하세요."""

SYSTEM_PROMPT_TECHNICAL = _BASE_SYSTEM + """

면접 유형: 기술 면접
- 기술적 깊이와 실무 경험을 평가하는 질문을 생성하세요.
- 알고리즘, 아키텍처, 트레이드오프에 대한 질문을 포함하세요.
- 지원자가 실제로 그 기술을 사용했는지 확인하는 질문을 하세요."""

SYSTEM_PROMPT_PERSONALITY = _BASE_SYSTEM + """

면접 유형: 인성 면접
- 협업 능력, 문제 해결 방식, 성장 마인드셋을 평가하는 질문을 생성하세요.
- 구체적인 경험 사례를 이끌어내는 STAR 방식의 질문을 활용하세요.
- 지원자의 가치관과 직무 적합성을 확인하세요."""

SYSTEM_PROMPT_PROJECT = _BASE_SYSTEM + """

면접 유형: 프로젝트 면접
- 프로젝트의 기술 선택 이유, 문제 해결 과정, 성과를 평가하는 질문을 생성하세요.
- 프로젝트에서 본인의 기여도와 역할을 구체화하는 질문을 하세요.
- 프로젝트에서 발생한 기술적 난관과 해결 방법을 확인하세요."""

SYSTEM_PROMPT_DEFAULT = _BASE_SYSTEM

_SYSTEM_PROMPTS: dict[str, str] = {
    "TECHNICAL": SYSTEM_PROMPT_TECHNICAL,
    "PERSONALITY": SYSTEM_PROMPT_PERSONALITY,
    "PROJECT": SYSTEM_PROMPT_PROJECT,
}


def get_system_prompt(interview_type: str | None) -> str:
    return _SYSTEM_PROMPTS.get((interview_type or "").upper(), SYSTEM_PROMPT_DEFAULT)


# ── RAG 컨텍스트 주입 템플릿 ─────────────────────────────────────────────────

RAG_CONTEXT_TEMPLATE = """
아래는 지원자가 제출한 서류 내용입니다. 질문 생성 시 이 내용을 참고하여 서류 기반 질문을 포함하세요.

[서류 내용]
{document_text}

[지시사항]
- 서류에 언급된 기술 스택, 프로젝트, 경력 사항과 연관된 질문을 생성하세요.
- 서류 내용을 단순히 읽어주는 것이 아닌, 심화 질문으로 이어가세요.
"""


def build_rag_injection(document_text: str) -> str:
    return RAG_CONTEXT_TEMPLATE.format(document_text=document_text.strip())


# ── 폴백 질문 목록 ─────────────────────────────────────────────────────────

FALLBACK_QUESTIONS_TECHNICAL: list[str] = [
    "최근에 가장 어렵게 해결한 기술적 문제가 무엇이었나요? 해결 과정을 설명해 주세요.",
    "본인이 가장 자신 있는 기술 스택과 그 이유를 말씀해 주세요.",
    "코드 리뷰 시 가장 중요하게 생각하는 기준은 무엇인가요?",
    "시스템 성능 최적화를 위해 시도해 본 방법이 있다면 설명해 주세요.",
    "기술 부채를 줄이기 위해 개인적으로 어떤 노력을 하시나요?",
    "테스트 코드 작성 시 어떤 전략을 사용하시나요?",
    "새로운 기술을 습득할 때 본인만의 학습 방법이 있으신가요?",
]

FALLBACK_QUESTIONS_PERSONALITY: list[str] = [
    "팀 내 갈등이 발생했을 때 어떻게 해결하셨나요? 구체적인 사례를 들어 주세요.",
    "실패했던 경험과 그로부터 무엇을 배웠는지 말씀해 주세요.",
    "함께 일하기 좋은 동료의 특성은 무엇이라고 생각하시나요?",
    "업무 우선순위가 충돌할 때 어떤 기준으로 결정하시나요?",
    "자신의 성장을 위해 최근에 어떤 노력을 하셨나요?",
    "압박이 심한 상황에서 어떻게 스트레스를 관리하시나요?",
    "피드백을 받을 때와 줄 때 각각 어떻게 접근하시나요?",
]

FALLBACK_QUESTIONS_PROJECT: list[str] = [
    "프로젝트에서 가장 기억에 남는 기술적 도전은 무엇이었나요?",
    "프로젝트 진행 중 요구사항이 변경됐을 때 어떻게 대응하셨나요?",
    "프로젝트에서 본인의 역할과 기여도를 구체적으로 설명해 주세요.",
    "프로젝트를 다시 진행한다면 어떤 부분을 다르게 하시겠나요?",
    "프로젝트에서 팀원과 의견 충돌이 있었을 때 어떻게 해결하셨나요?",
    "가장 자랑스러운 프로젝트 성과는 무엇인가요?",
    "프로젝트에서 사용한 기술 스택 선택 이유를 설명해 주세요.",
]

FALLBACK_QUESTIONS_DEFAULT: list[str] = [
    "지원 동기와 이 직무를 선택한 이유를 말씀해 주세요.",
    "본인의 강점과 약점을 각각 하나씩 말씀해 주세요.",
    "5년 후 본인의 모습을 어떻게 그리고 계신가요?",
    "가장 최근에 배운 새로운 기술이나 지식이 무엇인가요?",
    "업무에서 가장 중요하게 생각하는 가치는 무엇인가요?",
    "본인이 이 회사에 기여할 수 있는 부분이 무엇이라고 생각하시나요?",
    "지금까지의 경력 중 가장 보람 있었던 순간은 언제인가요?",
]

_FALLBACK_MAP: dict[str, list[str]] = {
    "TECHNICAL": FALLBACK_QUESTIONS_TECHNICAL,
    "PERSONALITY": FALLBACK_QUESTIONS_PERSONALITY,
    "PROJECT": FALLBACK_QUESTIONS_PROJECT,
}


def get_fallback_questions(interview_type: str | None) -> list[str]:
    return _FALLBACK_MAP.get((interview_type or "").upper(), FALLBACK_QUESTIONS_DEFAULT)


# ── 개선 추천 액션 focusType 오버레이 ───────────────────────────────────────
# 리포트 하단 '개선 추천 액션' 버튼 클릭 시 해당 유형에 집중하는 추가 지시사항.
# 기존 interviewType 시스템 프롬프트 뒤에 append하여 프롬프트 복잡도를 최소화한다.

_FOCUS_OVERLAYS: dict[str, str] = {
    "FOLLOW_UP": """
[이번 세션 집중 목표: 꼬리 질문 대응력]
- 지원자의 답변에서 구체성이 부족하거나 모호한 표현을 집중 공략하세요.
- 매 답변마다 "구체적으로 어떤 방식이었나요?", "그 결과는 어떠했나요?" 형태의 FOLLOW_UP 질문을 우선 생성하세요.
- PRESSURE 질문을 30% 이상 포함해 답변의 깊이를 검증하세요.""",

    "TECHNICAL_DEPTH": """
[이번 세션 집중 목표: 기술 심화]
- CS 원리, 알고리즘 복잡도, 아키텍처 트레이드오프에 집중하는 질문을 생성하세요.
- "왜 그 기술을 선택하셨나요?", "다른 대안과 비교했을 때 장단점은?" 형태의 질문을 포함하세요.
- 단순 경험 나열이 아닌 기술적 근거와 판단력을 평가하세요.""",

    "DELIVERY": """
[이번 세션 집중 목표: 발성·자신감 향상]
- 지원자가 명확하고 자신감 있게 답변할 수 있도록 유도하는 질문을 생성하세요.
- 답변 길이가 짧거나 불분명한 경우 "조금 더 자세히 설명해 주실 수 있나요?" 형태의 FOLLOW_UP을 생성하세요.
- 긴장을 낮출 수 있도록 친근하지만 전문적인 어조를 유지하세요.""",

    "FLUENCY": """
[이번 세션 집중 목표: 표현 유창성 향상]
- 지원자가 핵심을 간결하고 명확하게 전달할 수 있도록 구체적인 사례 중심 질문을 생성하세요.
- "한 문장으로 요약하면 어떻게 되나요?", "가장 중요한 포인트 하나만 말씀해 주세요." 형태의 질문을 포함하세요.
- 장황한 답변을 유도하지 않고 핵심 전달력을 평가하는 질문을 구성하세요.""",
}


def get_focus_overlay(focus_type: str | None) -> str | None:
    return _FOCUS_OVERLAYS.get((focus_type or "").upper())


# ── 목표 기업 맞춤 오버레이 ───────────────────────────────────────────────────

def get_company_overlay(target_company: str | None) -> str | None:
    if not target_company or not target_company.strip():
        return None
    # 개행 제거 — 사용자 입력이 시스템 프롬프트 구조를 흔드는 것을 방지
    company = target_company.strip().replace("\n", " ").replace("\r", " ")
    return f"""
[목표 기업: {company}]
- 지원자는 {company} 입사를 목표로 면접을 준비하고 있습니다.
- {company}의 인재상, 기술 스택, 서비스 특성을 고려한 질문을 생성하세요.
- {company}에서 실제로 중요하게 평가하는 역량(문제 해결력, 데이터 기반 사고, 협업 등)을 검증하는 방향으로 질문하세요.
- 단, {company} 관련 정보가 불확실한 경우 일반적인 면접 질문으로 대체하세요."""


# ── 답변 품질 기반 난이도 동적 조절 오버레이 ────────────────────────────────
# 직전 답변의 품질 신호(INSUFFICIENT / ADEQUATE / STRONG)에 따라 다음 질문 방향을 조절한다.
# focusType 오버레이와 독립적으로 동작하며, 프롬프트 가장 마지막에 append한다.

_DIFFICULTY_OVERLAYS: dict[str, str] = {
    "INSUFFICIENT": """
[답변 품질 신호: 보충 필요]
- 직전 답변이 짧거나 내용이 부족했습니다.
- 지원자가 답변을 보완할 수 있도록 유도하는 방향으로 질문하세요.
- "조금 더 구체적으로 설명해 주실 수 있나요?", "어떤 경험을 바탕으로 그렇게 생각하셨나요?" 형태의 FOLLOW_UP을 우선 생성하세요.
- 압박 질문(PRESSURE)은 피하고 지원자가 자신감을 회복할 수 있도록 돕는 질문을 생성하세요.""",

    "ADEQUATE": """
[답변 품질 신호: 적절]
- 직전 답변이 충분한 수준이었습니다.
- 표준적인 면접 흐름을 유지하며 다음 주제로 자연스럽게 전환하거나 꼬리 질문을 생성하세요.""",

    "STRONG": """
[답변 품질 신호: 우수]
- 직전 답변이 충실하고 깊이가 있었습니다.
- 지원자의 역량을 더 검증하기 위해 심화 질문 또는 압박 질문(PRESSURE)을 생성하세요.
- "그렇다면 더 복잡한 상황에서는 어떻게 대처하시겠나요?", "그 결정의 단점은 무엇이라고 생각하시나요?" 형태로 깊이를 파고드세요.""",
}


def get_difficulty_overlay(quality: str | None) -> str | None:
    """직전 답변 품질 신호를 받아 난이도 조절 오버레이를 반환한다. ADEQUATE는 중립이므로 생략 가능."""
    if not quality:
        return None
    key = quality.upper()
    if key == "ADEQUATE":
        return None  # 중립 상태 — 프롬프트에 불필요한 힌트 추가하지 않음
    return _DIFFICULTY_OVERLAYS.get(key)
