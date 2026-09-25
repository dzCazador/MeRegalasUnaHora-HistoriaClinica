import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRepresentanteDto, QueryRepresentanteDto } from './dto/representantes.dto.js';

/** Tope duro: la búsqueda de representantes es para elegir uno, no para volcar la tabla. */
const LIMITE_MAXIMO = 50;

@Injectable()
export class RepresentantesService {
  private readonly logger = new Logger(RepresentantesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * `POST /api/representantes` (tarea 3.5.1). Sin `DELETE`: el representante se
   * desactiva, no se borra, porque está asociado a historias ya registradas.
   */
  async crear(dto: CreateRepresentanteDto) {
    const representante = await this.prisma.representante.create({
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo ?? 'PERSONA',
        documento: dto.documento ?? null,
        telefono: dto.telefono ?? null,
        email: dto.email ?? null,
        vinculo: dto.vinculo ?? null,
        direccion: dto.direccion ?? null,
      },
    });

    this.logger.log(`Representante registrado. representante=${representante.id}`);

    return representante;
  }

  /** `GET /api/representantes?q=` (tarea 3.5.1). Búsqueda insensible a acentos. */
  async listar(query: QueryRepresentanteDto) {
    const where: Prisma.RepresentanteWhereInput = {};

    if (query.q) {
      where.OR = [{ nombre: { contains: query.q } }, { documento: { contains: query.q } }];
    }

    if (query.tipo) {
      where.tipo = query.tipo;
    }

    return this.prisma.representante.findMany({
      where,
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      take: Math.min(query.limit ?? 20, LIMITE_MAXIMO),
    });
  }
}
