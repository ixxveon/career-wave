import React from "react";

const effectiveDate = "2026년 6월 29일";

function PrivacyPage(): React.ReactElement {
  return (
    <div className="cw-page">
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "72px 24px",
          lineHeight: 1.75,
        }}
      >
        <h1>개인정보처리방침</h1>

        <p>
          Career Wave는 이용자의 개인정보를 안전하게 보호하고, 개인정보 처리
          현황을 투명하게 안내하기 위해 본 개인정보처리방침을 공개합니다.
        </p>

        <h2>1. 개인정보 처리 목적</h2>
        <p>
          Career Wave는 회원 관리, 본인 확인, AI 서류 분석, AI 면접 코칭, 맞춤
          채용공고 추천, 기업 인증, 결제 처리, 고객 문의 응대 및 서비스 개선을
          위해 개인정보를 처리합니다.
        </p>

        <h2>2. 처리하는 개인정보 항목</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>구분</th>
              <th style={cellStyle}>처리 항목</th>
              <th style={cellStyle}>처리 목적</th>
              <th style={cellStyle}>보유 및 이용 기간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellStyle}>회원가입 및 로그인</td>
              <td style={cellStyle}>
                이름, 이메일, 휴대전화번호, 로그인 ID, 비밀번호, 회원 유형,
                가입일
              </td>
              <td style={cellStyle}>회원 식별, 로그인, 계정 관리, 본인 확인</td>
              <td style={cellStyle}>회원 탈퇴 시까지</td>
            </tr>
            <tr>
              <td style={cellStyle}>소셜 로그인</td>
              <td style={cellStyle}>
                OAuth 제공자로부터 전달받는 식별자, 이메일, 프로필 정보
              </td>
              <td style={cellStyle}>간편 로그인, 계정 연동</td>
              <td style={cellStyle}>연동 해제 또는 회원 탈퇴 시까지</td>
            </tr>
            <tr>
              <td style={cellStyle}>AI 서류 분석</td>
              <td style={cellStyle}>
                이력서, 자기소개서, 포트폴리오, 분석 요청 내용, AI 피드백
              </td>
              <td style={cellStyle}>
                AI 기반 첨삭, 분석 결과 제공, 서비스 품질 개선
              </td>
              <td style={cellStyle}>
                회원 탈퇴 시까지 또는 이용자가 삭제 요청 시까지
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>AI 면접</td>
              <td style={cellStyle}>
                면접 질문, 답변 내용, 면접 세션 정보, AI 피드백
              </td>
              <td style={cellStyle}>실시간 모의면접, 면접 피드백 제공</td>
              <td style={cellStyle}>
                회원 탈퇴 시까지 또는 이용자가 삭제 요청 시까지
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>채용공고 및 스크랩</td>
              <td style={cellStyle}>스크랩 공고, 지원 관심 정보, 검색 조건</td>
              <td style={cellStyle}>맞춤 공고 관리, 추천 서비스 제공</td>
              <td style={cellStyle}>
                회원 탈퇴 시까지 또는 이용자가 삭제 요청 시까지
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>기업 인증</td>
              <td style={cellStyle}>
                기업 정보, 사업자등록번호, 재직증명서 등 인증 파일
              </td>
              <td style={cellStyle}>기업 회원 확인, HR 권한 검증</td>
              <td style={cellStyle}>
                인증 목적 달성 후 관계 법령에 따른 보관 기간까지
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>결제 및 구독</td>
              <td style={cellStyle}>
                결제 식별자, 주문번호, 결제 상태, 구독 정보, 환불 처리 정보
              </td>
              <td style={cellStyle}>
                유료 서비스 결제, 구독 관리, 환불 및 정산
              </td>
              <td style={cellStyle}>
                전자상거래 등 관계 법령에 따른 보관 기간까지
              </td>
            </tr>
            <tr>
              <td style={cellStyle}>고객 문의</td>
              <td style={cellStyle}>문의 내용, 답변 내용, 이메일, 처리 이력</td>
              <td style={cellStyle}>고객 상담, 분쟁 대응, 서비스 개선</td>
              <td style={cellStyle}>
                문의 처리 완료 후 관계 법령에 따른 보관 기간까지
              </td>
            </tr>
          </tbody>
        </table>

        <h2>3. 개인정보 보유 및 이용 기간</h2>
        <p>
          개인정보는 원칙적으로 처리 목적 달성 또는 회원 탈퇴 시 지체 없이
          파기합니다. 다만 결제, 계약, 소비자 분쟁 대응, 접속 기록 등 관계
          법령에 따라 보관이 필요한 정보는 해당 법령에서 정한 기간 동안 보관할
          수 있습니다.
        </p>

        <h2>4. 개인정보 파기 절차 및 방법</h2>
        <p>
          보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 복구 또는
          재생되지 않도록 안전하게 파기합니다. 전자적 파일은 복구가 어려운
          방식으로 삭제하고, 종이 문서는 분쇄 또는 소각합니다.
        </p>

        <h2>5. 개인정보의 제3자 제공</h2>
        <p>
          Career Wave는 이용자의 사전 동의 없이 개인정보를 외부에 제공하지
          않습니다. 다만 법령에 근거가 있거나 수사기관 등 관계 기관의 적법한
          요청이 있는 경우 예외적으로 제공될 수 있습니다.
        </p>

        <h2>6. 개인정보 처리위탁 및 외부 서비스 이용</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>수탁자 또는 외부 서비스</th>
              <th style={cellStyle}>처리 내용</th>
              <th style={cellStyle}>관련 개인정보</th>
              <th style={cellStyle}>비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellStyle}>OpenAI API / FastAPI</td>
              <td style={cellStyle}>AI 서류 분석, AI 면접 피드백 생성</td>
              <td style={cellStyle}>
                이력서, 자기소개서, 면접 답변, 분석 요청 내용
              </td>
              <td style={cellStyle}>AI 처리 과정에서 국외 처리 가능</td>
            </tr>
            <tr>
              <td style={cellStyle}>AWS S3</td>
              <td style={cellStyle}>이력서, 재직증명서 등 파일 저장</td>
              <td style={cellStyle}>업로드 파일 및 파일 메타데이터</td>
              <td style={cellStyle}>파일 보관 인프라</td>
            </tr>
            <tr>
              <td style={cellStyle}>AWS SES</td>
              <td style={cellStyle}>이메일 인증 및 알림 발송</td>
              <td style={cellStyle}>이메일 주소, 인증번호 발송 이력</td>
              <td style={cellStyle}>이메일 발송 위탁</td>
            </tr>
            <tr>
              <td style={cellStyle}>SOLAPI / CoolSMS</td>
              <td style={cellStyle}>SMS 인증번호 발송</td>
              <td style={cellStyle}>휴대전화번호, 인증번호 발송 이력</td>
              <td style={cellStyle}>문자 발송 위탁</td>
            </tr>
            <tr>
              <td style={cellStyle}>Kakao, Naver, Google OAuth</td>
              <td style={cellStyle}>소셜 로그인 및 계정 연동</td>
              <td style={cellStyle}>OAuth 식별자, 이메일, 프로필 정보</td>
              <td style={cellStyle}>이용자 선택 시 연동</td>
            </tr>
            <tr>
              <td style={cellStyle}>Toss Payments</td>
              <td style={cellStyle}>결제 승인, 구독 결제, 환불 처리</td>
              <td style={cellStyle}>
                결제 식별자, 주문번호, 결제 상태, 고객 식별 정보
              </td>
              <td style={cellStyle}>결제 처리 위탁</td>
            </tr>
            <tr>
              <td style={cellStyle}>국세청 사업자등록정보 API</td>
              <td style={cellStyle}>사업자등록 상태 확인</td>
              <td style={cellStyle}>사업자등록번호 등 기업 인증 정보</td>
              <td style={cellStyle}>기업 인증 시 사용</td>
            </tr>
          </tbody>
        </table>

        <h2>7. 국외 이전 또는 국외 처리</h2>

        <p>
          Career Wave는 서비스 제공을 위해 일부 외부 서비스를 이용하며, 아래와
          같이 개인정보가 국외에서 처리될 수 있습니다.
        </p>

        <table>
          <thead>
            <tr>
              <th>서비스</th>
              <th>이전 정보</th>
              <th>이전 국가</th>
              <th>처리 목적</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>OpenAI API / FastAPI</td>
              <td>이력서, 자기소개서, 면접 답변, AI 분석 요청 내용</td>
              <td>미국 등 서비스 제공 국가</td>
              <td>AI 분석 및 피드백 생성</td>
            </tr>
            <tr>
              <td>AWS S3 / AWS SES</td>
              <td>업로드 파일, 이메일 주소</td>
              <td>AWS 서비스 운영 국가 및 리전</td>
              <td>파일 저장 및 이메일 발송</td>
            </tr>
            <tr>
              <td>Google OAuth</td>
              <td>이메일, 프로필 정보</td>
              <td>Google 서비스 운영 국가</td>
              <td>소셜 로그인 및 계정 연동</td>
            </tr>
          </tbody>
        </table>

        <p>
          Career Wave는 서비스 제공에 필요한 최소한의 범위에서만 개인정보를
          처리하며, 서비스 제공 목적 외의 용도로 이용하지 않도록 관리합니다.
        </p>

        <h2>8. 정보주체와 법정대리인의 권리 및 행사 방법</h2>
        <p>
          이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수
          있습니다. 권리 행사는 서비스 내 계정 설정, 고객 문의 또는 개인정보
          보호책임자 연락처를 통해 요청할 수 있습니다.
        </p>

        <h2>9. 자동 수집 장치 및 쿠키·세션 처리</h2>
        <p>
          Career Wave는 로그인 상태 유지, 보안, 서비스 이용 통계 분석을 위해
          쿠키, 세션, 접속 로그, 기기 정보, IP 주소 등을 처리할 수 있습니다.
          이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수
          있습니다.
        </p>

        <h2>10. 개인정보 안전성 확보 조치</h2>
        <p>
          Career Wave는 개인정보 보호를 위해 접근 권한 관리, 인증 토큰 기반 접근
          제어, 비밀번호 암호화, 전송 구간 보호, 주요 처리 이력 관리, 파일 접근
          제한 등 합리적인 보호 조치를 적용합니다.
        </p>

        <h2>11. 개인정보 보호책임자 및 고충처리 연락처</h2>
        <p>
          개인정보 열람, 정정, 삭제, 처리정지 및 고충 처리는 서비스 내 고객 문의
          채널을 통해 요청할 수 있습니다.
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <th style={cellStyle}>개인정보 보호책임자</th>
              <td style={cellStyle}>Career Wave 서비스 운영 담당자</td>
            </tr>
            <tr>
              <th style={cellStyle}>문의 채널</th>
              <td style={cellStyle}>서비스 내 고객 문의 페이지</td>
            </tr>
            <tr>
              <th style={cellStyle}>요청 가능 항목</th>
              <td style={cellStyle}>
                개인정보 열람, 정정, 삭제, 처리정지, 침해 신고 및 고충 처리
              </td>
            </tr>
          </tbody>
        </table>

        <h2>12. 개인정보처리방침 변경 및 시행일</h2>
        <p>
          본 개인정보처리방침은 서비스 정책, 법령, 외부 처리 서비스 변경에 따라
          개정될 수 있습니다. 변경 사항은 서비스 화면을 통해 안내하며, 중요한
          변경이 있는 경우 시행 전에 공지합니다.
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <th style={cellStyle}>시행일</th>
              <td style={cellStyle}>{effectiveDate}</td>
            </tr>
            <tr>
              <th style={cellStyle}>변경 이력</th>
              <td style={cellStyle}>초기 개인정보처리방침 상세화</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  border: "1px solid #d9e2ec",
  padding: "12px 14px",
  verticalAlign: "top",
  textAlign: "left",
};

export default PrivacyPage;
