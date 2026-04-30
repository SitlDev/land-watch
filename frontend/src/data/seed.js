// Simplified - Removed ALL_US_COUNTIES import to fix module loading
// COUNTIES will be empty but app will still function with listings

export const LISTINGS = [
  { id: 1, title: "Ozark Timberland — Newton County", state: "AR", county: "Newton", acreage: 47.3, price: 28500, pricePerAcre: 602, auctionType: "Tax Deed", source: "Bid4Assets", sourceUrl: "https://bid4assets.com", auctionDate: "2026-04-15", closingDays: 14, score: 88, lat: 35.86, lng: -93.18, summary: "Premium Ozark timberland at 84% below assessed. Absolute auction, no reserve.", flags: ["Absolute auction", "No encumbrances", "Timber value", "Road access"], risks: ["Quiet title may be needed", "Remote location"], action: "Act Fast", parcel: { assessedValue: 182000, landValue: 162000, improvementValue: 20000, lastSalePrice: 95000, lastSaleDate: "2018-06-01", ownershipYears: 7.9, priorTaxSales: 0, zoning: "Forestry/Agricultural", encumbrances: [], taxDelinquentYears: 3 } },
  { id: 2, title: "Rio Grande Desert Parcel — Hudspeth County", state: "TX", county: "Hudspeth", acreage: 320, price: 12000, pricePerAcre: 37, auctionType: "Tax Deed", source: "GovEase", sourceUrl: "https://govease.com", auctionDate: "2026-04-22", closingDays: 7, score: 74, lat: 31.42, lng: -105.15, summary: "Massive 320-acre desert parcel at deep discount. Short redemption window.", flags: ["Large acreage", "Low $/acre", "6-month redemption"], risks: ["Desert land", "No utilities", "Remote access"], action: "Investigate", parcel: { assessedValue: 64000, landValue: 64000, improvementValue: 0, lastSalePrice: 18000, lastSaleDate: "2012-03-15", ownershipYears: 14.1, priorTaxSales: 1, zoning: "Unzoned/Rural", encumbrances: ["Grazing easement"], taxDelinquentYears: 4 } },
  { id: 3, title: "Lake County Lien Portfolio — Groveland", state: "FL", county: "Lake", acreage: 0.5, price: 8200, pricePerAcre: 16400, auctionType: "Tax Lien", source: "RealAuction", sourceUrl: "https://realauction.com", auctionDate: "2026-03-01", closingDays: 45, score: 82, lat: 28.56, lng: -81.76, summary: "Tax lien at 18% max rate on residential lot near Disney corridor.", flags: ["18% max rate", "Growth corridor", "Residential lot"], risks: ["Owner may redeem", "2-year hold"], action: "Act Fast", parcel: { assessedValue: 42000, landValue: 38000, improvementValue: 4000, lastSalePrice: 52000, lastSaleDate: "2021-08-20", ownershipYears: 4.8, priorTaxSales: 0, zoning: "Residential R-1", encumbrances: [], taxDelinquentYears: 2 } },
  { id: 4, title: "Blue Ridge Mountain Lot — Rabun County", state: "GA", county: "Rabun", acreage: 12.8, price: 55000, pricePerAcre: 4296, auctionType: "Tax Deed", source: "GovEase", sourceUrl: "https://govease.com", auctionDate: "2026-05-10", closingDays: 30, score: 91, lat: 34.88, lng: -83.40, summary: "Mountain view lot in Georgia's most desirable recreational county. Absolute deed.", flags: ["Mountain views", "Recreational demand", "Absolute deed", "12-month redemption"], risks: ["20% penalty redemption possible"], action: "Act Fast", parcel: { assessedValue: 180000, landValue: 180000, improvementValue: 0, lastSalePrice: 145000, lastSaleDate: "2020-09-10", ownershipYears: 5.7, priorTaxSales: 0, zoning: "Residential/Recreational", encumbrances: [], taxDelinquentYears: 2 } },
  { id: 5, title: "Former Municipal Depot — Peoria County", state: "IL", county: "Peoria", acreage: 2.1, price: 31000, pricePerAcre: 14761, auctionType: "Government Surplus", source: "GSA RealEstateSales", sourceUrl: "https://realestatesales.gov", auctionDate: "2026-04-28", closingDays: 3, score: 67, lat: 40.69, lng: -89.59, summary: "Former city maintenance depot. Environmental screening required before closing.", flags: ["Below market", "Government title", "Paved access"], risks: ["Environmental risk", "Phase I ESA needed", "Commercial only"], action: "Investigate", parcel: { assessedValue: 88000, landValue: 55000, improvementValue: 33000, lastSalePrice: 0, lastSaleDate: null, ownershipYears: 0, priorTaxSales: 0, zoning: "Commercial/Industrial", encumbrances: ["Environmental covenant"], taxDelinquentYears: 0 } },
  { id: 6, title: "Chesapeake Bay Waterfront — Dorchester County", state: "MD", county: "Dorchester", acreage: 3.4, price: 44000, pricePerAcre: 12941, auctionType: "Tax Lien", source: "CivicSource", sourceUrl: "https://civicsource.com", auctionDate: "2026-04-01", closingDays: 90, score: 79, lat: 38.42, lng: -76.08, summary: "Waterfront lien at 6–18% rate. Long redemption but premium location.", flags: ["Waterfront", "6–18% interest", "Premium county"], risks: ["Long hold period", "Wetlands restrictions"], action: "Monitor", parcel: { assessedValue: 310000, landValue: 295000, improvementValue: 15000, lastSalePrice: 280000, lastSaleDate: "2019-04-01", ownershipYears: 7.1, priorTaxSales: 1, zoning: "Residential/Wetlands", encumbrances: ["Wetlands easement"], taxDelinquentYears: 2 } },
  { id: 7, title: "High Desert Ranch Land — Mohave County", state: "AZ", county: "Mohave", acreage: 160, price: 9800, pricePerAcre: 61, auctionType: "Tax Lien", source: "Bid4Assets", sourceUrl: "https://bid4assets.com", auctionDate: "2026-02-15", closingDays: 180, score: 71, lat: 35.19, lng: -114.05, summary: "16% lien rate on 160-acre high desert parcel. 3-year redemption window.", flags: ["16% rate", "Large acreage", "Rate bid down"], risks: ["3-year hold", "Rate bid down at auction", "Desert land"], action: "Monitor", parcel: { assessedValue: 28000, landValue: 28000, improvementValue: 0, lastSalePrice: 14000, lastSaleDate: "2008-11-01", ownershipYears: 17.5, priorTaxSales: 2, zoning: "Unzoned/Agricultural", encumbrances: [], taxDelinquentYears: 4 } },
  { id: 8, title: "Pocono Cabin Lot — Monroe County", state: "PA", county: "Monroe", acreage: 1.2, price: 18500, pricePerAcre: 15416, auctionType: "Tax Deed", source: "Grant Street", sourceUrl: "https://deedauction.net", auctionDate: "2026-05-20", closingDays: 21, score: 85, lat: 41.03, lng: -75.34, summary: "No redemption period in PA — clean title day one. Prime Poconos recreation area.", flags: ["No redemption", "Clean title", "Recreation demand", "Cabin potential"], risks: ["Perc test needed"], action: "Act Fast", parcel: { assessedValue: 68000, landValue: 68000, improvementValue: 0, lastSalePrice: 41000, lastSaleDate: "2016-07-15", ownershipYears: 9.9, priorTaxSales: 0, zoning: "Residential/Recreational", encumbrances: [], taxDelinquentYears: 3 } },
  { id: 9, title: "Mississippi Delta Farmland — Bolivar County", state: "MS", county: "Bolivar", acreage: 80, price: 22000, pricePerAcre: 275, auctionType: "Tax Deed", source: "GovEase", sourceUrl: "https://govease.com", auctionDate: "2026-04-30", closingDays: 1, score: 76, lat: 33.79, lng: -90.73, summary: "Productive Delta farmland closing tomorrow. Agricultural income potential.", flags: ["Farmland", "Agricultural income", "Delta soil"], risks: ["Closing tomorrow", "Review title fast", "Prior tax sale"], action: "Investigate", parcel: { assessedValue: 96000, landValue: 96000, improvementValue: 0, lastSalePrice: 58000, lastSaleDate: "2015-02-01", ownershipYears: 11.3, priorTaxSales: 1, zoning: "Agricultural A-1", encumbrances: [], taxDelinquentYears: 5 } },
  { id: 10, title: "Private Auction: Ranch Parcel — Elko County", state: "NV", county: "Elko", acreage: 640, price: 195000, pricePerAcre: 304, auctionType: "Private Auction", source: "Land.com", sourceUrl: "https://land.com", auctionDate: "2026-05-15", closingDays: 16, score: 63, lat: 41.17, lng: -115.35, summary: "Section land (640 ac) in Nevada ranch country. Reserve auction — price may rise.", flags: ["640 acres", "Section land", "Ranch potential"], risks: ["Reserve auction", "Price will increase", "Bid competition expected"], action: "Monitor", parcel: { assessedValue: 384000, landValue: 384000, improvementValue: 0, lastSalePrice: 220000, lastSaleDate: "2010-08-01", ownershipYears: 15.8, priorTaxSales: 0, zoning: "Open Range/Grazing", encumbrances: ["BLM grazing permit"], taxDelinquentYears: 0 } }
];

