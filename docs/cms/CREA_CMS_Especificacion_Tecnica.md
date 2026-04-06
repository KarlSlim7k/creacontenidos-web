# CREA CMS — Especificación Técnica del Sistema de Edición Inline
## Editor de Contenido Público para crea-contenidos.com

**Versión:** 1.1 (actualizado para viabilidad con stack actual)  
**Autor:** Emmanuel Reyes Zapata — Director Editorial CREA  
**Entorno:** VPS KVM2 Hostinger + DokPloy + GitHub + Nginx  
**Dominio:** crea-contenidos.com  
**Stack base actual:** HTML/CSS/JS vanilla (sitio estático con parser PHP legacy) — NO Next.js  
**Stack propuesto viable:** HTML/CSS/JS con CKEditor 5 o TinyMCE (edición inline) + PHP API + Nginx  
**Estado del documento:** Actualizado para viabilidad con el sistema actual (no Next.js)  

---

## INSTRUCCIONES PARA AGENTES E INTEGRADORES IA

Este documento especifica el sistema de edición inline del sitio público de CREA.
El objetivo es combinar lo mejor de dos paradigmas de CMS:

- **De Google Sites:** edición visual directamente sobre la página pública,
  sin panel de administración separado. Lo que ves es lo que editas.
- **De WordPress:** gestión de contenido estructurado con estados (borrador,
  publicado, archivado), historial de cambios, SEO metadata, y control
  de múltiples tipos de contenido.

El resultado es un editor que se activa **sobre la página real** cuando el usuario
está autenticado como editor, sin redirigir a un panel separado.

---

## SECCIÓN 1 — VISIÓN FUNCIONAL DEL SISTEMA

### 1.1 Flujo de experiencia del editor

```
[Visitante público]
  → Navega crea-contenidos.com normalmente
  → Ve botón "Iniciar sesión" en esquina superior derecha
  → Ingresa credenciales
  → La MISMA página se recarga en MODO EDITOR

[Modo Editor activo]
  → Aparece barra de herramientas flotante en la parte superior
  → Los bloques de contenido muestran borde de selección al hacer hover
  → Click en cualquier bloque de texto → editor de texto rico inline (CKEditor 5)
  → Click en imagen → reemplazar imagen
  → Botón "Publicar" / "Guardar borrador" en la barra flotante
  → Botón "Vista previa pública" para ver sin la barra de edición
  → Botón "Cerrar sesión"
```

### 1.2 Comparativa de referencia: lo que se toma de cada CMS

| Característica | Google Sites | WordPress | CREA CMS |
|---|---|---|---|
| Edición inline sobre la página real | ✅ Sí | ❌ Panel separado | ✅ Sí |
| Bloques visuales arrastrables | ✅ Sí | ✅ Gutenberg | ✅ Sí (fase 2) |
| Gestión de múltiples artículos | ❌ Limitado | ✅ Completo | ✅ Sí |
| Estados: borrador / publicado | ❌ No | ✅ Sí | ✅ Sí |
| SEO metadata editable | ❌ No | ✅ Plugin | ✅ Sí (panel lateral) |
| Usuarios y roles | ❌ Básico | ✅ Completo | ✅ Fase 2 (hardcoded Fase 1) |
| Historial de versiones | ❌ No | ✅ Revisiones | ✅ Fase 3 |
| Velocidad de edición | ✅ Muy rápida | ⚠️ Lenta | ✅ Muy rápida |
| Curva de aprendizaje | ✅ Baja | ⚠️ Media | ✅ Baja |

---

## SECCIÓN 2 — ARQUITECTURA TÉCNICA

### 2.1 Stack tecnológico actual del sitio y propuesta de CMS

```
SITIO ACTUAL (apps/web/)
├── HTML5/CSS3 vanilla     → Estructura y estilos del sitio público
├── JavaScript vanilla     → Interacciones (carousel, scroll effects)
├── PHP legacy (parser)    → Procesamiento server-side (no activo)
└── Nginx                  → Servidor web

PROPUESTA CMS (complementario al sitio actual)
├── CKEditor 5 o TinyMCE    → Editor de texto rico inline (compatible con vanilla JS)
├── Zustand o vanilla JS   → Estado global del modo editor
├── API Routes PHP o Node   → Backend para guardado de contenido
├── Persistencia JSON o PostgreSQL → Según fase
└── JWT                    → Autenticación del editor
```

### 2.2 Estructura de carpetas del proyecto actual (apps/web/)

