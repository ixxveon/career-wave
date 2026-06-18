# 用户认证后端 Spec 中文自检清单

> 本文件是本地自检用，不是正式提交给组员看的 spec。
> 用途：写 `会员加入 / 登录 / 找回账号 / 找回密码` 后端 spec 前后，对照确认没有违反组内 convention、已完成 JWT 规则、前端 API 契约。

---

## 0. 这次要写哪些正式文件

- [ ] 正式 spec 文件建议放在 `specs/backend/user/auth/`。

```text
specs/backend/user/auth/
├── spec.md
├── plan.md
├── tasks.md
├── api-schema.md
└── checklist.md
```

- [ ] 不要和 `specs/backend/auth/` 混在一起。
  - `specs/backend/auth/`：JWT 公共认证、refresh、logout、blacklist、admin auth
  - `specs/backend/user/auth/`：用户侧会员加入、登录、找回账号、找回密码
- [ ] 写之前先对照：
  - `docs/CONVENTION.md`
  - `specs/backend/auth/*`
  - `specs/frontend/user/member/*`
  - `frontend/src/api/user/member/*`
  - `frontend/src/types/user/member.ts`
- [ ] 前端 mock 只是临时假后端，不能当最终 API 契约。

---

## 1. 组内 Spec Driven Development 规则

- [ ] 项目优先级是：Spec 文档 > Convention 文档 > 既有代码模式 > 新实现。
- [ ] 如果 spec 和 convention 冲突，要先修改文档或在 PR 里说明原因，不能悄悄实现不同逻辑。
- [ ] 不要凭空写不存在的 class、package、API。
- [ ] 如果需要和既有代码不同的结构，要在 `plan.md` 写清楚理由。
- [ ] 如果需要新增依赖、第三方库、外部服务，要写明需要组内确认。

---

## 2. 后端包结构检查

- [ ] 用户认证代码实际位置要和既有代码对齐。
  - 现在已有用户登录相关代码在 `backend/src/main/java/kr/co/carrer/user/member/`
  - 新 spec 目录可以叫 `specs/backend/user/auth/`
- [ ] 如果正式实现继续放在 `user/member`，spec 里要说明：文档名是 user auth，但实现复用 user/member domain。
- [ ] 包结构要符合 convention：

```text
backend/src/main/java/kr/co/carrer/user/{domain}/
├── entity
├── repository
├── type
├── exception
├── service
├── service/impl
├── controller
├── dto
└── docs
```

- [ ] `global` 不能直接依赖 `user` 或 `admin` 具体 domain。
- [ ] `user` 和 `admin` 不能互相直接 import。
- [ ] 公共 JWT / Security 逻辑优先复用已有 `auth` 包。
- [ ] Controller 不写业务逻辑，只委托给 Service。
- [ ] Service 要有接口和实现类：

```text
UserAuthService
UserAuthServiceImpl
```

- [ ] Controller 注入 Service 接口，不注入 Impl。

---

## 3. Phase 写法检查

这次你喜欢的是按层开发，所以 `plan.md` 建议这样写：

```text
Phase 1: Entity / Enum / DB 结构整理
Phase 2: Repository 实现
Phase 3: DTO / Validation 实现
Phase 4: Service 实现
Phase 5: Controller / API 实现
Phase 6: Swagger 文档化
Phase 7: Test / 异常场景验证
```

- [ ] `tasks.md` 要和 `plan.md` 的 Phase 一一对应。
- [ ] 每个 task 要具体到可以作为 commit 或 PR review 单位。
- [ ] 不要只写“实现会员加入”，要写清楚 DTO、Repository 方法、ErrorCode、测试内容。
- [ ] 每个 Phase 都要考虑正常场景和异常场景。

---

## 4. 必须对齐的前端 API

### 4.1 前端代码基准

- [ ] 登录相关：`frontend/src/api/user/member/authApi.ts`
- [ ] 会员加入相关：`frontend/src/api/user/member/registerApi.ts`
- [ ] 找回账号/密码相关：`frontend/src/api/user/member/recoveryApi.ts`
- [ ] 认证码相关：`frontend/src/api/user/member/verificationApi.ts`
- [ ] 社交注册补充信息：`frontend/src/api/user/member/socialRegisterApi.ts`
- [ ] 类型定义：`frontend/src/types/user/member.ts`

