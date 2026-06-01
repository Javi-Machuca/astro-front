import type { APIRoute } from 'astro';
import { findUserByEmail, verifyPassword, signJWT } from '../../../lib/auth';

// Valida credenciales, firma un JWT y lo almacena en una cookie httpOnly
export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Petición inválida.' }),
      { status: 400 }
    );
  }

  const { email, password } = body;
  if (!email || !password) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Correo y contraseña requeridos.' }),
      { status: 400 }
    );
  }

  // Mismo mensaje para email inexistente y contraseña incorrecta (evita enumeración de usuarios)
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Correo o contraseña incorrectos.' }),
      { status: 401 }
    );
  }

  const token = signJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  cookies.set('auth_token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    sameSite: 'strict',
  });

  return new Response(
    JSON.stringify({ ok: true, role: user.role, name: user.name }),
    { status: 200 }
  );
};
