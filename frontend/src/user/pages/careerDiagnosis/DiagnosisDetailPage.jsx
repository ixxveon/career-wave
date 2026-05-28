import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpenCheck, Download, FileText, Lightbulb, Target } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { careerHistoryApi } from '../../api/careerHistoryApi';
import './CareerDiagnosis.css';

const roadmap = [
  { week: '1주차', title: 'JPA 기본 개념 복습', detail: '영속성 컨텍스트, 변경 감지, 지연 로딩 정리' },
  { week: '2주차', title: 'N+1 문제와 Fetch Join 정리', detail: '실제 프로젝트 쿼리 사례로 설명 연습' },
  { week: '3주차', title: 'JWT 로그인 흐름 정리', detail: 'Spring Security 인증 필터와 토큰 검증 과정 정리' },
  { week: '4주차', title: '프로젝트 경험 STAR 정리', detail: '상황, 행동, 결과를 1분 답변으로 압축' },
];

function DiagnosisDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    careerHistoryApi.getHistoryDetail(id)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch(() => {
        if (active) setError('기록 상세 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <section className="support-page"><div className="empty-state">기록을 불러오는 중입니다.</div></section>;
  if (error) return <section className="support-page"><div className="empty-state empty-state--error">{error}</div></section>;
  if (!detail) {
    return (
      <section className="support-page">
        <div className="empty-state">존재하지 않는 취업 준비 기록입니다. <Link to="/career-diagnosis/history">기록 목록으로 이동</Link></div>
      </section>
    );
  }

  return (
    <section className="support-page">
      <div className="detail-topbar">
        <Link className="text-link" to="/career-diagnosis/history">
          <ArrowLeft size={17} />
          기록 목록
        </Link>
        <Link className="support-button support-button--primary" to={`/career-diagnosis/report?record=${id}`}>
          <Download size={16} />
          PDF 다운로드
        </Link>
      </div>

      <header className="support-hero">
        <div>
          <p className="support-eyebrow">INTERVIEW ANALYSIS</p>
          <h1>면접 결과 상세</h1>
          <p>{detail.history.companyName} {detail.history.jobTitle} 기록의 답변과 개선 방향을 확인하세요.</p>
        </div>
        <div className="support-hero__summary">
          <span>면접 기록</span>
          <strong>{detail.history.practiceDate}</strong>
        </div>
      </header>

      <div className="score-grid score-grid--five">
        {detail.scores.map((score) => (
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
          {detail.overallFeedback ?? '아직 생성된 AI 종합 피드백이 없습니다.'}
        </p>
      </section>

      <section className="feedback-panel">
        <div className="section-title">
          <FileText size={21} />
          <h2>전체 면접 스크립트</h2>
        </div>
        <pre className="script-preview">{detail.script ?? '저장된 면접 스크립트가 없습니다.'}</pre>
      </section>

      <div className="question-list">
        {!detail.questions?.length && <div className="empty-state">저장된 질문-답변 매칭 데이터가 없습니다.</div>}
        {detail.questions?.map((item, index) => (
          <article className="question-card" key={item.question}>
            <h2>
              질문 {index + 1}. {item.question}
            </h2>

            <div className="answer-grid">
              <div className={`answer-box ${item.needsImprovement ? 'answer-box--issue' : ''}`}>
                <span>내 답변</span>
                <p>{item.answer}</p>
                {item.highlightedIssue && <small>개선 필요 표현: {item.highlightedIssue}</small>}
              </div>
              <div className="answer-box answer-box--highlight">
                <span>AI 피드백</span>
                <p>{item.feedback ?? '생성된 AI 피드백이 없습니다.'}</p>
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

export default DiagnosisDetailPage;
