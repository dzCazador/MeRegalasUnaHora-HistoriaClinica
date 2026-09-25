import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type Sexo } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  construirMetaPaginacion,
  type MetaPaginacion,
} from '../common/dto/paginacion.dto.js';
import { normalizarDocumento } from '../common/utils/texto.js';
import type { CreatePacienteDto } from './dto/create-paciente.dto.js';
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
   * `POST /api/pacientes` (tarea 2.5.8).
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

  /** `PATCH /api/pacientes/:id` (tarea 2.5.10). Sólo datos de identificación. */
  async actualizar(id: bigint, dto: UpdatePacienteDto): Promise<PacienteConCatalogos> {
    const datos = this.construirDatos(dto);

    if (Object.keys(datos).length === 0) {
      throw new BadRequestException('No se envió ningún campo para actualizar');
    }

    return this.prisma.paciente.update({
      where: { id },
      data: datos,
      include: INCLUIR_CATALOGOS,
    });
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
