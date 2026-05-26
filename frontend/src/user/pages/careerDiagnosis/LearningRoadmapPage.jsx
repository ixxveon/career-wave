import { ArrowLeft, BookOpenCheck, CheckCircle2, Circle, FileText, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CareerDiagnosis.css';

const weakSkills = [
  {
    title: 'JPA 영속성 컨텍스트',
    reason: '최근 기술면접에서 1차 캐시와 변경 감지 설명이 부족했습니다.',
    level: '우선 학습',
  },
  {
    title: 'Spring Security 인증 흐름',
    reason: 'JWT 로그인 과정과 인증 필터 흐름을 프로젝트 사례로 연결해야 합니다.',
    level: '핵심 보완',
  },
  {
    title: '프로젝트 문제 해결 과정 설명',
    reason: '성능 개선 경험을 수치와 결과 중심으로 정리할 필요가 있습니다.',
    level: '답변 개선',
  },
];

const weeklyRoadmap = [
  {
    week: '1주차',
    title: 'JPA 기본 개념 복습',
    detail: '영속성 컨텍스트, 변경 감지, 지연 로딩을 면접 답변용으로 정리합니다.',
    done: true,
  },
  {
    week: '2주차',
    title: 'N+1 문제와 Fetch Join 정리',
    detail: '실제 프로젝트 쿼리 사례를 기준으로 문제 원인과 개선 결과를 정리합니다.',
    done: false,
  },
  {
    week: '3주차',
    title: 'JWT 로그인 흐름 정리',
    detail: 'Spring Security 인증 필터, 토큰 발급, 토큰 검증 과정을 그림처럼 설명합니다.',
    done: false,
  },
  {
    week: '4주차',
    title: '프로젝트 경험 STAR 답변 작성',
    detail: '상황, 행동, 결과를 1분 답변으로 압축하고 면접 질문별로 연결합니다.',
    done: false,
  },
];

const resources = [
  'JPA 영속성 컨텍스트 핵심 개념 정리',
  'Spring Security + JWT 인증 흐름 실습',
  '프로젝트 성능 개선 사례 STAR 답변 템플릿',
];

function LearningRoadmapPage() {
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
          <strong>JPA</strong>
        </div>
      </header>

      <section className="feedback-panel">
        <div className="section-title">
          <Target size={21} />
          <h2>부족 역량 TOP 3</h2>
        </div>
        <div className="weak-skill-grid">
          {weakSkills.map((skill) => (
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
          {weeklyRoadmap.map((item) => {
            const StatusIcon = item.done ? CheckCircle2 : Circle;

            return (
              <article className={item.done ? 'is-done' : ''} key={item.week}>
                <div className="roadmap-timeline__marker">
                  <StatusIcon size={20} />
                </div>
                <div>
                  <span>{item.week}</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
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
          {resources.map((resource) => (
            <li key={resource}>{resource}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export default LearningRoadmapPage;
