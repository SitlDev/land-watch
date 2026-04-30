# LandMatter Scraper Framework

Complete scraper implementation for collecting land deed auctions from multiple sources.

## Architecture Overview

```
Backend Scraper System:
├── BaseScraper (foundation)
│   └── Extends: Playwright automation, Prisma ORM integration, error handling
├── County Website Scrapers (direct from assessor websites)
├── File-Based Scrapers (Excel, PDF imports)
└── Third-Party Marketplace Scrapers (Bid4Assets, Auction.com, RealAuction)
```

## Available Scrapers

### 1. **Third-Party Marketplaces** (Automated Web Scraping)

#### GovEase
```bash
curl -X POST http://localhost:3001/api/scrapers/govease/run
```
- **Source**: https://www.govease.com
- **Coverage**: National tax deed database
- **Frequency**: Can be run on schedule

#### Bid4Assets
```bash
curl -X POST http://localhost:3001/api/scrapers/bid4assets/run
```
- **Source**: https://www.bid4assets.com
- **Coverage**: Foreclosure and tax auctions nationwide
- **Data**: Title, county, acreage, price, closing dates

#### Auction.com
```bash
curl -X POST http://localhost:3001/api/scrapers/auctioncom/run
```
- **Source**: https://www.auction.com
- **Coverage**: Real estate auctions, tax sales, foreclosures
- **Data**: Property details, location, valuation

#### RealAuction
```bash
curl -X POST http://localhost:3001/api/scrapers/realauction/run
```
- **Source**: https://www.realauctionusa.com
- **Coverage**: National real estate auction platform
- **Data**: Parcel info, zoning, assessed value

### 2. **County-Level Scrapers** (Direct from County Assessor Websites)

For any US county with an online auction/deed registry:

```bash
curl -X POST http://localhost:3001/api/scrapers/county/STATE/COUNTY/run \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "https://county-tax-assessor-website.com"}'
```

**Examples:**

```bash
# Knox County, Tennessee
curl -X POST http://localhost:3001/api/scrapers/county/TN/Knox/run \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "https://www.knoxcountytreasurer.com"}'

# Maricopa County, Arizona
curl -X POST http://localhost:3001/api/scrapers/county/AZ/Maricopa/run \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "https://tax.maricopa.gov"}'

# Cook County, Illinois
curl -X POST http://localhost:3001/api/scrapers/county/IL/Cook/run \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "https://www.cookcountytaxcollector.com"}'
```

**How to Add New Counties:**

1. Find the county's official tax assessor or treasurer website
2. Identify the auction/deed listing page URL
3. POST to `/api/scrapers/county/{state}/{county}/run` with the `baseUrl`
4. The scraper automatically extracts listings and saves to database

### 3. **File-Based Imports** (Excel & PDF)

For counties that post auctions as Excel/PDF files:

#### Excel Import
```bash
curl -X POST http://localhost:3001/api/import/excel \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/auctions.xlsx"}'
```

**Expected Excel Format:**

| Column | Format | Example |
|--------|--------|---------|
| A | Title | "Residential Lot - Main St" |
| B | County | "Knox" |
| C | State | "TN" |
| D | Acreage | 0.5 |
| E | Price | 45000 |
| F | Auction Date | 4/15/2026 |
| G | Auction Type | "Tax Deed" |
| H | Closing Days | 30 |
| I | Latitude | 35.96 |
| J | Longitude | -83.92 |
| K | Summary | "Downtown redevelopment opportunity" |

#### PDF Import
```bash
curl -X POST http://localhost:3001/api/import/pdf \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/auctions.pdf"}'
```

**Expected PDF Format:**
- Listings separated by line breaks or page breaks
- Each listing contains: property name, location, acres, price, date
- Parser uses regex to extract structured data

**Example PDF Content:**
```
123 MAIN STREET, KNOX COUNTY TN - 0.5 AC - $45,000 - Auction 4/15/2026

456 OAK AVENUE, KNOX COUNTY TN - 2.3 AC - $67,500 - Auction 5/01/2026
```

### 4. **View All Available Scrapers**

```bash
curl http://localhost:3001/api/scrapers
```

Response:
```json
{
  "scrapers": [
    {
      "name": "GovEase",
      "endpoint": "/api/scrapers/govease/run",
      "type": "Third-Party"
    },
    {
      "name": "Bid4Assets",
      "endpoint": "/api/scrapers/bid4assets/run",
      "type": "Third-Party"
    },
    {
      "name": "County Website",
      "endpoint": "/api/scrapers/county/:state/:county/run",
      "type": "County"
    },
    {
      "name": "Excel Import",
      "endpoint": "/api/import/excel",
      "type": "File"
    },
    {
      "name": "PDF Import",
      "endpoint": "/api/import/pdf",
      "type": "File"
    }
  ]
}
```

## Implementation Details

### Adding a New County Scraper

**Step 1: Identify the URL**
Find the county's official tax/auction website, e.g., `https://taxcollector.countyname.state.us`

**Step 2: Create Custom Scraper (Optional)**
```javascript
// backend/src/scrapers/MyCountyScraper.js
const CountyWebsiteScraper = require('./CountyWebsiteScraper');

class MyCountyScraper extends CountyWebsiteScraper {
  async scrapeAuctions() {
    await this.page.goto(this.baseUrl);
    
    // Custom extraction logic
    const listings = await this.page.locator('custom-selector').all();
    // ... parse and return listings
  }
}

module.exports = MyCountyScraper;
```

**Step 3: Register in Backend**
```javascript
// backend/src/index.js
const MyCountyScraper = require('./scrapers/MyCountyScraper');

app.post('/api/scrapers/mycounty/run', async (req, res) => {
  const scraper = new MyCountyScraper('MyCounty', 'ST', 'https://url.com');
  scraper.scrape();
  res.json({ status: 'Job started', source: 'MyCounty' });
});
```

### Adding New Third-Party Source

1. Create `NewSourceScraper.js` extending `BaseScraper`
2. Implement `async scrape()` and `async scrapeListings()`
3. Register endpoint in `index.js`
4. Add to `/api/scrapers` response

## Data Pipeline

```
Source (Website/Excel/PDF)
    ↓
Scraper extracts data
    ↓
Prisma ORM validates & normalizes
    ↓
PostgreSQL saves Listing + Parcel records
    ↓
API serves to Frontend
    ↓
Dashboard displays signals with scoring
```

## Database Schema

Each import creates:

**Listing Table:**
- title, county, state, acreage, price, auctionDate, etc.
- source (tracks which scraper imported)
- score (1-100 opportunity rating)
- flags (tags: Waterfront, Commercial, etc.)

**Parcel Table:**
- assessedValue, landValue, improvementValue
- lastSalePrice, taxDelinquentYears
- linked to Listing via parcelId

## Running Scrapers on Schedule

Coming soon: BullMQ job queue integration for:
- Hourly county website checks
- Daily third-party marketplace updates
- Weekly file imports from county FTP servers

## Error Handling

- Failed listings are logged but don't stop batch
- Duplicate titles use Prisma upsert (updates if exists)
- Network timeouts retry up to 3 times
- All errors tracked in job status

## Performance Tips

- Batch imports: 50-100 listings per job
- County websites: Run during off-peak hours (11 PM - 6 AM)
- Stagger third-party queries to avoid rate limits
- Cache parsed PDFs/Excel files locally before processing

## Support

For new data sources or counties, provide:
1. Source URL
2. Sample listing format
3. Required fields (mandatory: title, county, state, price)
4. Authentication requirements (if any)
