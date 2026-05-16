-- 038: Separate staff_notes column on disputes
--
-- Previously /api/disputes/recommend wrote staff's reasoning into `notes`,
-- which is also used by the owner's resolve override_reason. Staff could
-- silently overwrite the owner's override notes.
--
-- Fix: dedicated staff_notes column. The recommend route now writes there;
-- resolve route continues using `notes` exclusively for owner overrides.

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS staff_notes text;
