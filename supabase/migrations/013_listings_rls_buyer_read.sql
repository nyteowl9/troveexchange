-- ============================================================
-- MIGRATION 013 — Allow buyers to read sold listings they purchased
-- ============================================================
-- The current policy only allows reads on active listings.
-- Once a listing is sold, buyers with an order can no longer
-- read the listing details, causing null joins on the dashboard.

drop policy if exists "Anyone can read active listings" on public.listings;

create policy "Anyone can read active or purchased listings"
  on public.listings for select
  using (
    status = 'active'
    or seller_id = auth.uid()
    or exists (
      select 1 from public.orders
      where orders.listing_id = listings.id
        and orders.buyer_id = auth.uid()
    )
    or public.is_staff_or_owner()
  );
