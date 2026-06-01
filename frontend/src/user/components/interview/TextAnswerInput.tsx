import { useState, useRef, memo } from 'react';
import { Send, Mic } from 'lucide-react';
import './TextAnswerInput.css';

interface TextAnswerInputProps {
  disabled?: boolean;
  onSubmit: (text: string) => void;
  onSwitchToVoice: () => void;
}

/**
 * 텍스트 답변 입력창
 * - 중복 요청 방지: isSubmitting ref로 제어
 * - Enter 전송 / Shift+Enter 줄바꿈
 * - memo — 부모 리렌더링 시 불필요한 재렌더링 방지
 */
const TextAnswerInput = memo(function TextAnswerInput({
  disabled = false,
  onSubmit,
  onSwitchToVoice,
}: TextAnswerInputProps) {
  const [input, setInput] = useState('');
  const isSubmittingRef   = useRef(false);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    if (disabled || isSubmittingRef.current || !input.trim()) return;
    isSubmittingRef.current = true;
    onSubmit(input.trim());
    setInput('');
    // 제출 후 짧은 딜레이로 중복 요청 방지
    setTimeout(() => { isSubmittingRef.current = false; }, 500);
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
          disabled={disabled}
          autoFocus
        />
        <button
          className="tai__send"
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
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
        disabled={disabled}
      >
        <Mic size={13} /> 음성으로 답변하기
      </button>
    </div>
  );
});

export default TextAnswerInput;
