/**
 * ============================================================
 *  SERVER.JS — Backend Rappi Lima
 *  Node.js + Express + bcrypt + JWT
 *  Puerto: 3000
 * ============================================================
 *
 *  RUTAS DISPONIBLES:
 *  ─────────────────────────────────────────────────────────
 *  POST   /api/auth/login          → Iniciar sesión
 *  POST   /api/auth/register       → Registrar usuario
 *
 *  GET    /api/usuarios            → Listar todos [admin]
 *  GET    /api/usuarios/:id        → Ver uno     [admin | propio]
 *  PUT    /api/usuarios/:id        → Editar       [admin | propio]
 *  PATCH  /api/usuarios/:id/estado → Activar/desactivar [admin]
 *  DELETE /api/usuarios/:id        → Eliminar     [admin]
 *
 *  POST   /api/admin/crear-admin   → Crear admin  [superadmin]
 *
 *  GET    /api/ping                → Health check  [público]
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

/* ── Configuración ────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rappi_lima_secret_2026_cambia_esto_en_produccion';
const SALT_ROUNDS = 10;
const DB_PATH = path.join(__dirname, 'data', 'usuarios.json');

/* ── Credenciales del super-admin principal ───────────────── */
/*    ⚠ SOLO ESTE USUARIO PUEDE CREAR OTROS ADMINS            */
const SUPERADMIN = {
    email: 'superadmin@rappi.pe',
    password: 'Rappi@2026!',          // Cámbiala antes de desplegar
};

/* ════════════════════════════════════════════════════════════
   MIDDLEWARES
═════════════════════════════════════════════════════════════*/
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500',
        'http://localhost:3000', 'null'],   // "null" = apertura directa de archivo HTML
    credentials: true,
}));

/* Servir el frontend estático */
app.use(express.static(path.join(__dirname)));

/* ════════════════════════════════════════════════════════════
   UTILIDADES DE BASE DE DATOS (archivo JSON)
═════════════════════════════════════════════════════════════*/

/** Lee usuarios.json y devuelve el array */
function leerDB() {
    if (!fs.existsSync(DB_PATH)) return [];
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch {
        return [];
    }
}

/** Sobreescribe usuarios.json con el array recibido */
function guardarDB(usuarios) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(usuarios, null, 2), 'utf-8');
}

/** Genera un ID único */
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Quita el campo password antes de enviar al cliente */
function sanitizar(usuario) {
    const { password, ...safe } = usuario;
    return safe;
}

/* ════════════════════════════════════════════════════════════
   MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN
═════════════════════════════════════════════════════════════*/

/**
 * verificarToken
 * Lee el header Authorization: Bearer <token>
 * Si es válido, inyecta req.usuario con el payload del JWT
 */
function verificarToken(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ ok: false, msg: 'Token requerido. Inicia sesión primero.' });
    }

    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ ok: false, msg: 'Token inválido o expirado.' });
    }
}

/**
 * soloAdmin
 * Úsalo después de verificarToken.
 * Permite paso solo a roles 'admin' y 'superadmin'
 */
function soloAdmin(req, res, next) {
    if (req.usuario.rol === 'admin' || req.usuario.rol === 'superadmin') {
        return next();
    }
    return res.status(403).json({ ok: false, msg: 'Acceso restringido a administradores.' });
}

/**
 * soloSuperAdmin
 * Solo el super-admin principal puede crear otros admins
 */
function soloSuperAdmin(req, res, next) {
    if (req.usuario.rol === 'superadmin') {
        return next();
    }
    return res.status(403).json({ ok: false, msg: 'Acción reservada para el super-administrador.' });
}

/* ════════════════════════════════════════════════════════════
   INICIALIZACIÓN — crear super-admin si no existe
═════════════════════════════════════════════════════════════*/
async function inicializarSuperAdmin() {
    const usuarios = leerDB();
    const existe = usuarios.some(u => u.rol === 'superadmin');

    if (!existe) {
        const hash = await bcrypt.hash(SUPERADMIN.password, SALT_ROUNDS);
        usuarios.push({
            id: 'superadmin-principal',
            nombre: 'Super Administrador',
            email: SUPERADMIN.email,
            password: hash,
            rol: 'superadmin',
            distrito: 'Miraflores',
            telefono: '+51 999 000 000',
            activo: true,
            createdAt: new Date().toISOString(),
        });
        guardarDB(usuarios);
        console.log('\n✅ Super-admin creado automáticamente');
        console.log(`   Email   : ${SUPERADMIN.email}`);
        console.log(`   Password: ${SUPERADMIN.password}`);
        console.log('   ⚠ Cambia la contraseña antes de desplegar\n');
    }
}

/* ════════════════════════════════════════════════════════════
   RUTAS — AUTH
═════════════════════════════════════════════════════════════*/

