-- Allow the staff dashboard's authenticated realtime subscription to receive
-- application inserts and updates. The guarded check keeps this migration
-- safe on projects where applications is already in the publication.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'applications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  END IF;
END;
$$;
