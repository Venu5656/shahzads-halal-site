-- Stamped once a receipt has been emailed, so a retried Stripe webhook can
-- tell "send the receipt" from "the receipt already went".
ALTER TABLE "Order" ADD COLUMN "receiptSentAt" TIMESTAMP(3);
