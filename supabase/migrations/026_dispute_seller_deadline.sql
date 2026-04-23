alter table disputes
  add column if not exists seller_evidence_deadline timestamptz;
