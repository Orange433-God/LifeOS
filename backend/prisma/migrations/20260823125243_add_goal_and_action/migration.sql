/*
  Warnings:

  - You are about to drop the column `deadline` on the `goal` table. All the data in the column will be lost.
  - Added the required column `category` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetAttributes` to the `Goal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `goal` DROP COLUMN `deadline`,
    ADD COLUMN `category` VARCHAR(191) NOT NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `priority` VARCHAR(191) NOT NULL,
    ADD COLUMN `targetAttributes` JSON NOT NULL,
    ADD COLUMN `targetDate` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Action` (
    `id` VARCHAR(191) NOT NULL,
    `goalId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `dueDate` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Action_goalId_order_idx`(`goalId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Action` ADD CONSTRAINT `Action_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `Goal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
