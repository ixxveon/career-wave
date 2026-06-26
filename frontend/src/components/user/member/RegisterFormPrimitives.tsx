import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CheckCircle2, ChevronDown, Eye, EyeOff } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (input.value) {
      applyInputFill(input);
    } else {
      clearInputFill(input);
    }
  }, [show]);

  return (
    <div className="cw-register-password-wrapper">
      <input
        ref={inputRef}
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
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function SelectInput({ value, onChange, placeholder, options }: SelectInputProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(options.findIndex((option) => option === value), 0);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(selectedIndex);
        return;
      }
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(selectedIndex);
        return;
      }
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(selectedIndex);
        return;
      }
      selectOption(options[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="cw-register-select" ref={containerRef}>
      <button
        type="button"
        className={`cw-register-select__trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? '' : 'cw-register-select__placeholder'}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="cw-register-select__chevron" />
      </button>
      {open && (
        <ul className="cw-register-select__dropdown" id={listboxId} role="listbox">
          {options.map((option, index) => (
            <li
              id={`${listboxId}-option-${index}`}
              key={option}
              role="option"
              aria-selected={value === option}
              className={`cw-register-select__option ${value === option ? 'is-selected' : ''} ${activeIndex === index ? 'is-active' : ''}`}
              onMouseDown={() => {
                selectOption(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
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
