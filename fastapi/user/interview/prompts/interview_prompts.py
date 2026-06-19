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
    return _SYSTEM_PROMPTS.get(interview_type or "", SYSTEM_PROMPT_DEFAULT)


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
    return _FALLBACK_MAP.get(interview_type or "", FALLBACK_QUESTIONS_DEFAULT)
