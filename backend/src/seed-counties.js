const { PrismaClient } = require('@prisma/client');

// All US counties (3,144 total) with FIPS codes
// This is a comprehensive list that can be imported into the database
const ALL_COUNTIES = require('./all-counties.json');

const prisma = new PrismaClient();

async function seedCounties() {
  console.log(`◈ SEEDING ${ALL_COUNTIES.length} COUNTIES INTO DATABASE...`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const county of ALL_COUNTIES) {
    try {
      const result = await prisma.county.upsert({
        where: { id: county.fips }, // Use FIPS as unique ID
        update: {
          name: county.name,
          state: county.state,
          platform: county.platform || null,
          lastScraped: null,
          listingCount: 0,
          opportunityScore: null
        },
        create: {
          id: county.fips,
          name: county.name,
          state: county.state,
          platform: county.platform || null,
          lastScraped: null,
          listingCount: 0,
          opportunityScore: null
        }
      });

      if (result) created++;
    } catch (error) {
      console.error(`◈ ERROR upserting ${county.name}, ${county.state}:`, error.message);
      errors++;
    }
  }

  await prisma.$disconnect();

  console.log(`
  ◈ COUNTY SEEDING COMPLETE
  ◈ Total: ${ALL_COUNTIES.length}
  ◈ Created/Updated: ${created}
  ◈ Errors: ${errors}
  `);
}

seedCounties().catch(err => {
  console.error('◈ FATAL ERROR:', err);
  process.exit(1);
});
