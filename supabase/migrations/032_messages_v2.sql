-- Messages v2: pre-sale threads, image attachments, remove order_id requirement

-- Allow pre-sale messages (no order yet)
ALTER TABLE public.messages
  ALTER COLUMN order_id DROP NOT NULL;

-- Context for pre-sale thread (which listing the conversation is about)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL;

-- The intended recipient for pre-sale messages (order threads derive parties from the order)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.users(id);

-- Photo/image attachment
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url text;

-- Efficient lookup for listing-based threads
CREATE INDEX IF NOT EXISTS messages_listing_idx
  ON public.messages (listing_id)
  WHERE listing_id IS NOT NULL;

-- Efficient inbox query (all messages involving a user in listing threads)
CREATE INDEX IF NOT EXISTS messages_recipient_idx
  ON public.messages (recipient_id)
  WHERE recipient_id IS NOT NULL;
