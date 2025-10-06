const express = require('express');
const { google } = require('googleapis');
const app = express();

// 1. Configuración de PORT para el hosting (necesario en EasyPanel/Docker)
const PORT = process.env.PORT || 8080;

// 2. CORRECCIÓN CLAVE: Buscar el archivo de credenciales.
// La ruta es ABSOLUTA y se corresponde con el "Montaje de archivo" en EasyPanel.
const CREDENTIALS_PATH = '/workspace/credentials.json';

async function getSheetData() {
    // 3. Autenticación con el archivo físico (método preferido para la clave de servicio)
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = '19Lzcyy3YyeoGCffCjoDHK1tXgn_QkPmhGl7vbDHyrMU';
    const range = 'Datos_Para_La_App!A1:CA500';

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return response.data.values;
    } catch (err) {
        console.error('La API de Google Sheets devolvió un error: ' + err);
        throw err;
    }
}

app.get('/', async (req, res) => {
    // Configuración de encabezados para permitir peticiones CORS
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Content-Type', 'application/json');

    try {
        const data = await getSheetData();
        
        // Filtramos las filas que la API devuelve como nulas o vacías
        const datosFiltrados = data.filter(fila => fila !== null && fila.length > 0);
        
        res.json(datosFiltrados); 
    } catch (error) {
        let detalleError = error.message;

        // Ofrecer un mensaje amigable si el archivo no se encuentra o el permiso falla.
        if (error.code === 'ENOENT' && error.path === CREDENTIALS_PATH) {
             detalleError = 'Archivo de credenciales (credentials.json) no encontrado en /workspace. Revisa la configuración del Montaje de Archivo en EasyPanel.';
        } else if (error.code === 403) {
             detalleError = 'Permiso denegado por Google Sheets. Debes compartir la hoja de cálculo con el email de la Cuenta de Servicio.';
        }

        console.error('Error al procesar solicitud: ', detalleError);
        res.status(500).json({ error: 'Error al obtener los datos de la hoja de cálculo', detalle: detalleError });
    }
});

app.listen(PORT, () => {
    // La variable PORT asegura que el log muestre el puerto correcto (generalmente 8080 en EasyPanel)
    console.log(`Servidor de NOCTUS API escuchando en el puerto: ${PORT}`);
});
