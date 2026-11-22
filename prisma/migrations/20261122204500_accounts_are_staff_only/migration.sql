-- The marketing flag leaves the account table.
--
-- A User is somebody who works at the shop now; whether they want offers is
-- not a property of a staff login. The list lives in Subscriber, where the
-- permission is per channel, dated, and backed by the consent ledger — which
-- a boolean on an account row never was.
ALTER TABLE "User" DROP COLUMN "marketingOptIn";
