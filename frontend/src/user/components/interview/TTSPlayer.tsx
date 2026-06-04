import type { TTSQueueStatus } from '../../hooks/interview/useTTSQueue';
import './TTSPlayer.css';

interface TTSPlayerProps {
  status: TTSQueueStatus;
}

const STATUS_LABEL: Record<TTSQueueStatus, string> = {
  idle:    'AI 면접관 대기 중',
  loading: '음성 준비 중...',
  playing: 'AI 면접관 말하는 중',
};

function TTSPlayer({ status }: TTSPlayerProps) {
  return (
    <div className={`tts-player tts-player--${status}`} aria-live="polite" aria-label={STATUS_LABEL[status]}>
      <div className="tts-player__waves" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => (
          <span key={i} className="tts-player__bar" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <span className="tts-player__label">{STATUS_LABEL[status]}</span>
    </div>
  );
}

export default TTSPlayer;
