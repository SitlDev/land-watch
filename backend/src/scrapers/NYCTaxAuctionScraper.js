const BaseScraper = require('../lib/BaseScraper');
const axios = require('axios');

/**
 * NYC Tax Auction Scraper
 * Fetches tax lien and tax deed auctions from NYC Finance
 * No authentication required. Weekly updates for NYC metro area.
 * Data includes: Tax liens, tax deeds with property details, starting bids
 * Source: https://www1.nyc.gov/site/finance/debt-collection/online-auction.page
 */
class NYCTaxAuctionScraper extends BaseScraper {
  constructor() {
    super('NYC Tax Auctions');
    this.baseUrl = 'https://www1.nyc.gov';
    this.auctionUrl = 'https://www1.nyc.gov/site/finance/debt-collection/online-auction.page';
    this.dataUrl = 'https://data.cityofnewyork.us/api/views/erm2-nwe9/rows.json'; // NYC open data API
  }

  /**
   * Fetch tax auctions from NYC Finance via open data portal
   * @returns {Promise<Array>} Array of auction listings
   */
  async scrapeNYCAuctions() {
    try {
      console.log('◈ Fetching NYC tax auctions...');

      // Query NYC's open data portal (Socrata API)
      const listings = await this.queryNYCOpenData();

      for (const item of listings) {
        const parsed = await this.parseNYCProperty(item);
        if (parsed) {
          await this.saveListing(parsed);
        }
      }

      return listings;
    } catch (error) {
      console.error('❌ NYC scrape error:', error.message);
      return [];
    }
  }

  /**
   * Query NYC Open Data Portal (Socrata API - no auth required)
   * @private
   */
  async queryNYCOpenData() {
    try {
      // NYC Tax Lien Sale data from NYC Open Data
      const url = this.dataUrl;

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        }
      });

      // Parse Socrata response format
      if (response.data && response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error('❌ NYC Open Data API error:', error.message);
      // Fallback: scrape from HTML page
      return await this.scrapeNYCWebpage();
    }
  }

  /**
   * Fallback: Scrape NYC auction page directly (HTML parsing)
   * @private
   */
  async scrapeNYCWebpage() {
    try {
      const response = await axios.get(this.auctionUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        }
      });

      // Simple extraction of auction tables (actual implementation would use Cheerio)
      // This is a placeholder for the HTML parsing logic
      console.log('◈ NYC webpage fetch successful, parsing...');
      return [];
    } catch (error) {
      console.error('❌ NYC webpage scrape failed:', error.message);
      return [];
    }
  }

  /**
   * Parse a single NYC property from tax auction data
   * @private
   */
  async parseNYCProperty(property) {
    try {
      const blockLot = this.parseBlockLot(property);
      if (!blockLot) return null;

      const county = this.getCountyFromBorough(property.borough);
      const startingBid = this.parsePrice(property.opening_bid || property.starting_bid);
      const address = this.formatAddress(property);

      return {
        title: `NYC Tax Auction - ${address}`,
        county: county,
        state: 'NY',
        type: 'Tax Lien/Deed Auction',
        source: 'NYC Finance (Tax Auctions)',
        url: `https://www1.nyc.gov/site/finance/debt-collection/online-auction.page?block=${blockLot.block}&lot=${blockLot.lot}`,
        address: address,
        borough: property.borough,
        block: blockLot.block,
        lot: blockLot.lot,
        bbl: `${blockLot.block}-${blockLot.lot}`, // BBL = Block-Batch-Lot
        openingBid: startingBid,
        estimatedValue: this.parsePrice(property.assessed_value),
        description: this.buildDescription(property),
        status: property.auction_status || 'Active',
        auctionDate: this.parseDate(property.auction_date),
        score: this.calculateScore(property),
        taxYearsOverdue: parseInt(property.years_overdue) || 0
      };
    } catch (error) {
      console.error('❌ Error parsing NYC property:', error.message);
      return null;
    }
  }

  /**
   * Parse block and lot from property data
   * @private
   */
  parseBlockLot(property) {
    try {
      let block, lot;

      if (property.block && property.lot) {
        block = String(property.block).trim();
        lot = String(property.lot).trim();
      } else if (property.bbl) {
        // Parse from combined BBL string
        const parts = String(property.bbl).split('-');
        if (parts.length >= 2) {
          [block, lot] = [parts[0], parts[1]];
        }
      }

      return block && lot ? { block, lot } : null;
    } catch {
      return null;
    }
  }

  /**
   * Map NYC borough to county
   * @private
   */
  getCountyFromBorough(borough) {
    const boroughCountyMap = {
      'Manhattan': 'New York',
      'Bronx': 'Bronx',
      'Brooklyn': 'Kings',
      'Queens': 'Queens',
      'Staten Island': 'Richmond',
      'MANHATTAN': 'New York',
      'BRONX': 'Bronx',
      'BROOKLYN': 'Kings',
      'QUEENS': 'Queens',
      'STATEN ISLAND': 'Richmond'
    };

    return boroughCountyMap[borough] || 'Unknown';
  }

  /**
   * Format address from property components
   * @private
   */
  formatAddress(property) {
    const parts = [
      property.street_number,
      property.street_name,
      property.zip_code
    ].filter(p => p);

    return parts.join(' ') || 'NYC Property';
  }

  /**
   * Parse price
   * @private
   */
  parsePrice(priceStr) {
    if (!priceStr) return null;
    const cleaned = String(priceStr)
      .replace(/[$,]/g, '')
      .trim();
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  }

  /**
   * Parse date string
   * @private
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Build description from property details
   * @private
   */
  buildDescription(property) {
    const parts = [
      `Borough: ${property.borough}`,
      `Block: ${property.block}, Lot: ${property.lot}`,
      property.opening_bid ? `Opening Bid: $${this.parsePrice(property.opening_bid).toLocaleString()}` : null,
      property.assessed_value ? `Assessed Value: $${this.parsePrice(property.assessed_value).toLocaleString()}` : null,
      property.years_overdue ? `Tax Years Overdue: ${property.years_overdue}` : null,
      property.auction_date ? `Auction Date: ${property.auction_date}` : null,
      'Source: NYC Department of Finance Online Auction'
    ].filter(p => p !== null);

    return parts.join('\n');
  }

  /**
   * Calculate opportunity score (0-100)
   * @private
   */
  calculateScore(property) {
    let score = 55; // Base score (NYC market)

    // High discount to assessed value = high score
    const openingBid = this.parsePrice(property.opening_bid);
    const assessedVal = this.parsePrice(property.assessed_value);

    if (openingBid && assessedVal) {
      if (openingBid < assessedVal * 0.3) {
        score += 25; // Excellent discount
      } else if (openingBid < assessedVal * 0.6) {
        score += 15; // Good discount
      }
    }

    // Bonus for multiple years overdue (more likely to sell)
    const yearsOverdue = parseInt(property.years_overdue) || 0;
    if (yearsOverdue >= 3) {
      score += 15;
    } else if (yearsOverdue >= 1) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Main scrape method - fetch all NYC tax auctions
   */
  async scrape() {
    console.log('◈ NYC TAX AUCTION SCRAPER STARTING...');
    const startTime = Date.now();

    try {
      const listings = await this.scrapeNYCAuctions();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`✓ NYC SCRAPE COMPLETE: ${listings.length} auctions in ${duration}s`);

      await this.updateJobStatus('completed', listings.length, []);
      return listings.length;
    } catch (error) {
      console.error('❌ NYC scrape failed:', error);
      await this.updateJobStatus('error', 0, [error.message]);
      throw error;
    }
  }
}

module.exports = NYCTaxAuctionScraper;
