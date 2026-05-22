import { Bot, Database, RefreshCw } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function JobScrapingPage() {
  return (
    <ServicePage
      eyebrow="JOB SCRAPING"
      title="공고 스크래핑"
      description="외부 채용 정보를 수집하고 정리해 커리어 웨이브 안에서 비교할 수 있도록 준비합니다."
      primaryAction="수집 시작"
      secondaryAction="수집 이력 보기"
      metrics={[
        { value: '자동', label: '공고 데이터 정리' },
        { value: '중복', label: '공고 필터링' },
        { value: '매일', label: '데이터 갱신' },
      ]}
      cards={[
        { icon: Bot, title: 'AI 수집 보조', text: '공고 제목과 본문을 분석해 직무와 요구 기술을 분류합니다.' },
        { icon: Database, title: '데이터 표준화', text: '회사명, 직무, 연봉, 경력 조건을 같은 기준으로 정리합니다.' },
        { icon: RefreshCw, title: '변경 감지', text: '마감일과 모집 상태가 바뀌면 자동으로 업데이트합니다.' },
      ]}
      steps={['수집 대상 등록', 'AI 분류 확인', '채용공고 목록 반영']}
    />
  );
}

export default JobScrapingPage;
