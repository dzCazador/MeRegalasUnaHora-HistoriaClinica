import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { Rol } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import { construirMetaPaginacion, type MetaPaginacion } from '../common/dto/paginacion.dto.js';
import { CreateMedicoDto } from './dto/create-medico.dto.js';
import { UpdateMedicoDto } from './dto/update-medico.dto.js';
import { BajaMedicoDto } from './dto/baja-medico.dto.js';

/**
 * `motivoBaja` no existe en el modelo (`03-esquema-bd.md` tabla de
 * `medicos_voluntarios`): la baja lógica es sólo `activo = false`. No se agrega la
 * columna porque el esquema es la fuente de verdad y RF-04.4 no la pide.
 */
export type { BajaMedicoDto };

/** Columnas de lectura. Nunca se selecciona `passwordHash`. */
const SELECCION = {
  id: true,
  apellido: true,
  nombre: true,
  documento: true,
  email: true,
  matricula: true,
  especialidad: true,
  telefono: true,
  rol: true,
  activo: true,
  ultimoAcceso: true,
  createdAt: true,
} as const;

/** `BigInt` no se serializa a JSON y las fechas viajan como ISO (AGENTS.md §8 #1). */
function presentar(medico: {
  id: bigint;
  ultimoAcceso: Date | null;
  createdAt: Date;
} & Record<string, unknown>) {
  return {
    ...medico,
    id: Number(medico.id),
    ultimoAcceso: medico.ultimoAcceso?.toISOString() ?? null,
    createdAt: medico.createdAt.toISOString(),
  };
}

@Injectable()
export class MedicosVoluntariosService {
  private readonly logger = new Logger(MedicosVoluntariosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listar(params: {
    q?: string;
    activo?: boolean;
    rol?: Rol;
    page: number;
    limit: number;
  }): Promise<{ data: ReturnType<typeof presentar>[]; meta: MetaPaginacion }> {
    const where: Prisma.MedicoVoluntarioWhereInput = {
      ...(params.activo === undefined ? {} : { activo: params.activo }),
      ...(params.rol ? { rol: params.rol } : {}),
      ...(params.q
        ? {
            OR: [
              { apellido: { contains: params.q } },
              { nombre: { contains: params.q } },
              { documento: { contains: params.q } },
              { email: { contains: params.q } },
            ],
          }
        : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.medicoVoluntario.findMany({
        where,
        // Orden estable: apellido, nombre y desempate por id (trampa #8 de AGENTS.md).
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }, { id: 'asc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: SELECCION,
      }),
      this.prisma.medicoVoluntario.count({ where }),
    ]);

    return {
      data: datos.map(presentar),
      meta: construirMetaPaginacion(total, params.page, params.limit),
    };
  }

  async obtener(id: number) {
    const medico = await this.prisma.medicoVoluntario.findUnique({
      where: { id },
      select: SELECCION,
    });

    if (!medico) {
      throw new NotFoundException(`El médico voluntario ${id} no existe`);
    }

    return presentar(medico);
  }

  async crear(dto: CreateMedicoDto) {
    await this.verificarUnicidad(dto.documento, dto.email, dto.matricula);

    const creado = await this.prisma.medicoVoluntario.create({
      data: {
        apellido: dto.apellido,
        nombre: dto.nombre,
        documento: dto.documento,
        email: dto.email.toLowerCase(),
        matricula: dto.matricula,
        especialidad: dto.especialidad,
        telefono: dto.telefono,
        rol: dto.rol ?? Rol.MEDICO,
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
      select: SELECCION,
    });

    this.logger.log(`Alta de médico voluntario: ${creado.id} (${creado.rol})`);

    return presentar(creado);
  }

  async actualizar(id: number, dto: UpdateMedicoDto) {
    await this.obtener(id);
    await this.verificarUnicidad(dto.documento, dto.email, dto.matricula, id);

    // La contraseña sólo se toca si viene una nueva: omitirla no la borra.
    const datos: Prisma.MedicoVoluntarioUpdateInput = {
      ...(dto.apellido !== undefined ? { apellido: dto.apellido } : {}),
      ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
      ...(dto.documento !== undefined ? { documento: dto.documento } : {}),
      ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
      ...(dto.matricula !== undefined ? { matricula: dto.matricula } : {}),
      ...(dto.especialidad !== undefined ? { especialidad: dto.especialidad } : {}),
      ...(dto.telefono !== undefined ? { telefono: dto.telefono } : {}),
      ...(dto.rol !== undefined ? { rol: dto.rol } : {}),
      ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
    };

    const actualizado = await this.prisma.medicoVoluntario.update({
      where: { id },
      data: datos,
      select: SELECCION,
    });

    this.logger.log(`Actualización de médico voluntario: ${id}`);

    return presentar(actualizado);
  }

  /**
   * Baja lógica (RF-04.4). No hay `DELETE` físico: las evoluciones del médico deben
   * conservar la referencia a su autor, y `ON DELETE RESTRICT` lo impediría.
   */
  async cambiarActivo(id: number, dto: BajaMedicoDto) {
    await this.obtener(id);

    const actualizado = await this.prisma.medicoVoluntario.update({
      where: { id },
      data: { activo: dto.activo },
      select: SELECCION,
    });

    this.logger.log(dto.activo ? `Reactivación de médico: ${id}` : `Baja lógica de médico: ${id}`);

    return presentar(actualizado);
  }

  /** `documento`, `email` y `matricula` son UNIQUE: un choque es un 409 con qué campo falló. */
  private async verificarUnicidad(
    documento?: string,
    email?: string,
    matricula?: string,
    exceptoId?: number,
  ): Promise<void> {
    // Un `findFirst` por campo en vez de un `where` con clave dinámica: el cliente
    // de Prisma exige un campo UNIQUE conocido en tiempo de compilación, y además
    // el mensaje de error puede nombrar el campo que chocó.
    const yaExiste = async (filtro: Prisma.MedicoVoluntarioWhereInput): Promise<boolean> => {
      const encontrado = await this.prisma.medicoVoluntario.findFirst({
        where: filtro,
        select: { id: true },
      });

      return encontrado !== null && (exceptoId === undefined || Number(encontrado.id) !== exceptoId);
    };

    if (documento && (await yaExiste({ documento }))) {
      throw new ConflictException(`Ya existe un médico voluntario con ese documento: ${documento}`);
    }

    if (email && (await yaExiste({ email: email.toLowerCase() }))) {
      throw new ConflictException(`Ya existe un médico voluntario con ese email: ${email}`);
    }

    if (matricula && (await yaExiste({ matricula }))) {
      throw new ConflictException(`Ya existe un médico voluntario con esa matrícula: ${matricula}`);
    }
  }
}
