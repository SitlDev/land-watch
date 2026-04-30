const path = require('path');
const { PrismaClient } = require('@prisma/client');

/**
 * DATA AGGREGATION MANAGER
 * Coordinates all data sources and scrapers
 * Fetches auction listings from multiple public sources:
 * - GSA Auctions (Federal properties)
 * - HUD Foreclosures (Government foreclosures)
 * - NYC Tax Auctions (NYC market)
 * - County Assessor Records (When implemented)
 * - OpenDataSoft (County data - When implemented)
 */
class DataAggregationManager {
  constructor() {
    this.prisma = new PrismaClient();
    this.scrapers = {
      gsa: require('./scrapers/GSAAuctionsScraper'),
      hud: require('./scrapers/HUDForeclosureScraper'),
      nyc: require('./scrapers/NYCTaxAuctionScraper'),
      govease: require('./scrapers/GovEaseScraper'),
      bid4assets: require('./scrapers/Bid4AssetsScraper'),
      auction_com: require('./scrapers/AuctionComScraper'),
      realauction: require('./scrapers/RealAuctionScraper'),
      docs: require('./scrapers/DocumentRegistryScraper')
    };

    this.stats = {
      totalListingsFetched: 0,
      successfulSources: [],
      failedSources: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Run all scrapers and aggregate data
   * @param {Object} options - Configuration options
   * @param {Array<string>} options.sources - Specific sources to run (default: all)
   * @param {boolean} options.verbose - Log detailed output
   * @returns {Promise<Object>} Aggregation results
   */
  async aggregateAllData(options = {}) {
    const {
      sources = Object.keys(this.scrapers),
      verbose = true
    } = options;

    this.stats.startTime = Date.now();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     DATA AGGREGATION STARTING                           ║');
    console.log('║     Fetching from multiple public data sources...       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const results = {
      gsa: null,
      hud: null,
      nyc: null,
      govease: null,
      bid4assets: null,
      auction_com: null,
      realauction: null,
      docs: null,
      summary: {
        totalListings: 0,
        successfulSources: 0,
        failedSources: 0,
        duration: 0
      }
    };

    // Priority order: Federal/public sources first, then third-party
    const executionOrder = [
      'gsa',      // Federal - daily updates, nationwide
      'hud',      // Federal foreclosures - real-time, nationwide
      'nyc',      // NYC market - weekly, large metro
      'govease',  // Third-party marketplace
      'bid4assets', // Third-party marketplace
      'auction_com', // Third-party marketplace
      'realauction', // Third-party marketplace
      'docs'       // Fallback document registry
    ];

    for (const sourceKey of executionOrder) {
      if (!sources.includes(sourceKey)) continue;

      try {
        console.log(`\n📍 Running ${sourceKey.toUpperCase()} scraper...`);
        const ScraperClass = this.scrapers[sourceKey];
        const scraper = new ScraperClass();

        const count = await scraper.scrape();
        results[sourceKey] = {
          status: 'success',
          count,
          timestamp: new Date()
        };

        this.stats.successfulSources.push(sourceKey);
        this.stats.totalListingsFetched += count;
        results.summary.successfulSources++;
        results.summary.totalListings += count;

        console.log(`✅ ${sourceKey}: ${count} listings fetched`);

        await scraper.close();
      } catch (error) {
        results[sourceKey] = {
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        };

        this.stats.failedSources.push(sourceKey);
        results.summary.failedSources++;

        console.error(`❌ ${sourceKey}: ${error.message}`);
      }
    }

    this.stats.endTime = Date.now();
    results.summary.duration = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(1);

    // Print final summary
    this.printAggregationSummary(results);

    return results;
  }

  /**
   * Run specific sources
   * @param {Array<string>} sourceNames - Names of sources to run
   * @returns {Promise<Object>} Results
   */
  async runSpecificSources(sourceNames = []) {
    return this.aggregateAllData({ sources: sourceNames });
  }

  /**
   * Get data quality report
   * @returns {Promise<Object>} Quality metrics
   */
  async getDataQualityReport() {
    try {
      const listings = await this.prisma.listing.findMany();

      const report = {
        totalListings: listings.length,
        bySource: {},
        byState: {},
        byType: {},
        priceRange: {
          min: null,
          max: null,
          average: 0
        },
        qualityMetrics: {
          withValidPrices: 0,
          withValidLocations: 0,
          withImages: 0,
          withDescriptions: 0
        }
      };

      let totalPrice = 0;
      let priceCount = 0;

      for (const listing of listings) {
        // By source
        report.bySource[listing.source] = (report.bySource[listing.source] || 0) + 1;

        // By state
        report.byState[listing.state] = (report.byState[listing.state] || 0) + 1;

        // By type
        report.byType[listing.type] = (report.byType[listing.type] || 0) + 1;

        // Price metrics
        if (listing.openingBid) {
          totalPrice += listing.openingBid;
          priceCount++;
          if (!report.priceRange.min || listing.openingBid < report.priceRange.min) {
            report.priceRange.min = listing.openingBid;
          }
          if (!report.priceRange.max || listing.openingBid > report.priceRange.max) {
            report.priceRange.max = listing.openingBid;
          }
        }

        // Quality metrics
        if (listing.openingBid) report.qualityMetrics.withValidPrices++;
        if (listing.county && listing.state) report.qualityMetrics.withValidLocations++;
        if (listing.description) report.qualityMetrics.withDescriptions++;
      }

      if (priceCount > 0) {
        report.priceRange.average = (totalPrice / priceCount).toFixed(2);
      }

      return report;
    } catch (error) {
      console.error('❌ Error generating quality report:', error);
      throw error;
    }
  }

  /**
   * Get listings by source
   * @param {string} source - Source name
   * @returns {Promise<Array>} Listings
   */
  async getListingsBySource(source) {
    return this.prisma.listing.findMany({
      where: { source },
      include: { parcel: true }
    });
  }

  /**
   * Get listings by state
   * @param {string} state - State abbreviation
   * @returns {Promise<Array>} Listings
   */
  async getListingsByState(state) {
    return this.prisma.listing.findMany({
      where: { state: state.toUpperCase() },
      include: { parcel: true }
    });
  }

  /**
   * Get listings by county
   * @param {string} county - County name
   * @param {string} state - State abbreviation
   * @returns {Promise<Array>} Listings
   */
  async getListingsByCounty(county, state) {
    return this.prisma.listing.findMany({
      where: {
        county: { equals: county },
        state: state.toUpperCase()
      },
      include: { parcel: true }
    });
  }

  /**
   * Get high-opportunity listings (score > 75)
   * @returns {Promise<Array>} Premium listings
   */
  async getTopOpportunities() {
    return this.prisma.listing.findMany({
      where: { score: { gte: 75 } },
      orderBy: { score: 'desc' },
      take: 100,
      include: { parcel: true }
    });
  }

  /**
   * Print aggregation summary
   * @private
   */
  printAggregationSummary(results) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     AGGREGATION COMPLETE                                ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Total Listings: ${String(results.summary.totalListings).padEnd(46)}║`);
    console.log(`║  Successful Sources: ${String(results.summary.successfulSources).padEnd(40)}║`);
    console.log(`║  Failed Sources: ${String(results.summary.failedSources).padEnd(44)}║`);
    console.log(`║  Duration: ${String(`${results.summary.duration}s`).padEnd(50)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Detailed breakdown
    console.log('DETAILED RESULTS:');
    for (const [source, result] of Object.entries(results)) {
      if (source !== 'summary' && result) {
        if (result.status === 'success') {
          console.log(`  ✅ ${source.padEnd(15)} ${result.count} listings`);
        } else {
          console.log(`  ❌ ${source.padEnd(15)} ${result.error}`);
        }
      }
    }
    console.log();
  }

  /**
   * Cleanup and disconnect
   */
  async close() {
    await this.prisma.$disconnect();
  }
}

module.exports = DataAggregationManager;
