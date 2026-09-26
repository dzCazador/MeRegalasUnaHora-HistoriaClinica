'use client';

import { useState, type ReactNode } from 'react';

import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { TextArea } from '@/app/components/ui/Select';

/**
 * Confirmación obligatoria antes de una acción que no se puede deshacer con la UI:
 * cierre o anulación de una historia, y baja de un médico.
 *
 * El motivo es **obligatorio** cuando `motivoObligatorio` está activo, porque la
 * historia tiene que quedar con registro de por qué se cerró. Sin esto, cerrar una
 * historia queda indistinguible de haberla terminado.
 *
 * El texto del botón de confirmación nombra la acción: "Cerrar historia", no "Aceptar".
 * En una pantalla de clínica, un "Aceptar" genérico es un accidente esperando.
 */
export function ConfirmDialog({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  descripcion,
  textoConfirmar = 'Confirmar',
  motivoObligatorio = false,
  etiquetaMotivo = 'Motivo',
  ayudaMotivo,
  peligro = false,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => Promise<void> | void;
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  motivoObligatorio?: boolean;
  etiquetaMotivo?: string;
  ayudaMotivo?: string;
  /** `danger` para lo que no se puede revertir. */
  peligro?: boolean;
  children?: ReactNode;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ejecutando, setEjecutando] = useState(false);

  async function confirmar(): Promise<void> {
    if (motivoObligatorio && motivo.trim().length < 3) {
      setError('Escribí el motivo: queda asentado en la historia.');
      return;
    }

    setError(null);
    setEjecutando(true);

    try {
      await onConfirmar(motivo.trim());
      setMotivo('');
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo completar la operación');
    } finally {
      setEjecutando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      title={titulo}
      description={descripcion}
      className="sm:max-w-lg"
      pie={
        <>
          <Button type="button" variante="secondary" onClick={onCerrar} disabled={ejecutando}>
            Cancelar
          </Button>
          <Button
            variante={peligro ? 'danger' : 'primary'}
            onClick={() => void confirmar()}
            disabled={ejecutando || (motivoObligatorio && motivo.trim().length < 3)}
          >
            {ejecutando ? 'Trabajando…' : textoConfirmar}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        {motivoObligatorio ? (
          <div>
            <TextArea
              label={`${etiquetaMotivo} *`}
              rows={3}
              required
              maxLength={500}
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              helperText={ayudaMotivo ?? 'Queda asentado en la historia clínica.'}
              aria-invalid={error !== null}
            />
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
