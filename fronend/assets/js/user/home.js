/**
 * home.js (user)
 * Lógica de la app de pedidos del usuario.
 * Depende de: session.js
 */

Session.requireAuth('usuario');

/* ── Data de restaurantes ────────────────────────────── */
const RESTAURANTES_DATA = [
    {
        id: 1, nombre: 'Bembos', cat: 'hamburguesas', emoji: '🍔', tiempo: 18, rating: 4.5, minimo: 25, desc: 'Hamburguesas artesanales', badge: 'Popular',
        menu: [
            {
                cat: 'Hamburguesas', items: [
                    { e: '🍔', n: 'Super Bembos', d: 'Doble carne, queso cheddar', p: 24.90 },
                    { e: '🍔', n: 'Bembos Clásica', d: 'Carne, queso, lechuga, tomate', p: 18.90 },
                    { e: '🌶️', n: 'Bembos Picante', d: 'Carne, jalapeños, salsa sriracha', p: 22.90 },
                ]
            },
            {
                cat: 'Bebidas', items: [
                    { e: '🥤', n: 'Inka Kola', d: '500ml bien fría', p: 5.90 },
                    { e: '🧃', n: 'Jugo natural', d: 'Naranja o maracuyá', p: 8.90 },
                ]
            },
        ]
    },
    {
        id: 2, nombre: 'KFC', cat: 'pollos', emoji: '🍗', tiempo: 22, rating: 4.3, minimo: 20, desc: 'El pollo original KFC',
        menu: [
            {
                cat: 'Pollos', items: [
                    { e: '🍗', n: 'Bucket Personal', d: '2 piezas + papas', p: 22.90 },
                    { e: '🍗', n: 'Bucket Familiar', d: '8 piezas + 2 papas', p: 74.90 },
                    { e: '🫓', n: 'Sandwich Crunch', d: 'Pollo crujiente, mayonesa', p: 17.90 },
                ]
            },
        ]
    },
    {
        id: 3, nombre: "McDonald's", cat: 'hamburguesas', emoji: '🍟', tiempo: 15, rating: 4.2, minimo: 18, desc: 'Me encanta', badge: 'Rápido',
        menu: [
            {
                cat: 'Clásicos', items: [
                    { e: '🍔', n: 'Big Mac', d: 'Doble carne, salsa especial', p: 22.90 },
                    { e: '🍟', n: 'McDouble', d: 'Doble carne, queso', p: 18.90 },
                ]
            },
        ]
    },
    {
        id: 4, nombre: 'Pizza Hut', cat: 'pizzas', emoji: '🍕', tiempo: 28, rating: 4.4, minimo: 30, desc: 'Pizzas al horno',
        menu: [
            {
                cat: 'Pizzas', items: [
                    { e: '🍕', n: 'Pepperoni Personal', d: '6 porciones, queso mozzarella', p: 26.90 },
                    { e: '🍕', n: 'Pizza Hawaiana', d: 'Jamón, piña, queso', p: 28.90 },
                ]
            },
        ]
    },
    {
        id: 5, nombre: 'Sushi Ito', cat: 'sushi', emoji: '🍱', tiempo: 35, rating: 4.7, minimo: 40, desc: 'Sushi fresco', badge: 'Top',
        menu: [
            {
                cat: 'Rolls', items: [
                    { e: '🍱', n: 'Roll California', d: 'Cangrejo, palta, pepino', p: 28.90 },
                    { e: '🍣', n: 'Roll Spicy Tuna', d: 'Atún picante, pepino', p: 32.90 },
                ]
            },
        ]
    },
    {
        id: 6, nombre: 'China Wok', cat: 'chifa', emoji: '🥡', tiempo: 25, rating: 4.3, minimo: 25, desc: 'Chifa auténtico',
        menu: [
            {
                cat: 'Platos', items: [
                    { e: '🥡', n: 'Arroz chaufa', d: 'Arroz frito al wok', p: 18.90 },
                    { e: '🍜', n: 'Tallarín saltado', d: 'Fideos wok con verduras', p: 19.90 },
                ]
            },
        ]
    },
    {
        id: 7, nombre: 'La Mar', cat: 'mariscos', emoji: '🦐', tiempo: 40, rating: 4.8, minimo: 50, desc: 'Cebichería premium', badge: 'Gourmet',
        menu: [
            {
                cat: 'Cebiches', items: [
                    { e: '🦐', n: 'Cebiche clásico', d: 'Corvina, ají amarillo, canchita', p: 42.90 },
                    { e: '🦑', n: 'Cebiche mixto', d: 'Mariscos variados', p: 48.90 },
                ]
            },
        ]
    },
];

