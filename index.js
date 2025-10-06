const express = require('express');
const { google } = require = ('googleapis'); // <--- Asegúrate de que esta línea esté correcta
const app = express();

// --- CONFIGURACIÓN DE ENTORNO ---
const PORT = process.env.PORT || 8080;
const CREDENTIALS_PATH = '/workspace/credentials.json'; 
const SPREADSHEET_ID = '19Lzcyy3YyeoGCffCjoDHK1tXgn_QkPmhGl7vbDHyrMU';
const MAIN_SHEET_NAME = 'Datos_Para_La_App'; 

// --- CONSTANTE Y FUNCIONES PARA EL SERVICIO DE CONVERSIÓN ---

// Matriz de Factores de Ganancia Fija (AÑADIDA AQUÍ)
const MATRIZ_CRUCE_FACTORES = [
    { "+/-": "VES_D", "VES_O": "1,00", "PEN_O": "0,94", "COP_O": "0,93", "CLP_O": "0,93", "ARS_O": "0,92", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "PEN_D", "VES_O": "0,90", "PEN_O": "1,00", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "COP_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "1,00", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "CLP_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "1,00", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "ARS_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "1,00", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "BRL_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "1,00", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "PYG_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "1,00", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "MXN_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "1", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "USD_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "1", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "ECU_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "1", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "PAN_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "1", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "EUR_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "1", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "DOP_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "1", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "BOB_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "1", "CRC_O": "0,85", "UYU_O": "0,85" },
    { "+/-": "CRC_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "1", "UYU_O": "0,85" },
    { "+/-": "UYU_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "1" }
];

// Convierte cadena con coma decimal a número (ej. "0,93" -> 0.93)
function parseFactor(factorString) {
    if (typeof factorString !== 'string') return 1.0;
    return parseFloat(factorString.replace(',', '.')) || 1.0; 
}


// --- FUNCIONES DE UTILIDAD (TU CÓDIGO ORIGINAL) ---

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

// --- FUNCIÓN PRINCIPAL DE GOOGLE SHEETS (TU CÓDIGO ORIGINAL) ---

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

// --- MIDDLEWARE Y RUTA RAÍZ (TU CÓDIGO ORIGINAL) ---
app.use((req, res, next) => {
    // Permite CORS para que el frontend pueda consumir la API
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Ruta raíz que ahora devuelve HTML con enlaces directos
app.get('/', (req, res) => {
    const hostUrl = req.headers.host; 
    
    const endpoints = [
        { path: '/tasas', description: 'Tabla 1: Datos Dinámicos (Tasas de Monedas)' },
        { path: '/matriz_cruce', description: 'Tabla 2: Matriz de Cruce Estática' },
        { path: '/matriz_emojis', description: 'Tabla 3: Matriz de Emojis/Factores Estática' },
        { path: '/convertir?cantidad=100&origen=USD&destino=COP', description: 'Servicio de Conversión (Calculadora Final)' } 
    ];

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NOCTUS API - Endpoints</title>
            <style>/* ... (Estilos de tu HTML) ... */</style>
        </head>
        <body>
            <div class="container">
                <h1>API de NOCTUS en Línea</h1>
                <p>El servicio de datos de Google Sheets está funcionando. Haz clic en un enlace para acceder a los datos JSON de la tabla correspondiente:</p>
                <ul class="endpoint-list">
                    ${endpoints.map(ep => `
                        <li class="endpoint-item">
                            <a href="${ep.path.includes('?') ? ep.path : hostUrl + ep.path}">${ep.path}</a>
                            <p>${ep.description}</p>
                        </li>
                    `).join('')}
                </ul>
                <p style="text-align: center; font-size: 0.8em; color: #484f58;">Nota: Esta página es solo para referencia. Los datos son entregados en formato JSON.</p>
            </div>
        </body>
        </html>
    `;
    // Enviamos el contenido como HTML
    res.setHeader('Content-Type', 'text/html'); 
    res.send(htmlContent);
});

// --- RUTAS DE LA API (TU CÓDIGO ORIGINAL CON PEQUEÑA CORRECCIÓN EN /tasas) ---

// 1. Ruta de Datos Dinámicos (Telegram/Principal)
// RANGO: A1:AL999 (Tabla 1)
app.get('/tasas', async (req, res) => {
    try {
        let data = await getSheetData('A1:AL999');

        // Lógica de filtrado de IDTAS para que /convertir pueda usarla más tarde
        if (Array.isArray(data) && data.length > 0) {
            const latestRow = data.reduce((max, current) => {
                const maxIdtasNum = parseFloat(max.IDTAS) || 0;
                const currentIdtasNum = parseFloat(current.IDTAS) || 0;
                return currentIdtasNum > maxIdtasNum ? current : max;
            }, data[0]);
            data = latestRow;
        } else {
             data = [];
        }

        // Si se llama directamente, devuelve el objeto más reciente
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


// 4. NUEVO SERVICIO: Ruta centralizada para realizar el cálculo completo de la conversión
// Uso: GET /convertir?cantidad=100&origen=EUR&destino=COP
app.get('/convertir', async (req, res) => {
    // 1. Obtener y validar parámetros
    const { cantidad, origen, destino } = req.query;

    const monto = parseFloat(cantidad);
    const O = origen ? origen.toUpperCase() : null;
    const D = destino ? destino.toUpperCase() : null;
    const RANGO_TASAS = 'A1:AL999';

    if (!monto || !O || !D) {
        return res
