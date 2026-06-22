# API Schema: dashboard

> 諛깆뿏?쒖? ?꾨줎?몄뿏??媛?`dashboard` ?꾨찓??API 怨꾩빟 臾몄꽌??
> ??臾몄꽌??湲곕뒫 ?ㅻ챸???꾨땲???붿껌/?묐떟 怨꾩빟留??뺤쓽?쒕떎.

---

## 1. 怨듯넻 洹쒖튃

- ?꾨줈?앺듃 援ъ“: Spring Boot + PostgreSQL + React
- API ?묐떟 洹쒓꺽: 紐⑤뱺 endpoint??`ApiResponse<T>`瑜??ъ슜?쒕떎.
- 紐⑤뱺 `page` Query Parameter???몃? API 湲곗? **1-based**??
- 諛깆뿏???대? Pageable 蹂?섏뿉?쒕쭔 `page - 1`???곸슜?쒕떎.
- `from`, `to`??ISO 8601 UTC 臾몄옄??洹쒖튃???ъ슜?섏?留? 蹂??꾨찓??endpoint?먮뒗 ?곸슜 ??곸씠 ?녿떎.
- Swagger ?대끂?뚯씠?섏? Controller媛 ?꾨땲??`docs` ?명꽣?섏씠?ㅼ뿉 ?묒꽦?쒕떎.
- 蹂?臾몄꽌??ErrorCode ?쒖뿉??`dashboard` ?꾩슜 肄붾뱶媛 ?꾨땲?? ?ㅼ젣 蹂?endpoint?먯꽌 ?ъ슜?섎뒗 怨듯넻 ErrorCode留?理쒖냼 踰붿쐞濡??묒꽦?쒕떎.

### 沅뚰븳 ?쒓린

- 臾몄꽌??沅뚰븳 ?쒓린??`MASTER`, `BACKEND`, `CS`瑜??ъ슜?쒕떎.
- Spring Security?먯꽌???몃? ??븷 `MASTER`, `BACKEND`, `CS`瑜?媛곴컖 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`濡?留ㅽ븨?쒕떎.
- ??쒕낫???붿빟 議고쉶 API???ㅼ젣 ?묎렐 議곌굔? 愿由ъ옄 ?몄쬆(`ROLE_ADMIN`) + ?몃? ??븷 `MASTER` ?먮뒗 `BACKEND` ?먮뒗 `CS`??

### Pagination 洹쒖튃

- 紐⑸줉 議고쉶 API留?`page`, `size`瑜??ъ슜?쒕떎.
- ?곸꽭 議고쉶 API??`page`, `size`瑜??ъ슜?섏? ?딅뒗??
- ?앹꽦/?섏젙/??젣 API??`page`, `size`瑜??ъ슜?섏? ?딅뒗??

### 怨듯넻 ?깃났 ?묐떟 ?덉떆

```json
{
  "success": true,
  "message": "?붿껌???깃났?덉뒿?덈떎.",
  "data": {}
}
```

### 怨듯넻 ?ㅽ뙣 ?묐떟 ?덉떆

```json
{
  "success": false,
  "statusCode": 400,
  "message": "?좏슚?섏? ?딆? ?붿껌?낅땲??",
  "code": "BAD_REQUEST",
  "data": null
}
```

---

## 2. Enum 怨꾩빟

| Enum | Values | ERD CHECK ?쒖빟 ?먮뒗 怨꾩빟 湲곗? |
|---|---|---|
| `DashboardRangeType` | `TODAY`, `7D`, `30D` | ??쒕낫??湲곌컙 吏묎퀎 怨꾩빟 |
| `DashboardKpiKeyType` | `TODAY_NEW_MEMBERS`, `REALTIME_ACTIVE_USERS`, `AI_INTERVIEW_SESSIONS`, `TODAY_REVENUE` | 愿由ъ옄 ??쒕낫??KPI 怨꾩빟 |
| `DashboardSeverityType` | `NORMAL`, `WARNING`, `CRITICAL` | ??쒕낫???쒖떆 怨꾩빟 |
| `DashboardAlertLevelType` | `URGENT`, `WARNING`, `NORMAL` | ??쒕낫???쒖떆 怨꾩빟 |
| `DashboardDomainType` | `ADMIN`, `MEMBER`, `REPORT`, `CS`, `PAYMENT`, `STATISTICS`, `AI_METRICS`, `SCRAPING`, `AUDIT_LOG` | 愿由ъ옄 ?쇱슦??怨꾩빟 |
| `DashboardSystemStatusType` | `NORMAL`, `WARNING`, `CRITICAL` | ??쒕낫???쒖떆 怨꾩빟 |

---

## 3. Query Parameter -> ERD 而щ읆 留ㅽ븨

### GET /api/v1/admin/dashboard/summary

| Query Parameter | Type | ERD 而щ읆 | Description |
|---|---|---|---|
| `range` | `TODAY \| 7D \| 30D` | ?ㅼ쨷 吏묎퀎 湲곗? 而щ읆 | 愿由ъ옄 ??쒕낫??吏묎퀎 踰붿쐞 |

### range ?곸슜 ???而щ읆

> 蹂?endpoint???⑥씪 ?뚯씠釉?議고쉶媛 ?꾨땲??愿由ъ옄 ?꾨찓???꾨컲??吏묎퀎 ?묐떟?대떎.
> ?곕씪??`range`???꾨옒 ?쒓컙 湲곗? 而щ읆?ㅼ뿉 怨듯넻 吏묎퀎 ?덈룄?곕줈 ?곸슜?쒕떎.

| 吏묎퀎 ?곸뿭 | ERD 湲곗? 而щ읆 |
|---|---|
| 愿由ъ옄 怨꾩젙 愿??| `admins.created_at`, `admins.last_login_at` |
| 媛먯궗 濡쒓렇 愿??| `audit_logs.created_at` |
| AI ?ъ슜??愿??| `ai_usage_logs.created_at` |
| RAG 臾몄꽌 愿??| `rag_documents.created_at`, `rag_documents.updated_at` |
| ?ㅽ겕?섑븨 愿??| `scraping_logs.executed_at`, `scraping_pipelines.last_started_at`, `scraping_pipelines.last_success_at`, `scraping_pipelines.last_failed_at` |

> ?ъ슜??寃곗젣/?좉퀬 ???ㅻⅨ 愿由ъ옄 KPI媛 ?ы븿?섎뒗 寃쎌슦?먮룄 ?숈씪??`range` 洹쒖튃???곸슜?섎ŉ, ?대떦 吏?쒕뒗 媛??꾨찓?몄쓽 理쒖쥌 ERD 湲곗? ?쒓컖 而щ읆?쇰줈 吏묎퀎?쒕떎.

---

## 4. 醫낇빀 ??쒕낫??API

### 4.1 GET /api/v1/admin/dashboard/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/dashboard/summary`
- **Auth**: `ROLE_ADMIN` + (`MASTER` or `BACKEND` or `CS`)

