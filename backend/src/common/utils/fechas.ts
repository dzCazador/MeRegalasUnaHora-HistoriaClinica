import { BadRequestException } from '@nestjs/common';

/**
 * No se puede registrar una consulta de un día posterior al de hoy.
 *
 * La regla compara **días calendario**, no instantes. La alternativa —"24 h de
 * tolerancia" medido contra el instante actual— deja pasar justo lo que hay que
 * impedir: una evolución con `fecha` de mañana llega con una diferencia de
 * exactamente 24 h y no la rechaza. Comparando días, un profesional que carga a
 * la medianoche todavía puede registrar la consulta de hoy, pero nadie puede
 * registrar una de mañana.
 *
 * MySQL no permite `NOW()` dentro de un `CHECK` —error 3814—, así que esta regla
 * vive acá y no como constraint (DI-13). Se usa en los DTO y **también** en los
 * services: el DTO puede esquivarse si el service se llama desde otro camino.
 */
export function exigirFechaNoFutura(fecha: Date, campo: string, ahora = new Date()): void {
  const diaDeLaFecha = fecha.toISOString().slice(0, 10);
  const diaDeHoy = ahora.toISOString().slice(0, 10);

  if (diaDeLaFecha > diaDeHoy) {
    throw new BadRequestException(
      `La ${campo} no puede ser de un día posterior al de hoy (${diaDeHoy}).`,
    );
  }
}

const MS_POR_DIA = 86_400_000;

/**
 * Pasa una fecha a su medianoche en UTC, para que dos instantes del mismo día
 * calendarario den exactamente el mismo número.
 */
function aMedianocheUtc(fecha: Date): number {
  const [anio, mes, dia] = fecha.toISOString().slice(0, 10).split('-').map(Number);

  return Date.UTC(anio, mes - 1, dia);
}

/**
 * Días **calendarario** entre dos fechas. Va para `diasSinContacto` del panel
 * (RN-12) y para cualquier "hace cuántos días".
 *
 * Los dos extremos se truncan a su día antes de restar, así que la división es
 * exacta y no hay residuo que redondear. Es la diferencia con dividir la
 * diferencia de timestamps crudos: una evolución de ayer a las 23:50 contra un
 * "hoy" a las 00:10 son 12 minutos de diferencia, y `Math.round` de eso da 0
 * (que es lo correcto) pero `Math.ceil` daría 1 (un día de mentira, DI-22).
 * Truncando primero, el residuo nunca aparece.
 */
export function diasDeCalendarioEntre(fecha: Date, referencia = new Date()): number {
  return Math.round((aMedianocheUtc(referencia) - aMedianocheUtc(fecha)) / MS_POR_DIA);
}

/** `YYYY-MM` de una fecha. Es la clave de agrupación mensual del panel. */
export function mesIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 7);
}

/**
 * Todos los meses entre dos días, inclusive, aunque no tengan datos.
 *
 * El gráfico del panel usa esta lista para dibujar un mes en cero. Si las series
 * vinieran sólo con los meses que tienen registros, el eje saltaría de marzo a
 * junio y el mes sin atención sería invisible justo cuando es lo que hay que
 * mirar.
 */
export function rangoDeMeses(desde: Date, hasta: Date): string[] {
  const meses: string[] = [];
  const anio = desde.getUTCFullYear();
  const mes = desde.getUTCMonth();
  const anioHasta = hasta.getUTCFullYear();
  const mesHasta = hasta.getUTCMonth();

  let cursorAnio = anio;
  let cursorMes = mes;

  // El tope evita el bucle infinito si se pasan las fechas al revés.
  for (let i = 0; i < 600; i += 1) {
    meses.push(`${cursorAnio}-${String(cursorMes + 1).padStart(2, '0')}`);

    if (cursorAnio === anioHasta && cursorMes === mesHasta) {
      break;
    }

    cursorMes += 1;

    if (cursorMes > 11) {
      cursorMes = 0;
      cursorAnio += 1;
    }
  }

  return meses;
}
