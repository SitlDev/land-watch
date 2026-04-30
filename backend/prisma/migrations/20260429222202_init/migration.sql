-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "acreage" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "pricePerAcre" DOUBLE PRECISION NOT NULL,
    "auctionType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "auctionDate" TIMESTAMP(3) NOT NULL,
    "closingDays" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "summary" TEXT,
    "flags" TEXT[],
    "risks" TEXT[],
    "action" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parcelId" TEXT,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "assessedValue" DOUBLE PRECISION NOT NULL,
    "landValue" DOUBLE PRECISION,
    "improvementValue" DOUBLE PRECISION,
    "lastSalePrice" DOUBLE PRECISION,
    "lastSaleDate" TIMESTAMP(3),
    "ownershipYears" DOUBLE PRECISION,
    "priorTaxSales" INTEGER NOT NULL DEFAULT 0,
    "zoning" TEXT,
    "encumbrances" TEXT[],
    "taxDelinquentYears" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "County" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "platform" TEXT,
    "lastScraped" TIMESTAMP(3),
    "listingCount" INTEGER NOT NULL DEFAULT 0,
    "opportunityScore" INTEGER,

    CONSTRAINT "County_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_title_key" ON "Listing"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_parcelId_key" ON "Listing"("parcelId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