#### Query Parameter

- Request DTO: `DashboardDTO.SummaryRequest`

| Name | Type | Required | ERD 而щ읆 | Description |
|---|---|---|---|---|
| `range` | `TODAY \| 7D \| 30D` | N | ?ㅼ쨷 吏묎퀎 湲곗? 而щ읆 | 吏묎퀎 踰붿쐞, 湲곕낯媛?`TODAY` |

#### Request Body

- Request DTO: ?놁쓬

#### Response Body

- Response DTO: `ApiResponse<DashboardDTO.ResponseSummary>`

```json
{
  "success": true,
  "message": "愿由ъ옄 ??쒕낫???붿빟 議고쉶???깃났?덉뒿?덈떎.",
  "data": {
    "baseDateTime": "2026-06-22T09:00:00Z",
    "range": "TODAY",
    "kpis": [
      {
        "key": "TODAY_NEW_MEMBERS",
        "title": "?ㅻ뒛 ?좉퇋 媛?낆옄",
        "value": 128,
        "unit": "紐?,
        "deltaText": "?댁젣 ?鍮?+14紐?,
        "severity": "NORMAL",
        "targetPath": "/admin/members"
      }
    ],
    "alerts": [
      {
        "id": 1,
        "level": "URGENT",
        "domain": "REPORT",
        "title": "?좉퀬 泥섎━ ?湲?,
        "message": "寃뚯떆湲 ?좉퀬 3嫄?泥섎━ ?湲?以?,
        "targetPath": "/admin/reports",
        "createdAt": "2026-06-22T08:40:00Z"
      }
    ],
    "weeklySignups": [
      {
        "label": "??,
        "count": 70
      }
    ],
    "paymentRatio": [
      {
        "method": "CARD",
        "label": "移대뱶",
        "ratio": 62
      }
    ],
    "serviceCards": [
      {
        "key": "MEMBER",
        "title": "?뚯썝 愿由?,
        "description": "媛?낆옄, 援щ룆 ?곹깭, 沅뚰븳, ?뺤? ?뚯썝??愿由ы빀?덈떎.",
        "summaryText": "?좉퇋 128紐?,
        "targetPath": "/admin/members"
      }
    ],
    "systemStatus": [
      {
        "key": "AI_API",
        "label": "AI API",
        "status": "NORMAL",
        "valueText": "?뺤긽"
      }
    ],
    "recentActivities": [
      {
        "id": 1,
        "occurredAt": "2026-06-22T09:12:00Z",
        "adminId": "cs_admin",
        "message": "?섎텋 ?붿껌 1嫄??뺤씤",
        "targetPath": "/admin/payments"
      }
    ]
  }
}
```

