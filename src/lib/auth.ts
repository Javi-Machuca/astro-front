import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Rutas del archivo JSON de usuarios y clave secreta para firmar los JWT
const DATA_DIR = join(process.cwd(), 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'tfg-jwt-secret-2026';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
}

// Crea el directorio de datos si no existe
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

// Lee los usuarios del disco; si el archivo no existe crea el admin por defecto
function loadUsers(): User[] {
  ensureDataDir();
  if (!existsSync(USERS_FILE)) {
    const admin: User = {
      id: crypto.randomUUID(),
      email: 'admin@tfg.com',
      password: bcrypt.hashSync('admin123', 10),
      name: 'Administrador',
      role: 'admin',
    };
    writeFileSync(USERS_FILE, JSON.stringify([admin], null, 2));
    return [admin];
  }
  return JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
}

// Escribe el array de usuarios en disco
function saveUsers(users: User[]): void {
  ensureDataDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Devuelve todos los usuarios sin exponer el hash de contraseña
export function getAllUsers(): Omit<User, 'password'>[] {
  return loadUsers().map(({ password: _p, ...u }) => u);
}

// Cambia el rol de un usuario dado su ID
export function updateUserRole(
  id: string,
  role: 'admin' | 'user'
): { ok: true } | { ok: false; error: string } {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };
  users[idx].role = role;
  saveUsers(users);
  return { ok: true };
}

// Elimina un usuario del sistema dado su ID
export function deleteUser(
  id: string
): { ok: true } | { ok: false; error: string } {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };
  users.splice(idx, 1);
  saveUsers(users);
  return { ok: true };
}

// Busca un usuario por email ignorando mayusculas y minusculas
export function findUserByEmail(email: string): User | undefined {
  return loadUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// Crea un usuario nuevo con contraseña hasheada y lo persiste en disco
export function createUser(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'user' = 'user'
): { ok: true; user: User } | { ok: false; error: string } {
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'Este correo ya está registrado.' };
  }
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    password: bcrypt.hashSync(password, 10),
    name: name.trim(),
    role,
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

// Compara una contraseña en texto plano con su hash bcrypt
export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

// Firma un JWT con expiración de 7 dias
export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verifica y decodifica un JWT; devuelve null si es invalido o ha expirado
export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
