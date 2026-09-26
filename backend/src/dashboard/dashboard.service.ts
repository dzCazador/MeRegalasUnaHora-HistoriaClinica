import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Sexo } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  construirMetaPaginacion,
  type MetaPaginacion,
} from '../common/dto/paginacion.dto.js';
import { diasDeCalendarioEntre, rangoDeMeses } from '../common/utils/fechas.js';
import type {
  FiltrosDashboardDto,
  QueryDashboardDto,
  QuerySinContactoDto,
} from './dto/query-dashboard.dto.js';
import type { PuntoSerieDto } from './dto/dashboard-response.dto.js';

/** Fila de la serie mensual. `COUNT(*)` llega como `bigint` desde MySQL. */
interface FilaSerie {
  mes: string;
  total: bigint;
}

/** Último contacto por paciente, agregado en la base. */
interface FilaUltimoContacto {
  pacienteId: bigint;
  ultima: Date;
}

/** Paciente más su cantidad de ingresos no anulados. */
interface PacienteParaAlerta {
  id: bigint;
  numeroHistoria: number | null;
  apellido: string;
  nombre: string;
  documento: string | null;
  edad: number;
  _count: { historias: number };
}

export interface ResumenDashboard {
  pacientesActivos: number;
  ingresos: number;
  evoluciones: number;
  series: PuntoSerieDto[];
  umbralSinContacto: number;
  desde: string;
  hasta: string;
}

export interface ListadoIngresosRecientes {
  data: unknown[];
  meta: MetaPaginacion;
}

export interface ListadoSinContacto {
  data: unknown[];
  meta: MetaPaginacion;
}

interface EntradaCache {
  expiraEn: number;
  valor: ResumenDashboard;
}

