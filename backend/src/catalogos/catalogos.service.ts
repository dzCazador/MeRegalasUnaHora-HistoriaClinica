import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

/** Sólo ítems activos, ordenados por `orden`. Los catálogos no se editan por API. */
@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  async estadosCiviles() {
    return this.prisma.estadoCivil.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }

  async nacionalidades() {
    return this.prisma.nacionalidad.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }

  async tiposDocumento() {
    return this.prisma.tipoDocumento.findMany({
      where: { activo: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }
}
