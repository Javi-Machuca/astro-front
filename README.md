# Hub Global – Gestora de Vuelos

Aplicación web de gestión y reserva de vuelos desarrollada con **Astro 5** (SSR) y un proxy **Express.js** que comunica con un backend **SAP BTP ABAP** mediante OData v2.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Configuración de SAP BTP y Eclipse](#2-configuración-de-sap-btp-y-eclipse)
3. [Activar el servicio OData en SAP](#3-activar-el-servicio-odata-en-sap)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Instalación del proyecto web](#5-instalación-del-proyecto-web)
6. [Arranque en desarrollo](#6-arranque-en-desarrollo)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Arquitectura MVC](#8-arquitectura-mvc)

---

## 1. Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 22.12.0 |
| pnpm | 9.x |
| Eclipse IDE | 2024-12 |
| Cuenta SAP BTP Trial | — |

### Por qué pnpm y no npm

Este proyecto usa **pnpm** en lugar de npm por motivos de seguridad. npm tiene vulnerabilidades conocidas relacionadas con la resolución de dependencias.

### Instalar pnpm (si no lo tienes)

Descarga e instala pnpm desde su página oficial:

```
https://pnpm.io/installation
```

O mediante PowerShell (Windows):

```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

---

## 2. Configuración de SAP BTP y Eclipse

### 2.1 Cuenta SAP BTP Trial

1. Regístrate en [SAP BTP Trial](https://account.hanatrial.ondemand.com) si no tienes cuenta.
2. En el **SAP BTP Cockpit**, accede a tu subcuenta trial.
3. En **Instances and Subscriptions**, comprueba que tienes una instancia del servicio **ABAP Trial** activa.
4. Anota la **API Endpoint** de tu instancia ABAP (formato `https://<tenant>.abap.us10.hana.ondemand.com`).

### 2.2 Instalar Eclipse 2024-12 con ABAP Development Tools (ADT)

1. Descarga **Eclipse IDE 2024-12** desde [eclipse.org/downloads](https://www.eclipse.org/downloads/).
2. Abre Eclipse y ve a **Help → Install New Software**.
3. En el campo **Work with**, introduce la siguiente URL y pulsa Enter:
   ```
   https://tools.hana.ondemand.com/latest
   ```
4. Selecciona **ABAP Development Tools** y completa la instalación. Reinicia Eclipse cuando lo pida.

### 2.3 Conectar Eclipse al sistema SAP BTP ABAP

1. Ve a **File → New → Other → ABAP Cloud Project**.
2. Selecciona **SAP BTP, ABAP Environment** y pulsa **Next**.
3. Introduce la **Service Instance URL** de tu instancia ABAP (`https://<tenant>.abap.us10.hana.ondemand.com`).
4. Autentícate con tu usuario y contraseña de SAP BTP.
5. Dale un nombre al proyecto (p. ej. `SAP_BTP_TRIAL`) y finaliza.

---

## 3. Activar el servicio OData en SAP

El servicio OData ya está implementado en el sistema ABAP. Solo hay que localizarlo y activarlo.

### 3.1 Abrir el paquete del proyecto

1. En Eclipse, abre la vista **Project Explorer**.
2. Despliega tu proyecto ABAP y navega hasta el paquete **`ZTFG_JMG`** — aquí se encuentran todos los objetos del proyecto (tablas, CDS views, servicio OData).

### 3.2 Activar el servicio

1. Dentro del paquete `ZTFG_JMG`, localiza el servicio `ZUI_VUELOS_JMG_02`.
2. Haz clic derecho sobre el servicio → **Activate**.
3. Verifica que el servicio está activo accediendo desde el navegador a:
   ```
   https://<tenant>.abap.us10.hana.ondemand.com/sap/opu/odata/sap/ZUI_VUELOS_JMG_02/?sap-client=100&$format=json
   ```
   Debe devolver los metadatos del servicio.

### 3.3 Obtener credenciales OAuth 2.0

El proxy usa **OAuth 2.0 con password grant** para autenticarse con SAP.

1. En el **SAP BTP Cockpit**, ve a **Security → OAuth**.
2. Localiza el cliente OAuth asociado al sistema ABAP o crea uno nuevo con tipo **Password** habilitado.
3. Anota:
   - **Client ID** (formato `sb-xxxx!byyy|abap-trial-service-broker!bzzz`)
   - **Client Secret**
   - **Token URL** (formato `https://<oauth-tenant>.authentication.us10.hana.ondemand.com`)

---

## 4. Variables de entorno

Crea un archivo **`.env`** en la raíz del proyecto copiando la siguiente plantilla:

```env
# ── SAP BTP ──────────────────────────────────────────────────────────────────
SAP_BASE_URL=https://<tenant>.abap.us10.hana.ondemand.com
SAP_SERVICE=ZUI_VUELOS_JMG_02
SAP_ENTITY_VUELOS=Z_C_VUELOS_JMG
SAP_CLIENT=100

# OAuth 2.0 (password grant)
SAP_OAUTH_URL=https://<oauth-tenant>.authentication.us10.hana.ondemand.com
SAP_CLIENT_ID=<client-id>
SAP_CLIENT_SECRET=<client-secret>
SAP_USER=<tu-email-sap>
SAP_PASS=<tu-contraseña-sap>

# ── Proxy ─────────────────────────────────────────────────────────────────────
PROXY_PORT=3001
FRONTEND_URL=http://localhost:4321

# Token compartido entre el frontend y el proxy para rutas protegidas
API_TOKEN=cambia-esto-por-un-valor-secreto

# ── Astro / Frontend ──────────────────────────────────────────────────────────
PUBLIC_PROXY_URL=http://localhost:3001
PUBLIC_API_TOKEN=cambia-esto-por-un-valor-secreto

# ── Auth JWT ──────────────────────────────────────────────────────────────────
JWT_SECRET=cambia-esto-por-un-valor-secreto
```

> **Importante:** `API_TOKEN` y `PUBLIC_API_TOKEN` deben tener el mismo valor.

---

## 5. Instalación del proyecto web

```bash
# Clona el repositorio
git clone <url-del-repositorio>
cd astro-front

# Instala todas las dependencias (frontend + proxy)
pnpm install
```

---

## 6. Arranque en desarrollo

El proyecto necesita **dos procesos** ejecutándose a la vez: el proxy Express y el servidor Astro.

### Terminal 1 — Proxy SAP

```bash
cd proxy
pnpm dev
```

Arranca en `http://localhost:3001`. Verifica que funciona abriendo `http://localhost:3001/health` en el navegador (debe devolver `{"status":"ok"}`).

### Terminal 2 — Frontend Astro

```bash
pnpm dev
```

Arranca en `http://localhost:4321`.

### Credenciales por defecto

Al arrancar por primera vez, se crea automáticamente un usuario administrador:

| Campo | Valor |
|---|---|
| Email | `admin@tfg.com` |
| Contraseña | `admin123` |

---

## 7. Estructura del proyecto

```
astro-front/
├── proxy/                      # Proxy Express.js → SAP BTP OData v2
│   └── sap-proxy.js
├── src/
│   ├── components/             # Componentes Astro reutilizables (Vista)
│   │   ├── TablaVuelos.astro
│   │   ├── FormularioReserva.astro
│   │   └── PopupConfirmacion.astro
│   ├── controllers/            # Controladores MVC (Controlador)
│   │   └── VuelosController.ts
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/                    # Lógica de negocio del servidor (Modelo)
│   │   ├── auth.ts             # JWT + bcrypt + gestión de usuarios
│   │   ├── reservas.ts         # Gestión de reservas locales
│   │   └── aeropuertos.ts      # Tabla de códigos IATA
│   ├── middleware/             # Protección de rutas por rol
│   │   └── index.ts
│   ├── models/                 # Interfaces y utilidades de dominio (Modelo)
│   │   └── Vuelo.ts
│   ├── pages/
│   │   ├── api/                # Endpoints REST (Controlador servidor)
│   │   │   ├── auth/           # Login, logout, registro
│   │   │   ├── reservas/       # Crear y cancelar reservas
│   │   │   └── admin/          # Gestión de usuarios (solo admin)
│   │   ├── admin/              # Panel de administración (Vista)
│   │   │   ├── index.astro     # Gestión de vuelos SAP
│   │   │   └── usuarios.astro  # Gestión de usuarios
│   │   ├── vuelos/
│   │   │   └── detalle.astro   # Detalle y reserva de un vuelo
│   │   ├── index.astro         # Listado principal de vuelos
│   │   ├── carrito.astro       # Carrito de reservas
│   │   ├── mis-reservas.astro  # Historial de reservas del usuario
│   │   ├── login.astro
│   │   └── registro.astro
│   └── services/               # Llamadas al proxy SAP (Modelo)
│       └── VuelosService.ts
├── data/
│   ├── users.json              # Usuarios (generado automáticamente)
│   └── reservas.json           # Reservas confirmadas
├── .env                        # Variables de entorno (no incluido en git)
└── astro.config.mjs
```

---

## 8. Arquitectura MVC

El proyecto sigue el patrón **Modelo-Vista-Controlador**:

### Modelo
Contiene los datos y la lógica de negocio, sin conocer la vista ni el controlador.

| Archivo | Responsabilidad |
|---|---|
| `src/models/Vuelo.ts` | Interfaces de dominio, descuentos por edad, formateo de fechas y precios |
| `src/lib/auth.ts` | Gestión de usuarios, JWT, bcrypt |
| `src/lib/reservas.ts` | Persistencia de reservas |
| `src/lib/aeropuertos.ts` | Tabla de códigos IATA |
| `src/services/VuelosService.ts` | Comunicación con el proxy SAP |

### Vista
Renderiza la interfaz sin contener lógica de negocio.

| Archivo | Responsabilidad |
|---|---|
| `src/components/TablaVuelos.astro` | Tabla de vuelos con filtros y paginación |
| `src/components/FormularioReserva.astro` | Formulario de reserva por pasos |
| `src/components/PopupConfirmacion.astro` | Popup de confirmación de reserva |
| `src/layouts/Layout.astro` | Plantilla base con navegación |
| `src/pages/index.astro` | Página principal de vuelos |
| `src/pages/carrito.astro` | Carrito de reservas |
| `src/pages/mis-reservas.astro` | Historial del usuario |
| `src/pages/login.astro` | Formulario de inicio de sesión |
| `src/pages/registro.astro` | Formulario de registro |
| `src/pages/vuelos/detalle.astro` | Detalle y reserva de un vuelo |
| `src/pages/admin/index.astro` | Gestión de vuelos SAP |
| `src/pages/admin/usuarios.astro` | Gestión de usuarios |

### Controlador
Gestiona el estado, coordina modelo y vista y responde a las acciones del usuario.

| Archivo | Responsabilidad |
|---|---|
| `src/controllers/VuelosController.ts` | Estado de la tabla, filtrado, paginación, patrón Observer |
| `src/pages/api/auth/*.ts` | Login, logout, registro |
| `src/pages/api/reservas/*.ts` | Crear y cancelar reservas |
| `src/pages/api/admin/*.ts` | Operaciones de administración |
| `src/middleware/index.ts` | Control de acceso por rol en cada ruta |

### Flujo de datos

```
Navegador
  └─► Astro SSR (4321)
        ├─► /api/auth/*         → gestión de sesión JWT (cookie httpOnly)
        ├─► /api/reservas/*     → crear y cancelar reservas
        └─► /admin, /vuelos/*   → páginas protegidas por middleware

Navegador (cliente)
  └─► Proxy Express (3001)
        └─► SAP BTP ABAP OData v2
              ├─ GET   /api/vuelos           → listado con filtros
              ├─ GET   /api/vuelos/:codigo   → detalle de vuelo
              ├─ POST  /api/vuelos           → crear vuelo (admin)
              └─ PATCH /api/vuelos/:id       → editar vuelo (admin)
```
