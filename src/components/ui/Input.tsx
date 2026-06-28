import React from 'react';
import styles from './Input.module.css';

interface InputProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  icon?: React.ReactNode;
  className?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  type = 'text',
  disabled = false,
  maxLength,
  icon,
  className = '',
}) => {
  const wrapperClass = [
    styles.wrapper,
    error ? styles.hasError : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inputClass = [
    styles.input,
    icon ? styles.hasIcon : '',
    error ? styles.inputError : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputContainer}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          type={type}
          className={inputClass}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
        />
      </div>
      {error && <span className={styles.error}>{error}</span>}
      {!error && helperText && (
        <span className={styles.helper}>{helperText}</span>
      )}
    </div>
  );
};

export default Input;
