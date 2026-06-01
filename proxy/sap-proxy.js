import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

const SAP_BASE_URL = process.env.SAP_BASE_URL;
const SAP_SERVICE = process.env.SAP_SERVICE || 'ZUI_VUELOS_JMG_02';
const SAP_ENTITY = process.env.SAP_ENTITY_VUELOS || 'Z_C_VUELOS_JMG';
const SAP_SERVICE_CARRITO = process.env.SAP_SERVICE_CARRITO || 'ZUI_CARRITO_JMG';
const SAP_CLIENT = process.env.SAP_CLIENT || '100';
const SAP_OAUTH_URL = process.env.SAP_OAUTH_URL;
const SAP_CLIENT_ID = process.env.SAP_CLIENT_ID;
const SAP_CLIENT_SECRET = process.env.SAP_CLIENT_SECRET;
const SAP_USER = process.env.SAP_USER;
const SAP_PASS = process.env.SAP_PASS;

const SAP_SRV = `${SAP_BASE_URL}/sap/opu/odata/sap/${SAP_SERVICE}`;

// Token OAuth cacheado en memoria; se renueva automaticamente 60 segundos antes de su expiracion
let cachedToken = null;
let tokenExpiry = 0;

// Obtiene un token OAuth válido usando el flujo Resource Owner Password Credentials
async function getOAuthToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const credentials = Buffer.from(
    `${SAP_CLIENT_ID}:${SAP_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch(`${SAP_OAUTH_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: SAP_USER,
      password: SAP_PASS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OAuth error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  console.log('[proxy] OAuth token obtenido, expira en', data.expires_in, 's');
  return cachedToken;
}

// Construye las cabeceras comunes (Authorization Bearer y Accept JSON) para cualquier peticion a SAP
async function sapHeaders(extra = {}) {
  const token = await getOAuthToken();
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...extra,
  };
}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4321' }));
app.use(express.json());

const API_TOKEN = process.env.API_TOKEN;

// Middleware de autorizacion: comprueba el Bearer token del header contra el valor del .env
function requireToken(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!API_TOKEN || token === API_TOKEN) return next();
  res.status(401).json({ success: false, error: 'Token inválido o ausente.' });
}

