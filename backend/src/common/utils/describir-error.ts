/**
 * Los errores de Prisma no siguen una forma estable: los de inicialización y
 * conexión traen `errorCode` (`P1001`), los de consulta traen `code` (`P2002`),
 * y en algunos caminos `message` llega vacía. Sin esto el log dice literalmente
 * "MySQL no responde. " y no ayuda a diagnosticar nada.
 */
export function describirError(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return String(error);
  }

  const candidato = error as {
    name?: unknown;
    code?: unknown;
    errorCode?: unknown;
    message?: unknown;
  };

  const partes: string[] = [];

  if (typeof candidato.name === 'string' && candidato.name.length > 0) {
    partes.push(candidato.name);
  }

  const codigo = candidato.code ?? candidato.errorCode;
  if (typeof codigo === 'string' && codigo.length > 0) {
    partes.push(`[${codigo}]`);
  }

  if (typeof candidato.message === 'string' && candidato.message.trim().length > 0) {
    partes.push(candidato.message.trim());
  }

  return partes.length > 0 ? partes.join(' ') : 'error sin detalle';
}
