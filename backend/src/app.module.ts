import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { configuracionValidacion } from './config/validacion.config.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PacientesModule } from './pacientes/pacientes.module.js';
import { HistoriasClinicasModule } from './historias-clinicas/historias-clinicas.module.js';
import { RepresentantesModule } from './representantes/representantes.module.js';
import { CatalogosModule } from './catalogos/catalogos.module.js';
import { MedicosVoluntariosModule } from './medicos-voluntarios/medicos-voluntarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      validationSchema: configuracionValidacion,
    }),
    // `PrismaModule` es global: los services de dominio inyectan `PrismaService`
    // sin volver a importarlo.
    PrismaModule,
    // `AuthModule` registra los guards globales con APP_GUARD: tiene que
    // importarse para que JwtAuthGuard y RolesGuard protejan toda la API.
    AuthModule,
    HistoriasClinicasModule,
    // `PacientesModule` importa a `HistoriasClinicasModule` para el segundo
    // ingreso; se declara acá para que sus rutas queden registradas aunque el
    // orden de imports cambie.
    PacientesModule,
    RepresentantesModule,
    CatalogosModule,
    MedicosVoluntariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
