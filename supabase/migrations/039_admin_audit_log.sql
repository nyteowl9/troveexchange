-- 039: Admin audit log
--
-- Owner-executed manual escrow actions (release_to_seller, refund_buyer,
-- resolve_seller_wins) are high-stakes and currently only logged to
-- console. This adds a permanent DB trail.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid NOT NULL REFERENCES public.users(id),
  action        text NOT NULL,                -- e.g. 'escrow.release_to_seller'
  target_type   text,                         -- e.g. 'order', 'dispute', 'user'
  target_id     uuid,
  payload       jsonb,                        -- arbitrary action context
  tx_hash       text,                         -- on-chain tx if applicable
  chain_error   text,                         -- on-chain error if applicable
  ok            boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor   ON public.admin_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target  ON public.admin_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log (created_at DESC);

-- Service role only — never readable by clients
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_service_only" ON public.admin_audit_log
  FOR ALL USING (auth.role() = 'service_role');
