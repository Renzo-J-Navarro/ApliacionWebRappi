const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../fronend')));

/* ── Imágenes generadas por Python ──────────────────────
   rappi_bridge.py guarda los PNG en output_imagenes/
   Los servimos en /imagenes/ para que el dashboard los cargue.
────────────────────────────────────────────────────── */
app.use('/output_imagenes', express.static(path.join(__dirname, '../output_imagenes')));

/* ── GET /api/imagenes — qué imágenes existen en disco ──
   El dashboard llama esto al cargar para mostrar resultados previos.
────────────────────────────────────────────────────── */
app.get('/api/imagenes', (req, res) => {
  const dir = path.join(__dirname, '../output_imagenes');
  const mapa = {
    '01_red_rappi_lima.png': 'red_lima',
    '02_a*_ruta.png': 'ruta_astar',
    '02_dijkstra_ruta.png': 'ruta_dijkstra',
    '02_bfs_ruta.png': 'ruta_bfs',
    '02_dfs_ruta.png': 'ruta_dfs',
    '03_zona_alta_demanda.png': 'zona_demanda',
    '04_dashboard_rappi.png': 'dashboard',
  };
  if (!fs.existsSync(dir)) return res.json({ ok: true, disponibles: {} });
  const archivos = fs.readdirSync(dir);
  const disponibles = {};
  for (const [archivo, clave] of Object.entries(mapa)) {
    if (archivos.includes(archivo)) disponibles[clave] = `/output_imagenes/${archivo}`;
  }
  res.json({ ok: true, disponibles });
});


/* ── Rutas de archivos JSON ─────────────────────────── */
const DB_ADMINS = path.join(__dirname, 'data/usuarios_admin_db.json');
const DB_USERS = path.join(__dirname, 'data/usuarios_db.json');

/* ── Helpers de lectura/escritura ───────────────────── */
function leerAdmins() {
  return JSON.parse(fs.readFileSync(DB_ADMINS, 'utf-8') || '[]');
}
function guardarAdmins(lista) {
  fs.writeFileSync(DB_ADMINS, JSON.stringify(lista, null, 2));
}
function leerUsuarios() {
  return JSON.parse(fs.readFileSync(DB_USERS, 'utf-8') || '[]');
}
function guardarUsuarios(lista) {
  fs.writeFileSync(DB_USERS, JSON.stringify(lista, null, 2));
}

/* ── Hash simple (igual que en session.js del frontend) */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════ */

/* ── POST /api/login ──────────────────────────────── */
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ ok: false, error: 'Faltan campos.' });

  const em = email.toLowerCase().trim();
  const pw = hash(password);

  // Buscar primero en admins
  const admins = leerAdmins();
  const admin = admins.find(a => a.email.toLowerCase() === em && a.password === pw);
  if (admin) {
    if (!admin.activo)
      return res.status(403).json({ ok: false, error: 'Tu cuenta está desactivada.' });
    const { password: _, ...safe } = admin;
    return res.json({ ok: true, user: safe });
  }

  // Buscar en usuarios normales
  const usuarios = leerUsuarios();
  const usuario = usuarios.find(u => u.email.toLowerCase() === em && u.password === pw);
  if (usuario) {
    if (!usuario.activo)
      return res.status(403).json({ ok: false, error: 'Tu cuenta está desactivada.' });
    const { password: _, ...safe } = usuario;
    return res.json({ ok: true, user: safe });
  }

  return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });
});

/* ── POST /api/register ───────────────────────────── */
app.post('/api/register', (req, res) => {
  const { nombre, email, password, telefono, distrito } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ ok: false, error: 'Completa todos los campos obligatorios.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ ok: false, error: 'El correo no es válido.' });
  if (password.length < 6)
    return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' });

  const em = email.toLowerCase().trim();

  // Verificar duplicado en ambas tablas
  if (leerAdmins().some(a => a.email.toLowerCase() === em) ||
    leerUsuarios().some(u => u.email.toLowerCase() === em)) {
    return res.status(400).json({ ok: false, error: 'Ya existe una cuenta con este correo.' });
  }

  const nuevo = {
    id: genId(),
    nombre: nombre.trim(),
    email: em,
    password: hash(password),
    rol: 'usuario',
    distrito: distrito || 'Miraflores',
    telefono: telefono || '',
    createdAt: new Date().toISOString(),
    activo: true,
  };

  const usuarios = leerUsuarios();
  usuarios.push(nuevo);
  guardarUsuarios(usuarios);

  const { password: _, ...safe } = nuevo;
  return res.json({ ok: true, user: safe });
});

