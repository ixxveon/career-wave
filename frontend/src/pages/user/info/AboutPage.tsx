import React from 'react';

function AboutPage(): React.ReactElement {
  return (
    <main className="cw-page cw-info-page">
      <div className="cw-info-page__inner">
        <h1>회사 소개</h1>
        <p>Career Wave는 AI 기술로 취업 준비의 모든 단계를 함께하는 커리어 플랫폼입니다.</p>
        <p>이력서 분석부터 AI 면접 코칭까지, 구직자가 자신의 역량을 최대한 발휘할 수 있도록 돕습니다.</p>
      </div>
    </main>
  );
}

export default AboutPage;
