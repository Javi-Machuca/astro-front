// Modelos de dominio y utilidades de formato/negocio para vuelos y pasajeros

export interface Vuelo {
  vueloId: string;
  codigoVuelo: string;
  origen: string;
  destino: string;
  fechaSalida: string;
  fechaLlegada: string;
  horaLlegada: string;
  precio: number;
  moneda: string;
  plazasDisponibles: number;
  estado: 'DISPONIBLE' | 'COMPLETO' | 'CANCELADO';
}

export interface Pasajero {
  nombre: string;
  dni: string;
  edad: number;
}

export interface ItemCarrito {
  vuelo: Vuelo;
  pasajeros: Pasajero[];
  total: number;
}

export interface FiltrosVuelos {
  fechaDesde?: string;
  fechaHasta?: string;
  origen?: string;
  destino?: string;
}

// Devuelve true si la edad aplica el descuento del 30% (menores de 7 o mayores de 65)
export function tieneDescuentoEdad(edad: number): boolean {
  return !isNaN(edad) && (edad < 7 || edad > 65);
}

// Convierte una fecha ISO a formato legible en español ("15 Mayo, 2026")
export function formatearFecha(isoDate: string | null): string {
  if (!isoDate) return '—';
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const d = new Date(isoDate);
  return `${d.getDate()} ${meses[d.getMonth()]}, ${d.getFullYear()}`;
}

// Formatea un precio a dos decimales para mostrar en la UI
export function formatearPrecio(precio: number): string {
  return precio.toFixed(2);
}