```
crea_web/
├── apps/
│   └── web/
│       ├── index.html              ← Portada principal (HTML vanilla)
│       ├── about.html              ← Página Acerca de
│       ├── contacto.html           ← Página de contacto
│       ├── assets/
│       │   ├── css/
│       │   │   ├── main.css        ← Estilos principales
│       │   │   ├── components.css  ← Componentes UI
│       │   │   └── responsive.css  ← Estilos responsive
│       │   ├── js/
│       │   │   ├── main.js         ← Funcionalidad principal
│       │   │   ├── carousel.js     ← Carrusel de noticias
│       │   │   └── interactions.js ← Interacciones UI
│       │   ├── img/                ← Imágenes estáticas
│       │   └── vid/                ← Videos
│       ├── parciales/              ← Componentes PHP (no activos)
│       └── categoria/              ← Páginas de categorías
├── docs/
│   └── cms/                       ← Este documento
├── docker-compose.yml            ← Contenedor Nginx
├── Dockerfile
└── nginx.conf                    ← Configuración Nginx

PROPUESTA CMS (nueva capa sobre el sitio actual):
├── admin/
│   ├── login.html                 ← Página de login del editor
│   ├── editor.html                ← Editor inline (se integra en página pública)
│   ├── css/
│   │   └── editor.css             ← Estilos del modo editor
│   └── js/
│       ├── auth.js                ← Lógica de autenticación JWT
│       ├── editor.js              ← Editor inline (CKEditor/TinyMCE)
│       ├── store.js               → Estado global (Zustand o vanilla)
│       └── api-client.js          ← Cliente para API de guardado
├── api/
│   ├── auth/
│   │   ├── login.php              ← Autenticación
│   │   └── logout.php             ← Cierre de sesión
│   ├── content/
│   │   └── save.php               ← Guardado de bloques
│   └── articles/
│       └── crud.php               ← CRUD de artículos
└── data/
    ├── pages.json                 ← Contenido de páginas (Fase 1)
    └── articles.json              ← Artículos (Fase 1)
```

---

## SECCIÓN 3 — AUTENTICACIÓN (FASE 1: HARDCODED)

### 3.1 Credenciales de acceso inicial

> **NOTA DE VIABILIDAD:** El sistema actual usa HTML/CSS/JS vanilla. Las credenciales y autenticación se implementarían en JavaScript del cliente + API PHP o endpoints de servidor.

```javascript
// admin/js/constants.js
// INSTRUCCIÓN: estas credenciales son temporales para Fase 1.
// En Fase 2 se reemplazan por consulta a la tabla `usuarios` de PostgreSQL
// con verificación bcrypt del password hash.

export const HARDCODED_USERS = [
  {
    id: "editor-001",
    nombre: "Editor CREA",
    email: "editor@creacontenidos.com",
    password: "password123",           // FASE 1 ÚNICAMENTE — reemplazar en Fase 2
    rol: "director_editorial",
  },
];

export const JWT_SECRET = "crea-jwt-secret-fase1-cambiar-en-produccion";
export const SESSION_COOKIE_NAME = "crea_editor_session";
export const SESSION_DURATION_HOURS = 8;
```

### 3.2 API Endpoint: login

> **NOTA DE VIABILIDAD:** En el stack actual (HTML/JS vanilla), la autenticación se implementaría como API PHP o endpoint de servidor compatible con el setup actual.

```php
<?php
// api/auth/login.php
// Autenticación Fase 1: comparación directa
// Fase 2: bcrypt.compare con hash de PostgreSQL

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

$users = json_decode(file_get_contents(__DIR__ . '/../../data/users.json'), true);
$user = array_values(array_filter($users, fn($u) => $u['email'] === $email && $u['password'] === $password));

if (empty($user)) {
  http_response_code(401);
  echo json_encode(['error' => 'Credenciales incorrectas']);
  exit;
}

$user = $user[0];
$token = base64_encode(json_encode([
  'sub' => $user['id'],
  'email' => $user['email'],
  'nombre' => $user['nombre'],
  'rol' => $user['rol'],
  'exp' => time() + (8 * 3600)
]));

setcookie('crea_editor_session', $token, [
  'expires' => time() + (8 * 3600),
  'httponly' => true,
  'samesite' => 'lax',
  'path' => '/'
]);

echo json_encode([
  'ok' => true,
  'usuario' => ['nombre' => $user['nombre'], 'email' => $user['email'], 'rol' => $user['rol']]
]);
?>
```
```

### 3.3 API Endpoint: logout

> **NOTA DE VIABILIDAD:** En el stack actual se implementa como endpoint PHP.

```php
<?php
// api/auth/logout.php

header('Content-Type: application/json');
setcookie('crea_editor_session', '', ['expires' => time() - 3600, 'path' => '/']);
echo json_encode(['ok' => true]);
?>
```

### 3.4 Protección de rutas de edición

> **NOTA DE VIABILIDAD:** En el stack actual, la protección se implementa en JavaScript del cliente (verificar token antes de permitir edición) y en el backend PHP (verificar cookie antes de guardar).

```javascript
// admin/js/auth.js
// Protege el modo editor verificando el token en cada operación

const AUTH_CONFIG = {
  cookieName: 'crea_editor_session',
  protectedRoutes: ['/api/content', '/api/articles', '/api/upload']
};

function isAuthenticated() {
  const token = getCookie(AUTH_CONFIG.cookieName);
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token));
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

