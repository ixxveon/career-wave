import { useRef } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import './ResumeUpload.css';

interface ResumeUploadProps {
  file: File | null;
  error: string | null;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
}

/**
 * 이력서 파일 드롭존 컴포넌트
 * - 드래그 앤 드롭 + 클릭 업로드
 * - 파일 선택 후 카드 형태로 표시
 * - 에러 메시지 인라인 표시
 */
export default function ResumeUpload({
  file,
  error,
  disabled = false,
  onFileSelect,
  onFileRemove,
}: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) onFileSelect(selected);
    // 같은 파일 재선택 허용을 위해 value 초기화
    e.target.value = '';
  }

  return (
    <div className="ru">
      <div
        className={[
          'ru-dropzone',
          file ? 'ru-dropzone--filled' : '',
          disabled ? 'ru-dropzone--disabled' : '',
        ].filter(Boolean).join(' ')}
        onDragOver={e => { e.preventDefault(); }}
        onDrop={handleDrop}
        onClick={() => !file && !disabled && inputRef.current?.click()}
        role="button"
        aria-label="이력서 파일 업로드 영역. 클릭하거나 파일을 드래그하세요."
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          aria-hidden="true"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={disabled}
        />

        {file ? (
          <div className="ru-file-card">
            <div className="ru-file-card__icon" aria-hidden="true">
              <FileText size={28} />
            </div>
            <div className="ru-file-card__info">
              <p className="ru-file-card__name">{file.name}</p>
              <p className="ru-file-card__size">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              className="ru-file-card__remove"
              aria-label={`${file.name} 파일 삭제`}
              onClick={e => { e.stopPropagation(); onFileRemove(); }}
              disabled={disabled}
            >
              <X size={14} aria-hidden="true" /> 삭제
            </button>
          </div>
        ) : (
          <>
            <Upload size={32} className="ru-dropzone__icon" aria-hidden="true" />
            <p className="ru-dropzone__label">파일을 드래그하거나 클릭해서 업로드</p>
            <p className="ru-dropzone__hint">PDF, DOC, DOCX · 최대 10MB</p>
          </>
        )}
      </div>

      {error && (
        <p className="ru-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
