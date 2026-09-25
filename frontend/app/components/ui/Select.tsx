'use client';

import { useId, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';
import { Campo } from './Input';

export interface OpcionSelect {
  value: string | number;
  label: string;
}

interface PropsSelect extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'children'> {
  label: string;
  error?: string;
  helperText?: string;
  opciones: OpcionSelect[];
  /** Visible when nothing is selected. "Sin datos" is a real value here, not an absence. */
  placeholder?: string;
  className?: string;
}

export function Select({
  label,
  error,
  helperText,
  required,
  opciones,
  placeholder = 'Seleccionar',
  id,
  className,
  ...resto
}: PropsSelect) {
  const generado = useId();
  const identificador = id ?? generado;

  return (
    <Campo label={label} error={error} helperText={helperText} required={required}>
      <select
        id={identificador}
        aria-invalid={error !== undefined}
        className={cn(
          'h-11 w-full rounded-md border bg-surface px-3 text-sm',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          error ? 'border-destructive' : 'border-input',
          className,
        )}
        {...resto}
      >
        <option value="">{placeholder}</option>
        {opciones.map((opcion: OpcionSelect) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
    </Campo>
  );
}

interface PropsArea extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  className?: string;
}

/** The evolution detail goes here: long free text with a visible limit. */
export function TextArea({ label, error, helperText, required, id, className, ...resto }: PropsArea) {
  const generado = useId();
  const identificador = id ?? generado;

  return (
    <Campo label={label} error={error} helperText={helperText} required={required}>
      <textarea
        id={identificador}
        aria-invalid={error !== undefined}
        className={cn(
          'w-full rounded-md border bg-surface p-3 text-sm',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          error ? 'border-destructive' : 'border-input',
          className,
        )}
        {...resto}
      />
    </Campo>
  );
}
