const { PrismaClient } = require('@prisma/client');
const BaseScraper = require('./lib/BaseScraper');

const prisma = new PrismaClient();

/**
 * Generate mock auction listings for demo/testing
 * Simulates what real scrapers would fetch from public APIs
 */
async function generateMockListings() {
  const scraper = new BaseScraper('Mock Data Generator');
  
  const mockListings = [
    // GSA Auctions (Federal Properties)
    ...generateGSAListings(),
    // HUD Foreclosures (Government Foreclosures)
    ...generateHUDListings(),
    // NYC Tax Auctions (NYC Specific)
    ...generateNYCListings(),
    // County Deed Recordings (Public Deed Records)
    ...generateCountyDeedListings(),
  ];

  console.log(`📊 Generated ${mockListings.length} mock listings`);
  console.log('💾 Saving to database...\n');

  let saved = 0;
  for (const listing of mockListings) {
    try {
      await scraper.saveListing(listing);
      saved++;
    } catch (error) {
      console.error(`❌ Failed to save: ${listing.title}`, error.message);
    }
  }

  console.log(`✅ Saved ${saved} listings with parcel data\n`);
  await scraper.close();
}

function generateGSAListings() {
  const states = [
    { state: 'CA', county: 'Alameda', lat: 37.7749, lng: -122.4194 },
    { state: 'CA', county: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
    { state: 'TX', county: 'Harris', lat: 29.7604, lng: -95.3698 },
    { state: 'TX', county: 'Dallas', lat: 32.7767, lng: -96.797 },
    { state: 'FL', county: 'Miami-Dade', lat: 25.7617, lng: -80.1918 },
    { state: 'NY', county: 'New York', lat: 40.7128, lng: -74.006 },
    { state: 'PA', county: 'Philadelphia', lat: 39.9526, lng: -75.1652 },
    { state: 'IL', county: 'Cook', lat: 41.8781, lng: -87.6298 },
    { state: 'OH', county: 'Cuyahoga', lat: 41.4993, lng: -81.6944 },
    { state: 'GA', county: 'Fulton', lat: 33.749, lng: -84.388 },
  ];

  return states.flatMap((loc, idx) => {
    const acreage = 0.5 + Math.random() * 5;
    const price = 50000 + Math.random() * 400000;
    const assessedValue = price * (1.1 + Math.random() * 0.3);
    return [{
      title: `Federal Building - ${loc.county} County, ${loc.state} (GSA ${idx + 1})`,
      county: loc.county,
      state: loc.state,
      auctionType: 'Government Auction',
      source: 'GSA Auctions',
      sourceUrl: `https://gsaauctions.gov/property/${idx + 1}`,
      auctionDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      closingDays: 7 + Math.floor(Math.random() * 30),
      price: price,
      pricePerAcre: price / acreage,
      acreage: acreage,
      summary: `Federal property in ${loc.county} County, ${loc.state}. Former government facility.`,
      score: Math.floor(65 + Math.random() * 35),
      flags: ['Government title', 'Federal property'],
      risks: ['Title may need clearing'],
      action: 'Investigate',
      lat: loc.lat + (Math.random() - 0.5) * 0.1,
      lng: loc.lng + (Math.random() - 0.5) * 0.1,
      // Parcel data
      assessedValue: assessedValue,
      landValue: price * 0.65,
      improvementValue: price * 0.35,
      lastSalePrice: price * 0.95,
      lastSaleDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000),
      ownershipYears: Math.random() * 30,
      priorTaxSales: Math.random() > 0.7 ? 1 : 0,
      zoning: 'Government/Commercial',
      encumbrances: Math.random() > 0.8 ? ['Easement'] : [],
      taxDelinquentYears: 0,
    }];
  });
}

function generateHUDListings() {
  const properties = [
    { state: 'AZ', county: 'Maricopa', city: 'Phoenix', price: 120000, beds: 3 },
    { state: 'AZ', county: 'Pima', city: 'Tucson', price: 95000, beds: 2 },
    { state: 'CA', county: 'San Diego', city: 'San Diego', price: 350000, beds: 4 },
    { state: 'CA', county: 'Kern', city: 'Bakersfield', price: 115000, beds: 3 },
    { state: 'FL', county: 'Hillsborough', city: 'Tampa', price: 145000, beds: 3 },
    { state: 'FL', county: 'Broward', city: 'Fort Lauderdale', price: 210000, beds: 2 },
    { state: 'GA', county: 'DeKalb', city: 'Atlanta', price: 155000, beds: 3 },
    { state: 'IL', county: 'Cook', city: 'Chicago', price: 135000, beds: 2 },
    { state: 'TX', county: 'Bexar', city: 'San Antonio', price: 110000, beds: 3 },
    { state: 'TX', county: 'Travis', city: 'Austin', price: 235000, beds: 3 },
    { state: 'TX', county: 'Harris', city: 'Houston', price: 125000, beds: 2 },
  ];

  return properties.map((prop, idx) => {
    const acreage = 0.25 + Math.random() * 0.35;
    const price = prop.price * (0.8 + Math.random() * 0.2);
    const assessedValue = price / 0.75;
    return {
      title: `HUD Home - ${prop.beds}BR in ${prop.city}, ${prop.state} (HUD ${idx + 1})`,
      county: prop.county,
      state: prop.state,
      auctionType: 'HUD Foreclosure',
      source: 'HUD Foreclosures',
      sourceUrl: `https://www.hud.gov/property/${idx + 1}`,
      auctionDate: new Date(Date.now() + Math.random() * 25 * 24 * 60 * 60 * 1000),
      closingDays: 14 + Math.floor(Math.random() * 45),
      price: price,
      pricePerAcre: price / acreage,
      acreage: acreage,
      summary: `HUD-owned ${prop.beds}-bedroom home in ${prop.city}. Ready for occupancy.`,
      score: Math.floor(72 + Math.random() * 28),
      flags: ['HUD owned', 'Below market'],
      risks: ['As-is sale'],
      action: 'Monitor',
      lat: 35 + Math.random() * 10,
      lng: -95 - Math.random() * 10,
      // Parcel data
      assessedValue: assessedValue,
      landValue: assessedValue * 0.35,
      improvementValue: assessedValue * 0.65,
      lastSalePrice: price * 0.85,
      lastSaleDate: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000),
      ownershipYears: Math.random() * 15,
      priorTaxSales: 0,
      zoning: 'Residential',
      encumbrances: [],
      taxDelinquentYears: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
    };
  });
}

