-- CreateTable
CREATE TABLE "School" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "urn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "ofstedRating" INTEGER,
    "phase" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "School_urn_key" ON "School"("urn");

-- CreateIndex
CREATE INDEX "School_lat_lng_idx" ON "School"("lat", "lng");
