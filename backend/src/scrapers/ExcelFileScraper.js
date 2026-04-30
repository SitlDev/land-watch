const BaseScraper = require('../lib/BaseScraper');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * Excel File Scraper
 * Parses Excel (.xlsx) files containing auction/deed listings
 * Expected columns: Title, County, State, Acreage, Price, AuctionDate, Type
 */
class ExcelFileScraper extends BaseScraper {
  constructor(filePath, source = 'Excel Import') {
    super(source);
    this.filePath = filePath;
    this.prisma = require('@prisma/client').PrismaClient;
  }

  async scrape() {
    try {
      console.log(`◈ PARSING EXCEL FILE: ${this.filePath}...`);
      
      if (!fs.existsSync(this.filePath)) {
        throw new Error(`File not found: ${this.filePath}`);
      }

      const listings = await this.parseExcelFile();
      const prisma = new this.prisma();
      
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
      console.error(`◈ EXCEL PARSE ERROR:`, error);
      await this.updateJobStatus('failed', 0, 1);
    }
  }

  async parseExcelFile() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    const worksheet = workbook.getWorksheet(1);

    const listings = [];
    const headers = {};

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Parse header row
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value?.toString().toLowerCase() || '';
        });
        return;
      }

      try {
        const values = row.values;
        const listing = {
          title: (values[1] || '').toString().trim(),
          county: (values[2] || '').toString().trim(),
          state: (values[3] || '').toString().trim().toUpperCase(),
          acreage: parseFloat(values[4]) || 0,
          price: parseFloat(values[5]) || 0,
          pricePerAcre: 0,
          auctionType: (values[7] || 'Tax Deed').toString().trim(),
          source: this.sourceName,
          sourceUrl: this.filePath,
          auctionDate: this.parseDate(values[6]) || new Date(),
          closingDays: parseInt(values[8]) || 30,
          score: Math.floor(Math.random() * 40 + 60),
          lat: parseFloat(values[9]) || null,
          lng: parseFloat(values[10]) || null,
          summary: (values[11] || `Auction in ${values[2]} County, ${values[3]}`).toString(),
          flags: ['Imported from Excel'],
          action: 'Research'
        };

        // Calculate pricePerAcre
        if (listing.acreage > 0) {
          listing.pricePerAcre = Math.round(listing.price / listing.acreage);
        }

        if (listing.title && listing.county && listing.state) {
          listings.push(listing);
        }
      } catch (e) {
        console.warn(`◈ Row ${rowNumber} parse error: ${e.message}`);
      }
    });

    return listings;
  }

  parseDate(dateValue) {
    if (!dateValue) return null;
    
    if (typeof dateValue === 'number') {
      return new Date((dateValue - 25569) * 86400 * 1000);
    }
    
    const parsed = new Date(dateValue);
    return isNaN(parsed) ? null : parsed;
  }
}

module.exports = ExcelFileScraper;
