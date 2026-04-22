-- Allow authenticators/staff/owner to read in_transit remote-auth orders
-- so Tier 1 seller-submitted photos appear in the authenticator queue.
-- Tier 2 orders already reach the queue at auth_review status (card physically
-- at the auth center). Tier 1 orders need to be visible while still in transit.

CREATE POLICY "Authenticators can read in_transit remote auth orders"
ON orders FOR SELECT
TO authenticated
USING (
  auth_tier = 'remote'
  AND status = 'in_transit'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('authenticator', 'staff', 'owner')
  )
);
