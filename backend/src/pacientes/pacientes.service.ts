import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, type Sexo } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  construirMetaPaginacion,
  type MetaPaginacion,
} from '../common/dto/paginacion.dto.js';
import { normalizarDocumento } from '../common/utils/texto.js';
import { exigirFechaNoFutura } from '../common/utils/fechas.js';
import type { CreatePacienteDto } from './dto/create-paciente.dto.js';
import type { CreatePacienteCompletoDto } from './dto/create-paciente-completo.dto.js';
import type { UpdatePacienteDto } from './dto/update-paciente.dto.js';
import type { QueryPacienteDto } from './dto/query-paciente.dto.js';
import type { UsuarioAutenticado } from '../common/types/usuario-autenticado.js';

/** Catálogos anidados: el frontend pinta una fila sin pedir tres llamadas extra. */
const INCLUIR_CATALOGOS = {
  estadoCivil: true,
  nacionalidad: true,
  tipoDocumento: true,
} satisfies Prisma.PacienteInclude;

type PacienteConCatalogos = Prisma.PacienteGetPayload<{ include: typeof INCLUIR_CATALOGOS }>;

export interface ListadoPacientes {
  data: PacienteConCatalogos[];
  meta: MetaPaginacion;
}

/** Respuesta del alta completa: el paciente más los ids de lo que se creó con él. */
export type AltaCompletaRespuesta = PacienteConCatalogos & {
  historiaClinicaId: number;
  evolucionInicialId: number;
};

/**
 * Columnas que acepta `CreatePacienteDto` y `UpdatePacienteDto`. Todas opcionales
 * porque en `PATCH` sólo viene lo que se envía. Los `BigInt` de las FK ya están
 * convertidos: los ids viajan como `number` en el contrato (DI-03).
 */
interface DatosPaciente {
  apellido?: string;
  nombre?: string;
  documento?: string | null;
  tipoDocumentoId?: bigint | null;
  edad?: number;
  sexo?: Sexo;
  estadoCivilId?: bigint | null;
  nacionalidadId?: bigint | null;
  fechaNacimiento?: Date | null;
  domicilio?: string | null;
  telefono?: string | null;
  sinDomicilioFijo?: boolean;
  observaciones?: string | null;
}

@Injectable()
export class PacientesService {
  private readonly logger = new Logger(PacientesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * `GET /api/pacientes` (tarea 2.5.6).
   *
   * El `orderBy` es estable: la columna elegida primero y `id` de desempate.
   * Sin el desempate, dos pacientes con el mismo apellido pueden repetirse o
   * saltarse al paginar (trampa 8 de AGENTS.md).
   */
  async listar(query: QueryPacienteDto): Promise<ListadoPacientes> {
    const where = this.construirWhere(query);
    const columna = query.ordenarPor ?? 'apellido';
    const sentido = query.orden === 'desc' ? 'desc' : 'asc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.paciente.findMany({
        where,
        include: INCLUIR_CATALOGOS,
        orderBy: [{ [columna]: sentido }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.paciente.count({ where }),
    ]);

    return {
      data,
      meta: construirMetaPaginacion(total, query.page, query.limit),
    };
  }

  /** `GET /api/pacientes/:id` (tarea 2.5.7). El `404` lo dispara el `P2025`. */
  async obtener(id: bigint): Promise<PacienteConCatalogos> {
    return this.prisma.paciente.findUniqueOrThrow({
      where: { id },
      include: INCLUIR_CATALOGOS,
    });
  }

