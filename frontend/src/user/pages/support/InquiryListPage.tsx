import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import './styles/InquiryListPage.css';

type InquiryStatus = '접수' | '처리 중' | '답변 완료';

interface Inquiry {
  id: number;
  category: string;
  title: string;
  createdAt: string;
  status: InquiryStatus;
  hasAnswer: boolean;
  preview: string;
  answer?: string;
}

const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: 1,
    category: 'AI 이력서 분석',
    title: 'AI 분석 결과가 이전과 달라졌어요',
    createdAt: '2025-05-24',
    status: '답변 완료',
    hasAnswer: true,
    preview: '같은 이력서인데 재분석 시 점수가 크게 달라졌습니다.',
    answer: '안녕하세요, Career-wave 고객센터입니다. AI 분석 모델이 5월 22일에 업데이트되어 분석 기준이 일부 변경되었습니다. 변경된 기준은 공지사항에서 확인하실 수 있습니다. 추가 문의 사항이 있으시면 언제든지 남겨주세요.',
  },
  {
    id: 2,
    category: '구독/결제',
    title: '프리미엄 구독 중인데 AI 면접이 제한된다고 나와요',
    createdAt: '2025-05-23',
    status: '처리 중',
    hasAnswer: false,
    preview: '어제부터 갑자기 AI 면접 횟수 제한 안내가 표시됩니다.',
  },
  {
    id: 3,
    category: '계정',
    title: '이메일 변경 후 인증 메일이 오지 않아요',
    createdAt: '2025-05-20',
    status: '답변 완료',
    hasAnswer: true,
    preview: '이메일 주소를 변경했는데 인증 메일이 오지 않습니다.',
    answer: '안녕하세요. 인증 메일은 발송 후 최대 5분이 소요될 수 있습니다. 스팸 폴더를 확인해 주시고, 5분 이후에도 오지 않는다면 마이페이지에서 재발송 버튼을 눌러주세요. 그래도 해결되지 않으면 다시 문의 주세요.',
  },
  {
    id: 4,
    category: '채용 공고',
    title: '특정 공고가 마감됐는데 아직 노출되고 있어요',
    createdAt: '2025-05-18',
    status: '답변 완료',
    hasAnswer: true,
    preview: '토스 채용 공고 중 이미 마감된 공고가 계속 보입니다.',
    answer: '불편을 드려 죄송합니다. 해당 공고는 원본 채용 사이트의 상태를 반영하는 데 최대 24시간이 소요될 수 있습니다. 공고를 즉시 비활성화 처리해 드리겠습니다.',
  },
  {
    id: 5,
    category: '기타',
    title: '서비스 이용 중 오류 화면이 계속 표시됩니다',
    createdAt: '2025-05-10',
    status: '접수',
    hasAnswer: false,
    preview: '문서 분석 페이지에서 500 오류가 발생합니다.',
  },
];

const STATUS_CONFIG: Record<InquiryStatus, { icon: ReactNode; cls: string }> = {
  '접수':    { icon: <AlertCircle size={12} />,  cls: 'iq-status--pending'     },
  '처리 중': { icon: <Clock size={12} />,        cls: 'iq-status--processing'  },
  '답변 완료':{ icon: <CheckCircle size={12} />, cls: 'iq-status--done'        },
};

const CATEGORIES = ['전체', 'AI 이력서 분석', 'AI 면접', '구독/결제', '계정', '채용 공고', '기타'];

interface InquiryDetailModalProps {
  inquiry: Inquiry;
  onClose: () => void;
}

function InquiryDetailModal({ inquiry, onClose }: InquiryDetailModalProps) {
  const cfg = STATUS_CONFIG[inquiry.status];
  return (
    <div className="iq-modal-backdrop" onClick={onClose}>
      <div className="iq-modal" onClick={e => e.stopPropagation()}>
        <div className="iq-modal__header">
          <div className="iq-modal__title-wrap">
            <span className="iq-cat-badge">{inquiry.category}</span>
            <span className={`iq-status ${cfg.cls}`}>{cfg.icon} {inquiry.status}</span>
          </div>
          <h2 className="iq-modal__title">{inquiry.title}</h2>
          <p className="iq-modal__date">{inquiry.createdAt} 접수</p>
        </div>

        <div className="iq-modal__section">
          <p className="iq-modal__section-label">문의 내용</p>
          <p className="iq-modal__content">{inquiry.preview}</p>
        </div>

        {inquiry.hasAnswer && inquiry.answer && (
          <div className="iq-modal__section iq-modal__section--answer">
            <p className="iq-modal__section-label">답변</p>
            <p className="iq-modal__content">{inquiry.answer}</p>
          </div>
        )}

        {!inquiry.hasAnswer && (
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
  const navigate   = useNavigate();
  const [category, setCategory]   = useState('전체');
  const [selected, setSelected]   = useState<Inquiry | null>(null);

  const filtered = MOCK_INQUIRIES.filter(i =>
    category === '전체' || i.category === category
  );

  return (
    <div className="iq-page">
      <div className="iq-header">
        <span className="iq-eyebrow">1:1 문의</span>
        <h1 className="iq-header__title">나의 문의 내역</h1>
        <p className="iq-header__desc">접수된 문의와 답변 현황을 확인하세요.</p>
      </div>

      <div className="iq-toolbar">
        <div className="iq-cats">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`iq-cat${category === c ? ' iq-cat--on' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <button className="iq-write-btn" onClick={() => navigate('/support/inquiry/create')}>
          <Plus size={14} /> 문의하기
        </button>
      </div>

      <div className="iq-list">
        {filtered.length === 0 ? (
          <div className="iq-empty">
            <MessageSquare size={36} />
            <p>문의 내역이 없습니다.</p>
            <button className="iq-empty-btn" onClick={() => navigate('/support/inquiry/create')}>
              첫 문의 작성하기
            </button>
          </div>
        ) : (
          filtered.map(i => {
            const cfg = STATUS_CONFIG[i.status];
            return (
              <div key={i.id} className="iq-item" onClick={() => setSelected(i)}>
                <div className="iq-item__left">
                  <span className="iq-cat-badge">{i.category}</span>
                  <MessageSquare size={14} className="iq-item__icon" />
                  <div className="iq-item__info">
                    <span className="iq-item__title">{i.title}</span>
                    <span className="iq-item__preview">{i.preview}</span>
                  </div>
                </div>
                <div className="iq-item__right">
                  <span className={`iq-status ${cfg.cls}`}>{cfg.icon} {i.status}</span>
                  <span className="iq-item__date">{i.createdAt}</span>
                  <ChevronRight size={14} className="iq-item__arrow" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {selected && (
        <InquiryDetailModal inquiry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
