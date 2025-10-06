const express = require('express');
const { google } = require('googleapis');
const app = express();

// 1. CORRECCIÓN CLAVE: Usar la variable de entorno PORT
// Esto permite que EasyPanel (y otros hosts) mapeen el puerto externo al puerto interno.
const PORT = process.env.PORT || 8080;

// La ruta del archivo de credenciales no debe estar codificada. 
// Es mejor usar directamente las credenciales de entorno que ya configuraste en EasyPanel.
// Si las credenciales están en una variable de entorno JSON llamada GOOGLE_CREDENTIALS_JSON:
const credentials = process.env.GOOGLE_CREDENTIALS_JSON ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) : null;

async function getSheetData() {
  if (!credentials) {
      console.error('No se encontraron credenciales de Google Sheets en el entorno.');
      throw new Error('Credenciales de servicio no configuradas.');
  }
  
  const auth = new google.auth.GoogleAuth({
    // Usamos el objeto de credenciales directamente
    credentials: credentials, 
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
  // Configuración de encabezados para permitir peticiones CORS (si planeas usar la API desde un frontend)
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Content-Type', 'application/json');

  try {
    const data = await getSheetData();
    
    // Filtramos las filas que la API devuelve como nulas
    const datosFiltrados = data.filter(fila => fila !== null && fila.length > 0);
    
    res.json(datosFiltrados);  
  } catch (error) {
    console.error('Error al procesar solicitud: ', error.message);
    res.status(500).json({ error: 'Error al obtener los datos de la hoja de cálculo', detalle: error.message });
  }
});

app.listen(PORT, () => {
  // La variable PORT asegura que el log muestre el puerto correcto (generalmente 8080 en EasyPanel)
  console.log(`Servidor de NOCTUS API escuchando en el puerto: ${PORT}`);
});