### 4.2 后端 spec 里至少要覆盖的 endpoint

- [ ] 登录、刷新、登出、我的状态：

```text
POST /api/v1/user/members/login
POST /api/v1/user/members/token/refresh
POST /api/v1/user/members/logout
GET  /api/v1/user/members/me/status
```

- [ ] 会员加入：

```text
GET  /api/v1/user/members/login-id/check?loginId={loginId}
POST /api/v1/user/members/verifications/send
POST /api/v1/user/members/verifications/confirm
POST /api/v1/user/members/register/user
POST /api/v1/user/members/register/company
POST /api/v1/user/members/company/employment-certificate
GET  /api/v1/user/members/oauth/{provider}/authorize
GET  /api/v1/user/members/oauth/{provider}/callback
POST /api/v1/user/members/register/social/complete
```

- [ ] 找回账号 / 找回密码：

```text
POST /api/v1/user/members/recovery/find-id
POST /api/v1/user/members/recovery/password-token
POST /api/v1/user/members/recovery/reset-password
```

- [ ] 如果某个 endpoint 暂时不实现，要写清楚是 v1 范围外、后续 Phase、还是暂时保留 mock。

---

## 5. 前端 Mock 注意事项

- [ ] `frontend/src/mocks/user/memberHandlers.ts` 现在主要 mock 了：
  - login
  - token refresh
  - logout
  - me/status
- [ ] 会员加入、认证码、找回账号、找回密码的最终契约不能只看 mock，要看前端 API 文件和 `types/user/member.ts`。
- [ ] mock 里的 `mock-session` cookie 不是实际后端 cookie 名称。
- [ ] 实际 refresh cookie 应该按后端 JWT 规则使用 `refreshToken`。
- [ ] 后端实现完成后，要检查 MSW mock 返回结构是否需要更新。
- [ ] mock 返回的字段如果和真实后端不同，要以前端 type 和后端 spec 为准。

---

## 6. JWT / Session / Token 规则

这部分非常重要，因为前端旧 spec 里有些内容和现在后端 JWT 规则不一致。

- [ ] access token 通过 response body 的 `data.accessToken` 返回。
- [ ] access token 只保存在前端 memory `authSession`。
- [ ] access token 不放 `localStorage`。
- [ ] refresh token 只通过 HttpOnly Cookie 传递。
- [ ] refresh token 不放 response body。
- [ ] token refresh 请求 body 不接收 `refreshToken`。
- [ ] token refresh 使用 cookie 自动传递，也就是前端 `credentials: include`。
- [ ] token refresh response 只返回新的 access token：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "토큰이 갱신되었습니다.",
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

- [ ] 前端旧 spec 中如果写了 refresh body fallback，要在新的后端 spec 里修正。
- [ ] 前端旧 spec 中如果写了 refresh response 包含 `refreshToken`，也要修正。
- [ ] refresh token 在 Redis 中不能原文保存，要保存 hash。
- [ ] refresh token rotation 时旧 token 立即失效。
- [ ] logout 时要考虑：
  - 删除 Redis refresh key
  - access token jti 加入 blacklist
  - 清除 refresh cookie
- [ ] 认证用户信息不能在 Controller 里自己 parse token，要用 SecurityContext 或 `@AuthenticationPrincipal`。
- [ ] JWT 真伪验证和账号状态验证要分清楚。

---

## 7. Public / Protected API 分类

- [ ] 以下 API 一般是 public / permitAll：

```text
POST /login
POST /token/refresh
GET  /login-id/check
POST /verifications/send
POST /verifications/confirm
POST /register/user
POST /register/company
POST /company/employment-certificate
POST /recovery/find-id
POST /recovery/password-token
POST /recovery/reset-password
POST /register/social/complete
```

- [ ] 以下 API 是认证后使用：

```text
POST /logout
GET  /me/status
```

- [ ] spec 的 public API 列表要和 SecurityConfig 的 permitAll 列表一致。
- [ ] `me/status` 是否允许受限制账号访问，要和既有 auth 规则一致。
- [ ] 被限制的账号也要可以 logout，这点不要破坏。