/**
 * POST /api/auth/register
 * Registra un nuevo usuario con rol "usuario" (cliente)
 *
 * Body: { nombre, email, password, telefono?, distrito? }
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombre, email, password, telefono = '', distrito = 'Miraflores' } = req.body;

        /* ── Validaciones básicas ── */
        if (!nombre || !email || !password) {
            return res.status(400).json({ ok: false, msg: 'Nombre, email y contraseña son obligatorios.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ ok: false, msg: 'El correo electrónico no es válido.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ ok: false, msg: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const usuarios = leerDB();

        /* ── Verificar correo duplicado ── */
        if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(409).json({ ok: false, msg: 'Este correo ya está registrado.' });
        }

        /* ── Hash de contraseña ── */
        const hash = await bcrypt.hash(password, SALT_ROUNDS);

        const nuevoUsuario = {
            id: generarId(),
            nombre: nombre.trim(),
            email: email.toLowerCase().trim(),
            password: hash,
            rol: 'usuario',       // registro público → siempre usuario
            distrito: distrito.trim(),
            telefono: telefono.trim(),
            activo: true,
            createdAt: new Date().toISOString(),
        };

        usuarios.push(nuevoUsuario);
        guardarDB(usuarios);

        console.log(`[REGISTRO] Nuevo usuario: ${nuevoUsuario.email} (${nuevoUsuario.rol})`);

        return res.status(201).json({
            ok: true,
            msg: `¡Bienvenido a Rappi, ${nuevoUsuario.nombre}! Cuenta creada correctamente.`,
            usuario: sanitizar(nuevoUsuario),
        });

    } catch (err) {
        console.error('[ERROR /register]', err);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor.' });
    }
});

/**
 * POST /api/auth/login
 * Inicia sesión y devuelve un JWT
 *
 * Body: { email, password }
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ ok: false, msg: 'Email y contraseña son requeridos.' });
        }

        const usuarios = leerDB();
        const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

        /* ── Usuario no encontrado ── */
        if (!usuario) {
            return res.status(401).json({ ok: false, msg: 'Correo o contraseña incorrectos.' });
        }

        /* ── Cuenta desactivada ── */
        if (!usuario.activo) {
            return res.status(403).json({ ok: false, msg: 'Tu cuenta está desactivada. Contacta al administrador.' });
        }

        /* ── Verificar contraseña ── */
        const passwordOk = await bcrypt.compare(password, usuario.password);
        if (!passwordOk) {
            return res.status(401).json({ ok: false, msg: 'Correo o contraseña incorrectos.' });
        }

        /* ── Generar JWT (expira en 8 horas) ── */
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        console.log(`[LOGIN] ${usuario.email} (${usuario.rol})`);

        return res.json({
            ok: true,
            msg: `¡Bienvenido, ${usuario.nombre}!`,
            token,
            usuario: sanitizar(usuario),
        });

    } catch (err) {
        console.error('[ERROR /login]', err);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor.' });
    }
});

/* ════════════════════════════════════════════════════════════
   RUTAS — USUARIOS  (requieren token)
═════════════════════════════════════════════════════════════*/

/**
 * GET /api/usuarios
 * Lista todos los usuarios — solo admin / superadmin
 */
app.get('/api/usuarios', verificarToken, soloAdmin, (req, res) => {
    const usuarios = leerDB().map(sanitizar);
    return res.json({ ok: true, total: usuarios.length, usuarios });
});

/**
 * GET /api/usuarios/:id
 * Ver un usuario — admin puede ver cualquiera, usuario solo el propio
 */
app.get('/api/usuarios/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const esAdmin = ['admin', 'superadmin'].includes(req.usuario.rol);

    /* Solo puede ver su propio perfil si no es admin */
    if (!esAdmin && req.usuario.id !== id) {
        return res.status(403).json({ ok: false, msg: 'No tienes permiso para ver este usuario.' });
    }

    const usuario = leerDB().find(u => u.id === id);
    if (!usuario) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado.' });

    return res.json({ ok: true, usuario: sanitizar(usuario) });
});

/**
 * PUT /api/usuarios/:id
 * Editar datos de un usuario — admin edita cualquiera, usuario edita solo el propio
 *
 * Body: { nombre?, telefono?, distrito? }
 */
app.put('/api/usuarios/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const esAdmin = ['admin', 'superadmin'].includes(req.usuario.rol);

        if (!esAdmin && req.usuario.id !== id) {
            return res.status(403).json({ ok: false, msg: 'No puedes editar este usuario.' });
        }

        const usuarios = leerDB();
        const idx = usuarios.findIndex(u => u.id === id);
        if (idx === -1) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado.' });

        const { nombre, telefono, distrito, password } = req.body;

        if (nombre) usuarios[idx].nombre = nombre.trim();
        if (telefono) usuarios[idx].telefono = telefono.trim();
        if (distrito) usuarios[idx].distrito = distrito.trim();

        /* Cambio de contraseña (solo el propio usuario o admin) */
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ ok: false, msg: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }
            usuarios[idx].password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        usuarios[idx].updatedAt = new Date().toISOString();
        guardarDB(usuarios);

        return res.json({ ok: true, msg: 'Usuario actualizado.', usuario: sanitizar(usuarios[idx]) });

    } catch (err) {
        console.error('[ERROR PUT /usuarios]', err);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor.' });
    }
});

