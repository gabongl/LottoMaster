const { Client } = require('pg');
const fs = require('fs');

async function seed() {
  const data = JSON.parse(fs.readFileSync('lotto_data.json', 'utf8'));
  
  const client = new Client({
    connectionString: "postgresql://lottoadmin:SmartLotto2026!!@158.179.191.202:5432/lottomaster?schema=public"
  });
  
  await client.connect();
  
  console.log("Connected to DB, inserting records...");
  
  // Use a transaction and bulk insert strategy
  await client.query('BEGIN');
  
  try {
    // Clear existing data just in case
    await client.query('DELETE FROM lotto_draws');
    
    // Chunking to avoid parameter limits
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      const values = [];
      const placeholders = [];
      
      chunk.forEach((row, idx) => {
        const offset = idx * 8;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
        values.push(row.round, row.numbers[0], row.numbers[1], row.numbers[2], row.numbers[3], row.numbers[4], row.numbers[5], row.bonus);
      });
      
      const query = `
        INSERT INTO lotto_draws (round, num1, num2, num3, num4, num5, num6, bonus)
        VALUES ${placeholders.join(', ')}
      `;
      
      await client.query(query, values);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully seeded ${data.length} records into Oracle PostgreSQL!`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error during seed:", e);
  } finally {
    await client.end();
  }
}

seed();
