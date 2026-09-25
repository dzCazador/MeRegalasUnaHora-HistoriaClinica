-- Migración inicial de meRegalasUnaHora.
--
-- Generada con `prisma migrate dev --name init --create-only` y editada a mano (DI-06).
-- Diferencias respecto de lo que emite Prisma, y por qué:
--
-- 1. COLLATE utf8mb4_0900_ai_ci en todas las tablas. Prisma emite utf8mb4_unicode_ci, que no
--    resuelve igual: la búsqueda insensible a acentos (RF-03.2) necesita 0900_ai_ci para que
--    `q=jose` encuentre `José`. El COLLATE explícito pisa el default de la base.
-- 2. CONSTRAINT ck_* de rango y de dominio. Prisma no declara CHECK; van-written acá para que
--    el motor los haga cumplir y no solo el DTO.
-- 3. NO se incluyen `ck_hc_fecha_no_futura` ni `ck_ev_fecha_no_futura`: MySQL rechaza funciones
--    no deterministas dentro de un CHECK ("An expression of a check constraint contains
--    disallowed function: now", error 3814). La fecha no futura se valida en el DTO, en la capa
--    de aplicación. Ver desviación DI-13 en el reporte de cierre de la Fase 2.

-- CreateTable
CREATE TABLE `medicos_voluntarios` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(80) NOT NULL,
    `apellido` VARCHAR(80) NOT NULL,
    `documento` VARCHAR(20) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `matricula` VARCHAR(40) NULL,
    `especialidad` VARCHAR(80) NULL,
    `telefono` VARCHAR(30) NULL,
    `rol` ENUM('MEDICO', 'COORDINADOR', 'ADMIN') NOT NULL DEFAULT 'MEDICO',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `ultimo_acceso` DATETIME NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `medicos_voluntarios_documento_key`(`documento`),
    UNIQUE INDEX `medicos_voluntarios_email_key`(`email`),
    UNIQUE INDEX `medicos_voluntarios_matricula_key`(`matricula`),
    INDEX `ix_mv_activo`(`activo`),
    INDEX `ix_mv_apellido`(`apellido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `pacientes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `numero_historia` INTEGER UNSIGNED NULL,
    `apellido` VARCHAR(80) NOT NULL,
    `nombre` VARCHAR(80) NOT NULL,
    `documento` VARCHAR(20) NULL,
    `tipo_documento_id` BIGINT NULL,
    `edad` TINYINT NOT NULL,
    `sexo` ENUM('F', 'M', 'X', 'SIN_DATOS') NOT NULL DEFAULT 'SIN_DATOS',
    `estado_civil_id` BIGINT NULL,
    `fecha_nacimiento` DATE NULL,
    `nacionalidad_id` BIGINT NULL,
    `domicilio` VARCHAR(200) NULL,
    `telefono` VARCHAR(30) NULL,
    `sin_domicilio_fijo` BOOLEAN NOT NULL DEFAULT false,
    `observaciones` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT NULL,

    UNIQUE INDEX `pacientes_numero_historia_key`(`numero_historia`),
    UNIQUE INDEX `pacientes_documento_key`(`documento`),
    INDEX `ix_pacientes_apellido_nombre`(`apellido`, `nombre`),
    INDEX `ix_pacientes_documento_bt`(`documento`),
    INDEX `ix_pacientes_activo`(`activo`),
    INDEX `ix_pacientes_nacionalidad`(`nacionalidad_id`),
    CONSTRAINT `ck_pacientes_edad` CHECK (`edad` BETWEEN 0 AND 120),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `historias_clinicas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `paciente_id` BIGINT NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `edad_registrada` TINYINT NOT NULL,
    `motivo_consulta` TEXT NOT NULL,
    `representante_id` BIGINT NULL,
    `operativo_id` BIGINT NULL,
    `estado` ENUM('ACTIVA', 'CERRADA', 'ANULADA') NOT NULL DEFAULT 'ACTIVA',
    `tipo_ingreso` ENUM('CONSULTA', 'EMERGENCIA', 'CONTROL', 'DERIVACION') NOT NULL DEFAULT 'CONSULTA',
    `resumen` TEXT NULL,
    `fecha_cierre` DATETIME NULL,
    `motivo_cierre` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `medico_voluntario_id` BIGINT NOT NULL,

    INDEX `ix_hc_paciente_fecha`(`paciente_id`, `fecha` DESC),
    INDEX `ix_hc_fecha`(`fecha`),
    INDEX `ix_hc_estado`(`estado`),
    INDEX `ix_hc_medico`(`medico_voluntario_id`),
    INDEX `ix_hc_operativo`(`operativo_id`),
    CONSTRAINT `ck_hc_edad` CHECK (`edad_registrada` BETWEEN 0 AND 120),
    CONSTRAINT `ck_hc_cierre` CHECK ((`estado` = 'CERRADA' AND `fecha_cierre` IS NOT NULL) OR `estado` <> 'CERRADA'),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `evoluciones` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `historia_clinica_id` BIGINT NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `detalle` TEXT NOT NULL,
    `medico_voluntario_id` BIGINT NOT NULL,
    `anulada` BOOLEAN NOT NULL DEFAULT false,
    `motivo_anulacion` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ix_ev_hc_fecha`(`historia_clinica_id`, `fecha` DESC),
    INDEX `ix_ev_fecha`(`fecha`),
    INDEX `ix_ev_medico`(`medico_voluntario_id`),
    CONSTRAINT `ck_ev_detalle` CHECK (CHAR_LENGTH(`detalle`) >= 3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `representantes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(120) NOT NULL,
    `tipo` ENUM('PERSONA', 'ORGANIZACION', 'EFECTOR') NOT NULL DEFAULT 'PERSONA',
    `documento` VARCHAR(20) NULL,
    `telefono` VARCHAR(30) NULL,
    `email` VARCHAR(120) NULL,
    `vinculo` VARCHAR(80) NULL,
    `direccion` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ix_representantes_nombre`(`nombre`),
    INDEX `ix_representantes_documento`(`documento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `estados_civiles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(40) NOT NULL,
    `orden` TINYINT NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `estados_civiles_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `nacionalidades` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(60) NOT NULL,
    `codigo_iso` CHAR(3) NULL,
    `orden` TINYINT NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nacionalidades_nombre_key`(`nombre`),
    UNIQUE INDEX `nacionalidades_codigo_iso_key`(`codigo_iso`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `tipos_documento` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(60) NOT NULL,
    `sigla` VARCHAR(10) NULL,
    `requiere_numero` BOOLEAN NOT NULL DEFAULT true,
    `orden` TINYINT NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tipos_documento_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- CreateTable
CREATE TABLE `operativos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(80) NOT NULL,
    `direccion` VARCHAR(200) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `operativos_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- AddForeignKey
ALTER TABLE `pacientes` ADD CONSTRAINT `pacientes_estado_civil_id_fkey` FOREIGN KEY (`estado_civil_id`) REFERENCES `estados_civiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pacientes` ADD CONSTRAINT `pacientes_nacionalidad_id_fkey` FOREIGN KEY (`nacionalidad_id`) REFERENCES `nacionalidades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pacientes` ADD CONSTRAINT `pacientes_tipo_documento_id_fkey` FOREIGN KEY (`tipo_documento_id`) REFERENCES `tipos_documento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pacientes` ADD CONSTRAINT `pacientes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `medicos_voluntarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historias_clinicas` ADD CONSTRAINT `historias_clinicas_paciente_id_fkey` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historias_clinicas` ADD CONSTRAINT `historias_clinicas_representante_id_fkey` FOREIGN KEY (`representante_id`) REFERENCES `representantes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historias_clinicas` ADD CONSTRAINT `historias_clinicas_operativo_id_fkey` FOREIGN KEY (`operativo_id`) REFERENCES `operativos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historias_clinicas` ADD CONSTRAINT `historias_clinicas_medico_voluntario_id_fkey` FOREIGN KEY (`medico_voluntario_id`) REFERENCES `medicos_voluntarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evoluciones` ADD CONSTRAINT `evoluciones_historia_clinica_id_fkey` FOREIGN KEY (`historia_clinica_id`) REFERENCES `historias_clinicas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evoluciones` ADD CONSTRAINT `evoluciones_medico_voluntario_id_fkey` FOREIGN KEY (`medico_voluntario_id`) REFERENCES `medicos_voluntarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
