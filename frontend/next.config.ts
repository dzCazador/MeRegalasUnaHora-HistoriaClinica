import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Las rutas `/api/*` son el BFF (DI-01): reenvían al backend con el token de la
   * cookie `HttpOnly`. Nunca se cachean — una respuesta con datos clínicos
   * guardada en un CDN es un problema de datos, no de rendimiento.
   */
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
