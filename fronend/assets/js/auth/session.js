/**
 * session.js
 * Gestión de sesión y usuarios registrados.
 * Usa localStorage como "base de datos" del navegador.
 *
 * API pública:
 *   Session.register(data)   → { ok, error }
 *   Session.login(email, pw) → { ok, error }
 *   Session.logout()
 *   Session.current()        → usuario activo o null
 *   Session.isLogged()       → boolean
 *   Session.isAdmin()        → boolean
 *   Session.getAllUsers()     → array (solo admin)
 *   Session.deleteUser(id)   → void (solo admin)
 *   Session.requireAuth(rol) → redirige si no cumple rol
 */

const Session = (() => {

    /* ── Claves de almacenamiento ─────────────────────── */
    const KEY_USERS = 'rappi_users';
    const KEY_SESSION = 'rappi_session';

    /* ── Utilidades internas ──────────────────────────── */
    function _getUsers() {
        return JSON.parse(localStorage.getItem(KEY_USERS) || '[]');
    }
    function _saveUsers(users) {
        localStorage.setItem(KEY_USERS, JSON.stringify(users));
    }
    function _hashSimple(str) {
        /* Hash ligero (no criptográfico) solo para demo frontend */
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
        }
        return h.toString(16);
    }
    function _id() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /* ── Inicialización: crear admin por defecto ──────── */
    function _init() {
        const users = _getUsers();
        const adminExists = users.some(u => u.rol === 'admin');
        if (!adminExists) {
            users.push({
                id: 'admin-default',
                nombre: 'Administrador',
                email: 'admin@rappi.pe'.toLowerCase(),
                password: _hashSimple('admin123'),
                rol: 'admin',
                distrito: 'Miraflores',
                telefono: '+51 999 000 000',
                createdAt: new Date().toISOString(),
                activo: true,
            });
            _saveUsers(users);
        }
    }

    /* ── Registro ─────────────────────────────────────── */
    function register({ nombre, email, password, telefono, distrito, rol }) {
        const users = _getUsers();

        if (!nombre || !email || !password) {
            return { ok: false, error: 'Completa todos los campos obligatorios.' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { ok: false, error: 'El correo electrónico no es válido.' };
        }
        if (password.length < 6) {
            return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
        }
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { ok: false, error: 'Ya existe una cuenta con este correo.' };
        }

        const newUser = {
            id: _id(),
            nombre: nombre.trim(),
            email: email.toLowerCase().trim(),
            password: _hashSimple(password),
            rol: rol || 'usuario',
            distrito: distrito || 'Miraflores',
            telefono: telefono || '',
            createdAt: new Date().toISOString(),
            activo: true,
        };

        users.push(newUser);
        _saveUsers(users);
        return { ok: true, user: { ...newUser, password: undefined } };
    }

    /* ── Login ────────────────────────────────────────── */
    function login(email, password) {
        const users = _getUsers();
        const user = users.find(
            u => u.email.toLowerCase() === email.toLowerCase().trim()
                && u.password === _hashSimple(password)
        );
        if (!user) return { ok: false, error: 'Correo o contraseña incorrectos.' };
        if (!user.activo) return { ok: false, error: 'Tu cuenta está desactivada. Contacta al administrador.' };

        const sessionData = {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            distrito: user.distrito,
            loginAt: new Date().toISOString(),
        };
        localStorage.setItem(KEY_SESSION, JSON.stringify(sessionData));
        return { ok: true, user: sessionData };
    }

    /* ── Logout ───────────────────────────────────────── */
    function logout() {
        localStorage.removeItem(KEY_SESSION);
        window.location.href = '../public/login.html';
    }

    /* ── Sesión activa ────────────────────────────────── */
    function current() {
        return JSON.parse(localStorage.getItem(KEY_SESSION) || 'null');
    }
    function isLogged() { return current() !== null; }
    function isAdmin() { const u = current(); return u && u.rol === 'admin'; }

    /* ── Guard de ruta ────────────────────────────────── */
    function requireAuth(rol) {
        // Obtenemos dónde estamos parados actualmente
        const pathActual = window.location.pathname;

        if (!isLogged()) {
            // Si no está logueado y NO estamos ya en la página de login, redirige correctamente
            if (!pathActual.includes('login.html')) {
                // Si estás en /admin/dashboard.html, necesitas subir un nivel para buscar public
                window.location.href = '../public/login.html';
            }
            return;
        }

        if (rol === 'admin' && !isAdmin()) {
            // Si un usuario normal quiere entrar al admin, lo mandamos a su home
            window.location.href = '../user/home.html';
        }
    }

    /* ── CRUD de usuarios (solo admin) ───────────────── */
    function getAllUsers() {
        if (!isAdmin()) return [];
        return _getUsers().map(u => ({ ...u, password: undefined }));
    }

    function toggleUserStatus(id) {
        if (!isAdmin()) return;
        const users = _getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return;
        users[idx].activo = !users[idx].activo;
        _saveUsers(users);
    }

    function deleteUser(id) {
        if (!isAdmin()) return;
        const users = _getUsers().filter(u => u.id !== id);
        _saveUsers(users);
    }

    function updateUser(id, data) {
        if (!isAdmin()) return { ok: false };
        const users = _getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };
        users[idx] = { ...users[idx], ...data };
        _saveUsers(users);
        return { ok: true };
    }

    /* ── Inicializar al cargar ────────────────────────── */
    _init();

    return {
        register, login, logout, current, isLogged, isAdmin,
        requireAuth, getAllUsers, toggleUserStatus, deleteUser, updateUser
    };

})();