# 스크래핑 자동 수집 정책 (#1154)

## 데이터 계약

- scraping_pipelines.schedule_interval_minutes는 0보다 큰 필수 정수 컬럼이다.
- 기본 수집 주기는 360분이다.
- 파이프라인 목록과 상세 응답은 FastAPI, Spring, 관리자 프론트엔드에서 scheduleIntervalMinutes를 제공한다.

## 실행 대상 판단

- 스케줄러는 5분마다 실행한다.
- 활성화 상태이며 RUNNING 상태가 아닌 파이프라인만 대상이 된다.
- 기준 시각은 COALESCE(last_started_at, created_at)이다.
- 기준 시각에 schedule_interval_minutes를 더한 시각이 현재 시각보다 이르면 실행 대상이다.
- 이번 범위에서는 next_run_at을 저장하거나 응답하지 않는다.

## 실행 정책

- 자동 수집은 기존 RUN 작업 경로를 그대로 사용한다.
- TEST 작업은 자동 실행 대상이 아니다.
- 백그라운드 작업을 등록하기 전에 조건부 RUNNING 상태 전환으로 실행 권한을 선점한다.
- 여러 FastAPI 인스턴스가 동시에 실행되어도 조건부 RUNNING 전환을 통과한 하나의 인스턴스만 작업을 등록한다.
- 기존 runner, normalizer, 중복 제거, 파이프라인 상태 갱신, 실행 로그 기록 흐름을 그대로 재사용한다.

## 관리자 화면 표시

- 화면에서는 10을 10분, 360을 6시간, 720을 12시간으로 표시한다.
- 수동 RUN, RETRY, TEST 버튼 동작은 변경하지 않는다.
