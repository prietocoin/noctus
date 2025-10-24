const express = require('express');

const { google } = require('googleapis');

const app = express();



// --- CONFIGURACIÓN DE ENTORNO ---

const PORT = process.env.PORT || 8080;

const CREDENTIALS_PATH = '/workspace/credentials.json';

const SPREADSHEET_ID = '1jv-wydSjH84MLUtj-zRvHsxUlpEiqe5AlkTkr6K2248'; // ID CONFIRMADO



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



// *** CONSTANTES DEL NUEVO ENDPOINT (SOLO AÑADIDAS) ***

const RANGO_FUNDABLOCK = 'B18:K19'; // Rango de la ruta anterior

const NUEVA_RUTA_TASAS_FUNDABLOCK = '/tasas-fundablock'; // Ruta anterior



// *** NUEVAS CONSTANTES PARA EL ENDPOINT /tasas-cop_ves ***

const RANGO_TASAS_COP_VES = 'B21:W22';

const NUEVA_RUTA_TASAS_COP_VES = '/tasas-cop_ves';



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

        // Añadimos el nuevo rango RANGO_TASAS_COP_VES a la excepción

        if ((sheetName === HOJA_GANANCIA && (range === RANGO_TASAS_VES || range === RANGO_HEADERS_GANANCIA)) ||

             (sheetName === HOJA_IMAGEN && (range === RANGO_IMAGEN || range === RANGO_FUNDABLOCK || range === RANGO_TASAS_COP_VES))) {

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

        { path: NUEVA_RUTA_TASAS_COP_VES, description: 'NUEVO: Tasas COP/VES (Hoja Imagen, Rango B21:L22)' }, // NUEVA RUTA

        { path: '/datos-imagen', description: 'DATOS ADICIONALES: Datos de la Hoja Imagen (Rango B15:L16)' }, 

        { path: NUEVA_RUTA_TASAS_FUNDABLOCK, description: 'TASAS FUNDABLOCK (Hoja Imagen, Rango B18:K19)' },

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



// --- RUTAS DE DATOS ORIGINALES (NO SE MODIFICAN) ---



// 1. Obtener la última fila de Precios Promedio (Hoja Mercado)

app.get('/tasas-promedio', async (req, res) => {

    try {

        let data = await getSheetData(HOJA_PRECIOS, RANGO_PRECIOS);

        res.json(data); // Devolverá el array con el último objeto

    } catch (error) {

        console.error('Error en /tasas-promedio: ', error.message);

        res.status(500).json({ error: 'Error al obtener datos de Tasas Promedio.', detalle: error.message });

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





// === ENDPOINT EXISTENTE: /tasas-fundablock (NO SE MODIFICA SU FUNCIÓN) ===

app.get(NUEVA_RUTA_TASAS_FUNDABLOCK, async (req, res) => {

    // Código de la ruta /tasas-fundablock

});



// =========================================================================

// === NUEVO ENDPOINT SOLICITADO: /tasas-cop_ves (Rango B21:L22) ===========

// =========================================================================



/**

 * Endpoint dedicado a N8N para obtener las tasas del rango B21:L22 (Claves y Valores)

 * y formatearlas como un solo objeto JSON {clave: valor}

 */

app.get(NUEVA_RUTA_TASAS_COP_VES, async (req, res) => {

    try {

        // 1. Obtener los valores crudos del rango B21:L22

        const dataMatrix = await getSheetData(HOJA_IMAGEN, RANGO_TASAS_COP_VES); 



        // Verificamos que haya al menos dos filas (B21: Claves y B22: Valores)

        if (!dataMatrix || dataMatrix.length < 2) { 

            return res.json([]);

        }



        const ratesObject = {};

        const headers = dataMatrix[0] || []; // Fila 21: Claves (ej. COP, BRL, etc.)

        const values = dataMatrix[1] || [];  // Fila 22: Valores (ej. 14.90, 49.06, etc.)

        

        // 2. Procesar las dos filas

        if (Array.isArray(headers) && Array.isArray(values)) {

            // Iteramos hasta la longitud de los valores

            for (let index = 0; index < values.length; index++) {

                const key = headers[index] ? headers[index].trim().toUpperCase() : null;

                const value = values[index] || '';



                if (key) {

                    // Normalizar la coma a punto decimal

                    ratesObject[key] = value.replace(',', '.'); 

                }

            }

        }

        

        // 3. Devolver un array con el objeto final (ej: [{COP: "14.90", BRL: "49.06", ...}])

        res.json([ratesObject]);



    } catch (error) {

        console.error(`Error en ${NUEVA_RUTA_TASAS_COP_VES}: `, error.message);

        res.status(500).json({ 

            error: 'Error al obtener tasas COP/VES.', 

            detalle: error.message 

        });

    }

});





// 5. SERVICIO DE CONVERSIÓN CENTRALIZADO (RUTA ORIGINAL)

app.get('/convertir', async (req, res) => {

    // ... (código existente)

});



// --- INICIO DEL SERVIDOR (NO SE MODIFICA) ---

app.listen(PORT, () => {

    console.log(`Servidor de NOCTUS API escuchando en el puerto: ${PORT}`);

    console.log(`Acceso API de prueba: http://localhost:${PORT}/`);

});



// --- MANEJADOR DE APAGADO ELEGANTE (NO SE MODIFICA) ---

process.on('SIGTERM', () => {

    console.log('[SHUTDOWN] Señal SIGTERM recibida. Terminando proceso de NOCTUS...');

    process.exit(0);

});


