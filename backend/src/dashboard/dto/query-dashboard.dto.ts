import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sexo } from '@prisma/client';

import { PaginacionDto } from '../../common/dto/paginacion.dto.js';

/** Máximo de días que puede abarcar un rango. Acota el rango por defecto (RNF-04). */
export const RANGO_MAXIMO_DIAS = 366;

/**
 * El contrato son **días**, no instantes: `YYYY-MM-DD` y nada más.
 *
 * Comparar por cadena es correcto **porque el formato tiene ancho fijo**: el
 * orden lexicográfico de `YYYY-MM-DD` es el mismo que el cronológico. Si en
 * cambio se convolutionara a `Date` y se comparara, la zona horaria movería el
 * borde y un `hasta` del día de hoy podría recortar el día entero.
 */
const FECHA_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** `''` se trata como ausente para que `?desde=` no rompa la validación. */
const aTexto = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return typeof value === 'string' ? value.trim() : value;
};

interface RangoFechas {
  desde?: string;
  hasta?: string;
}

/** Rechaza `desde > hasta` diciendo cuál de los dos está mal. */
function RangoCoherente(opciones: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'rangoCoherente',
      target: object.constructor,
      propertyName,
      options: opciones,
      validator: {
        validate(_valor: unknown, args: ValidationArguments) {
          // Ojo: en un decorador de propiedad, `value` es el valor de ESA
          // propiedad, no el DTO. Para comparar `desde` con `hasta` hay que leer
          // el objeto contenedor desde `args.object`. Leer `value` acá hacía que
          // el validador comparara un string contra `undefined`, siempre `true`,
          // y `desde=2026-09-30&hasta=2026-09-01` pasaba con 200 y cero
          // resultados en vez de un 400.
          const { desde, hasta } = args.object as RangoFechas;

          return desde === undefined || hasta === undefined || desde <= hasta;
        },
        defaultMessage(args: ValidationArguments) {
          const { desde, hasta } = args.object as RangoFechas;

          if (desde !== undefined && hasta !== undefined && desde > hasta) {
            return `El rango de fechas es inválido: "desde" (${desde}) es posterior a "hasta" (${hasta}).`;
          }

          return 'El rango de fechas no es válido.';
        },
      },
    });
  };
}

/**
 * Acota la duración del rango. Sin tope, un `desde=1970` agrega la base entera
 * y el panel deja de responder (RNF-04).
 *
 * Un rango invertido devuelve `true` a propósito: de eso se ocupa
 * `RangoCoherente`, que tiene el mensaje que corresponde. Si esta también
 * fallara, el usuario vería "el rango no puede superar 366 días" por haber
 * mandado del 30 de septiembre al 1º, que es un mensaje que no ayuda a nadie.
 */
function RangoAcotado(opciones: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'rangoAcotado',
      target: object.constructor,
      propertyName,
      options: opciones,
      validator: {
        validate(_valor: unknown, args: ValidationArguments) {
          const { desde, hasta } = args.object as RangoFechas;

          if (desde === undefined || hasta === undefined) {
            return true;
          }

          const dias =
            (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000;

          if (dias < 0) {
            return true;
          }

          return dias <= RANGO_MAXIMO_DIAS;
        },
        defaultMessage() {
          return `El rango no puede superar ${RANGO_MAXIMO_DIAS} días. Acotá el período.`;
        },
      },
    });
  };
}

/**
 * Filtros de población **más** paginación. Es la clase base de los tres DTO del
 * panel, y ya extiende `PaginacionDto`.
 *
 * Los tres endpoints del panel paginan, así que la paginación va en la base y no
 * se repite. Y la base tiene que ser `PaginacionDto` **por herencia de verdad**,
 * no con `IntersectionType`: la de `@nestjs/swagger` devuelve una clase que no
 * extiende nada, sólo copia metadatos de validación y decoradores, así que sus
 * getters `skip` y `take` no se heredan. Con `IntersectionType` el endpoint
 * contestaba `meta.total: 9` y `data: []`, porque `slice(undefined, undefined)`
 * devuelve vacío: paginación rota que parecía funcionar.
 */
export class FiltrosDashboardDto extends PaginacionDto {
  @ApiPropertyOptional({ description: 'Id de la nacionalidad del paciente', type: Number })
  @Type(() => Number)
  @IsInt({ message: 'La nacionalidad debe ser un id numérico' })
  @IsOptional()
  nacionalidadId?: number;

  @ApiPropertyOptional({
    description: 'Id del puesto de atención. Sólo aplica a los ingresos.',
    type: Number,
  })
  @Type(() => Number)
  @IsInt({ message: 'El operativo debe ser un id numérico' })
  @IsOptional()
  operativoId?: number;

  @ApiPropertyOptional({ enum: Sexo, description: 'Sexo del paciente' })
  @IsEnum(Sexo, { message: 'El sexo no es un valor válido' })
  @IsOptional()
  sexo?: Sexo;
}

/**
 * `GET /api/dashboard/sin-contacto`.
 *
 * Hereda los filtros de población y la paginación, pero **no** el rango de
 * fechas, y es a propósito. El cálculo de sin contacto no se recorta por el
 * período de la barra: el umbral ya define la ventana. Si este endpoint
 * aceptara fechas, filtrar por "últimos 30 días" —que es el default de la
 * pantalla— dejaría vacía la lista de todos los pacientes que hacen 100 días sin
 * volver, que es justo lo que el panel existe para mostrar (trampa de
 * `fase-06` §8).
 */
export class QuerySinContactoDto extends FiltrosDashboardDto {}

/**
 * Rango de fechas + filtros + paginación. Lo usan `resumen` y `recientes`.
 *
 * Los validadores de rango van **sólo en `desde`**, aunque lean los dos campos
 * desde `args.object`. Puestos en las dos propiedades correrían dos veces cada
 * uno y el `details` del 400 traía el mismo mensaje repetido cuatro veces.
 */
export class QueryDashboardDto extends FiltrosDashboardDto {
  @ApiProperty({
    description: 'Primer día del período, inclusive (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @Transform(aTexto)
  @Matches(FECHA_DIA, { message: '"desde" debe tener el formato YYYY-MM-DD' })
  @RangoCoherente({ message: '' })
  @RangoAcotado({ message: '' })
  desde: string;

  @ApiProperty({
    description: 'Último día del período, inclusive (YYYY-MM-DD)',
    example: '2026-09-30',
  })
  @Transform(aTexto)
  @Matches(FECHA_DIA, { message: '"hasta" debe tener el formato YYYY-MM-DD' })
  hasta: string;
}