---

## 8. DTO / 字段契约检查

### 8.1 DTO 规则

- [ ] DTO 原则上用 `{Domain}DTO` 一个文件管理，Request / Response 用 inner class。
- [ ] 如果沿用现有 `UserLoginDto` 这种功能 DTO，要在 spec 里说明分离理由。
- [ ] Entity 不能直接作为 API response。
- [ ] DTO 字段要加 Swagger `@Schema` 说明。
- [ ] Enum 字段要在 Swagger 里写 allowable values。

### 8.2 登录字段

- [ ] Login request 要和前端一致：

```json
{
  "loginId": "career_user01",
  "password": "Password123!",
  "roleType": "USER"
}
```

- [ ] `roleType` 必填，只允许 `USER` / `COMPANY`。
- [ ] Login response 要有：

```json
{
  "accessToken": "jwt-access-token",
  "member": {
    "memberId": "uuid-v4",
    "loginId": "career_user01",
    "name": "홍길동",
    "roleType": "USER",
    "memberStatus": "ACTIVE",
    "companyApprovalStatus": "NONE",
    "lastLoginAt": "2026-05-31T12:30:00Z"
  }
}
```

- [ ] 现在后端 `UserLoginDto.MemberInfo` 可能有 `subscriptionStatus`，前端 `MemberSummary` 当前没有这个字段。要决定：
  - 后端继续返回但前端忽略
  - 或前端 type 补 optional
  - 或后端 response 从 spec 中移除该字段

### 8.3 个人会员加入字段

- [ ] Request 要包含：

```text
loginId
password
name
email
phone
emailVerificationToken
phoneVerificationToken
terms.service
terms.privacy
terms.marketing
```

- [ ] 前端表单有 `age` 同意，但 API request 里没有。后端是否需要保存/验证 age，要在 spec 里明确。
- [ ] Response 要包含：

```text
memberId
roleType = USER
memberStatus = ACTIVE
```

### 8.4 企业会员加入字段

- [ ] Request 要包含：

```text
loginId
password
managerName
managerEmail
managerPhone
companyName
businessNumber
ceoName
certificateNumber
address
postalCode
roadAddress
jibunAddress
addressDetail
companyType
isAgency
managerPhoneVerificationToken
managerEmailVerificationToken
employmentCertificateFileId
terms.service
terms.privacy
terms.companyVerification
terms.sms
terms.marketing
```

- [ ] `companyType` 要和前端 enum 一致：

```text
ENTERPRISE
SUBSIDIARY
SME
MID_MARKET
VENTURE
FOREIGN_INVESTED
FOREIGN_CORPORATION
PUBLIC
NON_PROFIT
FOREIGN_NON_PROFIT
```

- [ ] 企业会员 가입成功后：
  - `roleType = COMPANY`
  - `memberStatus = ACTIVE`
  - `companyApprovalStatus = PENDING_REVIEW`
- [ ] 企业会员 가입成功只是“申请已提交”，不能发 access token / refresh token。
- [ ] 企业会员在 admin 审核通过前不能登录；后端要在 token 发放前用 403 拦截。
- [ ] 审核通过/驳回后的通知邮件由 admin 审核 service 触发，user auth 负责保存申请邮箱和申请状态。

### 8.5 认证码字段

- [ ] Send request：

```text
channel
target
purpose
```

- [ ] Send response：

```text
verificationId
expiresAt
resendAvailableAt
remainingAttempts
```

- [ ] Confirm request：

```text
verificationId
code
```

- [ ] Confirm response：

```text
verificationToken
verifiedAt
```

- [ ] `channel` 只允许 `EMAIL`, `PHONE`。
- [ ] `purpose` 只允许 `REGISTER`, `FIND_ID`, `RESET_PASSWORD`。
- [ ] 认证码为 6 位数字。
- [ ] 后端只信任服务器发的 `verificationToken`，不能信任前端 boolean。

### 8.6 找回账号 / 找回密码字段

- [ ] 个人找回账号 request：

```text
roleType = USER
verificationToken
```