// Generate COUNTIES - small sample for fallback
export const COUNTIES = [
  {fips:"01001",name:"Autauga",state:"AL",population:55869,platform:null},
  {fips:"04013",name:"Maricopa",state:"AZ",population:4948203,platform:"bid4assets"},
  {fips:"05101",name:"Newton",state:"AR",population:8127,platform:"bid4assets"},
  {fips:"06037",name:"Los Angeles",state:"CA",population:9818605,platform:"auction-com"},
  {fips:"12069",name:"Lake",state:"FL",population:390000,platform:"realauction"}
];

export const SCRAPE_JOBS = [
  { id:1, source:"GovEase", lastRun:"2026-04-29T06:00:00Z", status:"success", found:34, errors:0 },
  { id:2, source:"Bid4Assets", lastRun:"2026-04-29T06:02:00Z", status:"success", found:22, errors:0 },
  { id:3, source:"RealAuction", lastRun:"2026-04-29T06:08:00Z", status:"warning", found:11, errors:2 },
  { id:4, source:"CivicSource", lastRun:"2026-04-29T06:15:00Z", status:"success", found:9, errors:0 },
  { id:5, source:"Grant Street", lastRun:"2026-04-29T06:18:00Z", status:"success", found:6, errors:0 },
  { id:6, source:"Land.com", lastRun:"2026-04-29T06:22:00Z", status:"error", found:0, errors:5 }
];