function generateNYCListings() {
  const boroughs = [
    { name: 'Manhattan', fips: '36061', lat: 40.7831, lng: -73.9712 },
    { name: 'Brooklyn', fips: '36047', lat: 40.6782, lng: -73.9442 },
    { name: 'Queens', fips: '36081', lat: 40.7282, lng: -73.7949 },
    { name: 'Bronx', fips: '36005', lat: 40.8448, lng: -73.8648 },
    { name: 'Staten Island', fips: '36085', lat: 40.5795, lng: -74.1502 },
  ];

  return boroughs.flatMap((borough, idx) =>
    [...Array(3)].map((_, i) => {
      const acreage = 0.05 + Math.random() * 0.25;
      const price = 50000 + Math.random() * 500000;
      const assessedValue = price * (1.2 + Math.random() * 0.5);
      return {
        title: `NYC Tax Lien - ${borough.name} (Lot ${idx * 100 + i})`,
        county: 'New York',
        state: 'NY',
        auctionType: 'Tax Lien',
        source: 'NYC Tax Auctions',
        sourceUrl: `https://www1.nyc.gov/site/finance/taxes/property-tax-sales.page?lot=${idx * 100 + i}`,
        auctionDate: new Date(Date.now() + Math.random() * 20 * 24 * 60 * 60 * 1000),
        closingDays: 30 + Math.floor(Math.random() * 60),
        price: price,
        pricePerAcre: price / acreage,
        acreage: acreage,
        summary: `NYC tax lien in ${borough.name}. Tax assessment year 2023-2024.`,
        score: Math.floor(68 + Math.random() * 32),
        flags: ['NYC property', 'Tax lien'],
        risks: ['Urban redemption possible'],
        action: 'Monitor',
        lat: borough.lat + (Math.random() - 0.5) * 0.1,
        lng: borough.lng + (Math.random() - 0.5) * 0.1,
        // Parcel data
        assessedValue: assessedValue,
        landValue: assessedValue * 0.3,
        improvementValue: assessedValue * 0.7,
        lastSalePrice: price * 1.5,
        lastSaleDate: new Date(Date.now() - Math.random() * 10 * 365 * 24 * 60 * 60 * 1000),
        ownershipYears: Math.random() * 25,
        priorTaxSales: Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0,
        zoning: 'Urban Mixed',
        encumbrances: Math.random() > 0.5 ? ['Lien'] : [],
        taxDelinquentYears: Math.floor(Math.random() * 5) + 1,
      };
    })
  );
}

function generateCountyDeedListings() {
  const counties = [
    { county: 'Cook', state: 'IL', lat: 41.8781, lng: -87.6298 },
    { county: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
    { county: 'Harris', state: 'TX', lat: 29.7604, lng: -95.3698 },
    { county: 'Maricopa', state: 'AZ', lat: 33.4484, lng: -112.074 },
    { county: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  ];

  return counties.flatMap((county, idx) =>
    [...Array(3)].map((_, i) => {
      const acreage = 0.2 + Math.random() * 3;
      const assessedValue = 200000 + Math.random() * 600000;
      const salePrice = assessedValue * (0.7 + Math.random() * 0.6);
      return {
        title: `County Deed - ${county.county} County Recording #${idx * 100 + i}`,
        county: county.county,
        state: county.state,
        auctionType: 'Recorded Deed Sale',
        source: 'County Deed Recordings',
        sourceUrl: `https://www.county-recorder.gov/${county.state}/${county.county}`,
        auctionDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        closingDays: Math.floor(Math.random() * 15),
        price: salePrice,
        pricePerAcre: salePrice / acreage,
        acreage: acreage,
        summary: `Recorded deed in ${county.county} County. Sale price: $${Math.floor(salePrice).toLocaleString()}. From public records.`,
        score: Math.floor(60 + Math.random() * 35),
        flags: ['Warranty Deed', `Recorded ${Math.floor(Math.random() * 15)} days ago`, 'Public Record'],
        risks: ['Title search recommended'],
        action: 'Monitor',
        lat: county.lat + (Math.random() - 0.5) * 0.15,
        lng: county.lng + (Math.random() - 0.5) * 0.15,
        // Parcel data
        assessedValue: assessedValue,
        landValue: assessedValue * 0.5,
        improvementValue: assessedValue * 0.5,
        lastSalePrice: salePrice,
        lastSaleDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        ownershipYears: Math.random() * 20,
        priorTaxSales: 0,
        zoning: 'Mixed',
        encumbrances: [],
        taxDelinquentYears: 0,
      };
    })
  );
}

// Run if called directly
generateMockListings().catch(console.error);

module.exports = { generateMockListings };
