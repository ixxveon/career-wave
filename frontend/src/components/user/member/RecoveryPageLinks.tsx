import { Fragment } from 'react';
import { Link } from 'react-router-dom';

interface RecoveryPageLinkItem {
  to: string;
  label: string;
}

interface RecoveryPageLinksProps {
  links: RecoveryPageLinkItem[];
}

function RecoveryPageLinks({ links }: RecoveryPageLinksProps) {
  return (
    <div className="cw-auth-links">
      {links.map((link, index) => (
        <Fragment key={link.to}>
          {index > 0 && <span aria-hidden="true">|</span>}
          <Link to={link.to}>{link.label}</Link>
        </Fragment>
      ))}
    </div>
  );
}

export default RecoveryPageLinks;
