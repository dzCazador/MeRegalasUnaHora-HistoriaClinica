import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EstadoHistoria, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { exigirFechaNoFutura } from '../common/utils/fechas.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';
import type { CreateIngresoDto } from './dto/create-ingreso.dto.js';
import type { CreateEvolucionDto } from './dto/create-evolucion.dto.js';
import type { CambiarEstadoDto } from './dto/cambiar-estado.dto.js';

const AUTOR = { id: true, nombre: true, apellido: true } satisfies Prisma.MedicoVoluntarioSelect;

const INCLUIR_HISTORIA = {
  medico: { select: AUTOR },
  representante: { select: { id: true, nombre: true, tipo: true, vinculo: true } },
  operativo: { select: { id: true, nombre: true } },
  evoluciones: {
    where: { anulada: false },
    orderBy: [{ fecha: 'desc' as const }, { id: 'asc' as const }],
    take: 1,
    include: { medico: { select: AUTOR } },
  },
} satisfies Prisma.HistoriaClinicaInclude;

type HistoriaConDetalle = Prisma.HistoriaClinicaGetPayload<{ include: typeof INCLUIR_HISTORIA }>;

const INCLUIR_EVOLUCION = { medico: { select: AUTOR } } satisfies Prisma.EvolucionInclude;

type EvolucionConAutor = Prisma.EvolucionGetPayload<{ include: typeof INCLUIR_EVOLUCION }>;

/**
 * La `include` trae `evoluciones` recortada a la más reciente; para el contrato
 * conviene exponerla como `evolucionInicial`. Se renombra para que el DTO sea
 * legible y para no sugerir que hay más de una.
 */
type HistoriaRespuesta = Omit<HistoriaConDetalle, 'evoluciones'> & {
  evolucionInicial: EvolucionConAutor | null;
};

function aHistoria(historia: HistoriaConDetalle): HistoriaRespuesta {
  const { evoluciones, ...resto } = historia;

  return { ...resto, evolucionInicial: evoluciones[0] ?? null };
}

