# LandWatch Pro — Complete Production Build Prompt

## Product Overview

Build **LandWatch Pro**, a full-stack land auction intelligence platform for US real estate investors. The app monitors, scores, and analyzes land parcels across government tax deed/lien auctions, private auctions, and government surplus sales nationwide. It surfaces deals, flags title risk, tracks redemption timelines, and uses an AI engine (Claude API) to generate investment analysis on demand.

The design philosophy: **progressive disclosure**. Show the critical signal (score, discount, title risk) on every surface. Reveal full detail only when the user clicks in. No walls of tables by default — the UI should feel like a Bloomberg terminal built by a product designer, not a data dump.

---

## Tech Stack

### Frontend
- **React 18** with hooks (useState, useEffect, useCallback, useMemo)
- **TailwindCSS** for utility styling
- **React Router v6** for page navigation
- **Recharts** for data visualization (score distribution, $/acre trends)
- **date-fns** for date math (redemption countdowns, closing timers)
- Monospace typeface: **DM Mono** (Google Fonts fallback: Courier New)

### Backend
- **Node.js + Express** REST API
- **PostgreSQL** via **Prisma ORM**
- **Bull + Redis** for scraper job queues
- **Playwright** for headless scraping of auction platforms
- **node-cron** for scheduled scrape jobs (every 6 hours)
- **Resend** for email alerts

### AI
- **Anthropic Claude API** (`claude-sonnet-4-5`) for:
  - Investment analysis per listing
  - Title attorney opinion
  - County auction discovery agent
- All Claude calls use structured JSON output via `system` prompt instruction

### Infrastructure
- **Railway** for backend + Redis + PostgreSQL
- **Vercel** for frontend
- **Environment variables**: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`

---

## Database Schema (PostgreSQL via Prisma)

```prisma
model Listing {
  id              Int       @id @default(autoincrement())
  title           String
  state           String
  county          String
  acreage         Float
  price           Int
  pricePerAcre    Int
  auctionType     String    // "Tax Deed" | "Tax Lien" | "Private Auction" | "Government Surplus"
  source          String
  sourceUrl       String
  auctionDate     DateTime
  closingDays     Int
  score           Int       // 0-100, AI-generated
  summary         String
  flags           String[]
  risks           String[]
  action          String    // "Act Fast" | "Investigate" | "Monitor"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  parcel          Parcel?
  savedBy         SavedListing[]
}

model Parcel {
  id                  Int      @id @default(autoincrement())
  listingId           Int      @unique
  listing             Listing  @relation(fields: [listingId], references: [id])
  assessedValue       Int
  landValue           Int
  improvementValue    Int
  lastSalePrice       Int
  lastSaleDate        DateTime?
  ownershipYears      Float
  priorTaxSales       Int
  zoning              String
  encumbrances        String[]
  taxDelinquentYears  Int
}

model CountyRegistry {
  id           Int      @id @default(autoincrement())
  fips         String   @unique
  county       String
  state        String
  population   Int
  platform     String   // "govease" | "bid4assets" | "realauction" | "civicsource" | "grantstreet" | "direct"
  auctionType  String
  frequency    String   // "Annual" | "Monthly" | "Quarterly" | "Varies"
  auctionUrl   String?
  nextDate     DateTime?
  lastScraped  DateTime?
  status       String   // "active" | "needs_review" | "unknown"
  method       String   // "platform_crawl" | "ai_discovery" | "none"
}

model User {
  id           Int            @id @default(autoincrement())
  email        String         @unique
  alertPrefs   Json           // { states, budget, scoreMin, titleRiskMax, alertMethod }
  savedListings SavedListing[]
  createdAt    DateTime       @default(now())
}

model SavedListing {
  id        Int     @id @default(autoincrement())
  userId    Int
  listingId Int
  user      User    @relation(fields: [userId], references: [id])
  listing   Listing @relation(fields: [listingId], references: [id])
  notes     String?
  @@unique([userId, listingId])
}