/* ── Estado del carrito ──────────────────────────────── */
let cart = {};
let cartRestId = null;
let lastOrderId = null;
let currentTrackStep = 1;

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randF(a, b) { return (Math.random() * (b - a) + a).toFixed(2); }

/* ── Render restaurantes ─────────────────────────────── */
function renderRestaurants(list) {
    const grid = document.getElementById('rest-grid');
    if (!grid) return;
    const bg = {
        hamburguesas: '#FFF0E6', pizzas: '#FFF5E6', pollos: '#FFFBE6',
        sushi: '#E6F5FF', chifa: '#F5FFE6', mariscos: '#E6FFFA', gourmet: '#F5E6FF',
    };
    grid.innerHTML = list.map(r => `
    <div class="rest-card" onclick="openMenu(${r.id})">
      <div class="rest-thumb" style="background:${bg[r.cat] || '#F7F5F2'}">
        <span style="font-size:52px">${r.emoji}</span>
        ${r.badge ? `<div class="rest-badge">${r.badge}</div>` : ''}
      </div>
      <div class="rest-body">
        <div class="rest-name">${r.nombre}</div>
        <div class="rest-meta">
          <span class="rest-rating">⭐ ${r.rating}</span>
          <span>⏱ ${r.tiempo} min</span>
          <span>💳 Mín. S/ ${r.minimo}</span>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${r.desc}</div>
      </div>
    </div>`).join('');
}

/* ── Filtros ─────────────────────────────────────────── */
let currentCat = 'all';
let currentSearch = '';

function filterCat(cat, el) {
    currentCat = cat;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    applyFilter();
}
function filterRestaurants(q) {
    currentSearch = q.toLowerCase();
    applyFilter();
}
function applyFilter() {
    let list = RESTAURANTES_DATA;
    if (currentCat !== 'all') list = list.filter(r => r.cat === currentCat);
    if (currentSearch) list = list.filter(r =>
        r.nombre.toLowerCase().includes(currentSearch) ||
        r.desc.toLowerCase().includes(currentSearch));
    renderRestaurants(list);
}

