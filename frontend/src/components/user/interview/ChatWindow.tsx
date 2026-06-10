import { useRef, useEffect, memo } from 'react';
import { Loader2, Mic } from 'lucide-react';
import type { Message } from '../../../types/user/interview';
import './ChatWindow.css';

interface ChatWindowProps {
  messages: Message[];
  isTyping: boolean;
  /** LLM_STREAM 스트리밍 중 텍스트 — isFinal 전까지 말풍선에 표시 */
  streamingText: string;
}

/**
 * 실시간 대화 스크립트 뷰
 * - aria-live="polite" — 메시지 추가 시 스크린 리더 알림 (constitution.md §7)
 * - memo — 부모 리렌더링 시 불필요한 재렌더링 방지
 */
const ChatWindow = memo(function ChatWindow({
  messages,
  isTyping,
  streamingText,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamingText]);

  return (
    <div
      className="cw"
      role="log"
      aria-live="polite"
      aria-label="면접 대화 내용"
    >
      {messages.map(msg => {
        if (msg.role === 'notice') {
          return (
            <div key={msg.id} className="cw-msg cw-msg--notice">
              <span className="cw-notice-chip">{msg.text}</span>
            </div>
          );
        }

        return (
          <div key={msg.id} className={`cw-msg cw-msg--${msg.role}`}>
            {msg.role === 'ai' && <div className="cw-avatar">AI</div>}
            <div className={`cw-bubble${msg.isVoice ? ' cw-bubble--voice' : ''}`}>
              {msg.isVoice ? (
                <>
                  <span className="cw-voice-label">
                    {msg.isPending
                      ? <><Loader2 size={11} className="cw-spin" /> 음성 분석 중...</>
                      : <><Mic size={11} /> 음성 답변</>
                    }
                  </span>
                  {!msg.isPending && (
                    msg.text
                      ? <div className="cw-voice-text">
                          {msg.text.split('\n').map((line, j) => <p key={j}>{line}</p>)}
                        </div>
                      : <p className="cw-voice-empty">음성이 감지되지 않았습니다</p>
                  )}
                </>
              ) : (
                msg.text.split('\n').map((line, j) => <p key={j}>{line}</p>)
              )}
            </div>
          </div>
        );
      })}

      {/* LLM 스트리밍 중 타이핑 말풍선 */}
      {streamingText && (
        <div className="cw-msg cw-msg--ai">
          <div className="cw-avatar">AI</div>
          <div className="cw-bubble cw-bubble--streaming">
            {streamingText.split('\n').map((line, j) => <p key={j}>{line}</p>)}
          </div>
        </div>
      )}

      {/* AI 응답 대기 중 점 애니메이션 */}
      {isTyping && !streamingText && (
        <div className="cw-msg cw-msg--ai">
          <div className="cw-avatar">AI</div>
          <div className="cw-bubble cw-bubble--typing">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
});

export default ChatWindow;
