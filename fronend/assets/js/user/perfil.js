/**
 * perfil.js (user)
 * Lógica de la página de perfil del usuario.
 * Permite editar nombre, teléfono, distrito y cambiar contraseña.
 * Depende de: session.js
 */

Session.requireAuth('usuario');

/* ── Cargar datos del usuario ────────────────────────── */
function cargarPerfil() {
    const user = Session.current();
    if (!user) return;

    /* Avatar e info de cabecera */
    const initials = document.getElementById('avatar-initials');
    const name = document.getElementById('avatar-name');
    const email = document.getElementById('avatar-email');
    const rol = document.getElementById('avatar-rol');
    if (initials) initials.textContent = user.nombre.slice(0, 2).toUpperCase();
    if (name) name.textContent = user.nombre;
    if (email) email.textContent = user.email;
    if (rol) rol.textContent = user.rol === 'admin' ? '🔑 Administrador' : '👤 Usuario';

    /* Campos del formulario */
    setVal('inp-nombre', user.nombre);
    setVal('inp-email', user.email);
    setVal('inp-telefono', user.telefono || '');

    /* Distrito: seleccionar la opción correcta */
    const distSel = document.getElementById('inp-distrito');
    if (distSel && user.distrito) {
        const opt = [...distSel.options].find(o => o.value === user.distrito);
        if (opt) distSel.value = user.distrito;
    }

    /* Stats simuladas de pedidos */
    cargarStats(user.id);
}

function cargarStats(userId) {
    const stored = JSON.parse(localStorage.getItem('rappi_pedidos_' + userId) || 'null');
    const pedidos = stored || [];
    const entregados = pedidos.filter(p => p.estado === 'entregado');
    const gasto = entregados.reduce((s, p) => s + (p.total || 0), 0);

    setVal2('stat-total', pedidos.length || '—');
    setVal2('stat-entregados', entregados.length || '—');
    setVal2('stat-gasto', gasto > 0 ? `S/${gasto.toFixed(0)}` : '—');
}

/* ── Guardar datos personales ────────────────────────── */
function guardarDatos() {
    const nombre = document.getElementById('inp-nombre')?.value.trim();
    const telefono = document.getElementById('inp-telefono')?.value.trim();
    const distrito = document.getElementById('inp-distrito')?.value;

    if (!nombre) { showToast('El nombre no puede estar vacío'); return; }

    const user = Session.current();
    const result = Session.updateUser(user.id, { nombre, telefono, distrito });

    if (result.ok) {
        /* Actualizar sesión activa */
        const updated = { ...user, nombre, telefono, distrito };
        localStorage.setItem('rappi_session', JSON.stringify(updated));
        showAlert();
        cargarPerfil();
        showToast('✅ Cambios guardados');
    } else {
        showToast('Error al guardar: ' + result.error);
    }
}

function cancelarEdicion() {
    cargarPerfil();
    showToast('Edición cancelada');
}

/* ── Cambiar contraseña ──────────────────────────────── */
function cambiarPassword() {
    const actual = document.getElementById('inp-pass-actual')?.value;
    const nueva = document.getElementById('inp-pass-nueva')?.value;
    const confirm = document.getElementById('inp-pass-confirm')?.value;
    const errorEl = document.getElementById('pass-error');

    errorEl.style.display = 'none';

    if (!actual || !nueva || !confirm) {
        showPassError('Completa todos los campos de contraseña.');
        return;
    }
    if (nueva.length < 6) {
        showPassError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
    }
    if (nueva !== confirm) {
        showPassError('Las contraseñas no coinciden.');
        return;
    }

    /* Verificar contraseña actual haciendo login */
    const user = Session.current();
    const verify = Session.login(user.email, actual);
    if (!verify.ok) {
        showPassError('La contraseña actual es incorrecta.');
        return;
    }

    /* Actualizar con la nueva contraseña (session.js la hashea internamente) */
    const users = JSON.parse(localStorage.getItem('rappi_users') || '[]');
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
        /* Re-usar el hash interno de session.js */
        const tempResult = Session.login(user.email, actual); /* Verificado ya */
        /* Actualizar directamente usando el mismo hash */
        const h = hashSimple(nueva);
        users[idx].password = h;
        localStorage.setItem('rappi_users', JSON.stringify(users));
        showToast('🔑 Contraseña actualizada');
        document.getElementById('inp-pass-actual').value = '';
        document.getElementById('inp-pass-nueva').value = '';
        document.getElementById('inp-pass-confirm').value = '';
        updatePwBars('');
    }
}

/* Hash simple espejo del de session.js (mismo algoritmo) */
function hashSimple(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString(16);
}

/* Actualizar barras de fortaleza */
function updatePwBars(pw) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const colors = ['', '#FF4D6D', '#FFD166', '#2ECDA7', '#4D9FFF'];
    [1, 2, 3, 4].forEach(i => {
        const bar = document.getElementById('pb' + i);
        if (bar) bar.style.background = i <= score ? colors[score] : 'var(--border)';
    });
}

/* ── Helpers ─────────────────────────────────────────── */
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}
function setVal2(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
function showAlert() {
    const el = document.getElementById('alert-ok');
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}
function showPassError(msg) {
    const el = document.getElementById('pass-error');
    if (!el) return;
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
}
function showToast(msg, dur = 2800) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(10px)';
    }, dur);
}
function logout() { Session.logout(); }

/* ── Init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', cargarPerfil);