import type { APIRoute } from 'astro';
import { createReserva, getReservasByUser } from '../../lib/reservas';
import type { ItemCarrito } from '../../models/Vuelo';

// Credenciales del proxy SAP; se leen en servidor para no exponer el token al cliente
const PROXY_URL = import.meta.env.PUBLIC_PROXY_URL || 'http://localhost:3001';
const API_TOKEN = import.meta.env.API_TOKEN || import.meta.env.PUBLIC_API_TOKEN || '';

// Devuelve las reservas del usuario autenticado ordenadas de más reciente a más antigua
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'No autenticado.' }), {
      status: 401,
    });
  }

  const reservas = getReservasByUser(user.sub);
  reservas.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  return new Response(JSON.stringify({ ok: true, data: reservas }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Confirma el carrito: llama al proxy SAP por cada pasajero y guarda la reserva en local
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'No autenticado.' }), {
      status: 401,
    });
  }

  let items: ItemCarrito[];
  try {
    items = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Petición inválida.' }),
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: 'Carrito vacío.' }), {
      status: 400,
    });
  }

  const creadas: string[] = [];

  try {
    for (const item of items) {
      for (const pasajero of item.pasajeros) {
        const res = await fetch(`${PROXY_URL}/api/reservas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({
            vueloId: item.vuelo.vueloId,
            nombre: pasajero.nombre,
            dni: pasajero.dni,
            edad: String(pasajero.edad),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return new Response(
            JSON.stringify({ ok: false, error: (err as any).error || `SAP HTTP ${res.status}` }),
            { status: 502 }
          );
        }
      }

      const reserva = createReserva(
        user.sub,
        user.email,
        item.vuelo,
        item.pasajeros,
        item.total
      );
      creadas.push(reserva.id);
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No se pudo conectar con el proxy SAP. Comprueba que está activo.' }),
      { status: 502 }
    );
  }

  return new Response(JSON.stringify({ ok: true, ids: creadas }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