/* ── Menú del restaurante ────────────────────────────── */
function openMenu(id) {
    const r = RESTAURANTES_DATA.find(x => x.id === id);
    const modal = document.getElementById('menu-modal-content');
    if (!modal) return;
    modal.innerHTML = `
    <div style="background:var(--orange-light);border-bottom:1px solid var(--orange-border);padding:24px;display:flex;align-items:center;gap:16px">
      <span style="font-size:52px">${r.emoji}</span>
      <div style="flex:1">
        <div style="font-size:20px;font-weight:900;color:var(--text)">${r.nombre}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">⭐ ${r.rating} · ⏱ ${r.tiempo} min · 💳 Mín. S/ ${r.minimo}</div>
      </div>
      <button onclick="closeOverlay('menu')" style="width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.1);border:none;font-size:16px;cursor:pointer">×</button>
    </div>
    ${r.menu.map(sec => `
      <div style="padding:16px 24px">
        <div style="font-size:14px;font-weight:800;color:var(--text);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">${sec.cat}</div>
        ${sec.items.map(item => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer"
            onclick="addToCart(${r.id},'${r.nombre}','${item.e}','${item.n.replace(/'/g, "\\'")}',${item.p})">
            <span style="font-size:28px">${item.e}</span>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;color:var(--text)">${item.n}</div>
              <div style="font-size:12px;color:var(--text2)">${item.d}</div>
            </div>
            <div style="font-size:14px;font-weight:800;color:var(--orange)">S/ ${item.p.toFixed(2)}</div>
            <button class="add-item-btn" onclick="event.stopPropagation();addToCart(${r.id},'${r.nombre}','${item.e}','${item.n.replace(/'/g, "\\'")}',${item.p})"
              style="background:var(--orange);color:#fff;border:none;width:30px;height:30px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>
          </div>`).join('')}
      </div>`).join('')}`;
    document.getElementById('overlay-menu')?.classList.add('open');
}

/* ── Carrito ─────────────────────────────────────────── */
function addToCart(restId, restName, emoji, name, price) {
    if (cartRestId && cartRestId !== restId) {
        if (!confirm('Tienes items de otro restaurante. ¿Vaciar carrito?')) return;
        cart = {}; cartRestId = null;
    }
    cartRestId = restId;
    const el = document.getElementById('cart-rest-name');
    if (el) el.textContent = restName;
    cart[name] = cart[name]
        ? { ...cart[name], qty: cart[name].qty + 1 }
        : { emoji, name, price, qty: 1 };
    renderCart();
    toast(`${emoji} ${name} agregado al carrito`);
}

function changeQty(key, delta) {
    if (!cart[key]) return;
    cart[key].qty += delta;
    if (cart[key].qty <= 0) delete cart[key];
    if (Object.keys(cart).length === 0) { cartRestId = null; }
    renderCart();
}

function renderCart() {
    const items = Object.entries(cart);
    const emptyEl = document.getElementById('cart-empty-state');
    const containerEl = document.getElementById('cart-items-container');
    const cartNavBtn = document.getElementById('cart-nav-btn');
    const countEl = document.getElementById('cart-nav-count');

    const totalQty = items.reduce((s, [, v]) => s + v.qty, 0);
    if (countEl) countEl.textContent = totalQty;

    if (items.length === 0) {
        if (emptyEl) emptyEl.style.display = '';
        if (containerEl) containerEl.style.display = 'none';
        if (cartNavBtn) cartNavBtn.style.display = 'none';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (containerEl) containerEl.style.display = '';
    if (cartNavBtn) cartNavBtn.style.display = '';

    const listEl = document.getElementById('cart-items-list');
    if (listEl) {
        listEl.innerHTML = items.map(([key, item]) => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">S/ ${(item.price * item.qty).toFixed(2)}</div>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty('${key}',-1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${key}',+1)">+</button>
        </div>
      </div>`).join('');
    }

    const subtotal = items.reduce((s, [, v]) => s + v.price * v.qty, 0);
    const envio = 3.50;
    const desc = subtotal > 60 ? 5 : 0;
    const subEl = document.getElementById('cart-subtotal');
    const descEl = document.getElementById('cart-desc');
    const totEl = document.getElementById('cart-total');
    if (subEl) subEl.textContent = `S/ ${subtotal.toFixed(2)}`;
    if (descEl) descEl.textContent = `-S/ ${desc.toFixed(2)}`;
    if (totEl) totEl.textContent = `S/ ${(subtotal + envio - desc).toFixed(2)}`;
}

/* ── Checkout ────────────────────────────────────────── */
function checkout() {
    if (Object.keys(cart).length === 0) { toast('Tu carrito está vacío'); return; }
    const dir = document.getElementById('input-dir')?.value;
    if (!dir?.trim()) { document.getElementById('input-dir')?.focus(); toast('Ingresa tu dirección'); return; }
    lastOrderId = `RPP-${rand(1000, 9999)}`;
    const el = document.getElementById('success-order-id');
    if (el) el.textContent = lastOrderId;
    cart = {}; cartRestId = null;
    renderCart();
    closeOverlay('menu');
    document.getElementById('overlay-success')?.classList.add('open');
}

