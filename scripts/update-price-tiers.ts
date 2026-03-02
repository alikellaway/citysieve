import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'price-tiers');

const SALE_TIERS = [
  { max: 200000, label: 'under_200k' },
  { max: 350000, label: '200k_350k' },
  { max: 500000, label: '350k_500k' },
  { max: 750000, label: '500k_750k' },
  { max: Infinity, label: 'over_750k' },
];

const RENT_TIERS = [
  { max: 1000, label: 'under_1k' },
  { max: 1500, label: '1k_1.5k' },
  { max: 2000, label: '1.5k_2k' },
  { max: 2500, label: '2k_2.5k' },
  { max: Infinity, label: 'over_2.5k' },
];

interface SalePriceData {
  [outcode: string]: number;
}

interface RentPriceData {
  [postcode: string]: number;
}

interface Metadata {
  lastUpdated: string;
  saleVersion: string;
  rentVersion: string;
  sources: {
    sale: string;
    rent: string;
  };
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function fetchSalePrices(): Promise<SalePriceData> {
  console.log('Fetching Land Registry Price Paid Data...');
  
  const url = 'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads';
  console.log('Note: Land Registry requires manual download or API access.');
  console.log('For automated updates, consider using the ADR (Address Data Registry) or a proxy.');
  
  return {};
}

async function fetchRentPrices(): Promise<RentPriceData> {
  console.log('Fetching VOA Local Reference Rents...');
  console.log('Note: VOA publishes monthly Excel files - need to parse manually.');
  console.log('For automated updates, consider using a cached lookup or alternative source.');
  
  return {};
}

function createFallbackSaleData(): SalePriceData {
  const fallbackData: SalePriceData = {};
  
  const highPriceAreas = ['SW', 'W', 'WC', 'EC', 'NW', 'SE', 'E', 'N', 'Kensington', 'Chelsea', 'Westminster', 'Hampstead'];
  const midPriceAreas = ['M', 'B', 'LE', 'LS', 'BR', 'CR', 'HD', 'HG', 'HU', 'L', 'LN', 'NE', 'NG', 'OL', 'S', 'SA', 'SN', 'SR', 'ST', 'WF', 'WO'];
  
  for (const area of highPriceAreas) {
    fallbackData[area] = 4;
  }
  for (const area of midPriceAreas) {
    fallbackData[area] = 2;
  }
  
  return fallbackData;
}

function createFallbackRentData(): RentPriceData {
  const fallbackData: RentPriceData = {};
  
  const highRentPostcodes = ['SW', 'W', 'WC', 'EC', 'NW', 'SE', 'E', 'N'];
  const midRentPostcodes = ['M', 'B', 'LE', 'LS', 'BR', 'CR', 'L', 'NE', 'NG'];
  
  for (const pc of highRentPostcodes) {
    fallbackData[pc] = 4;
  }
  for (const pc of midRentPostcodes) {
    fallbackData[pc] = 2;
  }
  
  return fallbackData;
}

function saveData(saleData: SalePriceData, rentData: RentPriceData) {
  ensureDir();
  
  const metadata: Metadata = {
    lastUpdated: new Date().toISOString(),
    saleVersion: '1.0-fallback',
    rentVersion: '1.0-fallback',
    sources: {
      sale: 'HM Land Registry (fallback - needs manual setup)',
      rent: 'VOA Local Reference Rents (fallback - needs manual setup)',
    },
  };
  
  writeFileSync(
    join(DATA_DIR, 'sale.json'),
    JSON.stringify(saleData, null, 2)
  );
  writeFileSync(
    join(DATA_DIR, 'rent.json'),
    JSON.stringify(rentData, null, 2)
  );
  writeFileSync(
    join(DATA_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log(`Saved price data to ${DATA_DIR}`);
  console.log(`- sale.json: ${Object.keys(saleData).length} entries`);
  console.log(`- rent.json: ${Object.keys(rentData).length} entries`);
  console.log(`- metadata.json: ${metadata.lastUpdated}`);
}

async function main() {
  console.log('='.repeat(50));
  console.log('CitySieve Price Tiers Update Script');
  console.log('='.repeat(50));
  
  try {
    const saleData = createFallbackSaleData();
    const rentData = createFallbackRentData();
    
    saveData(saleData, rentData);
    
    console.log('\nNote: This is a fallback with sample data.');
    console.log('To enable real price data:');
    console.log('1. Download Land Registry CSV monthly from gov.uk');
    console.log('2. Download VOA rent data from gov.uk');
    console.log('3. Parse and update the respective JSON files');
    console.log('\nFor production, consider:');
    console.log('- Setting up automated download from ADR');
    console.log('- Using a third-party API (Rightmove/Zoopla)');
    console.log('- Manual monthly updates');
    
  } catch (error) {
    console.error('Error updating price tiers:', error);
    process.exit(1);
  }
}

main();
