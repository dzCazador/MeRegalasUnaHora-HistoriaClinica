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

  /**
   * Puestos de atención. La tabla existe desde la migración inicial, con su
   * `UNIQUE(nombre)`, pero el seed la deja vacía porque la organización todavía
   * no definió la lista (B-7).
   *
   * Por eso la UI **oculta** el filtro por operativo cuando esta lista vuelve
   * vacía, en vez de mostrar un desplegable sin opciones: un filtro que no se
   * puede usar es ruido, y además sugiere que hay un filtro donde no lo hay.
   */
  async operativos() {
    return this.prisma.operativo.findMany({
      where: { activo: true },
      orderBy: [{ nombre: 'asc' }],
    });
  }
}
