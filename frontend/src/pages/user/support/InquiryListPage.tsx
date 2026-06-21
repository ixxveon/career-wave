import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import {
  supportApi,
  INQUIRY_CATEGORY_LABEL,
  INQUIRY_STATUS_LABEL,
  type InquiryCategory,
  type InquiryStatus,
  type InquiryItem,
} from '../../../api/user/supportApi';
import '@/styles/user/support/InquiryListPage.css';

const CATEGORY_FILTERS: { label: string; value: InquiryCategory | '' }[] = [
  { label: '전체',      value: '' },
  { label: '환불',      value: 'REFUND' },
  { label: 'AI 서비스', value: 'SERVICE' },
  { label: '구독/결제', value: 'PAYMENT_ERROR' },
  { label: '계정',      value: 'ACCOUNT' },
  { label: '기타',      value: 'ETC' },
];

const STATUS_CONFIG: Record<InquiryStatus, { icon: ReactNode; cls: string }> = {
  PENDING:     { icon: <AlertCircle size={12} />,  cls: 'iq-status--pending'    },
  IN_PROGRESS: { icon: <Clock size={12} />,        cls: 'iq-status--processing' },
  COMPLETED:   { icon: <CheckCircle size={12} />,  cls: 'iq-status--done'       },
};

interface InquiryDetailModalProps {
  inquiry: InquiryItem;
  onClose: () => void;
}

function InquiryDetailModal({ inquiry, onClose }: InquiryDetailModalProps) {
  const cfg = STATUS_CONFIG[inquiry.inquiryStatus];
  return (
    <div className="iq-modal-backdrop" onClick={onClose}>
      <div className="iq-modal" onClick={e => e.stopPropagation()}>
        <div className="iq-modal__header">
          <div className="iq-modal__title-wrap">
            <span className="iq-cat-badge">{INQUIRY_CATEGORY_LABEL[inquiry.category]}</span>
            <span className={`iq-status ${cfg.cls}`}>{cfg.icon} {INQUIRY_STATUS_LABEL[inquiry.inquiryStatus]}</span>
          </div>
          <h2 className="iq-modal__title">{inquiry.title}</h2>
          <p className="iq-modal__date">{inquiry.createdAt} 접수</p>
        </div>

        <div className="iq-modal__section">
          <p className="iq-modal__section-label">문의 내용</p>
          <p className="iq-modal__content">{inquiry.contentPreview}</p>
        </div>

        {inquiry.reply ? (
          <div className="iq-modal__section iq-modal__section--answer">
            <p className="iq-modal__section-label">답변</p>
            <p className="iq-modal__content">{inquiry.reply}</p>
          </div>
        ) : (
          <div className="iq-modal__pending">
            <Clock size={14} />
            <span>답변 대기 중입니다. 순차적으로 처리하고 있습니다.</span>
          </div>
        )}

        <button className="iq-modal__close" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

export default function InquiryListPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<InquiryCategory | ''>('');
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [selected, setSelected]  = useState<InquiryItem | null>(null);
  const [loading,  setLoading]   = useState(true);
  const [error,    setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    supportApi.getMyInquiries({ category: category || undefined })
      .then(res => setInquiries(res))
      .catch(() => setError('문의 내역을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="iq-page">
      <div className="iq-header">
        <span className="iq-eyebrow">1:1 문의</span>
        <h1 className="iq-header__title">나의 문의 내역</h1>
        <p className="iq-header__desc">접수된 문의와 답변 현황을 확인하세요.</p>
      </div>

      <div className="iq-toolbar">
        <div className="iq-cats">
          {CATEGORY_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              className={`iq-cat${category === value ? ' iq-cat--on' : ''}`}
              onClick={() => setCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="iq-write-btn" onClick={() => navigate('/support/inquiry/create')}>
          <Plus size={14} /> 문의하기
        </button>
      </div>

      {loading && <div className="iq-empty"><MessageSquare size={36} /><p>로딩 중...</p></div>}
      {error   && <div className="iq-empty"><MessageSquare size={36} /><p>{error}</p></div>}
      {!loading && !error && (
        <div className="iq-list">
          {inquiries.length === 0 ? (
            <div className="iq-empty">
              <MessageSquare size={36} />
              <p>문의 내역이 없습니다.</p>
              <button className="iq-empty-btn" onClick={() => navigate('/support/inquiry/create')}>
                첫 문의 작성하기
              </button>
            </div>
          ) : (
            inquiries.map(i => {
              const cfg = STATUS_CONFIG[i.inquiryStatus];
              return (
                <button type="button" key={i.inquiryId} className="iq-item" onClick={() => setSelected(i)}>
                  <div className="iq-item__left">
                    <span className="iq-cat-badge">{INQUIRY_CATEGORY_LABEL[i.category]}</span>
                    <MessageSquare size={14} className="iq-item__icon" />
                    <div className="iq-item__info">
                      <span className="iq-item__title">{i.title}</span>
                      <span className="iq-item__preview">{i.contentPreview}</span>
                    </div>
                  </div>
                  <div className="iq-item__right">
                    <span className={`iq-status ${cfg.cls}`}>{cfg.icon} {INQUIRY_STATUS_LABEL[i.inquiryStatus]}</span>
                    <span className="iq-item__date">{i.createdAt}</span>
                    <ChevronRight size={14} className="iq-item__arrow" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {selected && (
        <InquiryDetailModal inquiry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
