-- CreateTable
CREATE TABLE "SurveyAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "surveyMode" TEXT,
    "surveyState" TEXT NOT NULL,
    "topResults" TEXT NOT NULL,
    "totalCandidates" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "passedCount" INTEGER NOT NULL,
    "radiusKm" INTEGER NOT NULL
);
