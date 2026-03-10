import { prisma } from '../src/lib/db';

async function main() {
  console.log('Fetching outcodes to seed schools around them...');
  const outcodes = await prisma.areaCentroid.findMany();
  
  if (outcodes.length === 0) {
    console.log('No outcodes found. Please run seed-outcodes.ts first.');
    return;
  }

  const schools = [];
  let urnCounter = 100000;

  const phases = ['Primary', 'Secondary'];
  const ofstedDistribution = [
    { rating: 1, weight: 20 }, // 20% Outstanding
    { rating: 2, weight: 60 }, // 60% Good
    { rating: 3, weight: 15 }, // 15% Requires Improvement
    { rating: 4, weight: 5 },  // 5% Inadequate
  ];

  function getRandomRating() {
    const r = Math.random() * 100;
    let sum = 0;
    for (const d of ofstedDistribution) {
      sum += d.weight;
      if (r <= sum) return d.rating;
    }
    return 2;
  }

  for (const outcode of outcodes) {
    // Generate 1 to 5 schools per outcode
    const numSchools = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < numSchools; i++) {
      // Add slight jitter to location (approx +/- 2km)
      const latJitter = (Math.random() - 0.5) * 0.036;
      const lngJitter = (Math.random() - 0.5) * 0.05;
      
      const phase = phases[Math.floor(Math.random() * phases.length)];
      const rating = getRandomRating();

      schools.push({
        urn: (urnCounter++).toString(),
        name: `${outcode.name} ${phase} School`,
        lat: outcode.lat + latJitter,
        lng: outcode.lng + lngJitter,
        ofstedRating: rating,
        phase,
      });
    }
  }

  console.log(`Inserting ${schools.length} schools...`);

  await prisma.school.deleteMany({}); // Clear existing

  const BATCH_SIZE = 1000;
  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);
    await prisma.school.createMany({ data: batch });
  }

  console.log('Schools seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
