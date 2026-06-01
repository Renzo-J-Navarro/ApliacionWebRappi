/**
 * login.js — Formulario de inicio de sesión.
 * Depende de: session.js (async)
 */

document.addEventListener('DOMContentLoaded', () => {

    if (Session.isLogged()) {
        _redirect(Session.current());
        return;
    }

    const form = document.getElementById('login-form');
    const emailInp = document.getElementById('inp-email');
    const passInp = document.getElementById('inp-pass');
    const alertBox = document.getElementById('login-alert');
    const submitBtn = document.getElementById('btn-submit');
    const toggleBtn = document.getElementById('toggle-pass');

    toggleBtn.addEventListener('click', () => {
        const isText = passInp.type === 'text';
        passInp.type = isText ? 'password' : 'text';
        toggleBtn.textContent = isText ? '👁' : '🙈';
    });

    [emailInp, passInp].forEach(inp => {
        inp.addEventListener('input', () => {
            inp.closest('.form-group').classList.remove('has-error');
            alertBox.classList.remove('show');
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInp.value.trim();
        const password = passInp.value;
        let valid = true;

        if (!email) { _setError(emailInp, 'Ingresa tu correo electrónico.'); valid = false; }
        if (!password) { _setError(passInp, 'Ingresa tu contraseña.'); valid = false; }
        if (!valid) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Ingresando...';

        const result = await Session.login(email, password);
        if (result.ok) {
            _redirect(result.user);
        } else {
            _showAlert(result.error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ingresar →';
        }
    });

    function _setError(input, msg) {
        const g = input.closest('.form-group');
        g.classList.add('has-error');
        g.querySelector('.field-error').textContent = msg;
    }
    function _showAlert(msg) {
        alertBox.textContent = '⚠ ' + msg;
        alertBox.classList.add('show');
    }
    function _redirect(user) {
        window.location.href = user.rol === 'admin'
            ? '../admin/dashboard.html'
            : '../user/home.html';
    }
});