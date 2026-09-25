'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface PropsCampo {
  label: string;
  /** Message under the field. On error it replaces the helper text. */
  error?: string;
  helperText?: string;
  required?: boolean;
  children?: ReactNode;
  className?: string;
}

/** Label + control + message. Shared by `Input` and `Select` so the spacing stays the same. */
export function Campo({ label, error, helperText, required, children, className }: PropsCampo) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-sm font-medium">
        {label}
        {required ? <span aria-hidden className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-muted-foreground text-xs">{helperText}</p>
      ) : null}
    </div>
  );
}

interface PropsInput extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string;
  helperText?: string;
  className?: string;
}

export function Input({ label, error, helperText, required, id, className, ...resto }: PropsInput) {
  const generado = useId();
  const identificador = id ?? generado;

  return (
    <Campo label={label} error={error} helperText={helperText} required={required}>
      <input
        id={identificador}
        aria-invalid={error !== undefined}
        className={cn(
          'h-11 w-full rounded-md border bg-surface px-3 text-sm',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          error ? 'border-destructive' : 'border-input',
          className,
        )}
        {...resto}
      />
    </Campo>
  );
}