- [ ] 企业找回账号 request：

```text
roleType = COMPANY
managerName
businessNumber
verificationToken
```

- [ ] 找回账号 response：

```text
maskedLoginIds
found
```

- [ ] 个人密码 reset token request：

```text
roleType = USER
loginId
verificationToken
```

- [ ] 企业密码 reset token request：

```text
roleType = COMPANY
loginId
managerName
businessNumber
verificationToken
```

- [ ] Password token response：

```text
resetToken
expiresAt
```

- [ ] Reset password request：

```text
resetToken
newPassword
```

- [ ] Reset password response：

```text
changedAt
```

---

## 9. Validation 规则

- [ ] loginId：英文字母和数字，6~20 位。

```text
^[A-Za-z0-9]{6,20}$
```

- [ ] email 要服务器验证格式。
- [ ] phone 要标准化为只含数字，且是 `010` 开头 11 位。
- [ ] businessNumber 要标准化为 10 位数字。
- [ ] companyName、ceoName、certificateNumber 要作为企业认证必填字段。
- [ ] businessNumber、companyName、ceoName、certificateNumber 要通过外部事业者验证 API adapter 检查。
- [ ] 地址搜索这次就要做：前端按钮启用，并接韩国道路名地址 API 或同等 API。
- [ ] 企业加入 request 要包含 `postalCode`, `roadAddress`, `jibunAddress`。
- [ ] verification code 是 6 位数字。
- [ ] password 规则要和前端一致：

```text
8~64 位
包含英文
包含数字
包含特殊字符
不能包含 loginId
```

- [ ] passwordConfirm 不一定传给后端，但后端仍要验证 password 本身。
- [ ] 必选条款同意要服务器检查。
- [ ] 选择条款要明确保存方式和默认值，未传时按 `false` 保存。
- [ ] 약관 동의值要保存到 `member_terms_agreements`。
- [ ] 即使前端已经做过 loginId 중복 확인，最终 가입时后端也要重新检查重复。
- [ ] 前端 validation 只是 UX，后端 validation 才是权威。

---

## 10. 安全 / 隐私规则

- [ ] 密码必须 BCrypt hash 保存。
- [ ] 禁止明文密码比较。
- [ ] 密码、认证码、resetToken、verificationToken 不写日志。
- [ ] 登录失败消息不能暴露账号是否存在。
- [ ] 找回账号失败也不能直接暴露账号是否存在。
- [ ] 发放 password reset token 失败也不能直接暴露账号是否存在。
- [ ] 找回账号结果只返回 masked loginId。
- [ ] `found=false` 时 message 也保持通用，比如 `요청이 처리되었습니다.`
- [ ] resetToken 要短期有效、一次性使用。
- [ ] resetToken 最好 hash 保存，不保存原文。
- [ ] verificationToken 要绑定：
  - purpose
  - target
  - channel
  - expiresAt
  - used 여부
- [ ] verificationToken 或 resetToken 使用后不能重复使用。
- [ ] 以下 API 要考虑 rate limit：

```text
POST /verifications/send
POST /verifications/confirm
POST /login
POST /recovery/password-token
POST /recovery/reset-password
```

- [ ] 登录失败 5 次锁定规则要和已有 JWT/auth 实现一致。
- [ ] `SUSPENDED`, `BANNED`, `WITHDRAWN`, `LOCKED` 的登录/refresh 处理要和 `specs/backend/auth/constitution.md` 一致。

---

## 11. ApiResponse / ErrorCode 规则

- [ ] 所有 API 使用 `ApiResponse<T>`。
- [ ] 成功响应字段统一：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

- [ ] 失败响应也要统一格式。
- [ ] Controller 不直接返回 `Map`。
- [ ] Controller 不写重复 try-catch。
- [ ] 业务异常用 `CustomException + UserAuthErrorCode`。
- [ ] 禁止 `new RuntimeException(...)`。
- [ ] domain error code 位置建议沿用：

```text
backend/src/main/java/kr/co/carrer/user/member/exception/UserAuthErrorCode.java
```

- [ ] `api-schema.md` 要列 ErrorCode 和 HTTP status 映射。
- [ ] ErrorCode 候选：