/* ── POST /api/register-admin ─────────────────────── */
app.post('/api/register-admin', (req, res) => {
  const { nombre, email, password, telefono, distrito } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ ok: false, error: 'Completa todos los campos obligatorios.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ ok: false, error: 'El correo no es válido.' });
  if (password.length < 6)
    return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' });

  const em = email.toLowerCase().trim();

  if (leerAdmins().some(a => a.email.toLowerCase() === em) ||
    leerUsuarios().some(u => u.email.toLowerCase() === em)) {
    return res.status(400).json({ ok: false, error: 'Ya existe una cuenta con este correo.' });
  }

  const nuevo = {
    id: genId(),
    nombre: nombre.trim(),
    email: em,
    password: hash(password),
    rol: 'admin',
    distrito: distrito || 'Miraflores',
    telefono: telefono || '',
    createdAt: new Date().toISOString(),
    activo: true,
    esRaiz: false,
  };

  const admins = leerAdmins();
  admins.push(nuevo);
  guardarAdmins(admins);

  const { password: _, ...safe } = nuevo;
  return res.json({ ok: true, user: safe });
});

/* ════════════════════════════════════════════════════
   ADMIN — CRUD USUARIOS
═══════════════════════════════════════════════════ */

/* GET /api/usuarios */
app.get('/api/usuarios', (req, res) => {
  const lista = leerUsuarios().map(({ password: _, ...u }) => u);
  res.json(lista);
});

/* PATCH /api/usuarios/:id/toggle */
app.patch('/api/usuarios/:id/toggle', (req, res) => {
  const usuarios = leerUsuarios();
  const idx = usuarios.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
  usuarios[idx].activo = !usuarios[idx].activo;
  guardarUsuarios(usuarios);
  res.json({ ok: true, activo: usuarios[idx].activo });
});

/* DELETE /api/usuarios/:id */
app.delete('/api/usuarios/:id', (req, res) => {
  const usuarios = leerUsuarios().filter(u => u.id !== req.params.id);
  guardarUsuarios(usuarios);
  res.json({ ok: true });
});

/* ════════════════════════════════════════════════════
   ADMIN — CRUD ADMINS
═══════════════════════════════════════════════════ */

/* GET /api/admins */
app.get('/api/admins', (req, res) => {
  const lista = leerAdmins().map(({ password: _, ...a }) => a);
  res.json(lista);
});

/* PATCH /api/admins/:id/toggle */
app.patch('/api/admins/:id/toggle', (req, res) => {
  if (req.params.id === 'admin-root')
    return res.status(403).json({ ok: false, error: 'No se puede modificar el administrador principal.' });
  const admins = leerAdmins();
  const idx = admins.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Admin no encontrado.' });
  admins[idx].activo = !admins[idx].activo;
  guardarAdmins(admins);
  res.json({ ok: true, activo: admins[idx].activo });
});

/* DELETE /api/admins/:id */
app.delete('/api/admins/:id', (req, res) => {
  if (req.params.id === 'admin-root')
    return res.status(403).json({ ok: false, error: 'No se puede eliminar al administrador principal.' });
  const admins = leerAdmins().filter(a => a.id !== req.params.id);
  guardarAdmins(admins);
  res.json({ ok: true });
});


/* ════════════════════════════════════════════════════
   ALGORITMOS — Bridge con Python
   POST /api/algoritmos/ejecutar
   Body: { nodos?: 1500, semilla?: 42 }

   Node lanza rappi_bridge.py como proceso hijo,
   captura su stdout (JSON) y lo devuelve al frontend.
   Timeout de 120 segundos.
═══════════════════════════════════════════════════ */
const { spawn } = require('child_process');

