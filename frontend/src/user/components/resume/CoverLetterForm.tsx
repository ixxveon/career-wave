import { Building2, Briefcase, Plus, X } from 'lucide-react';
import type { CoverLetterFormItem } from '../../hooks/resume/useCoverLetterForm';
import { MAX_COVER_LETTER_ITEMS, MAX_ANSWER_LENGTH } from '../../utils/resume/validation';
import './CoverLetterForm.css';

interface CoverLetterFormProps {
  company: string;
  job: string;
  items: CoverLetterFormItem[];
  disabled?: boolean;
  onCompanyChange: (value: string) => void;
  onJobChange: (value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof CoverLetterFormItem, value: string) => void;
}

/**
 * 자기소개서 입력 폼 컴포넌트
 * - 지원 회사 / 직무 입력
 * - 동적 문항 추가/삭제 (최대 5개)
 * - 답변 실시간 글자 수 카운터
 */
export default function CoverLetterForm({
  company,
  job,
  items,
  disabled = false,
  onCompanyChange,
  onJobChange,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: CoverLetterFormProps) {
  return (
    <div className="clf">
      {/* 지원 회사 / 직무 */}
      <div className="clf-meta-row">
        <div className="clf-meta-field">
          <label className="clf-meta-label">
            <Building2 size={13} aria-hidden="true" /> 지원 회사
          </label>
          <input
            className="clf-input"
            placeholder="ex) 카카오, 네이버, 토스"
            value={company}
            onChange={e => onCompanyChange(e.target.value)}
            disabled={disabled}
            aria-label="지원 회사명"
          />
        </div>
        <div className="clf-meta-field">
          <label className="clf-meta-label">
            <Briefcase size={13} aria-hidden="true" /> 지원 직무
          </label>
          <input
            className="clf-input"
            placeholder="ex) 백엔드 개발자, 데이터 분석가"
            value={job}
            onChange={e => onJobChange(e.target.value)}
            disabled={disabled}
            aria-label="지원 직무명"
          />
        </div>
      </div>

      {/* 문항 블록 */}
      {items.map((item, i) => (
        <div key={i} className="clf-qblock">
          <div className="clf-qblock__header">
            <span className="clf-qblock__num">문항 {i + 1}</span>
            {items.length > 1 && (
              <button
                type="button"
                className="clf-qblock__remove"
                onClick={() => onRemoveItem(i)}
                disabled={disabled}
                aria-label={`${i + 1}번 문항 삭제`}
              >
                <X size={12} aria-hidden="true" /> 삭제
              </button>
            )}
          </div>

          <input
            className="clf-input"
            placeholder="문항을 입력하세요. ex) 지원 동기 및 입사 후 포부를 서술하시오."
            value={item.question}
            onChange={e => onUpdateItem(i, 'question', e.target.value)}
            disabled={disabled}
            aria-label={`${i + 1}번 문항`}
          />

          <div className="clf-textarea-wrap">
            <textarea
              className="clf-input clf-input--textarea"
              placeholder="답변을 입력하세요."
              rows={5}
              value={item.answer}
              onChange={e => onUpdateItem(i, 'answer', e.target.value)}
              disabled={disabled}
              aria-label={`${i + 1}번 답변 (최대 ${MAX_ANSWER_LENGTH}자)`}
            />
            <span
              className={`clf-char-count${item.answer.length >= 900 ? ' clf-char-count--warn' : ''}`}
              aria-live="polite"
              aria-label={`현재 ${item.answer.length}자 입력됨`}
            >
              {item.answer.length} / {MAX_ANSWER_LENGTH}자
            </span>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="clf-add-btn"
        onClick={onAddItem}
        disabled={disabled || items.length >= MAX_COVER_LETTER_ITEMS}
        aria-label={`문항 추가 (현재 ${items.length}/${MAX_COVER_LETTER_ITEMS})`}
      >
        <Plus size={15} aria-hidden="true" />
        문항 추가 ({items.length}/{MAX_COVER_LETTER_ITEMS})
      </button>
    </div>
  );
}