/**
 * PATCH /api/usuarios/:id/estado
 * Activar o desactivar un usuario — solo admin
 * El super-admin no puede ser desactivado
 */
app.patch('/api/usuarios/:id/estado', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;

    const usuarios = leerDB();
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado.' });

    /* Proteger al super-admin */
    if (usuarios[idx].rol === 'superadmin') {
        return res.status(403).json({ ok: false, msg: 'El super-admin no puede ser desactivado.' });
    }

    usuarios[idx].activo = !usuarios[idx].activo;
    guardarDB(usuarios);

    const estado = usuarios[idx].activo ? 'activado' : 'desactivado';
    console.log(`[ESTADO] ${usuarios[idx].email} → ${estado}`);

    return res.json({
        ok: true,
        msg: `Usuario ${estado} correctamente.`,
        activo: usuarios[idx].activo,
    });
});

/**
 * DELETE /api/usuarios/:id
 * Eliminar un usuario — solo admin
 * No se puede eliminar al super-admin ni a sí mismo
 */
app.delete('/api/usuarios/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;

    /* No puede eliminarse a sí mismo */
    if (req.usuario.id === id) {
        return res.status(400).json({ ok: false, msg: 'No puedes eliminar tu propia cuenta.' });
    }

    let usuarios = leerDB();
    const target = usuarios.find(u => u.id === id);
    if (!target) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado.' });

    /* Proteger al super-admin */
    if (target.rol === 'superadmin') {
        return res.status(403).json({ ok: false, msg: 'El super-admin no puede ser eliminado.' });
    }

    usuarios = usuarios.filter(u => u.id !== id);
    guardarDB(usuarios);

    console.log(`[ELIMINADO] ${target.email}`);
    return res.json({ ok: true, msg: `Usuario "${target.nombre}" eliminado.` });
});

/* ════════════════════════════════════════════════════════════
   RUTAS — ADMIN ESPECIALES
═════════════════════════════════════════════════════════════*/

/**
 * POST /api/admin/crear-admin
 * Crea un nuevo administrador — SOLO super-admin puede hacerlo
 *
 * Body: { nombre, email, password, telefono?, distrito? }
 */
app.post('/api/admin/crear-admin', verificarToken, soloSuperAdmin, async (req, res) => {
    try {
        const { nombre, email, password, telefono = '', distrito = 'Miraflores' } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ ok: false, msg: 'Nombre, email y contraseña son obligatorios.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ ok: false, msg: 'La contraseña de un admin debe tener al menos 8 caracteres.' });
        }

        const usuarios = leerDB();

        if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(409).json({ ok: false, msg: 'Este correo ya está en uso.' });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);

        const nuevoAdmin = {
            id: generarId(),
            nombre: nombre.trim(),
            email: email.toLowerCase().trim(),
            password: hash,
            rol: 'admin',
            distrito: distrito.trim(),
            telefono: telefono.trim(),
            activo: true,
            createdAt: new Date().toISOString(),
            creadoPor: req.usuario.email,
        };

        usuarios.push(nuevoAdmin);
        guardarDB(usuarios);

        console.log(`[ADMIN CREADO] ${nuevoAdmin.email} por ${req.usuario.email}`);

        return res.status(201).json({
            ok: true,
            msg: `Administrador "${nuevoAdmin.nombre}" creado correctamente.`,
            usuario: sanitizar(nuevoAdmin),
        });

    } catch (err) {
        console.error('[ERROR /crear-admin]', err);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor.' });
    }
});

/* ════════════════════════════════════════════════════════════
   RUTAS — SALUD DEL SERVIDOR
═════════════════════════════════════════════════════════════*/

app.get('/api/ping', (req, res) => {
    const usuarios = leerDB();
    return res.json({
        ok: true,
        msg: '🛵 Servidor Rappi Lima funcionando',
        uptime: `${Math.floor(process.uptime())}s`,
        usuarios: usuarios.length,
        timestamp: new Date().toISOString(),
    });
});

/* Cualquier otra ruta → index.html (SPA fallback) */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ════════════════════════════════════════════════════════════
   ARRANQUE
═════════════════════════════════════════════════════════════*/
inicializarSuperAdmin().then(() => {
    app.listen(PORT, () => {
        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║   🛵  RAPPI LIMA — Servidor Backend      ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log(`\n  URL local : http://localhost:${PORT}`);
        console.log(`  Frontend  : http://localhost:${PORT}/index.html`);
        console.log('\n  RUTAS DE LA API:');
        console.log('  POST  /api/auth/login');
        console.log('  POST  /api/auth/register');
        console.log('  GET   /api/usuarios          [admin]');
        console.log('  POST  /api/admin/crear-admin [superadmin]');
        console.log('  GET   /api/ping');
        console.log('\n  Super-admin: superadmin@rappi.pe');
        console.log('─────────────────────────────────────────\n');
    });
});