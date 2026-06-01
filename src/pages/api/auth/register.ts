import type { APIRoute } from 'astro';
import { createUser, signJWT } from '../../../lib/auth';

// Crea un usuario nuevo con rol 'user', lo autentica automáticamente y devuelve cookie de sesión
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Petición inválida.' }),
      { status: 400 }
    );
  }

  const { email, password, name } = body;
  if (!email || !password || !name) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Todos los campos son requeridos.' }),
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'La contraseña debe tener al menos 6 caracteres.',
      }),
      { status: 400 }
    );
  }

  const result = createUser(email, password, name, 'user');
  if (!result.ok) {
    return new Response(JSON.stringify({ ok: false, error: result.error }), {
      status: 409,
    });
  }

  const token = signJWT({
    sub: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
  });
  cookies.set('auth_token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    sameSite: 'strict',
  });

  return new Response(
    JSON.stringify({ ok: true, role: 'user', name: result.user.name }),
    { status: 201 }
  );
};
