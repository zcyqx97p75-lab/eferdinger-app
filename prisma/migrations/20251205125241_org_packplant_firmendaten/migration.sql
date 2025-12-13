-- AlterTable
ALTER TABLE "AccountingDocument" ADD COLUMN     "issuerBankNameSnapshot" TEXT,
ADD COLUMN     "issuerBicSnapshot" TEXT,
ADD COLUMN     "issuerIbanSnapshot" TEXT,
ADD COLUMN     "issuerLegalFormSnapshot" TEXT,
ADD COLUMN     "issuerManagingDirectorsSnapshot" TEXT,
ADD COLUMN     "issuerPaymentTermsSnapshot" TEXT,
ADD COLUMN     "issuerRegistryCourtSnapshot" TEXT,
ADD COLUMN     "issuerRegistryNumberSnapshot" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "bankName" TEXT DEFAULT '',
ADD COLUMN     "bic" TEXT DEFAULT '',
ADD COLUMN     "iban" TEXT DEFAULT '',
ADD COLUMN     "legalForm" TEXT DEFAULT '',
ADD COLUMN     "managingDirectors" TEXT DEFAULT '',
ADD COLUMN     "paymentTerms" TEXT DEFAULT '',
ADD COLUMN     "registryCourt" TEXT DEFAULT '',
ADD COLUMN     "registryNumber" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "PackPlant" ADD COLUMN     "bankName" TEXT DEFAULT '',
ADD COLUMN     "bic" TEXT DEFAULT '',
ADD COLUMN     "iban" TEXT DEFAULT '',
ADD COLUMN     "legalForm" TEXT DEFAULT '',
ADD COLUMN     "managingDirectors" TEXT DEFAULT '',
ADD COLUMN     "paymentTerms" TEXT DEFAULT '',
ADD COLUMN     "registryCourt" TEXT DEFAULT '',
ADD COLUMN     "registryNumber" TEXT DEFAULT '';
