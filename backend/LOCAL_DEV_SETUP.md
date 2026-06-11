# 백엔드 로컬 개발 환경 세팅 가이드

## 전제 조건

| 항목 | 버전 |
| :--- | :--- |
| JDK | 21 이상 |
| Gradle | Wrapper 사용 (별도 설치 불필요) |
| Docker | DB 컨테이너 실행용 |
| PostgreSQL | Docker로 실행 (로컬 직접 설치 불필요) |

---

## 1. 환경 변수 설정

```bash
# 프로젝트 루트에서 실행
copy backend\.env.example backend\.env   # Windows
cp backend/.env.example backend/.env     # Mac/Linux
```

`backend/.env` 파일을 열어 아래 항목을 채웁니다.

| 변수명 | 설명 | 예시 |
| :--- | :--- | :--- |
| `DB_URL` | JDBC 접속 URL | `jdbc:postgresql://localhost:5432/careerwave` |
| `DB_USERNAME` | DB 유저명 | `careerwave` |
| `DB_PASSWORD` | DB 비밀번호 (루트 `.env`와 동일) | |
| `JWT_SECRET` | JWT 서명 비밀키 (256bit 이상 임의 문자열) | |
| `AWS_S3_BUCKET_NAME` | S3 버킷명 | `careerwave-files` |
| `AWS_ACCESS_KEY_ID` | AWS Access Key | |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | |
| `AWS_REGION` | S3 리전 | `ap-northeast-2` |
| `FASTAPI_BASE_URL` | FastAPI 내부 URL | `http://localhost:8000` |
| `WEBHOOK_SECRET` | Webhook 인증키 (FastAPI와 동일 값) | |

---

## 2. DB 컨테이너 실행

```bash
# 프로젝트 루트에서 실행
copy .env.example .env   # Windows
cp .env.example .env     # Mac/Linux
# .env 파일에 DB_PASSWORD 값 입력

docker-compose up -d
```

---

## 3. 테스트 데이터 시드

**psql CLI가 설치된 경우** (backend/ 디렉토리에서 실행):

```bash
psql -U careerwave -d careerwave -f src/main/resources/db/seed-local.sql
```

**Docker만 사용하는 경우** (프로젝트 루트에서 실행):

```bash
docker exec -i careerwave-db psql -U careerwave -d careerwave < backend/src/main/resources/db/seed-local.sql
```

> 재실행해도 안전합니다 (기존 데이터 DELETE 후 재삽입).

---

## 4. 서버 실행

```bash
# backend/ 디렉토리에서 실행
./gradlew bootRun        # Mac/Linux
.\gradlew.bat bootRun    # Windows
```

서버가 뜨면 Swagger UI에서 API를 확인할 수 있습니다.  
→ http://localhost:8080/swagger-ui.html

---

## 5. IntelliJ 환경 변수 설정

IntelliJ에서 실행할 경우 환경 변수를 별도로 주입해야 합니다.

**방법 1 — 수동 입력**
1. `Run > Edit Configurations` 선택
2. `CareerWaveApplication` 실행 설정 클릭
3. `Environment variables` 항목에 `backend/.env` 파일 내용 입력

**방법 2 — EnvFile 플러그인 사용**
1. [EnvFile 플러그인](https://plugins.jetbrains.com/plugin/7861-envfile) 설치
2. 실행 설정의 `EnvFile` 탭에서 `backend/.env` 경로 지정

---

## 6. 테스트 실행

```bash
./gradlew test --no-daemon        # Mac/Linux
.\gradlew.bat test --no-daemon    # Windows
```
