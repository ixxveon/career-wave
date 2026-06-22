import { useState, type ReactNode } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { applyInputFill, clearInputFill } from '../../../utils/user/member/inputFill';

type FieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  wide?: boolean;
};

type TextInputProps = {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type SelectInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
};

type StatusPillProps = {
  active: boolean;
  children: ReactNode;
};

type AuthButtonGroupProps = {
  input: ReactNode;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
  secondButtonLabel?: string;
  onSecondClick?: () => void;
  secondDisabled?: boolean;
};

export function Field({ label, children, required = false, wide = false }: FieldProps) {
  return (
    <div className={wide ? 'cw-register-field cw-register-field--wide' : 'cw-register-field'}>
      <span className="cw-register-label">
        {label}
        {required && <em>*</em>}
      </span>
      {children}
    </div>
  );
}

export function TextInput({ type = 'text', value, onChange, placeholder }: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        applyInputFill(event.target);
      }}
      onBlur={(event) => clearInputFill(event.target)}
      placeholder={placeholder}
    />
  );
}

export function PasswordInput({ value, onChange, placeholder }: Omit<TextInputProps, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="cw-register-password-wrapper">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          applyInputFill(event.target);
        }}
        onBlur={(event) => clearInputFill(event.target)}
        placeholder={placeholder}
      />
      <button
        className="cw-register-password-toggle"
        type="button"
        aria-label={show ? '비밀번호 숨기기' : '비밀번호 표시'}
        onClick={() => setShow((prev) => !prev)}
      >
        {show ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}

export function SelectInput({ value, onChange, placeholder, options }: SelectInputProps) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function StatusPill({ active, children }: StatusPillProps) {
  if (!active) return null;

  return (
    <span className="cw-register-status">
      <CheckCircle2 size={15} />
      {children}
    </span>
  );
}

export function AuthButtonGroup({ input, buttonLabel, onClick, disabled = false, secondButtonLabel, onSecondClick, secondDisabled = false }: AuthButtonGroupProps) {
  return (
    <div className={secondButtonLabel ? 'cw-register-inline cw-register-inline--triple' : 'cw-register-inline'}>
      {input}
      <button className="cw-register-sub-button" disabled={disabled} type="button" onClick={onClick}>
        {buttonLabel}
      </button>
      {secondButtonLabel && (
        <button className="cw-register-sub-button cw-register-sub-button--ghost" disabled={secondDisabled} type="button" onClick={onSecondClick}>
          {secondButtonLabel}
        </button>
      )}
    </div>
  );
}
