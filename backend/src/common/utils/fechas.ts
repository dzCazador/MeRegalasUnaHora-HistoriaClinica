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
