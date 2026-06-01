import type { APIRoute } from 'astro';
import { cancelReserva } from '../../../lib/reservas';

// Cancela una reserva del usuario autenticado
export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'No autenticado.' }), {
      status: 401,
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: 'ID requerido.' }), {
      status: 400,
    });
  }

  const ok = cancelReserva(id, user.sub);
  if (!ok) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Reserva no encontrada o no pertenece a tu cuenta.' }),
      { status: 404 }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
