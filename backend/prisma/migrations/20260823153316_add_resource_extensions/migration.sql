/*
  Warnings:

  - Added the required column `linkedGoals` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `linkedRecords` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `resource` ADD COLUMN `linkedGoals` JSON NOT NULL,
    ADD COLUMN `linkedRecords` JSON NOT NULL;

-- CreateTable
CREATE TABLE `ResourceShare` (
    `id` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ResourceShare_token_key`(`token`),
    INDEX `ResourceShare_resourceId_idx`(`resourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResourceShare` ADD CONSTRAINT `ResourceShare_resourceId_fkey` FOREIGN KEY (`resourceId`) REFERENCES `Resource`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
