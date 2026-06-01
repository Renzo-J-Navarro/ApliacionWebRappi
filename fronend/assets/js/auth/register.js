/**
 * register.js — Registro de usuarios normales.
 * Depende de: session.js (async)
 * Guarda en: backend/data/usuarios_db.json
 */

document.addEventListener('DOMContentLoaded', () => {

    if (Session.isLogged()) {
        window.location.href = Session.isAdmin() ? '../admin/dashboard.html' : '../user/home.html';
        return;
    }

    const form = document.getElementById('register-form');
    const alertBox = document.getElementById('reg-alert');
    const successBox = document.getElementById('reg-success');
    const submitBtn = document.getElementById('btn-submit-reg');
    const passInp = document.getElementById('inp-pass-reg');
    const pass2Inp = document.getElementById('inp-pass2');

    document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = document.getElementById(btn.dataset.target);
            const isText = t.type === 'text';
            t.type = isText ? 'password' : 'text';
            btn.textContent = isText ? '👁' : '🙈';
        });
    });

    passInp.addEventListener('input', () => {
        _updateStrength(passInp.value);
        _clearError(passInp);
    });

    function _updateStrength(pw) {
        const bars = document.querySelectorAll('.strength-bar');
        const label = document.getElementById('strength-label');
        let s = 0;
        if (pw.length >= 6) s++;
        if (pw.length >= 10) s++;
        if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
        if (/[^A-Za-z0-9]/.test(pw)) s++;
        s = Math.min(s, 4);
        const colors = ['', '#FF4D6D', '#FFD166', '#2ECDA7', '#4D9FFF'];
        const labels = ['', 'Muy débil', 'Débil', 'Buena', 'Fuerte'];
        bars.forEach((b, i) => { b.style.background = i < s ? colors[s] : '#1E2435'; });
        if (label) label.textContent = pw.length ? labels[s] : '';
    }

    form.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => {
            _clearError(el);
            alertBox.classList.remove('show');
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('inp-nombre').value.trim();
        const email = document.getElementById('inp-email-reg').value.trim();
        const telefono = document.getElementById('inp-telefono').value.trim();
        const distrito = document.getElementById('inp-distrito').value;
        const password = passInp.value;
        const pass2 = pass2Inp.value;
        let valid = true;

        if (!nombre) { _setError(document.getElementById('inp-nombre'), 'Ingresa tu nombre.'); valid = false; }
        if (!email) { _setError(document.getElementById('inp-email-reg'), 'Ingresa tu correo.'); valid = false; }
        if (!password) { _setError(passInp, 'Ingresa una contraseña.'); valid = false; }
        if (password !== pass2) { _setError(pass2Inp, 'Las contraseñas no coinciden.'); valid = false; }
        if (!valid) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta...';

        const result = await Session.register({ nombre, email, password, telefono, distrito });
        if (result.ok) {
            successBox.style.display = 'flex';
            successBox.classList.add('show');
            form.style.display = 'none';
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
            _showAlert(result.error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear cuenta →';
        }
    });

    function _setError(input, msg) {
        const g = input.closest('.form-group');
        if (!g) return;
        g.classList.add('has-error');
        const el = g.querySelector('.field-error');
        if (el) el.textContent = msg;
    }
    function _clearError(input) {
        const g = input.closest('.form-group');
        if (g) g.classList.remove('has-error');
    }
    function _showAlert(msg) {
        alertBox.textContent = '⚠ ' + msg;
        alertBox.classList.add('show');
    }
});