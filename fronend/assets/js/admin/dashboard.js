/**
 * dashboard.js (admin)
 * Lógica del panel principal de administración.
 * Depende de: session.js
 */

Session.requireAuth('admin');

/* ── Constantes de datos simulados ─────────────────── */
const RESTAURANTES_LIST = ['Bembos', 'KFC', "McDonald's", 'Pizza Hut', 'Pardos Chicken', 'La Lucha', 'Norkys', 'Rockys'];
const DISTRITOS_LIST = ['Miraflores', 'San Isidro', 'Barranco', 'Surco', 'San Borja', 'La Molina'];
const ALGOS = ['Dijkstra', 'BFS', 'DFS'];
const ESTADOS = ['en_camino', 'entregado', 'cancelado'];

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randF(a, b) { return (Math.random() * (b - a) + a).toFixed(2); }
function randItem(arr) { return arr[rand(0, arr.length - 1)]; }

/* ── Dataset de pedidos ──────────────────────────────── */
let pedidos = Array.from({ length: 40 }, (_, i) => ({
    id: `RPP-${String(1000 + i).padStart(4, '0')}`,
    restaurante: `${randItem(RESTAURANTES_LIST)} (${randItem(DISTRITOS_LIST)})`,
    cliente: `Cliente #${rand(1, 1499)} (${randItem(DISTRITOS_LIST)})`,
    algoritmo: randItem(ALGOS),
    distancia: randF(0.5, 8),
    tiempo: rand(8, 45),
    costo: randF(2, 15),
    estado: randItem(ESTADOS),
}));

/* ── Log de actividad ────────────────────────────────── */
const LOGS_DATA = [];

function addLog(msg, tipo = 'info') {
    const t = new Date().toLocaleTimeString('es-PE');
    LOGS_DATA.unshift({ t, msg, tipo });
    renderActivityLog();
    renderFullLogs();
}

/* ── Render pedidos (dashboard) ──────────────────────── */
function renderPedidosDash() {
    const tb = document.getElementById('tbody-recientes');
    if (!tb) return;
    tb.innerHTML = pedidos.slice(0, 5).map(p => `
    <tr>
      <td style="font-family:var(--mono); color:var(--orange)">${p.id}</td>
      <td>${p.restaurante.split('(')[0].trim()}</td>
      <td><span class="chip chip-blue">${p.algoritmo}</span></td>
      <td>${p.tiempo} min</td>
      <td>${chipEstado(p.estado)}</td>
    </tr>`).join('');
}

/* ── Render pedidos completo ─────────────────────────── */
function renderPedidosFull() {
    const tb = document.getElementById('tbody-pedidos-full');
    if (!tb) return;
    tb.innerHTML = pedidos.map(p => `
    <tr>
      <td style="font-family:var(--mono); color:var(--orange)">${p.id}</td>
      <td style="font-size:12px">${p.restaurante}</td>
      <td style="font-size:12px">${p.cliente}</td>
      <td><span class="chip chip-blue">${p.algoritmo}</span></td>
      <td>${p.distancia} km</td>
      <td>${p.tiempo} min</td>
      <td>S/ ${p.costo}</td>
      <td>${chipEstado(p.estado)}</td>
      <td><button class="panel-action" onclick="cancelarPedido('${p.id}')">✕</button></td>
    </tr>`).join('');
}

function chipEstado(e) {
    const m = { en_camino: 'chip-yellow', entregado: 'chip-green', cancelado: 'chip-red' };
    const l = { en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };
    return `<span class="chip ${m[e] || 'chip-blue'}">${l[e] || e}</span>`;
}

function cancelarPedido(id) {
    pedidos = pedidos.map(p => p.id === id ? { ...p, estado: 'cancelado' } : p);
    addLog(`Pedido ${id} cancelado por admin`, 'err');
    renderPedidosFull();
}

/* ── Log de actividad (mini) ─────────────────────────── */
function renderActivityLog() {
    const c = document.getElementById('log-container');
    if (!c) return;
    const col = { info: 'var(--blue)', warn: 'var(--yellow)', ok: 'var(--green)', err: 'var(--red)' };
    c.innerHTML = LOGS_DATA.slice(0, 6).map(l => `
    <div class="log-item">
      <div class="log-dot" style="background:${col[l.tipo] || col.info}"></div>
      <div>
        <div class="log-text">${l.msg}</div>
        <div class="log-time">${l.t}</div>
      </div>
    </div>`).join('');
}

