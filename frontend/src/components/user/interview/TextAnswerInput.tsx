import { useState, useRef, memo } from 'react';
import { Send, Mic } from 'lucide-react';
import './TextAnswerInput.css';

interface TextAnswerInputProps {
  disabled?: boolean;
  /** Promise를 반환해야 lock이 응답 완료 후 해제됨 */
  onSubmit: (text: string) => Promise<void>;
  onSwitchToVoice: () => void;
}

/**
 * 텍스트 답변 입력창
 * - 중복 요청 방지: isSubmittingRef + onSubmit Promise finally로 제어
 * - Enter 전송 / Shift+Enter 줄바꿈
 * - memo — 부모 리렌더링 시 불필요한 재렌더링 방지
 */
const TextAnswerInput = memo(function TextAnswerInput({
  disabled = false,
  onSubmit,
  onSwitchToVoice,
}: TextAnswerInputProps) {
  const [input, setInput]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    if (disabled || isSubmitting || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setIsSubmitting(true);
    try {
      await onSubmit(text);
    } finally {
      // API 응답 완료 후 lock 해제 — 고정 타이머 방식 제거
      setIsSubmitting(false);
    }
  }

  return (
    <div className="tai">
      <div className="tai__bar">
        <textarea
          ref={textareaRef}
          className="tai__input"
          placeholder="답변을 입력하세요 (Enter 전송 / Shift+Enter 줄바꿈)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={3}
          disabled={disabled || isSubmitting}
          autoFocus
        />
        <button
          className="tai__send"
          onClick={handleSubmit}
          disabled={disabled || isSubmitting || !input.trim()}
          type="button"
          aria-label="답변 전송"
        >
          <Send size={18} />
        </button>
      </div>
      <button
        className="tai__switch"
        onClick={onSwitchToVoice}
        type="button"
        disabled={disabled || isSubmitting}
      >
        <Mic size={13} /> 음성으로 답변하기
      </button>
    </div>
  );
});

export default TextAnswerInput;
