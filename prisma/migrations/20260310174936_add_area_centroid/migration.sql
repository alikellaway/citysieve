-- CreateTable
CREATE TABLE "AreaCentroid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outcode" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL
);

-- CreateIndex
CREATE INDEX "AreaCentroid_lat_lng_idx" ON "AreaCentroid"("lat", "lng");

-- CreateIndex
CREATE INDEX "AreaCentroid_outcode_idx" ON "AreaCentroid"("outcode");
