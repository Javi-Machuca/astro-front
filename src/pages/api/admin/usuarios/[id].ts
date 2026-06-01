import type { APIRoute } from 'astro';
import { verifyJWT } from '../../../../lib/auth';
import { updateUserRole, deleteUser } from '../../../../lib/auth';

// Verifica que la cookie pertenezca a un admin; devuelve null si no lo es
function requireAdmin(cookies: Parameters<APIRoute>[0]['cookies']) {
  const token = cookies.get('auth_token')?.value;
  const payload = token ? verifyJWT(token) : null;
  return payload?.role === 'admin' ? payload : null;
}

// Cambia el rol de un usuario dado su ID
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  if (!requireAdmin(cookies)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No autorizado.' }),
      { status: 403 }
    );
  }

  const { id } = params;
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Petición inválida.' }),
      { status: 400 }
    );
  }

  if (body.role !== 'admin' && body.role !== 'user') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Rol no válido.' }),
      { status: 400 }
    );
  }

  const result = updateUserRole(id!, body.role);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 404,
  });
};

// Elimina un usuario; impide que el admin se borre a sí mismo
export const DELETE: APIRoute = async ({ params, cookies, locals }) => {
  const admin = requireAdmin(cookies);
  if (!admin) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No autorizado.' }),
      { status: 403 }
    );
  }
  if (params.id === admin.sub) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'No puedes eliminar tu propia cuenta.',
      }),
      { status: 400 }
    );
  }

  const result = deleteUser(params.id!);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 404,
  });
};
