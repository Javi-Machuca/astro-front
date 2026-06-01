import type { APIRoute } from 'astro';

const PROXY_URL = import.meta.env.PUBLIC_PROXY_URL || 'http://localhost:3001';
const API_TOKEN = import.meta.env.API_TOKEN || import.meta.env.PUBLIC_API_TOKEN || '';

// Elimina una reserva de ZCARRITO_JMG; solo accesible para admins
export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ ok: false, error: 'Acceso denegado.' }), {
      status: 403,
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: 'ID requerido.' }), {
      status: 400,
    });
  }

  const res = await fetch(`${PROXY_URL}/api/admin/reservas/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return new Response(
      JSON.stringify({ ok: false, error: (data as any).error || `SAP HTTP ${res.status}` }),
      { status: 502 }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
