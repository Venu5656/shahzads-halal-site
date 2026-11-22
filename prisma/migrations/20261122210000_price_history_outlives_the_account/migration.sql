-- A price change must outlive the account that made it.
--
-- changedById was required, which made the foreign key a RESTRICT: a manager
-- who had ever touched a price could not be deleted. That is a real position
-- to take about an audit trail, but it is not one anybody chose, and the
-- consequence — being unable to remove a departed employee's login — is worse
-- than the thing it protects.
--
-- So the id goes null when the account goes, and the name is snapshotted
-- beside it, the way an order snapshots the items on it. The history stays
-- readable, which is the whole reason to keep it.
ALTER TABLE "PriceChange" ADD COLUMN "changedByName" TEXT;

UPDATE "PriceChange" pc
SET "changedByName" = COALESCE(u."name", 'Unknown')
FROM "User" u
WHERE u."id" = pc."changedById";

UPDATE "PriceChange" SET "changedByName" = 'Unknown' WHERE "changedByName" IS NULL;

ALTER TABLE "PriceChange" ALTER COLUMN "changedByName" SET NOT NULL;
ALTER TABLE "PriceChange" ALTER COLUMN "changedById" DROP NOT NULL;

ALTER TABLE "PriceChange" DROP CONSTRAINT "PriceChange_changedById_fkey";
ALTER TABLE "PriceChange"
  ADD CONSTRAINT "PriceChange_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
