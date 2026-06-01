/**
 * session.js
 * Gestión de sesión — frontend.
 *
 * Los datos se guardan en el SERVIDOR (archivos JSON):
 *   backend/data/usuarios_admin_db.json
 *   backend/data/usuarios_db.json
 *
 * La sesión activa se guarda en sessionStorage del navegador
 * (se borra al cerrar la pestaña, no persiste entre navegadores).
 *
 * API pública (todas async excepto current/isLogged/isAdmin):
 *   Session.login(email, pw)         → Promise<{ ok, user, error }>
 *   Session.register(data)           → Promise<{ ok, user, error }>
 *   Session.registerAdmin(data)      → Promise<{ ok, user, error }>
 *   Session.logout()
 *   Session.current()                → usuario activo o null (sync)
 *   Session.isLogged()               → boolean (sync)
 *   Session.isAdmin()                → boolean (sync)
 *   Session.requireAuth(rol)         → redirige si no cumple (sync)
 *   Session.getAllUsers()            → Promise<array>
 *   Session.getAllAdmins()           → Promise<array>
 *   Session.toggleUserStatus(id)     → Promise<{ ok }>
 *   Session.deleteUser(id)           → Promise<{ ok }>
 *   Session.toggleAdminStatus(id)    → Promise<{ ok }>
 *   Session.deleteAdmin(id)          → Promise<{ ok }>
 */

const Session = (() => {

    const KEY_SESSION = 'rappi_session';

    /* ── Sesión activa (sessionStorage) ─────────────── */
    function current() { return JSON.parse(sessionStorage.getItem(KEY_SESSION) || 'null'); }
    function isLogged() { return current() !== null; }
    function isAdmin() { const u = current(); return u && u.rol === 'admin'; }

    function _saveSession(user) {
        sessionStorage.setItem(KEY_SESSION, JSON.stringify(user));
    }

    /* ── Guard de ruta (síncrono) ────────────────────── */
    function requireAuth(rol) {
        if (!isLogged()) {
            const depth = window.location.pathname.split('/').filter(Boolean).length;
            const prefix = depth > 1 ? '../' : '';
            if (!window.location.pathname.includes('login.html'))
                window.location.href = prefix + 'public/login.html';
            return;
        }
        if (rol === 'admin' && !isAdmin())
            window.location.href = '../user/home.html';
    }

    /* ── Logout ──────────────────────────────────────── */
    function logout() {
        sessionStorage.removeItem(KEY_SESSION);
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        const prefix = depth > 1 ? '../' : '';
        window.location.href = prefix + 'public/login.html';
    }

    /* ── Helper fetch ────────────────────────────────── */
    async function _post(url, body) {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return r.json();
    }
    async function _get(url) {
        const r = await fetch(url);
        return r.json();
    }
    async function _patch(url) {
        const r = await fetch(url, { method: 'PATCH' });
        return r.json();
    }
    async function _delete(url) {
        const r = await fetch(url, { method: 'DELETE' });
        return r.json();
    }

    /* ── LOGIN ───────────────────────────────────────── */
    async function login(email, password) {
        try {
            const data = await _post('/api/login', { email, password });
            if (data.ok) _saveSession(data.user);
            return data;
        } catch {
            return { ok: false, error: 'No se pudo conectar con el servidor.' };
        }
    }

    /* ── REGISTER usuario normal ─────────────────────── */
    async function register({ nombre, email, password, telefono, distrito }) {
        try {
            return await _post('/api/register', { nombre, email, password, telefono, distrito });
        } catch {
            return { ok: false, error: 'No se pudo conectar con el servidor.' };
        }
    }

    /* ── REGISTER admin (solo desde panel admin) ─────── */
    async function registerAdmin({ nombre, email, password, telefono, distrito }) {
        if (!isAdmin()) return { ok: false, error: 'Sin permisos.' };
        try {
            return await _post('/api/register-admin', { nombre, email, password, telefono, distrito });
        } catch {
            return { ok: false, error: 'No se pudo conectar con el servidor.' };
        }
    }

    /* ── CRUD usuarios ───────────────────────────────── */
    async function getAllUsers() {
        if (!isAdmin()) return [];
        return _get('/api/usuarios');
    }
    async function toggleUserStatus(id) {
        return _patch(`/api/usuarios/${id}/toggle`);
    }
    async function deleteUser(id) {
        return _delete(`/api/usuarios/${id}`);
    }

    /* ── CRUD admins ─────────────────────────────────── */
    async function getAllAdmins() {
        if (!isAdmin()) return [];
        return _get('/api/admins');
    }
    async function toggleAdminStatus(id) {
        return _patch(`/api/admins/${id}/toggle`);
    }
    async function deleteAdmin(id) {
        return _delete(`/api/admins/${id}`);
    }

    return {
        login, logout, register, registerAdmin,
        current, isLogged, isAdmin, requireAuth,
        getAllUsers, toggleUserStatus, deleteUser,
        getAllAdmins, toggleAdminStatus, deleteAdmin,
    };

})();