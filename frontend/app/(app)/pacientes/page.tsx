'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { SkeletonFila } from '../../components/ui/Skeleton';
import { EstadoVacio } from '../../components/shared/EmptyState';
import { Tabla, type ColumnaTabla } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { listar } from '../../services/pacientes';
import { mensajeDeError } from '../../auth-context';
import type { Paciente } from '@/types/dominio';

const COLUMNAS: ColumnaTabla<Paciente>[] = [
  {
    clave: 'nh',
    titulo: 'N.º historia',
    render: (p) => <span className="font-medium tabular-nums">{p.numeroHistoria}</span>,
  },
  {
    clave: 'apellido',
    titulo: 'Apellido y nombre',
    render: (p) => (
      <span className="block max-w-[16rem] truncate">
        {p.apellido}, {p.nombre}
      </span>
    ),
  },
  {
    clave: 'documento',
    titulo: 'Documento',
    ocultarEnMovil: true,
    // La ausencia de documento es un dato explícito, no un hueco en la grilla.
    render: (p) => p.documento ?? <span className="text-muted-foreground">Sin documento</span>,
  },
  {
    clave: 'edad',
    titulo: 'Edad',
    ocultarEnMovil: true,
    render: (p) => <span className="tabular-nums">{p.edad}</span>,
  },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (p) => <Badge variante={p.activo ? 'activo' : 'inactivo'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>,
  },
];

export default function PaginaPacientes() {
  const [busqueda, setBusqueda] = useState('');
  const [qAplicada, setqAplicada] = useState('');
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const consulta = useQuery({
    queryKey: ['pacientes', qAplicada],
    queryFn: () => listar({ q: qAplicada || undefined, limit: 20 }),
    // El error se muestra como toast con el mensaje literal del backend.
    retry: false,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: las acciones van acá, nunca dentro de las filas. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form
          className="flex-1"
          onSubmit={(evento) => {
            evento.preventDefault();
            setqAplicada(busqueda.trim());
          }}
        >
          <Input
            label="Buscar"
            placeholder="Apellido, nombre, documento o número de historia"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </form>
        <Button
          type="submit"
          variante="secondary"
          onClick={() => setqAplicada(busqueda.trim())}
        >
          <Search aria-hidden className="size-4" />
          Buscar
        </Button>
        <Button disabled title="Llega en la Fase 5">
          <UserPlus aria-hidden className="size-4" />
          Registrar paciente
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Pacientes"
          description={
            consulta.data
              ? `${consulta.data.meta.total} en total`
              : 'Cargando…'
          }
        />
        <CardContent className="p-0">
          {consulta.isPending ? (
            <div>
              <SkeletonFila columnas={5} />
              <SkeletonFila columnas={5} />
              <SkeletonFila columnas={5} />
            </div>
          ) : consulta.isError ? (
            <EstadoVacio
              titulo="No se pudo cargar la lista"
              descripcion={mensajeDeError(consulta.error)}
              accion={
                <Button variante="secondary" onClick={() => void consulta.refetch()}>
                  Reintentar
                </Button>
              }
            />
          ) : (
            <Tabla
              columnas={COLUMNAS}
              filas={consulta.data.data}
              claveFila={(p) => p.id}
              filaSeleccionada={seleccionado}
              alSeleccionar={(p) => setSeleccionado(p.id)}
              vacio={
                <EstadoVacio
                  titulo={qAplicada ? 'Ningún paciente coincide' : 'Todavía no hay pacientes'}
                  descripcion={
                    qAplicada
                      ? `No encontramos resultados para "${qAplicada}".`
                      : 'Registrá el primer ingreso para empezar el seguimiento.'
                  }
                  accion={
                    !qAplicada ? (
                      <Button disabled title="Llega en la Fase 5">
                        <UserPlus aria-hidden className="size-4" />
                        Registrar el primer paciente
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
