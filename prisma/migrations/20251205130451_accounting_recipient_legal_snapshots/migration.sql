-- AlterTable
ALTER TABLE "AccountingDocument" ADD COLUMN     "recipientLegalFormSnapshot" TEXT,
ADD COLUMN     "recipientManagingDirectorsSnapshot" TEXT,
ADD COLUMN     "recipientRegistryCourtSnapshot" TEXT,
ADD COLUMN     "recipientRegistryNumberSnapshot" TEXT;
