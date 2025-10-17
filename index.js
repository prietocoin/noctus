const express = require('express');
const sharp = require('sharp');
const fs = require('fs');

const app = express();
const PORT = 3000; 

// Aumentamos el límite de cuerpo para aceptar buffers de imágenes grandes
app.use(express.json({ limit: '10mb' })); 

// --- FUNCIÓN DE GENERACIÓN DE IMAGEN ---
async function generateTasaImage(payload) {
    
    const { tasas, coordenadas, config } = payload;
    
    // Verificación de Base64
    const baseImageBase64 = payload.imagen_base_b64; 
    
    if (!baseImageBase64) {
        throw new Error("El payload no contiene 'imagen_base_b64'.");
    }

    const baseImageBuffer = Buffer.from(baseImageBase64, 'base64');
    
    // Definiciones de estilo
    const FINAL_COLOR = "rgb(0, 0, 0)"; // NEGRO
    const FONT_SIZE_FALLBACK = 72; // Valor por defecto

    let svgLayers = [];

    // Dimensiones seguras del SVG
    const SVG_WIDTH = 1100;
    const SVG_HEIGHT = 1400;
    
    // ITERAMOS sobre las coordenadas
    for (const [clave_plantilla, coord] of Object.entries(coordenadas)) {
        const valor = tasas[clave_plantilla] || "N/A"; 

        // AJUSTE CRÍTICO: Usamos 'coord.size' directamente, con el FALLBACK.
        // Esto garantiza que el valor que envías desde n8n (ej. 44 o 85) se use.
        const fontSizeForText = coord.size || FONT_SIZE_FALLBACK; 

        // SINTAXIS FINAL: Oswald Bold
        const svgText = '<svg width="' + SVG_WIDTH + '" height="' + SVG_HEIGHT + '">' + 
            '<text x="' + coord.x + '" y="' + coord.y + '" ' + 
            'font-family="Oswald Bold" font-weight="bold" font-size="' + fontSizeForText + '" ' + // <<<-- CORREGIDO
            'fill="' + FINAL_COLOR + '" text-anchor="end">' + 
            valor +
            '</text></svg>';

        svgLayers.push({
            input: Buffer.from(svgText),
            left: 0,
            top: 0
        });
    }

    // Componer la imagen y devolver el buffer
    try {
        // PASO 1: Redimensionar la imagen de entrada al estándar 1080x1350
        const STANDARD_WIDTH = 1080; 
        const STANDARD_HEIGHT = 1350;

        const resizedImageBuffer = await sharp(baseImageBuffer, { limitInputPixels: false })
            .resize(STANDARD_WIDTH, STANDARD_HEIGHT, {
                fit: 'contain', 
                background: { r: 0, g: 0, b: 0, alpha: 0 } 
            })
            .toBuffer();

        // PASO 2: Superponer el SVG sobre el lienzo redimensionado
        return await sharp(resizedImageBuffer) 
            .composite(svgLayers) 
            .toFormat('jpeg')
            .toBuffer();

    } catch (e) {
        console.error("Error de Sharp al procesar la imagen:", e.message);
        throw new Error(`Sharp error: ${e.message}`);
    }
}

// --- RUTA API (LLAMADA POR N8N) ---
app.post('/generate-tasa', async (req, res) => {
    try {
        const payload = req.body;
        
        // Verificación de existencia
        if (!payload.tasas || !payload.coordenadas || !payload.imagen_base_b64) {
            return res.status(400).send("Faltan 'tasas', 'coordenadas' o 'imagen_base_b64' en el cuerpo.");
        }

        const imageBuffer = await generateTasaImage(payload);
        
        res.set('Content-Type', 'image/jpeg');
        res.send(imageBuffer);
    } catch (error) {
        res.status(500).send(`Error interno: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Microservicio Sharp corriendo en puerto ${PORT}`);
});