model ScrapeJob {
  id        Int      @id @default(autoincrement())
  source    String
  lastRun   DateTime
  status    String   // "success" | "warning" | "error"
  found     Int
  errors    Int
}
```

---

## Data Sources to Scrape

| Source | URL | Type | Counties |
|--------|-----|------|----------|
| GovEase | govease.com | Tax Lien/Deed | 312 |
| Bid4Assets | bid4assets.com | Tax Deed | 187 |
| RealAuction | realauction.com | Tax Lien/Both | 94 |
| CivicSource | civicsource.com | Tax Lien | 68 |
| Grant Street | lienauction.com / deedauction.net | Both | 41 |
| Land.com | land.com/auctions | Private | – |
| AuctionFlip | auctionflip.com | Private | – |
| Treasury.gov | treasury.gov/auctions | Gov Surplus | – |
| GSA RealEstateSales | realestatesales.gov | Gov Surplus | – |

Scraper strategy: Each source gets a dedicated Playwright scraper class. Jobs run via Bull queue on 6-hour cron. On extraction, each listing is scored by Claude (see scoring pipeline below) before being written to the database.

---

## AI Scoring Pipeline

When a new listing is scraped, POST it to the Claude API for scoring. System prompt:

```
You are a land investment analyst. Score this auction listing 0-100 based on: discount to market value, urgency/closing timeline, auction type favorability (absolute > reserve > lien), acreage value, red flag presence, and geographic demand. Return ONLY a JSON object with keys:
- score (integer 0-100)
- summary (2 sentences max)
- flags (string array — positive signals)
- risks (string array — negative signals)
- action ("Act Fast" | "Investigate" | "Monitor")
```

On-demand Claude calls (user-triggered, not background):

1. **Investment Analysis** — full thesis, due diligence steps, comparable value estimate, red flags
2. **Title Attorney Opinion** — quiet title needed, clearing cost estimate, recommended searches, biggest risk
3. **County Discovery** — for unknown counties, Claude returns auction_url, auction_type, frequency, platform, notes

---

## Title Risk Scoring Engine (client-side, deterministic)

Run this on every listing that has parcel data. No API call required — runs instantly.

```typescript
interface TitleRisk {
  score: number;       // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  color: string;
  flags: { sev: 'high' | 'med' | 'low'; text: string }[];
}

