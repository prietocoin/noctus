const express = require('express');
const { google } = require('googleapis');
const app = express();

// --- CONFIGURACIÓN DE ENTORNO ---
const PORT = process.env.PORT || 8080;
// RUTA ABSOLUTA que funciona con el Montaje de Archivo de EasyPanel
const CREDENTIALS_PATH = '/workspace/credentials.json'; 
const SPREADSHEET_ID = '19Lzcyy3YyeoGCffCjoDHK1tXgn_QkPmhGl7vbDHyrMU';
const MAIN_SHEET_NAME = 'Datos_Para_La_App'; 

// --- NUEVAS CONSTANTES Y FUNCIONES PARA EL SERVICIO DE CONVERSIÓN ---

// Matriz de Factores de Ganancia Fija
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
    // 1. CORRECCIÓN: Usar req.headers.host (o req.hostname) en lugar de window.location.host
    const hostUrl = req.headers.host; 
    
    // Lista de endpoints y sus descripciones
    const endpoints = [
        { path: '/tasas', description: 'Tabla 1: Datos Dinámicos (Tasas de Monedas)' },
        { path: '/matriz_cruce', description: 'Tabla 2: Matriz de Cruce Estática' },
        { path: '/matriz_emojis', description: 'Tabla 3: Matriz de Emojis/Factores Estática' },
        // AÑADIDO: Muestra la nueva ruta de servicio
        { path: '/convertir?cantidad=100&origen=EUR&destino=COP', description: 'Servicio de Conversión (Calculadora Final)' } 
    ];

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NOCTUS API - Endpoints</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #0d1117; /* Fondo oscuro */
                    color: #c9d1d9; /* Texto claro */
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                }
                .container {
                    background-color: #161b22; /* Contenedor más claro */
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    width: 90%;
                    max-width: 600px;
                }
                h1 {
                    color: #58a6ff; /* Azul brillante */
                    border-bottom: 2px solid #30363d;
                    padding-bottom: 10px;
                    margin-top: 0;
                }
                .endpoint-list {
                    list-style: none;
                    padding: 0;
                }
                .endpoint-item {
                    margin-bottom: 15px;
                    background-color: #21262d; /* Fondo del item */
                    padding: 15px;
                    border-radius: 8px;
                    transition: background-color 0.3s;
                }
                .endpoint-item:hover {
                    background-color: #30363d;
                }
                .endpoint-item a {
                    text-decoration: none;
                    color: #58a6ff;
                    font-weight: bold;
                    display: block;
                    font-size: 1.1em;
                    margin-bottom: 5px;
                }
                .endpoint-item p {
                    margin: 0;
                    color: #8b949e; /* Gris suave para la descripción */
                    font-size: 0.9em;
                }
            </style>
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

// --- RUTAS DE LA API (Endpoints con Enlaces Directos) ---

// 1. Ruta de Datos Dinámicos (Telegram/Principal) - ¡Mantiene tu lógica de filtrado IDTAS!
// RANGO: A1:AL999 (Tabla 1)
app.get('/tasas', async (req, res) => {
    try {
        let data = await getSheetData('A1:AL999');

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
        return res.status(400).json({ 
            error: "Parámetros faltantes o inválidos.", 
            ejemplo: "/convertir?cantidad=100&origen=EUR&destino=COP" 
        });
    }

    try {
        // 2. OBTENER Y FILTRAR TASAS DINÁMICAS (Reutilizando la lógica de /tasas)
        const allTasas = await getSheetData(RANGO_TASAS); 
        
        const latestRow = allTasas.reduce((max, current) => {
            const maxIdtasNum = parseFloat(max.IDTAS) || 0; 
            const currentIdtasNum = parseFloat(current.IDTAS) || 0;
            return currentIdtasNum > maxIdtasNum ? current : max;
        }, allTasas[0]);
        
        if (!latestRow) {
             return res.status(503).json({ error: "No se pudieron obtener datos de tasas dinámicas recientes." });
        }

        // 3. EXTRAER TASAS T_O y T_D
        const Tasa_O_key = `${O}_O`;
        const Tasa_D_key = `${D}_O`;

        const T_O_str = latestRow[Tasa_O_key];
        const T_D_str = latestRow[Tasa_D_key];
        
        if (!T_O_str || !T_D_str) {
             return res.status(404).json({ error: `Tasa dinámica no encontrada para ${O} o ${D} en la última fila.` });
        }

        const T_O = parseFloat(T_O_str) || 0;
        const T_D = parseFloat(T_D_str) || 0;

        if (T_O === 0 || T_D === 0) {
            return res.status(404).json({ error: "Una de las tasas dinámicas es cero." });
        }

        // 4. BUSCAR FACTOR DE GANANCIA (F) en la matriz fija
        const claveMatrizDestino = `${D}_D`;
        const claveMatrizOrigen = `${O}_O`;

        const filaDestino = MATRIZ_CRUCE_FACTORES.find(row => row["+/-"] === claveMatrizDestino);
        
        if (!filaDestino || !filaDestino[claveMatrizOrigen]) {
            return res.status(404).json({ error: `Factor de ganancia (matriz) no encontrado para el par ${O} -> ${D}.` });
        }

        const Factor_F = parseFactor(filaDestino[claveMatrizOrigen]);

        // 5. CÁLCULO FINAL: Monto * ( (T_D / T_O) * F )
        const montoConvertido = monto * ( (T_D / T_O) * Factor_F );

        // 6. Devolver resultado JSON
        res.json({
            status: "success",
            conversion_solicitada: `${monto} ${O} a ${D}`,
            monto_convertido: parseFloat(montoConvertido.toFixed(4)),
            detalle: {
                tasa_origen_T_O: T_O,
                tasa_destino_T_D: T_D,
                factor_ganancia: Factor_F,
            }
        });

    } catch (error) {
        console.error('Error en /convertir: ', error.message);
        res.status(500).json({ error: 'Error interno del servidor al procesar la conversión.', detalle: error.message });
    }
});


// --- INICIO DEL SERVIDOR (TU CÓDIGO ORIGINAL) ---
app.listen(PORT, () => {
    console.log(`Servidor de NOCTUS API escuchando en el puerto: ${PORT}`);
    console.log(`Acceso API de prueba: http://localhost:${PORT}/`);
    console.log(`¡NUEVO SERVICIO LISTO! Ejemplo: http://localhost:${PORT}/convertir?cantidad=100&origen=USD&destino=COP`);
});
