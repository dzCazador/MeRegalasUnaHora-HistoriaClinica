/**
 * Contrato REST del backend, escrito a mano a partir de Swagger.
 * Prohibición 6 de AGENTS.md: nada se importa desde `backend/`. El contrato de
 * Swagger es la frontera.
 */

export interface MetaPaginacion {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: MetaPaginacion;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
    path: string;
    timestamp: string;
  };
}

/** Error normalizado que lanzan los services. `message` es el del backend, literal. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: string[];

  constructor(status: number, cuerpo: ApiErrorBody['error']) {
    super(cuerpo.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = cuerpo.code;
    this.details = cuerpo.details;
  }
}
