-- Corrects the brand spelling in already-seeded rows: ಜ್ವಾಲಾಮಾಲಾ -> ಜ್ವಾಲಾಮಾಲ and
-- ज्वालामाला -> ज्वालामाल. Only needed if the database was seeded before the fix;
-- a fresh run of seed.sql / seed-v4.sql already carries the correct spelling.
--
-- Safe to run more than once: the corrected form is not a match for the wrong one,
-- so a second run changes nothing.
BEGIN;
DO $$
DECLARE
  col record;
  updated bigint;
  total bigint := 0;
BEGIN
  FOR col IN
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.is_generated = 'NEVER'
      AND c.is_updatable = 'YES'
      AND c.data_type IN ('text', 'character varying', 'jsonb')
    ORDER BY c.table_name, c.column_name
  LOOP
    IF col.data_type = 'jsonb' THEN
      -- Round-trip through text so the replacement reaches strings nested in the payload.
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(replace(%I::text, %L, %L), %L, %L)::jsonb
           WHERE %I::text LIKE %L OR %I::text LIKE %L',
        col.table_name, col.column_name, col.column_name,
        'ಜ್ವಾಲಾಮಾಲಾ', 'ಜ್ವಾಲಾಮಾಲ', 'ज्वालामाला', 'ज्वालामाल',
        col.column_name, '%ಜ್ವಾಲಾಮಾಲಾ%', col.column_name, '%ज्वालामाला%'
      );
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET %I = replace(replace(%I, %L, %L), %L, %L)
           WHERE %I LIKE %L OR %I LIKE %L',
        col.table_name, col.column_name, col.column_name,
        'ಜ್ವಾಲಾಮಾಲಾ', 'ಜ್ವಾಲಾಮಾಲ', 'ज्वालामाला', 'ज्वालामाल',
        col.column_name, '%ಜ್ವಾಲಾಮಾಲಾ%', col.column_name, '%ज्वालामाला%'
      );
    END IF;
    GET DIAGNOSTICS updated = ROW_COUNT;
    IF updated > 0 THEN
      total := total + updated;
      RAISE NOTICE '% .% : % row(s)', col.table_name, col.column_name, updated;
    END IF;
  END LOOP;
  RAISE NOTICE 'Total rows corrected: %', total;
END $$;
COMMIT;
