import { ArrowLeft, BookOpenCheck, Download, FileText, Lightbulb, Target } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import './InterviewManagement.css';

const scoreCards = [
  { label: '총점', value: 82, note: '최근 기록 기준' },
  { label: '논리성', value: 80, note: '답변 구조 양호' },
  { label: '구체성', value: 75, note: '사례 보완 필요' },
  { label: '기술 정확도', value: 85, note: '개념 이해도 높음' },
  { label: '직무 적합도', value: 78, note: '프로젝트 연결 필요' },
];

const questions = [
  {
    question: 'JPA를 사용하는 이유는 무엇인가요?',
    answer: 'JPA는 객체와 테이블을 매핑해서 DB 작업을 쉽게 해줍니다.',
    feedback: '기본 개념은 맞지만 ORM의 장점과 영속성 컨텍스트를 함께 설명하면 더 좋습니다.',
    improvement:
      'JPA를 사용한 이유는 반복적인 SQL 작성 부담을 줄이고 객체 중심으로 데이터를 다루기 위해서입니다. 또한 영속성 컨텍스트를 통해 변경 감지와 1차 캐시를 활용할 수 있어 유지보수성과 생산성을 높일 수 있습니다.',
  },
  {
    question: '프로젝트에서 성능 문제를 해결한 경험을 말해 주세요.',
    answer: 'API 응답이 느린 부분을 찾아 쿼리를 개선했고 캐시를 적용했습니다.',
    feedback: '문제 상황, 측정 지표, 개선 결과를 수치로 연결하면 설득력이 높아집니다.',
    improvement:
      '주문 목록 API 응답 시간이 2초 이상 걸리는 문제가 있었고, 실행 계획을 확인해 불필요한 조인을 줄였습니다. 이후 Redis 캐시를 적용해 평균 응답 시간을 600ms 수준으로 낮췄습니다.',
  },
];

const roadmap = [
  { week: '1주차', title: 'JPA 기본 개념 복습', detail: '영속성 컨텍스트, 변경 감지, 지연 로딩 정리' },
  { week: '2주차', title: 'N+1 문제와 Fetch Join 정리', detail: '실제 프로젝트 쿼리 사례로 설명 연습' },
  { week: '3주차', title: 'JWT 로그인 흐름 정리', detail: 'Spring Security 인증 필터와 토큰 검증 과정 정리' },
  { week: '4주차', title: '프로젝트 경험 STAR 정리', detail: '상황, 행동, 결과를 1분 답변으로 압축' },
];

function InterviewDetailPage() {
  const { id } = useParams();

  return (
    <section className="support-page">
      <div className="detail-topbar">
        <Link className="text-link" to="/interview/history">
          <ArrowLeft size={17} />
          기록 목록
        </Link>
        <Link className="support-button support-button--primary" to={`/interview/report-export?record=${id}`}>
          <Download size={16} />
          PDF 다운로드
        </Link>
      </div>

      <header className="support-hero">
        <div>
          <p className="support-eyebrow">INTERVIEW ANALYSIS</p>
          <h1>면접 결과 상세</h1>
          <p>점수의 이유와 다음 답변에서 고쳐야 할 방향을 질문별로 확인하세요.</p>
        </div>
        <div className="support-hero__summary">
          <span>면접 기록</span>
          <strong>{id}</strong>
        </div>
      </header>

      <div className="score-grid score-grid--five">
        {scoreCards.map((score) => (
          <article className="score-card" key={score.label}>
            <span>{score.label}</span>
            <strong>{score.value}점</strong>
            <p>{score.note}</p>
          </article>
        ))}
      </div>

      <section className="feedback-panel">
        <div className="section-title">
          <FileText size={21} />
          <h2>AI 종합 피드백</h2>
        </div>
        <p>
          기술 개념은 이해하고 있으나 실제 프로젝트에서 어떻게 적용했는지 설명이 부족합니다. 답변마다
          문제 상황, 내가 한 행동, 결과 지표를 함께 말하면 직무 적합도가 더 선명하게 전달됩니다.
        </p>
      </section>

      <div className="question-list">
        {questions.map((item, index) => (
          <article className="question-card" key={item.question}>
            <h2>
              질문 {index + 1}. {item.question}
            </h2>

            <div className="answer-grid">
              <div className="answer-box">
                <span>내 답변</span>
                <p>{item.answer}</p>
              </div>
              <div className="answer-box answer-box--highlight">
                <span>AI 피드백</span>
                <p>{item.feedback}</p>
              </div>
            </div>

            <div className="improvement-box">
              <div className="section-title">
                <Lightbulb size={20} />
                <h3>개선 답변 방향</h3>
              </div>
              <p>{item.improvement}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="feedback-panel">
        <div className="section-title">
          <Target size={21} />
          <h2>부족 역량 TOP 3</h2>
        </div>
        <div className="skill-rank">
          <span>1. JPA 영속성 컨텍스트</span>
          <span>2. Spring Security 인증 흐름</span>
          <span>3. 프로젝트 문제 해결 과정 설명</span>
        </div>
      </section>

      <section className="feedback-panel">
        <div className="section-title">
          <BookOpenCheck size={21} />
          <h2>추천 학습 로드맵</h2>
        </div>
        <div className="roadmap-list">
          {roadmap.map((item) => (
            <article key={item.week}>
              <span>{item.week}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default InterviewDetailPage;
