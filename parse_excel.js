const xlsx = require('xlsx');
const fs = require('fs');

try {
  const workbook = xlsx.readFile('C:\\Users\\USER\\Downloads\\로또 회차별 당첨번호_20260929134417.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // 2D Array format
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const parsedData = [];
  
  // Skip row 0 (headers)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 8) continue;
    
    // Parse round number, removing commas
    const roundStr = String(row[1]).replace(/,/g, '');
    const round = parseInt(roundStr, 10);
    
    if (isNaN(round)) continue;
    
    const num1 = parseInt(row[2], 10);
    const num2 = parseInt(row[3], 10);
    const num3 = parseInt(row[4], 10);
    const num4 = parseInt(row[5], 10);
    const num5 = parseInt(row[6], 10);
    const num6 = parseInt(row[7], 10);
    const bonus = parseInt(row[8], 10);
    
    parsedData.push({
      round,
      numbers: [num1, num2, num3, num4, num5, num6],
      bonus
    });
  }
  
  // Sort by round ascending just in case
  parsedData.sort((a, b) => a.round - b.round);
  
  fs.writeFileSync('lotto_data.json', JSON.stringify(parsedData, null, 2));
  console.log(`Successfully parsed ${parsedData.length} records!`);
} catch (e) {
  console.error("Error parsing Excel:", e);
}
