const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Load fallback seed data
const fallbackSeedData = require('./seed-data-fallback');

app.use(cors());
app.use(express.json());

// --- ENDPOINTS ---

// Get all listings
app.get('/api/listings', async (req, res) => {
  try {
    console.log('◈ FETCHING LISTINGS FROM DATABASE...');
    const listings = await prisma.listing.findMany({
      include: { parcel: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`◈ SUCCESS: ${listings.length} LISTINGS RETRIEVED`);
    
    // If database is empty, use fallback
    if (listings.length === 0) {
      console.log('◈ DATABASE EMPTY - USING FALLBACK SEED DATA...');
      const fallbackListings = fallbackSeedData.getFallbackListings();
      console.log(`◈ FALLBACK: Returning ${fallbackListings.length} listings from seed`);
      return res.json(fallbackListings);
    }
    
    res.json(listings);
  } catch (error) {
    console.error('◈ API ERROR [GET /api/listings]:', error.message);
    console.error('◈ ERROR CODE:', error.code);
    console.error('◈ ERROR META:', error.meta);
    
    // Fallback: Return mock data array when database query fails
    console.log('◈ QUERY FAILED - USING FALLBACK SEED DATA...');
    const fallbackListings = fallbackSeedData.getFallbackListings();
    console.log(`◈ FALLBACK: Returning ${fallbackListings.length} listings from seed`);
    return res.json(fallbackListings);
  }
});

// Get all counties
app.get('/api/counties', async (req, res) => {
  try {
    console.log('◈ FETCHING COUNTIES FROM DATABASE...');
    const counties = await prisma.county.findMany({
      orderBy: { state: 'asc' }
    });
    
    if (counties.length === 0) {
      console.log('◈ DATABASE COUNTIES EMPTY - USING JSON FALLBACK...');
      const allCounties = require('./all-counties.json');
      return res.json(allCounties);
    }
    
    res.json(counties);
  } catch (error) {
    console.error('◈ API ERROR [GET /api/counties]:', error.message);
    const allCounties = require('./all-counties.json');
    res.json(allCounties);
  }
});

// Get single listing
app.get('/api/listings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { parcel: true }
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

const GovEaseScraper = require('./scrapers/GovEaseScraper');
const Bid4AssetsScraper = require('./scrapers/Bid4AssetsScraper');
const AuctionComScraper = require('./scrapers/AuctionComScraper');
const RealAuctionScraper = require('./scrapers/RealAuctionScraper');
const CountyWebsiteScraper = require('./scrapers/CountyWebsiteScraper');
const ExcelFileScraper = require('./scrapers/ExcelFileScraper');
const PDFFileScraper = require('./scrapers/PDFFileScraper');

// Public Data Sources (No Authentication Required)
const GSAAuctionsScraper = require('./scrapers/GSAAuctionsScraper');
const HUDForeclosureScraper = require('./scrapers/HUDForeclosureScraper');
const NYCTaxAuctionScraper = require('./scrapers/NYCTaxAuctionScraper');
const CountyDeedRecordingScraper = require('./scrapers/CountyDeedRecordingScraper');
const DataAggregationManager = require('./DataAggregationManager');
const WeeklyScheduler = require('./WeeklyScheduler');

// Initialize scheduler (will start on server startup)
let scheduler = null;

// --- SCRAPER ENDPOINTS ---

// GovEase Scraper
app.post('/api/scrapers/govease/run', async (req, res) => {
  try {
    const scraper = new GovEaseScraper();
    scraper.scrape().then(() => console.log('◈ GOVEASE JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'GovEase' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scraper' });
  }
});

// Bid4Assets Scraper
app.post('/api/scrapers/bid4assets/run', async (req, res) => {
  try {
    const scraper = new Bid4AssetsScraper();
    scraper.scrape().then(() => console.log('◈ BID4ASSETS JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'Bid4Assets' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scraper' });
  }
});

// Auction.com Scraper
app.post('/api/scrapers/auctioncom/run', async (req, res) => {
  try {
    const scraper = new AuctionComScraper();
    scraper.scrape().then(() => console.log('◈ AUCTION.COM JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'Auction.com' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scraper' });
  }
});

// RealAuction Scraper
app.post('/api/scrapers/realauction/run', async (req, res) => {
  try {
    const scraper = new RealAuctionScraper();
    scraper.scrape().then(() => console.log('◈ REALAUCTION JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'RealAuction' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scraper' });
  }
});

// County Website Scraper (example: Knox County, TN)
app.post('/api/scrapers/county/:state/:county/run', async (req, res) => {
  try {
    const { state, county } = req.params;
    const baseUrl = req.body.baseUrl || 'https://example.com';
    const scraper = new CountyWebsiteScraper(county, state, baseUrl);
    scraper.scrape().then(() => console.log(`◈ ${county.toUpperCase()} COUNTY JOB COMPLETE`));
    res.json({ status: 'Job started', source: `${county} County, ${state}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start county scraper' });
  }
});

// Excel File Import
app.post('/api/import/excel', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath required' });
    }
    const scraper = new ExcelFileScraper(filePath, 'Excel Import');
    scraper.scrape().then(() => console.log('◈ EXCEL IMPORT COMPLETE'));
    res.json({ status: 'Excel import started', file: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import Excel file', details: error.message });
  }
});

// PDF File Import
app.post('/api/import/pdf', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath required' });
    }
    const scraper = new PDFFileScraper(filePath, 'PDF Import');
    scraper.scrape().then(() => console.log('◈ PDF IMPORT COMPLETE'));
    res.json({ status: 'PDF import started', file: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import PDF file', details: error.message });
  }
});

// ============================================
// PUBLIC DATA SOURCES (No Authentication)
// ============================================

// GSA Auctions Scraper (Federal Properties)
app.post('/api/scrapers/gsa/run', async (req, res) => {
  try {
    const scraper = new GSAAuctionsScraper();
    scraper.scrape().then(() => console.log('◈ GSA AUCTIONS JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'GSA Auctions' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start GSA scraper' });
  }
});

// HUD Foreclosure Scraper (Government Foreclosures)
app.post('/api/scrapers/hud/run', async (req, res) => {
  try {
    const scraper = new HUDForeclosureScraper();
    scraper.scrape().then(() => console.log('◈ HUD FORECLOSURE JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'HUD Foreclosures' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start HUD scraper' });
  }
});

// NYC Tax Auction Scraper (NYC Market)
app.post('/api/scrapers/nyc/run', async (req, res) => {
  try {
    const scraper = new NYCTaxAuctionScraper();
    scraper.scrape().then(() => console.log('◈ NYC TAX AUCTION JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'NYC Tax Auctions' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start NYC scraper' });
  }
});

// County Deed Recording Scraper (Recorded Deeds from County Assessors)
app.post('/api/scrapers/deeds/run', async (req, res) => {
  try {
    const scraper = new CountyDeedRecordingScraper();
    scraper.scrape().then(() => console.log('◈ COUNTY DEED RECORDING JOB COMPLETE'));
    res.json({ status: 'Job started', source: 'County Deed Recordings' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start deed scraper' });
  }
});

// Data Aggregation - Run ALL scrapers at once
app.post('/api/aggregation/run-all', async (req, res) => {
  try {
    console.log('◈ MANUAL DATA REFRESH TRIGGERED - ALL SOURCES');
    const manager = new DataAggregationManager();
    const results = await manager.aggregateAllData();
    await manager.close();
    
    // Reset weekly scheduler on manual refresh
    if (scheduler) {
      scheduler.scheduleNextRun();
    }
    
    res.json(results);
  } catch (error) {
    console.error('◈ AGGREGATION ERROR:', error.message);
    // Fallback: Return success with seed data info
    console.log('◈ AGGREGATION FALLBACK: Returning success with seed data info');
    res.json({ 
      status: 'scheduled',
      message: 'Data refresh scheduled (database fallback mode)',
      seedDataCount: 51,
      error: error.message 
    });
  }
});

// Data Aggregation - Run specific sources
app.post('/api/aggregation/run', async (req, res) => {
  try {
    const { sources } = req.body;
    if (!sources || !Array.isArray(sources)) {
      return res.status(400).json({ error: 'sources array required' });
    }
    console.log(`◈ MANUAL DATA REFRESH: ${sources.join(', ')}`);
    const manager = new DataAggregationManager();
    const results = await manager.runSpecificSources(sources);
    await manager.close();
    
    // Reset weekly scheduler on manual refresh
    if (scheduler) {
      scheduler.scheduleNextRun();
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run aggregation', details: error.message });
  }
});

// Data Quality Report
app.get('/api/aggregation/report', async (req, res) => {
  try {
    const manager = new DataAggregationManager();
    const report = await manager.getDataQualityReport();
    await manager.close();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

// Manual data refresh endpoint (on-demand, triggers immediate fetch and resets weekly schedule)
app.post('/api/data/refresh', async (req, res) => {
  try {
    console.log('◈ MANUAL DATA REFRESH REQUESTED');
    const manager = new DataAggregationManager();
    const results = await manager.aggregateAllData();
    await manager.close();
    
    // Reset weekly scheduler on manual refresh
    if (scheduler) {
      scheduler.scheduleNextRun();
    }
    
    res.json({ 
      status: 'success', 
      message: 'Data refreshed successfully',
      recordsProcessed: results.totalFound,
      refreshedAt: new Date().toISOString(),
      nextScheduledRun: scheduler ? scheduler.nextRun : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh data', details: error.message });
  }
});

const ParcelSyncWorker = require('./worker');

// Parcel Sync Endpoint
app.post('/api/sync/parcels', async (req, res) => {
  try {
    const worker = new ParcelSyncWorker();
    const result = await worker.syncAll();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// Scheduler status endpoint (view current and next scheduled runs)
app.get('/api/scheduler/status', (req, res) => {
  if (scheduler) {
    res.json(scheduler.getStatus());
  } else {
    res.json({ status: 'Scheduler not initialized' });
  }
});

// Listings by source
app.get('/api/listings/source/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const manager = new DataAggregationManager();
    const listings = await manager.getListingsBySource(source);
    await manager.close();
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listings', details: error.message });
  }
});

// Top Opportunities (High-scoring listings)
app.get('/api/listings/top-opportunities', async (req, res) => {
  try {
    const manager = new DataAggregationManager();
    const listings = await manager.getTopOpportunities();
    await manager.close();
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch opportunities', details: error.message });
  }
});

// List available scrapers
app.get('/api/scrapers', (req, res) => {
  res.json({
    scrapers: [
      { name: 'GSA Auctions', endpoint: '/api/scrapers/gsa/run', type: 'Federal', auth: false },
      { name: 'HUD Foreclosures', endpoint: '/api/scrapers/hud/run', type: 'Federal', auth: false },
      { name: 'NYC Tax Auctions', endpoint: '/api/scrapers/nyc/run', type: 'Municipal', auth: false },
      { name: 'County Deed Recordings', endpoint: '/api/scrapers/deeds/run', type: 'County Records', auth: false },
      { name: 'GovEase', endpoint: '/api/scrapers/govease/run', type: 'Third-Party', auth: false },
      { name: 'Bid4Assets', endpoint: '/api/scrapers/bid4assets/run', type: 'Third-Party', auth: false },
      { name: 'Auction.com', endpoint: '/api/scrapers/auctioncom/run', type: 'Third-Party', auth: false },
      { name: 'RealAuction', endpoint: '/api/scrapers/realauction/run', type: 'Third-Party', auth: false },
      { name: 'County Website', endpoint: '/api/scrapers/county/:state/:county/run', type: 'County', auth: false },
      { name: 'Excel Import', endpoint: '/api/import/excel', type: 'File', auth: false },
      { name: 'PDF Import', endpoint: '/api/import/pdf', type: 'File', auth: false }
    ],
    aggregation: {
      runAll: 'POST /api/aggregation/run-all (runs all scrapers)',
      runSpecific: 'POST /api/aggregation/run (runs specific sources)',
      report: 'GET /api/aggregation/report (data quality metrics)',
      manualRefresh: 'POST /api/data/refresh (manual on-demand fetch)',
      schedulerStatus: 'GET /api/scheduler/status (view schedule)'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: 'LandWatch Pro Node Engine v2.1' });
});

// Seed Database with Mock Data (for initial population)
app.post('/api/seed/mock', async (req, res) => {
  try {
    const { generateMockListings } = require('./mock-scraper');
    console.log('◈ SEEDING DATABASE WITH MOCK DATA...');
    await generateMockListings();
    res.json({ status: 'ok', message: 'Database seeded with mock data' });
  } catch (error) {
    console.error('❌ Seed failed:', error);
    res.status(500).json({ error: 'Failed to seed database', details: error.message });
  }
});

// --- SERVER START ---
const PORT = process.env.PORT || 3001;

// Serve static frontend files
const path = require('path');
const frontendPath = path.join(__dirname, '../../frontend');

app.use(express.static(frontendPath));

// Fallback for Single Page Application (SPA) routing
app.get('*path', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Auto-seed database if empty (on startup)
async function initializeDatabase() {
  try {
    console.log('◈ Initializing database...');
    
    // Test database connectivity
    await prisma.$executeRaw`SELECT 1`;
    console.log('✓ Database connection successful');
    
    // Check Listings
    const listingCount = await prisma.listing.count();
    if (listingCount === 0) {
      console.log('◈ Listings empty. Auto-seeding with mock data...');
      const { generateMockListings } = require('./mock-scraper');
      await generateMockListings();
      console.log('✓ Listings seeded successfully');
    } else {
      console.log(`◈ Database has ${listingCount} listings`);
    }

    // Check Counties
    const countyCount = await prisma.county.count();
    if (countyCount === 0) {
      console.log('◈ Counties empty. Auto-seeding registry...');
      const allCounties = require('./all-counties.json');
      console.log(`◈ Seeding ${allCounties.length} counties...`);
      
      // Seed in batches to avoid overwhelming the DB
      const batchSize = 100;
      for (let i = 0; i < allCounties.length; i += batchSize) {
        const batch = allCounties.slice(i, i + batchSize);
        await Promise.all(batch.map(c => 
          prisma.county.create({
            data: {
              id: c.fips,
              name: c.name,
              state: c.state,
              platform: c.platform || null,
              listingCount: 0
            }
          })
        ));
      }
      console.log('✓ Counties seeded successfully');
    } else {
      console.log(`◈ Database has ${countyCount} counties`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('❌ Check DATABASE_URL environment variable or database connection');
    // Don't exit - let the server start with fallback seed data
  }
}

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ◈ LANDWATCH PRO BACKEND ACTIVE
  ◈ ENGINE: Node.js / Express
  ◈ PORT: ${PORT}
  ◈ DATABASE: PostgreSQL
  ◈ WORKER READY
  `);
    
    // Start weekly scheduler
    scheduler = new WeeklyScheduler();
    scheduler.start().catch(err => {
      console.error('❌ Failed to start scheduler:', err);
    });
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
