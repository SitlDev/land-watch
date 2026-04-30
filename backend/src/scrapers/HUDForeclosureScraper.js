const BaseScraper = require('../lib/BaseScraper');
const axios = require('axios');

/**
 * HUD Foreclosure Scraper
 * Fetches foreclosure listings from HUD Homestore (https://www.hud.gov/)
 * No authentication required. Real-time updates nationwide.
 * Data includes: HUD-owned properties, foreclosures with prices and status
 */
class HUDForeclosureScraper extends BaseScraper {
  constructor() {
    super('HUD Foreclosures');
    // HUD Homestore data source (public endpoint)
    this.baseUrl = 'https://data.hud.gov/api';
    this.datasetId = 'fksq-kh7s'; // HUD-owned properties dataset
  }

  /**
   * Search HUD foreclosures by state
   * @param {string} state - State abbreviation (e.g., 'CA', 'TX')
   * @returns {Promise<Array>} Array of foreclosure listings
   */
  async scrapeByState(state) {
    try {
      console.log(`◈ Fetching HUD foreclosures for ${state}...`);

      // Query HUD Socrata API
      const query = `state_code='${state}'`;
      const listings = await this.queryHUDAPI(query, state);

      for (const listing of listings) {
        const parsed = await this.parseHUDProperty(listing);
        if (parsed) {
          await this.saveListing(parsed);
        }
      }

      return listings;
    } catch (error) {
      console.error(`❌ HUD scrape error for ${state}:`, error.message);
      return [];
    }
  }

  /**
   * Query HUD Socrata API (public data portal)
   * @private
   */
  async queryHUDAPI(where, state) {
    try {
      // HUD uses Socrata API for public data
      const url = `${this.baseUrl}/resource/${this.datasetId}.json`;
      
      const params = {
        $where: where,
        $limit: 50000,
        $offset: 0,
        $select: '*'
      };

      const response = await axios.get(url, {
        params,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        }
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`❌ HUD API error:`, error.message);
      return [];
    }
  }

  /**
   * Parse a single HUD property listing
   * @private
   */
  async parseHUDProperty(property) {
    try {
      if (!property.street_address || !property.city || !property.state_code) {
        return null;
      }

      // Extract structured data from HUD property
      const county = this.inferCounty(property);
      const price = this.parsePrice(property.list_price || property.sale_price);
      const bedrooms = parseInt(property.bedrooms) || 0;
      const bathrooms = parseInt(property.bathrooms) || 0;

      return {
        title: `HUD Property - ${property.street_address}`,
        county: county || 'Unknown',
        state: property.state_code,
        type: 'HUD Foreclosure',
        source: 'HUD Homestore',
        url: `https://www.hudhomestore.com/properties/${property.property_id || ''}`,
        address: property.street_address,
        city: property.city,
        zipCode: property.zip_code,
        openingBid: price,
        currentBid: this.parsePrice(property.current_price),
        estimatedValue: this.parsePrice(property.estimated_value),
        acreage: this.parseAcreage(property.lot_size),
        bedrooms,
        bathrooms,
        squareFeet: parseInt(property.square_feet) || 0,
        description: this.buildDescription(property),
        status: property.property_status || 'Available',
        listingDate: this.parseDate(property.list_date),
        score: this.calculateScore(property),
        latitude: property.latitude,
        longitude: property.longitude
      };
    } catch (error) {
      console.error('❌ Error parsing HUD property:', error.message);
      return null;
    }
  }

  /**
   * Infer county from address or property data
   * @private
   */
  inferCounty(property) {
    // Check if county is directly provided
    if (property.county || property.county_name) {
      return property.county || property.county_name;
    }

    // Could use reverse geocoding here, but for now return city
    return property.city || 'Unknown';
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
   * Parse lot size/acreage
   * @private
   */
  parseAcreage(lotSizeStr) {
    if (!lotSizeStr) return null;
    const num = parseFloat(String(lotSizeStr).replace(/[^\d.]/g, ''));
    return isNaN(num) ? null : num;
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
      `Address: ${property.street_address}, ${property.city}, ${property.state_code} ${property.zip_code}`,
      property.bedrooms ? `Bedrooms: ${property.bedrooms}` : null,
      property.bathrooms ? `Bathrooms: ${property.bathrooms}` : null,
      property.square_feet ? `Square Feet: ${property.square_feet}` : null,
      property.lot_size ? `Lot Size: ${property.lot_size}` : null,
      property.list_price ? `List Price: $${this.parsePrice(property.list_price).toLocaleString()}` : null,
      property.property_status ? `Status: ${property.property_status}` : null,
      'Source: HUD Homestore (U.S. Department of Housing and Urban Development)'
    ].filter(p => p !== null);

    return parts.join('\n');
  }

  /**
   * Calculate opportunity score (0-100)
   * @private
   */
  calculateScore(property) {
    let score = 50; // Base score

    // Adjust based on price discount
    const listPrice = this.parsePrice(property.list_price);
    const estValue = this.parsePrice(property.estimated_value);
    
    if (listPrice && estValue && listPrice < estValue * 0.7) {
      score += 25; // Excellent opportunity
    } else if (listPrice && estValue && listPrice < estValue * 0.85) {
      score += 15; // Good opportunity
    }

    // Bonus for residential properties with good specs
    if (property.bedrooms >= 3) {
      score += 10;
    }

    // Bonus for recently listed
    const listDate = this.parseDate(property.list_date);
    if (listDate) {
      const daysSinceListed = (Date.now() - listDate.getTime()) / (1000 * 86400);
      if (daysSinceListed < 30) {
        score += 5;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Main scrape method - fetch all HUD foreclosures
   */
  async scrape() {
    console.log('◈ HUD FORECLOSURE SCRAPER STARTING...');
    const startTime = Date.now();

    try {
      // HUD covers all states
      const stateCodes = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
      ];

      let totalListings = 0;
      let errors = [];

      // Fetch from top 15 states first (by population)
      const topStates = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'WA', 'AZ', 'MA'];

      for (const state of topStates) {
        try {
          const listings = await this.scrapeByState(state);
          totalListings += listings.length;
          console.log(`✓ ${state}: ${listings.length} foreclosures`);
        } catch (err) {
          errors.push(`${state}: ${err.message}`);
          console.log(`✗ ${state}: ${err.message}`);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ HUD SCRAPE COMPLETE: ${totalListings} foreclosures in ${duration}s`);

      await this.updateJobStatus('completed', totalListings, errors);
      return totalListings;
    } catch (error) {
      console.error('❌ HUD scrape failed:', error);
      await this.updateJobStatus('error', 0, [error.message]);
      throw error;
    }
  }
}

module.exports = HUDForeclosureScraper;
