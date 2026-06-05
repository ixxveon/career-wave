import { BadgeCheck, Building2, FileText, ShieldCheck, UserRound } from 'lucide-react';
import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useCompanyRegisterForm } from '../../hooks/member/useCompanyRegisterForm';
import { formatRemaining } from '../../utils/member/recoveryView';
import type { CompanyTermDetails } from '../../utils/member/registerTerms';
import { LOGIN_ID_CHECK_STATE } from '../../utils/member/validation';
import { AuthButtonGroup, Field, SelectInput, StatusPill, TextInput } from './RegisterFormPrimitives';

type CompanyTermsValues = {
  service: boolean;
  companyVerification: boolean;
  sms: boolean;
  privacy: boolean;
  marketing: boolean;
};

type CompanyTermKey = keyof CompanyTermsValues;

type CompanyTermsProps = {
  values: CompanyTermsValues;
  onChange: Dispatch<SetStateAction<CompanyTermsValues>>;
  termDetails: CompanyTermDetails;
};

export function CompanyRegisterForm({
  companyTypes,
  termDetails,
}: {
  companyTypes: string[];
  termDetails: CompanyTermDetails;
}) {
  const {
    checkLoginId,
    confirmEmailCode,
    confirmPhoneCode,
    emailExpiresIn,
    emailResendIn,
    employmentCertificate,
    employmentCertificateError,
    employmentCertificateInputRef,
    fieldErrors,
    form,
    formMessage,
    handleCertificateChange,
    handleConfirmEmailCode,
    handleConfirmPhoneCode,
    handleLoginIdCheck,
    handleSendEmailCode,
    handleSendPhoneCode,
    handleSubmit,
    isSubmitGuideOpen,
    loginIdState,
    passwordMismatch,
    phoneExpiresIn,
    phoneResendIn,
    registerCompany,
    sendEmailCode,
    sendPhoneCode,
    setIsSubmitGuideOpen,
    setTerms,
    successMessage,
    terms,
    update,
    uploadEmploymentCertificate,
    verification,
  } = useCompanyRegisterForm();

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit();
  };

  return (
    <>
      <form className="cw-register-form" onSubmit={handleFormSubmit}>
        <section className="cw-register-section">
          <div className="cw-register-section__title">
            <Building2 size={22} />
            <div>
              <h2>기업정보</h2>
              <p>채용 공고와 인재 매칭에 표시될 기업 기본 정보입니다.</p>
            </div>
          </div>
          <div className="cw-register-grid">
            <Field label="기업형태" required>
              <SelectInput value={form.companyType} onChange={(value) => update('companyType', value)} placeholder="기업형태 선택" options={companyTypes} />
            </Field>
            <Field label="사업자등록번호" required>
              <TextInput value={form.businessNumber} onChange={(value) => update('businessNumber', value)} placeholder="사업자등록번호('-' 없이 숫자만 입력)" />
            </Field>
            <Field label="회사명" required>
              <TextInput value={form.companyName} onChange={(value) => update('companyName', value)} placeholder="회사명 입력" />
            </Field>
            <Field label="대표자명" required>
              <TextInput value={form.ceoName} onChange={(value) => update('ceoName', value)} placeholder="대표자명 입력" />
            </Field>
            <Field label="회사주소" required wide>
              <AuthButtonGroup
                input={<TextInput value={form.address} onChange={(value) => update('address', value)} placeholder="주소를 직접 입력해주세요 (주소 검색 준비 중)" />}
                buttonLabel="주소 검색"
                disabled
                onClick={() => {}}
              />
            </Field>
            <Field label="상세주소" wide>
              <TextInput value={form.addressDetail} onChange={(value) => update('addressDetail', value)} placeholder="상세주소 입력" />
            </Field>
            <label className="cw-register-check cw-register-field--wide">
              <input type="checkbox" checked={form.isAgency} onChange={() => update('isAgency', !form.isAgency)} />
              <span>파견/도급/채용대행 기업입니다.</span>
            </label>
          </div>
        </section>

        <section className="cw-register-section">
          <div className="cw-register-section__title">
            <ShieldCheck size={22} />
            <div>
              <h2>기업인증</h2>
              <p>가입 심사 단계에서 확인할 사업자등록증명원 발급번호를 입력해주세요.</p>
            </div>
          </div>
          <Field label="사업자등록증명원 발급번호" required wide>
            <TextInput value={form.certificateNumber} onChange={(value) => update('certificateNumber', value)} placeholder="사업자등록증명원 발급번호 입력" />
            {fieldErrors.certificateNumber && <p className="cw-register-error">{fieldErrors.certificateNumber}</p>}
          </Field>
        </section>

        <section className="cw-register-section">
          <div className="cw-register-section__title">
            <UserRound size={22} />
            <div>
              <h2>인사담당자 정보</h2>
              <p>기업 계정을 관리할 담당자 정보를 입력해주세요.</p>
            </div>
          </div>
          <div className="cw-register-grid">
            <Field label="아이디" required>
              <AuthButtonGroup
                input={<TextInput value={form.managerId} onChange={(value) => update('managerId', value)} placeholder="아이디(영문, 숫자 조합 6~20자)" />}
                buttonLabel={checkLoginId.isPending || loginIdState === LOGIN_ID_CHECK_STATE.CHECKING ? '확인 중' : '중복 확인'}
                disabled={checkLoginId.isPending || loginIdState === LOGIN_ID_CHECK_STATE.CHECKING}
                onClick={handleLoginIdCheck}
              />
              <StatusPill active={loginIdState === LOGIN_ID_CHECK_STATE.AVAILABLE}>사용 가능한 아이디입니다.</StatusPill>
              {fieldErrors.loginId && <p className="cw-register-error">{fieldErrors.loginId}</p>}
            </Field>
            <Field label="담당자명" required>
              <TextInput value={form.managerName} onChange={(value) => update('managerName', value)} placeholder="담당자명(실명)" />
            </Field>
            <Field label="비밀번호" required>
              <TextInput type="password" value={form.managerPassword} onChange={(value) => update('managerPassword', value)} placeholder="비밀번호(8~16자의 영문, 숫자, 특수기호)" />
              {fieldErrors.password && <p className="cw-register-error">{fieldErrors.password}</p>}
            </Field>
            <Field label="비밀번호 확인" required>
              <TextInput type="password" value={form.managerPasswordConfirm} onChange={(value) => update('managerPasswordConfirm', value)} placeholder="비밀번호 재입력" />
              {passwordMismatch && <p className="cw-register-error">비밀번호가 일치하지 않습니다.</p>}
              {fieldErrors.passwordConfirm && <p className="cw-register-error">{fieldErrors.passwordConfirm}</p>}
            </Field>
            <Field label="담당자 전화번호" required wide>
              <AuthButtonGroup
                input={<TextInput type="tel" value={form.managerPhone} onChange={(value) => update('managerPhone', value)} placeholder="휴대폰번호('-' 없이 숫자만 입력)" />}
                buttonLabel={sendPhoneCode.isPending ? '전송 중' : verification.phoneId ? `재전송${phoneResendIn > 0 ? ` ${formatRemaining(phoneResendIn)}` : ''}` : '인증번호 전송'}
                disabled={sendPhoneCode.isPending || phoneResendIn > 0}
                onClick={handleSendPhoneCode}
              />
              <StatusPill active={Boolean(verification.phoneId) && !verification.phoneToken && phoneExpiresIn > 0}>
                인증번호 유효 시간 {formatRemaining(phoneExpiresIn)}
              </StatusPill>
              {verification.phoneId && !verification.phoneToken && phoneExpiresIn <= 0 && (
                <p className="cw-register-error">휴대폰 인증번호가 만료되었습니다. 다시 전송해주세요.</p>
              )}
              {fieldErrors.managerPhone && <p className="cw-register-error">{fieldErrors.managerPhone}</p>}
            </Field>
            <Field label="휴대폰 인증번호" required wide>
              <AuthButtonGroup
                input={<TextInput value={form.managerPhoneCode} onChange={(value) => update('managerPhoneCode', value)} placeholder="인증번호 6자리 입력" />}
                buttonLabel={confirmPhoneCode.isPending ? '확인 중' : '인증 확인'}
                disabled={confirmPhoneCode.isPending || !verification.phoneId || phoneExpiresIn <= 0}
                onClick={handleConfirmPhoneCode}
                secondButtonLabel="재전송"
                secondDisabled={sendPhoneCode.isPending || phoneResendIn > 0}
                onSecondClick={handleSendPhoneCode}
              />
              <StatusPill active={Boolean(verification.phoneToken)}>휴대폰 인증이 완료되었습니다.</StatusPill>
              {fieldErrors.managerPhoneCode && <p className="cw-register-error">{fieldErrors.managerPhoneCode}</p>}
            </Field>
            <Field label="담당자 이메일" required wide>
              <AuthButtonGroup
                input={<TextInput type="email" value={form.managerEmail} onChange={(value) => update('managerEmail', value)} placeholder="담당자 이메일 주소 입력" />}
                buttonLabel={sendEmailCode.isPending ? '전송 중' : verification.emailId ? `재전송${emailResendIn > 0 ? ` ${formatRemaining(emailResendIn)}` : ''}` : '인증번호 전송'}
                disabled={sendEmailCode.isPending || emailResendIn > 0}
                onClick={handleSendEmailCode}
              />
              <StatusPill active={Boolean(verification.emailId) && !verification.emailToken && emailExpiresIn > 0}>
                인증번호 유효 시간 {formatRemaining(emailExpiresIn)}
              </StatusPill>
              {verification.emailId && !verification.emailToken && emailExpiresIn <= 0 && (
                <p className="cw-register-error">이메일 인증번호가 만료되었습니다. 다시 전송해주세요.</p>
              )}
              {fieldErrors.managerEmail && <p className="cw-register-error">{fieldErrors.managerEmail}</p>}
            </Field>
            <Field label="이메일 인증번호" required wide>
              <AuthButtonGroup
                input={<TextInput value={form.managerEmailCode} onChange={(value) => update('managerEmailCode', value)} placeholder="인증번호 6자리 입력" />}
                buttonLabel={confirmEmailCode.isPending ? '확인 중' : '인증 확인'}
                disabled={confirmEmailCode.isPending || !verification.emailId || emailExpiresIn <= 0}
                onClick={handleConfirmEmailCode}
                secondButtonLabel="재전송"
                secondDisabled={sendEmailCode.isPending || emailResendIn > 0}
                onSecondClick={handleSendEmailCode}
              />
              <StatusPill active={Boolean(verification.emailToken)}>이메일 인증이 완료되었습니다.</StatusPill>
              {fieldErrors.managerEmailCode && <p className="cw-register-error">{fieldErrors.managerEmailCode}</p>}
            </Field>
            <Field label="재직증명서 업로드" required wide>
              <div className="cw-register-upload">
                <div className="cw-register-upload__hint">
                  <FileText size={18} />
                  <p>인사담당자 재직 확인을 위한 PDF 파일을 업로드해 주세요.</p>
                </div>
                <div className="cw-register-inline">
                  <input className="cw-register-upload__display" placeholder="선택된 PDF 파일이 없습니다." readOnly type="text" value={employmentCertificate?.name ?? ''} />
                  <button className="cw-register-sub-button" onClick={() => employmentCertificateInputRef.current?.click()} type="button">
                    PDF 파일 선택
                  </button>
                </div>
                <input accept=".pdf,application/pdf" className="cw-register-upload__input" id="company-employment-certificate" ref={employmentCertificateInputRef} onChange={handleCertificateChange} type="file" />
                {employmentCertificateError && <p className="cw-register-error">{employmentCertificateError}</p>}
                {fieldErrors.employmentCertificate && <p className="cw-register-error">{fieldErrors.employmentCertificate}</p>}
                {verification.employmentCertificateFileId && <StatusPill active>재직증명서 업로드 준비가 완료되었습니다.</StatusPill>}
              </div>
            </Field>
          </div>
        </section>

        <section className="cw-register-section">
          <div className="cw-register-section__title">
            <BadgeCheck size={22} />
            <div>
              <h2>약관 동의</h2>
              <p>필수 약관에 동의하면 기업회원 가입을 완료할 수 있습니다.</p>
            </div>
          </div>
          <CompanyTerms termDetails={termDetails} values={terms} onChange={setTerms} />
          {fieldErrors.terms && <p className="cw-register-error">{fieldErrors.terms}</p>}
        </section>

        {formMessage && <p className="cw-register-error">{formMessage}</p>}
        {successMessage && <StatusPill active>{successMessage}</StatusPill>}

        <button className="cw-register-submit" disabled={uploadEmploymentCertificate.isPending || registerCompany.isPending} type="submit">
          {uploadEmploymentCertificate.isPending || registerCompany.isPending ? '가입 신청 처리 중' : '기업회원 가입하기'}
        </button>
      </form>

      {isSubmitGuideOpen && (
        <div aria-labelledby="company-submit-guide-title" aria-modal="true" className="cw-register-modal" role="dialog">
          <button aria-label="모달 닫기" className="cw-register-modal__backdrop" onClick={() => setIsSubmitGuideOpen(false)} type="button" />
          <div className="cw-register-modal__dialog">
            <h3 id="company-submit-guide-title">가입 신청이 접수되었습니다.</h3>
            <p>제출해주신 기업 정보와 재직증명서를 검토한 후 기업회원 가입이 승인됩니다.</p>
            <p>심사는 영업일 기준 2~3일 정도 소요될 수 있으며, 승인 결과는 입력하신 담당자 이메일로 안내드릴 예정입니다.</p>
            <button className="cw-register-submit cw-register-modal__confirm" onClick={() => setIsSubmitGuideOpen(false)} type="button">
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CompanyTerms({ values, onChange, termDetails }: CompanyTermsProps) {
  const [openDetails, setOpenDetails] = useState<Partial<Record<CompanyTermKey, boolean>>>({});
  const allChecked = values.service && values.companyVerification && values.sms && values.privacy && values.marketing;

  const toggleAll = (checked: boolean) => {
    onChange({
      service: checked,
      companyVerification: checked,
      sms: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const toggleOne = (key: CompanyTermKey) => {
    onChange({
      ...values,
      [key]: !values[key],
    });
  };

  const toggleDetail = (key: CompanyTermKey) => {
    setOpenDetails((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const terms = [
    { key: 'service', type: 'required', label: '이용약관 동의', details: termDetails.service },
    { key: 'companyVerification', type: 'required', label: '기업 인증 정보 확인 동의', details: termDetails.companyVerification },
    { key: 'sms', type: 'required', label: '문자서비스 이용약관 동의', details: termDetails.sms },
    { key: 'privacy', type: 'required', label: '개인정보 수집 및 이용 동의', details: termDetails.privacy },
    { key: 'marketing', type: 'optional', label: '광고성 정보 수신 동의', details: termDetails.marketing },
  ] as const;

  return (
    <div className="cw-register-terms cw-register-terms--detail">
      <label className="cw-register-check cw-register-check--all">
        <input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} />
        <span>전체 동의</span>
      </label>

      {terms.map((term) => (
        <div className="cw-register-term-row" key={term.key}>
          <div className="cw-register-term-line">
            <span className="cw-register-term-name">
              <strong className={`cw-register-term-type cw-register-term-type--${term.type}`}>
                {term.type === 'required' ? '[필수]' : '[선택]'}
              </strong>
              {term.label}
            </span>
            <div className="cw-register-term-actions">
              <button className={`cw-register-detail-button ${openDetails[term.key] ? 'is-open' : ''}`} type="button" onClick={() => toggleDetail(term.key)}>
                내용보기
              </button>
              <input aria-label={term.label} type="checkbox" checked={values[term.key]} onChange={() => toggleOne(term.key)} />
            </div>
          </div>
          {openDetails[term.key] && (
            <div className="cw-register-term-detail">
              {term.details.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  {section.body.split('\n').map((line, index) => (
                    <p key={`${section.title}-${index}`}>{line || '\u00a0'}</p>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
