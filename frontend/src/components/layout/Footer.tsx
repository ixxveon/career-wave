import { Link } from 'react-router-dom';
import { Instagram, Github, Send, type LucideIcon } from 'lucide-react';
import logo from '../../assets/logo.svg';
import './Footer.css';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterCol {
  title: string;
  links: FooterLink[];
}

interface SnsItem {
  label: string;
  icon: LucideIcon;
}

const FOOTER_COLS: FooterCol[] = [
  {
    title: '서비스',
    links: [
      { label: '채용공고',  href: '/jobs' },
      { label: '서류 분석', href: '/documents/resume' },
      { label: 'AI 면접',  href: '/interview' },
    ],
  },
  {
    title: '고객센터',
    links: [
      { label: '공지사항', href: '/support/notices' },
      { label: 'FAQ',      href: '/support/faq' },
      { label: '1:1 문의', href: '/support/inquiry' },
    ],
  },
  {
    title: '회사',
    links: [
      { label: '회사 소개',        href: '/about' },
      { label: '이용약관',         href: '/terms' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
];

const SNS: SnsItem[] = [
  { label: 'Instagram', icon: Instagram },
  { label: 'GitHub',    icon: Github    },
  { label: 'Kakao',     icon: Send      },
];

function Footer() {
  return (
    <footer className="cw-footer">
      <div className="cw-footer__inner">
        <div className="cw-footer__top">

          {/* ── 브랜드 ── */}
          <div className="cw-footer__brand">
            <div className="cw-footer__logo">
              <img src={logo} alt="" />
              <span>Career Wave</span>
            </div>
            <p className="cw-footer__desc">
              AI가 이력서부터 면접까지,<br />
              취업 준비의 모든 단계를 함께합니다.
            </p>
            <div className="cw-footer__sns">
              {SNS.map(({ label, icon: Icon }) => (
                // TODO: SNS 채널 개설 후 <a href={url}> 로 교체
                <button key={label} type="button" aria-label={label} className="cw-footer__sns-btn" disabled>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* ── 링크 컬럼 ── */}
          <div className="cw-footer__cols">
            {FOOTER_COLS.map(({ title, links }) => (
              <div key={title} className="cw-footer__col">
                <h4 className="cw-footer__col-title">{title}</h4>
                <ul>
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link to={href}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        <div className="cw-footer__bottom">
          <small>© 2026 Career Wave. All rights reserved.</small>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
