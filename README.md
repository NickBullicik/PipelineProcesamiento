# 🍳 Pipeline de Procesamiento de Recetas

**Práctica 1.2 — Scraping + IA + Frontend**

Sistema que extrae recetas de webs de cocina, las procesa con Gemini para generar traducciones por robot de cocina, información nutricional y alérgenos, y las muestra en una interfaz web construida con Express y EJS.

---

## ¿Cómo funciona?

```
urls.txt → [Fase 1: Scraper] → recetas_raw.json → [Fase 2: Gemini] → recetas_procesadas.json → [Fase 3: Web]
```

- **Fase 1** — Extrae las recetas de las URLs y guarda los datos crudos
- **Fase 2** — Procesa los datos con Gemini: traducciones, nutrición y alérgenos
- **Fase 3** — Servidor web que sirve las recetas procesadas

Cada fase es independiente. Si necesitas reprocesar con un prompt distinto, no hace falta volver a scrapear. Las fases también son **incrementales**: si añades URLs nuevas, solo se extraen y procesan las que no existen todavía.

---

## Tecnologías

| Tecnología | Función |
|---|---|
| Node.js + Express | Servidor web |
| EJS | Motor de plantillas HTML |
| Axios + Cheerio | Scraping de recetas |
| @google/genai | SDK de Gemini (Google AI Studio) |
| dotenv | Gestión segura de la API key |
| Bootstrap 5 | Interfaz visual |

---

## Uso

### Fase 1 — Extraer recetas
Edita `urls.txt` con las URLs que quieras (una por línea, las líneas con `#` se ignoran):
```bash
node extractor.js
```
Genera o actualiza `recetas/recetas_raw.json`

### Fase 2 — Procesar con IA
```bash
node procesador.js
```
Genera o actualiza `recetas/recetas_procesadas.json`

### Fase 3 — Arrancar el servidor
```bash
node app.js
```
Abre [http://localhost:3000](http://localhost:3000) en el navegador

---

## Características

- Extracción automática via JSON-LD (schema.org) con fallback a scraping manual
- Procesamiento en bloques de 5 recetas para optimizar el uso de la API
- Procesamiento incremental: solo extrae y procesa lo que es nuevo
- Traducciones específicas para 6 robots: Thermomix, Mambo, Xiaomi, Monsieur Cuisine, Taurus y Cocina Tradicional
- Información nutricional por ración (kcal, proteínas, grasas, hidratos)
- Detección de alérgenos con código de colores
- API key protegida con `.env`

---

## Estructura del proyecto

```
├── src/
│   └── scraper.js              ← Motor de scraping
├── views/
│   ├── index.ejs               ← Grid de recetas
│   └── receta.ejs              ← Ficha detallada por robot
├── recetas/
│   ├── recetas_raw.json        ← Generado por extractor.js
│   └── recetas_procesadas.json ← Generado por procesador.js
├── app.js                      ← Servidor
├── extractor.js                ← Fase 1
├── procesador.js               ← Fase 2
├── urls.txt                    ← URLs de recetas
├── .env                        ← API key
└── .gitignore
```

---

## Alumno

Nicolás Mazzilli — 2 DAM | Prácticas Colorful
