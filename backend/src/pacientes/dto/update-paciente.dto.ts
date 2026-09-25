import { PartialType } from '@nestjs/swagger';

import { CreatePacienteDto } from './create-paciente.dto.js';

/**
 * `PATCH` sólo toca datos de identificación. Los campos de auditoría
 * (`createdAt`, `createdBy`), de estado (`activo`) y de negocio
 * (`numeroHistoria`) no se editan desde acá: se resuelven en el service o no se
 * exponen (tarea 2.5.3).
 */
export class UpdatePacienteDto extends PartialType(CreatePacienteDto) {}
