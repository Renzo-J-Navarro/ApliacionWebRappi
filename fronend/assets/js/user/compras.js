/**
 * compras.js (user)
 * Lógica del historial de pedidos del usuario.
 * Depende de: session.js
 */

Session.requireAuth('usuario');

/* ── Datos simulados de pedidos ──────────────────────── */
const RESTAURANTES_SAMPLE = ['Bembos', 'KFC', "McDonald's", 'Pizza Hut', 'Sushi Ito', 'China Wok', 'La Mar'];
const DISTRITOS_SAMPLE = ['Miraflores', 'San Isidro', 'Barranco', 'Surco', 'San Borja'];
const ALGOS = ['Dijkstra', 'BFS', 'DFS'];
const ESTADOS_LISTA = ['entregado', 'entregado', 'entregado', 'en_camino', 'cancelado'];

function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rndF(a, b) { return (Math.random() * (b - a) + a).toFixed(2); }
function rndItem(arr) { return arr[rnd(0, arr.length - 1)]; }

function makeDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* Genera pedidos ficticios vinculados al usuario actual */
function generarPedidos() {
    const key = 'rappi_pedidos_' + Session.current()?.id;
    let stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored) return stored;

    const cantidad = rnd(6, 14);
    const lista = Array.from({ length: cantidad }, (_, i) => {
        const rest = rndItem(RESTAURANTES_SAMPLE);
        const estado = rndItem(ESTADOS_LISTA);
        const items = Array.from({ length: rnd(1, 4) }, (__, j) => ({
            emoji: ['🍔', '🍕', '🍗', '🍱', '🥡', '🦐', '🍟', '🌮'][rnd(0, 7)],
            nombre: ['Combo #' + rnd(1, 5), 'Especial del día', 'Plato ' + ['Grande', 'Mediano', 'Personal'][rnd(0, 2)], 'Extra ' + ['Queso', 'Papas', 'Refresco'][rnd(0, 2)]][rnd(0, 3)],
            cantidad: rnd(1, 3),
            precio: parseFloat(rndF(8, 45)),
        }));
        const subtotal = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
        return {
            id: `RPP-${rnd(1000, 9999)}`,
            restaurante: `${rest} (${rndItem(DISTRITOS_SAMPLE)})`,
            algoritmo: rndItem(ALGOS),
            estado,
            fecha: makeDate(rnd(0, 90)),
            distancia: rndF(0.8, 7),
            tiempo: rnd(12, 50),
            items,
            subtotal: parseFloat(subtotal.toFixed(2)),
            envio: 3.50,
            descuento: subtotal > 60 ? 5 : 0,
            total: parseFloat((subtotal + 3.50 - (subtotal > 60 ? 5 : 0)).toFixed(2)),
        };
    });

    localStorage.setItem(key, JSON.stringify(lista));
    return lista;
}

/* ── Estado ──────────────────────────────────────────── */
let todosLosPedidos = [];
let filtroActivo = 'todos';

