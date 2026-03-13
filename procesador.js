// ─────────────────────────────────────────
// FASE 2: PROCESADOR IA
// Lee recetas_raw.json, las envía a Gemini
// en bloques de 5 y guarda el resultado en
// recetas_procesadas.json
// ─────────────────────────────────────────

require('dotenv').config(); // Carga las variables del archivo .env
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── CONFIGURACIÓN ──
const CARPETA_RECETAS = path.join(__dirname, 'recetas');
const ARCHIVO_RAW = path.join(CARPETA_RECETAS, 'recetas_raw.json');
const ARCHIVO_SALIDA = path.join(CARPETA_RECETAS, 'recetas_procesadas.json');
const TAMANO_BLOQUE = 5;

// Creamos la carpeta /recetas si no existe
if (!fs.existsSync(CARPETA_RECETAS)) {
    fs.mkdirSync(CARPETA_RECETAS, { recursive: true });
    console.log('📁 Carpeta /recetas creada\n');
}

// ── INICIALIZAMOS GEMINI ──
// Le pasamos la API key desde el .env
const { GoogleGenAI } = require('@google/genai');
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────
// EL PROMPT — Le decimos exactamente a Gemini
// qué queremos que haga y en qué formato
// ─────────────────────────────────────────
function construirPrompt(recetas) {
    return `
You are an expert chef and nutritionist. You will receive an array of recipes in JSON format and must process each one.

For EACH recipe, return a JSON object with EXACTLY this structure:
{
  "titulo": "original title",
  "imagen": "original image url",
  "url": "original url",
  "tiempoTotal": "original time",
  "porciones": "original servings",
  "robotOriginal": "original robot",
  "ingredientes": ["ingredient 1", "ingredient 2"],
  "traducciones": {
    "Thermomix": [
      "Step 1 fully written out for Thermomix with exact speed, temperature and accessories",
      "Step 2 fully written out...",
      "Step 3 fully written out..."
    ],
    "Mambo": [
      "Step 1 fully written out for Mambo with exact speed, temperature and accessories",
      "Step 2 fully written out..."
    ],
    "Xiaomi": [
      "Step 1 fully written out for Xiaomi with exact speed, temperature and accessories",
      "Step 2 fully written out..."
    ],
    "Monsieur Cuisine": [
      "Step 1 fully written out for Monsieur Cuisine with exact speed, temperature and accessories",
      "Step 2 fully written out..."
    ],
    "Taurus": [
      "Step 1 fully written out for Taurus with exact speed, temperature and accessories",
      "Step 2 fully written out..."
    ],
    "Cocina Tradicional": [
      "Step 1 fully written out for traditional cooking without any robot",
      "Step 2 fully written out..."
    ]
  },
  "nutricion": {
    "calorias": 000,
    "proteinas": 00,
    "grasas": 00,
    "hidratos": 00
  },
  "alergenos": ["Gluten", "Lactosa"]
}

CRITICAL RULES:
1. Return ONLY the JSON array, no text before or after, no markdown code blocks, no explanations.
2. ALL text in the output (steps, titles, everything) must be written in SPANISH.
3. Each robot must have its OWN complete list of steps — never reuse the same steps across robots.
4. Every step must be a complete, self-contained sentence. NEVER merge multiple actions into one step.
5. Each step goes in its own array position. A recipe should have between 5 and 10 individual steps per robot.
6. Include specific accessories where relevant (mariposa, cestillo, espátula, etc).
7. Only include allergens that the recipe actually contains. Options: Gluten, Lactosa, Huevo, Frutos Secos, Marisco, Pescado, Soja, Apio, Mostaza, Sésamo, Sulfitos, Moluscos, Altramuces.
8. Nutrition values are estimates per serving.
9. If a recipe has an "error" field, return it as-is without processing.

RECIPES TO PROCESS:
${JSON.stringify(recetas, null, 2)}
`;
}

