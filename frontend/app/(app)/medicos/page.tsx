'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, RefreshCw, SquarePen, UserX } from 'lucide-react';

import { Tabla, type ColumnaTabla } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { Input } from '@/app/components/ui/Input';
import { Select, type OpcionSelect } from '@/app/components/ui/Select';
import { Modal } from '@/app/components/ui/Modal';
import { EstadoVacio } from '@/app/components/shared/EmptyState';
import { Buscador } from '@/app/components/shared/Buscador';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { useListarMedicos, useListadoMedicos } from '@/app/hooks/consultas';
import { useAuth } from '@/app/auth-context';
import type { MedicoVoluntario, Rol } from '@/types/dominio';

/**
 * `/medicos` — médicos voluntarios (5.5.2, 5.5.3).
 *
 * El `403` no se oculta: un `MEDICO` que entra a esta pantalla ve un cartel que dice
 * que no tiene permisos, no una pantalla vacía que lo haga pensar que no hay médicos.
 * El backend ya devuelve `403` por `@Roles('COORDINADOR', 'ADMIN')`; esta capa sólo lo
 * traduce a algo legible.
 *
 * La baja es **lógica** (RF-04.4): `activo = false`. Nunca `DELETE`, porque las
 * evoluciones que registró el médico tienen que conservar la referencia a su autor.
 */
const ROLES: OpcionSelect[] = [
  { value: 'MEDICO', label: 'Médico' },
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'ADMIN', label: 'Administrador' },
];

const VARIANTE_ROL: Record<Rol, 'activo' | 'neutra'> = {
  ADMIN: 'activo',
  COORDINADOR: 'activo',
  MEDICO: 'neutra',
};

function fecha(iso: string | null): string {
  return iso === null ? 'sin accesos' : iso.slice(0, 10).split('-').reverse().join('/');
}

