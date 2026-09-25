// Carga inicial de catálogos y del usuario ADMIN. Es idempotente: correrlo dos veces no
// duplica filas (tarea 2.2.7). NO inserta pacientes, médicos ni historias ficticias (tarea 2.2.8):
// los datos de pacientes reales están prohibidos en el repositorio y en el seed (§5.1 de AGENTS.md).

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Catálogos ──────────────────────────────────────────────────────────────

const ESTADOS_CIVILES = [
  { nombre: 'Soltero/a', orden: 1 },
  { nombre: 'Casado/a', orden: 2 },
  { nombre: 'Unión libre', orden: 3 },
  { nombre: 'Separado/a', orden: 4 },
  { nombre: 'Divorciado/a', orden: 5 },
  { nombre: 'Viudo/a', orden: 6 },
  { nombre: 'Sin datos', orden: 99 },
];

// Argentina primero (orden 1) por ser el contexto por defecto del proyecto.
// Lista de países con codigo_iso ISO 3166-1 alfa-3.
const NACIONALIDADES: Array<{ nombre: string; codigoIso: string | null }> = [
  { nombre: 'Argentina', codigoIso: 'ARG' },
  { nombre: 'Bolivia', codigoIso: 'BOL' },
  { nombre: 'Brasil', codigoIso: 'BRA' },
  { nombre: 'Chile', codigoIso: 'CHL' },
  { nombre: 'Paraguay', codigoIso: 'PRY' },
  { nombre: 'Uruguay', codigoIso: 'URY' },
  { nombre: 'Perú', codigoIso: 'PER' },
  { nombre: 'Colombia', codigoIso: 'COL' },
  { nombre: 'Venezuela', codigoIso: 'VEN' },
  { nombre: 'Ecuador', codigoIso: 'ECU' },
  { nombre: 'México', codigoIso: 'MEX' },
  { nombre: 'Guatemala', codigoIso: 'GTM' },
  { nombre: 'Honduras', codigoIso: 'HND' },
  { nombre: 'El Salvador', codigoIso: 'SLV' },
  { nombre: 'Nicaragua', codigoIso: 'NIC' },
  { nombre: 'Costa Rica', codigoIso: 'CRI' },
  { nombre: 'Panamá', codigoIso: 'PAN' },
  { nombre: 'Cuba', codigoIso: 'CUB' },
  { nombre: 'República Dominicana', codigoIso: 'DOM' },
  { nombre: 'Haití', codigoIso: 'HTI' },
  { nombre: 'España', codigoIso: 'ESP' },
  { nombre: 'Portugal', codigoIso: 'PRT' },
  { nombre: 'Francia', codigoIso: 'FRA' },
  { nombre: 'Italia', codigoIso: 'ITA' },
  { nombre: 'Alemania', codigoIso: 'DEU' },
  { nombre: 'Reino Unido', codigoIso: 'GBR' },
  { nombre: 'Suecia', codigoIso: 'SWE' },
  { nombre: 'Noruega', codigoIso: 'NOR' },
  { nombre: 'Finlandia', codigoIso: 'FIN' },
  { nombre: 'Países Bajos', codigoIso: 'NLD' },
  { nombre: 'Bélgica', codigoIso: 'BEL' },
  { nombre: 'Suiza', codigoIso: 'CHE' },
  { nombre: 'Austria', codigoIso: 'AUT' },
  { nombre: 'Polonia', codigoIso: 'POL' },
  { nombre: 'Rumanía', codigoIso: 'ROU' },
  { nombre: 'Ucrania', codigoIso: 'UKR' },
  { nombre: 'Rusia', codigoIso: 'RUS' },
  { nombre: 'Turquía', codigoIso: 'TUR' },
  { nombre: 'China', codigoIso: 'CHN' },
  { nombre: 'Japón', codigoIso: 'JPN' },
  { nombre: 'India', codigoIso: 'IND' },
  { nombre: 'Sin datos', codigoIso: null },
];

const TIPOS_DOCUMENTO = [
  { nombre: 'DNI', sigla: 'DNI', requiereNumero: true, orden: 1 },
  { nombre: 'Cédula', sigla: 'CED', requiereNumero: true, orden: 2 },
  { nombre: 'Pasaporte', sigla: 'PAS', requiereNumero: true, orden: 3 },
  { nombre: 'Documento de emergencia', sigla: 'DOC_EMERG', requiereNumero: true, orden: 4 },
  { nombre: 'Sin documento', sigla: 'SIN_DOC', requiereNumero: false, orden: 99 },
];

// ── Lógica de seed ─────────────────────────────────────────────────────────

async function seedEstadosCiviles() {
  for (const item of ESTADOS_CIVILES) {
    await prisma.estadoCivil.upsert({
      where: { nombre: item.nombre },
      update: { orden: item.orden },
      create: { ...item, activo: true },
    });
  }
  console.log(`  estados_civiles: ${ESTADOS_CIVILES.length} ítems`);
}

async function seedNacionalidades() {
  for (const [i, item] of NACIONALIDADES.entries()) {
    await prisma.nacionalidad.upsert({
      where: { nombre: item.nombre },
      update: { codigoIso: item.codigoIso, orden: i + 1 },
      create: { ...item, orden: i + 1, activo: true },
    });
  }
  console.log(`  nacionalidades: ${NACIONALIDADES.length} ítems`);
}

async function seedTiposDocumento() {
  for (const item of TIPOS_DOCUMENTO) {
    await prisma.tipoDocumento.upsert({
      where: { nombre: item.nombre },
      update: { sigla: item.sigla, requiereNumero: item.requiereNumero, orden: item.orden },
      create: { ...item, activo: true },
    });
  }
  console.log(`  tipos_documento: ${TIPOS_DOCUMENTO.length} ítems`);
}

// Operativos: NO se siembran datos. Los puestos de atención concretos los define la
// organización (bloqueo B-7). Se deja la tabla vacía a propósito.
async function seedOperativos() {
  const count = await prisma.operativo.count();
  console.log(`  operativos: ${count} (sin seed; los define la organización, B-7)`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const nombre = process.env.ADMIN_NOMBRE;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !nombre || !password) {
    throw new Error(
      'Faltan ADMIN_EMAIL, ADMIN_NOMBRE o ADMIN_PASSWORD en el entorno. El seed no tiene valor por defecto.',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.medicoVoluntario.upsert({
    where: { email },
    update: { nombre, passwordHash, rol: 'ADMIN', activo: true },
    create: {
      email,
      nombre,
      apellido: 'del Sistema',
      documento: 'ADMIN-000',
      passwordHash,
      rol: 'ADMIN',
      activo: true,
    },
  });

  console.log(`  admin: ${email}`);
}

async function main() {
  console.log('Seed meRegalasUnaHora...');
  await seedEstadosCiviles();
  await seedNacionalidades();
  await seedTiposDocumento();
  await seedOperativos();
  await seedAdmin();
  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error('Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
