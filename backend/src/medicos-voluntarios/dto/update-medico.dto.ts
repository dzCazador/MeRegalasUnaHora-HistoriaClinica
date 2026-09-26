import { PartialType } from '@nestjs/swagger';

import { CreateMedicoDto } from './create-medico.dto.js';

/**
 * Actualización de un médico. Todos los campos opcionales, y la contraseña no se
 * toca si no viene: dejarla vacía no la borra ni la cambia.
 */
export class UpdateMedicoDto extends PartialType(CreateMedicoDto) {}
