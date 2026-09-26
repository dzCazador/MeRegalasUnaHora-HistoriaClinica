import type { Control } from 'react-hook-form';
import { z } from 'zod';

/**
 * Esquema del formulario de admisión, bloque por bloque (CU-01).
 *
 * Replica **exactamente** las reglas de `../01-requerimientos-y-negocio.md` §6 y sus
 * mensajes sugeridos. El backend repite estas validaciones en `class-validator`: son
 * la red de seguridad, no la primera línea. La primera línea es acá, porque el
 * backend sólo responde después de un viaje de ida y vuelta.
 *
 * Los 16 campos de `§3.1`: 2 del Bloque A (uno automático, uno la fecha), 10 del
 * Bloque B, 2 del Bloque C y 2 del Bloque D.
 */

/** `2026-09-25` a `2026-09-25`, sin las horas ni el `Z` que rompe `<input type="date">`. */
export function aFechaIso(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

export const HOY = aFechaIso(new Date());

/**
 * Edad que se obtiene de una fecha de nacimiento.
 *
 * Se calcula **por día calendario**, no por división de timestamps: dividir
 * `Date.now() - nacimiento` entre los días del año da 45,99 → 45 para alguien que
 * ya cumplió 46. El método de día calendario es el que coincide con lo que el
 * médico tiene en la cabeza.
 */
export function calcularEdad(fechaNacimiento: string, referencia: Date = new Date()): number {
  const partes = fechaNacimiento.split('-').map(Number);
  const [anio, mes, dia] = partes;

  if (!anio || !mes || !dia) {
    return 0;
  }

  let edad = referencia.getFullYear() - anio;
  const mesActual = referencia.getMonth() + 1;
  const diaActual = referencia.getDate();

  // Todavía no cumplió este año.
  if (mesActual < mes || (mesActual === mes && diaActual < dia)) {
    edad -= 1;
  }

  return Math.max(0, edad);
}

/**
 * Entero acotado cuya **entrada es texto** y cuya **salida es un número**.
 *
 * El formulario guarda strings porque es eso lo que devuelven `<input>` y `<select>`;
 * el esquema los convierte al validar. Así los dos tipos encajan sin `as` en ningún
 * lado, y el mensaje de error sigue siendo el de `../01` §6.
 *
 * Con `z.coerce` la entrada quedaba como `unknown`, que obligaba a castear en cada
 * campo. Con `transform` + `pipe` la entrada es `string` y la salida `number`.
 */
function numeroEntero(min: number, max: number, mensaje: string) {
  return z
    .string()
    .transform((valor) => (valor.trim() === '' ? undefined : Number(valor)))
    .pipe(
      z
        .number({ message: mensaje })
        .int({ message: mensaje })
        .min(min, { message: mensaje })
        .max(max, { message: mensaje }),
    );
}

/** Igual que `numeroEntero` pero admite que no se elija nada. */
function numeroEnteroOpcional(min: number, max: number, mensaje: string) {
  return z
    .string()
    .transform((valor) => (valor.trim() === '' ? undefined : Number(valor)))
    .pipe(
      z
        .number({ message: mensaje })
        .int({ message: mensaje })
        .min(min, { message: mensaje })
        .max(max, { message: mensaje })
        .optional(),
    );
}

/* ------------------------------------------------------------------ */
/* Bloque A                                                            */
/* ------------------------------------------------------------------ */

/** `numeroHistoria` no se valida desde el cliente: lo asigna el servidor (DI-02). */
const bloqueA = {
  fecha: z
    .string()
    .min(1, { message: 'La fecha del ingreso es obligatoria' })
    .refine((valor) => valor <= HOY, {
      message: 'La fecha del ingreso no puede ser de un día posterior al de hoy',
    }),
} as const;

/* ------------------------------------------------------------------ */
/* Bloque B — datos de identificación                                  */
/* ------------------------------------------------------------------ */

const textoNombre = (campo: string) =>
  z
    .string()
    .trim()
    .min(2, { message: `${campo} es obligatorio y debe tener al menos 2 caracteres` })
    .max(80, { message: `${campo} no puede superar los 80 caracteres` });

/**
 * `documento`: sólo dígitos (RN-01). Un paciente sin DNI deja el campo vacío y
 * aprieta *"Sin documento"*, que marca el tipo; nunca se lo bloquea.
 */
const documento = z
  .string()
  .trim()
  .max(20, { message: 'El documento no puede superar los 20 caracteres' })
  .refine(
    (valor) => valor === '' || /^\d{3,20}$/.test(valor),
    { message: 'El documento debe tener entre 3 y 20 dígitos, sin letras ni guiones' },
  );

const bloqueB = {
  apellido: textoNombre('El apellido'),
  nombre: textoNombre('El nombre'),
  documento,
  /**
   * Opcional. El botón *"Sin documento"* lo fija en el ítem 4 del catálogo, que
   * existe justamente para que la ausencia de DNI sea un dato explícito (RN-01).
   */
  tipoDocumentoId: numeroEnteroOpcional(1, 999999, 'El tipo de documento no es válido'),
  /** `0` significa "lactante o recién nacido": es un dato válido, no un vacío. */
  edad: numeroEntero(0, 120, 'Ingrese una edad válida (0 a 120)'),
  /**
   * El `<select>` de sexo manda `''` cuando no se eligió nada, y eso tiene que ser un
   * error con mensaje —no una excepción del enum— para que se muestre debajo del campo.
   * `preprocess` deja la entrada abierta y hace la comprobación en la salida.
   */
  sexo: z
    .union([z.literal(''), z.enum(['F', 'M', 'X', 'SIN_DATOS'])])
    .refine((valor) => valor !== '', {
      message: 'Seleccione el sexo. "Sin datos" es una respuesta válida',
    }),
  estadoCivilId: numeroEntero(1, 999999, 'Seleccione el estado civil'),
  nacionalidadId: numeroEntero(1, 999999, 'Seleccione la nacionalidad'),
  fechaNacimiento: z
    .string()
    .refine((valor) => {
      if (valor === '') {
        return true;
      }

      // No puede ser de un día posterior al de hoy.
      if (valor > HOY) {
        return false;
      }

      // Ni de hace más de 120 años.
      return calcularEdad(valor) <= 120;
    }, { message: 'La fecha de nacimiento no es válida' }),
  domicilio: z.string().trim().max(200, { message: 'El domicilio no puede superar los 200 caracteres' }),
  telefono: z
    .string()
    .trim()
    .max(30, { message: 'El teléfono no puede superar los 30 caracteres' })
    .refine(
      (valor) => valor === '' || /^\+?[\d\s()-]{3,30}$/.test(valor),
      { message: 'El teléfono debe tener entre 3 y 30 dígitos. Se permiten + y guiones' },
    ),
  sinDomicilioFijo: z.boolean(),
} as const;

/* ------------------------------------------------------------------ */
/* Bloque C — datos del ingreso                                        */
/* ------------------------------------------------------------------ */

const bloqueC = {
  /** RN-03: el representante es opcional. Never blocks the alta. */
  representanteId: z.number().int().positive().optional(),
  motivoConsulta: z
    .string()
    .trim()
    .min(3, { message: 'El motivo de la consulta es obligatorio' })
    .max(2000, { message: 'El motivo de la consulta no puede superar los 2000 caracteres' }),
} as const;

/* ------------------------------------------------------------------ */
/* Bloque D — evolución inicial (obligatoria, RF-01.4)                  */
/* ------------------------------------------------------------------ */

/**
 * Admite fecha retroactiva para la carga diferida (CU-04), pero no de un día
 * posterior al de hoy. La tolerancia de 24 h del backend es por desfase horario;
 * acá se compara por día calendario, que es lo que el médico puede verificar.
 */
const fechaEvolucion = z
  .string()
  .min(1, { message: 'La fecha de la evolución es obligatoria' })
  .refine((valor) => valor <= HOY, { message: 'La fecha no puede ser futura' });

/**
 * Bloque D. La fecha se llama `fechaEvolucion` y no `fecha` a propósito: son **dos**
 * campos distintos (la del ingreso y la de la nota) y el DTO los manda en lugares
 * distintos. Con el mismo nombre, el spread de los objetos de bloque hacía que uno
 * pisara al otro sin avisar.
 */
const bloqueD = {
  fechaEvolucion: fechaEvolucion,
  detalle: z
    .string()
    .trim()
    .min(3, { message: 'El detalle de la evolución es obligatorio' })
    .max(5000, { message: 'El detalle no puede superar los 5000 caracteres' }),
} as const;

/* ------------------------------------------------------------------ */
/* Esquema completo                                                    */
/* ------------------------------------------------------------------ */

export const esquemaAdmision = z.object({ ...bloqueA, ...bloqueB, ...bloqueC, ...bloqueD });

/** El resultado de validar: lo que viaja al backend. */
export type FormularioAdmision = z.infer<typeof esquemaAdmision>;

/**
 * Lo que el formulario tiene **mientras se llena**, que no es lo mismo que lo
 * validado: un `<select>` devuelve texto y un input numérico vacío es `undefined`.
 *
 * Por eso `useForm` usa tres genéricos — `useForm<ValoresFormulario, unknown,
 * FormularioAdmision>` — y no castear a mano en cada campo. El `resolver` convierte
 * uno en el otro en el envío.
 */
export interface ValoresFormulario {
  fecha: string;
  fechaEvolucion: string;
  apellido: string;
  nombre: string;
  documento: string;
  tipoDocumentoId: string;
  edad: string;
  sexo: SexoFormulario;
  estadoCivilId: string;
  nacionalidadId: string;
  fechaNacimiento: string;
  domicilio: string;
  telefono: string;
  sinDomicilioFijo: boolean;
  /** RN-03: opcional. El botón de alta rápida lo escribe, el resto lo deja en . */
  representanteId?: number;
  motivoConsulta: string;
  detalle: string;
}

export type SexoFormulario = 'F' | 'M' | 'X' | 'SIN_DATOS' | '';

/**
 * El  del formulario de admisión, con su tercer genérico ya puesto.
 *  a secas no sirve: el valor de salida es el
 * **validado**, no el que se está tipeando, y sin eso los hijos no compilan.
 */
export type ControlAdmision = Control<ValoresFormulario, unknown, FormularioAdmision>;

/** Sólo el Bloque B, para el modal de edición de un paciente ya cargado. */
export const esquemaEdicion = z.object({
  apellido: textoNombre('El apellido'),
  nombre: textoNombre('El nombre'),
  documento,
  edad: bloqueB.edad,
  sexo: bloqueB.sexo,
  estadoCivilId: bloqueB.estadoCivilId,
  nacionalidadId: bloqueB.nacionalidadId,
  fechaNacimiento: bloqueB.fechaNacimiento,
  domicilio: bloqueB.domicilio,
  telefono: bloqueB.telefono,
  sinDomicilioFijo: bloqueB.sinDomicilioFijo,
});

export type FormularioEdicion = z.infer<typeof esquemaEdicion>;

/** Una evolución suelta, dentro de una historia ya abierta. */
export const esquemaEvolucion = z.object({
  fechaEvolucion,
  detalle: bloqueD.detalle,
});

export type FormularioEvolucion = z.infer<typeof esquemaEvolucion>;

/** Segundo ingreso: motivo y evolución, con los datos de identificación ya cargados. */
export const esquemaSegundoIngreso = z.object({
  motivoConsulta: bloqueC.motivoConsulta,
  fechaEvolucion,
  detalle: bloqueD.detalle,
  representanteId: bloqueC.representanteId,
});

export type FormularioSegundoIngreso = z.infer<typeof esquemaSegundoIngreso>;

/**
 * Discrepancia de más de 2 años entre la edad declarada y la que sale de la fecha de
 * nacimiento (RN-02). Es **advertencia, no error**: puede ser una fecha de nacimiento
 * aproximada, que es lo más común en esta población.
 */
export function discrepanciaEdad(edadDeclarada: number, fechaNacimiento: string): number {
  return Math.abs(edadDeclarada - calcularEdad(fechaNacimiento));
}

export const TOLERANCIA_EDAD = 2;

/** Campos que el médico tiene que completar sí o sí antes de poder enviar. */
export const CAMPOS_OBLIGATORIOS = [
  'apellido',
  'nombre',
  'edad',
  'sexo',
  'estadoCivilId',
  'nacionalidadId',
  'motivoConsulta',
  'fecha',
  'fechaEvolucion',
  'detalle',
] as const;
