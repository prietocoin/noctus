const express = require('express');
const { google } = require('googleapis'); 
const app = express();

// --- CONFIGURACIÓN DE ENTORNO ---
const PORT = process.env.PORT || 8080;
const CREDENTIALS_PATH = '/workspace/credentials.json'; 
const SPREADSHEET_ID = '19Lzcyy3YyeoGCffCjoDHK1tXgn_QkPmhGl7vbDHyrMU';
const MAIN_SHEET_NAME = 'Datos_Para_La_App'; 
const RANGO_TASAS = 'A1:AL999'; // Rango clave para el filtro IDTAS

// --- CONSTANTE Y FUNCIONES PARA EL SERVICIO DE CONVERSIÓN ---

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
    {