function calcTitleRisk(parcel: Parcel, listing: Listing): TitleRisk {
  let score = 0;
  const flags = [];

  // Prior tax sales — strongest signal
  if (parcel.priorTaxSales >= 2) { score += 35; flags.push({ sev:'high', text:`${parcel.priorTaxSales} prior tax sales on record` }); }
  else if (parcel.priorTaxSales === 1) { score += 18; flags.push({ sev:'med', text:'1 prior tax sale — verify chain of title' }); }

  // Short ownership — potential flip or distress
  if (parcel.ownershipYears < 2 && parcel.ownershipYears > 0) { score += 20; flags.push({ sev:'high', text:`Ownership only ${parcel.ownershipYears.toFixed(1)} yrs` }); }
  else if (parcel.ownershipYears < 5 && parcel.ownershipYears > 0) { score += 8; flags.push({ sev:'low', text:`Short ownership (${parcel.ownershipYears.toFixed(1)} yrs)` }); }

  // Encumbrances on title
  if (parcel.encumbrances.length >= 2) { score += 25; flags.push({ sev:'high', text:`${parcel.encumbrances.length} encumbrances on title` }); }
  else if (parcel.encumbrances.length === 1) { score += 12; flags.push({ sev:'med', text:`Encumbrance: ${parcel.encumbrances[0]}` }); }

  // Tax delinquency depth
  if (parcel.taxDelinquentYears >= 4) { score += 20; flags.push({ sev:'high', text:`${parcel.taxDelinquentYears} years tax delinquency` }); }
  else if (parcel.taxDelinquentYears >= 3) { score += 10; flags.push({ sev:'med', text:`${parcel.taxDelinquentYears} years tax delinquency` }); }

  // Unknown title chain
  if (!parcel.lastSaleDate) { score += 10; flags.push({ sev:'med', text:'No recorded prior sale — unknown chain' }); }

  // Tax lien modifier
  if (listing.auctionType === 'Tax Lien') { score += 5; flags.push({ sev:'low', text:'Tax lien — owner retains redemption rights' }); }

  const level = score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
  const color = score >= 50 ? '#b04020' : score >= 25 ? '#b07a00' : '#1a7f5a';
  return { score: Math.min(score, 100), level, color, flags };
}
```

---

## Redemption Period Data (all 50 states — store as static constant)

Key entries to include:

```typescript
const REDEMPTION_PERIODS: Record<string, RedemptionPeriod> = {
  AL: { days: 365,  rate: 12,   type: 'Tax Lien', notes: 'Owner has 1 yr to redeem at 12% interest' },
  AZ: { days: 1095, rate: 16,   type: 'Tax Lien', notes: '3-year redemption; rate bid down at auction' },
  AR: { days: 730,  rate: null, type: 'Tax Deed',  notes: '2-year right of redemption post-sale' },
  CA: { days: 365,  rate: null, type: 'Tax Deed',  notes: '1-year title challenge window; quiet title often needed' },
  FL: { days: 730,  rate: 18,   type: 'Tax Lien',  notes: '2 yrs before deed application; rate bid down' },
  GA: { days: 365,  rate: null, type: 'Tax Deed',  notes: '12 months redemption; 20% penalty to redeem' },
  IL: { days: 730,  rate: 18,   type: 'Tax Lien',  notes: '2-3 yr redemption depending on property type' },
  IN: { days: 365,  rate: 10,   type: 'Tax Lien',  notes: '1-year redemption at 10% + costs' },
  KS: { days: 365,  rate: null, type: 'Tax Deed',  notes: '1 year from date of sale' },
  KY: { days: 365,  rate: null, type: 'Tax Deed',  notes: '1 year redemption period post-deed' },
  MD: { days: 180,  rate: 6,    type: 'Tax Lien',  notes: '6 months to 2 years depending on county' },
  MI: { days: 365,  rate: null, type: 'Tax Deed',  notes: 'Forfeiture + 1-year redemption before foreclosure' },
  MO: { days: 365,  rate: null, type: 'Tax Deed',  notes: '1 year from date of sale' },
  NJ: { days: 730,  rate: 18,   type: 'Tax Lien',  notes: '2-year redemption; strong lien state' },
  NY: { days: 730,  rate: null, type: 'Tax Deed',  notes: '2-year redemption statewide, varies by county' },
  OH: { days: 365,  rate: null, type: 'Both',      notes: 'Foreclosure action required; varies by county' },
  PA: { days: 0,    rate: null, type: 'Tax Deed',  notes: 'No statutory redemption after deed issued' },
  SC: { days: 365,  rate: 12,   type: 'Tax Lien',  notes: '1-year redemption at 12% per year' },
  TX: { days: 180,  rate: null, type: 'Tax Deed',  notes: '6-month right of redemption (homestead: 2 years)' },
  WI: { days: 365,  rate: null, type: 'Tax Deed',  notes: '1-year from recording of deed' },
  // ... complete all 50 states
  DEFAULT: { days: 365, rate: null, type: 'Unknown', notes: 'Verify redemption period with county attorney' },
};
```

---

## UI Architecture — Progressive Disclosure Model

### Layout

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (224px fixed)  │  MAIN CONTENT (flex-1)    │
│  ─ Logo + subtitle      │  ─ Sticky header           │
│  ─ Nav groups           │  ─ Scrollable content      │
│  ─ Scrape status bar    │                            │
└─────────────────────────────────────────────────────┘
```

Sidebar nav groups:
- **Main**: Dashboard, Browse, Calendar
- **Analysis**: Parcel Data, Title Risk, Redemption Tracker
- **Discovery**: County Discovery, Alerts

Each nav item shows a badge:
- Browse → listing count
- Title Risk → high-risk count (red)
- Parcel Data → parcels with data (blue)

### Design System

```
Font: DM Mono (monospace throughout)
Font sizes: 9 / 10 / 11 / 12 / 13 / 14 / 16 / 18 / 22
Stroke: 0.5px borders throughout
Border radius: 6px cards, 8px panels, 10px main cards
Colors (CSS variables — support light/dark mode):
  --bg-primary / --bg-secondary / --bg-tertiary
  --text-primary / --text-secondary / --text-tertiary
  --border-tertiary / --border-secondary / --border-primary
Semantic colors:
  Green: #1a7f5a (score ≥85, LOW risk, success)
  Amber: #b07a00 (score 70-84, MEDIUM risk, warning)
  Red:   #b04020 (score <70, HIGH risk, urgent)
  Blue:  #1a4fa0 (bid price, tax lien type)
  Purple:#7b2fa0 (tax deed type, special)
```

