const express = require('express');
const { google } = require('googleapis');
const app = express();
const port = 80;

async function getSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
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
  try {
    const data = await getSheetData();
    // Filtramos las filas que la API devuelve como nulas
    const datosFiltrados = data.filter(fila => fila !== null);
    res.json(datosFiltrados); 
  } catch (error) {
    res.status(500).send('Error al obtener los datos de la hoja de cálculo');
  }
});

app.listen(port, () => {
  console.log(`Servidor de NOCTUS API escuchando en http://localhost:${port}`);

});

