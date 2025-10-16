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
const HOJA_PRECIOS = 'Mercado';
const RANGO_PRECIOS = 'A1:M999'; // Precios promedios
const RANGO_TASAS_VES = 'B23:L23'; 

// *** NUEVAS CONSTANTES SOLICITADAS ***
const HOJA_IMAGEN = 'imagen';
const RANGO_IMAGEN = 'B15:L16';

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
            // Usa el encabezado como clave
            const key = header;
            obj[key] = row[index] || '';
        });
        // Filtra filas que están completamente vacías
        return obj;
    }).filter(obj => Object.values(obj).some(val => val !== ''));
}

// --- FUNCIÓN PRINCIPAL DE GOOGLE SHEETS ---

// Obtiene datos de Google Sheets y aplica transformación
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

        let data = transformToObjects(response.data.values);
        
        // Lógica de filtrado de última fila solo aplica al rango de precios (Mercado)
        if (sheetName === HOJA_PRECIOS && range === RANGO_PRECIOS && Array.isArray(data) && data.length > 0) {
            // El último elemento es la fila más reciente
            const latestRow = data[data.length - 1];
            // Devolvemos el array con un solo objeto
            return [latestRow];
        }

        return data;

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
        // Rutas de datos maestros
        { path: '/tasas-promedio', description: 'DATOS MAESTROS: Tasas de Precios Promedio (última fila, Hoja Mercado)' },
        { path: '/matriz-ganancia', description: 'DATOS MAESTROS: Matriz de Ganancia Estática (Hoja Miguelacho)' },
        { path: '/tasas-ves', description: 'DATOS: Tasa de Ganancia VES (Hoja Miguelacho, Fila 23)' }, 
        // *** NUEVO ENDPOINT DOCUMENTADO ***
        { path: '/datos-imagen', description: 'DATOS ADICIONALES: Datos de la Hoja Imagen (Rango B15:L16)' }, 
        // Ruta de la Calculadora
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

// 3. TASA VES (Ruta original)
app.get('/tasas-ves', async (req, res) => {
    try {
        const data = await getSheetData(HOJA_GANANCIA, RANGO_TASAS_VES); 
        res.json(data); 
    } catch (error) {
        console.error('Error en /tasas-ves: ', error.message);
        res.status(500).json({ error: 'Error al obtener Tasas VES.', detalle: error.message });
    }
});

// *** 4. NUEVA RUTA: Obtener Datos de Imagen (Hoja Imagen, Rango B15:L16) ***
app.get('/datos-imagen', async (req, res) => {
    try {
        const data = await getSheetData(HOJA_IMAGEN, RANGO_IMAGEN);
        res.json(data);
    } catch (error) {
        console.error('Error en /datos-imagen: ', error.message);
        res.status(500).json({ error: 'Error al obtener datos de Imagen.', detalle: error.message });
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
