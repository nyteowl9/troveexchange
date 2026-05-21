-- 041: label_payment_tx_hash on orders
--
-- For free_shipping orders where the seller pays for a Chase Hollow label
-- out-of-pocket (via on-chain USDC transfer to the platform fee recipient),
-- we record the tx hash so the same payment can't be reused for another
-- order's label.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS label_payment_tx_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_label_payment_tx_hash
  ON public.orders (label_payment_tx_hash)
  WHERE label_payment_tx_hash IS NOT NULL;
