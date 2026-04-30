const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * PARCEL SYNC WORKER
 * Synchronizes auction listings with detailed parcel data from county assessors.
 * Performs deep-dive valuation, ownership history, and tax delinquency analysis.
 */
class ParcelSyncWorker {
  constructor() {
    this.batchSize = 25;
    this.isSyncing = false;
  }

  async syncAll() {
    if (this.isSyncing) {
      console.log('◈ SYNC ALREADY IN PROGRESS');
      return { status: 'busy' };
    }

    this.isSyncing = true;
    console.log('◈ STARTING PARCEL SYNC JOB...');
    
    try {
      // 1. Find listings without linked parcels
      const listings = await prisma.listing.findMany({
        where: { parcelId: null },
        take: this.batchSize
      });

      console.log(`◈ FOUND ${listings.length} LISTINGS REQUIRING SYNC`);
      
      let syncedCount = 0;
      for (const listing of listings) {
        try {
          console.log(`◈ SYNCING: ${listing.title} (${listing.county}, ${listing.state})`);
          
          // Simulate fetching data from external county registry
          const parcelData = await this.fetchExternalParcelData(listing);
          
          // Create the parcel record
          const parcel = await prisma.parcel.create({
            data: parcelData
          });

          // Link listing to parcel
          await prisma.listing.update({
            where: { id: listing.id },
            data: { parcelId: parcel.id }
          });

          syncedCount++;
          // Small delay to simulate network latency
          await new Promise(r => setTimeout(r, 200));
          
        } catch (err) {
          console.error(`❌ FAILED TO SYNC LISTING ${listing.id}:`, err.message);
        }
      }

      console.log(`◈ SYNC JOB COMPLETE. ${syncedCount} PARCELS UPDATED.`);
      this.isSyncing = false;
      return { status: 'success', synced: syncedCount };

    } catch (error) {
      console.error('❌ CRITICAL SYNC ERROR:', error);
      this.isSyncing = false;
      throw error;
    }
  }

  /**
   * Mock implementation of external data fetching
   * In a production environment, this would hit county GIS APIs or OpenDataSoft
   */
  async fetchExternalParcelData(listing) {
    // Generate deterministic mock data based on listing properties
    const baseValue = listing.price * (3 + Math.random() * 5);
    const ownershipYears = 2 + Math.random() * 20;
    
    return {
      assessedValue: Math.round(baseValue),
      landValue: Math.round(baseValue * 0.8),
      improvementValue: Math.round(baseValue * 0.2),
      lastSalePrice: Math.round(baseValue * 0.9),
      lastSaleDate: new Date(Date.now() - (ownershipYears * 365 * 24 * 60 * 60 * 1000)),
      ownershipYears: parseFloat(ownershipYears.toFixed(1)),
      priorTaxSales: Math.random() > 0.8 ? 1 : 0,
      zoning: listing.acreage > 10 ? "Agricultural/Rural" : "Residential R-1",
      taxDelinquentYears: Math.floor(Math.random() * 5) + 1,
      encumbrances: Math.random() > 0.7 ? ["Utility Easement"] : []
    };
  }
}

// If run directly
if (require.main === module) {
  const worker = new ParcelSyncWorker();
  worker.syncAll()
    .then(res => {
      console.log('✓ Worker finished:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Worker crashed:', err);
      process.exit(1);
    });
}

module.exports = ParcelSyncWorker;
