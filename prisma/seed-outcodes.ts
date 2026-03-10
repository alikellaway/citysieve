import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/db';

async function main() {
  const filePath = path.join(__dirname, 'outcodes.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim() !== '');
  
  // Skip header
  lines.shift();

  console.log(`Parsing ${lines.length} outcodes...`);

  const records: any[] = [];

  for (const line of lines) {
    const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    if (!matches) continue;
    
    const cols = matches.map(s => {
      let val = s;
      if (val.startsWith(',')) val = val.substring(1);
      if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
      return val.trim();
    });

    const outcode = cols[0];
    const latStr = cols[1];
    const lngStr = cols[2];
    const name = cols[6] || outcode;

    if (!outcode || !latStr || !lngStr) continue;

    records.push({
      type: 'outcode',
      outcode,
      name,
      lat: parseFloat(latStr),
      lng: parseFloat(lngStr),
    });
  }

  console.log(`Inserting ${records.length} records into AreaCentroid...`);

  await prisma.areaCentroid.deleteMany({ where: { type: 'outcode' } });

  // Insert in batches just in case it hits SQLite limits
  const BATCH_SIZE = 500;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await prisma.areaCentroid.createMany({
      data: batch,
    });
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });