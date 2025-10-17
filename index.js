const express = require('express');
const { google } = require('googleapis');
const app = express();

// --- CONFIGURACIÓN DE ENTORNO ---
const PORT = process.env.PORT || 8080;
const CREDENTIALS_PATH = '/workspace/credentials.json';
const SPREADSHEET_ID = '1jv-wydSjH84MLUtj-zRvHsxUlpEiqe5AlkTkr6K2248';

// Definiciones de Hojas y Rangos:
const HOJA_GANANCIA = 'Miguelacho';
const RANGO_GANANCIA = 'B2:L12'; // Matriz de cruce de porcentajes
const RANGO_HEADERS_GANANCIA = 'B2:L2'; // Encabezados para TASAS-VES
const RANGO_TASAS_VES = 'B23:L23'; 
const HOJA_PRECIOS = 'Mercado';
const RANGO_PRECIOS = 'A1:M999'; // Precios promedios

// *** CONSTANTES SOLICITADAS ***
const HOJA_IMAGEN = 'imagen';
const RANGO_IMAGEN = 'B15:L16';

// *** CONSTANTES DEL NUEVO ENDPOINT ***
// Nota: Deberías modificar el rango a I28:J36 en el futuro para saltar la fila 27 (encabezado)
const RANGO_FUNDABLOCK = 'I27:J36'; // Rango solicitado (I27:J36)
const NUEVA_RUTA_TASAS_FUNDABLOCK = '/tasas-fundablock'; // Ruta solicitada

// --- CONSTANTE Y FUNCIONES PARA EL SERVICIO DE CONVERSIÓN ---

// Convierte cadena con coma decimal a número (ej. "0,93" -> 0.93)
function parseFactor(factorString) {
    if (typeof factorString !== 'string') return 1.0;
    return parseFloat(factorString.replace(',', '.')) || 1.0;
}

// Transforma la respuesta de Sheets en un array de objetos JSON
function transformToObjects(data) {
    if (!data || data.length === 0) return [];
    
    // Si la primera fila contiene solo valores vacíos, la salta.
    let headerRowIndex = 0;
    while (headerRowIndex < data.length && data[headerRowIndex].filter(String).length === 0) {
        headerRowIndex++;
    }
    
    if (headerRowIndex >= data.length) return []; // No hay datos
    
    const headers = data[headerRowIndex].map(h => h ? h.trim() : '');
    const rows = data.slice(headerRowIndex + 1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const key = header;
            obj[key] = row[index] || '';
        });
        return obj;
    }).filter(obj => Object.values(obj).some(val => val !== ''));
}