```text
LOGIN_ID_ALREADY_EXISTS        409
EMAIL_ALREADY_EXISTS           409
PHONE_ALREADY_EXISTS           409
BUSINESS_NUMBER_ALREADY_EXISTS 409
INVALID_VERIFICATION_CODE      400
VERIFICATION_EXPIRED           400
VERIFICATION_RATE_LIMITED      429
VERIFICATION_TOKEN_INVALID     400
REGISTER_TERMS_REQUIRED        400
AUTH_INVALID_CREDENTIALS       401
AUTH_ACCOUNT_LOCKED            423
PASSWORD_RESET_TOKEN_INVALID   400
PASSWORD_RESET_TOKEN_EXPIRED   400
PASSWORD_POLICY_VIOLATION      400
EMPLOYMENT_FILE_INVALID        400
EMPLOYMENT_FILE_TOO_LARGE      413
EMPLOYMENT_FILE_UNSUPPORTED    415
```

---

## 12. DB / Entity 规则

- [ ] 表名：小写 snake_case 复数。
- [ ] 字段名：snake_case。
- [ ] Java entity 字段：camelCase。
- [ ] PK 字段：
  - Java: `{domain}Id`
  - DB: `{domain}_id`
- [ ] member 的 PK 要和已有 auth 规则一致，当前是 UUID。
- [ ] 对外暴露的 ID 优先考虑 UUID。
- [ ] Entity 使用 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`。
- [ ] Entity 不随便开放 setter。
- [ ] 状态变化用有意义的方法或 Service 管理。
- [ ] Enum 必须 `@Enumerated(EnumType.STRING)`。
- [ ] Enum 放 `type/` 包，不放 DTO。
- [ ] refresh token 不建 DB 表，已有规则是 Redis。
- [ ] password reset token 是否使用 `password_reset_tokens` 表，要在 spec 写清楚。
- [ ] verification code/token 放 DB 还是 Redis，要在 spec 写清楚。
- [ ] Redis key 要写 TTL、prefix、是否 hash 保存。
- [ ] unique 约束候选：

```text
members.login_id
members.email
members.phone
company_profiles.business_number
```

---

## 13. 企业 재직证明文件上传

- [ ] 上传 API 是 `multipart/form-data`。
- [ ] 流程是：先上传 PDF，拿到 `employmentCertificateFileId`，再提交企业 가입。
- [ ] 只允许 PDF。
- [ ] 文件最大 5MB。
- [ ] 服务器也要检查 MIME type 和扩展名，不能只信前端。
- [ ] 文件存储方式要写清楚：local / S3 / 临时存储。
- [ ] 文件上传成功但企业 가입失败时，孤儿文件如何处理要写清楚。
- [ ] 企业 가입时要验证 `employmentCertificateFileId` 是否真实存在、是否未使用、是否属于当前申请流程。

---

## 14. Swagger 文档规则

- [ ] Swagger annotation 尽量放在 `docs` 接口，不直接堆在 Controller。
- [ ] 可以考虑：

```text
UserAuthControllerDocs.java
UserRegisterControllerDocs.java
UserRecoveryControllerDocs.java
UserVerificationControllerDocs.java
```

- [ ] Swagger 的 request / response 示例要和 `api-schema.md` 一致。
- [ ] Swagger 也要写 error response 示例。
- [ ] Enum 字段要写 allowable values。
- [ ] `api-schema.md` 和 Swagger 不一致时，要在 checklist 里检查出来。

---

## 15. 测试计划检查

- [ ] 登录测试：
  - 正常登录
  - roleType 不一致
  - 密码错误
  - 不存在的 loginId
  - 锁定账号
  - 停用/退出账号
  - refresh cookie 不存在
  - logout
- [ ] 会员加入测试：
  - 个人会员正常 가입
  - 企业会员正常 가입
  - 企业会员 가입后不发 token
  - 企业会员 승인 대기 登录 403
  - 企业会员 승인 완료 后登录成功
  - OAuth state 不一致失败
  - 既有社交账号登录成功
  - 首次社交账号 callback 发放 socialSignupToken
  - 社交 추가정보 완료 成功/失败
  - loginId 重复
  - email 重复
  - phone 重复
  - businessNumber 重复
  - verificationToken 不存在
  - verificationToken 过期
  - 必选条款未同意
  - 密码政策不满足
- [ ] 认证码测试：
  - 发送成功
  - 确认成功
  - code 错误
  - code 过期
  - 重发限制
  - 尝试次数超限
  - purpose 不一致
  - target 不一致
- [ ] 找回账号/密码测试：
  - 个人找回账号成功
  - 企业找回账号成功
  - 找不到账号时 `found=false`
  - loginId masking 正确
  - password resetToken 发放成功
  - resetToken 过期
  - resetToken 重复使用被拒绝
  - 密码重设成功
  - 新密码不满足政策
- [ ] 文件上传测试：
  - PDF 上传成功
  - 非 PDF 被拒绝
  - MIME 不一致被拒绝
  - 超过 5MB 被拒绝
  - 没有 fileId 的企业 가입被拒绝
- [ ] 最后要有前后端实际联动验证。

---

## 16. 前端联动最终检查

- [ ] `memberApiClient` 会取 response 的 `payload.data`，所以后端 response 必须有 `data`。
- [ ] 如果某 API 没有 data，也要确认前端能处理。
- [ ] 登录成功 response 必须包含 `accessToken`，让前端执行：

```ts
authSession.setTokens({ accessToken })
```

- [ ] 登录成功 response 必须包含 `member`，让前端执行：

```ts
authSession.setMember(member)
```

- [ ] `member` 里要有前端路由判断需要的字段：

```text
roleType
memberStatus
companyApprovalStatus
```

- [ ] `memberStatus` 要和前端 enum 一致：

```text
ACTIVE
SUSPENDED
BANNED
LOCKED
WITHDRAWN
BLACKLISTED
```

- [ ] `companyApprovalStatus` 要和前端 enum 一致：

```text
NONE
PENDING_REVIEW
APPROVED
REJECTED
NEEDS_REVISION
```

- [ ] 401 响应要让前端可以触发 refresh 或跳转 login。
- [ ] POST / PUT / PATCH / DELETE 默认不会被前端自动重试，所以后端不要依赖自动重试。
- [ ] 如果某个状态变更 API 允许重试，要写 idempotency 规则。

---

## 17. 每个正式文件必须包含什么

### spec.md

- [ ] 功能范围
- [ ] 非范围 / v1 不做的内容
- [ ] User Story
- [ ] Acceptance Scenario
- [ ] Functional Requirements
- [ ] Key Entities
- [ ] Security / Privacy 要求
- [ ] Edge Cases
- [ ] Success Criteria
- [ ] Assumptions

### plan.md

- [ ] Summary
- [ ] Technical Context
- [ ] Project Structure
- [ ] Entity / Repository / DTO / Service / Controller / Swagger / Test Phase
- [ ] JWT、Redis、verification、password reset token 设计决定
- [ ] 前端 mock 替换和联动计划

### tasks.md

- [ ] 和 `plan.md` Phase 一一对应
- [ ] task 是具体实现单位
- [ ] DTO、Repository method、ErrorCode、Test task 不遗漏
- [ ] Swagger docs task 包含进去
- [ ] frontend integration 检查 task 包含进去

### api-schema.md

- [ ] 公共 response 格式
- [ ] Auth / Cookie / JWT 政策
- [ ] Enum 契约
- [ ] 每个 endpoint 的 request / response / error
- [ ] ErrorCode 和 HTTP status 映射
- [ ] 前端 type 映射
- [ ] mock 注意事项

### checklist.md

- [ ] 实现完成后自检项
- [ ] convention 遵守项
- [ ] JWT/token 政策遵守项
- [ ] frontend contract 遵守项
- [ ] test 完成项
- [ ] Swagger/docs 一致性检查项

---

## 18. 最终自问

- [ ] 只看这个 spec，后端实现者能不能写出 endpoint、DTO、ErrorCode？
- [ ] 只看这个 spec，前端能不能把 mock 换成真实 API？
- [ ] 有没有和已完成 JWT auth constitution 冲突？
- [ ] 有没有还写着 refresh token 通过 body 传？
- [ ] 有没有还写着 refresh token 在 response body 返回？
- [ ] 有没有还写着 access token 存 localStorage？
- [ ] 登录/找回/重设密码失败时，有没有暴露账号是否存在？
- [ ] 有没有只信任前端 validation？
- [ ] 有没有要求 Controller 自己 parse token？
- [ ] Swagger docs 分离原则有没有写？
- [ ] 所有 API 是否都使用 `ApiResponse<T>`？
- [ ] 有没有 `admin` 和 `user` 直接互相引用？
- [ ] DB 表名、字段名、Enum 是否符合 convention？
- [ ] 测试计划是否包含正常、失败、安全、前后端联动场景？

---

## 19. ERD / 前端 / Spec 不一致修正决策 Checklist

> 用途：后续修改 `specs/backend/user/auth/*` 后，用这一节逐项自检是否已经按本次讨论的方向收口。

### 19.1 roleType 存储值统一

- [ ] ERD、Backend enum、API、Frontend enum 都统一使用 `USER` / `COMPANY`。
- [ ] DB `members.role_type` 不再使用 `ROLE_USER` / `ROLE_COMPANY` 作为业务存储值。
- [ ] Spring Security 需要 authority 时，只在 security layer 转换成 `ROLE_USER` / `ROLE_COMPANY`。
- [ ] 现有 Java enum、QueryRepository、DTO mapping 都要同步这个规则。
- [ ] spec 里明确区分：
  - `roleType`: 业务会员类型
  - `GrantedAuthority`: Spring Security 权限表达

### 19.2 memberStatus 补齐 BLACKLISTED

- [ ] ERD `members.member_status` CHECK 加入 `BLACKLISTED`。
- [ ] Backend enum、API enum、Frontend enum 的 `MemberStatus` 完全一致。
- [ ] spec 里说明 `BANNED` 和 `BLACKLISTED` 的语义差异。
- [ ] 登录/refresh/me/status 对 `BLACKLISTED` 的限制规则写清楚。

### 19.3 companyApprovalStatus 最终方案

- [ ] 不在 `company_profiles` 新增 `companyApprovalStatus` 字段。
- [ ] 企业审批状态的权威来源是 `hr_managers.hr_status`。
- [ ] ERD `hr_managers.hr_status` 改成和 API 语义对齐的值：

```text
PENDING_REVIEW
APPROVED
REJECTED
NEEDS_REVISION
REMOVED
```

- [ ] API `companyApprovalStatus` 直接由 `hr_managers.hr_status` 转换/返回。
- [ ] `companyApprovalStatus = NONE` 不是 DB 值，只是 API response 用的虚拟值。
- [ ] `roleType=USER` 的会员没有 `hr_managers` row，API response 固定返回 `companyApprovalStatus=NONE`。
- [ ] `roleType=COMPANY` 的会员使用 `hr_managers.hr_status` 作为 `companyApprovalStatus`。
- [ ] 现有 `UserMemberStatusQueryRepository` 的 `hr_status` mapping 要同步新值。
- [ ] 企业会员只有 `APPROVED` 状态可以登录并获得 token。
- [ ] `PENDING_REVIEW`, `REJECTED`, `NEEDS_REVISION`, `REMOVED` 登录时都必须 403，且不发 access token / refresh token。
- [ ] `REJECTED` 和 `NEEDS_REVISION` 的原因使用 `hr_managers.reject_reason` 或等价字段保存。
- [ ] `REMOVED` 用于“已批准后 HR 连接被移除”，不要用它表示 가입 신청 반려。

### 19.4 담당자 정보位置

- [ ] 以 ERD 为准：企业资料放 `company_profiles`。
- [ ] HR/담당자 连接、权限、审批状态放 `hr_managers`。
- [ ] 담당자姓名/邮箱/手机号使用 `members.name/email/phone`。
- [ ] 企业会员注册成功时同时创建：

```text
members
company_profiles
hr_managers
member_terms_agreements
```

- [ ] spec 的 Key Entities 不把 `managerName`, `managerEmail`, `managerPhone` 写成 `company_profiles` 字段。

### 19.5 재직증명서 文件流程

- [ ] 不新增 `UploadedEmploymentCertificate` DB entity。
- [ ] 文件上传可以返回临时 `employmentCertificateFileId` / S3 key。
- [ ] 企业 가입成功时最终保存到：

```text
company_profiles.cert_file_url
company_profiles.cert_file_name
company_profiles.certificate_number
```

- [ ] 企业 가입失败或临时 fileId 未使用时，要写 orphan file 清理策略。

### 19.6 member_verifications 存储

- [ ] 认证码/verificationToken 存储方式确定为 DB。
- [ ] 使用 ERD 已有 `member_verifications`。
- [ ] spec 里不能再出现“DB 或 Redis 待定”的说法。
- [ ] 认证码原文不保存，只保存 hash。

### 19.7 password_reset_tokens 存储

- [ ] password reset token 存储方式确定为 DB。
- [ ] 使用 ERD 已有 `password_reset_tokens`。
- [ ] 不改现有 JWT/auth 的 refresh token Redis 设计。
- [ ] spec 里说明：
  - refresh token: Redis
  - password reset token: DB
- [ ] reset token 原文不保存，只保存 hash。
- [ ] reset token 使用后写入 `used_at`，保证 1 次使用。

### 19.8 약관 동의

- [ ] 以 ERD `member_terms_agreements` 为准。
- [ ] 个人会员必选：

```text
service_agreed = true
privacy_agreed = true
```

- [ ] 企业会员必选：

```text
service_agreed = true
privacy_agreed = true
company_verification_agreed = true
sms_agreed = true
```

- [ ] 选择项：

```text
marketing_agreed default false
```

- [ ] 未传 marketing 时按 `false` 保存。
- [ ] 个人会员不使用企业专用 약관字段，保存为：

```text
company_verification_agreed = null
sms_agreed = null
```

- [ ] 企业会员必须保存：

```text
company_verification_agreed = true
sms_agreed = true
```

### 19.9 members 누락字段

- [ ] spec 的 Member entity 补充 `suspendEndDate`。
- [ ] spec 的 Member entity 补充 `warningCount`。
- [ ] spec 的 Member entity 补充 `subscriptionStatus`。
- [ ] `members.phone` 最终确定为 unique，允许 DB null。
- [ ] 注册/社交追加信息提交时，如果 request 里需要 phone，就必须做 phone 认证和重复检查。
- [ ] 가입默认值写清楚：

```text
warningCount = 0
subscriptionStatus = FREE
suspendEndDate = null
```

- [ ] 登录限制规则考虑 `SUSPENDED + suspendEndDate`。
- [ ] `subscriptionStatus` 是否进入 LoginResponse / me/status response 要和前端类型确认后写清楚。

### 19.10 personal_profiles

- [ ] 个人会员注册成功时创建空 `personal_profiles` row。
- [ ] 默认值写清楚：

```text
target_job = null
github_url = null
profile_image_url = null
```

- [ ] 如果后续实现选择延迟创建，spec 必须明确说明；当前推荐方案是注册时创建。

### 19.11 social_accounts

- [ ] ERD 已新增 `social_accounts`，spec/api-schema/tasks 要全部引用这张表。
- [ ] 表结构至少包含：

```text
social_account_id
member_id
provider
provider_user_id
provider_email
linked_at
created_at
updated_at
```

- [ ] unique 约束写清楚：

```text
UNIQUE(provider, provider_user_id)
UNIQUE(member_id, provider)
```

- [ ] `provider_email` nullable，因为 provider 不一定返回 email。
- [ ] 기존 social 계정登录、首次 social 가입、socialSignupToken 的流程都要和这张表连接起来。
- [ ] `socialSignupToken` 保存位置最终确定为 Redis。
- [ ] Redis key 使用：

```text
user-auth:social-signup:{tokenHash}
```

- [ ] raw socialSignupToken 不保存，只保存 hash。
- [ ] TTL 明确为 10 分钟。
- [ ] `/register/social/complete` 成功后删除 Redis key，保证 1 次使用。
- [ ] token 过期、伪造、已使用时返回 `SOCIAL_SIGNUP_TOKEN_INVALID`。
