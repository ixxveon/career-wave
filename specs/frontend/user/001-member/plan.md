# Plan: 회원 및 인증 관리

**Milestone**: v0.1.0

## 일정

| 단계 | 작업 | 기한 |
|------|------|------|
| 1 | DB 스키마 설계 및 마이그레이션 | - |
| 2 | 회원가입 / 로그인 API 구현 | - |
| 3 | RTR 토큰 갱신 구현 | - |
| 4 | 이메일 인증 구현 | - |
| 5 | 프론트엔드 연동 | - |

## DB 마이그레이션 계획

```sql
CREATE TABLE member (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    nickname    VARCHAR(50),
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME NOT NULL DEFAULT NOW(),
    updated_at  DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
);
```
