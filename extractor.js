// ─────────────────────────────────────────
// FASE 1: EXTRACTOR
// Lee urls.txt, scrapea cada receta y
// guarda el resultado en recetas_raw.json
// ─────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { extraerReceta } = require('./src/scraper');

const ARCHIVO_URLS = path.join(__dirname, 'urls.txt');
const CARPETA_SALIDA = path.join(__dirname, 'recetas');
const ARCHIVO_SALIDA = path.join(CARPETA_SALIDA, 'recetas_raw.json');
const DELAY_ENTRE_PETICIONES = 2000;

// Creamos la carpeta /recetas si no existe
if (!fs.existsSync(CARPETA_SALIDA)) {
    fs.mkdirSync(CARPETA_SALIDA, { recursive: true });
    console.log('📁 Carpeta /recetas creada\n');
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── CARGAMOS LAS RECETAS YA EXTRAÍDAS ──
// Si el archivo existe lo leemos, si no empezamos con array vacío
function cargarRecetasExistentes() {
    try {
        const contenido = fs.readFileSync(ARCHIVO_SALIDA).toString();
        return JSON.parse(contenido);
    } catch (e) {
        return [];
    }
}

async function extraerTodas() {
    console.log('🚀 Iniciando extracción...\n');

    // 1. Leemos las URLs del archivo
    const contenido = fs.readFileSync(ARCHIVO_URLS).toString();
    const urls = contenido
        .split('\n')
        .map(linea => linea.trim())
        .filter(linea => linea.length > 0 && !linea.startsWith('#'));

    // 2. Cargamos las recetas que ya teníamos
    const recetasExistentes = cargarRecetasExistentes();

    // Creamos un Set con las URLs ya procesadas para búsqueda rápida
    const urlsExistentes = new Set(recetasExistentes.map(r => r.url));

    // 3. Filtramos solo las URLs nuevas
    const urlsNuevas = urls.filter(url => !urlsExistentes.has(url));

    console.log(`📋 URLs en archivo:     ${urls.length}`);
    console.log(`✅ Ya extraídas:        ${recetasExistentes.length}`);
    console.log(`🆕 Nuevas a extraer:    ${urlsNuevas.length}\n`);

    // Si no hay nada nuevo, terminamos
    if (urlsNuevas.length === 0) {
        console.log('✨ Todo está actualizado. No hay URLs nuevas que extraer.');
        return;
    }

    // 4. Extraemos solo las nuevas
    const nuevasExtraidas = [];

    for (let i = 0; i < urlsNuevas.length; i++) {
        const url = urlsNuevas[i];
        console.log(`[${i + 1}/${urlsNuevas.length}] Extrayendo: ${url}`);

        const receta = await extraerReceta(url);

        if (receta.error) {
            console.log(`   ❌ Error: ${receta.error}`);
            nuevasExtraidas.push({ url, error: receta.error });
        } else {
            console.log(`   ✅ OK: ${receta.titulo}`);
            receta.url = url;
            nuevasExtraidas.push(receta);
        }

        if (i < urlsNuevas.length - 1) {
            console.log(`   ⏳ Esperando ${DELAY_ENTRE_PETICIONES / 1000}s...\n`);
            await esperar(DELAY_ENTRE_PETICIONES);
        }
    }

    // 5. Combinamos las existentes con las nuevas y guardamos
    const todasLasRecetas = [...recetasExistentes, ...nuevasExtraidas];
    fs.writeFileSync(ARCHIVO_SALIDA, JSON.stringify(todasLasRecetas, null, 2));

    const exitosas = nuevasExtraidas.filter(r => !r.error).length;
    const fallidas = nuevasExtraidas.filter(r => r.error).length;

    console.log('\n─────────────────────────────────');
    console.log(`🆕 Nuevas extraídas:    ${exitosas}`);
    console.log(`❌ Con errores:         ${fallidas}`);
    console.log(`📦 Total en archivo:    ${todasLasRecetas.length}`);
    console.log(`💾 Guardado en:         recetas_raw.json`);
    console.log('─────────────────────────────────');
}

extraerTodas().catch(err => console.error('Error inesperado:', err));