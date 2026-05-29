import { useMemo, useState } from 'react';
import { BarChart3, BriefcaseBusiness, CalendarDays, MessageSquareText, Search, X } from 'lucide-react';
import { careerHistoryRecords } from '../../data/careerWorkflowMockData';
import './CareerHistoryPage.css';

function CareerHistoryPage() {
  const [selectedId, setSelectedId] = useState(careerHistoryRecords[0]?.id ?? '');
  const [companyQuery, setCompanyQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('전체');

  const selectedRecord = careerHistoryRecords.find((record) => record.id === selectedId) ?? careerHistoryRecords[0];
  const types = ['전체', ...new Set(careerHistoryRecords.map((record) => record.type))];

  const filteredRecords = useMemo(() => {
    return careerHistoryRecords.filter((record) => {
      const matchesType = typeFilter === '전체' || record.type === typeFilter;
      const matchesCompany = record.company.toLowerCase().includes(companyQuery.trim().toLowerCase());
      return matchesType && matchesCompany;
    });
  }, [companyQuery, typeFilter]);

  return (
    <section className="career-history-page">
      <header className="career-history-hero">
        <div>
          <p>CAREER HISTORY</p>
          <h1>취업 준비 기록</h1>
          <span>날짜별, 기업별 면접 기록을 한 화면에서 확인하고 질문별 AI 피드백까지 바로 복습하세요.</span>
        </div>
        <div className="career-history-hero__score">
          <span>최근 면접 점수</span>
          <strong>{careerHistoryRecords[0].score}</strong>
          <small>이전 대비 +{careerHistoryRecords[0].score - careerHistoryRecords[0].previousScore}점</small>
        </div>
      </header>

      <div className="career-history-toolbar">
        <div className="career-history-tabs" aria-label="면접 유형 필터">
          {types.map((type) => (
            <button className={typeFilter === type ? 'is-active' : ''} key={type} type="button" onClick={() => setTypeFilter(type)}>
              {type}
            </button>
          ))}
        </div>
        <label className="career-history-search">
          <Search size={18} />
          <input
            aria-label="기업명 검색"
            placeholder="기업명 검색"
            type="search"
            value={companyQuery}
            onChange={(event) => setCompanyQuery(event.target.value)}
          />
          {companyQuery && (
            <button aria-label="검색어 지우기" type="button" onClick={() => setCompanyQuery('')}>
              <X size={16} />
            </button>
          )}
        </label>
      </div>

      <div className="career-history-layout">
        <div className="career-history-list" aria-label="면접 기록 목록">
          {filteredRecords.map((record) => {
            const diff = record.score - record.previousScore;
            return (
              <button
                className={`career-record-card ${selectedRecord.id === record.id ? 'is-selected' : ''}`}
                key={record.id}
                type="button"
                onClick={() => setSelectedId(record.id)}
              >
                <span className="career-record-card__date">
                  <CalendarDays size={16} />
                  {record.date}
                </span>
                <strong>{record.company}</strong>
                <em>{record.role} · {record.type}</em>
                <p>{record.summary}</p>
                <div>
                  <span className="career-record-card__status">{record.status}</span>
                  <span className={diff >= 0 ? 'score-up' : 'score-down'}>
                    <BarChart3 size={16} />
                    {diff >= 0 ? '+' : ''}{diff}점
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="career-history-detail" aria-label="면접 기록 상세">
          <div className="career-history-detail__header">
            <div>
              <span>{selectedRecord.date}</span>
              <h2>{selectedRecord.company}</h2>
              <p>{selectedRecord.role} · {selectedRecord.type}</p>
            </div>
            <strong>{selectedRecord.score}점</strong>
          </div>

          <section className="career-history-detail__section">
            <h3>AI 종합 피드백</h3>
            <p>{selectedRecord.summary}</p>
          </section>

          <section className="career-history-detail__section">
            <h3>기술 스택</h3>
            <div className="career-skill-list">
              {selectedRecord.techStack.map((skill) => <span key={skill}>{skill}</span>)}
            </div>
          </section>

          <section className="career-history-detail__section">
            <h3>질문 · 답변 · 개선 포인트</h3>
            <div className="career-question-list">
              {selectedRecord.questions.map((item, index) => (
                <article key={item.question}>
                  <span>
                    <MessageSquareText size={16} />
                    질문 {index + 1}
                  </span>
                  <h4>{item.question}</h4>
                  <dl>
                    <div>
                      <dt>답변</dt>
                      <dd>{item.answer}</dd>
                    </div>
                    <div>
                      <dt>AI 피드백</dt>
                      <dd>{item.feedback}</dd>
                    </div>
                    <div>
                      <dt>개선 포인트</dt>
                      <dd>{item.improvement}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="career-history-metrics" aria-label="누적 기록 요약">
        <article>
          <BriefcaseBusiness size={20} />
          <span>누적 면접</span>
          <strong>{careerHistoryRecords.length}회</strong>
        </article>
        <article>
          <BarChart3 size={20} />
          <span>평균 점수</span>
          <strong>{Math.round(careerHistoryRecords.reduce((sum, item) => sum + item.score, 0) / careerHistoryRecords.length)}점</strong>
        </article>
        <article>
          <MessageSquareText size={20} />
          <span>반복 개선 키워드</span>
          <strong>성과 수치화</strong>
        </article>
      </section>
    </section>
  );
}

export default CareerHistoryPage;
