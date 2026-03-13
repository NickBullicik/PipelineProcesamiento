const axios = require('axios');
const cheerio = require('cheerio');

// ─────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────
async function extraerReceta(url) {
    try {
        const { data } = await axios.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120...',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
    },
    timeout: 10000
});

        const $ = cheerio.load(data);
        const jsonLdScripts = $('script[type="application/ld+json"]');

        console.log(`📄 HTML recibido: ${data.length} caracteres`);
        console.log(`🔍 Scripts JSON-LD encontrados: ${jsonLdScripts.length}`);

        let datosReceta = null;

        // ── PLAN A: Buscar JSON-LD estructurado ──
        jsonLdScripts.each((i, el) => {
            try {
                const contenido = JSON.parse($(el).html());
                const encontrado = buscarRecipeEnObjeto(contenido);
                if (encontrado && !datosReceta) {
                    datosReceta = encontrado;
                    console.log(`✅ Receta encontrada en el script JSON-LD #${i}`);
                }
            } catch (e) {
                console.log(`⚠️  Error parseando script JSON-LD #${i}:`, e.message);
            }
        });

        // Si encontramos JSON-LD, devolvemos los datos limpios
        if (datosReceta) {
            return {
                titulo: datosReceta.name || 'Receta sin título',
                imagen: extraerImagen(datosReceta),
                ingredientes: datosReceta.recipeIngredient || [],
                instrucciones: limpiarPasos(datosReceta.recipeInstructions),
                tiempoTotal: limpiarTiempo(datosReceta.totalTime || datosReceta.prepTime),
                porciones: datosReceta.recipeYield || null,
                robotOriginal: detectarRobot( JSON.stringify(datosReceta), datosReceta.name || '', url)
            };
        }

        // ── PLAN B: Extracción manual por selectores CSS ──
        console.log('⚠️  No se encontró JSON-LD. Intentando extracción manual...');
        return {
            titulo: $('h1').first().text().trim() || 'Receta desconocida',
            imagen: $('img[class*="recipe"], img[class*="receta"], article img').first().attr('src') || '',
            ingredientes: extraerManual($, [
                'li[class*="ingredient"]',
                'li[class*="ingrediente"]',
                '.wprm-recipe-ingredient',
                '.ingredients li',
                '.ingredientes li'
            ]),
            instrucciones: extraerManual($, [
                'li[class*="instruction"]',
                'li[class*="paso"]',
                '.wprm-recipe-instruction-text',
                '.steps li',
                '.instructions li'
            ]),
            tiempoTotal: null,
            porciones: null,
            robotOriginal: detectarRobot('', $('h1').first().text(), url)
        };

    } catch (e) {
        console.error('❌ Error en el scraper:', e.message);

        if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') { return { error: 'No se pudo conectar con esa web. Comprueba la URL.' }; }
        if (e.response?.status === 403) {return { error: 'La web bloquea el acceso automático (Error 403).' }; }
        if (e.response?.status === 404) { return { error: 'Página no encontrada (Error 404). Revisa la URL.' }; }

        return { error: `Error al acceder a la web: ${e.message}` };
    }
}

// ─────────────────────────────────────────
// FUNCIONES AUXILIARES
// ─────────────────────────────────────────

// Búsqueda recursiva del objeto Recipe dentro del JSON-LD
function buscarRecipeEnObjeto(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Comprobamos si este nodo es una Recipe
    if (obj['@type'] === 'Recipe') return obj;

    // A veces @type es un array: ["Recipe", "Thing"]
    if (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe')) return obj;

    // Buscamos recursivamente en arrays
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const res = buscarRecipeEnObjeto(item);
            if (res) return res;
        }
    } else {
        // Buscamos en cada propiedad del objeto
        for (const key of Object.keys(obj)) {
            const res = buscarRecipeEnObjeto(obj[key]);
            if (res) return res;
        }
    }

    return null;
}

// Convierte las instrucciones al formato estándar: array de strings
function limpiarPasos(pasos) {
    if (!pasos) return [];
    if (typeof pasos === 'string') return [pasos.trim()];

    if (Array.isArray(pasos)) {
        return pasos.flatMap(p => {
            if (typeof p === 'string') return p.trim();
            if (p['@type'] === 'HowToStep') return (p.text || p.name || '').trim();
            if (p['@type'] === 'HowToSection' && p.itemListElement) {
                // Secciones con sub-pasos
                return p.itemListElement.map(sub => (sub.text || sub.name || '').trim());
            }
            if (p.text) return p.text.trim();
            if (p.name) return p.name.trim();
            return [];
        }).filter(p => p.length > 0);
    }

    return [];
}

// Extracción manual por selectores CSS como fallback
function extraerManual($, selectores) {
    const resultados = [];
    for (const sel of selectores) {
        $(sel).each((i, el) => {
            const texto = $(el).text().trim();
            if (texto) resultados.push(texto);
        });
        if (resultados.length > 0) break; // Paramos en el primer selector que funcione
    }
    return resultados.length > 0 ? resultados : ['No se pudo extraer automáticamente'];
}

// Extrae la URL de imagen del objeto Recipe
function extraerImagen(datos) {
    if (!datos.image) return '';
    if (typeof datos.image === 'string') return datos.image;
    if (Array.isArray(datos.image)) {
        const primera = datos.image[0];
        return typeof primera === 'string' ? primera : (primera?.url || '');
    }
    return datos.image?.url || '';
}

// Convierte duración ISO 8601 a texto legible
function limpiarTiempo(iso) {
    if (!iso) return null;
    const horas = iso.match(/(\d+)H/);
    const minutos = iso.match(/(\d+)M/);
    const partes = [];
    if (horas) partes.push(`${horas[1]}h`);
    if (minutos) partes.push(`${minutos[1]} min`);
    return partes.length > 0 ? partes.join(' ') : iso;
}

// Detecta el robot de cocina buscando keywords en el contenido, título y URL
function detectarRobot(contenido, titulo, url) {
    const texto = (contenido + titulo + url).toLowerCase();

    if (texto.includes('thermomix') || texto.includes('varoma') || texto.includes('tm5') || texto.includes('tm6')) { return 'Thermomix'; }
    if (texto.includes('mambo') || texto.includes('cecotec')) { return 'Mambo'; }
    if (texto.includes('monsieur cuisine') || texto.includes('monsieur_cuisine') || texto.includes('lidl')) { return 'Monsieur Cuisine'; }
    if (texto.includes('taurus')) { return 'Taurus'; }
    if (texto.includes('moulinex')) { return 'Moulinex'; }

    return 'Estándar / Manual';
}

module.exports = { extraerReceta };