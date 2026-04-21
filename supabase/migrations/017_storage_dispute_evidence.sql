-- MIGRATION 017 — Allow authenticated users to upload/read dispute evidence in auth-photos bucket

CREATE POLICY "Authenticated users can upload dispute evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'auth-photos'
  AND (storage.foldername(name))[1] = 'disputes'
);

CREATE POLICY "Authenticated users can read auth-photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'auth-photos');
