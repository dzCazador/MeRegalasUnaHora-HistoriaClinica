'use client';

import { useState, type ReactNode } from 'react';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface PropsAppShell {
  children: ReactNode;
  titulo?: string;
}

/** Shell de la aplicación: sidebar colapsable + topbar + contenido. */
export function AppShell({ children, titulo }: PropsAppShell) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar abierta={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onAbrirMenu={() => setMenuAbierto(true)} titulo={titulo} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
