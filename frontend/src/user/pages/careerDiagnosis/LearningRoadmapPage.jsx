import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpenCheck, CheckCircle2, Circle, FileText, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { careerHistoryApi } from '../../api/careerHistoryApi';
import './CareerDiagnosis.css';

function LearningRoadmapPage() {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    careerHistoryApi.getRoadmap()
      .then((result) => {
        if (active) setRoadmap(result);
      })
      .catch(() => {
        if (active) setError('학습 로드맵을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <section className="support-page"><div className="empty-state">로드맵을 불러오는 중입니다.</div></section>;
  if (error) return <section className="support-page"><div className="empty-state empty-state--error">{error}</div></section>;
  if (!roadmap?.sufficientData) return <section className="support-page"><div className="empty-state">로드맵 생성을 위해 취업 준비 기록이 더 필요합니다.</div></section>;

  return (
    <section className="support-page">
      <div className="detail-topbar">
        <Link className="text-link" to="/career-diagnosis/history">
          <ArrowLeft size={17} />
          취업 준비 기록
        </Link>
        <Link className="support-button support-button--primary" to="/career-diagnosis/report">
          <FileText size={16} />
          진단 리포트 만들기
        </Link>
      </div>

      <header className="support-hero">
        <div>
          <p className="support-eyebrow">LEARNING ROADMAP</p>
          <h1>학습 로드맵</h1>
          <p>최근 면접 기록에서 반복적으로 부족했던 역량을 기준으로 다음 학습 순서를 제안합니다.</p>
        </div>
        <div className="support-hero__summary">
          <span>다음 추천 학습</span>
          <strong>{roadmap.priorityTarget}</strong>
        </div>
      </header>

      <section className="feedback-panel">
        <div className="section-title">
          <Target size={21} />
          <h2>부족 역량 TOP 3</h2>
        </div>
        <div className="weak-skill-grid">
          {roadmap.weaknesses.map((skill) => (
            <article key={skill.title}>
              <span>{skill.level}</span>
              <strong>{skill.title}</strong>
              <p>{skill.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="feedback-panel">
        <div className="section-title">
          <BookOpenCheck size={21} />
          <h2>4주 학습 계획</h2>
        </div>
        <div className="roadmap-timeline">
          {roadmap.steps.map((item) => {
            const StatusIcon = item.done ? CheckCircle2 : Circle;

            return (
              <article className={item.done ? 'is-done' : ''} key={item.step}>
                <div className="roadmap-timeline__marker">
                  <StatusIcon size={20} />
                </div>
                <div>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <p>추천 액션: {item.recommendedActions.join(', ')}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="feedback-panel">
        <div className="section-title">
          <FileText size={21} />
          <h2>추천 학습 자료</h2>
        </div>
        <ul className="resource-list">
          {roadmap.resources.map((resource) => (
            <li key={resource}>{resource}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export default LearningRoadmapPage;
