import * as fs from 'fs';
import * as path from 'path';

function generate606Csv() {
  const inputFilePath = path.join(__dirname, '../data/Alegra - Reporte 606 - Jan 2025.txt');
  const outputFilePath = path.join(__dirname, '../data/Alegra - Reporte 606 - Jan 2025.csv');
  
  const lines = fs.readFileSync(inputFilePath, 'utf-8').trim().split('\n');
  // ...existing code (if needed)...

  // Parse lines into CSV
  const csvRows = lines.map(line => {
    const fields = line.split('|');
    return fields.join(',');
  });

  // Write CSV
  fs.writeFileSync(outputFilePath, csvRows.join('\n'), 'utf-8');
  console.log(`CSV file created at: ${outputFilePath}`);
}

generate606Csv();
