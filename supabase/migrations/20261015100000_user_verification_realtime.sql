-- Let a citizen's signed-in session receive staff verification updates.
-- Existing publication membership is left untouched.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'users'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END;
$$;