  /**
   * `POST /api/pacientes` — alta simple, sólo el paciente (tarea 2.5.8).
   *
   * DI-02: MySQL admite una sola columna `AUTO_INCREMENT` por tabla y `id` ya la
   * ocupa, así que `numeroHistoria` se deriva del `id` que MySQL acaba de
   * asignar, en un segundo paso **de la misma transacción**. Queda nullable en
   * el esquema por eso: no hay forma de escribir el id en la misma columna
   * AUTO_INCREMENT dentro del INSERT.
   *
   * `createdBy` sale de `@CurrentUser()`, nunca del cuerpo (prohibición 5).
   */
  async crear(dto: CreatePacienteDto, autor: UsuarioAutenticado): Promise<PacienteConCatalogos> {
    const datos = this.construirDatos(dto);

    // Antes de abrir la transacción: si el catálogo no existe, es un `400` y no
    // hace falta rollback de nada.
    await this.validarReferencias(datos);

    return this.prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.create({
        // `apellido`, `nombre` y `edad` son obligatorios en `CreatePacienteDto`
        // y ya validados por el ValidationPipe: se pasan explícitos para que el
        // tipo de `create` los vea como requeridos.
        data: {
          ...datos,
          apellido: dto.apellido,
          nombre: dto.nombre,
          edad: dto.edad,
          createdBy: BigInt(autor.id),
        },
      });

      return tx.paciente.update({
        where: { id: paciente.id },
        data: { numeroHistoria: Number(paciente.id) },
        include: INCLUIR_CATALOGOS,
      });
    });
  }

  /**
   * `POST /api/pacientes` — alta **completa** del ingreso (tareas 3.4.1 a 3.4.5).
   *
   * Las tres inserciones van en una sola transacción y **todas usan `tx`**. Si
   * una falla, no queda paciente sin historia ni historia sin evolución inicial
   * (RF-01.4). Usar `this.prisma` dentro del callback abriría otra conexión y
   * perdería la atomicidad.
   *
   * `medicoVoluntarioId` sale del token en las tres: mandarlo en el cuerpo no
   * cambia la autoría, y el DTO no lo declara, así que el `ValidationPipe` lo
   * rechaza con `400` (prohibición 5).
   */
  async crearCompleto(
    dto: CreatePacienteCompletoDto,
    autor: UsuarioAutenticado,
  ): Promise<AltaCompletaRespuesta> {
    // El DTO ya lo exige, pero el service se llama desde otros caminos y la
    // garantía es de la transacción, no del controlador.
    if (!dto.evolucionInicial?.detalle || dto.evolucionInicial.detalle.trim().length < 3) {
      throw new BadRequestException('La evolución inicial es obligatoria y debe tener al menos 3 caracteres');
    }

    const datos = this.construirDatos(dto);
    const medicoId = BigInt(autor.id);
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();

    exigirFechaNoFutura(fecha, 'fecha del ingreso');

    // Antes de abrir la transacción. Dentro, el error de FK sería un 500 sin
    // nombre de campo y además obligaría a revertir las tres inserciones.
    await this.validarReferencias(datos);
    await this.validarHistoria(dto);

    const resultado = await this.prisma.$transaction(async (tx) => {
      // 1. Paciente. DI-02: numeroHistoria se completa con el id ya asignado.
      const paciente = await tx.paciente.create({
        data: {
          ...datos,
          apellido: dto.apellido,
          nombre: dto.nombre,
          edad: dto.edad,
          createdBy: medicoId,
        },
      });

      const conNumero = await tx.paciente.update({
        where: { id: paciente.id },
        data: { numeroHistoria: Number(paciente.id) },
      });

      // 2. Historia. RN-02: la edad queda congelada con la de este ingreso.
      const historia = await tx.historiaClinica.create({
        data: {
          pacienteId: conNumero.id,
          fecha,
          edadRegistrada: dto.edad,
          motivoConsulta: dto.motivoConsulta,
          representanteId: dto.representanteId ? BigInt(dto.representanteId) : null,
          operativoId: dto.operativoId ? BigInt(dto.operativoId) : null,
          tipoIngreso: dto.tipoIngreso ?? 'CONSULTA',
          estado: 'ACTIVA',
          medicoVoluntarioId: medicoId,
        },
      });

      // 3. Evolución inicial. Obligatoria: si falla, se revierte todo.
      const evolucion = await tx.evolucion.create({
        data: {
          historiaClinicaId: historia.id,
          fecha: dto.evolucionInicial.fecha
            ? new Date(dto.evolucionInicial.fecha)
            : fecha,
          detalle: this.construirDetalleInicial(dto),
          medicoVoluntarioId: medicoId,
        },
      });

      return { conNumero, historia, evolucion };
    });

    this.logger.log(
      `Alta de ingreso registrada. historia=${resultado.historia.id} paciente=${resultado.conNumero.id}`,
    );

    const paciente = await this.prisma.paciente.findUniqueOrThrow({
      where: { id: resultado.conNumero.id },
      include: INCLUIR_CATALOGOS,
    });

    return {
      ...paciente,
      historiaClinicaId: Number(resultado.historia.id),
      evolucionInicialId: Number(resultado.evolucion.id),
    };
  }

  /**
   * El Bloque D del formulario es **obligatorio** y es lo que el médico escribió: se
   * guarda tal cual, y sólo se le agregan al pie las líneas administrativas que
   * aporta el sistema.
   *
   * Sin representante, RN-03 se cumple asentando la ausencia en la misma nota: la
   * ausencia de un dato es un dato explícito, no un campo vacío.
   *
   * La nota va **primero** porque es el contenido clínico; las líneas de contexto
   * quedan como pie. Un día se puede agregar el motivo como columna propia y este
   * encabezado sobra.
   */
  private construirDetalleInicial(dto: CreatePacienteCompletoDto): string {
    const pie = dto.representanteId
      ? `Acompaña representante (id ${dto.representanteId}).`
      : 'Sin representante registrado.';

    return `${dto.evolucionInicial.detalle.trim()}\n\n${pie}`;
  }

  /**
   * `GET /api/pacientes/:id/historias` (tarea 3.3.6). Historial de ingresos
   * ordenado por fecha descendente con desempate por `id`.
   */
  async listarHistorias(id: bigint) {
    await this.prisma.paciente.findUniqueOrThrow({ where: { id }, select: { id: true } });

    return this.prisma.historiaClinica.findMany({
      where: { pacienteId: id },
      include: {
        medico: { select: { id: true, nombre: true, apellido: true } },
        operativo: { select: { id: true, nombre: true } },
      },
      orderBy: [{ fecha: 'desc' }, { id: 'asc' }],
    });
  }

  /**
   * `GET /api/pacientes/:id/evoluciones` (tarea 3.3.7). Historial **unificado y
   * cronológico** de todas las historias del paciente (RF-02.3).
   *
   * El filtro por `pacienteId` va en la misma consulta, no se une en memoria: si
   * se hiciera mal, el historial traería evoluciones de otro paciente.
   */
  async listarEvoluciones(id: bigint) {
    await this.prisma.paciente.findUniqueOrThrow({ where: { id }, select: { id: true } });

    return this.prisma.evolucion.findMany({
      where: { historiaClinica: { pacienteId: id } },
      include: {
        medico: { select: { id: true, nombre: true, apellido: true } },
        historiaClinica: { select: { id: true, fecha: true, estado: true } },
      },
      orderBy: [{ fecha: 'desc' }, { id: 'asc' }],
    });
  }

  /** `PATCH /api/pacientes/:id` (tarea 2.5.10). Sólo datos de identificación. */
  async actualizar(id: bigint, dto: UpdatePacienteDto): Promise<PacienteConCatalogos> {
    const datos = this.construirDatos(dto);

    if (Object.keys(datos).length === 0) {
      throw new BadRequestException('No se envió ningún campo para actualizar');
    }

    await this.validarReferencias(datos);

    return this.prisma.paciente.update({
      where: { id },
      data: datos,
      include: INCLUIR_CATALOGOS,
    });
  }

  /**
   * Que el representante y el operativo existan antes de abrir la transacción del
   * alta. Mismo motivo que `validarReferencias`: una FK rota acá es un MySQL `1452`
   * que llega sin código de Prisma y terminaba en un `500` genérico, con la
   * transacción entera para revertir.
   */
  private async validarHistoria(dto: CreatePacienteCompletoDto): Promise<void> {
    if (dto.representanteId) {
      // `Representante` no tiene `activo`: no tiene baja lógica, se borra o queda.
      const existe = await this.prisma.representante.findUnique({
        where: { id: BigInt(dto.representanteId) },
        select: { id: true },
      });

      if (existe === null) {
        throw new BadRequestException('El representante indicado no existe');
      }
    }

    // El operativo **no** se valida contra la tabla: mientras B-7 siga abierta
    // está vacía, y un `operativoId` que no llega es el caso normal, no un error.
    if (dto.operativoId) {
      const existe = await this.prisma.operativo.findUnique({
        where: { id: BigInt(dto.operativoId) },
        select: { activo: true },
      });

      if (existe === null) {
        throw new BadRequestException('El puesto de atención indicado no existe');
      }

      if (!existe.activo) {
        throw new BadRequestException('El puesto de atención indicado está dado de baja');
      }
    }
  }

  /**
   * Que las claves foráneas de los catálogos apunten a algo que exista.
   *
   * Sin esto, un `nacionalidadId: 0` llega hasta MySQL y vuelve como error `1216`
   * (`Cannot add or update a child row`), que el driver reporta como
   * `PrismaClientUnknownRequestError`: **no** lo agarra el filtro de la Fase 2, que
   * sólo conoce `PrismaClientKnownRequestError`, y el usuario recibe un `500` con un
   * mensaje genérico. Ni él ni quien atiende el teléfono pueden deducir que el
   * problema es un id de catálogo.
   *
   * Son dos consultas en una operación de volumen bajo (corregir un dato de un
   * paciente), a cambio de un error que dice **qué** corregir. Los ids también se
   * limpian aquí: un `''` que llegara como texto se convertiría en `0n` o en un
   * `SyntaxError` de `BigInt`.
   */
  private async validarReferencias(datos: DatosPaciente): Promise<void> {
    /**
     * El mensaje va entero, armado con su artículo, en vez de componerse con un
     * `El ${campo} indicado`: "nacionalidad" es femenino y salía "El nacionalidad
     * indicado", que es el tipo de detalle que hace que un mensaje de error deje de
     * leerse.
     */
    const revisar = async (
      existe: { activo: boolean } | null,
      mensajes: { noExiste: string; dadoDeBaja: string },
    ): Promise<void> => {
      if (existe === null) {
        throw new BadRequestException(mensajes.noExiste);
      }

      if (!existe.activo) {
        throw new BadRequestException(mensajes.dadoDeBaja);
      }
    };

    if (datos.tipoDocumentoId !== undefined && datos.tipoDocumentoId !== null) {
      await revisar(
        await this.prisma.tipoDocumento.findUnique({
          where: { id: datos.tipoDocumentoId },
          select: { activo: true },
        }),
        {
          noExiste: 'El tipo de documento indicado no existe',
          dadoDeBaja: 'El tipo de documento indicado está dado de baja',
        },
      );
    }

    if (datos.estadoCivilId !== undefined && datos.estadoCivilId !== null) {
      await revisar(
        await this.prisma.estadoCivil.findUnique({
          where: { id: datos.estadoCivilId },
          select: { activo: true },
        }),
        {
          noExiste: 'El estado civil indicado no existe',
          dadoDeBaja: 'El estado civil indicado está dado de baja',
        },
      );
    }

    if (datos.nacionalidadId !== undefined && datos.nacionalidadId !== null) {
      await revisar(
        await this.prisma.nacionalidad.findUnique({
          where: { id: datos.nacionalidadId },
          select: { activo: true },
        }),
        {
          noExiste: 'La nacionalidad indicada no existe',
          dadoDeBaja: 'La nacionalidad indicada está dada de baja',
        },
      );
    }
  }

  /**
   * Traduce el DTO a columnas. `documento` se normaliza a `null` ANTES de
   * insertar (RN-01 y trampa 9): en MySQL los `NULL` no colisionan en un
   * `UNIQUE` pero los `''` sí, y el segundo alta de un paciente sin documento
   * devolvería un `409` fantasma.
   */
  private construirDatos(dto: CreatePacienteDto | UpdatePacienteDto): DatosPaciente {
    const datos: DatosPaciente = {};

    if (dto.apellido !== undefined) {
      datos.apellido = dto.apellido;
    }

    if (dto.nombre !== undefined) {
      datos.nombre = dto.nombre;
    }

    if (dto.documento !== undefined) {
      datos.documento = normalizarDocumento(dto.documento);
    }

    if (dto.tipoDocumentoId !== undefined) {
      datos.tipoDocumentoId = dto.tipoDocumentoId === null ? null : BigInt(dto.tipoDocumentoId);
    }

    if (dto.edad !== undefined) {
      datos.edad = dto.edad;
    }

    if (dto.sexo !== undefined) {
      datos.sexo = dto.sexo;
    }

    if (dto.estadoCivilId !== undefined) {
      datos.estadoCivilId = dto.estadoCivilId === null ? null : BigInt(dto.estadoCivilId);
    }

    if (dto.nacionalidadId !== undefined) {
      datos.nacionalidadId = dto.nacionalidadId === null ? null : BigInt(dto.nacionalidadId);
    }

    if (dto.fechaNacimiento !== undefined) {
      datos.fechaNacimiento = dto.fechaNacimiento
        ? new Date(dto.fechaNacimiento)
        : null;
    }

    if (dto.domicilio !== undefined) {
      datos.domicilio = dto.domicilio ?? null;
    }

    if (dto.telefono !== undefined) {
      datos.telefono = dto.telefono ?? null;
    }

    if (dto.sinDomicilioFijo !== undefined) {
      datos.sinDomicilioFijo = dto.sinDomicilioFijo;
    }

    if (dto.observaciones !== undefined) {
      datos.observaciones = dto.observaciones ?? null;
    }

    return datos;
  }

  /**
   * Filtros del listado. La búsqueda libre usa `contains`: con el collation
   * `utf8mb4_0900_ai_ci` de la base, `q=jose` encuentra `José` y `q=JOSE`
   * devuelve exactamente lo mismo (specs/03 §7.2).
   */
  private construirWhere(query: QueryPacienteDto): Prisma.PacienteWhereInput {
    const where: Prisma.PacienteWhereInput = {
      activo: query.activo ?? true,
    };

    if (query.q) {
      const q = query.q;
      const soloDigitos = /^\d+$/.test(q);
      const comoNumero = soloDigitos ? Number.parseInt(q, 10) : null;

      where.OR = [
        { apellido: { contains: q } },
        { nombre: { contains: q } },
        { documento: { contains: q } },
        // Un DNI se recuerda con o sin ceros a la izquierda: buscar "0998" tiene
        // que encontrar el documento "998". Sólo aplica a consultas numéricas
        // puras, que es el único caso donde perder el cero no cambia el número.
        ...(soloDigitos ? [{ documento: { in: variantesDocumento(q) } }] : []),
        ...(comoNumero !== null && comoNumero <= 4_294_967_295
          ? [{ numeroHistoria: comoNumero }]
          : []),
      ];
    }

    if (query.sexo) {
      where.sexo = query.sexo as Sexo;
    }

    if (query.nacionalidadId !== undefined) {
      where.nacionalidadId = BigInt(query.nacionalidadId);
    }

    if (query.estadoCivilId !== undefined) {
      where.estadoCivilId = BigInt(query.estadoCivilId);
    }

    if (query.desde || query.hasta) {
      where.createdAt = {
        ...(query.desde ? { gte: new Date(query.desde) } : {}),
        ...(query.hasta ? { lte: new Date(query.hasta) } : {}),
      };
    }

    if (query.estadoHistoria) {
      // Filtra por relación, no por subconsulta: el índice `ix_hc_paciente_estado`
      // de `historias_clinicas` resuelve el caso sin tocar la tabla de pacientes.
      where.historias = { some: { estado: query.estadoHistoria } };
    }

    return where;
  }
}

/**
 * Formas en que puede estar escrito un documento a partir de una consulta numérica:
 * tal como se tipeó y sin los ceros de la izquierda. `0998` -> `["0998", "998"]`.
 * La forma vacía se descarta para no buscar un documento en blanco.
 */
function variantesDocumento(q: string): string[] {
  const sinCeros = q.replace(/^0+/, '');

  return sinCeros.length > 0 && sinCeros !== q ? [q, sinCeros] : [q];
}