---

## Pages — Detailed Specification

### 1. Dashboard

**Purpose**: Command center. Show what needs attention today.

**Layout**:
- 4-metric row: Active Listings / Hot Deals (score≥80, ≤14 days) / Deep Discounts (≥50% below assessed) / High Title Risk count
- "Closing Today" section (urgent red label, only shown if listings exist)
- "Hot Deals" listing cards
- Scraper status table at bottom

**Scraper status table columns**: Source / Last Run / Status (badge: success/warning/error) / Found / Errors

**Design rule**: No data tables in the hero area. Cards only. Tables go at the bottom.

---

### 2. Browse

**Purpose**: Full listing inventory with filtering and sorting.

**Filters** (inline row, not a drawer):
- Text search (county, title)
- State dropdown
- Auction type dropdown
- Sort: Score ↓ / Closing ↑ / Price ↑ / Discount ↓
- Min score slider (0–90, step 5)

**Listing card** — the core unit of the app:

```
┌──────────────────────────────────────────────────────────┐
│ [Title — County, State]              [title risk] [score]│
│ [Source · Date · X days / TODAY]          score    score │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ score bar ━━━━━━━━━ │
│ [Flag tags] [X% below assessed] [⚠ High title risk]     │
│                                    [Xac · $Xk]          │
└──────────────────────────────────────────────────────────┘
```

Cards are clickable — opens listing detail modal.

**Score display**:
- Opportunity score (large, right-aligned): green/amber/red
- Title risk score (smaller, next to opportunity score): green/amber/red
- Score bar under header row

---

### 3. Listing Detail Modal

**Purpose**: Full deep-dive. Progressive disclosure via tabs.

**Modal header** (sticky):
- Property title + source + close date
- Dual score display (title risk + opportunity score)
- Quick stat pills: `47.3 ac · $28,500 · $182,000 assessed · 84% below assessed · 14d to close`
- 4 tabs: **Overview / Parcel Data / Title Risk / Redemption**

#### Overview Tab
- 4-metric grid: Acreage / Total Price / $/Acre / Days to Close
- Summary paragraph
- Flag tags (positive signals)
- Risk lines with ⚠ prefix
- AI Analysis section (lazy — user clicks "Run Claude Analysis →")
  - Returns: deeper_analysis, investment_thesis, due_diligence_steps (numbered list), red_flags

#### Parcel Data Tab
- 3-metric row: Assessed Value / Starting Bid / Last Sale Price
- Visual bid-vs-assessed bar (horizontal, blue fill to % of assessed)
- Ratio callout: "X× assessed value for every dollar bid"
- 6-field detail grid: Zoning / Land Value / Improvements / Ownership / Tax Delinquency / Prior Tax Sales
- Encumbrances warning block (amber) — only shown if present

#### Title Risk Tab
- Risk score header (large score + level badge + colored background)
- Risk score bar
- Risk flags list — each flag has severity badge (HIGH/MED/LOW) + description
- AI Title Opinion section (lazy — "Get Title Opinion →")
  - Returns: title_opinion, quiet_title_needed (bool), estimated_clearing_cost, recommended_searches (4 items), biggest_risk
  - Displays: 2-column metric grid (quiet title + cost), numbered search list, biggest risk block

#### Redemption Tab
- 3-metric row: Redemption Period / Max Interest Rate / Title Clear Date
- Progress bar (% through redemption window, color changes by phase)
- State rule explanation block (blue tint)
- **Tax lien return calculator** (only if listing is Tax Lien and has price):
  - 3-metric row: Lien Amount / Annual Return (at max rate) / Total Return if Redeemed
  - Explanatory sentence
- Timeline: 4 milestone dots (Auction → Deed Recorded → Midpoint → Title Clears)

**Modal footer** (sticky):
- "View on [Source] →" (primary button, opens source URL)
- "Save Listing" / "✓ Saved" toggle

---

### 4. Parcel Data (Analysis section)

**Purpose**: Portfolio-level view of assessed value vs bid for all listings with parcel data.

**4-metric row**: Parcels with Data / Deep Discounts (≥50% below assessed) / High Title Risk / Avg Bid/Assessed %

**Table columns**:
| Property | Assessed | Bid | Discount | $/Acre | Title Risk | Prior Sales | Encumbrances |