@Injectable()
export class HistoriasClinicasService {
  private readonly logger = new Logger(HistoriasClinicasService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea historia + evolución inicial para un paciente **existente** (segundo
   * ingreso, tarea 3.3.5). No toca `pacientes` ni `numero_historia`: el número
   * es del paciente, no del ingreso.
   *
   * `edadRegistrada` se congela con la edad que declara el paciente **en este
   * momento** (RN-02). La historia de 2026 conserva 45 aunque el paciente tenga
   * 48 en 2028.
   */
  async registrarIngreso(
    pacienteId: bigint,
    dto: CreateIngresoDto,
    autor: UsuarioAutenticado,
  ): Promise<HistoriaRespuesta> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true, edad: true, activo: true },
    });

    if (!paciente) {
      throw new BadRequestException('El paciente indicado no existe');
    }

    if (!paciente.activo) {
      throw new UnprocessableEntityException('El paciente está dado de baja lógicamente');
    }

    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    exigirFechaNoFutura(fecha, 'fecha del ingreso');

    const historia = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.historiaClinica.create({
        data: {
          pacienteId,
          fecha,
          edadRegistrada: paciente.edad,
          motivoConsulta: dto.motivoConsulta,
          representanteId: dto.representanteId ? BigInt(dto.representanteId) : null,
          operativoId: dto.operativoId ? BigInt(dto.operativoId) : null,
          tipoIngreso: dto.tipoIngreso ?? 'CONSULTA',
          estado: 'ACTIVA',
          medicoVoluntarioId: BigInt(autor.id),
        },
      });

      // RF-01.4: la evolución inicial es obligatoria. Va en la misma transacción
      // que la historia: si falla, no queda una historia sin evolución.
      await tx.evolucion.create({
        data: {
          historiaClinicaId: creada.id,
          fecha,
          detalle: this.construirDetalleInicial(dto),
          medicoVoluntarioId: BigInt(autor.id),
        },
      });

      return tx.historiaClinica.findUniqueOrThrow({
        where: { id: creada.id },
        include: INCLUIR_HISTORIA,
      });
    });

    // Sólo operación, recurso y resultado. Nunca el detalle clínico (tarea 3.4.6).
    this.logger.log(`Ingreso registrado. historia=${historia.id} paciente=${pacienteId}`);

    return aHistoria(historia);
  }

  /** `GET /api/historias-clinicas/:id` (tarea 3.3.1). El `404` lo dispara el `P2025`. */
  async obtener(id: bigint): Promise<HistoriaRespuesta> {
    const historia = await this.prisma.historiaClinica.findUniqueOrThrow({
      where: { id },
      include: INCLUIR_HISTORIA,
    });

    return aHistoria(historia);
  }

  /**
   * `GET /api/historias-clinicas/:id/evoluciones` (tarea 3.3.2).
   *
   * Ordena por la **fecha clínica** descendente con desempate por `id`
   * (RF-02.4). Ordenar por `created_at` mostraría las evoluciones ordenadas por
   * cuándo se teclearon, no por cuándo ocurrieron.
   */
  async listarEvoluciones(id: bigint): Promise<EvolucionConAutor[]> {
    await this.prisma.historiaClinica.findUniqueOrThrow({
      where: { id },
      select: { id: true },
    });

    return this.prisma.evolucion.findMany({
      where: { historiaClinicaId: id },
      include: INCLUIR_EVOLUCION,
      orderBy: [{ fecha: 'desc' }, { id: 'asc' }],
    });
  }

  /**
   * `POST /api/historias-clinicas/:id/evoluciones` (tarea 3.3.3).
   *
   * **DI-05:** registrar en una historia `CERRADA` o `ANULADA` devuelve **422**.
   * La petición está bien formada; lo que no se puede es aplicarla al estado
   * actual del recurso. `409` (lo que dice CU-05 en `../01` §7) sugeriría un
   * conflicto de estado previo, que no es el caso.
   */
  async crearEvolucion(
    id: bigint,
    dto: CreateEvolucionDto,
    autor: UsuarioAutenticado,
  ): Promise<EvolucionConAutor> {
    const historia = await this.prisma.historiaClinica.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });

    if (!historia) {
      throw new BadRequestException('La historia clínica indicada no existe');
    }

    if (historia.estado !== EstadoHistoria.ACTIVA) {
      throw new UnprocessableEntityException(
        `La historia clínica está ${historia.estado === EstadoHistoria.CERRADA ? 'cerrada' : 'anulada'}: ` +
          'no admite más evoluciones.',
      );
    }

    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    exigirFechaNoFutura(fecha, 'fecha de la evolución');

    const evolucion = await this.prisma.evolucion.create({
      data: {
        historiaClinicaId: id,
        fecha,
        detalle: dto.detalle,
        medicoVoluntarioId: BigInt(autor.id),
      },
      include: INCLUIR_EVOLUCION,
    });

    this.logger.log(`Evolución registrada. evolucion=${evolucion.id} historia=${id}`);

    return evolucion;
  }

  /**
   * `PATCH /api/historias-clinicas/:id/estado` (tarea 3.3.4).
   *
   * Al cerrar escribe `fechaCierre` y `motivoCierre` y deja una nota de cierre
   * como evolución, **en la misma transacción** (`../03` §9.2). Al reabrir
   * vuelve a `ACTIVA` y limpia `fechaCierre`.
   */
  async cambiarEstado(
    id: bigint,
    dto: CambiarEstadoDto,
    autor: UsuarioAutenticado,
  ): Promise<HistoriaRespuesta> {
    const actual = await this.prisma.historiaClinica.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });

    if (!actual) {
      throw new BadRequestException('La historia clínica indicada no existe');
    }

    if (dto.estado === EstadoHistoria.ANULADA && !dto.motivo) {
      throw new BadRequestException('Anular una historia exige un motivo');
    }

    if (dto.estado === EstadoHistoria.CERRADA && !dto.notaCierre) {
      throw new BadRequestException('Cerrar una historia exige la nota de cierre');
    }

    const historia = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.historiaClinica.update({
        where: { id },
        data:
          dto.estado === EstadoHistoria.ACTIVA
            ? { estado: 'ACTIVA', fechaCierre: null, motivoCierre: null }
            : {
                estado: dto.estado,
                fechaCierre: new Date(),
                motivoCierre: dto.motivo ?? dto.notaCierre ?? null,
              },
      });

      if (dto.estado === EstadoHistoria.ACTIVA) {
        return actualizada;
      }

      // La nota de cierre es una evolución más: queda en la historia y es
      // auditable. Se escribe con `tx`, nunca con `this.prisma`.
      await tx.evolucion.create({
        data: {
          historiaClinicaId: id,
          fecha: new Date(),
          detalle:
            dto.estado === EstadoHistoria.ANULADA
              ? `Historia anulada. Motivo: ${dto.motivo}`
              : `Historia cerrada. ${dto.notaCierre ?? ''}`.trim(),
          medicoVoluntarioId: BigInt(autor.id),
        },
      });

      return actualizada;
    });

    const guardado = await this.prisma.historiaClinica.findUniqueOrThrow({
      where: { id: historia.id },
      include: INCLUIR_HISTORIA,
    });

    this.logger.log(
      `Estado de historia actualizado. historia=${id} estado=${dto.estado} anterior=${actual.estado}`,
    );

    return aHistoria(guardado);
  }

  /**
   * Sin representante, RN-03 se cumple asentando el motivo en la evolución
   * inicial: la ausencia de un dato es un dato explícito, no un campo vacío.
   */
  private construirDetalleInicial(dto: CreateIngresoDto): string {
    const encabezado = `Motivo de la consulta: ${dto.motivoConsulta}`;

    if (dto.representanteId) {
      return `${encabezado}\nAcompaña representante (id ${dto.representanteId}).`;
    }

    return `${encabezado}\nSin representante registrado.`;
  }
}