/* ── Render de la lista ──────────────────────────────── */
function renderPedidos() {
    const container = document.getElementById('pedidos-container');
    if (!container) return;

    const lista = filtroActivo === 'todos'
        ? todosLosPedidos
        : todosLosPedidos.filter(p => p.estado === filtroActivo);

    if (lista.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <span class="icon">📦</span>
        <p>No tienes pedidos ${filtroActivo === 'todos' ? 'aún' : 'con este estado'}.</p>
        <a href="home.html">
          <button class="checkout-btn" style="max-width:220px">🍔 Pedir ahora</button>
        </a>
      </div>`;
        return;
    }

    container.innerHTML = lista.map(p => `
    <div class="pedido-card" id="card-${p.id}">
      <div class="pedido-header" onclick="toggleDetalle('${p.id}')">
        <div>
          <div class="pedido-id">${p.id}</div>
          <div class="pedido-rest">${p.restaurante}</div>
          <div class="pedido-fecha">${p.fecha} · ${p.tiempo} min · ${p.distancia} km</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <span class="estado-chip estado-${p.estado}">
            ${{ entregado: '✅', en_camino: '🛵', cancelado: '❌' }[p.estado]}
            ${{ entregado: 'Entregado', en_camino: 'En camino', cancelado: 'Cancelado' }[p.estado]}
          </span>
          <span style="font-size:14px;font-weight:900;color:var(--orange)">S/ ${p.total.toFixed(2)}</span>
          <span style="font-size:11px;color:var(--text3)">▾ Ver detalle</span>
        </div>
      </div>
      <div class="pedido-body" id="body-${p.id}">
        <!-- Algoritmo usado -->
        <div style="margin-bottom:12px;">
          <span class="algo-tag">⚡ ${p.algoritmo}</span>
          <span style="font-size:12px;color:var(--text3);margin-left:8px;">Ruta de ${p.distancia} km en ${p.tiempo} min</span>
        </div>

        <!-- Items -->
        ${p.items.map(it => `
          <div class="item-row">
            <span class="item-name">${it.emoji} ${it.nombre} × ${it.cantidad}</span>
            <span class="item-price">S/ ${(it.precio * it.cantidad).toFixed(2)}</span>
          </div>`).join('')}

        <!-- Totales -->
        <div class="pedido-totals">
          <div class="total-row"><span>Subtotal</span><span>S/ ${p.subtotal.toFixed(2)}</span></div>
          <div class="total-row"><span>Envío</span><span>S/ ${p.envio.toFixed(2)}</span></div>
          ${p.descuento > 0 ? `<div class="total-row" style="color:var(--green)"><span>Descuento</span><span>-S/ ${p.descuento.toFixed(2)}</span></div>` : ''}
          <div class="total-row bold"><span>Total pagado</span><span>S/ ${p.total.toFixed(2)}</span></div>
        </div>

        <!-- Acciones -->
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
          ${p.estado === 'entregado' ? `
            <button class="checkout-btn" style="max-width:180px;padding:10px;"
              onclick="repetirPedido('${p.id}')">🔁 Repetir pedido</button>` : ''}
          ${p.estado === 'en_camino' ? `
            <button class="checkout-btn" style="max-width:180px;padding:10px;"
              onclick="verSeguimiento('${p.id}')">📍 Ver seguimiento</button>` : ''}
          ${p.estado !== 'cancelado' ? `
            <button style="background:none;border:1.5px solid var(--border);color:var(--text2);
              border-radius:var(--r);padding:10px 18px;font-family:var(--font);
              font-size:13px;font-weight:600;cursor:pointer;"
              onclick="calificarPedido('${p.id}')">⭐ Calificar</button>` : ''}
        </div>
      </div>
    </div>`).join('');
}

/* ── Toggle detalle ──────────────────────────────────── */
function toggleDetalle(id) {
    const body = document.getElementById('body-' + id);
    if (!body) return;
    body.classList.toggle('open');
}

/* ── Filtrar ─────────────────────────────────────────── */
function filtrar(estado, el) {
    filtroActivo = estado;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    renderPedidos();
}

/* ── Acciones ────────────────────────────────────────── */
function repetirPedido(id) {
    showToast('Redirigiendo al restaurante... 🛵');
    setTimeout(() => window.location.href = 'home.html', 1000);
}

function verSeguimiento(id) {
    showToast('Cargando seguimiento en tiempo real... 📍');
}

function calificarPedido(id) {
    showToast('Función de calificación próximamente ⭐');
}

/* ── Toast ───────────────────────────────────────────── */
function showToast(msg, dur = 2800) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(20px)';
    }, dur);
}

/* ── Init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    todosLosPedidos = generarPedidos();

    /* Actualizar saludo en navbar */
    const greet = document.getElementById('user-greeting');
    const user = Session.current();
    if (greet && user) greet.textContent = `Hola, ${user.nombre} 👋`;

    renderPedidos();
});

function logout() { Session.logout(); }