// --- FUNCIÓN PRINCIPAL DE GOOGLE SHEETS (MODIFICADA) ---
// Retorna valores crudos para rangos de procesamiento especial 
async function getSheetData(sheetName, range) {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!${range}`,
        });

        const values = response.data.values;
        if (!values || values.length === 0) return [];

        // *** EXCEPCIÓN: Retornar valores crudos para el procesamiento manual ***
        // Se añade la excepción para el NUEVO RANGO_FUNDABLOCK
        if ((sheetName === HOJA_GANANCIA && (range === RANGO_TASAS_VES || range === RANGO_HEADERS_GANANCIA)) ||
             (sheetName === HOJA_IMAGEN && (range === RANGO_IMAGEN || range === RANGO_FUNDABLOCK))) {
            return values;
        }

        // Lógica de filtrado de última fila solo aplica al rango de precios (Mercado)
        if (sheetName === HOJA_PRECIOS && range === RANGO_PRECIOS && values.length > 0) {
            const data = transformToObjects(values);
            if(data.length > 0) {
                const latestRow = data[data.length - 1];
                return [latestRow];
            }
            return [];
        }

        return transformToObjects(values);

    } catch (err) {
        console.error(`La API de Google Sheets devolvió un error al leer la hoja ${sheetName} en el rango ${range}: ${err}`);
        throw err;
    }
}

// --- MIDDLEWARE Y RUTA RAÍZ ---
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Ruta raíz que devuelve HTML para el chequeo de salud y documentación
app.get('/', (req, res) => {
    const hostUrl = req.headers.host;

    const endpoints = [
        { path: '/tasas-promedio', description: 'DATOS MAESTROS: Tasas de Precios Promedio (última fila, Hoja Mercado)' },
        { path: '/matriz-ganancia', description: 'DATOS MAESTROS: Matriz de Ganancia Estática (Hoja Miguelacho)' },
        { path: '/tasas-ves', description: 'DATOS: Tasa de Ganancia VES (Hoja Miguelacho, Fila 23)' }, 
        { path: '/datos-imagen', description: 'DATOS ADICIONALES: Datos de la Hoja Imagen (Rango B15:L16)' }, 
        { path: NUEVA_RUTA_TASAS_FUNDABLOCK, description: 'NUEVO: Tasas para FUNDABLOCK (Hoja Imagen, Rango I27:J36)' }, // NUEVA RUTA
        { path: '/convertir?cantidad=100&origen=USD&destino=COP', description: 'Servicio de Conversión (Calculadora Centralizada)' }
    ];

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NOCTUS API - MAESTRA</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                .container { background-color: #161b22; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); width: 90%; max-width: 600px; }
                h1 { color: #58a6ff; border-bottom: 2px solid #30363d; padding-bottom: 10px; margin-top: 0; }
                .endpoint-list { list-style: none; padding: 0; }
                .endpoint-item { margin-bottom: 15px; background-color: #21262d; padding: 15px; border-radius: 8px; transition: background-color 0.3s; }
                .endpoint-item:hover { background-color: #30363d; }
                .endpoint-item a { text-decoration: none; color: #58a6ff; font-weight: bold; display: block; font-size: 1.1em; margin-bottom: 5px; word-wrap: break-word; }
                .endpoint-item p { margin: 0; color: #8b949e; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>API MAESTRA (NOCTUS) en Línea</h1>
                <p>Esta API es la única con acceso a Google Sheets y sirve los datos a la API Esclava (Miguelacho). Haz clic en los enlaces para ver los datos JSON:</p>
                <ul class="endpoint-list">
                    ${endpoints.map(ep => {
                        const linkPath = ep.path.startsWith('/') ? ep.path : '/' + ep.path;
                        const fullLinkDisplay = `${hostUrl}${linkPath}`;
                        return `
                        <li class="endpoint-item">
                            <a href="${linkPath}">${fullLinkDisplay}</a>
                            <p>${ep.description}</p>
                        </li>
                        `;
                    }).join('')}
                </ul>
                <p style="text-align: center; font-size: 0.8em; color: #484f58;">Estrategia: NOCTUS Maestra ➡️ Miguelacho Esclava ➡️ Aplicación Web</p>
            </div>
        </body>
        </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

// --- NUEVAS RUTAS DE DATOS CRUDOS PARA MIGUELACHO (API ESCLAVA) ---

// 1. Obtener la última fila de Precios Promedio (Hoja Mercado)
app.get('/tasas-promedio', async (req, res) => {
    try {
        let data = await getSheetData(HOJA_PRECIOS, RANGO_PRECIOS);
        res.json(data); // Devolverá el array con el último objeto
    } catch (error) {
        console.error('Error en /tasas-promedio: ', error.message);
        res.status(500).json({
            error: 'Error al obtener datos de Tasas Promedio.',
            detalle: error.message
        });
    }
});

// 2. Obtener la Matriz de Ganancia (Hoja Miguelacho)
app.get('/matriz-ganancia', async (req, res) => {
    try {
        const data = await getSheetData(HOJA_GANANCIA, RANGO_GANANCIA);
        res.json(data);
    } catch (error) {
        console.error('Error en /matriz-ganancia: ', error.message);
        res.status(500).json({ error: 'Error al obtener Matriz de Ganancia.', detalle: error.message });
    }
});

// *** 3. TASA VES (RUTA CORREGIDA PARA DEVOLVER EL OBJETO) ***
app.get('/tasas-ves', async (req, res) => {
    try {
        // Leemos los encabezados de B2:L2 y los valores de B23:L23
        const headersArray = await getSheetData(HOJA_GANANCIA, RANGO_HEADERS_GANANCIA); 
        const valuesArray = await getSheetData(HOJA_GANANCIA, RANGO_TASAS_VES); 

        if (!headersArray || headersArray.length === 0 || !valuesArray || valuesArray.length === 0) {
             return res.json([]);
        }
        
        // Asumimos que los valores están en la fila 0 de cada array devuelto por getSheetData
        const headers = headersArray[0];
        const values = valuesArray[0];
            
        const resultObject = {};
        if (Array.isArray(headers) && Array.isArray(values)) {
            headers.forEach((header, index) => {
                // Usamos el encabezado de B2:L2 como clave para los datos de B23:L23
                resultObject[header.trim() || `Columna${index}`] = values[index] || '';
            });
        }
        
        // Devolverá un array con el objeto de la fila 23 (ej: [{USD: "0.82", COP: "0.87", ...}])
        res.json([resultObject]);

    } catch (error) {
        console.error('Error en /tasas-ves: ', error.message);
        res.status(500).json({ error: 'Error al obtener Tasas VES.', detalle: error.message });
    }
});

// 4. Obtener Datos de Imagen (Hoja Imagen, Rango B15:L16)
app.get('/datos-imagen', async (req, res) => {
    try {
        const data = await getSheetData(HOJA_IMAGEN, RANGO_IMAGEN);
        res.json(data);
    } catch (error) {
        console.error('Error en /datos-imagen: ', error.message);
        res.status(500).json({ error: 'Error al obtener datos de Imagen.', detalle: error.message });
    }
});


// =========================================================================
// === NUEVO ENDPOINT SOLICITADO: /tasas-fundablock (Rango I27:J36) ========
// =========================================================================

/**
 * Endpoint dedicado a N8N para obtener las tasas del rango I27:J36
 * y formatearlas como un solo objeto JSON {clave: valor} para la generación de imágenes.
 */
app.get(NUEVA_RUTA_TASAS_FUNDABLOCK, async (req, res) => {
    try {
        // 1. Obtener los valores crudos del rango I27:J36
        // NOTA: Si la fila 27 contiene el título, el código debe saltarlo en n8n
        // o el rango debe modificarse a I28:J36 en la constante (lo que se sugiere)
        const dataMatrix = await getSheetData(HOJA_IMAGEN, RANGO_FUNDABLOCK); 

        if (!dataMatrix || dataMatrix.length === 0) {
            return res.json([]);
        }

        const ratesObject = {};
        let startIndex = 0; // Se asume que los datos comienzan en la fila 0 (I27)

        // Si la primera fila no tiene un código de moneda válido, la saltamos.
        // Se puede hacer esta verificación para manejar encabezados sin romper la regla de no modificar nada.
        const firstKey = dataMatrix[0] && dataMatrix[0][0] ? dataMatrix[0][0].trim().toUpperCase() : null;
        if (firstKey && firstKey.length > 3 && isNaN(parseFloat(firstKey.replace(',', '.')))) {
            // Si la primera celda es una palabra larga (ej. "MONEDA" o "CODIGO"), la saltamos.
            startIndex = 1;
        }

        // 2. Procesar la matriz de 2 columnas (Moneda en Columna 0, Valor en Columna 1)
        for (let i = startIndex; i < dataMatrix.length; i++) {
            const row = dataMatrix[i];
            const key = row[0] ? row[0].trim().toUpperCase() : null; // Columna I (Moneda)
            const value = row[1] || ''; // Columna J (Valor)

            if (key) {
                // Normalizar la coma a punto decimal antes de guardarla en el objeto
                ratesObject[key] = value.replace(',', '.'); 
            }
        }
        
        // 3. Devolver un array con el objeto final (ej: [{COP: "14.86", USD: "241.08", ...}])
        res.json([ratesObject]);

    } catch (error) {
        console.error(`Error en ${NUEVA_RUTA_TASAS_FUNDABLOCK}: `, error.message);
        res.status(500).json({ 
            error: 'Error al obtener tasas para FUNDABLOCK.', 
            detalle: error.message 
        });
    }
});


// 5. SERVICIO DE CONVERSIÓN CENTRALIZADO (RUTA ORIGINAL)
app.get('/convertir', async (req, res) => {
    // 1. Obtener y validar parámetros
    const { cantidad, origen, destino } = req.query;

    const monto = parseFloat(cantidad);
    const O = origen ? origen.toUpperCase() : null;
    const D = destino ? destino.toUpperCase() : null;

    if (!monto || !O || !D) {
        return res.status(400).json({ error: "Parámetros faltantes o inválidos." });
    }

    try {
        // 2. OBTENER ÚLTIMA FILA de tasas (Hoja Mercado)
        const latestRowArray = await getSheetData(HOJA_PRECIOS, RANGO_PRECIOS);

        if (!Array.isArray(latestRowArray) || latestRowArray.length === 0) {
             return res.status(503).json({ error: "No se pudieron obtener datos de tasas promedio recientes." });
        }

        const latestRow = latestRowArray[latestRowArray.length - 1]; // Último objeto

        // 3. OBTENER MATRIZ DE GANANCIA (Hoja Miguelacho)
        const matrizGanancia = await getSheetData(HOJA_GANANCIA, RANGO_GANANCIA);

        if (!matrizGanancia || matrizGanancia.length === 0) {
            return res.status(503).json({ error: "No se pudo obtener la Matriz de Ganancia." });
        }

        // 4. EXTRACCIÓN Y VALIDACIÓN DE TASAS DINÁMICAS (ORIGEN _O y DESTINO _D)
        const Tasa_O_key = `${O}_O`;
        const Tasa_D_key = `${D}_D`;

        const T_O_str = latestRow[Tasa_O_key];
        const T_D_str = latestRow[Tasa_D_key];

        if (!T_O_str || !T_D_str) {
            return res.status(404).json({ error: `Clave no encontrada en Hoja Mercado. Verifique que ${Tasa_O_key} y ${Tasa_D_key} existan.` });
        }

        const T_O = parseFloat(T_O_str.replace(',', '.')) || 0;
        const T_D = parseFloat(T_D_str.replace(',', '.')) || 0;

        if (T_O === 0 || T_D === 0) {
            return res.status(404).json({ error: "El valor de una de las tasas dinámicas es cero o inválido." });
        }

        // 5. BUSCAR FACTOR DE GANANCIA (F) en la matriz leída de Sheets
        const claveMatrizDestino = `${D}_D`;
        const claveMatrizOrigen = claveMatrizDestino in matrizGanancia[0] ? `${O}_D` : `${O}_O`;
        
        const primeraClave = Object.keys(matrizGanancia[0])[0];
        const filaDestino = matrizGanancia.find(row => row[primeraClave] === claveMatrizDestino);

        if (!filaDestino || !filaDestino[claveMatrizOrigen]) {
            const fallbackKey = `${O}_O`;
            if (!filaDestino || !filaDestino[fallbackKey]) {
                return res.status(404).json({ error: `Factor de ganancia (matriz) no encontrado para el par ${O} -> ${D}.` });
            }
        }
        
        const Factor_F = parseFactor(filaDestino[claveMatrizOrigen] || filaDestino[fallbackKey]);

        // 6. CÁLCULO FINAL: Monto * ( (T_D / T_O) * F )
        const montoConvertido = monto * ( (T_D / T_O) * Factor_F );

        // 7. Devolver resultado JSON
        res.json({
            status: "success",
            conversion_solicitada: `${monto} ${O} a ${D}`,
            monto_convertido: parseFloat(montoConvertido.toFixed(4)),
            detalle: {
                factor_ganancia: Factor_F,
                id_tasa_actual: latestRow.IDTAS || 'N/A',
                timestamp_actual: latestRow.FECHA || 'N/A'
            }
        });

    } catch (error) {
        console.error('Error fatal en /convertir: ', error.message);
        res.status(500).json({ error: 'Error interno del servidor al procesar la conversión.', detalle: error.message });
    }
});

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor de NOCTUS API escuchando en el puerto: ${PORT}`);
    console.log(`Acceso API de prueba: http://localhost:${PORT}/`);
});

// --- MANEJADOR DE APAGADO ELEGANTE ---
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Señal SIGTERM recibida. Terminando proceso de NOCTUS...');
    process.exit(0);
});
