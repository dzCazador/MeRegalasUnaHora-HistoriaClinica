/**
 * RN-01 y la trampa 9 de AGENTS.md: en MySQL los `NULL` no colisionan en un índice
 * `UNIQUE`, pero la cadena vacía `''` **sí**. Sin esta normalización, el segundo
 * alta de un paciente sin documento devolvería un `409` fantasma.
 */

/**
 * Deja solo dígitos y convierte `''` en `null`. Los puntos y guiones de un DNI
 * tipeado como "12.345.678" o "12-345678" no deberían crear dos pacientes.
 */
export function normalizarDocumento(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }

  const soloDigitos = String(valor).replace(/\D/g, '');

  return soloDigitos.length > 0 ? soloDigitos : null;
}

/** Un documento es duplicado si ya es válido y no colisiona con el propio registro. */
export function esDocumentoDuplicado(
  documento: string | null | undefined,
  documentoActual: string | null | undefined,
): boolean {
  const normalizado = normalizarDocumento(documento);
  const actual = normalizarDocumento(documentoActual);

  if (normalizado === null) {
    return false;
  }

  return normalizado !== actual;
}

/** Recorta y colapsa espacios internos. Los `''` resultantes se treats como ausente. */
export function normalizarTexto(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }

  const limpio = String(valor).trim().replace(/\s+/g, ' ');

  return limpio.length > 0 ? limpio : null;
}