// Endpoint de salud para verificar que el servidor proxy esta activo
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Devuelve la lista de vuelos de SAP con filtros opcionales por fecha, origen y destino
app.get('/api/vuelos', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, origen, destino } = req.query;

    const filters = [];
    if (fechaDesde)
      filters.push(`fecha_salida ge datetime'${fechaDesde}T00:00:00'`);
    if (fechaHasta)
      filters.push(`fecha_salida le datetime'${fechaHasta}T23:59:59'`);
    if (origen) filters.push(`aeropuerto_origen eq '${origen}'`);
    if (destino) filters.push(`aeropuerto_dest eq '${destino}'`);

    const qs = filters.length
      ? `&$filter=${encodeURIComponent(filters.join(' and '))}`
      : '';
    const url = `${SAP_SRV}/${SAP_ENTITY}?$format=json${qs}&sap-client=${SAP_CLIENT}`;

    const sapRes = await fetch(url, { headers: await sapHeaders() });

    if (!sapRes.ok) {
      const body = await sapRes.text();
      console.error(`[proxy] SAP respondió ${sapRes.status}:`, body);
      throw new Error(`SAP ${sapRes.status}: ${body.slice(0, 300)}`);
    }

    const json = await sapRes.json();
    const vuelos = (json?.d?.results || []).map(transformarVuelo);

    res.json({ success: true, data: vuelos, total: vuelos.length });
  } catch (err) {
    console.error('[proxy] GET /api/vuelos →', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// Endpoint de estadisticas pendiente de implementacion en SAP; devuelve valores vacios por ahora
app.get('/api/estadisticas', (_req, res) => {
  res.json({ success: true, data: { asientosHoy: 0, buffersEnVivo: 0 } });
});

// Devuelve un único vuelo por código; usado en la página de detalle
app.get('/api/vuelos/:codigo', async (req, res) => {
  try {
    const filtro = encodeURIComponent(`codigo_vuelo eq '${req.params.codigo}'`);
    const url = `${SAP_SRV}/${SAP_ENTITY}?$format=json&$filter=${filtro}&$top=1&sap-client=${SAP_CLIENT}`;

    const sapRes = await fetch(url, { headers: await sapHeaders() });

    if (!sapRes.ok) throw new Error(`SAP ${sapRes.status}`);

    const json = await sapRes.json();
    const vuelo = (json?.d?.results || [])[0];
    if (!vuelo)
      return res
        .status(404)
        .json({ success: false, error: 'Vuelo no encontrado' });

    res.json({ success: true, data: transformarVuelo(vuelo) });
  } catch (err) {
    console.error('[proxy] GET /api/vuelos/:codigo →', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// Actualiza precio, capacidad o estado de un vuelo en SAP; obtiene el CSRF token previamente con un HEAD
app.patch('/api/vuelos/:vueloId', requireToken, async (req, res) => {
  try {
    const { vueloId } = req.params;
    const { precio, capacidad, estado } = req.body;

    const csrfRes = await fetch(`${SAP_SRV}/?sap-client=${SAP_CLIENT}`, {
      method: 'HEAD',
      headers: { ...(await sapHeaders()), 'X-CSRF-Token': 'Fetch' },
    });
    const csrfToken = csrfRes.headers.get('x-csrf-token');
    const rawCookies = csrfRes.headers.getSetCookie?.() ?? [];
    const cookies = rawCookies.map((c) => c.split(';')[0]).join('; ');

    const updateData = {};
    if (precio !== undefined) updateData.precio = String(precio);
    if (capacidad !== undefined) updateData.capacidad = String(capacidad);
    if (estado !== undefined) updateData.estado = estado;

    const url = `${SAP_SRV}/${SAP_ENTITY}('${vueloId}')?sap-client=${SAP_CLIENT}`;
    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: await sapHeaders({
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...(cookies ? { Cookie: cookies } : {}),
      }),
      body: JSON.stringify(updateData),
    });

    if (!patchRes.ok)
      throw new Error(`SAP ${patchRes.status}: ${await patchRes.text()}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[proxy] PATCH /api/vuelos/:id →', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// Crea un nuevo vuelo en SAP mapeando los campos del formulario al formato OData del servicio
app.post('/api/vuelos', requireToken, async (req, res) => {
  try {
    const { codigoVuelo, origen, destino, fechaSalida, fechaLlegada, horaLlegada, precio, capacidad, estado } = req.body;

    const csrfRes = await fetch(`${SAP_SRV}/?sap-client=${SAP_CLIENT}`, {
      method: 'HEAD',
      headers: { ...(await sapHeaders()), 'X-CSRF-Token': 'Fetch' },
    });
    const csrfToken = csrfRes.headers.get('x-csrf-token');
    const rawCookies = csrfRes.headers.getSetCookie?.() ?? [];
    const cookies = rawCookies.map((c) => c.split(';')[0]).join('; ');

    const body = {
      codigo_vuelo: codigoVuelo,
      aeropuerto_origen: origen,
      aeropuerto_dest: destino,
      fecha_salida: toSapDate(fechaSalida),
      fecha_llegada: toSapDate(fechaLlegada),
      hora_llegada: horaLlegada || '',
      precio: String(precio),
      capacidad: String(capacidad),
      estado: estado || 'DISPONIBLE',
    };

    const url = `${SAP_SRV}/${SAP_ENTITY}?sap-client=${SAP_CLIENT}`;
    const createRes = await fetch(url, {
      method: 'POST',
      headers: await sapHeaders({
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...(cookies ? { Cookie: cookies } : {}),
      }),
      body: JSON.stringify(body),
    });

    if (!createRes.ok) throw new Error(`SAP ${createRes.status}: ${await createRes.text()}`);

    const result = await createRes.json();
    res.status(201).json({ success: true, data: transformarVuelo(result?.d) });
  } catch (err) {
    console.error('[proxy] POST /api/vuelos →', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// Devuelve todas las reservas de ZCARRITO_JMG para el panel de administración
app.get('/api/admin/reservas', requireToken, async (req, res) => {
  try {
    const srvCarrito = `${SAP_BASE_URL}/sap/opu/odata/sap/${SAP_SERVICE_CARRITO}`;
    const url = `${srvCarrito}/ZI_CARRITO_JMG?$format=json&sap-client=${SAP_CLIENT}`;

    const sapRes = await fetch(url, { headers: await sapHeaders() });

    if (!sapRes.ok) {
      const body = await sapRes.text();
      console.error(`[proxy] SAP respondió ${sapRes.status}:`, body);
      throw new Error(`SAP ${sapRes.status}: ${body.slice(0, 300)}`);
    }

    const json = await sapRes.json();
    const reservas = (json?.d?.results || []).map((r) => ({
      idCarrito: r.id_carrito || '',
      nombre: r.nombre || '',
      dni: r.dni || '',
      cantidad: parseInt(r.cantidad || 0, 10),
      precioTotal: parseFloat(r.precio_total || 0),
      vueloId: r.vuelo_id || '',
    }));

    res.json({ success: true, data: reservas, total: reservas.length });
  } catch (err) {
    console.error('[proxy] GET /api/admin/reservas →', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// Elimina una reserva de ZCARRITO_JMG por su id_carrito
app.delete('/api/admin/reservas/:idCarrito', requireToken, async (req, res) => {
  try {
    const { idCarrito } = req.params;
    const srvCarrito = `${SAP_BASE_URL}/sap/opu/odata/sap/${SAP_SERVICE_CARRITO}`;

    const csrfRes = await fetch(`${srvCarrito}/?sap-client=${SAP_CLIENT}`, {
      method: 'HEAD',
      headers: { ...(await sapHeaders()), 'X-CSRF-Token': 'Fetch' },
    });
    const csrfToken = csrfRes.headers.get('x-csrf-token');
    const rawCookies = csrfRes.headers.getSetCookie?.() ?? [];
    const cookies = rawCookies.map((c) => c.split(';')[0]).join('; ');

    const url = `${srvCarrito}/ZI_CARRITO_JMG('${idCarrito}')?sap-client=${SAP_CLIENT}`;
    const delRes = await fetch(url, {
      method: 'DELETE',
      headers: await sapHeaders({
        'X-CSRF-Token': csrfToken,
        ...(cookies ? { Cookie: cookies } : {}),
      }),
    });

    if (!delRes.ok) throw new Error(`SAP ${delRes.status}: ${await delRes.text()}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[proxy] DELETE /api/admin/reservas/:id →', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// Llama al function import OData `reservar` de SAP para crear una entrada en ZCARRITO_JMG
app.post('/api/reservas', requireToken, async (req, res) => {
  try {
    const { vueloId, nombre, dni, edad, cantidad = 1 } = req.body;
    if (!vueloId)
      return res
        .status(400)
        .json({ success: false, error: 'vueloId es requerido' });

    // Obtiene el CSRF token con un HEAD a la raiz del servicio antes de enviar el POST
    const csrfRes = await fetch(`${SAP_SRV}/?sap-client=${SAP_CLIENT}`, {
      method: 'HEAD',
      headers: { ...(await sapHeaders()), 'X-CSRF-Token': 'Fetch' },
    });
    const csrfToken = csrfRes.headers.get('x-csrf-token');
    const rawCookies = csrfRes.headers.getSetCookie?.() ?? [];
    const cookies = rawCookies.map((c) => c.split(';')[0]).join('; ');

    // En OData v2 los parametros de tipo string se pasan entre comillas simples en la URL
    const url = `${SAP_SRV}/reservar?sap-client=${SAP_CLIENT}&vuelo_id='${vueloId}'&cantidad=${cantidad}&nombre='${encodeURIComponent(nombre)}'&dni='${dni}'&edad='${edad}'`;
    const createRes = await fetch(url, {
      method: 'POST',
      headers: await sapHeaders({
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...(cookies ? { Cookie: cookies } : {}),
      }),
    });

    if (!createRes.ok)
      throw new Error(`SAP ${createRes.status}: ${await createRes.text()}`);

    const result = await createRes.json();
    res.status(201).json({ success: true, data: result?.d });
  } catch (err) {
    console.error('[proxy] POST /api/reservas →', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

// Transforma un registro OData de SAP al modelo de dominio del frontend, convirtiendo tipos y campos
function transformarVuelo(sap) {
  if (!sap) return null;
  return {
    vueloId: sap.vuelo_id || '',
    codigoVuelo: sap.codigo_vuelo || '',
    origen: sap.aeropuerto_origen || '',
    destino: sap.aeropuerto_dest || '',
    fechaSalida: parseSapDate(sap.fecha_salida),
    fechaLlegada: parseSapDate(sap.fecha_llegada),
    horaLlegada: sap.hora_llegada || '',
    precio: parseFloat(sap.precio || 0),
    moneda: 'EUR',
    plazasDisponibles: parseInt(sap.capacidad || 0, 10),
    estado: sap.estado || 'Programado',
  };
}

// Convierte una fecha ISO 8601 al formato /Date(ms)/ requerido por OData v2
function toSapDate(iso) {
  if (!iso) return null;
  return `/Date(${new Date(iso).getTime()})/`;
}

// Convierte el formato /Date(ms)/ de OData v2 a ISO 8601
function parseSapDate(val) {
  if (!val) return null;
  const m = String(val).match(/\/Date\((\d+)\)\//);
  return m ? new Date(Number(m[1])).toISOString() : val;
}

// Inicia el servidor Express y muestra la configuracion de conexion a SAP en consola
app.listen(PORT, () => {
  console.log(`\n🛫  SAP Proxy → http://localhost:${PORT}`);
  console.log(`   SAP: ${SAP_BASE_URL}`);
  console.log(
    `   Servicio: ${SAP_SERVICE} | Entity: ${SAP_ENTITY} | Cliente: ${SAP_CLIENT}`
  );
  console.log(`   OAuth: ${SAP_OAUTH_URL}\n`);
});
