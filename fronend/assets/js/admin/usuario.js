/**
 * usuario.js (admin)
 * Gestión de usuarios registrados desde el panel admin.
 * Depende de: session.js
 */

/* ── Guard: solo admin ──────────────────────────────── */
Session.requireAuth('admin');

/* ── Render de la tabla de usuarios ─────────────────── */
function renderUsuarios(filtro = '') {
    const users = Session.getAllUsers();
    const tbody = document.getElementById('tbody-usuarios');
    if (!tbody) return;

    const filtrados = users.filter(u =>
        u.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        u.email.toLowerCase().includes(filtro.toLowerCase()) ||
        u.rol.toLowerCase().includes(filtro.toLowerCase())
    );

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text3); padding:24px;">
      Sin resultados para "${filtro}"
    </td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(u => `
    <tr>
      <td style="font-family:var(--mono); color:var(--orange); font-size:11px">${u.id.slice(0, 10)}…</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:28px; height:28px; border-radius:50%; background:var(--orange-dim);
            display:flex; align-items:center; justify-content:center;
            font-size:11px; font-weight:700; color:var(--orange2); flex-shrink:0">
            ${u.nombre.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style="font-size:13px; font-weight:600">${u.nombre}</div>
            <div style="font-size:11px; color:var(--text3)">${u.telefono || '—'}</div>
          </div>
        </div>
      </td>
      <td style="font-size:12px">${u.email}</td>
      <td>
        <span class="chip ${u.rol === 'admin' ? 'chip-orange' : 'chip-blue'}">
          ${u.rol === 'admin' ? '🔑 Admin' : '👤 Usuario'}
        </span>
      </td>
      <td style="font-size:12px; color:var(--text2)">${u.distrito || '—'}</td>
      <td>${u.activo
            ? '<span class="chip chip-green">Activo</span>'
            : '<span class="chip chip-red">Inactivo</span>'}
      </td>
      <td style="font-size:11px; color:var(--text3); font-family:var(--mono)">
        ${new Date(u.createdAt).toLocaleDateString('es-PE')}
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="top-btn" style="padding:5px 10px; font-size:11px"
            onclick="toggleStatus('${u.id}')">
            ${u.activo ? '⏸ Desactivar' : '▶ Activar'}
          </button>
          ${u.rol !== 'admin' ? `
          <button class="top-btn" style="padding:5px 10px; font-size:11px; color:var(--red)"
            onclick="confirmarEliminar('${u.id}', '${u.nombre}')">
            🗑
          </button>` : ''}
        </div>
      </td>
    </tr>`).join('');

    /* Actualizar contador */
    const totalEl = document.getElementById('total-users');
    if (totalEl) totalEl.textContent = filtrados.length;
}

/* ── Acciones ────────────────────────────────────────── */
function toggleStatus(id) {
    Session.toggleUserStatus(id);
    renderUsuarios(document.getElementById('search-users')?.value || '');
    showToast('Estado del usuario actualizado ✓');
}

function confirmarEliminar(id, nombre) {
    document.getElementById('del-nombre').textContent = nombre;
    document.getElementById('del-id').value = id;
    document.getElementById('modal-delete').classList.add('open');
}

function eliminarUsuario() {
    const id = document.getElementById('del-id').value;
    Session.deleteUser(id);
    document.getElementById('modal-delete').classList.remove('open');
    renderUsuarios(document.getElementById('search-users')?.value || '');
    showToast('Usuario eliminado del sistema');
}

/* ── Filtro de búsqueda ──────────────────────────────── */
document.getElementById('search-users')?.addEventListener('input', function () {
    renderUsuarios(this.value);
});

/* ── Exportar CSV simple ─────────────────────────────── */
function exportarCSV() {
    const users = Session.getAllUsers();
    const header = ['ID', 'Nombre', 'Email', 'Rol', 'Distrito', 'Estado', 'Registro'].join(',');
    const rows = users.map(u => [
        u.id, `"${u.nombre}"`, u.email, u.rol,
        u.distrito || '', u.activo ? 'activo' : 'inactivo',
        new Date(u.createdAt).toLocaleDateString('es-PE')
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `usuarios_rappi_${Date.now()}.csv`;
    a.click();
    showToast('CSV exportado ✓');
}

/* ── Toast ───────────────────────────────────────────── */
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(10px)';
    }, 3000);
}

/* ── Init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => renderUsuarios());