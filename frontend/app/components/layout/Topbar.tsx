'use client';

import { Menu } from 'lucide-react';

import { useAuth } from '../../auth-context';

interface PropsTopbar {
  onAbrirMenu: () => void;
  titulo?: string;
}

export function Topbar({ onAbrirMenu, titulo }: PropsTopbar) {
  const { usuario } = useAuth();

  return (
    <header className="bg-surface flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={onAbrirMenu}
        className="text-muted-foreground hover:text-foreground rounded-md p-1.5 lg:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      {titulo ? <h1 className="text-sm font-semibold">{titulo}</h1> : <span />}

      {usuario ? (
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{usuario.nombre}</p>
            <p className="text-muted-foreground text-xs">{usuario.rol}</p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
