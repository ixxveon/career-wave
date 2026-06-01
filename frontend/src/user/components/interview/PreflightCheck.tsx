import { Mic, Wifi, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import type { CheckStatus } from '../../hooks/interview/usePreflightCheck';
import './PreflightCheck.css';

interface PreflightCheckProps {
  micStatus:     CheckStatus;
  networkStatus: CheckStatus;
  onCheckMic:    () => void;
  onCheckNetwork: () => void;
}

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  idle:     <span className="pfc__dot" />,
  checking: <Loader2 size={14} className="pfc__spin" />,
  pass:     <CheckCircle2 size={14} className="pfc__icon pfc__icon--pass" />,
  fail:     <XCircle     size={14} className="pfc__icon pfc__icon--fail" />,
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  idle:     '확인 전',
  checking: '확인 중...',
  pass:     '정상',
  fail:     '실패',
};

/**
 * 면접 진입 전 사전 진단 UI
 * usePreflightCheck 결과를 시각화
 */
function PreflightCheck({
  micStatus,
  networkStatus,
  onCheckMic,
  onCheckNetwork,
}: PreflightCheckProps) {
  return (
    <div className="pfc">
      <p className="pfc__title"><Wifi size={13} /> 면접 환경 진단</p>
      <div className="pfc__list">

        {/* 마이크 */}
        <div className="pfc__item">
          <span className="pfc__label"><Mic size={13} /> 마이크</span>
          <div className="pfc__status">
            {STATUS_ICON[micStatus]}
            <span className={`pfc__text pfc__text--${micStatus}`}>
              {STATUS_LABEL[micStatus]}
            </span>
          </div>
          {(micStatus === 'idle' || micStatus === 'fail') && (
            <button className="pfc__btn" onClick={onCheckMic} type="button">
              {micStatus === 'fail' ? <RefreshCw size={12} /> : <Mic size={12} />}
              {micStatus === 'fail' ? '재시도' : '테스트'}
            </button>
          )}
          {micStatus === 'fail' && (
            <p className="pfc__hint">브라우저 설정에서 마이크 권한을 허용해주세요.</p>
          )}
        </div>

        {/* 네트워크 */}
        <div className="pfc__item">
          <span className="pfc__label"><Wifi size={13} /> 서버 연결</span>
          <div className="pfc__status">
            {STATUS_ICON[networkStatus]}
            <span className={`pfc__text pfc__text--${networkStatus}`}>
              {STATUS_LABEL[networkStatus]}
            </span>
          </div>
          {(networkStatus === 'idle' || networkStatus === 'fail') && (
            <button className="pfc__btn" onClick={onCheckNetwork} type="button">
              {networkStatus === 'fail' ? <RefreshCw size={12} /> : <Wifi size={12} />}
              {networkStatus === 'fail' ? '재시도' : '테스트'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default PreflightCheck;
