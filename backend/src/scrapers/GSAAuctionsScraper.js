const BaseScraper = require('../lib/BaseScraper');
const axios = require('axios');

/**
 * GSA Auctions Scraper
 * Fetches real property auctions from https://gsaauctions.gov/
 * No authentication required. Daily updates nationwide.
 * Data includes: Real property, vehicles, equipment with detailed descriptions
 */
class GSAAuctionsScraper extends BaseScraper {
  constructor() {
    super('GSA Auctions');
    this.baseUrl = 'https://gsaauctions.gov/';
    this.searchUrl = 'https://gsaauctions.gov/gsaauctions/searchresults';
  }

  /**
   * Search GSA auctions by property type and state
   * @param {string} state - State abbreviation (e.g., 'CA', 'TX')
   * @returns {Promise<Array>} Array of auction listings
   */
  async scrapeByState(state) {
    try {
      console.log(`◈ Fetching GSA auctions for ${state}...`);

      const listings = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 5) {
        // Simulate pagination through GSA results
        const results = await this.fetchGSAPage(state, page);
        
        if (results.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of results) {
          const listing = await this.parseGSAListing(item);
          if (listing) {
            listings.push(listing);
            await this.saveListing(listing);
          }
        }

        page++;
      }

      return listings;
    } catch (error) {
      console.error(`❌ GSA scrape error for ${state}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch a page of GSA auction results
   * @private
   */
  async fetchGSAPage(state, pageNum) {
    try {
      // GSA Auctions API endpoint for real property
      const params = {
        q: `state:${state} category:"Real Property"`,
        page: pageNum,
        rows: 20
      };

      const response = await axios.get(this.searchUrl, {
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Accept': 'application/json'
        }
      });

      // Parse response based on GSA's actual structure
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error(`❌ GSA page fetch error (page ${pageNum}):`, error.message);
      return [];
    }
  }

  /**
   * Parse a single GSA auction listing
   * @private
   */
  async parseGSAListing(item) {
    try {
      if (!item.description || !item.location) {
        return null;
      }

      // Extract location details
      const [county, state] = this.parseLocation(item.location);

      return {
        title: item.description || 'GSA Property Auction',
        county,
        state: state || 'Unknown',
        type: 'Government Auction',
        source: 'GSA Auctions',
        url: item.url || `${this.baseUrl}${item.id}`,
        auctionDate: this.parseDate(item.dateOpen),
        closingDate: this.parseDate(item.dateClosed),
        openingBid: this.parsePrice(item.openingBid),
        currentBid: this.parsePrice(item.currentBid),
        estimatedValue: this.parsePrice(item.estimatedValue),
        acreage: this.parseAcreage(item.acreage),
        description: this.buildDescription(item),
        location: item.location,
        status: item.auctionStatus || 'active',
        score: this.calculateScore(item)
      };
    } catch (error) {
      console.error('❌ Error parsing GSA listing:', error.message);
      return null;
    }
  }

  /**
   * Parse location string (County, State format)
   * @private
   */
  parseLocation(locationStr) {
    if (!locationStr) return ['Unknown', 'Unknown'];
    
    const parts = locationStr.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return [parts[0], parts[parts.length - 1]];
    }
    return [parts[0] || 'Unknown', 'Unknown'];
  }

  /**
   * Parse date string from GSA format
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
   * Parse price from various formats
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
   * Parse acreage
   * @private
   */
  parseAcreage(acreageStr) {
    if (!acreageStr) return null;
    const num = parseFloat(String(acreageStr).replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : num;
  }

  /**
   * Build description from item details
   * @private
   */
  buildDescription(item) {
    const parts = [
      `Property: ${item.description}`,
      `Location: ${item.location}`,
      item.acreage ? `Acreage: ${item.acreage}` : null,
      item.estimatedValue ? `Estimated Value: $${this.parsePrice(item.estimatedValue).toLocaleString()}` : null,
      `Auction Status: ${item.auctionStatus || 'Active'}`
    ].filter(p => p !== null);

    return parts.join('\n');
  }

  /**
   * Calculate opportunity score (0-100)
   * @private
   */
  calculateScore(item) {
    let score = 50; // Base score

    // Adjust based on opening bid vs estimated value
    const openingBid = this.parsePrice(item.openingBid);
    const estValue = this.parsePrice(item.estimatedValue);
    
    if (openingBid && estValue && openingBid < estValue * 0.5) {
      score += 20; // Good opportunity
    }

    // Bonus for active auctions
    if (item.auctionStatus === 'active') {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Main scrape method - fetch all GSA auctions
   */
  async scrape() {
    console.log('◈ GSA AUCTIONS SCRAPER STARTING...');
    const startTime = Date.now();

    try {
      // Fetch from major states first
      const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'AZ'];
      let totalListings = 0;

      for (const state of states) {
        const listings = await this.scrapeByState(state);
        totalListings += listings.length;
        console.log(`✓ ${state}: ${listings.length} listings`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ GSA SCRAPE COMPLETE: ${totalListings} listings in ${duration}s`);

      await this.updateJobStatus('completed', totalListings, []);
      return totalListings;
    } catch (error) {
      console.error('❌ GSA scrape failed:', error);
      await this.updateJobStatus('error', 0, [error.message]);
      throw error;
    }
  }
}

module.exports = GSAAuctionsScraper;
