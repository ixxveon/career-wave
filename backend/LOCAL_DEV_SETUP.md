# Career Wave Backend — 로컬 실행 가이드

---

## Step 1. Java 21 설정 (⚠️ 필수 — Java 25 사용 시 Gradle 빌드 실패)

### Mac
```bash
# 설치된 Java 버전 목록 확인
/usr/libexec/java_home -V

# 터미널 세션에 Java 21로 전환 (매번 터미널 열 때마다 실행)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# 확인
java -version
# → openjdk version "21.x.x" 이어야 함
```

### Windows
1. [Adoptium](https://adoptium.net/) 에서 **Temurin 21** 설치
2. 시스템 환경변수 `JAVA_HOME` → Java 21 설치 경로로 설정
   - 예: `C:\Program Files\Eclipse Adoptium\jdk-21.0.x.x-hotspot`
3. `Path`에 `%JAVA_HOME%\bin` 추가
4. 확인:
   ```cmd
   java -version
   ```

---

## Step 2. 환경변수 설정

이 프로젝트는 로컬에서 `.env` 파일을 두 개 사용합니다.

- 루트 `.env`: Docker Compose가 PostgreSQL / Redis 컨테이너를 띄울 때 사용
- `backend/.env`: Spring Boot 백엔드가 DB / Redis / JWT 설정을 읽을 때 사용

### 2-1. 루트 `.env` 생성 (Docker Compose용)

프로젝트 루트에서 실행합니다.

### Mac
```bash
cp .env.example .env
```

### Windows
```cmd
copy .env.example .env
```

루트 `.env` 파일을 열어 아래 항목을 채웁니다.

```env
DB_NAME=careerwave
DB_USER=careerwave
DB_PASSWORD=your_password
DB_PORT=5432
REDIS_PORT=6379
```

### 2-2. `backend/.env` 생성 (Spring Boot용)

`backend` 디렉터리에서 실행합니다.

### Mac
```bash
cd backend
cp .env.example .env
```

### Windows
```cmd
cd backend
copy .env.example .env
```

`backend/.env` 파일을 열어 아래 항목을 채웁니다.

```env
DB_URL=jdbc:postgresql://localhost:5432/careerwave
DB_USERNAME=careerwave
DB_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_USER_SECRET=local-user-secret-32bytes-or-more!!
JWT_ADMIN_SECRET=local-admin-secret-32bytes-or-more!
```

> JWT secret은 32자 이상 임의 문자열이면 됩니다. 로컬 전용이라 실제 값 무관.

---

## Step 3. Docker Desktop으로 PostgreSQL + Redis 실행

Docker Desktop을 켠 뒤 프로젝트 루트에서 아래 명령을 실행합니다.

```bash
docker compose up -d
```

실행 확인:

```bash
docker compose ps
```

정상이라면 아래 두 컨테이너가 `Up` 상태여야 합니다.

```text
careerwave-db
careerwave-redis
```

Redis 연결 확인:

```bash
docker compose exec redis redis-cli ping
# → PONG 이 나와야 정상
```

> Docker Compose 기본값은 PostgreSQL `localhost:5432`, Redis `localhost:6379`, Redis 비밀번호 없음입니다.

### Docker를 사용하지 않는 경우 (Docker 사용 권장: Step 3. Redis 실행 내용 참고)

### Mac — Homebrew
```bash
brew install redis
brew services start redis

# 실행 확인
redis-cli ping
# → PONG 이 나와야 정상
```

### Windows
1. [Redis for Windows (MSI)](https://github.com/microsoftarchive/redis/releases) 설치
2. 서비스 시작:
   ```cmd
   redis-server
   ```
3. 확인:
   ```cmd
   redis-cli ping
   ```

> `backend/.env` 파일의 `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`를 서버 설정에 맞게 채웁니다.  
> 로컬 기본값은 `localhost:6379`, 비밀번호 없음입니다.

---

## Step 4. PostgreSQL DB 생성

### Mac — Homebrew
```bash
brew install postgresql@15
brew services start postgresql@15

# DB 생성
psql postgres
```

### Windows — 인스톨러
1. [PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 설치
2. pgAdmin 또는 psql 실행

### 공통 — DB / 유저 생성
```sql
CREATE USER careerwave WITH PASSWORD 'your_password';
CREATE DATABASE careerwave OWNER careerwave;
```

---

## Step 5. 테이블 생성 + 테스트 데이터 시드

### 테이블 생성 (최초 1회)

`application-local.yml`의 `ddl-auto: update` 설정으로 아래 **Step 5**에서 앱을 처음 실행할 때 테이블이 자동 생성됩니다.

### 테스트 데이터 INSERT

#### Mac
```bash
psql -U careerwave -d careerwave -f src/main/resources/db/seed-local.sql
```

#### Windows
```cmd
psql -U careerwave -d careerwave -f src\main\resources\db\seed-local.sql
```

> 재실행 안전 — 스크립트 내부에 기존 데이터 DELETE 포함

**삽입되는 테스트 계정:**

| loginId | password | roleType | 구분 |
|---------|----------|----------|------|
| `testuser01` | `Test1234!` | `USER` | 일반회원 FREE |
| `testuser02` | `Test1234!` | `USER` | 일반회원 PREMIUM (면접) |
| `testuser03` | `Test1234!` | `USER` | 일반회원 PREMIUM (서류) |
| `testuser04` | `Test1234!` | `USER` | 일반회원 PREMIUM (전체) |
| `testcompany01` | `Test1234!` | `COMPANY` | 기업회원 |
| `admin` | `1234` | — | 관리자 MASTER |

---

## Step 6. 백엔드 실행

### Mac
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew bootRun --args='--spring.profiles.active=local'
```

### Windows
```cmd
gradlew.bat bootRun --args="--spring.profiles.active=local"
```

서버 기동 확인: `http://localhost:8080/swagger-ui.html`

> **[배포 경계 주의] Phase 5 완료 전 non-local 환경 배포 불가**
>
> `StubEmploymentCertificateFileAdapter`는 `@Profile({"local","test"})`로만 활성화됩니다.
> Phase 5에서 실제 S3 구현체(`S3EmploymentCertificateFileAdapter`)가 완성되기 전까지
> staging / prod 환경에는 `EmploymentCertificateFilePort` Bean이 없어 **애플리케이션이 기동 실패**합니다.
> `develop` 브랜치를 non-local 환경에 배포하려면 반드시 Phase 5 S3 구현 완료 후 진행하세요.

---

## Step 7. 테스트 실행

### Mac
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew test
```

### Windows
```cmd
gradlew.bat test
```

→ `BUILD SUCCESSFUL` 확인

---

## Step 8. Swagger로 API 확인

1. `http://localhost:8080/swagger-ui.html` 접속
2. 로그인 API 호출 → 응답의 `accessToken` 복사
3. 우측 상단 **Authorize** 버튼 → `Bearer {accessToken}` 입력
4. 인증 필요 API 테스트 가능

---

## Step 9. 면접 WebSocket (STOMP) 테스트

> Phase 4 기능 검증용. Node.js 설치 필요.

### 9-1. 환경변수 추가

`backend/.env`에 아래 항목 추가:

```env
WEBHOOK_SECRET=careerwave-internal-secret-2026
```

> FastAPI 팀과 연동 시 동일한 값으로 맞춰야 함

### 9-2. 서버 실행 (Windows)

```powershell
# backend/ 디렉토리에서
Get-Content .env | ForEach-Object { if ($_ -match '^(.+?)=(.+)$') { [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }; ./gradlew bootRun --args='--spring.profiles.active=local --spring.jpa.hibernate.ddl-auto=none'
```

### 9-3. 로그인 및 세션 생성

```bash
# 1. 로그인 → accessToken 복사
curl -X POST http://localhost:8080/api/v1/user/members/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"testuser01","password":"Test1234!","roleType":"USER"}'

# 2. 면접 세션 생성 → sessionId 복사
curl -X POST http://localhost:8080/api/v1/user/interview/sessions \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"{본인 documentId}","sessionType":"TEXT","interviewType":"TECHNICAL"}'
```

> `documentId`는 DB `documents` 테이블에서 본인 memberId 기준으로 조회

### 9-4. STOMP 연결 테스트 (터미널 1)

프로젝트 루트에서:

```bash
node interview-stomp-test.js "{accessToken}" "{sessionId}"
```

**기대 결과:**
```json
{"type":"SYSTEM","content":"면접 세션이 시작되었습니다.","subType":"SESSION_START"}
```

### 9-5. FastAPI 콜백 테스트 (터미널 2)

터미널 1을 켜둔 채로 새 터미널에서:

```bash
curl -X POST http://localhost:8080/internal/api/v1/interview/callback/{sessionId}/report \
  -H "X-Internal-Secret: local-secret-test" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{sessionId}",
    "totalScore": 80,
    "feedbacks": [
      {
        "questionOrder": 1,
        "questionText": "test question",
        "answerText": "test answer",
        "relevanceScore": 80,
        "depthScore": 75,
        "deliveryScore": null,
        "fluencyScore": null,
        "voiceQualityRatio": null,
        "aiFeedback": "good"
      }
    ]
  }'
```

**기대 결과:** 콜백 200 OK + 터미널 1에 아래 메시지 수신
```json
{"type":"SYSTEM","content":"리포트 생성이 완료되었습니다.","subType":"REPORT_READY","data":{"reportUrl":"..."}}
```

### 9-6. 멱등성 테스트

9-5 curl 동일하게 한 번 더 실행 → 200 OK + `REPORT_READY` 재수신 확인
