const express = require('express');
const { google } = require('googleapis');
const app = express();

// --- CONFIGURACIÓN DE ENTORNO ---
const PORT = process.env.PORT || 8080;
const CREDENTIALS_PATH = '/workspace/credentials.json';
const SPREADSHEET_ID = '19Lzcyy3YyeoGCffCjoDHK1tXgn_QkPmhGl7vbDHyrMU';
const MAIN_SHEET_NAME = 'Datos_Para_La_App'; // Nombre único de la hoja

// --- FUNCIONES DE UTILIDAD ---

/**
 * Convierte un array de arrays (datos de Sheets) en un array de objetos
 * usando la primera fila como encabezados.
 * @param {Array<Array<string>>} data El array de datos de Google Sheets
 * @returns {Array<object>} Un array de objetos {columna: valor}
 */
function transformToObjects(data) {
    if (!data || data.length === 0) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            // Usa el nombre del encabezado como clave y el valor de la fila
            const key = header ? header.trim() : `Columna${index}`;
            // Evita asignar valores nulos
            obj[key] = row[index] || ''; 
        });
        return obj;
    }).filter(obj => Object.values(obj).some(val => val !== '')); // Elimina filas completamente vacías
}

// --- FUNCIÓN PRINCIPAL DE GOOGLE SHEETS ---

/**
 * Obtiene datos de un rango específico en la hoja principal y los transforma.
 * @param {string} range Rango de celdas (p. ej., 'A1:CA500')
 * @returns {Promise<Array<object>>} Datos de la hoja transformados en objetos.
 */
async function getSheetData(range) {
    // Autenticación con el archivo físico (Montaje de Archivo)
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

// --- MIDDLEWARE PARA CABECERAS ---
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Content-Type', 'application/json');
    next();
});

// --- RUTAS DE LA API ---

// 1. Ruta de Datos Dinámicos (Telegram/Principal)
// RANGO: A1:AL999 (Tabla 1)
app.get('/api/tasas', async (req, res) => {
    try {
        const data = await getSheetData('A1:AL999');
        res.json(data);
    } catch (error) {
        console.error('Error en /api/tasas: ', error.message);
        res.status(500).json({ 
            error: 'Error al obtener datos dinámicos (Tasas)', 
            detalle: error.message 
        });
    }
});

// 2. Ruta de Matriz de Cruce Estática (Tabla 2)
// RANGO: AN1:BD17
app.get('/api/matriz_cruce', async (req, res) => {
    try {
        const data = await getSheetData('AN1:BD17'); 
        res.json(data);
    } catch (error) {
        console.error('Error en /api/matriz_cruce: ', error.message);
        res.status(500).json({ 
            error: 'Error al obtener Matriz de Cruce (Estática 1)', 
            detalle: error.message 
        });
    }
});

// 3. Ruta de Matriz de Emojis/Factores Estática (Tabla 3)
// RANGO: AN19:BZ37
app.get('/api/matriz_emojis', async (req, res) => {
    try {
        const data = await getSheetData('AN19:BZ37'); 
        res.json(data);
    } catch (error) {
        console.error('Error en /api/matriz_emojis: ', error.message);
        res.status(500).json({ 
            error: 'Error al obtener Matriz Emojis (Estática 2)', 
            detalle: error.message 
        });
    }
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor de NOCTUS API escuchando en el puerto: ${PORT}`);
    console.log('Rutas disponibles: /api/tasas, /api/matriz_cruce, /api/matriz_emojis');
});