export const REDEMPTION_PERIODS = {
  AL:{days:365,rate:12,type:"Tax Lien",notes:"Owner has 1 yr to redeem at 12% interest"},
  AZ:{days:1095,rate:16,type:"Tax Lien",notes:"3-year redemption; rate bid down at auction"},
  AR:{days:730,rate:null,type:"Tax Deed",notes:"2-year right of redemption post-sale"},
  CA:{days:365,rate:null,type:"Tax Deed",notes:"1-year title challenge window; quiet title often needed"},
  FL:{days:730,rate:18,type:"Tax Lien",notes:"2 yrs before deed application; rate bid down"},
  GA:{days:365,rate:null,type:"Tax Deed",notes:"12 months redemption; 20% penalty to redeem"},
  IL:{days:730,rate:18,type:"Tax Lien",notes:"2-3 yr redemption depending on property type"},
  IN:{days:365,rate:10,type:"Tax Lien",notes:"1-year redemption at 10% + costs"},
  KS:{days:365,rate:null,type:"Tax Deed",notes:"1 year from date of sale"},
  KY:{days:365,rate:null,type:"Tax Deed",notes:"1 year redemption period post-deed"},
  MD:{days:180,rate:6,type:"Tax Lien",notes:"6 months to 2 years depending on county"},
  MI:{days:365,rate:null,type:"Tax Deed",notes:"Forfeiture + 1-year redemption before foreclosure"},
  MS:{days:730,rate:null,type:"Tax Deed",notes:"2-year redemption period post-sale"},
  MO:{days:365,rate:null,type:"Tax Deed",notes:"1 year from date of sale"},
  NJ:{days:730,rate:18,type:"Tax Lien",notes:"2-year redemption; strong lien state"},
  NY:{days:730,rate:null,type:"Tax Deed",notes:"2-year redemption statewide, varies by county"},
  OH:{days:365,rate:null,type:"Both",notes:"Foreclosure action required; varies by county"},
  PA:{days:0,rate:null,type:"Tax Deed",notes:"No statutory redemption after deed issued"},
  SC:{days:365,rate:12,type:"Tax Lien",notes:"1-year redemption at 12% per year"},
  TX:{days:180,rate:null,type:"Tax Deed",notes:"6-month right of redemption (homestead: 2 years)"},
  WI:{days:365,rate:null,type:"Tax Deed",notes:"1-year from recording of deed"},
  DEFAULT:{days:365,rate:null,type:"Unknown",notes:"Verify redemption period with county attorney"}
};

export const STATE_DATA = [
  {abbr:"AL",name:"Alabama",auctionType:"Tax Lien",frequency:"Annual",platform:"govease"},
  {abbr:"AR",name:"Arkansas",auctionType:"Tax Deed",frequency:"Annual",platform:"bid4assets"},
  {abbr:"AZ",name:"Arizona",auctionType:"Tax Lien",frequency:"Annual",platform:"bid4assets"},
  {abbr:"CA",name:"California",auctionType:"Tax Deed",frequency:"Annual",platform:"bid4assets"},
  {abbr:"FL",name:"Florida",auctionType:"Both",frequency:"Annual",platform:"realauction"},
  {abbr:"GA",name:"Georgia",auctionType:"Tax Deed",frequency:"Monthly",platform:"govease"},
  {abbr:"IL",name:"Illinois",auctionType:"Tax Lien",frequency:"Annual",platform:"realauction"},
  {abbr:"MD",name:"Maryland",auctionType:"Tax Lien",frequency:"Annual",platform:"civicsource"},
  {abbr:"MS",name:"Mississippi",auctionType:"Tax Deed",frequency:"Annual",platform:"govease"},
  {abbr:"NV",name:"Nevada",auctionType:"Tax Deed",frequency:"Annual",platform:"bid4assets"},
  {abbr:"PA",name:"Pennsylvania",auctionType:"Tax Deed",frequency:"Annual",platform:"grantstreet"},
  {abbr:"TX",name:"Texas",auctionType:"Tax Deed",frequency:"Monthly",platform:"govease"}
];