- Discount column: percentage label + mini progress bar
- Title Risk column: badge (LOW/MEDIUM/HIGH) with semantic color
- Clicking a row opens the listing detail modal on the Parcel Data tab

---

### 5. Title Risk (Analysis section)

**Purpose**: Same table as Parcel Data but sorted by title risk, filtered for HIGH risk by default.

Reuse the `ParcelOverview` component. The page header shows: `"X properties need attorney review"`.

---

### 6. Redemption Tracker (Analysis section)

**Purpose**: Track all active auctions against their state redemption windows.

**4-metric row**: Tracked Auctions / Tax Lien Count / States with No Redemption / Longest Period in Portfolio

**Filter toggle**: All Auctions / Tax Liens Only

**Table columns**:
| Property | State | Type | Auction Date | Redemption Period (+ mini progress bar) | Rate | Title Clears | Status |

- Redemption period column: text + colored mini bar (red=early, amber=mid, green=near clear)
- Status badge: "Cleared" / "Xd left" / "Open — Xd"

**State Reference Grid** below table:
- All 20 states with redemption data shown as cards in a 2-column grid
- Each card: state abbreviation / type label / period (large, colored) / rate if applicable / notes

---

### 7. County Discovery (Discovery section)

**Purpose**: Map and manage which US counties are indexed, and run AI discovery for unknowns.

**4-metric row**: Total US Counties (3,144) / Covered / Active in Registry / Platforms

**Platform coverage cards** (3-column grid):
- One card per vendor platform (GovEase, Bid4Assets, RealAuction, CivicSource, Grant Street)
- Shows county count + proportional bar

**Discovery Engine card**:
- Description of what it does (crawl vendors → AI fills gaps)
- "Run Discovery →" button → triggers animated multi-phase runner:
  - Phase 1: Platform crawl (GovEase, Bid4Assets, RealAuction)
  - Phase 2: Claude agent for unknown counties (shows progress bar)
  - Phase 3: Health check on known URLs
  - Complete state with count found

**County Registry table**:
- Filters: text search / platform / status
- Columns: County / State / Platform (colored label) / Type / Next Date / Status (dot + text) / Method (🕸 crawl or 🤖 AI) / Action
- Action column: "Discover →" for unknown status counties → triggers Claude county discovery call → updates row inline

---

### 8. Calendar (Main section)

**Purpose**: Visual timeline of upcoming auction dates.

**Month grid**: 7-column calendar grid
- Days with auctions show mini listing pills (state + acreage, colored by score)
- Today cell has highlight background

**Upcoming list** below grid: All listings with closing ≥ 0, sorted by closing days
- Each row: title / source / date on left; closing countdown (red if ≤7 days) / score on right

---

### 9. Alerts (Discovery section)

**Purpose**: Configure alert preferences. View recent triggers.

**Preferences card**:
- State multi-select (all 50 state buttons, toggleable)
- Max budget slider ($0–$2M)
- Min score slider (0–99)
- Max title risk dropdown (Low only / Medium or lower / Any)
- Alert method dropdown (Email / SMS / Both)
- "Save Preferences →" button

**Recent Alerts table**:
- Each row: listing title / reason string / score / timestamp

---

## API Endpoints (Express)

```
GET    /api/listings                   # all listings, supports ?state=&type=&minScore=&sort=
GET    /api/listings/:id               # single listing with parcel data
POST   /api/listings/:id/analyze       # trigger Claude investment analysis
POST   /api/listings/:id/title         # trigger Claude title opinion
GET    /api/counties                   # county registry, supports ?state=&platform=&status=
POST   /api/counties/:id/discover      # trigger Claude county discovery for unknown county
POST   /api/counties/run-discovery     # trigger full discovery run (Bull job)
GET    /api/scrape-jobs                # scraper job status
GET    /api/alerts/recent              # recent alert triggers for user
PUT    /api/alerts/prefs               # save alert preferences
GET    /api/dashboard/metrics          # aggregate metrics for dashboard
```

---

## Claude API Call Patterns

All calls follow this pattern:

```typescript
async function callClaude(systemPrompt: string, userContent: string): Promise<object> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  const data = await response.json();
  const text = data.content?.find((b: any) => b.type === 'text')?.text || '{}';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
```

