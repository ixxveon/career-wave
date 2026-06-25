# API Schema: Career History API (User Career History)

---

## Base URL

```http
/api/v1/user/career-histories
```

---

## 공통 응답 형식

모든 API 응답은 프로젝트 공통 응답 래퍼인 `ApiResponse<T>`를 사용한다.

```json
{
  "success": true,
  "status": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "code": null,
  "data": {}
}
```

---

## 1. 취업 준비 기록 목록 조회

```http
GET /api/v1/user/career-histories?page=0&size=10
```

### Query Parameters

| 이름     | 타입      | 필수 | 기본값 | 설명     |
| ------ | ------- | -- | --- | ------ |
| `page` | integer | N  | 0   | 페이지 번호 |
| `size` | integer | N  | 10  | 페이지 크기 |

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "code": null,
  "data": {
    "content": [
      {
        "careerHistoryId": 1,
        "sessionId": "6f6c4c6f-4e8b-4a7e-b7fd-2dd3a5fa9d01",
        "sessionType": "TEXT",
        "interviewType": "TECHNICAL",
        "targetCompany": "네이버",
        "sessionStatus": "COMPLETED",
        "totalScore": 82,
        "pdfUrl": "https://s3.example.com/reports/career-history-1.pdf",
        "createdAt": "2026-06-24T10:30:00+09:00"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
}
```

---

## 2. 취업 준비 기록 상세 조회

```http
GET /api/v1/user/career-histories/{careerHistoryId}
```

### Path Variables

| 이름                | 타입   | 설명          |
| ----------------- | ---- | ----------- |
| `careerHistoryId` | long | 취업 준비 기록 ID |

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "code": null,
  "data": {
    "careerHistoryId": 1,
    "sessionId": "6f6c4c6f-4e8b-4a7e-b7fd-2dd3a5fa9d01",
    "documentId": "05b87b64-7053-4e2b-9cd0-40707d2da112",
    "totalScore": 82,
    "feedback": "기술 질문에 대한 이해도는 높으나 답변 구조화가 필요합니다.",
    "pdfUrl": "https://s3.example.com/reports/career-history-1.pdf",
    "createdAt": "2026-06-24T10:30:00+09:00",
    "session": {
      "sessionType": "TEXT",
      "sessionStatus": "COMPLETED",
      "interviewType": "TECHNICAL",
      "targetCompany": "네이버",
      "totalScore": 82,
      "startedAt": "2026-06-24T10:00:00+09:00",
      "endedAt": "2026-06-24T10:25:00+09:00"
    },
    "document": {
      "documentId": "05b87b64-7053-4e2b-9cd0-40707d2da112",
      "fileType": "RESUME",
      "originalName": "resume.pdf",
      "status": "COMPLETED",
      "createdAt": "2026-06-23T15:20:00+09:00"
    },
    "documentFeedback": {
      "documentFeedbackId": 10,
      "scoreJobFitness": 80,
      "scoreTechStack": 75,
      "scoreQuantified": 70,
      "scoreLogical": 85,
      "scoreTotal": 78,
      "overallReview": "직무 적합도는 높으나 성과 수치화가 보완되면 좋습니다.",
      "feedbackText": "{...}",
      "createdAt": "2026-06-23T15:30:00+09:00"
    },
    "interviewFeedbacks": [
      {
        "interviewFeedbackId": 100,
        "questionOrder": 1,
        "questionText": "Spring 트랜잭션 전파 속성에 대해 설명해 주세요.",
        "answerText": "트랜잭션 전파 속성은 기존 트랜잭션이 있을 때...",
        "relevanceScore": 85,
        "depthScore": 78,
        "deliveryScore": null,
        "fluencyScore": null,
        "voiceQualityRatio": null,
        "aiFeedback": "핵심 개념은 설명했으나 예시가 추가되면 더 좋습니다.",
        "createdAt": "2026-06-24T10:31:00+09:00"
      }
    ]
  }
}
```

---

## 3. PDF 리포트 URL 조회

```http
GET /api/v1/user/career-histories/{careerHistoryId}/report
```

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "code": null,
  "data": {
    "careerHistoryId": 1,
    "pdfUrl": "https://s3.example.com/reports/career-history-1.pdf"
  }
}
```

---

## Error Response

### 존재하지 않는 기록

```json
{
  "success": false,
  "status": 404,
  "message": "존재하지 않는 취업 준비 기록입니다.",
  "code": "CAREER_HISTORY_NOT_FOUND",
  "data": null
}
```

### 권한 없는 기록 접근

```json
{
  "success": false,
  "status": 403,
  "message": "해당 취업 준비 기록에 접근할 수 없습니다.",
  "code": "CAREER_HISTORY_ACCESS_DENIED",
  "data": null
}
```

### PDF 리포트 없음

```json
{
  "success": false,
  "status": 404,
  "message": "PDF 리포트가 존재하지 않습니다.",
  "code": "CAREER_HISTORY_REPORT_NOT_FOUND",
  "data": null
}
```
