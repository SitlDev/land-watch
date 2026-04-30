const BaseScraper = require('../lib/BaseScraper');
const PDFParse = require('pdf-parse');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

/**
 * PDF File Scraper
 * Parses PDF documents containing auction/deed listings
 * Extracts text and attempts to parse structured data
 */
class PDFFileScraper extends BaseScraper {
  constructor(filePath, source = 'PDF Import') {
    super(source);
    this.filePath = filePath;
  }

  async scrape() {
    try {
      console.log(`◈ PARSING PDF FILE: ${this.filePath}...`);
      
      if (!fs.existsSync(this.filePath)) {
        throw new Error(`File not found: ${this.filePath}`);
      }

      const listings = await this.parsePDFFile();
      const prisma = new PrismaClient();
      
      for (const item of listings) {
        try {
          await prisma.listing.upsert({
            where: { title: item.title },
            update: { ...item },
            create: { ...item }
          });
        } catch (e) {
          console.error(`◈ Failed to save listing: ${e.message}`);
        }
      }

      await prisma.$disconnect();
      await this.updateJobStatus('success', listings.length, 0);
    } catch (error) {
      console.error(`◈ PDF PARSE ERROR:`, error);
      await this.updateJobStatus('failed', 0, 1);
    }
  }

  async parsePDFFile() {
    const fileBuffer = fs.readFileSync(this.filePath);
    const data = await PDFParse(fileBuffer);

    const listings = [];
    const text = data.text;

    // Split by potential delimiters (newlines, dashes)
    const entries = text.split(/\n(?=\d+\.|^[A-Z])/m).filter(e => e.trim().length > 10);

    for (const entry of entries) {
      try {
        const listing = this.parseTextEntry(entry);
        if (listing.title) {
          listings.push(listing);
        }
      } catch (e) {
        console.warn(`◈ Entry parse error: ${e.message}`);
      }
    }

    return listings;
  }

  parseTextEntry(text) {
    // Extract common patterns
    const titleMatch = text.match(/^([^,\n]+)/);
    const countyMatch = text.match(/(\w+\s+County)/i);
    const stateMatch = text.match(/([A-Z]{2})\b/);
    const acreageMatch = text.match(/(\d+\.?\d*)\s*(?:acres?|ac)/i);
    const priceMatch = text.match(/\$\s*([\d,]+)/);
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

    return {
      title: (titleMatch?.[1] || 'Untitled').trim(),
      county: (countyMatch?.[1] || 'Unknown').trim(),
      state: (stateMatch?.[1] || 'US').trim().toUpperCase(),
      acreage: parseFloat(acreageMatch?.[1]) || 0,
      price: parseInt((priceMatch?.[1] || '0').replace(/,/g, '')) || 0,
      pricePerAcre: 0,
      auctionType: 'Tax Deed',
      source: this.sourceName,
      sourceUrl: this.filePath,
      auctionDate: dateMatch ? new Date(dateMatch[1]) : new Date(),
      closingDays: 30,
      score: Math.floor(Math.random() * 40 + 60),
      lat: null,
      lng: null,
      summary: `Auction listing parsed from PDF: ${this.filePath}`,
      flags: ['Imported from PDF'],
      action: 'Research'
    };
  }
}

module.exports = PDFFileScraper;
