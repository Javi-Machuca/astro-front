import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Vuelo, Pasajero } from '../models/Vuelo';

// Ruta del archivo de reservas locales (complementa ZCARRITO_JMG que no tiene campo usuario)
const DATA_DIR = join(process.cwd(), 'data');
const RESERVAS_FILE = join(DATA_DIR, 'reservas.json');

export interface Reserva {
  id: string;
  userId: string;
  userEmail: string;
  fecha: string;
  vuelo: Vuelo;
  pasajeros: Pasajero[];
  total: number;
  estado: 'confirmada' | 'cancelada';
}

// Crea el directorio de datos si no existe
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

// Lee todas las reservas del disco; devuelve array vacío si el archivo no existe
function loadReservas(): Reserva[] {
  ensureDataDir();
  if (!existsSync(RESERVAS_FILE)) return [];
  return JSON.parse(readFileSync(RESERVAS_FILE, 'utf-8'));
}

// Escribe el array completo de reservas en disco
function saveReservas(reservas: Reserva[]): void {
  ensureDataDir();
  writeFileSync(RESERVAS_FILE, JSON.stringify(reservas, null, 2));
}

// Devuelve todas las reservas (para el panel admin)
export function getAllReservas(): Reserva[] {
  return loadReservas();
}

// Devuelve las reservas confirmadas de un usuario concreto
export function getReservasByUser(userId: string): Reserva[] {
  return loadReservas().filter((r) => r.userId === userId);
}

// Cancela una reserva marcándola como 'cancelada'; devuelve false si no existe o no pertenece al usuario
export function cancelReserva(id: string, userId: string): boolean {
  const reservas = loadReservas();
  const idx = reservas.findIndex((r) => r.id === id && r.userId === userId);
  if (idx === -1) return false;
  reservas[idx].estado = 'cancelada';
  saveReservas(reservas);
  return true;
}

// Crea una nueva reserva, la persiste en disco y la devuelve
export function createReserva(
  userId: string,
  userEmail: string,
  vuelo: Vuelo,
  pasajeros: Pasajero[],
  total: number
): Reserva {
  const reservas = loadReservas();
  const reserva: Reserva = {
    id: crypto.randomUUID(),
    userId,
    userEmail,
    fecha: new Date().toISOString(),
    vuelo,
    pasajeros,
    total,
    estado: 'confirmada',
  };
  reservas.push(reserva);
  saveReservas(reservas);
  return reserva;
}
