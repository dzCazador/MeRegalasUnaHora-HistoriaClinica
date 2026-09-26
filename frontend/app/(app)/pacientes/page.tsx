'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Download, Filter, Plus, RefreshCw, SquarePen } from 'lucide-react';

import { Tabla, type ColumnaTabla } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { Badge } from '@/app/components/ui/Badge';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import { Buscador } from '@/app/components/shared/Buscador';
import { ModalEditarPaciente } from '@/app/components/pacientes/ModalEditarPaciente';
import { useCatalogosFormulario, useListarPacientes } from '@/app/hooks/consultas';
import type {
  EstadoHistoria,
  Paciente,
  ParamsListadoPacientes,
  Sexo,
} from '@/types/dominio';

/**
 * Listado de pacientes con Toolbar Pattern (`../02-arquitectura-tech.md` §10.1).
 *
 * **Las acciones viven todas en la toolbar; las filas no tienen un solo botón.** Un
 * click selecciona la fila y doble click abre la edición, que es lo que hace `Table`.
 *
 * Abrir la historia clínica es una acción más de la toolbar, y no el click simple, por
 * dos razones concretas:
 *
 * - El doble click ya está ocupado por la edición (`Table` dispara `onFilaDobleClick`
 *   después de dos `click`, así que un click que navega se iría de la pantalla antes
 *   de que el segundo llegara).
 * - En un teléfono el doble click no existe. Con la acción en la toolbar, el camino
 *   para abrir una historia es idéntico en escritorio y en el celular: tocar la fila
 *   y tocar **Ver historia**.
 *
 * La búsqueda ignora mayúsculas y acentos porque el backend lo resuelve con el
 * collation `utf8mb4_0900_ai_ci`: escribir `perez` encuentra `Pérez` sin que la
 * pantalla tenga que normalizar nada (RF-03.6).
 *
 * Los filtros van en el **query string** de la petición, no sólo en el estado local:
 * un filtro que no llega al backend es un filtro que no filtra.
 */

const SEXOS: { value: Sexo; label: string }[] = [
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
  { value: 'X', label: 'Otro' },
  { value: 'SIN_DATOS', label: 'Sin datos' },
];

const ESTADOS_HISTORIA: { value: EstadoHistoria; label: string }[] = [
  { value: 'ACTIVA', label: 'Con historia activa' },
  { value: 'CERRADA', label: 'Con historia cerrada' },
  { value: 'ANULADA', label: 'Con historia anulada' },
];

function hc(numero: number): string {
  return `HC-${String(numero).padStart(6, '0')}`;
}

function fechaCorta(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('/');
}

