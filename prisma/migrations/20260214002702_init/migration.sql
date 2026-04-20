-- CreateTable
CREATE TABLE "Alumni" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gradYear" INTEGER NOT NULL,
    "fratYearStart" INTEGER NOT NULL,
    "fratYearEnd" INTEGER NOT NULL,
    "major" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "currentCompany" TEXT NOT NULL,
    "companyDomain" TEXT NOT NULL,
    "companyIndustry" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "companyLocationCity" TEXT NOT NULL,
    "companyLocationState" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "jobFunction" TEXT NOT NULL,
    "jobSeniority" TEXT NOT NULL,
    "employmentStartYear" INTEGER NOT NULL,
    "locationCity" TEXT NOT NULL,
    "locationState" TEXT NOT NULL,
    "salaryEstimateLow" INTEGER NOT NULL,
    "salaryEstimateMid" INTEGER NOT NULL,
    "salaryEstimateHigh" INTEGER NOT NULL,
    "companyInternshipsAvailable" BOOLEAN NOT NULL,
    "internshipCount" INTEGER NOT NULL,
    "internshipRecruitingSeason" TEXT NOT NULL,
    "companyRecruitsFromUMass" BOOLEAN NOT NULL,
    "alumniAtCompanyCount" INTEGER NOT NULL,
    "mentorshipAvailable" BOOLEAN NOT NULL,
    "emailAvailable" BOOLEAN NOT NULL,
    "careerMarket" TEXT NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Alumni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alumni_firstName_lastName_idx" ON "Alumni"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "Alumni_currentCompany_idx" ON "Alumni"("currentCompany");

-- CreateIndex
CREATE INDEX "Alumni_companyIndustry_idx" ON "Alumni"("companyIndustry");

-- CreateIndex
CREATE INDEX "Alumni_locationCity_idx" ON "Alumni"("locationCity");
