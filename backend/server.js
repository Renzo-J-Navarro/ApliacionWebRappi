const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../fronend')));

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

/* ── Ruta raíz ──────────────────────────────────────── */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../fronend/public/login.html'));
});

/* ── Arrancar servidor ──────────────────────────────── */
const PUERTO = 3000;
app.listen(PUERTO, () => {
  console.log(`\n==================================================`);
  console.log(`🛵  Rappi Lima corriendo en http://localhost:${PUERTO}`);
  console.log(`     Datos en: backend/data/`);
  console.log(`==================================================\n`);
});