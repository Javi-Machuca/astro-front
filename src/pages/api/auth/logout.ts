import type { APIRoute } from 'astro';

// Elimina la cookie de sesión y redirige al login
export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('auth_token', { path: '/' });
  return new Response(null, {
    status: 302,
    headers: { Location: '/login' },
  });
};