/** Tope de entradas para que un usuario que recorre muchas fechas no crezca sin límite. */
const MAX_ENTRADAS_CACHE = 50;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  /**
   * Caché del resumen, en memoria y con ventana corta.
   *
   * No hay Redis ni nada distribuido: en el MVP un proceso alcanza (fase 6 §7).
   * La ventana es deliberadamente chica (60 s) porque el panel muestra actividad
   * que cambia mientras se atiende, y un dato viejo por un minuto confunde más de
   * lo que el ahorro de consultas ayuda. La clave incluye el rango, así que
   * cambiar de período no sirve una respuesta de otro período.
   */
  private readonly cacheResumen = new Map<string, EntradaCache>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** RN-12. Viene del ambiente, nunca del JavaScript del cliente. */
  private get umbralSinContacto(): number {
    return this.config.get<number>('DASHBOARD_SIN_CONTACTO_DIAS', 90);
  }

  private get ttlCacheSegundos(): number {
    return this.config.get<number>('DASHBOARD_CACHE_TTL_SEGUNDOS', 60);
  }

  /**
   * `GET /api/dashboard/resumen`.
   *
   * Los tres indicadores salen de las **mismas** agregaciones que la serie del
   * gráfico, no de consultas aparte: los KPIs son la suma de la serie. Es la
   * forma barata de garantizar que el número grande de arriba y el gráfico de
   * abajo nunca se contradigan.
   */
  async resumen(query: QueryDashboardDto): Promise<ResumenDashboard> {
    const clave = this.claveCache(query);
    const guardada = this.cacheResumen.get(clave);

    if (guardada && guardada.expiraEn > Date.now()) {
      return guardada.valor;
    }

    const desde = `${query.desde}T00:00:00.000Z`;
    // El rango es semiabierto [desde, hasta + 1 día). Con `fecha <= '2026-09-30'`
    // se cortaría el último día a las 00:00 y el último día del período
    // desaparecería de los tres indicadores.
    const hastaExcluido = this.manana(query.hasta);

    const [serieIngresos, serieEvoluciones, pacientes] = await Promise.all([
      this.serieMensualIngresos(query, desde, hastaExcluido),
      this.serieMensualEvoluciones(query, desde, hastaExcluido),
      this.pacientesAtendidos(query, desde, hastaExcluido),
    ]);

    // La serie se arma sobre el rango que pidió el usuario (`desde` a `hasta`),
    // no sobre el límite semiabierto de SQL. Si se usara `hastaExcluido`, un
    // rango que termina el 30 de septiembre dibujaría además un mes de octubre
    // con cero, que nadie pidió y que no existe en el filtro.
    const meses = rangoDeMeses(
      new Date(`${query.desde}T00:00:00.000Z`),
      new Date(`${query.hasta}T00:00:00.000Z`),
    );
    const porMesIngresos = new Map(serieIngresos.map((fila) => [fila.mes, Number(fila.total)]));
    const porMesEvoluciones = new Map(
      serieEvoluciones.map((fila) => [fila.mes, Number(fila.total)]),
    );

    // Se recorre la lista completa de meses del rango, no las claves que
    // llegaron con datos: un mes sin atención tiene que verse como una barra en
    // cero. Si el eje saltara de marzo a junio, el mes vacío sería invisible
    // justo cuando es lo que hay que mirar.
    const series: PuntoSerieDto[] = meses.map((mes) => ({
      mes,
      ingresos: porMesIngresos.get(mes) ?? 0,
      evoluciones: porMesEvoluciones.get(mes) ?? 0,
    }));

    const valor: ResumenDashboard = {
      pacientesActivos: pacientes,
      ingresos: series.reduce((total, punto) => total + punto.ingresos, 0),
      evoluciones: series.reduce((total, punto) => total + punto.evoluciones, 0),
      series,
      umbralSinContacto: this.umbralSinContacto,
      desde: query.desde,
      hasta: query.hasta,
    };

    this.guardarEnCache(clave, valor);

    return valor;
  }

  /**
   * `GET /api/dashboard/recientes` (tarea 6.1.4). Últimos ingresos del período con
   * el paciente, el motivo y el médico autor.
   *
   * `orderBy` estable: fecha descendente y `id` de desempate (trampa 8).
   */
  async recientes(query: QueryDashboardDto): Promise<ListadoIngresosRecientes> {
    const hastaExcluido = this.manana(query.hasta);
    const where: Prisma.HistoriaClinicaWhereInput = {
      fecha: {
        gte: new Date(`${query.desde}T00:00:00.000Z`),
        lt: new Date(hastaExcluido),
      },
      estado: { not: 'ANULADA' },
      ...(query.operativoId !== undefined
        ? { operativoId: BigInt(query.operativoId) }
        : {}),
      // Los filtros de población son columnas de `pacientes`, así que van en el
      // filtro de la relación, no sueltos en el `where` de la historia.
      paciente: this.filtroPoblacion(query),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.historiaClinica.findMany({
        where,
        select: {
          id: true,
          fecha: true,
          motivoConsulta: true,
          estado: true,
          paciente: {
            select: {
              id: true,
              numeroHistoria: true,
              apellido: true,
              nombre: true,
              documento: true,
            },
          },
          medico: { select: { id: true, nombre: true } },
          operativo: { select: { nombre: true } },
        },
        orderBy: [{ fecha: 'desc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.historiaClinica.count({ where }),
    ]);

    return {
      data: data.map((historia) => ({
        historiaClinicaId: historia.id,
        fecha: historia.fecha,
        motivoConsulta: historia.motivoConsulta,
        estado: historia.estado,
        pacienteId: historia.paciente.id,
        numeroHistoria: historia.paciente.numeroHistoria,
        apellido: historia.paciente.apellido,
        nombre: historia.paciente.nombre,
        documento: historia.paciente.documento,
        medicoId: historia.medico.id,
        medicoNombre: historia.medico.nombre,
        operativoNombre: historia.operativo?.nombre ?? null,
      })),
      meta: construirMetaPaginacion(total, query.page, query.limit),
    };
  }

  /**
   * `GET /api/dashboard/sin-contacto` (tarea 6.1.5, RN-12).
   *
   * El cálculo son **dos** consultas y un cruce en memoria, no una subconsulta
   * correlacionada por paciente. Con 10.000 pacientes una subconsulta por fila
   * obliga a la base a repetir el `MAX` 10.000 veces; el `GROUP BY` de la
   * segunda consulta resuelve todos de una pasada sobre `evoluciones` y el cruce
   * es un `Map`.
   *
   * El filtro de fechas **no** se aplica acá a propósito: el umbral ya define la
   * ventana. Si se aplicara, el default de la pantalla ("últimos 30 días")
   * vaciaría la lista de todos los pacientes que hacen 100 días sin volver, que
   * es justamente lo que el panel existe para mostrar.
   */
  async sinContacto(query: QuerySinContactoDto): Promise<ListadoSinContacto> {
    const umbral = this.umbralSinContacto;
    const hoy = new Date();

    const [pacientes, ultimosContactos] = await Promise.all([
      this.pacientesParaAlerta(query),
      this.ultimoContactoPorPaciente(),
    ]);

    const alerta = pacientes
      .map((paciente) => {
        const contacto = ultimosContactos.get(paciente.id) ?? null;
        // `null` cuando el paciente nunca tuvo una evolución en una historia no
        // anulada. Se devuelve `null` y no 0: el panel muestra "sin contacto
        // registrado", nunca un número inventado (trampa de fase 6 §8).
        const dias = contacto === null ? null : diasDeCalendarioEntre(contacto, hoy);

        return {
          pacienteId: paciente.id,
          numeroHistoria: paciente.numeroHistoria,
          apellido: paciente.apellido,
          nombre: paciente.nombre,
          documento: paciente.documento,
          edad: paciente.edad,
          ultimaEvolucion: contacto,
          diasSinContacto: dias,
          ingresos: paciente._count.historias,
        };
      })
      // Estricto: un paciente con exactamente `umbral` días todavía no entra. El
      // corte de `fase-06` §3.2 es `ultima < corte`, con `corte = hoy - umbral`.
      .filter((fila) => fila.diasSinContacto === null || fila.diasSinContacto > umbral)
      .sort(ordenarPorCriticidad);

    const total = alerta.length;

    // Sólo `data` y `meta`, y nada más. El interceptor de `../02` §9.1 aplana un
    // listado paginado sólo si el objeto tiene **exactamente** dos claves; con una
    // tercera (el umbral) dejaba de aplanar y la respuesta quedaba como
    // `data.data`. El umbral viaja en `GET /api/dashboard/resumen`, que la
    // pantalla siempre carga, así que la UI tiene un solo lugar de donde leerlo.
    return {
      data: alerta.slice(query.skip, query.skip + query.take),
      meta: construirMetaPaginacion(total, query.page, query.limit),
    };
  }

  // ── Agregaciones ───────────────────────────────────────────────────────────

  /**
   * Ingresos por mes. `DATE_FORMAT` va en el `SELECT`/`GROUP BY`, nunca en el
   * `WHERE`: el `WHERE` compara columnas contra rangos, así que `ix_hc_fecha` se
   * puede usar. Filtrar con `DATE_FORMAT(fecha, '%Y') = '2026'` haría la función
   * no sargable y MySQL tendría que recorrer la tabla entera.
   */
  private async serieMensualIngresos(
    query: QueryDashboardDto,
    desde: string,
    hastaExcluido: string,
  ): Promise<FilaSerie[]> {
    return this.prisma.$queryRaw<FilaSerie[]>(Prisma.sql`
      SELECT DATE_FORMAT(h.fecha, '%Y-%m') AS mes, COUNT(*) AS total
        FROM historias_clinicas h
        JOIN pacientes p ON p.id = h.paciente_id
       WHERE h.fecha >= ${desde}
         AND h.fecha < ${hastaExcluido}
         AND h.estado <> 'ANULADA'
         AND p.activo = 1
         ${this.filtrosSqlHistorias(query, 'h', 'p')}
       GROUP BY mes
       ORDER BY mes ASC
    `);
  }

  /** Evoluciones por mes. Una evolución anulada, o en una historia anulada, no cuenta. */
  private async serieMensualEvoluciones(
    query: QueryDashboardDto,
    desde: string,
    hastaExcluido: string,
  ): Promise<FilaSerie[]> {
    return this.prisma.$queryRaw<FilaSerie[]>(Prisma.sql`
      SELECT DATE_FORMAT(e.fecha, '%Y-%m') AS mes, COUNT(*) AS total
        FROM evoluciones e
        JOIN historias_clinicas h ON h.id = e.historia_clinica_id
        JOIN pacientes p ON p.id = h.paciente_id
       WHERE e.fecha >= ${desde}
         AND e.fecha < ${hastaExcluido}
         AND e.anulada = 0
         AND h.estado <> 'ANULADA'
         AND p.activo = 1
         ${this.filtrosSqlHistorias(query, 'h', 'p')}
       GROUP BY mes
       ORDER BY mes ASC
    `);
  }

  /**
   * Pacientes **atendidos en el período**: al menos un ingreso no anulado dentro
   * del rango y `activo = true`.
   *
   * "Atendidos en el período" y no "activos hoy" a propósito: un paciente que no
   * vuelve hace seis meses sigue con `activo = true` en la base, así que contarlo
   * daría un número que no baja nunca y no respondería a la pregunta que hace el
   * filtro de fechas.
   */
  private async pacientesAtendidos(
    query: QueryDashboardDto,
    desde: string,
    hastaExcluido: string,
  ): Promise<number> {
    const filas = await this.prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT h.paciente_id) AS total
        FROM historias_clinicas h
        JOIN pacientes p ON p.id = h.paciente_id
       WHERE h.fecha >= ${desde}
         AND h.fecha < ${hastaExcluido}
         AND h.estado <> 'ANULADA'
         AND p.activo = 1
         ${this.filtrosSqlHistorias(query, 'h', 'p')}
    `);

    return Number(filas[0]?.total ?? 0);
  }

  /**
   * `MAX(e.fecha)` por paciente sobre las evoluciones que cuentan: no anuladas y
   * en historias no anuladas. Una historia `ANULADA` no es contacto.
   */
  private async ultimoContactoPorPaciente(): Promise<Map<bigint, Date>> {
    const filas = await this.prisma.$queryRaw<FilaUltimoContacto[]>(Prisma.sql`
      SELECT h.paciente_id AS pacienteId, MAX(e.fecha) AS ultima
        FROM evoluciones e
        JOIN historias_clinicas h ON h.id = e.historia_clinica_id
       WHERE e.anulada = 0
         AND h.estado <> 'ANULADA'
       GROUP BY h.paciente_id
    `);

    const mapa = new Map<bigint, Date>();

    for (const fila of filas) {
      // `MAX` sobre un grupo sin filas no puede pasar acá, pero el tipo lo admite
      // como `null` y un `null` en el mapa rompería `diasDeCalendarioEntre`.
      if (fila.ultima !== null) {
        mapa.set(fila.pacienteId, fila.ultima);
      }
    }

    return mapa;
  }

  /** Pacientes que entran en el cálculo: los activos, con los filtros de población. */
  private async pacientesParaAlerta(query: QuerySinContactoDto): Promise<PacienteParaAlerta[]> {
    return this.prisma.paciente.findMany({
      where: {
        activo: true,
        ...this.filtroPoblacion(query),
        // El filtro por puesto busca pacientes que pasaron por ese operativo. Sin
        // esto, filtrar el panel por "Parque XYZ" mostraría como abandonados a
        // pacientes que nunca fueron a ese operativo.
        ...(query.operativoId !== undefined
          ? { historias: { some: { operativoId: BigInt(query.operativoId) } } }
          : {}),
      },
      select: {
        id: true,
        numeroHistoria: true,
        apellido: true,
        nombre: true,
        documento: true,
        edad: true,
        _count: {
          select: { historias: { where: { estado: { not: 'ANULADA' } } } },
        },
      },
    });
  }

  // ── Filtros compartidos ────────────────────────────────────────────────────

  /**
   * Los filtros de población van contra `pacientes`. Van en el service y no
   * repetidos en cada consulta: los tres endpoints tienen que contar lo mismo
   * para la misma combinación de filtros, o el panel muestra un KPI y una lista
   * que no se reconcilian.
   */
  private filtroPoblacion(query: FiltrosDashboardDto): Prisma.PacienteWhereInput {
    const where: Prisma.PacienteWhereInput = {};

    if (query.nacionalidadId !== undefined) {
      where.nacionalidadId = BigInt(query.nacionalidadId);
    }

    if (query.sexo !== undefined) {
      where.sexo = query.sexo as Sexo;
    }

    return where;
  }

  /**
   * Los mismos filtros en SQL, como fragmento parametrizado.
   *
   * `Prisma.join` sobre un arreglo de `Prisma.sql` es lo que mantiene esto
   * seguro: los valores viajan como parámetros de la sentencia preparada, nunca
   * pegados al texto (prohibición 7). No se arma el WHERE con template literals
   * de JavaScript.
   */
  private filtrosSqlHistorias(
    query: FiltrosDashboardDto,
    aliasHistoria: string,
    aliasPaciente: string,
  ): Prisma.Sql {
    const condiciones: Prisma.Sql[] = [];

    if (query.operativoId !== undefined) {
      condiciones.push(Prisma.sql`AND ${Prisma.raw(aliasHistoria)}.operativo_id = ${query.operativoId}`);
    }

    if (query.nacionalidadId !== undefined) {
      condiciones.push(
        Prisma.sql`AND ${Prisma.raw(aliasPaciente)}.nacionalidad_id = ${query.nacionalidadId}`,
      );
    }

    if (query.sexo !== undefined) {
      condiciones.push(Prisma.sql`AND ${Prisma.raw(aliasPaciente)}.sexo = ${query.sexo}`);
    }

    return condiciones.length > 0
      ? Prisma.sql`${Prisma.join(condiciones, ' ')}`
      : Prisma.empty;
  }

  // ── Caché y utilidades ─────────────────────────────────────────────────────

  private claveCache(query: FiltrosDashboardDto & { desde?: string; hasta?: string }): string {
    return [
      query.desde ?? '-',
      query.hasta ?? '-',
      query.operativoId ?? '-',
      query.nacionalidadId ?? '-',
      query.sexo ?? '-',
    ].join('|');
  }

  private guardarEnCache(clave: string, valor: ResumenDashboard): void {
    const ttl = this.ttlCacheSegundos;

    if (ttl <= 0) {
      return;
    }

    if (this.cacheResumen.size >= MAX_ENTRADAS_CACHE) {
      // `Map` preserva el orden de inserción: la primera es la más vieja.
      const masVieja = this.cacheResumen.keys().next().value;

      if (masVieja !== undefined) {
        this.cacheResumen.delete(masVieja);
      }
    }

    this.cacheResumen.set(clave, { expiraEn: Date.now() + ttl * 1000, valor });
  }

  /**
   * El día siguiente a `hasta`, en UTC. Convierte el extremo derecho de un
   * intervalo cerrado en uno semiabierto, que es la única forma de incluir el
   * último día completo sin depender de la hora.
   */
  private manana(hasta: string): string {
    const dia = new Date(`${hasta}T00:00:00.000Z`);

    dia.setUTCDate(dia.getUTCDate() + 1);

    return dia.toISOString();
  }
}

interface FilaAlerta {
  pacienteId: bigint;
  apellido: string;
  nombre: string;
  diasSinContacto: number | null;
}

/**
 * Crítico primero: más días sin contacto, antes.
 *
 * Los que nunca tuvieron evolución van **al final**, no al principio. No es un
 * detalle de orden: `diasSinContacto = null` significa "no sabemos cuándo lo
 * vimos por última vez", no "hace mucho que no lo vemos". Ordenarlos primero
 * mezclaría un dato desconocido con el dato más grave, que es el que sí
 * sabemos. Dentro de cada grupo, apellido y luego `id`, para que el paginado sea
 * estable.
 */
function ordenarPorCriticidad(
  a: FilaAlerta,
  b: FilaAlerta,
): number {
  if (a.diasSinContacto === null && b.diasSinContacto === null) {
    return a.apellido.localeCompare(b.apellido, 'es') || Number(a.pacienteId - b.pacienteId);
  }

  if (a.diasSinContacto === null) {
    return 1;
  }

  if (b.diasSinContacto === null) {
    return -1;
  }

  return (
    b.diasSinContacto - a.diasSinContacto ||
    a.apellido.localeCompare(b.apellido, 'es') ||
    Number(a.pacienteId - b.pacienteId)
  );
}
