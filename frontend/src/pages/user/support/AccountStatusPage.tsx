import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, ShieldX, MessageSquare, Clock } from 'lucide-react';
import { supportApi, type AccountStatus, type MemberStatus } from '../../../api/user/supportApi';
import '@/styles/user/support/AccountStatusPage.css';

const STATUS_CONFIG: Record<MemberStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  ACTIVE:      { label: '정상',   cls: 'as-badge--active',    icon: <ShieldCheck size={18} /> },
  SUSPENDED:   { label: '정지',   cls: 'as-badge--suspended', icon: <ShieldAlert size={18} /> },
  BANNED:      { label: '차단',   cls: 'as-badge--banned',    icon: <ShieldX size={18} /> },
  LOCKED:      { label: '잠금',   cls: 'as-badge--locked',    icon: <ShieldAlert size={18} /> },
  WITHDRAWN:   { label: '탈퇴',   cls: 'as-badge--banned',    icon: <ShieldX size={18} /> },
  BLACKLISTED: { label: '블랙리스트', cls: 'as-badge--banned', icon: <ShieldX size={18} /> },
};

const DURATION_LABEL: Record<string, string> = {
  THREE_DAYS:    '3일',
  SEVEN_DAYS:    '7일',
  FOURTEEN_DAYS: '14일',
  THIRTY_DAYS:   '30일',
  PERMANENT:     '영구',
};

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function AccountStatusPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supportApi.getAccountStatus()
      .then(data => setStatus(data))
      .catch(() => setError('계정 상태를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="as-page"><p className="as-loading">불러오는 중...</p></div>;
  if (error)   return <div className="as-page"><p className="as-error">{error}</p></div>;
  if (!status) return null;

  const cfg = STATUS_CONFIG[status.memberStatus] ?? STATUS_CONFIG.ACTIVE;
  const r = status.restriction;

  return (
    <div className="as-page">
      <div className="as-header">
        <span className="as-eyebrow">계정 상태</span>
        <h2 className="as-title">내 계정 현황</h2>
        <p className="as-desc">현재 계정의 상태와 제재 정보를 확인할 수 있습니다.</p>
      </div>

      <div className="as-card">
        <div className="as-card__head">
          <span className={`as-badge ${cfg.cls}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        {!r ? (
          <div className="as-normal">
            <ShieldCheck size={48} className="as-normal__icon" />
            <p className="as-normal__msg">계정이 정상 상태입니다.</p>
          </div>
        ) : (
          <div className="as-info-grid">
            <div className="as-info-row">
              <span className="as-info-label">제재 유형</span>
              <span className="as-info-value">{STATUS_CONFIG[r.restrictionType]?.label ?? r.restrictionType}</span>
            </div>
            <div className="as-info-row">
              <span className="as-info-label">정지 기간</span>
              <span className="as-info-value">
                {r.duration ? DURATION_LABEL[r.duration] ?? r.duration : '-'}
                {r.duration === 'PERMANENT' && <span className="as-tag as-tag--danger">영구 정지</span>}
              </span>
            </div>
            <div className="as-info-row">
              <span className="as-info-label">시작일</span>
              <span className="as-info-value">{formatDate(r.startedAt)}</span>
            </div>
            <div className="as-info-row">
              <span className="as-info-label">해제 예정일</span>
              <span className="as-info-value">
                {r.availableAt ? formatDate(r.availableAt) : '해제 불가'}
              </span>
            </div>
            <div className="as-info-row as-info-row--full">
              <span className="as-info-label">제재 사유</span>
              <span className="as-info-value">{r.reason ?? '사유 없음'}</span>
            </div>
            {r.recoverable && r.availableAt && (
              <div className="as-recover-notice">
                <Clock size={14} />
                {formatDate(r.availableAt)} 이후 자동으로 계정이 복구됩니다.
              </div>
            )}
            {!r.recoverable && (
              <div className="as-recover-notice as-recover-notice--danger">
                <ShieldX size={14} />
                이 제재는 자동으로 해제되지 않습니다. 문의를 통해 확인해주세요.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="as-inquiry-section">
        <p className="as-inquiry-desc">제재에 이의가 있거나 추가 문의가 필요하신가요?</p>
        <button className="as-inquiry-btn" onClick={() => navigate('/support/inquiry/create')}>
          <MessageSquare size={15} />
          1:1 문의하기
        </button>
      </div>
    </div>
  );
}