app.post('/api/algoritmos/ejecutar', (req, res) => {
  const nodos = parseInt(req.body?.nodos) || 1500;
  const semilla = parseInt(req.body?.semilla) || Math.floor(Math.random() * 9999);

  const PYTHON_CMD = process.platform === 'win32' ? 'python' : 'python3';
  const BRIDGE_PATH = path.join(__dirname, '../rappi_bridge.py');

  let stdout = '', stderr = '', terminado = false;

  const proceso = spawn(PYTHON_CMD, [BRIDGE_PATH, String(nodos), String(semilla)], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });

  const timeout = setTimeout(() => {
    if (!terminado) {
      proceso.kill();
      res.status(504).json({ ok: false, error: 'Timeout: Python tardó más de 120s.' });
    }
  }, 120_000);

  proceso.stdout.on('data', chunk => { stdout += chunk.toString(); });
  proceso.stderr.on('data', chunk => { stderr += chunk.toString(); });

  proceso.on('close', () => {
    terminado = true;
    clearTimeout(timeout);
    if (res.headersSent) return;
    try {
      const lineas = stdout.trim().split('\n');
      const jsonLine = lineas.reverse().find(l => l.trim().startsWith('{'));
      if (!jsonLine) throw new Error('Python no devolvió JSON válido.');
      res.json(JSON.parse(jsonLine));
    } catch (e) {
      res.status(500).json({
        ok: false,
        error: 'Error al parsear respuesta de Python: ' + e.message,
        stderr: stderr.slice(-300),
      });
    }
  });

  proceso.on('error', err => {
    terminado = true;
    clearTimeout(timeout);
    if (!res.headersSent)
      res.status(500).json({
        ok: false,
        error: `No se pudo iniciar Python: ${err.message}`,
      });
  });
});

/* ════════════════════════════════════════════════════
   UTILIDAD — Verificar hash (solo desarrollo)
   GET /api/dev/hash?texto=admin123
   Devuelve el hash para que puedas pegarlo en el JSON
═══════════════════════════════════════════════════ */
app.get('/api/dev/hash', (req, res) => {
  const texto = req.query.texto;
  if (!texto) return res.status(400).json({ error: 'Falta ?texto=...' });
  res.json({ texto, hash: hash(texto) });
});

/* ── Ruta raíz ──────────────────────────────────────── */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../fronend/public/login.html'));
});

/* ════════════════════════════════════════════════════
   ARRANQUE — Verifica y repara el admin-root
   Si el hash en el JSON no coincide con admin123,
   lo corrige automáticamente al iniciar el servidor.
═══════════════════════════════════════════════════ */
function verificarAdminRoot() {
  const admins = leerAdmins();
  const rootIdx = admins.findIndex(a => a.id === 'admin-root');
  const hashCorr = hash('admin123');

  if (rootIdx === -1) {
    // No existe → crearlo
    admins.unshift({
      id: 'admin-root',
      nombre: 'Administrador Principal',
      email: 'admin@rappi.pe',
      password: hashCorr,
      rol: 'admin',
      distrito: 'Miraflores',
      telefono: '+51 999 000 000',
      createdAt: new Date().toISOString(),
      activo: true,
      esRaiz: true,
    });
    guardarAdmins(admins);
    console.log('✅  Admin-root creado automáticamente.');
  } else if (admins[rootIdx].password !== hashCorr) {
    // Existe pero el hash está mal → corregirlo
    admins[rootIdx].password = hashCorr;
    guardarAdmins(admins);
    console.log('🔧  Hash del admin-root corregido automáticamente.');
  } else {
    console.log('✅  Admin-root verificado correctamente.');
  }
}

const PUERTO = 3000;
app.listen(PUERTO, () => {
  console.log(`\n==================================================`);
  console.log(`🛵  Rappi Lima corriendo en http://localhost:${PUERTO}`);
  console.log(`     Datos en: backend/data/`);
  console.log(`==================================================`);
  verificarAdminRoot();
  console.log(`==================================================\n`);
});