function renderFullLogs() {
    const c = document.getElementById('full-logs');
    if (!c) return;
    const col = { info: 'var(--blue)', warn: 'var(--yellow)', ok: 'var(--green)', err: 'var(--red)' };
    c.innerHTML = LOGS_DATA.slice(0, 50).map(l =>
        `<div style="color:${col[l.tipo] || col.info}; margin-bottom:2px">[${l.t}] ${l.msg}</div>`
    ).join('');
}

/* ── Mapa simulado ───────────────────────────────────── */
function buildMap() {
    const box = document.getElementById('map-box');
    if (!box) return;
    const colors = ['var(--orange)', 'var(--yellow)', 'var(--blue)', 'var(--green)'];
    let html = '';
    for (let i = 0; i < 40; i++) {
        const x = rand(5, 92), y = rand(5, 88), c = colors[rand(0, 3)], s = rand(6, 12);
        html += `<div style="position:absolute;left:${x}%;top:${y}%;width:${s}px;height:${s}px;
      border-radius:50%;background:${c};opacity:0.8;box-shadow:0 0 0 2px ${c}33"></div>`;
    }
    box.innerHTML = '<div class="map-grid"></div>' + html;
}

/* ── Simular pedido ──────────────────────────────────── */
function simularPedido() {
    const p = {
        id: `RPP-${rand(2000, 9999)}`,
        restaurante: `${randItem(RESTAURANTES_LIST)} (${randItem(DISTRITOS_LIST)})`,
        cliente: `Cliente #${rand(1, 1499)} (${randItem(DISTRITOS_LIST)})`,
        algoritmo: 'Dijkstra',
        distancia: randF(0.5, 8),
        tiempo: rand(8, 45),
        costo: randF(2, 15),
        estado: 'en_camino',
    };
    pedidos.unshift(p);
    const el = document.getElementById('stat-pedidos');
    if (el) el.textContent = parseInt(el.textContent) + 1;
    addLog(`Nuevo pedido ${p.id}: ${p.restaurante.split('(')[0].trim()} → ${p.cliente}`, 'ok');
    renderPedidosDash();
}

/* ── Sidebar / navegación ────────────────────────────── */
function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    document.getElementById('main')?.classList.toggle('shifted');
}

function showPage(name, el) {
    document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
    const page = document.getElementById('page-' + name);
    if (page) page.style.display = '';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    const bc = document.getElementById('breadcrumb-text');
    if (bc) bc.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    if (name === 'pedidos') renderPedidosFull();
    if (name === 'restaurantes') renderRestaurantes();
    if (name === 'repartidores') renderRepartidores();
    if (name === 'zonas') renderZonas();
    if (name === 'logs') renderFullLogs();
}

/* ── Restaurantes ────────────────────────────────────── */
const RESTS_DATA = RESTAURANTES_LIST.map((n, i) => ({
    id: i, nombre: n, distrito: randItem(DISTRITOS_LIST),
    demanda: randItem(['muy_alta', 'alta', 'media', 'baja']), pedidos: rand(10, 80),
}));
function renderRestaurantes() {
    const tb = document.getElementById('tbody-rest');
    if (!tb) return;
    const demCol = { muy_alta: 'chip-red', alta: 'chip-orange', media: 'chip-yellow', baja: 'chip-green' };
    tb.innerHTML = RESTS_DATA.map(r => `
    <tr>
      <td style="font-family:var(--mono)">${r.id}</td>
      <td>${r.nombre}</td><td>${r.distrito}</td>
      <td><span class="chip ${demCol[r.demanda] || 'chip-blue'}">${r.demanda}</span></td>
      <td>${r.pedidos}/h</td>
      <td><span class="chip chip-green">Activo</span></td>
    </tr>`).join('');
}

