'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HeartPulse } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth, mensajeDeError } from '../../auth-context';

const esquema = z.object({
  email: z.email({ message: 'Ingresá un email válido' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
});

type Formulario = z.infer<typeof esquema>;

export default function PaginaLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    // Sólo se valida al enviar: marcar el campo mientras se tipea el email
    // sería ruido.
    resolver: zodResolver(esquema),
    mode: 'onSubmit',
    defaultValues: { email: '', password: '' },
  });

  async function enviar(datos: Formulario): Promise<void> {
    setErrorServidor(null);

    try {
      await login(datos.email, datos.password);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      // El mensaje del backend se muestra **literal** y es genérico a propósito:
      // no revela si el email existe ni cuál de los dos campos falló (tarea 4.4.2).
      setErrorServidor(mensajeDeError(error));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <HeartPulse aria-hidden className="text-primary size-8" />
          <h1 className="text-xl font-semibold">¿Me regalás una hora?</h1>
          <p className="text-muted-foreground text-sm">Sistema de historias clínicas</p>
        </div>

        <form onSubmit={handleSubmit(enviar)} noValidate className="bg-surface space-y-4 rounded-lg border p-6">
          {errorServidor ? (
            <div
              role="alert"
              data-testid="error-servidor"
              className="border-destructive bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
            >
              {errorServidor}
            </div>
          ) : null}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-xs">
          Datos personales sensibles de salud. Ingresá sólo con tu usuario.
        </p>
      </div>
    </main>
  );
}
