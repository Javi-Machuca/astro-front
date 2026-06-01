import { defineMiddleware } from 'astro:middleware';
import { verifyJWT } from '../lib/auth';

// Rutas que no requieren autenticación
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

  // Leer y verificar el JWT de la cookie
  const token = cookies.get('auth_token')?.value;
  const payload = token ? verifyJWT(token) : null;

  // Si está logueado y va a login/registro, redirigir al inicio
  if (
    isPublic &&
    payload &&
    (pathname === '/login' || pathname === '/registro')
  ) {
    return redirect('/');
  }

  if (isPublic) return next();

  // Ruta protegida: requiere sesión válida
  if (!payload) {
    if (token) cookies.delete('auth_token', { path: '/' });
    return redirect('/login');
  }

  // Inyectar datos del usuario en locals para que las páginas SSR los lean
  context.locals.user = payload;

  // Solo admin puede acceder a /admin/*
  if (pathname.startsWith('/admin') && payload.role !== 'admin') {
    return redirect('/');
  }

  return next();
});
