import { useEffect, useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import {
  memberApi,
  MEMBER_ROLE,
  MEMBER_STATUS,
  type MemberItem,
  type MemberDetailItem,
  type MemberStatus,
  type SuspendDuration,
  type HrManagerDetail,
} from '../../../api/admin/memberApi';
import { adminSession } from '../../../api/admin/adminSession';

const WARN_THRESHOLD = 3;
const SUSPEND_PERIODS: SuspendDuration[] = ['THREE_DAYS', 'SEVEN_DAYS', 'THIRTY_DAYS', 'PERMANENT'];
const durationLabel: Record<SuspendDuration, string> = {
  THREE_DAYS: '3일', SEVEN_DAYS: '7일', THIRTY_DAYS: '30일', PERMANENT: '영구',
};
const memberStatusLabel: Record<MemberStatus, string> = {
  ACTIVE: '정상', SUSPENDED: '정지', BANNED: '영구정지', BLACKLISTED: '블랙리스트', LOCKED: '잠금', WITHDRAWN: '탈퇴',
};
const memberStatusCls: Record<MemberStatus, string> = {
  ACTIVE: 'normal', SUSPENDED: 'blinded', BANNED: 'dismissed', BLACKLISTED: 'dismissed', LOCKED: 'pending', WITHDRAWN: 'dismissed',
};

interface MemberDetailModalProps {
  member: MemberDetailItem;
  onClose: () => void;
  onSuspend: (member: MemberDetailItem) => void;
  onUnsuspend: (member: MemberDetailItem) => void;
  onUnban: (member: MemberDetailItem) => void;
}

export function MemberDetailModal({ member, onClose, onSuspend, onUnsuspend, onUnban }: MemberDetailModalProps) {
  const [hrDetail, setHrDetail] = useState<HrManagerDetail | null>(null);
  const [hrDetailError, setHrDetailError] = useState('');

  useEffect(() => {
    if (member.role !== MEMBER_ROLE.COMPANY) return;
    let cancelled = false;
    setHrDetail(null);
    setHrDetailError('');
    memberApi.getHrManagerDetail(member.memberId)
      .then((res) => {
        if (cancelled) return;
        if (!res.data.success) throw new Error(res.data.message);
        setHrDetail(res.data.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = axios.isAxiosError(err) ? err.response?.data?.message : err instanceof Error ? err.message : '';
        setHrDetailError(msg || '재직증명서 정보를 불러오지 못했습니다.');
      });
    return () => { cancelled = true; };
  }, [member.role, member.memberId]);

  return (
    <div className="modalOverlay">
      <div className="memberModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h3>{member.name} 상세 정보</h3>
            <p>{member.loginId} · {member.email}</p>
          </div>
          <button className="modalCloseBtn" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modalInfoGrid">
          <div><span>권한</span><strong>{member.role === MEMBER_ROLE.USER ? '개인 회원' : '기업 회원'}</strong></div>
          {member.role === MEMBER_ROLE.USER && <div><span>구독 플랜</span><strong>{member.plan}</strong></div>}
          <div><span>가입일</span><strong>{new Date(member.joinedAt).toLocaleDateString('ko-KR')}</strong></div>
          <div><span>최근 접속</span><strong>{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString('ko-KR') : '—'}</strong></div>
          <div><span>현재 상태</span><strong><span className={`statusBadge ${memberStatusCls[member.memberStatus]}`}>{memberStatusLabel[member.memberStatus]}</span></strong></div>
          {/* 신고(report)는 커뮤니티 기능 전용이며 기업 회원은 커뮤니티 접근이 차단되어 있음 (#1171) */}
          {member.role === MEMBER_ROLE.USER && <div><span>신고 받은 횟수</span><strong>{member.reportCount}건</strong></div>}
          {(member.sanctionType === 'SUSPEND' || member.sanctionType === 'BLACKLIST') && (
            <>
              <div><span>제재 유형</span><strong>{{ WARNING: '경고', SUSPEND: '활동 정지', BLACKLIST: '영구 정지' }[member.sanctionType]}</strong></div>
              <div><span>정지 기간</span><strong>
                {member.suspendStartDate ? new Date(member.suspendStartDate).toLocaleDateString('ko-KR') : '—'}
                {' ~ '}
                {member.suspendDuration === 'PERMANENT'
                  ? '영구'
                  : member.suspendEndDate
                  ? new Date(member.suspendEndDate).toLocaleDateString('ko-KR')
                  : '—'}
              </strong></div>
            </>
          )}
          {/* 경고(WARNING)는 커뮤니티 신고 관리 화면에서만 부여되며, 기업 회원은 커뮤니티 접근이 차단되어 있음 (#1171) */}
          {member.role === MEMBER_ROLE.USER && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span>경고 횟수</span>
              <div className="warnCountWrap">
                <div className="warnDots">
                  {Array.from({ length: WARN_THRESHOLD }).map((_, i) => (
                    <span key={i} className={`warnDot ${i < member.warningCount ? 'filled' : ''}`} />
                  ))}
                </div>
                <strong className={`warnCountText ${
                  member.warningCount >= WARN_THRESHOLD ? 'danger' :
                  member.warningCount === WARN_THRESHOLD - 1 ? 'caution' : ''
                }`}>
                  {member.warningCount}/{WARN_THRESHOLD}회
                </strong>
                {member.warningCount >= WARN_THRESHOLD && <span className="warnAlert">활동정지 권고</span>}
                {member.warningCount === WARN_THRESHOLD - 1 && <span className="warnCaution">1회 추가 시 활동정지 권고</span>}
              </div>
            </div>
          )}
          {member.role === MEMBER_ROLE.COMPANY && (
            <div style={{ gridColumn: '1 / -1', padding: '14px 16px', borderRadius: 12, background: '#f3f7fc', border: '1px solid #d8e8f5' }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#31475f' }}>재직증명서</p>
              {hrDetailError && <p style={{ margin: 0, fontSize: 13, color: '#9a4444' }}>{hrDetailError}</p>}
              {!hrDetailError && !hrDetail && <p style={{ margin: 0, fontSize: 13, color: '#7a8da4' }}>불러오는 중...</p>}
              {hrDetail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#4a7299' }}>📄 {hrDetail.certFileName}</span>
                  <a href={hrDetail.certFileUrl} target="_blank" rel="noopener noreferrer" className="tableBtn" style={{ marginLeft: 'auto' }}>파일 확인</a>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modalAction">
          <button onClick={onClose}>닫기</button>
          {member.memberStatus === MEMBER_STATUS.SUSPENDED && (
            <button onClick={() => onUnsuspend(member)} style={{ background: '#2e7d32', color: 'white', borderColor: '#2e7d32' }}>정지 해제</button>
          )}
          {member.memberStatus === MEMBER_STATUS.BANNED && adminSession.getRole() === 'MASTER' && (
            <button onClick={() => onUnban(member)} style={{ background: '#2e7d32', color: 'white', borderColor: '#2e7d32' }}>영구정지 해제</button>
          )}
          {member.memberStatus !== MEMBER_STATUS.SUSPENDED && member.memberStatus !== MEMBER_STATUS.BANNED && member.memberStatus !== MEMBER_STATUS.BLACKLISTED && (
            <button onClick={() => onSuspend(member)} disabled={member?.memberStatus === MEMBER_STATUS.WITHDRAWN}>활동 정지</button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConfirmViewModalProps {
  memberId: string;
  onConfirm: (memberId: string) => void;
  onClose: () => void;
}

export function ConfirmViewModal({ memberId, onConfirm, onClose }: ConfirmViewModalProps) {
  return (
    <div className="modalOverlay">
      <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <div className="modalHeader">
          <div><h3>개인정보 열람 확인</h3></div>
          <button className="modalCloseBtn" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modalInfoGrid">
          <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 14, lineHeight: 1.7, color: '#3a4f6a' }}>
            이 회원의 개인정보(이름·이메일)를 조회하시겠습니까?<br />
            조회 시 감사로그에 기록됩니다.
          </p>
        </div>
        <div className="modalAction">
          <button onClick={onClose}>취소</button>
          <button onClick={() => onConfirm(memberId)}>확인</button>
        </div>
      </div>
    </div>
  );
}

interface SuspendModalProps {
  target: MemberItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function SuspendModal({ target, onClose, onSuccess }: SuspendModalProps) {
  const [period, setPeriod] = useState<SuspendDuration>('SEVEN_DAYS');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSuspend = async () => {
    if (reason.trim().length < 10) {
      setError('정지 사유는 최소 10자 이상 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await memberApi.sanctionMember(target.memberId, {
        sanctionType: 'SUSPEND',
        duration: period,
        reason,
      });
      if (!res.data.success) throw new Error(res.data.message);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : err instanceof Error ? err.message : '';
      setError(msg || '제재 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="memberModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h3>활동 정지 처리</h3>
            <p>{target.name} · {target.loginId}</p>
          </div>
          <button className="modalCloseBtn" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modalInfoGrid">
          <div style={{ gridColumn: '1 / -1' }}>
            <span>정지 기간</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {SUSPEND_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 8, fontFamily: 'inherit',
                    border: `1px solid ${period === p ? '#24496f' : '#d7e4f2'}`,
                    background: period === p ? '#24496f' : 'white',
                    color: period === p ? 'white' : '#24496f',
                    fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  {durationLabel[p]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span>정지 사유</span>
            <textarea
              placeholder="이용 약관 위반 내용을 입력하세요 (최소 10자)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                marginTop: 8, width: '100%', minHeight: 90, boxSizing: 'border-box',
                border: '1px solid #d8e3ed', borderRadius: 10, padding: '10px 12px',
                outline: 'none', resize: 'vertical', background: 'white',
                fontSize: 14, fontFamily: 'inherit', color: '#10243f', lineHeight: 1.7,
              }}
            />
            <p style={{
              margin: '4px 0 0', fontSize: 12, textAlign: 'right',
              color: reason.trim().length < 10 ? '#9a4444' : '#7a8da4',
            }}>
              {reason.trim().length} / 10자 이상
            </p>
          </div>
          {error && (
            <p style={{ gridColumn: '1 / -1', fontSize: 13, color: '#9a4444', margin: 0 }}>{error}</p>
          )}
        </div>
        <div className="modalAction">
          <button onClick={onClose} disabled={loading}>취소</button>
          <button
            onClick={handleSuspend}
            disabled={loading}
            style={period === 'PERMANENT' ? { background: '#9a6767', color: 'white', borderColor: '#9a6767' } : {}}
          >
            {loading ? '처리 중...' : `${durationLabel[period]} 정지 처리`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UnsuspendModalProps {
  target: MemberItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function UnsuspendModal({ target, onClose, onSuccess }: UnsuspendModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnsuspend = async () => {
    if (reason.trim().length < 10) {
      setError('해제 사유는 최소 10자 이상 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await memberApi.unsuspendMember(target.memberId, { reason });
      if (!res.data.success) throw new Error(res.data.message);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : err instanceof Error ? err.message : '';
      setError(msg || '정지 해제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <div className="modalHeader">
          <div>
            <h3>정지 해제</h3>
            <p>{target.name} · {target.loginId}</p>
          </div>
          <button className="modalCloseBtn" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modalBody" style={{ display: 'grid', gap: 16, padding: '20px 24px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <span>해제 사유</span>
            <textarea
              placeholder="정지 해제 사유를 입력하세요 (최소 10자)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                marginTop: 8, width: '100%', minHeight: 90, boxSizing: 'border-box',
                border: '1px solid #d8e3ed', borderRadius: 10, padding: '10px 12px',
                outline: 'none', resize: 'vertical', background: 'white',
                fontSize: 14, fontFamily: 'inherit', color: '#10243f', lineHeight: 1.7,
              }}
            />
            <p style={{
              margin: '4px 0 0', fontSize: 12, textAlign: 'right',
              color: reason.trim().length < 10 ? '#9a4444' : '#7a8da4',
            }}>
              {reason.trim().length} / 10자 이상
            </p>
          </div>
          {error && (
            <p style={{ gridColumn: '1 / -1', fontSize: 13, color: '#9a4444', margin: 0 }}>{error}</p>
          )}
        </div>
        <div className="modalAction">
          <button onClick={onClose} disabled={loading}>취소</button>
          <button
            onClick={handleUnsuspend}
            disabled={loading}
            style={{ background: '#2e7d32', color: 'white', borderColor: '#2e7d32' }}
          >
            {loading ? '처리 중...' : '정지 해제'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UnbanModalProps {
  target: MemberItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function UnbanModal({ target, onClose, onSuccess }: UnbanModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnban = async () => {
    if (reason.trim().length < 10) {
      setError('해제 사유는 최소 10자 이상 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await memberApi.unbanMember(target.memberId, { reason });
      if (!res.data.success) throw new Error(res.data.message);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : err instanceof Error ? err.message : '';
      setError(msg || '영구정지 해제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <div className="modalHeader">
          <div>
            <h3>영구정지 해제</h3>
            <p>{target.name} · {target.loginId}</p>
          </div>
          <button className="modalCloseBtn" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modalBody" style={{ display: 'grid', gap: 16, padding: '20px 24px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <span>해제 사유</span>
            <textarea
              placeholder="영구정지 해제 사유를 입력하세요 (최소 10자)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                marginTop: 8, width: '100%', minHeight: 90, boxSizing: 'border-box',
                border: '1px solid #d8e3ed', borderRadius: 10, padding: '10px 12px',
                outline: 'none', resize: 'vertical', background: 'white',
                fontSize: 14, fontFamily: 'inherit', color: '#10243f', lineHeight: 1.7,
              }}
            />
            <p style={{
              margin: '4px 0 0', fontSize: 12, textAlign: 'right',
              color: reason.trim().length < 10 ? '#9a4444' : '#7a8da4',
            }}>
              {reason.trim().length} / 10자 이상
            </p>
          </div>
          {error && (
            <p style={{ gridColumn: '1 / -1', fontSize: 13, color: '#9a4444', margin: 0 }}>{error}</p>
          )}
        </div>
        <div className="modalAction">
          <button onClick={onClose} disabled={loading}>취소</button>
          <button
            onClick={handleUnban}
            disabled={loading}
            style={{ background: '#2e7d32', color: 'white', borderColor: '#2e7d32' }}
          >
            {loading ? '처리 중...' : '영구정지 해제'}
          </button>
        </div>
      </div>
    </div>
  );
}
