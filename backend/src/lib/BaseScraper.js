const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');

class BaseScraper {
  constructor(sourceName) {
    this.sourceName = sourceName;
    this.prisma = new PrismaClient();
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log(`◈ INITIALIZING SCRAPER: ${this.sourceName}...`);
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async close() {
    console.log(`◈ CLOSING SCRAPER: ${this.sourceName}...`);
    if (this.browser) await this.browser.close();
    await this.prisma.$disconnect();
  }

  // To be implemented by subclasses
  async scrape() {
    throw new Error('scrape() must be implemented');
  }

  async saveListing(data) {
    // Validate required fields
    const required = ['title', 'state', 'county', 'price', 'source'];
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        console.warn(`◈ SKIPPING: Missing required field '${field}' in ${data.title || 'unnamed listing'}`);
        return;
      }
    }

    // Sanitize numeric fields to prevent NaN errors in Prisma
    data.price = parseFloat(data.price) || 0;
    data.acreage = parseFloat(data.acreage) || 0;
    data.pricePerAcre = data.acreage > 0 ? data.price / data.acreage : 0;
    data.score = parseInt(data.score) || 50;
    data.closingDays = parseInt(data.closingDays) || 30;

    console.log(`◈ SAVING SIGNAL: ${data.title}...`);
    try {
      // Extract parcel data from listing
      const parcelData = {
        assessedValue: parseFloat(data.assessedValue) || data.price * 1.1 || 0,
        landValue: parseFloat(data.landValue) || data.price * 0.7 || 0,
        improvementValue: parseFloat(data.improvementValue) || data.price * 0.3 || 0,
        lastSalePrice: parseFloat(data.lastSalePrice) || data.price || 0,
        lastSaleDate: data.lastSaleDate ? new Date(data.lastSaleDate) : new Date(),
        ownershipYears: parseFloat(data.ownershipYears) || Math.random() * 30,
        priorTaxSales: parseInt(data.priorTaxSales) || 0,
        zoning: data.zoning || 'Commercial',
        encumbrances: Array.isArray(data.encumbrances) ? data.encumbrances : [],
        taxDelinquentYears: parseInt(data.taxDelinquentYears) || 0,
      };

      // Remove parcel fields from listing data
      const { 
        assessedValue, landValue, improvementValue, lastSalePrice, lastSaleDate, 
        ownershipYears, priorTaxSales, zoning, encumbrances, taxDelinquentYears, 
        ...listingData 
      } = data;

      // Ensure listingData has a valid auctionDate
      if (!listingData.auctionDate) {
        listingData.auctionDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // Default 30 days out
      } else {
        listingData.auctionDate = new Date(listingData.auctionDate);
      }

      // Check if listing already exists
      const existingListing = await this.prisma.listing.findUnique({
        where: { title: data.title },
        include: { parcel: true }
      });

      if (existingListing && existingListing.parcelId) {
        // Update existing parcel and listing
        await this.prisma.parcel.update({
          where: { id: existingListing.parcelId },
          data: parcelData
        });
        return await this.prisma.listing.update({
          where: { title: data.title },
          data: { ...listingData, updatedAt: new Date() }
        });
      } else {
        // Create new parcel and listing
        const parcel = await this.prisma.parcel.create({
          data: parcelData
        });
        
        // Link listing to the new parcel
        return await this.prisma.listing.upsert({
          where: { title: data.title },
          update: { ...listingData, parcelId: parcel.id, updatedAt: new Date() },
          create: { ...listingData, parcelId: parcel.id }
        });
      }
    } catch (error) {
      console.error(`◈ FAILED TO SAVE: ${data.title}`, error.message);
    }
  }

  async updateJobStatus(status, found = 0, errors = 0) {
    console.log(`◈ JOB STATUS: ${status} | FOUND: ${found} | ERRORS: ${errors}`);
    // Logic to update a ScrapeJob table if we add one later
  }
}

module.exports = BaseScraper;