/* ── Repartidores ────────────────────────────────────── */
const REPS_DATA = ['Carlos Quispe', 'Luis Mamani', 'Juan Flores', 'Pedro Torres', 'Ana García'].map((n, i) => ({
    id: i + 1, nombre: n, zona: randItem(DISTRITOS_LIST),
    pedidos: rand(5, 30), rating: (rand(35, 50) / 10).toFixed(1),
    estado: randItem(['en_camino', 'disponible', 'inactivo']),
}));
function renderRepartidores() {
    const tb = document.getElementById('tbody-reps');
    if (!tb) return;
    const stCol = { en_camino: 'chip-yellow', disponible: 'chip-green', inactivo: 'chip-red' };
    tb.innerHTML = REPS_DATA.map(r => `
    <tr>
      <td style="font-family:var(--mono)">#${r.id}</td>
      <td>${r.nombre}</td><td>${r.zona}</td>
      <td>${r.pedidos}</td><td>⭐ ${r.rating}</td>
      <td><span class="chip ${stCol[r.estado] || 'chip-blue'}">${r.estado.replace('_', ' ')}</span></td>
    </tr>`).join('');
}

/* ── Zonas ───────────────────────────────────────────── */
const ZONAS_DATA = [
    ['Miraflores', -12.1191, -77.0282, 'muy_alta'], ['San Isidro', -12.0975, -77.0368, 'muy_alta'],
    ['Barranco', -12.1453, -77.0217, 'alta'], ['Surco', -12.1470, -76.9997, 'alta'],
    ['La Molina', -12.0835, -76.9446, 'media'], ['Lince', -12.0850, -77.0367, 'media'],
];
function renderZonas() {
    const tb = document.getElementById('tbody-zonas');
    if (!tb) return;
    const demCol = { muy_alta: 'chip-red', alta: 'chip-orange', media: 'chip-yellow', baja: 'chip-green' };
    tb.innerHTML = ZONAS_DATA.map(z => `
    <tr>
      <td>${z[0]}</td>
      <td style="font-family:var(--mono)">${z[1]}</td>
      <td style="font-family:var(--mono)">${z[2]}</td>
      <td><span class="chip ${demCol[z[3]] || 'chip-blue'}">${z[3]}</span></td>
    </tr>`).join('');
}

/* ── Modal utils ─────────────────────────────────────── */
function openModal(id) { document.getElementById('modal-' + id)?.classList.add('open'); }
function closeModal(id) { document.getElementById('modal-' + id)?.classList.remove('open'); }
function closeOnOverlay(e, id) { if (e.target === e.currentTarget) closeModal(id); }

/* ── Toast ───────────────────────────────────────────── */
function toast(msg, dur = 3000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(10px)';
    }, dur);
}

/* ── Logout ──────────────────────────────────────────── */
function logout() { Session.logout(); }

/* ── Actualizar info del usuario en sidebar ──────────── */
function updateSidebarUser() {
    const user = Session.current();
    const nameEl = document.getElementById('sidebar-user-name');
    const rolEl = document.getElementById('sidebar-user-rol');
    const avatEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user?.nombre || 'Admin';
    if (rolEl) rolEl.textContent = user?.rol || 'Super Usuario';
    if (avatEl) avatEl.textContent = (user?.nombre || 'AD').slice(0, 2).toUpperCase();
}

/* ── Init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    updateSidebarUser();
    addLog('Sistema Rappi Lima iniciado correctamente', 'ok');
    addLog('Dataset cargado: 1500 nodos, ~8400 aristas', 'info');
    addLog('Dijkstra activo como algoritmo principal', 'info');
    renderPedidosDash();
    buildMap();

    /* Actualización en vivo cada 5s */
    setInterval(() => {
        const eventos = [
            ['Dijkstra calculó ruta en ' + rand(20, 80) + 'ms', 'ok'],
            [`Pedido RPP-${rand(1000, 9999)} entregado en ${rand(15, 40)} min`, 'ok'],
            [`Tráfico alto detectado en ${randItem(DISTRITOS_LIST)}`, 'warn'],
            [`Repartidor #${rand(1, 50)} disponible en ${randItem(DISTRITOS_LIST)}`, 'info'],
        ];
        const [msg, tipo] = randItem(eventos);
        addLog(msg, tipo);
        const s = document.getElementById('stat-entregados');
        if (s) s.textContent = (parseInt(s.textContent.replace(',', '')) + rand(0, 2)).toLocaleString();
    }, 5000);
});