// ─────────────────────────────────────────
// FUNCIÓN: Procesar un bloque de recetas
// Envía el bloque a Gemini y parsea la respuesta
// ─────────────────────────────────────────
async function procesarBloque(recetas, numeroBloque, totalBloques) {
    console.log(`\n🤖 Enviando bloque ${numeroBloque}/${totalBloques} a Gemini (${recetas.length} recetas)...`);

    const prompt = construirPrompt(recetas);

    // Llamada a la API de Gemini
    const resultado = await genAI.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt
    });
    const textoRespuesta = resultado.text;

    console.log(`   📥 Respuesta recibida (${textoRespuesta.length} caracteres)`);

    // Intentamos parsear el JSON que nos devuelve Gemini
    // A veces Gemini añade ```json al principio aunque le digamos que no
    // El replace() lo limpia por si acaso
    try {
        const limpio = textoRespuesta
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const procesadas = JSON.parse(limpio);
        console.log(`   ✅ Bloque ${numeroBloque} procesado correctamente`);
        return procesadas;

    } catch (e) {
        console.error(`   ❌ Error parseando respuesta del bloque ${numeroBloque}:`, e.message);
        console.error('   Respuesta problemática:', textoRespuesta.substring(0, 200));
        // Si falla el parseo, devolvemos las recetas sin procesar para no perder datos
        return recetas;
    }
}

// ─────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────
async function procesarTodas() {
    console.log('🚀 Iniciando procesamiento con Gemini...\n');

    // 1. Leemos el archivo raw
    const raw = JSON.parse(fs.readFileSync(ARCHIVO_RAW).toString());

    // 2. Cargamos las recetas ya procesadas
    let procesadasExistentes = [];
    try {
        const contenido = fs.readFileSync(ARCHIVO_SALIDA).toString();
        procesadasExistentes = JSON.parse(contenido);
    } catch (e) {
        procesadasExistentes = []; // El archivo no existe todavía
    }

    // Set de URLs ya procesadas para búsqueda rápida
    const urlsProcesadas = new Set(procesadasExistentes.map(r => r.url));

    // 3. Filtramos solo las que no están procesadas y no tienen error
    const pendientes = raw.filter(r => !r.error && !urlsProcesadas.has(r.url));
    const conError = raw.filter(r => r.error);

    console.log(`📋 Total en raw:           ${raw.length}`);
    console.log(`✅ Ya procesadas:           ${procesadasExistentes.length}`);
    console.log(`🆕 Nuevas a procesar:       ${pendientes.length}`);
    console.log(`❌ Con error (se saltan):   ${conError.length}\n`);

    // Si no hay nada nuevo, terminamos
    if (pendientes.length === 0) {
        console.log('✨ Todo está actualizado. No hay recetas nuevas que procesar.');
        return;
    }

    // 4. Dividimos en bloques y procesamos
    const bloques = [];
    for (let i = 0; i < pendientes.length; i += TAMANO_BLOQUE) {
        bloques.push(pendientes.slice(i, i + TAMANO_BLOQUE));
    }

    console.log(`📦 Bloques a procesar: ${bloques.length} (de ${TAMANO_BLOQUE} recetas cada uno)`);

    const nuevasProcesadas = [];

    for (let i = 0; i < bloques.length; i++) {
        const resultado = await procesarBloque(bloques[i], i + 1, bloques.length);
        nuevasProcesadas.push(...resultado);

        if (i < bloques.length - 1) {
            console.log('\n   ⏳ Esperando 3s antes del siguiente bloque...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // 5. Combinamos existentes con nuevas y guardamos
    const todasProcesadas = [...procesadasExistentes, ...nuevasProcesadas];
    fs.writeFileSync(ARCHIVO_SALIDA, JSON.stringify(todasProcesadas, null, 2));

    console.log('\n─────────────────────────────────');
    console.log(`🆕 Nuevas procesadas:   ${nuevasProcesadas.length}`);
    console.log(`📦 Total en archivo:    ${todasProcesadas.length}`);
    console.log(`💾 Guardado en:         recetas_procesadas.json`);
    console.log('─────────────────────────────────');
}

procesarTodas().catch(err => console.error('Error inesperado:', err));