export default function PaginaMedicos() {
  const { usuario } = useAuth();
  const autorizado = usuario?.rol === 'ADMIN' || usuario?.rol === 'COORDINADOR';

  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [editando, setEditando] = useState<MedicoVoluntario | null>(null);
  const [creando, setCreando] = useState(false);
  const [baja, setBaja] = useState<MedicoVoluntario | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useListarMedicos(
    { q: busqueda === '' ? undefined : busqueda, activo: undefined, page: pagina, limit: 20 },
    autorizado,
  );
  const { cambiarActivo } = useListadoMedicos();

  if (!autorizado) {
    return (
      <EstadoVacio
        titulo="Sin permisos"
        descripcion="La gestión de médicos voluntarios está reservada a coordinadores y administradores. Tu usuario tiene el rol MEDICO."
      />
    );
  }

  const columnas: ColumnaTabla<MedicoVoluntario>[] = [
    {
      clave: 'apellido',
      titulo: 'Apellido y nombre',
      render: (fila) => (
        <span>
          {fila.apellido}, {fila.nombre}
        </span>
      ),
    },
    { clave: 'documento', titulo: 'Documento', render: (fila) => fila.documento, ocultarEnMovil: true },
    {
      clave: 'email',
      titulo: 'Email',
      render: (fila) => fila.email,
      ocultarEnMovil: true,
      className: 'text-muted-foreground',
    },
    {
      clave: 'rol',
      titulo: 'Rol',
      render: (fila) => <Badge variante={VARIANTE_ROL[fila.rol]}>{fila.rol}</Badge>,
    },
    {
      clave: 'ultimoAcceso',
      titulo: 'Último acceso',
      render: (fila) => fecha(fila.ultimoAcceso),
      ocultarEnMovil: true,
      className: 'text-muted-foreground whitespace-nowrap',
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (fila) => (
        <Badge variante={fila.activo ? 'activo' : 'inactivo'}>
          {fila.activo ? 'Activo' : 'Baja lógica'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Médicos voluntarios</h1>
        <p className="text-muted-foreground text-sm">
          Un click en la fila la selecciona, doble click abre la edición.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setCreando(true)}>
            <Plus className="size-4" aria-hidden />
            Nuevo
          </Button>
          <Button
            variante="secondary"
            disabled={seleccionado === null}
            onClick={() =>
              setEditando(data?.data.find((item) => item.id === seleccionado) ?? null)
            }
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
            disabled={seleccionado === null}
            onClick={() => setBaja(data?.data.find((item) => item.id === seleccionado) ?? null)}
            title="Baja lógica: el médico queda inactivo pero sus evoluciones lo conservan"
          >
            <UserX className="size-4" aria-hidden />
            Baja
          </Button>
        </div>

        <Buscador
          valor={busqueda}
          onCambio={(valor) => {
            setBusqueda(valor);
            setPagina(1);
            setSeleccionado(null);
          }}
          etiqueta="Buscar médicos por apellido, nombre, documento o email"
          placeholder="Apellido, nombre, documento o email"
          className="min-w-64 max-w-md"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <EstadoVacio
            titulo="No se pudo cargar el listado"
            descripcion={error instanceof Error ? error.message : 'Error desconocido'}
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
                titulo={busqueda === '' ? 'No hay médicos cargados' : 'Ningún médico coincide'}
                descripcion={
                  busqueda === ''
                    ? 'Cargá al primer médico voluntario para que pueda registrar ingresos.'
                    : undefined
                }
                accion={
                  busqueda === '' ? (
                    <Button onClick={() => setCreando(true)}>
                      <Plus className="size-4" aria-hidden />
                      Cargar el primer médico
                    </Button>
                  ) : (
                    <Button variante="secondary" onClick={() => setBusqueda('')}>
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
            Página {data.meta.page} de {data.meta.totalPages} · {data.meta.total} médicos
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
      ) : null}

      <ModalMedico
        abierto={creando || editando !== null}
        medico={editando}
        onCerrar={() => {
          setCreando(false);
          setEditando(null);
        }}
      />

      <ConfirmDialog
        abierto={baja !== null}
        onCerrar={() => setBaja(null)}
        titulo="Dar de baja al médico"
        descripcion={
          baja
            ? `${baja.apellido}, ${baja.nombre} quedará inactivo y no podrá iniciar sesión. Sus evoluciones lo conservan como autor.`
            : ''
        }
        textoConfirmar="Dar de baja"
        onConfirmar={async () => {
          if (baja) {
            await cambiarActivo.mutateAsync({ id: baja.id, activo: false });
          }
          setBaja(null);
        }}
        peligro
      />
    </div>
  );
}

function ModalMedico({
  abierto,
  medico,
  onCerrar,
}: {
  abierto: boolean;
  medico: MedicoVoluntario | null;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const { crear, actualizar } = useListadoMedicos();
  const [error, setError] = useState<string | null>(null);

  const editando = medico !== null;

  async function guardar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setError(null);

    const datos = new FormData(evento.currentTarget);
    const texto = (campo: string) => String(datos.get(campo) ?? '').trim();
    const vacio = (campo: string) => (texto(campo) === '' ? undefined : texto(campo));

    try {
      if (editando) {
        await actualizar.mutateAsync({
          id: medico!.id,
          dto: {
            apellido: texto('apellido'),
            nombre: texto('nombre'),
            documento: texto('documento'),
            email: texto('email'),
            matricula: vacio('matricula'),
            especialidad: vacio('especialidad'),
            telefono: vacio('telefono'),
            rol: texto('rol') as Rol,
            // Vacía ⇒ no cambia la contraseña. El backend ignora el campo si no viene.
            ...(texto('password') === '' ? {} : { password: texto('password') }),
          },
        });
      } else {
        await crear.mutateAsync({
          apellido: texto('apellido'),
          nombre: texto('nombre'),
          documento: texto('documento'),
          email: texto('email'),
          matricula: vacio('matricula'),
          especialidad: vacio('especialidad'),
          telefono: vacio('telefono'),
          rol: (texto('rol') || 'MEDICO') as Rol,
          password: texto('password'),
        });
      }

      onCerrar();
      router.refresh();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar');
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      title={editando ? 'Modificar médico voluntario' : 'Nuevo médico voluntario'}
      description="El email es su identificador de acceso. La contraseña nunca se devuelve."
      className="sm:max-w-2xl"
      pie={
        <>
          <Button type="button" variante="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-medico"
            disabled={crear.isPending || actualizar.isPending}
          >
            Guardar
          </Button>
        </>
      }
    >
      <form id="form-medico" onSubmit={guardar} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p role="alert" className="text-destructive rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Apellido" name="apellido" required defaultValue={medico?.apellido ?? ''} />
          <Input label="Nombre" name="nombre" required defaultValue={medico?.nombre ?? ''} />
          <Input
            label="Documento"
            name="documento"
            required
            inputMode="numeric"
            defaultValue={medico?.documento ?? ''}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            required
            defaultValue={medico?.email ?? ''}
          />
          <Input
            label="Matrícula"
            name="matricula"
            defaultValue={medico?.matricula ?? ''}
          />
          <Input
            label="Especialidad"
            name="especialidad"
            defaultValue={medico?.especialidad ?? ''}
          />
          <Input
            label="Teléfono"
            name="telefono"
            type="tel"
            inputMode="tel"
            defaultValue={medico?.telefono ?? ''}
          />
          <Select
            label="Rol"
            name="rol"
            opciones={ROLES}
            defaultValue={medico?.rol ?? 'MEDICO'}
          />
        </div>

        <Input
          label={editando ? 'Nueva contraseña' : 'Contraseña'}
          name="password"
          type="password"
          autoComplete="new-password"
          required={!editando}
          minLength={8}
          helperText={
            editando
              ? 'Dejala vacía para no cambiarla.'
              : 'Mínimo 8 caracteres. Se guarda hasheada con bcrypt.'
          }
        />
      </form>
    </Modal>
  );
}
