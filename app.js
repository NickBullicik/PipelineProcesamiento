// ─────────────────────────────────────────
// FASE 3: SERVIDOR
// Ya no scrapeamos en tiempo real.
// Leemos recetas_procesadas.json al arrancar
// y lo servimos a las vistas EJS.
// ─────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// CONFIGURACIÓN
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// ── CARGAMOS LAS RECETAS AL ARRANCAR EL SERVIDOR ──
let recetas = [];
try {
    const contenido = fs.readFileSync(path.join(__dirname, 'recetas', 'recetas_procesadas.json'));
    recetas = JSON.parse(contenido);
    console.log(`✅ ${recetas.length} recetas cargadas desde recetas_procesadas.json`);
} catch (e) {
    console.error('❌ No se pudo leer recetas_procesadas.json:', e.message);
}

// ─────────────────────────────────────────
// RUTA PRINCIPAL → Grid de recetas
// ─────────────────────────────────────────
app.get('/', (req, res) => {
    res.render('index', { recetas });
});

// ─────────────────────────────────────────
// RUTA DETALLE → Ficha de una receta
// Buscamos por índice en el array
// ─────────────────────────────────────────
app.get('/receta/:index', (req, res) => {
    const index = parseInt(req.params.index);

    if (isNaN(index) || index < 0 || index >= recetas.length) {
        return res.redirect('/');
    }

    res.render('receta', { receta: recetas[index], index });
});

// ─────────────────────────────────────────
// ARRANQUE DEL SERVIDOR
// ─────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor funcionando en http://localhost:${PORT}`);
});