### Investment Analysis System Prompt
```
You are a land investment analyst. Return ONLY a JSON object, no markdown, no preamble. Keys:
- deeper_analysis: string (2 sentences expanding on the opportunity)
- investment_thesis: string (1 sentence — the core reason to buy)
- due_diligence_steps: string[] (4 specific action items before bidding)
- comparable_value: string (your estimate of fair market value with reasoning)
- red_flags: string[] (specific risks that could kill the deal)
```

### Title Opinion System Prompt
```
You are a real estate title attorney specializing in tax deed and tax lien acquisitions. Return ONLY a JSON object, no markdown. Keys:
- title_opinion: string (2 sentences on title quality and chain of title concerns)
- quiet_title_needed: boolean
- estimated_clearing_cost: string (e.g. "$2,000–$4,000")
- recommended_searches: string[] (4 specific title searches to run)
- biggest_risk: string (1 sentence — the single most important risk)
```

### County Discovery System Prompt
```
You are a municipal records researcher. Return ONLY a JSON object, no markdown. Keys:
- auction_url: string | null (direct URL to county auction page)
- auction_type: "tax_deed" | "tax_lien" | "both" | "unknown"
- auction_frequency: "annual" | "monthly" | "quarterly" | "varies"
- platform: "govease" | "bid4assets" | "realauction" | "civicsource" | "grantstreet" | "direct"
- notes: string (1 sentence with any important context)
```

---

## Scraper Architecture

Each scraper is a class that extends a base `AuctionScraper`:

```typescript
abstract class AuctionScraper {
  abstract source: string;
  abstract async scrape(): Promise<RawListing[]>;
  
  async run(): Promise<void> {
    const raw = await this.scrape();
    for (const listing of raw) {
      const scored = await scoreWithClaude(listing);
      await prisma.listing.upsert({ where: { sourceUrl: listing.sourceUrl }, create: scored, update: scored });
    }
    await prisma.scrapeJob.create({ data: { source: this.source, lastRun: new Date(), status: 'success', found: raw.length, errors: 0 } });
  }
}
```

Implement scrapers for: `GovEaseScraper`, `Bid4AssetsScraper`, `RealAuctionScraper`, `LandComScraper`, `AuctionFlipScraper`, `TreasuryScraper`, `GSAScraper`.

Bull queue setup:
```typescript
const scrapeQueue = new Queue('scrapes', { connection: redisClient });
scrapeQueue.add('all-sources', {}, { repeat: { cron: '0 */6 * * *' } });
scrapeQueue.process('all-sources', async () => {
  await Promise.allSettled([
    new GovEaseScraper().run(),
    new Bid4AssetsScraper().run(),
    // ...
  ]);
});
```

---

## Alert System

After each scrape run, evaluate all new/updated listings against user alert preferences:

```typescript
async function evaluateAlerts(listing: Listing): Promise<void> {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const prefs = user.alertPrefs as AlertPrefs;
    const parcel = await prisma.parcel.findUnique({ where: { listingId: listing.id } });
    const risk = parcel ? calcTitleRisk(parcel, listing) : null;
    
    const matches =
      prefs.states.includes(listing.state) &&
      listing.price <= prefs.budget &&
      listing.score >= prefs.scoreMin &&
      (prefs.titleRiskMax === 'HIGH' || !risk || risk.level === prefs.titleRiskMax || (prefs.titleRiskMax === 'MEDIUM' && risk.level !== 'HIGH'));
    
    if (matches) {
      await sendAlert(user.email, listing, risk);
    }
  }
}
```

Alert email template (Resend): Property title, score, discount %, listing URL, key flags, title risk level, days to close.

---

## State Reference Data (complete — all 50 states)

Store as a static constant in the frontend. Required fields per state:

```typescript
interface StateData {
  abbr: string;           // "CA"
  name: string;           // "California"
  auctionType: string;    // "Tax Deed" | "Tax Lien" | "Both" | "Tax Sale"
  frequency: string;      // "Annual" | "Monthly" | "Quarterly" | "Varies"
  platform: string;       // primary vendor platform used
}
```

