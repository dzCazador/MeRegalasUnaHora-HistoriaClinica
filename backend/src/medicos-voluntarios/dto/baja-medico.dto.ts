import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BajaMedicoDto {
  @ApiProperty({
    description:
      'false da de baja al médico, true lo reactiva. Es la **única** forma de baja: ' +
      'no existe borrado físico (RF-04.4).',
    example: false,
  })
  @IsBoolean({ message: 'activo debe ser verdadero o falso' })
  activo: boolean;
}
