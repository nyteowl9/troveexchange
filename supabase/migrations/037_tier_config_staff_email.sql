-- Staff alert email address — configurable from admin dashboard
ALTER TABLE public.tier_config
  ADD COLUMN IF NOT EXISTS staff_alert_email text;
