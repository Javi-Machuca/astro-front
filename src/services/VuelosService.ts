import type { Vuelo, FiltrosVuelos } from '../models/Vuelo';

// URL del proxy Express que actua de intermediario entre el frontend y SAP
const PROXY_URL = import.meta.env.PUBLIC_PROXY_URL || 'http://localhost:3001';

// Llama al proxy y devuelve `data` del JSON de respuesta; lanza error si falla
async function fetchProxy<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Error del proxy');
  return json.data;
}

// Obtiene los vuelos del proxy aplicando los filtros opcionales como query params
export async function obtenerVuelos(filtros?: FiltrosVuelos): Promise<Vuelo[]> {
  const params = new URLSearchParams();
  if (filtros?.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
  if (filtros?.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
  if (filtros?.origen) params.set('origen', filtros.origen);
  if (filtros?.destino) params.set('destino', filtros.destino);
  const qs = params.toString() ? `?${params}` : '';
  return fetchProxy<Vuelo[]>(`/api/vuelos${qs}`);
}

// Datos de vuelos de ejemplo para desarrollo local sin necesidad de conexion a SAP
export function obtenerVuelosMock(): Vuelo[] {
  return [
    {
      codigoVuelo: 'IB1001',
      origen: 'MAD',
      destino: 'BCN',
      fechaSalida: '2026-05-20T00:00:00Z',
      fechaLlegada: '2026-05-20T00:00:00Z',
      horaLlegada: '9:30:00 AM',
      precio: 95.5,
      moneda: 'EUR',
      plazasDisponibles: 180,
      estado: 'DISPONIBLE',
    },
    {
      codigoVuelo: 'IB1002',
      origen: 'BCN',
      destino: 'MAD',
      fechaSalida: '2026-05-20T00:00:00Z',
      fechaLlegada: '2026-05-20T00:00:00Z',
      horaLlegada: '12:30:00 PM',
      precio: 90.0,
      moneda: 'EUR',
      plazasDisponibles: 180,
      estado: 'DISPONIBLE',
    },
    {
      codigoVuelo: 'VY2001',
      origen: 'AGP',
      destino: 'PMI',
      fechaSalida: '2026-05-21T00:00:00Z',
      fechaLlegada: '2026-05-21T00:00:00Z',
      horaLlegada: '8:45:00 AM',
      precio: 75.5,
      moneda: 'EUR',
      plazasDisponibles: 150,
      estado: 'DISPONIBLE',
    },
    {
      codigoVuelo: 'VY2002',
      origen: 'PMI',
      destino: 'AGP',
      fechaSalida: '2026-05-21T00:00:00Z',
      fechaLlegada: '2026-05-21T00:00:00Z',
      horaLlegada: '11:45:00 AM',
      precio: 80.0,
      moneda: 'EUR',
      plazasDisponibles: 150,
      estado: 'DISPONIBLE',
    },
    {
      codigoVuelo: 'UX3001',
      origen: 'MAD',
      destino: 'LPA',
      fechaSalida: '2026-05-22T00:00:00Z',
      fechaLlegada: '2026-05-22T00:00:00Z',
      horaLlegada: '11:30:00 AM',
      precio: 120.0,
      moneda: 'EUR',
      plazasDisponibles: 200,
      estado: 'DISPONIBLE',
    },
  ];
}
