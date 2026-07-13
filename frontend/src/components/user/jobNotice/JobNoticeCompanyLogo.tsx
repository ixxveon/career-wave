import { useEffect, useState } from 'react';

interface JobNoticeCompanyLogoProps {
  companyName: string;
  companyLogoUrl?: string;
  className: string;
}

export default function JobNoticeCompanyLogo({
  companyName,
  companyLogoUrl,
  className,
}: JobNoticeCompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const initial = companyName.trim().charAt(0) || '?';

  useEffect(() => {
    setFailed(false);
  }, [companyLogoUrl]);

  if (!companyLogoUrl || failed) {
    return <div className={className} aria-label={`${companyName} 로고`}>{initial}</div>;
  }

  return (
    <div className={className}>
      <img src={companyLogoUrl} alt={`${companyName} 로고`} onError={() => setFailed(true)} />
    </div>
  );
}
