-- CreateTable
CREATE TABLE "CandidateMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaCentroidId" TEXT NOT NULL,
    "supermarkets" REAL NOT NULL,
    "highStreet" REAL NOT NULL,
    "pubsBars" REAL NOT NULL,
    "restaurantsCafes" REAL NOT NULL,
    "parksGreenSpaces" REAL NOT NULL,
    "gymsLeisure" REAL NOT NULL,
    "healthcare" REAL NOT NULL,
    "librariesCulture" REAL NOT NULL,
    "schools" REAL NOT NULL,
    "trainStation" REAL NOT NULL,
    "busStop" REAL NOT NULL,
    "crimeScore" REAL NOT NULL DEFAULT 0.5,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CandidateMetrics_areaCentroidId_fkey" FOREIGN KEY ("areaCentroidId") REFERENCES "AreaCentroid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateMetrics_areaCentroidId_key" ON "CandidateMetrics"("areaCentroidId");