function getAuthHeader() {
  return { 'Authorization': 'Bearer ' + getCookie(AUTH_CONFIG.cookieName) };
}
```

---

## SECCIÓN 4 — COMPONENTES DEL EDITOR INLINE

### 4.1 Botón de inicio de sesión (visible en el sitio público)

> **NOTA DE VIABILIDAD:** Implementado como JavaScript vanilla e inyectado en el sitio actual.

```javascript
// admin/js/login-button.js
// Botón flotante que aparece en la esquina inferior derecha del sitio público.
// Cuando el usuario está autenticado, muestra "Modo Editor" en lugar del botón.

(function() {
  const AUTH_CONFIG = {
    loginApi: '/api/auth/login',
    logoutApi: '/api/auth/logout',
    cookieName: 'crea_editor_session'
  };

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isAuthenticated() {
    const token = getCookie(AUTH_CONFIG.cookieName);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }

  function getUserFromToken() {
    const token = getCookie(AUTH_CONFIG.cookieName);
    if (!token) return null;
    try {
      return JSON.parse(atob(token));
    } catch { return null; }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .crea-login-btn {
        position: fixed; bottom: 1rem; right: 1rem; z-index: 9999;
        background: #1f2937; color: white; padding: 0.5rem 1rem;
        border-radius: 9999px; font-size: 0.875rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer;
        border: none; display: flex; align-items: center; gap: 0.5rem;
        transition: background 0.2s;
      }
      .crea-login-btn:hover { background: #374151; }
      .crea-editor-indicator {
        position: fixed; bottom: 1rem; right: 1rem; z-index: 9999;
        background: #059669; color: white; padding: 0.5rem 1rem;
        border-radius: 9999px; font-size: 0.875rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex; align-items: center; gap: 0.5rem;
      }
      .crea-editor-indicator .pulse {
        width: 0.5rem; height: 0.5rem; background: #86efac;
        border-radius: 50%; animation: pulse 2s infinite;
      }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .crea-login-modal {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.6); display: none;
        align-items: center; justify-content: center;
      }
      .crea-login-modal.active { display: flex; }
      .crea-login-modal-content {
        background: white; border-radius: 1rem; padding: 2rem;
        width: 100%; max-width: 24rem; margin: 1rem;
      }
      .crea-login-modal h2 {
        font-size: 1.5rem; font-weight: 700; color: #111;
        text-align: center; margin-bottom: 0.25rem;
      }
      .crea-login-modal p {
        text-align: center; color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem;
      }
      .crea-login-form { display: flex; flex-direction: column; gap: 1rem; }
      .crea-login-form label {
        display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem;
      }
      .crea-login-form input {
        width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
        border-radius: 0.5rem; font-size: 0.875rem;
      }
      .crea-login-form input:focus {
        outline: none; ring: 2px; ring-color: #3b82f6;
      }
      .crea-login-error {
        font-size: 0.875rem; color: #dc2626; background: #fef2f2;
        padding: 0.5rem 0.75rem; border-radius: 0.5rem;
      }
      .crea-login-submit {
        background: #2563eb; color: white; padding: 0.5rem;
        border-radius: 0.5rem; font-weight: 500; border: none; cursor: pointer;
      }
      .crea-login-submit:hover { background: #1d4ed8; }
      .crea-login-cancel {
        margin-top: 1rem; width: 100%; color: #9ca3af; font-size: 0.875rem;
        background: none; border: none; cursor: pointer;
      }
      .crea-login-cancel:hover { color: #4b5563; }
    `;
    document.head.appendChild(style);
  }

  function showModal() {
    const modal = document.getElementById('crea-login-modal');
    if (modal) modal.classList.add('active');
  }

  function hideModal() {
    const modal = document.getElementById('crea-login-modal');
    if (modal) modal.classList.remove('active');
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('crea-login-email').value;
    const password = document.getElementById('crea-login-password').value;
    const errorEl = document.getElementById('crea-login-error');
    const btn = document.getElementById('crea-login-submit');

    btn.textContent = 'Verificando...';
    btn.disabled = true;
    errorEl.style.display = 'none';

    try {
      const res = await fetch(AUTH_CONFIG.loginApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'Error al iniciar sesión';
        errorEl.style.display = 'block';
        btn.textContent = 'Ingresar al editor';
        btn.disabled = false;
        return;
      }

      hideModal();
      window.location.reload();
    } catch (err) {
      errorEl.textContent = 'Error de conexión';
      errorEl.style.display = 'block';
      btn.textContent = 'Ingresar al editor';
      btn.disabled = false;
    }
  }

  async function handleLogout() {
    await fetch(AUTH_CONFIG.logoutApi, { method: 'POST' });
    window.location.reload();
  }

  function render() {
    const user = getUserFromToken();

    if (isAuthenticated() && user) {
      const indicator = document.createElement('div');
      indicator.className = 'crea-editor-indicator';
      indicator.innerHTML = `
        <span class="pulse"></span>
        Modo Editor — ${user.nombre}
        <button onclick="window.creaLogout()" style="background:none;border:none;color:#86efac;cursor:pointer;margin-left:0.5rem;text-decoration:underline;">
          Salir
        </button>
      `;
      document.body.appendChild(indicator);
      window.creaLogout = handleLogout;
    } else {
      const btn = document.createElement('button');
      btn.className = 'crea-login-btn';
      btn.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Iniciar sesión
      `;
      btn.onclick = showModal;
      document.body.appendChild(btn);
    }

    const modal = document.createElement('div');
    modal.id = 'crea-login-modal';
    modal.className = 'crea-login-modal';
    modal.innerHTML = `
      <div class="crea-login-modal-content">
        <h2>CREA</h2>
        <p>Acceso editorial</p>
        <form class="crea-login-form" id="crea-login-form">
          <div>
            <label>Correo electrónico</label>
            <input type="email" id="crea-login-email" placeholder="editor@creacontenidos.com" required>
          </div>
          <div>
            <label>Contraseña</label>
            <input type="password" id="crea-login-password" required>
          </div>
          <div id="crea-login-error" class="crea-login-error" style="display:none;"></div>
          <button type="submit" id="crea-login-submit" class="crea-login-submit">Ingresar al editor</button>
        </form>
        <button class="crea-login-cancel" onclick="window.creaHideLoginModal()">Cancelar</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('crea-login-form').onsubmit = handleLogin;
    window.creaHideLoginModal = hideModal;
  }

  createStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
```

### 4.2 Barra de herramientas flotante del editor

> **NOTA DE VIABILIDAD:** Implementada como JavaScript vanilla que inyecta la barra en el DOM.

```javascript
// admin/js/editor-toolbar.js
// Barra superior que aparece SOLO cuando el editor está activo.
// Combina las acciones principales: guardar, publicar, vista previa, nuevo artículo.

(function() {
  const API_CONFIG = {
    contentApi: '/api/content',
    cookieName: 'crea_editor_session'
  };

  let pendingChanges = false;
  let changedBlocks = {};

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isAuthenticated() {
    const token = getCookie(API_CONFIG.cookieName);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .crea-editor-toolbar {
        position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
        background: #1f2937; color: white; height: 3rem;
        display: flex; align-items: center; padding: 0 1rem; gap: 0.75rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .crea-editor-toolbar .indicator {
        display: flex; align-items: center; gap: 0.5rem;
      }
      .crea-editor-toolbar .pulse {
        width: 0.5rem; height: 0.5rem; background: #4ade80;
        border-radius: 50%; animation: pulse 2s infinite;
      }
      .crea-editor-toolbar .divider {
        width: 1px; height: 1.25rem; background: #4b5563;
      }
      .crea-editor-toolbar button {
        background: none; border: none; color: #d1d5db;
        font-size: 0.875rem; padding: 0.25rem 0.75rem; border-radius: 0.25rem;
        cursor: pointer; transition: background 0.2s;
      }
      .crea-editor-toolbar button:hover { background: #374151; color: white; }
      .crea-editor-toolbar .publish-btn {
        background: #2563eb; color: white; font-weight: 500;
      }
      .crea-editor-toolbar .publish-btn:hover { background: #1d4ed8; }
      .crea-editor-toolbar .spacer { flex: 1; }
      .crea-editor-toolbar .pending-dot {
        width: 0.375rem; height: 0.375rem; background: #facc15;
        border-radius: 50%; margin-left: 0.25rem;
      }
    `;
    document.head.appendChild(style);
  }

  async function saveDraft() {
    const pageId = document.body.dataset.pageId || 'home';
    try {
      const res = await fetch(`${API_CONFIG.contentApi}/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: changedBlocks, estado: 'borrador' })
      });
      if (res.ok) {
        pendingChanges = false;
        changedBlocks = {};
        showNotification('Borrador guardado');
      }
    } catch (err) {
      showNotification('Error al guardar', 'error');
    }
  }

  async function publish() {
    const pageId = document.body.dataset.pageId || 'home';
    try {
      const res = await fetch(`${API_CONFIG.contentApi}/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: changedBlocks, estado: 'publicada' })
      });
      if (res.ok) {
        pendingChanges = false;
        changedBlocks = {};
        showNotification('¡Cambios publicados!', 'success');
      }
    } catch (err) {
      showNotification('Error al publicar', 'error');
    }
  }

  function showNotification(message, type = 'success') {
    const existing = document.getElementById('crea-notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'crea-notification';
    notif.textContent = message;
    notif.style.cssText = `
      position: fixed; bottom: 5rem; right: 1rem; z-index: 10000;
      background: ${type === 'error' ? '#dc2626' : '#059669'};
      color: white; padding: 0.75rem 1rem; border-radius: 0.5rem;
      font-size: 0.875rem;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  window.creaRegisterChange = (blockId, content) => {
    pendingChanges = true;
    changedBlocks[blockId] = content;
  };

  function render() {
    if (!isAuthenticated()) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'crea-editor-toolbar';
    toolbar.innerHTML = `
      <div class="indicator">
        <span class="pulse"></span>
        <span class="text-sm font-medium">Modo Editor</span>
      </div>
      <div class="divider"></div>
      <button onclick="window.creaSaveDraft()">
        Guardar borrador
        <span class="pending-dot" id="crea-pending-dot" style="display:none;"></span>
      </button>
      <button class="publish-btn" onclick="window.creaPublish()">Publicar</button>
      <div class="divider"></div>
      <button onclick="window.creaOpenArticles()">Artículos</button>
      <button onclick="window.creaOpenSeo()">SEO</button>
      <div class="spacer"></div>
      <a href="/?preview=true" target="_blank" class="text-sm px-3 py-1 rounded hover:bg-gray-700 transition-colors text-gray-300 hover:text-white flex items-center gap-1" style="text-decoration:none;color:inherit;">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Vista pública
      </a>
    `;
    document.body.appendChild(toolbar);

    document.body.style.paddingTop = '3rem';

    window.creaSaveDraft = saveDraft;
    window.creaPublish = publish;
    window.creaOpenArticles = () => alert('Panel de artículos en desarrollo');
    window.creaOpenSeo = () => alert('Panel SEO en desarrollo');

    setInterval(() => {
      const dot = document.getElementById('crea-pending-dot');
      if (dot) dot.style.display = pendingChanges ? 'inline' : 'none';
    }, 500);
  }

  createStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
```

### 4.3 Bloque de texto editable (corazón del editor inline)

> **NOTA DE VIABILIDAD:** Implementado con CKEditor 5 o TinyMCE (versiones vanilla JS) integrado en el sitio actual. El enfoque es diferente al documento original: se usa un editor clásico en lugar de TipTap.

```javascript
// admin/js/editable-block.js
// Wrapper que convierte bloques de texto en editables con CKEditor 5.
// En modo no-editor, renderiza el contenido normalmente.
// Compatible con el stack HTML vanilla actual.

(function() {
  const CKEDITOR_CONFIG = {
    scriptUrl: 'https://cdn.ckeditor.com/ckeditor5/41.0.0/classic/ckeditor.js',
    cloudServicesTokenUrl: null
  };

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function isAuthenticated() {
    const token = getCookie('crea_editor_session');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch { return false; }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .crea-editable-block {
        position: relative;
        border: 2px solid transparent;
        border-radius: 0.5rem;
        transition: border-color 0.2s;
        cursor: text;
      }
      .crea-editable-block:hover {
        border-color: rgba(59, 130, 246, 0.5);
        border-style: dashed;
      }
      .crea-editable-block.cke_focus {
        border-color: #3b82f6;
        border-style: solid;
      }
      .crea-editable-block .editable-tooltip {
        position: absolute;
        top: -1.75rem;
        left: 0;
        background: #2563eb;
        color: white;
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
        white-space: nowrap;
      }
      .crea-editable-block:hover .editable-tooltip {
        opacity: 1;
      }
      .crea-view-mode {
        cursor: default;
      }
    `;
    document.head.appendChild(style);
  }

  async function initEditors() {
    if (!isAuthenticated()) return;

    const blocks = document.querySelectorAll('[data-editable-block]');
    if (typeof ClassicEditor === 'undefined') {
      const script = document.createElement('script');
      script.src = CKEDITOR_CONFIG.scriptUrl;
      script.onload = () => initializeBlocks(blocks);
      document.head.appendChild(script);
    } else {
      initializeBlocks(blocks);
    }
  }

  async function initializeBlocks(blocks) {
    for (const block of blocks) {
      const blockId = block.dataset.editableBlock;
      const initialContent = block.innerHTML.trim();

      const wrapper = document.createElement('div');
      wrapper.className = 'crea-editable-block';
      wrapper.dataset.blockId = blockId;

      const tooltip = document.createElement('div');
      tooltip.className = 'editable-tooltip';
      tooltip.textContent = 'Haz click para editar';

      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(tooltip);
      wrapper.appendChild(block);

      try {
        const editor = await ClassicEditor.create(block, {
          toolbar: ['heading', 'bold', 'italic', 'bulletedList', 'numberedList', 'undo', 'redo'],
          placeholder: 'Escribe aquí...'
        });

        editor.model.document.on('change:data', () => {
          const content = editor.getData();
          if (window.creaRegisterChange) {
            window.creaRegisterChange(blockId, content);
          }
        });

        editor.on('focus', () => wrapper.classList.add('cke_focus'));
        editor.on('blur', () => wrapper.classList.remove('cke_focus'));
      } catch (err) {
        console.error('Error initializing editor for block:', blockId, err);
      }
    }
  }

  function renderViewMode() {
    const blocks = document.querySelectorAll('[data-editable-block]');
    blocks.forEach(block => {
      block.classList.add('crea-view-mode');
    });
  }

  createStyles();
  if (!isAuthenticated()) {
    renderViewMode();
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEditors);
    } else {
      initEditors();
    }
  }
})();
```

---

## SECCIÓN 5 — ESTADO GLOBAL DEL EDITOR (VANILLA JS)

> **NOTA DE VIABILIDAD:** En el stack actual (HTML/JS vanilla), el estado global se gestiona con un objeto JavaScript simple y variables en window, en lugar de Zustand/React.

```javascript
// admin/js/store.js
// Estado global que controla si el modo editor está activo y
// registra los cambios pendientes de guardar.
// Compatible con el stack vanilla actual.

