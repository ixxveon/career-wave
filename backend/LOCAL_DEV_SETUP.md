# Career Wave Backend — 로컬 실행 가이드

> PR #323 기준 작성 (2026-06-11)

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

## Step 2. 환경변수 설정 (.env)

### Mac
```bash
cp .env.example .env
```

### Windows
```cmd
copy .env.example .env
```

`.env` 파일을 열어 아래 항목을 채웁니다.

```env
DB_URL=jdbc:postgresql://localhost:5432/careerwave
DB_USERNAME=careerwave
DB_PASSWORD=your_password

JWT_USER_SECRET=local-user-secret-32bytes-or-more!!
JWT_ADMIN_SECRET=local-admin-secret-32bytes-or-more!
```

> JWT secret은 32자 이상 임의 문자열이면 됩니다. 로컬 전용이라 실제 값 무관.

---

## Step 3. PostgreSQL DB 생성

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

## Step 4. 테이블 생성 + 테스트 데이터 시드

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

## Step 5. 백엔드 실행

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

---

## Step 6. 테스트 실행

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

## Step 7. Swagger로 API 확인

1. `http://localhost:8080/swagger-ui.html` 접속
2. 로그인 API 호출 → 응답의 `accessToken` 복사
3. 우측 상단 **Authorize** 버튼 → `Bearer {accessToken}` 입력
4. 인증 필요 API 테스트 가능