export default function PaginaPacientes() {
  const router = useRouter();
  const { data: catalogos } = useCatalogosFormulario();

  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Omit<ParamsListadoPacientes, 'q' | 'page' | 'limit'>>(
    {},
  );
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // Al cambiar cualquier filtro se vuelve a la página 1: quedarse en la 5 con un filtro
  // nuevo deja una grilla vacía sin explicación.
  function cambiarFiltro(clave: keyof typeof filtros, valor: string): void {
    setPagina(1);
    setSeleccionado(null);
    setFiltros((anterior) => ({ ...anterior, [clave]: valor === '' ? undefined : valor }));
  }

  function limpiarFiltros(): void {
    setPagina(1);
    setSeleccionado(null);
    setFiltros({});
  }

  const params: ParamsListadoPacientes = {
    ...filtros,
    q: busqueda === '' ? undefined : busqueda,
    page: pagina,
    limit: 20,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useListarPacientes(params);

  const columnas: ColumnaTabla<Paciente>[] = [
    {
      clave: 'numeroHistoria',
      titulo: 'N° historia',
      render: (fila) => (
        <Link
          href={`/pacientes/${fila.id}`}
          className="font-medium underline-offset-2 hover:underline"
          onClick={(evento) => evento.stopPropagation()}
        >
          {hc(fila.numeroHistoria)}
        </Link>
      ),
      className: 'whitespace-nowrap',
    },
    {
      clave: 'apellido',
      titulo: 'Apellido y nombre',
      render: (fila) => (
        <span>
          {fila.apellido}, {fila.nombre}
        </span>
      ),
    },
    {
      clave: 'documento',
      titulo: 'Documento',
      // RN-10: la ausencia de dato se dice, no se rellena.
      render: (fila) => fila.documento ?? <span className="text-muted-foreground">sin datos</span>,
      ocultarEnMovil: true,
      className: 'whitespace-nowrap',
    },
    {
      clave: 'edad',
      titulo: 'Edad',
      render: (fila) => fila.edad,
      ocultarEnMovil: true,
      className: 'text-right',
    },
    {
      clave: 'sexo',
      titulo: 'Sexo',
      render: (fila) => (fila.sexo === 'SIN_DATOS' ? '—' : fila.sexo),
      ocultarEnMovil: true,
    },
    {
      clave: 'ultimo',
      titulo: 'Último contacto',
      render: (fila) => fechaCorta(fila.updatedAt),
      ocultarEnMovil: true,
      className: 'whitespace-nowrap text-muted-foreground',
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (fila) => (
        <Badge variante={fila.activo ? 'activo' : 'inactivo'}>
          {fila.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  const hayFiltros = Object.values(filtros).some((valor) => valor !== undefined && valor !== '');

  // Estable: el debounce del buscador lo usa como dependencia de su efecto, y una
  // función en línea lo reiniciaría en cada render del padre.
  const alBuscar = useCallback((valor: string) => {
    setBusqueda(valor);
    setPagina(1);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Pacientes</h1>
        <p className="text-muted-foreground text-sm">
          Este listado es sólo de pacientes. Tocá uno y usá <strong>Ver historias</strong> para
          ver sus ingresos. Con mouse, doble click abre la edición.
        </p>
      </div>

      {/* Toolbar: TODAS las acciones de la grilla viven acá. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => router.push('/pacientes/nuevo')}>
            <Plus className="size-4" aria-hidden />
            Nuevo
          </Button>
          <Button
            variante="secondary"
            disabled={seleccionado === null}
            title={
              seleccionado === null
                ? 'Elegí un paciente de la lista para ver sus historias clínicas'
                : 'Ver las historias clínicas del paciente'
            }
            onClick={() => {
              if (seleccionado !== null) {
                router.push(`/pacientes/${seleccionado}`);
              }
            }}
          >
            <BookOpen className="size-4" aria-hidden />
            Ver historias
          </Button>
          <Button
            variante="secondary"
            disabled={seleccionado === null}
            title={
              seleccionado === null
                ? 'Elegí un paciente de la lista para modificarlo'
                : 'Modificar los datos de identificación'
            }
            onClick={() => {
              const fila = data?.data.find((item) => item.id === seleccionado);
              setEditando(fila ?? null);
            }}
          >
            <SquarePen className="size-4" aria-hidden />
            Modificar
          </Button>
          <Button variante="secondary" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
            Refrescar
          </Button>
          <Button variante="secondary" disabled title="Disponible desde la Fase 7">
            <Download className="size-4" aria-hidden />
            Exportar
          </Button>
          <Button
            variante="ghost"
            onClick={() => setFiltrosAbiertos((abierto) => !abierto)}
            aria-expanded={filtrosAbiertos}
          >
            <Filter className="size-4" aria-hidden />
            Filtros
            {hayFiltros ? <span className="text-primary text-xs">· activos</span> : null}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Buscador
            valor={busqueda}
            onCambio={alBuscar}
            etiqueta="Buscar pacientes por apellido, nombre, documento o número de historia"
            placeholder="Apellido, nombre, documento o N° de historia"
            className="min-w-64 flex-1"
          />
          {isFetching ? <span className="text-muted-foreground text-xs">Buscando…</span> : null}
        </div>

        {filtrosAbiertos ? (
          <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              Sexo
              <select
                className="h-11 rounded-md border border-input bg-surface px-3"
                value={filtros.sexo ?? ''}
                onChange={(e) => cambiarFiltro('sexo', e.target.value)}
              >
                <option value="">Todos</option>
                {SEXOS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Nacionalidad
              <select
                className="h-11 rounded-md border border-input bg-surface px-3"
                value={filtros.nacionalidadId ?? ''}
                onChange={(e) => cambiarFiltro('nacionalidadId', e.target.value)}
              >
                <option value="">Todas</option>
                {(catalogos?.nacionalidades ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Estado civil
              <select
                className="h-11 rounded-md border border-input bg-surface px-3"
                value={filtros.estadoCivilId ?? ''}
                onChange={(e) => cambiarFiltro('estadoCivilId', e.target.value)}
              >
                <option value="">Todos</option>
                {(catalogos?.estadosCiviles ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Estado de la historia
              <select
                className="h-11 rounded-md border border-input bg-surface px-3"
                value={filtros.estadoHistoria ?? ''}
                onChange={(e) => cambiarFiltro('estadoHistoria', e.target.value)}
              >
                <option value="">Cualquiera</option>
                {ESTADOS_HISTORIA.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Ingresados desde
              <input
                type="date"
                className="h-11 rounded-md border border-input bg-surface px-3"
                value={filtros.desde ?? ''}
                onChange={(e) => cambiarFiltro('desde', e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Ingresados hasta
              <input
                type="date"
                className="h-11 rounded-md border border-input bg-surface px-3"
                value={filtros.hasta ?? ''}
                onChange={(e) => cambiarFiltro('hasta', e.target.value)}
              />
            </label>

            <div className="sm:col-span-2 lg:col-span-3">
              <Button variante="ghost" onClick={limpiarFiltros} disabled={!hayFiltros}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <EstadoVacio
            titulo="No se pudo cargar el listado"
            descripcion={error instanceof Error ? error.message : 'Error desconocido'}
            icono={<RefreshCw className="size-8" />}
            accion={
              <Button variante="secondary" onClick={() => void refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : (
          <Tabla
            columnas={columnas}
            filas={data?.data ?? []}
            claveFila={(fila) => fila.id}
            filaSeleccionada={seleccionado}
            alSeleccionar={(fila) => setSeleccionado(fila.id)}
            onFilaDobleClick={(fila) => setEditando(fila)}
            vacio={
              <EstadoVacio
                titulo={
                  busqueda !== '' || hayFiltros
                    ? 'Ningún paciente coincide con la búsqueda'
                    : 'Todavía no hay pacientes'
                }
                descripcion={
                  busqueda !== '' || hayFiltros
                    ? 'Probá con menos palabras, o revisá los filtros.'
                    : 'El primer ingreso crea el paciente, su historia y la evolución inicial.'
                }
                accion={
                  busqueda === '' && !hayFiltros ? (
                    <Button onClick={() => router.push('/pacientes/nuevo')}>
                      <Plus className="size-4" aria-hidden />
                      Registrar el primer paciente
                    </Button>
                  ) : (
                    <Button
                      variante="secondary"
                      onClick={() => {
                        setBusqueda('');
                        limpiarFiltros();
                      }}
                    >
                      Limpiar la búsqueda
                    </Button>
                  )
                }
              />
            }
          />
        )}
      </Card>

      {data && data.meta.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Página {data.meta.page} de {data.meta.totalPages} · {data.meta.total} pacientes
          </p>
          <div className="flex gap-2">
            <Button
              variante="secondary"
              disabled={pagina <= 1}
              onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
            >
              Anterior
            </Button>
            <Button
              variante="secondary"
              disabled={pagina >= data.meta.totalPages}
              onClick={() => setPagina((actual) => actual + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : data ? (
        <p className="text-muted-foreground text-sm">
          {data.meta.total} {data.meta.total === 1 ? 'paciente' : 'pacientes'}
        </p>
      ) : null}

      <ModalEditarPaciente
        paciente={editando}
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
      />
    </div>
  );
}