Include all 50 states. Notable entries:
- TX, GA: Monthly (most active markets)
- FL: Both (tax lien certificate + deed; major market)
- AZ: Tax Lien, 3-year redemption (highest rate states)
- PA: Tax Deed, no redemption (cleanest title)
- CA: Tax Deed, 1-year challenge window (quiet title often needed)
- NJ: Tax Lien, 2-year redemption, 18% max (highest lien rate)

---

## Key UX Rules

1. **Progressive disclosure everywhere.** Show score + discount + title risk on cards. Full detail is one click away in the modal tabs. Never dump all data on the list view.

2. **Two scores visible at all times** on every listing surface: opportunity score (large) and title risk score (smaller). Color-coded consistently (green/amber/red).

3. **AI calls are always lazy.** Never call Claude on page load. Only fire on explicit user action ("Run Analysis →", "Get Title Opinion →", "Discover →"). Show loading state.

4. **No empty states without action.** If no listings match filters, show "Adjust filters to see more listings" with a reset button. If a county is unknown, show "Discover →" button.

5. **Redemption tracker is time-aware.** All dates are relative to today. Progress bars reflect actual elapsed time. "Cleared" state is green. "Open — Xd" is red.

6. **Sticky modal header + footer.** Tab bar and CTA buttons stay visible regardless of scroll depth in the modal.

7. **County discovery is animated.** Multi-phase runner shows which platform is being crawled and AI progress with a real progress bar. Not just a spinner.

8. **Alert preferences use inline controls.** State toggles are pill buttons (not a multi-select dropdown). Sliders for numeric ranges. No forms, no submit/cancel pattern.

9. **Monospace everywhere.** Numbers align. Dates align. The aesthetic is data-terminal, not marketing SaaS.

10. **Sorting in Browse includes Discount ↓** — this is the most actionable sort for deal-hunters and should be the first non-default option.

---

## Metric Calculations

```typescript
// Bid discount to assessed value
const bidDiscount = listing.price > 0
  ? Math.round((1 - listing.price / parcel.assessedValue) * 100)
  : null;

// Value ratio (assessed per bid dollar)
const dealRatio = listing.price > 0
  ? (parcel.assessedValue / listing.price).toFixed(2)
  : null;

// Lien annual return
const annualReturn = rp.rate && listing.price > 0
  ? Math.round(listing.price * rp.rate / 100)
  : null;

// Days remaining in redemption window
const clearDate = new Date(auctionDate.getTime() + redemptionDays * 86400000);
const daysLeft = Math.max(0, Math.floor((clearDate - today) / 86400000));

// % through redemption window
const redemptionPct = redemptionDays > 0
  ? Math.min(100, Math.round(daysSinceAuction / redemptionDays * 100))
  : 100;
```

---

## Vendor Platform Reference

| Platform | Label | Color | Counties | URL |
|----------|-------|-------|----------|-----|
| govease | GovEase | #1a7f5a | 312 | govease.com |
| bid4assets | Bid4Assets | #1a4fa0 | 187 | bid4assets.com |
| realauction | RealAuction | #7b2fa0 | 94 | realauction.com |
| civicsource | CivicSource | #b05a00 | 68 | civicsource.com |
| grantstreet | Grant Street | #005f6b | 41 | lienauction.com |
| direct | Direct (county site) | #888888 | varies | – |

---

## Environment Variables

```env
# Backend
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RESEND_API_KEY=re_...
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## Deployment

**Backend (Railway)**:
- Express API service
- PostgreSQL add-on
- Redis add-on
- Environment variables set in Railway dashboard
- `npm run build && npm run start`

**Frontend (Vercel)**:
- `npm run build` → Vite output to `/dist`
- `VITE_API_URL` set to Railway backend URL
- SPA routing: rewrite all routes to `/index.html`

**Database migrations**:
```bash
npx prisma migrate deploy
npx prisma db seed  # seeds county registry with all 3,144 US counties
```

---

## Seed Data

The county registry seed script should:
1. Load FIPS codes for all 3,144 US counties
2. Pre-populate known platform assignments (GovEase 312, Bid4Assets 187, RealAuction 94, CivicSource 68, Grant Street 41)
3. Set all remaining counties to `status: "unknown"` for AI discovery
4. Include `nextDate` for any counties with known auction schedules

The listing seed should include 10 representative listings covering: Tax Deed, Tax Lien, Private Auction, and Government Surplus types across at least 6 states, with full parcel data for each.
