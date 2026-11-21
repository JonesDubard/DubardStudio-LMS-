-- 0017: every new school starts with a current school year and its terms (US-007.3c, FR-2.2.2).
--   1. default_term_plan(date)   the agreed defaults as a pure function, so they can be
--                                tested for any date and changed in one place
--   2. provision_tenant()        same as 0010, plus: one current school year and its terms,
--                                created in the same transaction as the school
--
-- The defaults:
--   School year   starts 1 Sep, ends 31 Aug, named "2026-2027".
--                 A school created from July to December gets the year that starts
--                 that September; from January to June, the year that started
--                 the September before.
--   Terms         Term 1: 1 Sep - 31 Dec     Term 2: 1 Jan - 31 Mar     Term 3: 1 Apr - 30 Jun
--                 These are placeholders. The School Admin adjusts the dates.
--   Current       the term that contains today's date; in the July-August gap, Term 1.
--                 The school year is current. (0006 allows one current year and one
--                 current term per school.)
--   Not created   classes, subjects, courses, lessons (acceptance: "no classes or subjects yet").
--   Colours       unchanged from 0010 (#1F3A5F / #F2A900).
--   Logo          none: logo_url, header_logo_url and favicon_url stay NULL and the apps
--                 show the school's name as text (US-007.3b).
--
-- Existing schools are not touched. Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Preflight: the columns this migration writes to
--    A column that is missing is reported here, not on the first new school.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing text[] := '{}';
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('academic_years', 'tenant_id'), ('academic_years', 'name'), ('academic_years', 'start_date'),
      ('academic_years', 'end_date'), ('academic_years', 'is_current'),
      ('terms', 'tenant_id'), ('terms', 'academic_year_id'), ('terms', 'name'), ('terms', 'start_date'),
      ('terms', 'end_date'), ('terms', 'is_current'), ('terms', 'sequence')
    ) AS v(tbl, col)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = spec.tbl AND c.column_name = spec.col
    ) THEN
      missing := missing || (spec.tbl || '.' || spec.col);
    END IF;
  END LOOP;

  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION '0017 needs these columns: %. Adjust the INSERTs below to the real column names.',
      array_to_string(missing, ', ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. default_term_plan(): the defaults, for any date
--    One row per term, each carrying the school year it belongs to.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.default_term_plan(p_today date)
RETURNS TABLE (
  year_name text,
  year_start date,
  year_end date,
  seq integer,
  term_name text,
  term_start date,
  term_end date,
  is_current boolean
)
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  WITH y AS (
    -- First year of the school year: July-December -> this year, January-June -> last year.
    SELECT CASE WHEN extract(month FROM p_today) >= 7
                THEN extract(year FROM p_today)::int
                ELSE extract(year FROM p_today)::int - 1
           END AS s
  ),
  t AS (
    SELECT n.seq,
           n.name,
           make_date(y.s + n.year_offset, n.start_month, n.start_day) AS s_date,
           make_date(y.s + n.year_offset, n.end_month, n.end_day)     AS e_date
    FROM y,
         (VALUES
           (1, 'Term 1', 0, 9, 1, 12, 31),
           (2, 'Term 2', 1, 1, 1,  3, 31),
           (3, 'Term 3', 1, 4, 1,  6, 30)
         ) AS n(seq, name, year_offset, start_month, start_day, end_month, end_day)
  ),
  cur AS (
    SELECT coalesce((SELECT t.seq FROM t WHERE p_today BETWEEN t.s_date AND t.e_date), 1) AS seq
  )
  SELECT y.s::text || '-' || (y.s + 1)::text,
         make_date(y.s, 9, 1),
         make_date(y.s + 1, 8, 31),
         t.seq,
         t.name,
         t.s_date,
         t.e_date,
         t.seq = cur.seq
  FROM y, t, cur
  ORDER BY t.seq
$$;

REVOKE ALL ON FUNCTION public.default_term_plan(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.default_term_plan(date) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. provision_tenant(): 0010 plus the school year and terms
--    Everything is one function call, so one transaction: if the year or the
--    terms fail, the school is not created either.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.provision_tenant(
  p_name text,
  p_subdomain text,
  p_contact_name text,
  p_contact_email text,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  -- Defaults for every new school (US-007.3). The school year and terms are in default_term_plan().
  default_primary_color constant text := '#1F3A5F';
  default_secondary_color constant text := '#F2A900';
  reserved constant text[] := ARRAY[
    'www', 'admin', 'api', 'app', 'auth', 'login', 'mail', 'platform',
    'status', 'support', 'help', 'docs', 'static', 'assets', 'cdn', 'dev', 'staging'
  ];
  v_subdomain text := lower(btrim(p_subdomain));
  v_tenant uuid;
  v_year uuid;
  v_constraint text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.id = p_actor_id AND pa.is_active
  ) THEN
    RAISE EXCEPTION 'not_platform_admin: % is not an active Platform Admin', p_actor_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'invalid_name: the school name is required' USING ERRCODE = 'check_violation';
  END IF;
  -- coalesce: a NULL would make the test NULL, and IF NULL skips the error.
  IF coalesce(btrim(p_contact_name), '') = '' OR coalesce(p_contact_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_contact: a contact name and a valid contact email are required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(v_subdomain, '') !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' THEN
    RAISE EXCEPTION 'invalid_subdomain: use 3-30 lowercase letters, digits or hyphens, with no hyphen at either end'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_subdomain = ANY (reserved) THEN
    RAISE EXCEPTION 'reserved_subdomain: % is reserved', v_subdomain USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.subdomain = v_subdomain) THEN
    RAISE EXCEPTION 'subdomain_taken: % is already used', v_subdomain USING ERRCODE = 'unique_violation';
  END IF;

  -- Two calls for the same subdomain at once can both pass the check above;
  -- the unique index stops the second, and this gives it the same clear error.
  BEGIN
    INSERT INTO public.tenants (
      name, subdomain, contact_name, contact_email,
      subscription_status, onboarding_status,
      primary_color, secondary_color, created_by
    ) VALUES (
      btrim(p_name), v_subdomain, btrim(p_contact_name), lower(btrim(p_contact_email)),
      'trial', 'provisioning',
      default_primary_color, default_secondary_color, p_actor_id
    )
    RETURNING id INTO v_tenant;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint = 'tenants_subdomain_key' THEN
      RAISE EXCEPTION 'subdomain_taken: % is already used', v_subdomain USING ERRCODE = 'unique_violation';
    END IF;
    RAISE;
  END;

  -- The current school year and its terms (US-007.3c). No classes or subjects.
  INSERT INTO public.academic_years (tenant_id, name, start_date, end_date, is_current)
  SELECT v_tenant, p.year_name, p.year_start, p.year_end, true
  FROM public.default_term_plan(current_date) p
  LIMIT 1
  RETURNING id INTO v_year;

  INSERT INTO public.terms (tenant_id, academic_year_id, name, start_date, end_date, is_current, sequence)
  SELECT v_tenant, v_year, p.term_name, p.term_start, p.term_end, p.is_current, p.seq
  FROM public.default_term_plan(current_date) p;

  INSERT INTO public.audit_log (actor_id, actor_kind, tenant_id, action, resource_type, resource_id, details)
  VALUES (p_actor_id, 'platform_admin', v_tenant, 'tenant.create', 'tenant', v_tenant,
          jsonb_build_object('subdomain', v_subdomain, 'name', btrim(p_name)));

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_tenant(text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_tenant(text, text, text, text, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;