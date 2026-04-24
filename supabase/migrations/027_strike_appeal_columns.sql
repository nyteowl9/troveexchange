alter table strikes
  add column if not exists appealed            boolean      default false,
  add column if not exists appeal_reason       text,
  add column if not exists appeal_submitted_at timestamptz,
  add column if not exists appeal_outcome      text;        -- 'approved' | 'denied'
