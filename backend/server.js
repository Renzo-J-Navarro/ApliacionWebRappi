const express = require('express');
const path = require('path');
const app = express();

// 1. Apuntamos a la carpeta 'fronend' para que Express sirva todos tus HTML, CSS y JS
// Usamos '../fronend' porque el servidor está dentro de la carpeta 'backend'
app.use(express.static(path.join(__dirname, '../fronend')));

const ARCHIVO_DB = './usuarios.json';

// Función auxiliar para leer los usuarios del archivo JSON
function obtenerUsuarios() {
    if (!fs.existsSync(ARCHIVO_DB)) return []; // Si el archivo no existe, devuelve lista vacía
    const datos = fs.readFileSync(ARCHIVO_DB, 'utf-8');
    return JSON.parse(datos || '[]');
}

// 1. RUTA PARA GUARDAR (Registro)
app.post('/registrar', (req, res) => {
    const { email, password } = req.body;
    const usuarios = obtenerUsuarios();

    // Validamos si ya existe
    if (usuarios.some(u => u.email.toLowerCase() === email.toLowerCase() && u.password.toLowerCase() === password.toLowerCase())) {
        return res.status(400).json({ OK: false, msg: "Este correo ya está registrado." });
    }

    // Guardamos el nuevo usuario en el array
    usuarios.push({ email, password });

    // Escribimos el array actualizado en el archivo de texto
    fs.writeFileSync(ARCHIVO_DB, JSON.stringify(usuarios, null, 2));

    res.json({ OK: true, msg: "¡Usuario guardado con éxito en el servidor!" });
});

// 2. RUTA PARA REUTILIZAR / VALIDAR (Login)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const usuarios = obtenerUsuarios();

    // Buscamos si existe coincidencia
    const encontrado = usuarios.find(u =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password.toLowerCase() === password.toLowerCase()
    );

    if (encontrado) {
        res.json({ OK: true, msg: `¡Acceso concedido! Bienvenido, ${encontrado.email}.` });
    } else {
        res.status(404).json({ OK: false, msg: "Usuario no registrado en el sistema." });
    }
});

// 2. Si entras a la raíz (http://localhost:3000), te mandamos directo al index público
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../fronend/public/index.html'));
});

// Levantar el servidor en el puerto 3000
const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`\n==================================================`);
    `¡Tu app de Rappi está corriendo con éxito!\n` +
        `👉 Entra aquí para verla: http://localhost:3000\n` +
        `==================================================\n`
});

