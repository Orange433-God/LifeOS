-- CreateTable
CREATE TABLE `LifeRecord` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rawContent` TEXT NOT NULL,
    `title` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `mood` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `summary` VARCHAR(191) NULL,
    `goalId` VARCHAR(191) NULL,
    `recordedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LifeRecord_userId_recordedAt_idx`(`userId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LifeRecord` ADD CONSTRAINT `LifeRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
