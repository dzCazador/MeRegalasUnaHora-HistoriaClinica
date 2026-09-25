import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Concatena clases de Tailwind resolviendo conflictos: la última gana.
 * Evita el problema de sobrescribir utilidades al componer componentes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
