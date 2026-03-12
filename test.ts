import { prisma } from './src/lib/db';

async function main() {
  try {
    const candidates = await prisma.areaCentroid.findMany({
      take: 1,
      include: {
        metrics: {
          select: {
            supermarkets: true,
            highStreet: true,
            pubsBars: true,
            restaurantsCafes: true,
            parksGreenSpaces: true,
            gymsLeisure: true,
            healthcare: true,
            librariesCulture: true,
            schools: true,
            trainStation: true,
            busStop: true,
            crimeScore: true,
          }
        }
      }
    });
    console.log(candidates);
  } catch (e) {
    console.error(e);
  }
}
main();