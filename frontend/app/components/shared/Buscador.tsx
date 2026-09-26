'use client';

import { useEffect, useRef, useState } from 'react';

import { Search, X } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Buscador con **debounce de 300 ms**.
 *
 * Sin debounce, escribir "Pérez" dispara seis peticiones: `P`, `Pe`, `Pé`, `Pére`,
 * `Pérez`, y sólo la última importa. El `useEffect` con `setTimeout` es la forma
 * idiomática y además permite cancelar con `clearTimeout` si el médico sigue
 * tipeando: el temporizador anterior nunca llega a disparar.
 *
 * El valor del input va en estado local (lo que se ve) y el de la búsqueda en estado
 * del padre (lo que se pide). Si no, el input se movería a tirones mientras espera.
 *
 * `onCambio` es una dependencia del efecto a propósito: el padre tiene que pasarlo
 * envuelto en `useCallback`. Si no fuera estable, el temporizador se reagendaría en
 * cada render del padre y la búsqueda se dispararía tarde o dos veces.
 */
export function Buscador({
  valor,
  onCambio,
  placeholder = 'Buscar…',
  etiqueta,
  className,
}: {
  valor: string;
  onCambio: (valor: string) => void;
  placeholder?: string;
  /** Etiqueta oculta: el ícono solo no le dice nada al lector de pantalla. */
  etiqueta: string;
  className?: string;
}) {
  const [texto, setTexto] = useState(valor);
  const primero = useRef(true);
  // Último `valor` que el padre mandó, para detectar el cambio externo.
  const [valorRecibido, setValorRecibido] = useState(valor);

  // Si el padre cambia el valor (por ejemplo al limpiar la búsqueda desde el estado
  // vacío), el input lo sigue. Se ajusta **durante el render** y no en un
  // `useEffect`: el efecto provocaría un segundo render en cascada con cada cambio de
  // la prop, y el input se movería un frame tarde.
  if (valor !== valorRecibido) {
    setValorRecibido(valor);
    setTexto(valor);
  }

  useEffect(() => {
    // El primer render no dispara una búsqueda: el padre ya pasó su valor inicial.
    if (primero.current) {
      primero.current = false;
      return;
    }

    const temporizador = setTimeout(() => {
      onCambio(texto.trim());
    }, 300);

    return () => clearTimeout(temporizador);
  }, [texto, onCambio]);

  return (
    <div className={cn('relative', className)}>
      <label htmlFor="buscador" className="sr-only">
        {etiqueta}
      </label>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        id="buscador"
        type="search"
        inputMode="search"
        autoComplete="off"
        className="focus-visible:ring-ring h-11 w-full rounded-md border border-input bg-surface pr-9 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
        placeholder={placeholder}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />
      {texto !== '' ? (
        <button
          type="button"
          onClick={() => {
            setTexto('');
            onCambio('');
          }}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
          aria-label="Limpiar la búsqueda"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
