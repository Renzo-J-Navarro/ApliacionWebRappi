/**
 * login.js
 * Lógica del formulario de inicio de sesión.
 * Depende de: session.js
 */

document.addEventListener('DOMContentLoaded', () => {

    /* Si ya tiene sesión, redirigir */
    if (Session.isLogged()) {
        redirectByRole(Session.current());
        return;
    }

    const form = document.getElementById('login-form');
    const emailInp = document.getElementById('inp-email');
    const passInp = document.getElementById('inp-pass');
    const alertBox = document.getElementById('login-alert');
    const submitBtn = document.getElementById('btn-submit');
    const toggleBtn = document.getElementById('toggle-pass');

    /* Mostrar/ocultar contraseña */
    toggleBtn.addEventListener('click', () => {
        const isText = passInp.type === 'text';
        passInp.type = isText ? 'password' : 'text';
        toggleBtn.textContent = isText ? '👁' : '🙈';
    });

    /* Limpiar errores al escribir */
    [emailInp, passInp].forEach(inp => {
        inp.addEventListener('input', () => {
            inp.closest('.form-group').classList.remove('has-error');
            alertBox.classList.remove('show');
        });
    });

    /* Submit */
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInp.value.trim();
        const password = passInp.value;
        let valid = true;

        if (!email) {
            setFieldError(emailInp, 'Ingresa tu correo electrónico.');
            valid = false;
        }
        if (!password) {
            setFieldError(passInp, 'Ingresa tu contraseña.');
            valid = false;
        }
        if (!valid) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Ingresando...';

        /* Simular pequeño delay de red */
        setTimeout(() => {
            const result = Session.login(email, password);
            if (result.ok) {
                redirectByRole(result.user);
            } else {
                showAlert(result.error);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Ingresar →';
            }
        }, 400);
    });

    /* ── Helpers ──────────────────────────────────────── */
    function setFieldError(input, msg) {
        const group = input.closest('.form-group');
        group.classList.add('has-error');
        group.querySelector('.field-error').textContent = msg;
    }

    function showAlert(msg) {
        alertBox.textContent = '⚠ ' + msg;
        alertBox.classList.add('show');
    }

    function redirectByRole(user) {
        if (user.rol === 'admin') {
            window.location.href = '/admin/dashboard.html';
        } else {
            window.location.href = '/user/home.html';
        }
    }

});