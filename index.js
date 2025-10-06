const express = require('express');
const { google } = require('googleapis'); 
const app = express();

// --- CONFIGURACIÓN DE ENTORNO ---
const PORT = process.env.PORT || 8080;
const CREDENTIALS_PATH = '/workspace/credentials.json'; 
const SPREADSHEET_ID = '19Lzcyy3YyeoGCffCjoDHK1tXgn_QkPmhGl7vbDHyrMU';
const MAIN_SHEET_NAME = 'Datos_Para_La_App'; 
const RANGO_TASAS = 'A1:AL999'; // Rango para las tasas dinámicas

// --- NUEVAS CONSTANTES Y FUNCIONES PARA EL SERVICIO DE CONVERSIÓN ---

// Matriz de Factores de Ganancia Fija
const MATRIZ_CRUCE_FACTORES = [
    {"+/-": "VES_D", "VES_O": "1,00", "PEN_O": "0,94", "COP_O": "0,93", "CLP_O": "0,93", "ARS_O": "0,92", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "PEN_D", "VES_O": "0,90", "PEN_O": "1,00", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "COP_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "1,00", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "CLP_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "1,00", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "ARS_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "1,00", "BRL_O": "0,90", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "BRL_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "1,00", "PYG_O": "0,90", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "PYG_D", "VES_O": "0,90", "PEN_O": "0,90", "COP_O": "0,90", "CLP_O": "0,90", "ARS_O": "0,90", "BRL_O": "0,90", "PYG_O": "1,00", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "MXN_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "1", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "USD_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "1", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "ECU_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "1", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "PAN_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "1", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "EUR_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "1", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "DOP_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "1", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "BOB_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "1", "CRC_O": "0,85", "UYU_O": "0,85" },
    {"+/-": "CRC_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "1", "UYU_O": "0,85" },
    {"+/-": "UYU_D", "VES_O": "0,85", "PEN_O": "0,85", "COP_O": "0,85", "CLP_O": "0,85", "ARS_O": "0,85", "BRL_O": "0,85", "PYG_O": "0,85", "MXN_O": "0,85", "USD_O": "0,85", "ECU_O": "0,85", "PAN_O": "0,85", "EUR_O": "0,85", "DOP_O": "0,85", "BOB_O": "0,85", "CRC_O": "0,85", "UYU_O": "1" }
];

// Convierte cadena con coma decimal a número (ej. "0,93" -> 0.93)
function parseFactor(factorString) {
    if (typeof factorString !== 'string') return 1.0;
    return parseFloat(factorString.replace(',', '.')) || 1.0; 
}


// --- FUNCIONES DE UTILIDAD (TU CÓDIGO ORIGINAL) ---

function transformToObjects(data) {
    if (!data || data.length === 0) return [];
    const headers = data[0].map(h => h.trim());
    const rows = data.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const key = header ? header : `Columna${index}`;
            obj[key] = row[index] || ''; 
        });
        return obj;
    }).filter(obj => Object.values(obj).some(val => val !== '')); 
}

// --- FUNCIÓN PRINCIPAL DE GOOGLE SHEETS ---

// ¡MODIFICACIÓN CLAVE AQUÍ PARA EL FILTRO IDTAS!
async function getSheetData(range) {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    try
