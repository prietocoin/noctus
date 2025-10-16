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

// 1. Obtener la última fila de
