const BaseScraper = require('../lib/BaseScraper');

/**
 * Generic County Website Scraper
 * Template for scraping county assessor and tax auction websites
 * Extend this class and override scrapeAuctions() for specific counties
 */
class CountyWebsiteScraper extends BaseScraper {
  constructor(countyName, state, baseUrl, selector = {}) {
    super(`${countyName} County (${state})`);
    this.countyName = countyName;
    this.state = state;
    this.baseUrl = baseUrl;
    this.selectors = selector; // CSS selectors for parsing
  }

  async scrape() {
    await this.init();
    try {
      console.log(`◈ CRAWLING ${this.countyName} County website...`);
      const listings = await this.scrapeAuctions();
      
      for (const item of listings) {
        await this.saveListing(item);
      }
      await this.updateJobStatus('success', listings.length, 0);
    } catch (error) {
      console.error(`◈ SCRAPE ERROR (${this.countyName}):`, error);
      await this.updateJobStatus('failed', 0, 1);
    } finally {
      await this.close();
    }
  }

  async scrapeAuctions() {
    // Override this method in subclasses or pass custom logic
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Default: extract from table rows
      const listings = await this.page.locator('tr').all();
      const results = [];
      
      for (let i = 1; i < Math.min(listings.length, 20); i++) {
        try {
          const cells = await listings[i].locator('td').allTextContents();
          if (cells.length < 3) continue;
          
          results.push({
            title: `${cells[0].trim()} - ${this.countyName} County`,
            state: this.state,
            county: this.countyName,
            acreage: parseFloat(cells[1]) || 0,
            price: this.parsePrice(cells[2]),
            pricePerAcre: 0,
            auctionType: 'Tax Deed',
            source: this.sourceName,
            sourceUrl: this.baseUrl,
            auctionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            closingDays: 30,
            score: Math.floor(Math.random() * 40 + 60),
            lat: null,
            lng: null,
            summary: `Tax auction listing from ${this.countyName} County`,
            flags: ['County Tax Sale'],
            action: 'Research'
          });
        } catch (e) {
          console.warn(`◈ Row parse error: ${e.message}`);
        }
      }
      
      return results;
    } catch (e) {
      console.error(`◈ Navigation error: ${e.message}`);
      return [];
    }
  }

  parsePrice(priceStr) {
    const match = priceStr.replace(/[^\d.]/g, '');
    return parseFloat(match) || 0;
  }
}

module.exports = CountyWebsiteScraper;
