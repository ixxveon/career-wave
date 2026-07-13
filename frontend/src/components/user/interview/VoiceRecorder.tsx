import { Mic, MicOff, Keyboard, Loader2 } from 'lucide-react';
import type { RecorderStatus, RecorderError } from '../../../hooks/user/interview/useAudioRecorder';
import './VoiceRecorder.css';

interface VoiceRecorderProps {
  status: RecorderStatus;
  error: RecorderError | null;
  /** FastAPI WS STT_RESULT로 수신한 실시간 변환 텍스트 (Phase 4 연동 전까지 빈 문자열) */
  sttLive: string;
  /** TTS 재생 중 여부 — true면 마이크 버튼 비활성화 */
  ttsPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onSwitchToText: () => void;
}

const ERROR_MESSAGES: Record<RecorderError, string> = {
  permission_denied: '마이크 권한을 허용해주세요. 브라우저 설정에서 변경할 수 있습니다.',
  not_supported:     '이 브라우저는 음성 녹음을 지원하지 않습니다. 키보드로 답변해주세요.',
  unknown:           '마이크 오류가 발생했습니다. 키보드로 답변해주세요.',
};

function VoiceRecorder({ status, error, sttLive, ttsPlaying, onStart, onStop, onSwitchToText }: VoiceRecorderProps) {
  const isRecording  = status === 'recording';
  const isRequesting = status === 'requesting';
  const isError      = status === 'error';
  const isMicDisabled = isRequesting || ttsPlaying;

  function handleMicClick() {
    if (isRecording)   { onStop();  return; }
    if (isMicDisabled) return;
    onStart();
  }

  return (
    <div className="vr">
      {/* 마이크 버튼 */}
      <button
        className={`vr__mic${isRecording ? ' vr__mic--on' : ''}${isError ? ' vr__mic--err' : ''}${ttsPlaying && !isRecording ? ' vr__mic--tts' : ''}`}
        onClick={handleMicClick}
        disabled={isMicDisabled}
        type="button"
        aria-label={isRecording ? '녹음 중지 및 전송' : '음성 답변 시작'}
      >
        {isRequesting
          ? <Loader2 size={32} className="vr__spin" />
          : isRecording
          ? <MicOff size={32} />
          : <Mic size={32} />
        }
        {isRecording && <span className="vr__ring" aria-hidden="true" />}
      </button>

      {/* 상태 안내 */}
      <div className="vr__hint-wrap">
        {isRecording ? (
          <>
            <span className="vr__hint vr__hint--on">
              <span className="vr__dot" />
              녹음 중 · 버튼을 다시 누르면 전송됩니다
            </span>
            {sttLive && <p className="vr__stt-preview">{sttLive}</p>}
          </>
        ) : ttsPlaying ? (
          <span className="vr__hint vr__hint--tts">AI 면접관이 말하는 중입니다. 잠시 기다려 주세요.</span>
        ) : isRequesting ? (
          <span className="vr__hint">마이크 권한 확인 중...</span>
        ) : isError && error ? (
          <p className="vr__error" role="alert">{ERROR_MESSAGES[error]}</p>
        ) : (
          <span className="vr__hint">마이크 버튼을 눌러 음성으로 답변하세요</span>
        )}
      </div>

      {/* 키보드 전환 버튼 */}
      <button
        className="vr__switch"
        onClick={onSwitchToText}
        type="button"
      >
        <Keyboard size={13} /> 키보드로 답변하기
      </button>
    </div>
  );
}

export default VoiceRecorder;
