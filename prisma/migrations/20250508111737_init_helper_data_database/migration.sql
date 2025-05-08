/*
  Warnings:

  - You are about to drop the column `createdAt` on the `helper_data` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `helper_data` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "helper_data" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";
