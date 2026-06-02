export interface FileValidationResult {
  valid: boolean;
  message?: string;
}

const MAX_EMPLOYMENT_CERTIFICATE_SIZE = 5 * 1024 * 1024;

export function validateEmploymentCertificateFile(file: File): FileValidationResult {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  const hasPdfMimeType = file.type === 'application/pdf';

  if (!hasPdfExtension || !hasPdfMimeType) {
    return {
      valid: false,
      message: '재직증명서는 PDF 파일만 업로드할 수 있습니다.',
    };
  }

  if (file.size > MAX_EMPLOYMENT_CERTIFICATE_SIZE) {
    return {
      valid: false,
      message: '재직증명서는 5MB 이하 파일만 업로드할 수 있습니다.',
    };
  }

  return { valid: true };
}
