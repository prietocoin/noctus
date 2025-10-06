const express = require('express');
const { google } = require('googleapis');
const app = express();

// --- CONFIGURACIÓN DE ENTORNO ---
const PORT = process.env.PORT || 8080;
// RUTA ABSOLUTA que funciona con el Montaje de Archivo de EasyPanel
const CREDENTIALS_PATH = '/workspace/credentials.json'; 
const SPREADSHEET_ID = '19Lzcyy3YyeoGCffCjoDHK1tXgn_QkPmhGl7vbDHyrMU';
const MAIN_SHEET_NAME = 'Datos_Para_La_App'; 

// --- FUNCIONES DE UTILIDAD ---

/**
 * Convierte un array de arrays (datos de Sheets) en un array de objetos
 * usando la primera fila de la data como encabezados.
 * @param {Array<Array<string>>} data El array de datos de Google Sheets
 * @returns {Array<object>} Un array de objetos {columna: valor}
 */
function transformToObjects(data) {
    if (!data || data.length === 0) return [];

    // Usamos la primera fila como encabezados
    const headers = data[0].map(h => h.trim());
    const rows = data.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const key = header ? header : `Columna${index}`;
            // Asigna el valor o cadena vacía si es nulo
            obj[key] = row[index] || ''; 
        });
        // Filtra objetos que son completamente vacíos
        return obj;
    }).filter(obj => Object.values(obj).some(val => val !== '')); 
}

// --- FUNCIÓN PRINCIPAL DE GOOGLE SHEETS ---

/**
 * Obtiene datos de un rango específico en la hoja principal y los transforma.
 * @param {string} range Rango de celdas (ej. 'A1:AL999')
 * @returns {Promise<Array<object>>} Datos de la hoja transformados en objetos.
 */
async function getSheetData(range) {
    // Autenticación usando la ruta del archivo que EasyPanel crea
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            // Combina el nombre de la hoja principal con el rango
            range: `${MAIN_SHEET_NAME}!${range}`, 
        });
        
        // Transforma los datos brutos en objetos antes de devolverlos
        return transformToObjects(response.data.values);

    } catch (err) {
        console.error(`La API de Google Sheets devolvió un error al leer el rango ${range}: ${err}`);
        // Se lanza el error para que el bloque try/catch de la ruta lo maneje
        throw err; 
    }
}

// --- MIDDLEWARE Y RUTA RAÍZ ---
app.use((req, res, next) => {
    // Permite CORS para que el frontend pueda consumir la API
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Ruta raíz de bienvenida (para evitar el error "Cannot GET /")
app.get('/', (req, res) => {
    res.json({
        status: "API de NOCTUS en línea",
        message: "Accede a los datos usando los siguientes endpoints (Enlaces Directos):",
        endpoints: [
            "/tasas",
            "/matriz_cruce",
            "/matriz_emojis"
        ]
    });
});

// --- RUTAS DE LA API (Endpoints con Enlaces Directos) ---

// 1. Ruta de Datos Dinámicos (Telegram/Principal)
// RANGO: A1:AL999 (Tabla 1)
app.get('/tasas', async (req, res) => {
    try {
        const data = await getSheetData('A1:AL999');
        res.json(data);
    } catch (error) {
        console.error('Error en /tasas: ', error.message);
        res.status(500).json({ 
            error: 'Error al obtener datos dinámicos (Tasas)', 
            detalle: error.message 
        });
    }
});

// 2. Ruta de Matriz de Cruce Estática (Tabla 2)
// RANGO: AN1:BD17
app.get('/matriz_cruce', async (req, res) => {
    try {
        const data = await getSheetData('AN1:BD17'); 
        res.json(data);
    } catch (error) {
        console.error('Error en /matriz_cruce: ', error.message);
        res.status(500).json({ 
            error: 'Error al obtener Matriz de Cruce (Estática 1)', 
            detalle: error.message 
        });
    }
});

// 3. Ruta de Matriz de Emojis/Factores Estática (Tabla 3)
// RANGO: AN19:BZ37
app.get('/matriz_emojis', async (req, res) => {
    try {
        const data = await getSheetData('AN19:BZ37'); 
        res.json(data);
    } catch (error) {
        console.error('Error en /matriz_emojis: ', error.message);
        res.status(500).json({ 
            error: 'Error al obtener Matriz Emojis (Estática 2)', 
            detalle: error.message 
        });
    }
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor de NOCTUS API escuchando en el puerto: ${PORT}`);
    console.log(`Acceso API de prueba: http://localhost:${PORT}/tasas`);
});
