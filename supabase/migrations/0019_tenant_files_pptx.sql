BEGIN;

UPDATE storage.buckets
SET allowed_mime_types = array_append(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
)
WHERE id = 'tenant-files'
  AND NOT (
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[]))
  );

COMMIT;
