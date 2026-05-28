import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Bell, Eye, ChevronRight } from 'lucide-react';
import './styles/NoticeDetailPage.css';

interface Notice {
  id: number;
  title: string;
  category: string;
  createdAt: string;
  views: number;
  content: string;
}

const MOCK_NOTICES: Notice[] = [
  {
    id: 1,
    title: '[필독] Career-wave 서비스 이용약관 개정 안내',
    category: '공지',
    createdAt: '2025-05-25',
    views: 4820,
    content: `안녕하세요, Career-wave입니다.

서비스 이용약관이 2025년 6월 1일부로 일부 개정됩니다. 주요 변경 사항을 안내드립니다.

**주요 변경 내용**

1. 개인정보 수집 및 이용 목적 명시 강화
2. AI 분석 데이터 보존 기간 변경 (기존 1년 → 3년)
3. 구독 해지 및 환불 정책 세부화
4. 제3자 서비스 연동 관련 조항 추가

**시행일**
2025년 6월 1일 (월)

변경된 약관은 시행일 이후 서비스 이용 시 자동으로 적용됩니다.
약관 개정에 동의하지 않으실 경우, 2025년 5월 31일 이전에 탈퇴하실 수 있습니다.

문의사항은 1:1 문의를 통해 접수해 주시기 바랍니다.

감사합니다.`,
  },
  {
    id: 2,
    title: 'AI 면접 서비스 개선 안내 (v2.3 업데이트)',
    category: '업데이트',
    createdAt: '2025-05-22',
    views: 2310,
    content: `Career-wave AI 면접 서비스가 v2.3으로 업데이트되었습니다.

**개선 사항**

1. 답변 분석 정확도 향상 (GPT-4o 모델 적용)
2. 면접 종료 후 종합 리포트 제공 시간 단축 (평균 30초 → 10초)
3. 네트워크 불안정 환경에서의 자동 재연결 기능 개선
4. 면접 기록 조회 UI 개편

**적용일**
2025년 5월 22일 (목) 적용 완료

더 나은 서비스로 보답하겠습니다.`,
  },
  {
    id: 3,
    title: '5월 정기 점검 일정 안내 (5/28 02:00~04:00)',
    category: '점검',
    createdAt: '2025-05-20',
    views: 1540,
    content: `안녕하세요, Career-wave 운영팀입니다.

서비스 안정화를 위한 정기 점검을 아래와 같이 진행합니다.

**점검 일정**
- 일시: 2025년 5월 28일 (수) 02:00 ~ 04:00
- 소요 시간: 약 2시간

**점검 중 이용 불가 서비스**
- AI 이력서 분석
- AI 면접
- 결제/구독 관련 기능

점검 시간 동안 서비스 이용에 불편을 드려 죄송합니다.
보다 안정적인 서비스 제공을 위해 최선을 다하겠습니다.`,
  },
];

const PREV_NEXT = (id: number) => {
  const idx = MOCK_NOTICES.findIndex(n => n.id === id);
  return {
    prev: idx < MOCK_NOTICES.length - 1 ? MOCK_NOTICES[idx + 1] : null,
    next: idx > 0 ? MOCK_NOTICES[idx - 1] : null,
  };
};

export default function NoticeDetailPage() {
  const navigate   = useNavigate();
  const { id }     = useParams<{ id: string }>();
  const notice     = MOCK_NOTICES.find(n => n.id === Number(id));
  const { prev, next } = PREV_NEXT(Number(id));

  if (!notice) {
    return (
      <div className="nd-page">
        <div className="nd-empty">공지사항을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="nd-page">
      <button className="nd-back" onClick={() => navigate('/support/notices')}>
        <ChevronLeft size={14} /> 공지사항 목록
      </button>

      <article className="nd-article">
        <div className="nd-article__header">
          <span className="nd-cat-badge">{notice.category}</span>
          <h1 className="nd-title">{notice.title}</h1>
          <div className="nd-meta">
            <span className="nd-meta__item"><Bell size={12} /> 운영팀</span>
            <span className="nd-meta__dot">·</span>
            <span className="nd-meta__item">{notice.createdAt}</span>
            <span className="nd-meta__dot">·</span>
            <span className="nd-meta__item"><Eye size={12} /> 조회 {notice.views.toLocaleString()}</span>
          </div>
        </div>

        <div className="nd-body">
          {notice.content.split('\n').map((line, i) => {
            if (!line.trim()) return <br key={i} />;
            if (line.startsWith('**') && line.endsWith('**'))
              return <p key={i} className="nd-body__heading">{line.slice(2, -2)}</p>;
            return <p key={i}>{line}</p>;
          })}
        </div>
      </article>

      <div className="nd-nav">
        {next ? (
          <div className="nd-nav__item nd-nav__item--next" onClick={() => navigate(`/support/notices/${next.id}`)}>
            <span className="nd-nav__label"><ChevronLeft size={13} /> 다음 공지</span>
            <span className="nd-nav__title">{next.title}</span>
          </div>
        ) : <div className="nd-nav__item nd-nav__item--empty" />}

        {prev ? (
          <div className="nd-nav__item nd-nav__item--prev" onClick={() => navigate(`/support/notices/${prev.id}`)}>
            <span className="nd-nav__label">이전 공지 <ChevronRight size={13} /></span>
            <span className="nd-nav__title">{prev.title}</span>
          </div>
        ) : <div className="nd-nav__item nd-nav__item--empty" />}
      </div>

      <button className="nd-list-btn" onClick={() => navigate('/support/notices')}>
        목록으로
      </button>
    </div>
  );
}
