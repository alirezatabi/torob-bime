CREATE TABLE "InsuranceType" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "nameFa" TEXT NOT NULL, "schema" JSONB NOT NULL,
  CONSTRAINT "InsuranceType_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Insurer" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "nameFa" TEXT NOT NULL, "trustSignals" JSONB,
  CONSTRAINT "Insurer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Product" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "insurerId" TEXT NOT NULL, "typeId" TEXT NOT NULL,
  "nameFa" TEXT NOT NULL, "sourceText" TEXT NOT NULL, "sourceUrl" TEXT,
  "isSampleData" BOOLEAN NOT NULL DEFAULT true, "priceModel" JSONB,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CoverageValue" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "fieldKey" TEXT NOT NULL, "value" JSONB NOT NULL,
  "evidence" TEXT, "confidence" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "CoverageValue_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExtractionRun" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "rawOutput" JSONB NOT NULL,
  "valid" BOOLEAN NOT NULL, "errors" JSONB,
  CONSTRAINT "ExtractionRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsuranceType_slug_key" ON "InsuranceType"("slug");
CREATE UNIQUE INDEX "Insurer_slug_key" ON "Insurer"("slug");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_typeId_idx" ON "Product"("typeId");
CREATE UNIQUE INDEX "CoverageValue_productId_fieldKey_key" ON "CoverageValue"("productId", "fieldKey");
CREATE INDEX "ExtractionRun_productId_createdAt_idx" ON "ExtractionRun"("productId", "createdAt");
ALTER TABLE "Product" ADD CONSTRAINT "Product_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "InsuranceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoverageValue" ADD CONSTRAINT "CoverageValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
