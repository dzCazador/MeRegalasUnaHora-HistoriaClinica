'use client';

import { LayoutDashboard, Stethoscope, Users, type LucideIcon } from 'lucide-react';

/**
 * Secciones de navegación. **Toda pantalla nueva se suma acá**
 * (`../02-arquitectura-tech.md` §10.3): es el único lugar donde vive la
 * navegación y lo que impide que una pantalla quede huérfana.
 */
export interface SeccionNav {
  titulo: string;
  ruta: string;
  icono: LucideIcon;
  descripcion: string;
}

export const NAV_SECTIONS: SeccionNav[] = [
  {
    titulo: 'Dashboard',
    ruta: '/dashboard',
    icono: LayoutDashboard,
    descripcion: 'Seguimiento de la atención',
  },
  {
    titulo: 'Pacientes',
    ruta: '/pacientes',
    icono: Stethoscope,
    descripcion: 'Historia clínica y admisión',
  },
  {
    titulo: 'Médicos',
    ruta: '/medicos',
    icono: Users,
    descripcion: 'Profesionales voluntarios',
  },
];
