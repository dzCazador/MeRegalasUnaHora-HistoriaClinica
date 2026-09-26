import { ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger';
import { IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { CreatePacienteDto } from './create-paciente.dto.js';
import { CreateIngresoDto } from '../../historias-clinicas/dto/create-ingreso.dto.js';
import { CreateEvolucionDto } from '../../historias-clinicas/dto/create-evolucion.dto.js';

/**
 * Bloque D del formulario: la evolución inicial. Es **obligatoria** (RF-01.4).
 * Si falta, el service aborta la transacción y no queda ni paciente ni historia.
 */
export class EvolucionInicialDto extends CreateEvolucionDto {}

/**
 * Alta completa: Bloque B (paciente) + Bloques A y C (ingreso) + Bloque D
 * (evolución inicial), en una sola transacción. Es lo que usa el formulario de
 * admisión (CU-01).
 *
 * `evolucionInicial` se excluye de `CreateIngresoDto` con `OmitType` y se declara
 * una sola vez acá: en el segundo ingreso es opcional, en el alta completa es
 * obligatoria, y sin el `Omit` la intersección chocaría con dos declaraciones del
 * mismo campo.
 */
export class CreatePacienteCompletoDto extends IntersectionType(
  CreatePacienteDto,
  OmitType(CreateIngresoDto, ['evolucionInicial'] as const),
) {
  @ApiProperty({
    type: EvolucionInicialDto,
    description:
      'Evolución inicial del ingreso. Obligatoria: sin ella no se crea ni el paciente ' +
      'ni la historia (RF-01.4).',
  })
  @IsDefined({ message: 'La evolución inicial es obligatoria' })
  @ValidateNested()
  @Type(() => EvolucionInicialDto)
  evolucionInicial: EvolucionInicialDto;
}
