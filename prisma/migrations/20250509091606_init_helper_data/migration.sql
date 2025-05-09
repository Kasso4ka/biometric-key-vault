-- CreateTable
CREATE TABLE "helper_data" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "helperData" TEXT NOT NULL,

    CONSTRAINT "helper_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "helper_data_address_key" ON "helper_data"("address");