/* ── Seguimiento ─────────────────────────────────────── */
const TRACK_STEPS = [
    { label: 'Pedido confirmado', sub: 'Restaurante recibió tu orden' },
    { label: 'Preparando tu pedido', sub: 'En la cocina con cariño' },
    { label: 'Repartidor en camino', sub: 'Dijkstra calculó la ruta óptima' },
    { label: 'Cerca de ti', sub: 'A menos de 500m' },
    { label: '¡Entregado!', sub: 'Buen provecho 🍽' },
];

function openTracking() {
    const idEl = document.getElementById('track-pedido-id');
    const dist = document.getElementById('tr-dist');
    const tiem = document.getElementById('tr-tiempo');
    const par = document.getElementById('tr-paradas');
    if (idEl) idEl.textContent = `Pedido ${lastOrderId || 'RPP-1234'}`;
    if (dist) dist.textContent = randF(1, 6) + ' km';
    if (tiem) tiem.textContent = rand(12, 40) + ' min';
    if (par) par.textContent = rand(4, 14);
    currentTrackStep = 1;
    renderTrackSteps();
    document.getElementById('overlay-tracking')?.classList.add('open');
    simulateTracking();
}

function renderTrackSteps() {
    const c = document.getElementById('track-steps');
    if (!c) return;
    c.innerHTML = TRACK_STEPS.map((s, i) => {
        const idx = i + 1;
        const done = idx < currentTrackStep;
        const active = idx === currentTrackStep;
        return `
      <div style="display:flex;gap:14px;margin-bottom:20px">
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:28px;height:28px;border-radius:50%;border:2.5px solid ${done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--border)'};
            background:${done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--bg3)'};
            display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;
            ${active ? 'animation:stepPulse 1.5s infinite' : ''}">
            ${done ? '✓' : idx}
          </div>
          ${i < TRACK_STEPS.length - 1 ? `<div style="width:2px;height:20px;background:${done ? 'var(--green)' : 'var(--border)'};margin:3px 0"></div>` : ''}
        </div>
        <div style="padding-top:4px">
          <div style="font-size:14px;font-weight:700;color:${active ? 'var(--orange)' : done ? 'var(--green)' : 'var(--text2)'}">${s.label}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">${s.sub}</div>
        </div>
      </div>`;
    }).join('');
}

function simulateTracking() {
    [3000, 5000, 7000, 9000].forEach((d, i) => {
        setTimeout(() => {
            currentTrackStep = i + 2;
            renderTrackSteps();
        }, d);
    });
}

/* ── Zona / dirección ────────────────────────────────── */
function updateZona() {
    const val = document.getElementById('sel-zona')?.value;
    const el = document.getElementById('zona-text');
    if (el && val) el.textContent = val + ', Lima';
}

/* ── Overlay utils ───────────────────────────────────── */
function closeOverlay(id) {
    document.getElementById('overlay-' + id)?.classList.remove('open');
}
function closeOnOverlay(e, id) {
    if (e.target === e.currentTarget) closeOverlay(id);
}

/* ── Toast ───────────────────────────────────────────── */
function toast(msg, dur = 2800) {
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

/* ── Nav usuario ─────────────────────────────────────── */
function updateNavUser() {
    const user = Session.current();
    const greet = document.getElementById('user-greeting');
    if (greet) {
        greet.textContent = `Hola, ${user?.nombre || 'Usuario'} 👋`;
        greet.style.display = '';
    }
}

function logout() { Session.logout(); }

/* ── Init ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    updateNavUser();
    renderRestaurants(RESTAURANTES_DATA);
});