#### Response Field Contract

##### `DashboardDTO.ResponseSummary`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `baseDateTime` | `string` | Y | 吏묎퀎 湲곗? ?쒓컖 |
| `range` | `TODAY \| 7D \| 30D` | Y | ?붿껌 Query Parameter |
| `kpis` | `DashboardDTO.Kpi[]` | Y | 愿由ъ옄 ?꾨찓??吏묎퀎 寃곌낵 |
| `alerts` | `DashboardDTO.Alert[]` | Y | 愿由ъ옄 ?꾨찓??寃쎄퀬/?湲???ぉ 吏묎퀎 寃곌낵 |
| `weeklySignups` | `DashboardDTO.WeeklySignup[]` | Y | 湲곌컙 ??媛??異붿씠 吏묎퀎 寃곌낵 |
| `paymentRatio` | `DashboardDTO.PaymentRatio[]` | Y | 寃곗젣 ?섎떒 鍮꾩쑉 吏묎퀎 寃곌낵 |
| `serviceCards` | `DashboardDTO.ServiceCard[]` | Y | 愿由ъ옄 湲곕뒫蹂??붿빟 吏묎퀎 寃곌낵 |
| `systemStatus` | `DashboardDTO.SystemStatus[]` | Y | AI/?ㅽ겕?섑븨/?댁쁺 ?곹깭 吏묎퀎 寃곌낵 |
| `recentActivities` | `DashboardDTO.RecentActivity[]` | Y | 理쒓렐 愿由ъ옄 ?쒕룞 吏묎퀎 寃곌낵 |

##### `DashboardDTO.Kpi`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `key` | `DashboardKpiKeyType` | Y | KPI ?앸퀎??怨꾩빟 |
| `title` | `string` | Y | ?붾㈃ ?쒖떆 ?띿뒪??|
| `value` | `number` | Y | 吏묎퀎 寃곌낵 |
| `unit` | `string` | N | ?붾㈃ ?쒖떆 ?⑥쐞 |
| `deltaText` | `string` | N | 鍮꾧탳 利앷컧 ?띿뒪??|
| `severity` | `DashboardSeverityType` | Y | ?곹깭 ?쒖떆 怨꾩빟 |
| `targetPath` | `string` | Y | 愿由ъ옄 ?쇱슦??寃쎈줈 |

##### `DashboardDTO.Alert`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `id` | `number` | Y | 寃쎄퀬 ??ぉ ?앸퀎??|
| `level` | `DashboardAlertLevelType` | Y | 寃쎄퀬 ?섏? 怨꾩빟 |
| `domain` | `DashboardDomainType` | Y | 愿由ъ옄 ?꾨찓???앸퀎??|
| `title` | `string` | Y | 寃쎄퀬 ?쒕ぉ |
| `message` | `string` | Y | 寃쎄퀬 ?ㅻ챸 |
| `targetPath` | `string` | Y | 愿由ъ옄 ?쇱슦??寃쎈줈 |
| `createdAt` | `string` | Y | 吏묎퀎 ??ぉ 湲곗? ?쒓컖 |

##### `DashboardDTO.WeeklySignup`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `label` | `string` | Y | 援ш컙 ?쇰꺼 |
| `count` | `number` | Y | 媛?낆옄 吏묎퀎 寃곌낵 |

##### `DashboardDTO.PaymentRatio`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `method` | `string` | Y | 寃곗젣 ?섎떒 ?앸퀎??|
| `label` | `string` | Y | 寃곗젣 ?섎떒 ?쒖떆紐?|
| `ratio` | `number` | Y | 寃곗젣 ?섎떒 鍮꾩쑉 |

##### `DashboardDTO.ServiceCard`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `key` | `string` | Y | ?쒕퉬??移대뱶 ?앸퀎??|
| `title` | `string` | Y | ?쒕퉬??移대뱶 ?쒕ぉ |
| `description` | `string` | Y | ?쒕퉬??移대뱶 ?ㅻ챸 |
| `summaryText` | `string` | Y | ?듭떖 ?붿빟 臾멸뎄 |
| `targetPath` | `string` | Y | 愿由ъ옄 ?쇱슦??寃쎈줈 |

##### `DashboardDTO.SystemStatus`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `key` | `string` | Y | ?쒖뒪???곹깭 ?앸퀎??|
| `label` | `string` | Y | ?쒖떆紐?|
| `status` | `DashboardSystemStatusType` | Y | ?곹깭 ?쒖떆 怨꾩빟 |
| `valueText` | `string` | Y | ?곹깭 ?ㅻ챸 |

##### `DashboardDTO.RecentActivity`

