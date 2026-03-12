import fs from 'fs';
import { prisma } from '../src/lib/db';
import { fetchOverpassMetrics, fetchTransitMetrics, fetchSchoolMetrics } from '../src/lib/data/metrics';
import { getCrimeScore } from '../src/lib/data/crime';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function main() {
  console.log('Backing up database...');
  try {
    if (fs.existsSync('./dev.db')) {
      fs.copyFileSync('./dev.db', './dev.db.bak');
      console.log('Database backed up to dev.db.bak');
    } else {
      console.log('No dev.db found, skipping backup.');
    }
  } catch (error) {
    console.error('Failed to backup database:', error);
    process.exit(1);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const centroidsToProcess = await prisma.areaCentroid.findMany({
    where: {
      OR: [
        { metrics: null },
        { metrics: { updatedAt: { lt: thirtyDaysAgo } } }
      ]
    },
    include: { metrics: true }
  });

  const total = centroidsToProcess.length;
  console.log(`Found ${total} centroids to process.`);

  let processed = 0;
  for (const centroid of centroidsToProcess) {
    try {
      console.log(`Processing ${processed + 1}/${total}: ${centroid.outcode}...`);
      
      let overpassMetrics = null;
      let retries = 0;
      let maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          overpassMetrics = await fetchOverpassMetrics(centroid.lat, centroid.lng);
          break;
        } catch (error: any) {
          if (error.status === 429 || (error.message && error.message.includes('429'))) {
            console.log(`Rate limited (429). Waiting 5 minutes...`);
            await sleep(5 * 60 * 1000);
            retries++;
          } else {
            throw error;
          }
        }
      }

      if (!overpassMetrics) {
        throw new Error('Failed to fetch overpass metrics after retries');
      }

      const transitMetrics = await fetchTransitMetrics(centroid.lat, centroid.lng);
      const schoolMetrics = await fetchSchoolMetrics(centroid.lat, centroid.lng, 2);
      const crimeScore = await getCrimeScore(centroid.lat, centroid.lng);

      await prisma.candidateMetrics.upsert({
        where: { areaCentroidId: centroid.id },
        update: {
          supermarkets: overpassMetrics.supermarkets,
          highStreet: overpassMetrics.highStreet,
          pubsBars: overpassMetrics.pubsBars,
          restaurantsCafes: overpassMetrics.restaurantsCafes,
          parksGreenSpaces: overpassMetrics.parksGreenSpaces,
          gymsLeisure: overpassMetrics.gymsLeisure,
          healthcare: overpassMetrics.healthcare,
          librariesCulture: overpassMetrics.librariesCulture,
          schools: schoolMetrics,
          trainStation: overpassMetrics.trainStation,
          busStop: transitMetrics,
          crimeScore: crimeScore
        },
        create: {
          areaCentroidId: centroid.id,
          supermarkets: overpassMetrics.supermarkets,
          highStreet: overpassMetrics.highStreet,
          pubsBars: overpassMetrics.pubsBars,
          restaurantsCafes: overpassMetrics.restaurantsCafes,
          parksGreenSpaces: overpassMetrics.parksGreenSpaces,
          gymsLeisure: overpassMetrics.gymsLeisure,
          healthcare: overpassMetrics.healthcare,
          librariesCulture: overpassMetrics.librariesCulture,
          schools: schoolMetrics,
          trainStation: overpassMetrics.trainStation,
          busStop: transitMetrics,
          crimeScore: crimeScore
        }
      });
      
      // Let SQLite breathe
      await sleep(10);

      processed++;
      
      // Delay between Overpass fetches (5 seconds)
      if (processed < total) {
        await sleep(5000); 
      }
    } catch (error) {
      console.error(`Failed processing ${centroid.outcode}:`, error);
    }
  }

  console.log(`Finished processing ${processed}/${total} centroids.`);
}

if (require.main === module) {
  main().catch(console.error);
}