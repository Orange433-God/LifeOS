-- AlterTable
ALTER TABLE `userprofile` ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `birthdate` DATETIME(3) NULL,
    ADD COLUMN `gender` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `UserSettings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `aiMessageNotify` BOOLEAN NOT NULL DEFAULT true,
    `goalProgressNotify` BOOLEAN NOT NULL DEFAULT true,
    `growthAchieveNotify` BOOLEAN NOT NULL DEFAULT true,
    `systemUpdateNotify` BOOLEAN NOT NULL DEFAULT true,
    `activityRecommend` BOOLEAN NOT NULL DEFAULT true,
    `quietStart` VARCHAR(191) NULL,
    `quietEnd` VARCHAR(191) NULL,
    `themeMode` VARCHAR(191) NOT NULL DEFAULT 'dark',
    `themeColor` VARCHAR(191) NOT NULL DEFAULT 'purple',
    `density` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `language` VARCHAR(191) NOT NULL DEFAULT 'zh-CN',
    `timeFormat` VARCHAR(191) NOT NULL DEFAULT '24h',
    `dateFormat` VARCHAR(191) NOT NULL DEFAULT 'YYYY-MM-DD',
    `weekStart` VARCHAR(191) NOT NULL DEFAULT 'monday',
    `startPage` VARCHAR(191) NOT NULL DEFAULT 'home',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserSettings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserSettings` ADD CONSTRAINT `UserSettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
