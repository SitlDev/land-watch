const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('◈ STARTING DATABASE SEEDING...');

  // 1. Create a sample Parcel
  const parcel = await prisma.parcel.create({
    data: {
      assessedValue: 182000,
      landValue: 162000,
      improvementValue: 20000,
      lastSalePrice: 95000,
      ownershipYears: 7.9,
      priorTaxSales: 0,
      zoning: "Forestry",
      taxDelinquentYears: 3,
      encumbrances: []
    }
  });

  // 2. Create a sample Listing
  await prisma.listing.create({
    data: {
      title: "Ozark Timberland — Newton County",
      state: "AR",
      county: "Newton",
      acreage: 47.3,
      price: 28500,
      pricePerAcre: 602,
      auctionType: "Tax Deed",
      source: "Bid4Assets",
      sourceUrl: "https://bid4assets.com",
      auctionDate: new Date("2026-04-15"),
      closingDays: 14,
      score: 88,
      lat: 35.86,
      lng: -93.18,
      summary: "Premium Ozark timberland at 84% below assessed.",
      flags: ["Absolute auction", "Timber value"],
      parcelId: parcel.id
    }
  });

  console.log('◈ DATABASE SEEDED SUCCESSFULLY.');
}

main()
  .catch((e) => {
    console.error('◈ SEEDING FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
