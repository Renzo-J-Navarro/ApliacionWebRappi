/**
 * register.js
 * Lógica del formulario de registro de nuevos usuarios.
 * Depende de: session.js
 */

document.addEventListener('DOMContentLoaded', () => {

    if (Session.isLogged()) {
        window.location.href = Session.isAdmin() ? '/admin/dashboard.html' : '/user/home.html';
        return;
    }

    const form = document.getElementById('register-form');
    const alertBox = document.getElementById('reg-alert');
    const successBox = document.getElementById('reg-success');
    const submitBtn = document.getElementById('btn-submit-reg');
    const passInp = document.getElementById('inp-pass-reg');
    const pass2Inp = document.getElementById('inp-pass2');
    const toggleBtns = document.querySelectorAll('.toggle-pass');

    /* ── Mostrar/ocultar contraseñas ──────────────────── */
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            const isText = target.type === 'text';
            target.type = isText ? 'password' : 'text';
            btn.textContent = isText ? '👁' : '🙈';
        });
    });

    /* ── Indicador de fortaleza de contraseña ─────────── */
    passInp.addEventListener('input', () => {
        updateStrength(passInp.value);
        clearError(passInp);
    });

    function updateStrength(pw) {
        const bars = document.querySelectorAll('.strength-bar');
        const label = document.getElementById('strength-label');
        const score = getStrengthScore(pw);
        const colors = ['', '#FF4D6D', '#FFD166', '#2ECDA7', '#4D9FFF'];
        const labels = ['', 'Muy débil', 'Débil', 'Buena', 'Fuerte'];
        bars.forEach((bar, i) => {
            bar.style.background = i < score ? colors[score] : '#1E2435';
        });
        if (label) label.textContent = pw.length ? labels[score] : '';
    }

    function getStrengthScore(pw) {
        let s = 0;
        if (pw.length >= 6) s++;
        if (pw.length >= 10) s++;
        if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        return Math.min(s, 4);
    }

    /* ── Limpiar errores al escribir ──────────────────── */
    form.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => {
            clearError(el);
            alertBox.classList.remove('show');
        });
    });

    /* ── Selección de rol ─────────────────────────────── */
    let rolSeleccionado = 'usuario';
    document.querySelectorAll('.rol-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.rol-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            rolSeleccionado = card.dataset.rol;
        });
    });

    /* ── Submit ───────────────────────────────────────── */
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre = document.getElementById('inp-nombre').value.trim();
        const email = document.getElementById('inp-email-reg').value.trim();
        const telefono = document.getElementById('inp-telefono').value.trim();
        const distrito = document.getElementById('inp-distrito').value;
        const password = passInp.value;
        const password2 = pass2Inp.value;
        let valid = true;

        if (!nombre) { setFieldError(document.getElementById('inp-nombre'), 'Ingresa tu nombre.'); valid = false; }
        if (!email) { setFieldError(document.getElementById('inp-email-reg'), 'Ingresa tu correo.'); valid = false; }
        if (!password) { setFieldError(passInp, 'Ingresa una contraseña.'); valid = false; }
        if (password !== password2) { setFieldError(pass2Inp, 'Las contraseñas no coinciden.'); valid = false; }
        if (!valid) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta...';

        setTimeout(() => {
            const result = Session.register({ nombre, email, password, telefono, distrito, rol: rolSeleccionado });

            if (result.ok) {
                successBox.classList.add('show');
                form.style.display = 'none';
                setTimeout(() => {
                    window.location.href = '/public/login.html';
                }, 2200);
            } else {
                showAlert(result.error);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Crear cuenta →';
            }
        }, 400);
    });

    /* ── Helpers ──────────────────────────────────────── */
    function setFieldError(input, msg) {
        const group = input.closest('.form-group');
        if (!group) return;
        group.classList.add('has-error');
        const errEl = group.querySelector('.field-error');
        if (errEl) errEl.textContent = msg;
    }
    function clearError(input) {
        const group = input.closest('.form-group');
        if (group) group.classList.remove('has-error');
    }
    function showAlert(msg) {
        alertBox.textContent = '⚠ ' + msg;
        alertBox.classList.add('show');
    }

});