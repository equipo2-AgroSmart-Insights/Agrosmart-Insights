const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Elimina tildes y convierte a minúsculas
function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Construye la pregunta adaptada a la unidad comercial de la DB
function construirPreguntaAdaptada(producto, unidad) {
  const uni = normalizarTexto(unidad);

  if (uni.includes('saco')) return `¿A cuánto está el saco de ${producto}?`;
  if (uni.includes('cajon')) return `¿A cuánto está el cajón de ${producto}?`;
  if (uni.includes('atado')) return `¿A cuánto está el atado de ${producto}?`;
  if (uni.includes('docena')) return `¿A cuánto está la docena de ${producto}?`;
  if (uni.includes('ciento')) return `¿A cuánto está el ciento de ${producto}?`;
  if (uni.includes('caja')) return `¿A cuánto está la caja de ${producto}?`;

  return `¿A cuánto está la ${producto}?`;
}

async function generarDataset() {
  const datasetPath = path.join(__dirname, 'dataset_ground_truth.json');

  if (!process.env.DATABASE_URL) {
    console.log('⚠️ No se detectó DATABASE_URL. Se evaluará con los precios actuales del JSON.\n');
    return;
  }

  if (!fs.existsSync(datasetPath)) {
    console.error('❌ No se encontró el archivo dataset_ground_truth.json.');
    return;
  }

  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  let dataset = JSON.parse(rawData);

  console.log('🔄 Conectando a PostgreSQL para actualizar los 50 precios reales...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    let actualizados = 0;
    const sinCoincidencia = [];

    for (let item of dataset) {
      const nombreLimpio = normalizarTexto(item.producto);
      const palabras = nombreLimpio.split(' ').filter(p => p.length > 2);
      const palabraClave = palabras[0] || nombreLimpio;

      // Consulta flexible insensible a tildes
      const query = `
        SELECT producto, precio, unidad
        FROM precios_diarios
        WHERE precio IS NOT NULL
          AND (
            LOWER(TRANSLATE(producto, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) LIKE $1
            OR LOWER(TRANSLATE(producto, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) LIKE $2
          )
        ORDER BY fecha DESC
        LIMIT 1;
      `;

      const patExacta = `%${nombreLimpio}%`;
      const patParcial = `%${palabraClave}%`;

      const res = await client.query(query, [patExacta, patParcial]);

      if (res.rows.length > 0) {
        const precioReal = parseFloat(res.rows[0].precio);
        const unidadReal = res.rows[0].unidad || 'Kg';

        item.precio_esperado = precioReal;
        item.unidad = unidadReal;
        item.pregunta = construirPreguntaAdaptada(item.producto, unidadReal);
        actualizados++;
      } else {
        sinCoincidencia.push(item.producto);
      }
    }

    fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf-8');

    console.log(`\n========================================`);
    console.log(`✅ ¡Se alinearon ${actualizados}/${dataset.length} productos con PostgreSQL!`);
    
    if (sinCoincidencia.length > 0) {
      console.log(`\n⚠️ Los siguientes ${sinCoincidencia.length} productos no se encontraron en la DB:`);
      sinCoincidencia.forEach(p => console.log(`   - ${p}`));
      console.log(`👉 Sugerencia: Ajusta el nombre de estos productos en dataset_ground_truth.json según el nombre exacto de tu DB.`);
    }
    console.log(`========================================\n`);

  } catch (error) {
    console.error('❌ Error consultando la base de datos:', error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = { generarDataset };