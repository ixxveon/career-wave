import { FileText, Mic, Volume2, AlertCircle, Loader2 } from 'lucide-react';
import { SESSION_TYPE } from '../../../types/user/interview';
import type { SessionType, Resume, MicStatus } from '../../../types/user/interview';
import PreflightCheck from './PreflightCheck';
import type { CheckStatus } from '../../../hooks/user/interview/usePreflightCheck';
import './InterviewSetup.css';

const JOB_OPTIONS = [
  '백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자',
  '데이터 엔지니어', 'DevOps',
];

interface InterviewSetupProps {
  // 이력서
  resume:        Resume | null;
  resumeLoading: boolean;

  // 설정 값
  job:           string;
  company:       string;
  sessionType:   SessionType;

  // 사전 진단
  micCheckStatus:     CheckStatus;
  networkCheckStatus: CheckStatus;
  onCheckMic:         () => void;
  onCheckNetwork:     () => void;

  // 디바이스 테스트
  micStatus:    MicStatus;
  audioPlaying: boolean;
  onMicTest:    () => void;
  onAudioTest:  () => void;

  // 콜백
  onJobChange:         (job: string) => void;
  onCompanyChange:     (company: string) => void;
  onSessionTypeChange: (type: SessionType) => void;
  onStart:             () => void;

  isLoading: boolean;
  apiError:  string | null;
}

function InterviewSetup({
  resume, resumeLoading,
  job, company, sessionType,
  micCheckStatus, networkCheckStatus, onCheckMic, onCheckNetwork,
  micStatus, audioPlaying, onMicTest, onAudioTest,
  onJobChange, onCompanyChange, onSessionTypeChange, onStart,
  isLoading, apiError,
}: InterviewSetupProps) {
  return (
    <div className="is">
      <div className="is__card">
        <p className="is__eyebrow">AI INTERVIEW</p>
        <h1 className="is__title">AI 텍스트 · 음성 면접</h1>
        <p className="is__desc">
          타이핑 또는 마이크로 답변하세요.<br />
          이력서 분석 결과를 기반으로 AI 면접관이 맞춤 질문을 드립니다.
        </p>

        {/* 대표 이력서 */}
        <div className={`is__resume${!resume && !resumeLoading ? ' is__resume--warn' : ''}`}>
          {resumeLoading
            ? <><Loader2 size={14} className="is__spin" /> 대표 이력서 불러오는 중...</>
            : resume
            ? <><FileText size={14} /><span>{resume.fileName}</span><span className="is__resume-badge">연결됨</span></>
            : <><AlertCircle size={14} /><span className="is__resume-none">서류 분석 페이지에서 이력서를 업로드한 뒤 면접을 시작해주세요.</span></>
          }
        </div>

        {/* 면접 유형 선택 */}
        <div className="is__section">
          <span className="is__label" id="is-session-type-label">면접 방식</span>
          <div className="is__type-btns" role="group" aria-labelledby="is-session-type-label">
            <button
              className={`is__type-btn${sessionType === SESSION_TYPE.VOICE ? ' is__type-btn--on' : ''}`}
              onClick={() => onSessionTypeChange(SESSION_TYPE.VOICE)}
              type="button"
            >
              <Mic size={14} /> 음성 면접
            </button>
            <button
              className={`is__type-btn${sessionType === SESSION_TYPE.TEXT ? ' is__type-btn--on' : ''}`}
              onClick={() => onSessionTypeChange(SESSION_TYPE.TEXT)}
              type="button"
            >
              <FileText size={14} /> 텍스트 면접
            </button>
          </div>
        </div>

        {/* 목표 직무 */}
        <div className="is__section">
          <span className="is__label" id="is-job-label">목표 직무</span>
          <div className="is__chips" role="group" aria-labelledby="is-job-label">
            {JOB_OPTIONS.map(j => (
              <button
                key={j}
                className={`is__chip${job === j ? ' is__chip--on' : ''}`}
                onClick={() => onJobChange(j)}
                type="button"
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        {/* 타겟 기업 */}
        <div className="is__section">
          <label className="is__label" htmlFor="is-company">타겟 기업</label>
          <input
            id="is-company"
            className="is__input"
            placeholder="ex) 토스, 카카오, 네이버"
            value={company}
            onChange={e => onCompanyChange(e.target.value)}
          />
        </div>

        {/* 사전 진단 */}
        <PreflightCheck
          micStatus={micCheckStatus}
          networkStatus={networkCheckStatus}
          onCheckMic={onCheckMic}
          onCheckNetwork={onCheckNetwork}
        />

        {/* 디바이스 테스트 */}
        <div className="is__device">
          <div className="is__device-item">
            <button
              className={`is__device-btn${micStatus === 'ok' ? ' is__device-btn--ok' : micStatus === 'error' ? ' is__device-btn--err' : ''}`}
              onClick={onMicTest}
              disabled={micStatus === 'testing'}
              type="button"
            >
              {micStatus === 'testing' ? <Loader2 size={14} className="is__spin" /> : <Mic size={14} />}
              {micStatus === 'idle'    && '마이크 테스트'}
              {micStatus === 'testing' && '확인 중...'}
              {micStatus === 'ok'      && '마이크 연결됨'}
              {micStatus === 'error'   && '권한 오류'}
            </button>
            {micStatus === 'ok' && (
              <div className="is__wave">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className="is__wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
            {micStatus === 'error' && (
              <p className="is__device-hint">브라우저 설정에서 마이크 권한을 허용해주세요.</p>
            )}
          </div>
          <div className="is__device-item">
            <button
              className={`is__device-btn${audioPlaying ? ' is__device-btn--playing' : ''}`}
              onClick={onAudioTest}
              disabled={audioPlaying}
              type="button"
            >
              <Volume2 size={14} />
              {audioPlaying ? '재생 중...' : '스피커 테스트'}
            </button>
          </div>
        </div>

        {apiError && (
          <p className="is__api-error"><AlertCircle size={13} /> {apiError}</p>
        )}

        {/* 사전 진단 미통과 안내 */}
        {networkCheckStatus === 'fail' && (
          <p className="is__preflight-warn"><AlertCircle size={13} /> 네트워크 연결 진단을 통과해야 면접을 시작할 수 있습니다.</p>
        )}
        {sessionType === SESSION_TYPE.VOICE && micCheckStatus === 'fail' && (
          <p className="is__preflight-warn"><AlertCircle size={13} /> 마이크 권한 진단을 통과해야 음성 면접을 시작할 수 있습니다.</p>
        )}

        <button
          className="is__start-btn"
          onClick={onStart}
          disabled={
            !company.trim() ||
            isLoading ||
            resumeLoading ||
            networkCheckStatus === 'fail' ||
            (sessionType === SESSION_TYPE.VOICE && micCheckStatus === 'fail')
          }
          type="button"
        >
          {isLoading
            ? <><Loader2 size={15} className="is__spin" /> 세션 생성 중...</>
            : <><Mic size={15} /> AI 면접 시작하기</>
          }
        </button>
      </div>
    </div>
  );
}

export default InterviewSetup;
