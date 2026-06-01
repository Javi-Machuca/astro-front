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

  // Busca el usuario y comprueba la contraseña; usa el mismo mensaje de error para ambos casos para evitar enumeracion de cuentas
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Correo o contraseña incorrectos.' }),
      { status: 401 }
    );
  }

  // Firma el JWT con los datos del usuario y lo almacena en una cookie httpOnly de 7 dias
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
