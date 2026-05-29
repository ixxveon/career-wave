import { Mail, Phone } from 'lucide-react';

function RecoverySupportPanel() {
  return (
    <div className="cw-auth-support">
      <p className="cw-auth-support__lead">위 방법으로 계정을 확인하기 힘드신 경우, 고객센터로 문의해 주세요.</p>
      <div className="cw-auth-support__grid">
        <section className="cw-auth-support__item">
          <div className="cw-auth-support__icon">
            <Phone size={22} />
          </div>
          <div>
            <h3>전화문의</h3>
            <p>Tel: 1234-4321</p>
            <p>운영시간: 평일 09:00~18:00</p>
            <p>점심시간: 12:00~13:00</p>
            <p>토/일/공휴일 휴무</p>
          </div>
        </section>
        <section className="cw-auth-support__item">
          <div className="cw-auth-support__icon">
            <Mail size={22} />
          </div>
          <div>
            <h3>메일문의</h3>
            <p>help@careerwave.co.kr</p>
            <a href="mailto:help@careerwave.co.kr">문의하기</a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RecoverySupportPanel;
