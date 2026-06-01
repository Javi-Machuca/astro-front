import { defineMiddleware } from 'astro:middleware';
import { verifyJWT } from '../lib/auth';

// Rutas accesibles sin autenticacion; el resto requiere un JWT valido en la cookie
const PUBLIC_PATHS = [
  '/login',
  '/registro',
  '/api/auth/login',
  '/api/auth/register',
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;
  const pathname = url.pathname;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Lee la cookie de sesion y verifica el JWT; si es invalido se considera no autenticado
  const token = cookies.get('auth_token')?.value;
  const payload = token ? verifyJWT(token) : null;

  // Si el usuario ya tiene sesion activa e intenta acceder a login o registro, lo redirige al inicio
  if (
    isPublic &&
    payload &&
    (pathname === '/login' || pathname === '/registro')
  ) {
    return redirect('/');
  }

  if (isPublic) return next();

  // Sin sesion valida en ruta protegida: elimina la cookie si estaba corrupta y redirige al login
  if (!payload) {
    if (token) cookies.delete('auth_token', { path: '/' });
    return redirect('/login');
  }

  // Expone los datos del usuario en locals para que las paginas SSR los usen sin releer la cookie
  context.locals.user = payload;

  // Bloquea el acceso a /admin/* a usuarios sin rol admin redirigiendo al inicio
  if (pathname.startsWith('/admin') && payload.role !== 'admin') {
    return redirect('/');
  }

  return next();
});