| Field | Type | Required | Entity 吏곸젒 留ㅽ븨 而щ읆 ?먮뒗 吏묎퀎 湲곗? |
|---|---|---|---|
| `id` | `number` | Y | ?쒕룞 ?앸퀎??|
| `occurredAt` | `string` | Y | ?쒕룞 諛쒖깮 ?쒓컖 |
| `adminId` | `string` | Y | ?쒕룞 ?섑뻾 愿由ъ옄 ?앸퀎??|
| `message` | `string` | Y | ?쒕룞 ?ㅻ챸 |
| `targetPath` | `string` | N | ?대룞 寃쎈줈 |

#### Response Rules

- `kpis`??v1 湲곗? `TODAY_NEW_MEMBERS`, `REALTIME_ACTIVE_USERS`, `AI_INTERVIEW_SESSIONS`, `TODAY_REVENUE` 4媛쒕? 諛섑솚?쒕떎.
- `paymentRatio.ratio` ?⑷퀎??100?댁뼱???쒕떎.
- `targetPath`??愿由ъ옄 ?붾㈃ ?쇱슦??媛?ν븳 path?ъ빞 ?쒕떎.
- ?곗씠?곌? ?녿뒗 ?뱀뀡? `null` ???鍮?諛곗뿴??諛섑솚?쒕떎.
- 吏묎퀎 湲곗? ?쒓컖? `baseDateTime`?쇰줈 紐낆떆?쒕떎.

#### Error Response

> `dashboard` ?꾨찓???꾩슜 ErrorCode???녿떎.
> ?꾨옒 怨듯넻 ErrorCode留??ъ슜?쒕떎.

| ErrorCode | Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | 愿由ъ옄 ?몄쬆???녿뒗 ?붿껌?대떎. |
| `FORBIDDEN` | 403 | `MASTER`, `BACKEND`, `CS` ??沅뚰븳???묎렐?덈떎. |
| `BAD_REQUEST` | 400 | `range`가 `TODAY`, `7D`, `30D` 외 값이다. |
| `INTERNAL_SERVER_ERROR` | 500 | ??쒕낫???붿빟 吏묎퀎 以??쒕쾭 ?대? ?ㅻ쪟媛 諛쒖깮?덈떎. |

#### Error Response Example

```json
{
  "success": false,
  "statusCode": 400,
  "message": "?좏슚?섏? ?딆? Query Parameter ?낅땲??",
  "code": "BAD_REQUEST",
  "data": null
}
```

---

## 5. ?꾨찓???묐떟 洹쒖튃

- 蹂?endpoint???섏씠吏?ㅼ씠???묐떟???꾨땲誘濡?`content`, `page`, `size`, `totalElements`, `totalPages`瑜??ъ슜?섏? ?딅뒗??
- 蹂?endpoint???⑥씪 ??쒕낫???묐떟留?諛섑솚?쒕떎.
- `range` 湲곕낯媛믪? `TODAY`??
- `range=7D`??理쒓렐 7?? `range=30D`??理쒓렐 30??吏묎퀎 ?덈룄?곕? ?섎??쒕떎.
- 吏묎퀎 湲곗?? UTC ??κ컪???ъ슜?섎릺, ?묐떟 臾몄옄?댁? ISO 8601 ?뺤떇???좎??쒕떎.

---

## 6. ?곌? ?뷀떚??
| ?뷀떚??| 二쇱슂 而щ읆 | ?⑸룄 |
|---|---|---|
| `admins` | `admin_id`, `created_at`, `last_login_at`, `status`, `admin_role` | 愿由ъ옄 KPI, 理쒓렐 愿由ъ옄 ?쒕룞 吏묎퀎 |
| `audit_logs` | `audit_log_id`, `admin_id`, `log_type`, `severity`, `created_at` | 理쒓렐 愿由ъ옄 ?쒕룞, ?댁쁺 ?뚮┝ 吏묎퀎 |
| `ai_usage_logs` | `ai_usage_log_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`, `created_at` | AI ?ъ슜??KPI 諛??쒖뒪???곹깭 吏묎퀎 |
| `ai_ops_settings` | `monthly_budget`, `alert_enabled`, `alert_threshold`, `rate_limit_enabled`, `updated_at` | AI ?댁쁺 ?곹깭 吏묎퀎 |
| `rag_documents` | `rag_document_id`, `status`, `indexing_progress`, `created_at`, `updated_at` | AI ?댁쁺 ?곹깭 諛?寃쎄퀬 吏묎퀎 |
| `scraping_pipelines` | `scraping_pipeline_id`, `source_name`, `pipeline_status`, `last_started_at`, `last_success_at`, `last_failed_at` | ?ㅽ겕?섑븨 ?곹깭 吏묎퀎 |
| `scraping_logs` | `scraping_log_id`, `scraping_pipeline_id`, `scraping_status`, `executed_at`, `error_message` | ?ㅽ겕?섑븨 寃쎄퀬 諛?理쒓렐 ?쒕룞 吏묎퀎 |