const EditorStore = {
  isEditorMode: false,
  currentUser: null,
  pendingChanges: false,
  changedBlocks: {},
  currentArticleId: null,
  articlePanelOpen: false,
  seoPanelOpen: false,

  activateEditorMode(user) {
    this.isEditorMode = true;
    this.currentUser = user;
    this.dispatchChange();
  },

  deactivateEditorMode() {
    this.isEditorMode = false;
    this.currentUser = null;
    this.pendingChanges = false;
    this.changedBlocks = {};
    this.dispatchChange();
  },

  updateBlock(blockId, content) {
    this.pendingChanges = true;
    this.changedBlocks[blockId] = content;
    this.dispatchChange();
  },

  setCurrentArticle(id) {
    this.currentArticleId = id;
    this.dispatchChange();
  },

  openArticlePanel() {
    this.articlePanelOpen = true;
    this.seoPanelOpen = false;
    this.dispatchChange();
  },

  openSeoPanel() {
    this.seoPanelOpen = true;
    this.articlePanelOpen = false;
    this.dispatchChange();
  },

  closePanels() {
    this.articlePanelOpen = false;
    this.seoPanelOpen = false;
    this.dispatchChange();
  },

  async saveAllChanges(estado) {
    const pageId = this.currentArticleId || 'home';
    try {
      const res = await fetch(`/api/content/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: this.changedBlocks, estado })
      });
      if (res.ok) {
        this.pendingChanges = false;
        this.changedBlocks = {};
        this.dispatchChange();
        return true;
      }
    } catch (err) {
      console.error('Error saving changes:', err);
    }
    return false;
  },

  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  dispatchChange() {
    this.listeners.forEach(cb => cb(this));
  }
};

window.EditorStore = EditorStore;
```

---

## SECCIÓN 6 — PERSISTENCIA DE CONTENIDO (FASE 1: JSON)

### 6.1 Estructura del archivo `data/pages.json`

```json
{
  "home": {
    "meta": {
      "titulo": "CREA — Noticias de Perote y la región",
      "descripcion": "Medio digital local de Perote, Veracruz.",
      "imagen_og": "/uploads/og-home.jpg"
    },
    "bloques": {
      "hero-titulo": "<h1>El pulso de Perote, <em>en tiempo real</em></h1>",
      "hero-subtitulo": "<p>Noticias, cultura y comunidad de Perote y el corredor Xalapa–Puebla.</p>",
      "seccion-nosotros": "<h2>Sobre CREA</h2><p>Somos un medio digital local...</p>",
      "footer-texto": "<p>CREA Contenidos © 2025 — Perote, Veracruz</p>"
    }
  },
  "acerca": {
    "meta": {
      "titulo": "Acerca de CREA",
      "descripcion": "Conoce al equipo y la misión de CREA Contenidos."
    },
    "bloques": {
      "acerca-titulo": "<h1>Nuestra misión</h1>",
      "acerca-cuerpo": "<p>CREA nació con la convicción de que el periodismo local...</p>"
    }
  }
}
```

### 6.2 Estructura del archivo `data/articles.json`

```json
{
  "articles": [
    {
      "id": "art-001",
      "slug": "primer-articulo-de-prueba",
      "titulo": "Primer artículo de CREA",
      "subtitulo": "Arranca el medio digital de Perote",
      "extracto": "CREA lanza su plataforma digital con el objetivo de...",
      "contenido_html": "<p>Cuerpo completo del artículo en HTML...</p>",
      "imagen_destacada": "/uploads/articulo-001.jpg",
      "imagen_alt": "Plaza principal de Perote al amanecer",
      "categoria": "local",
      "autor": "Emmanuel Reyes Zapata",
      "estado": "publicada",
      "keywords_seo": ["perote", "noticias perote", "veracruz noticias"],
      "meta_description": "CREA lanza su plataforma digital local en Perote, Veracruz.",
      "fecha_publicacion": "2025-01-15T10:00:00Z",
      "created_at": "2025-01-15T09:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### 6.3 API Endpoint de contenido

> **NOTA DE VIABILIDAD:** En el stack actual, la API se implementaría como endpoints PHP compatibles con el servidor Nginx existente.

```php
<?php
// api/content/index.php
// GET:  lee el contenido de una página o artículo (público)
// POST: actualiza bloques (requiere sesión)

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? 'home';
$dataPath = __DIR__ . '/../../data/pages.json';

function requireAuth() {
  $token = $_COOKIE['crea_editor_session'] ?? null;
  if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
  }
  $payload = json_decode(base64_decode($token), true);
  if (!$payload || $payload['exp'] < time()) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión expirada']);
    exit;
  }
  return $payload;
}

if ($method === 'GET') {
  $pages = json_decode(file_get_contents($dataPath), true);
  $page = $pages[$id] ?? null;
  if (!$page) {
    http_response_code(404);
    echo json_encode(['error' => 'Página no encontrada']);
    exit;
  }
  echo json_encode($page);
  exit;
}

if ($method === 'POST' || $method === 'PATCH') {
  requireAuth();
  $data = json_decode(file_get_contents('php://input'), true);
  $blocks = $data['blocks'] ?? [];
  $estado = $data['estado'] ?? null;

  $pages = json_decode(file_get_contents($dataPath), true);

  if (!isset($pages[$id])) {
    $pages[$id] = ['meta' => [], 'bloques' => []];
  }

  $pages[$id]['bloques'] = array_merge($pages[$id]['bloques'], $blocks);

  if ($estado) {
    $pages[$id]['estado'] = $estado;
    $pages[$id]['updated_at'] = date('c');
  }

  file_put_contents($dataPath, json_encode($pages, JSON_PRETTY_PRINT));
  echo json_encode(['ok' => true, 'updated' => count($blocks)]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
?>
```

---

## SECCIÓN 7 — INTEGRACIÓN EN EL SITIO ACTUAL

> **NOTA DE VIABILIDAD:** En el stack actual (HTML vanilla), la integración se hace inyectando scripts JavaScript en el HTML existente.

### 7.1 Inclusión de scripts del editor en index.html

```html
<!-- Al final del body en index.html -->
<script src="/admin/js/auth.js"></script>
<script src="/admin/js/store.js"></script>
<script src="/admin/js/login-button.js"></script>
<script src="/admin/js/editor-toolbar.js"></script>
<!-- Los bloques editables necesitan el atributo data-editable-block -->
<script src="/admin/js/editable-block.js"></script>
```

### 7.2 Ejemplo de página con bloques editables

```html
<!-- En index.html - secciones con atributo data-editable-block -->
<section class="hero">
  <h1 data-editable-block="hero-titulo">El pulso de Perote, <em>en tiempo real</em></h1>
  <p data-editable-block="hero-subtitulo">Noticias, cultura y comunidad de Perote...</p>
</section>

<section class="nosotros">
  <div data-editable-block="seccion-nosotros">
    <h2>Sobre CREA</h2>
    <p>Somos un medio digital local...</p>
  </div>
</section>
```

### 7.3 Atributos para bloques editables

| Atributo | Descripción |
|----------|-------------|
| `data-editable-block` | ID único del bloque (usado para tracking de cambios) |
| `data-page-id` | ID de la página (en body, para la API de guardado) |

```html
<body data-page-id="home">
  <!-- contenido -->
  <p data-editable-block="hero-titulo">...</p>
</body>
```

---

## SECCIÓN 8 — DEPENDENCIAS Y CONFIGURACIÓN DEL PROYECTO

> **NOTA DE VIABILIDAD:** El sistema actual usa vanilla JS/HTML, no requiere instalación de paquetes npm. Las dependencias son solo librerías cargadas desde CDN.

### 8.1 Dependencias (CDN)

```html
<!-- CKEditor 5 (editor de texto rico) -->
<script src="https://cdn.ckeditor.com/ckeditor5/41.0.0/classic/ckeditor.js"></script>
<script src="https://cdn.ckeditor.com/ckeditor5/41.0.0/classic/ckeditor.min.js"></script>

<!-- Opcional: TinyMCE como alternativa -->
<script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>
```

### 8.2 Estructura de archivos del CMS

```
admin/
├── login.html              ← Página de login del editor
├── editor.html             ← Editor inline (opcional, puede integrarse en sitio)
├── css/
│   └── editor.css          ← Estilos del modo editor
└── js/
    ├── auth.js             ← Lógica de autenticación JWT
    ├── store.js            ← Estado global (vanilla JS)
    ├── login-button.js     ← Botón flotante de login
    ├── editor-toolbar.js   ← Barra de herramientas del editor
    └── editable-block.js   ← Wrapper de bloques editables (CKEditor)

api/
├── auth/
│   ├── login.php           ← Autenticación
│   └── logout.php          ← Cierre de sesión
├── content/
│   └── index.php           ← GET/POST de bloques de contenido
└── articles/
    └── crud.php            ← CRUD de artículos

data/
├── pages.json              ← Contenido de páginas (Fase 1)
├── articles.json           ← Artículos (Fase 1)
└── users.json              ← Usuarios (Fase 1)
```

### 8.3 Variables de configuración

```javascript
// admin/js/config.js
export const CONFIG = {
  siteUrl: 'https://crea-contenidos.com',
  apiBase: '/api',
  cookieName: 'crea_editor_session',
  sessionDurationHours: 8
};
```

```env
# JWT — cambiar por string largo y aleatorio en producción
JWT_SECRET=crea-jwt-secret-fase1-CAMBIAR-EN-PRODUCCION-por-string-aleatorio-256bits

# Entorno
NODE_ENV=development

# URL del sitio (para metadatos OG)
NEXT_PUBLIC_SITE_URL=https://crea-contenidos.com

# Fase 2: conexión a PostgreSQL (agregar cuando se migre de JSON a DB)
# POSTGRES_URL=postgresql://crea_user:password@localhost:5432/crea_db
```

### 8.3 Configuración de `next.config.ts`

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "crea-contenidos.com" },
    ],
  },
  // Permitir escritura de archivos JSON en data/ (solo en desarrollo/servidor propio)
  // En producción con VPS esto funciona; en Vercel Edge requiere adaptación a DB
  experimental: {
    serverActions: { allowedOrigins: ["crea-contenidos.com"] },
  },
};

export default nextConfig;
```

---

## SECCIÓN 9 — PLAN DE MIGRACIÓN FASE 1 → FASE 2

> **NOTA DE VIABILIDAD:** La migración aplica al stack actual (HTML/JS vanilla + PHP).

Cuando la base de datos PostgreSQL esté disponible (según `CREA_DB_Schema_PostgreSQL.md`),
la migración del CMS es quirúrgica y no requiere reescribir componentes:

| Elemento | Fase 1 (ahora) | Fase 2 (con DB) |
|---|---|---|
| Autenticación | Hardcoded en `users.json` | Consulta a tabla `usuarios` + bcrypt |
| Contenido de páginas | `data/pages.json` | Tabla `bloques_contenido` (nueva) |
| Artículos | `data/articles.json` | Tabla `piezas_contenido` |
| Imágenes | `/assets/img/` local | Cloudflare R2 o Supabase Storage |
| Historial de cambios | No disponible | Tabla `audit_log` |

**Solo hay que modificar:**
- `api/auth/login.php`: cambiar comparación hardcoded por query a PostgreSQL
- `api/content/index.php`: cambiar `file_get_contents` por query a PostgreSQL
- Los endpoints PHP: misma interfaz, diferente fuente de datos

Los **scripts del frontend no cambian nada** porque están desacoplados
de la capa de persistencia.

---

## SECCIÓN 10 — DESPLIEGUE EN DOKPLOY (VPS HOSTINGER)

> **NOTA DE VIABILIDAD:** El stack actual ya usa Nginx + Docker en Hostinger/DokPloy.

### 10.1 `Dockerfile` actual (ya existe)

El proyecto ya cuenta con un Dockerfile configurado para Nginx:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 10.2 `docker-compose.yml` actual (ya existe)

El proyecto ya tiene configuración Docker:

```yaml
version: "3.8"
services:
  crea-web:
    build: .
    restart: unless-stopped
    ports:
      - "3000:80"
    volumes:
      - ./apps/web:/usr/share/nginx/html
```

### 10.3 Configuración en DokPloy

El despliegue actual ya está configurado en DokPloy con Nginx.

---

## SECCIÓN 11 — ORDEN DE IMPLEMENTACIÓN RECOMENDADO

> **NOTA DE VIABILIDAD:** Ajustado al stack actual (HTML/JS vanilla + PHP).

```
Semana 1 — Base funcional del CMS
  [x] Crear estructura admin/ (login.html, js/, css/)
  [x] Implementar admin/js/auth.js con credenciales hardcoded
  [x] Implementar api/auth/login.php y logout.php
  [x] Crear data/users.json con usuarios inicial
  [x] Verificar login/logout en localhost

Semana 2 — Editor inline
  [x] Cargar CKEditor 5 desde CDN
  [x] Implementar admin/js/store.js (estado global vanilla)
  [x] Implementar admin/js/login-button.js con modal
  [x] Implementar admin/js/editor-toolbar.js con guardar/publicar
  [x] Agregar atributos data-editable-block en index.html
  [x] Implementar admin/js/editable-block.js
  [x] Crear data/pages.json con contenido inicial de la portada
  [x] Implementar api/content/index.php (GET y POST)
  [x] Conectar editable-block con la API de guardado
  [x] Probar flujo completo: login → editar → guardar → ver cambios

Semana 3 — Artículos y despliegue
  [x] Implementar panel de gestión de artículos (admin/js/articles-panel.js)
  [x] Crear data/articles.json con primeros artículos
  [x] Implementar api/articles/crud.php (listado y creación)
  [x] Actualizar Dockerfile para soportar PHP-FPM
  [x] Actualizar nginx.conf para procesar archivos PHP
  [x] Actualizar docker-compose.yml con variables PHP
  [x] Actualizar index.html para cargar articles-panel.js
  [x] Actualizar checklist en SPEC.md

Semana 4 — SEO y pulido
  □ Implementar edición de meta title, description, keywords
  □ Agregar og:image y twitter:card metadata dinámica
  □ Implementar editor de imágenes reemplazables
  □ Revisar rendimiento y ajustar
  □ Documentar para el equipo: guía de uso del editor
```

---

*Documento generado para el proyecto CREA — crea-contenidos.com*  
*Perote, Veracruz | 2025*  
*Versión 1.1 — Actualizado para viabilidad con stack actual HTML/CSS/JS vanilla*  
*Revisión recomendada al finalizar Semana 4 de implementación.*
