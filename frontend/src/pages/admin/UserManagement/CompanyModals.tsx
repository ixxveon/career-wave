import { useState } from 'react';
import axios from 'axios';
import {
  memberApi,
  type HrManagerItem,
  type HrManagerDetail,
  type HrStatus,
} from '../../../api/admin/memberApi';

const hrStatusLabel: Record<HrStatus, string> = {
  PENDING: '승인 대기', ACTIVE: '승인 완료', REMOVED: '반려',
};
const hrStatusCls: Record<HrStatus, string> = {
  PENDING: 'pending', ACTIVE: 'normal', REMOVED: 'blinded',
};

interface CompanyDetailModalProps {
  company: HrManagerDetail;
  onClose: () => void;
  onApprove: (company: HrManagerDetail) => void;
  onReject: (company: HrManagerDetail) => void;
}

export function CompanyDetailModal({ company, onClose, onApprove, onReject }: CompanyDetailModalProps) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
        <div className="modalHeader">
          <div>
            <h3>{company.companyName} HR 담당자</h3>
            <p>{company.memberId.slice(0, 8)}… · {company.email}</p>
          </div>
          <button onClick={onClose}>닫기</button>
        </div>
        <div className="modalInfoGrid">
          <div><span>HR 담당자명</span><strong>{company.hrName}</strong></div>
          <div><span>이메일</span><strong>{company.email}</strong></div>
          <div><span>기업명</span><strong>{company.companyName}</strong></div>
          <div><span>사업자등록번호</span><strong>{company.certificateNumber}</strong></div>
          <div><span>가입일</span><strong>{new Date(company.joinedAt).toLocaleDateString('ko-KR')}</strong></div>
          <div>
            <span>승인 상태</span>
            <strong>
              <span className={`statusBadge ${hrStatusCls[company.hrStatus]}`}>
                {hrStatusLabel[company.hrStatus]}
              </span>
            </strong>
          </div>
        </div>
        <div style={{ margin: '16px 0 0', padding: '14px 16px', borderRadius: 12, background: '#f3f7fc', border: '1px solid #d8e8f5' }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#31475f' }}>재직증명서</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#4a7299' }}>📄 {company.certFileName}</span>
            <a href={company.certFileUrl} target="_blank" rel="noopener noreferrer" className="tableBtn" style={{ marginLeft: 'auto' }}>파일 확인</a>
          </div>
        </div>
        {company.rejectReason && (
          <div style={{ margin: '12px 0 0', padding: '12px 14px', borderRadius: 10, background: '#fff5f5', border: '1px solid #ffd5d5', fontSize: 13, color: '#9a4444' }}>
            <strong>반려 사유:</strong> {company.rejectReason}
          </div>
        )}
        <div className="modalAction">
          {company.hrStatus === 'PENDING' && (
            <>
              <button
                style={{ background: '#24496f', color: 'white', borderColor: '#24496f' }}
                onClick={() => { onApprove(company); }}
              >
                승인 처리
              </button>
              <button
                style={{ background: '#fff1f2', color: '#9a6767', borderColor: '#ffd5d5' }}
                onClick={() => { onReject(company); }}
              >
                반려 처리
              </button>
            </>
          )}
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

interface ApproveModalProps {
  target: HrManagerItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApproveModal({ target, onClose, onSuccess }: ApproveModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await memberApi.approveHrManager(target.memberId);
      if (!res.data.success) throw new Error(res.data.message);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : err instanceof Error ? err.message : '';
      setError(msg || '승인 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
        <div className="modalHeader">
          <div>
            <h3>기업회원 승인 처리</h3>
            <p>{target.hrName} · {target.companyName}</p>
          </div>
          <button onClick={onClose}>닫기</button>
        </div>
        <div style={{ padding: '16px', borderRadius: 12, background: '#f0f8f4', border: '1px solid #b8dece', fontSize: 14, color: '#2c6e4f', lineHeight: 1.7 }}>
          <strong>{target.hrName}</strong> 담당자의 재직증명서를 확인하고<br />
          <strong>{target.companyName}</strong> 기업회원 가입을 <strong>승인</strong>합니다.<br />
          승인 후 해당 계정은 즉시 플랫폼을 이용할 수 있습니다.
        </div>
        {error && <p style={{ fontSize: 13, color: '#9a4444', margin: '8px 0 0' }}>{error}</p>}
        <div className="modalAction">
          <button
            style={{ background: '#24496f', color: 'white', borderColor: '#24496f' }}
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? '처리 중...' : '승인 확정'}
          </button>
          <button onClick={onClose} disabled={loading}>취소</button>
        </div>
      </div>
    </div>
  );
}

interface RejectModalProps {
  target: HrManagerItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectModal({ target, onClose, onSuccess }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReject = async () => {
    if (reason.trim().length < 10) {
      setError('반려 사유는 최소 10자 이상 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await memberApi.rejectHrManager(target.memberId, { rejectReason: reason });
      if (!res.data.success) throw new Error(res.data.message);
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : err instanceof Error ? err.message : '';
      setError(msg || '반려 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <div className="modalHeader">
          <div>
            <h3>기업회원 반려 처리</h3>
            <p>{target.hrName} · {target.companyName}</p>
          </div>
          <button onClick={onClose}>닫기</button>
        </div>
        <div className="csFormRows">
          <div className="csFormRow">
            <label>반려 사유 <span style={{ color: '#9a6767', fontSize: 12 }}>* 신청자에게 안내됩니다</span></label>
            <textarea
              className="csFormTextarea"
              placeholder="예) 재직증명서 유효기간 만료 — 3개월 이내 발급 서류로 재제출 해주세요. (최소 10자)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ minHeight: 90 }}
            />
          </div>
          {error && <p style={{ fontSize: 13, color: '#9a4444', margin: '0' }}>{error}</p>}
        </div>
        <div className="modalAction">
          <button
            style={{ background: '#9a6767', color: 'white', borderColor: '#9a6767' }}
            onClick={handleReject}
            disabled={loading}
          >
            {loading ? '처리 중...' : '반려 처리'}
          </button>
          <button onClick={onClose} disabled={loading}>취소</button>
        </div>
      </div>
    </div>
  );
}
