-- Tests for 0016 (US-001). Run on a database with 0001-0016 applied. Everything
-- runs in one transaction and is rolled back at the end.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f tests/rls/0016_accept_invitation_tests.sql
-- Each check prints "ok - ..."; the first failure stops the script with "FAIL - ...".

\pset tuples_only on
\pset format unaligned

BEGIN;

CREATE SCHEMA rls_test;

CREATE FUNCTION rls_test.eq(label text, got bigint, want bigint) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want;
  END IF;
  RAISE NOTICE 'ok - %', label;
END $$;

CREATE FUNCTION rls_test.is(label text, got text, want text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want;
  END IF;
  RAISE NOTICE 'ok - %', label;
END $$;

-- The statement must fail, and its error must contain want_text.
CREATE FUNCTION rls_test.refused(label text, stmt text, want_text text DEFAULT '') RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF position(want_text IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'FAIL - % (refused, but with "%", expected "%")', label, SQLERRM, want_text;
    END IF;
    RAISE NOTICE 'ok - % (refused: %)', label, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL - % (was allowed)', label;
END $$;

-- What the login hook returns for a user.
CREATE FUNCTION rls_test.hook(uid uuid) RETURNS jsonb
LANGUAGE sql AS $$
  SELECT public.custom_access_token_hook(jsonb_build_object(
    'user_id', uid, 'claims', jsonb_build_object('sub', uid, 'role', 'authenticated')))
$$;

-- Rows written for one user and one invite: profile, memberships, audit rows.
CREATE FUNCTION rls_test.written(p_user uuid) RETURNS bigint
LANGUAGE sql AS $$
  SELECT (SELECT count(*) FROM public.profiles WHERE id = p_user)
       + (SELECT count(*) FROM public.memberships WHERE profile_id = p_user)
       + (SELECT count(*) FROM public.audit_log WHERE actor_id = p_user AND action = 'invite.accept')
$$;

CREATE FUNCTION rls_test.invite_status(p_token text) RETURNS text
LANGUAGE sql AS $$
  SELECT status::text FROM public.invitations WHERE token_hash = public.invitation_token_hash(p_token)
$$;

GRANT USAGE ON SCHEMA rls_test TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Data
--   d1 Invite School (active): an admin and a teacher already in it
--   d2 Other School (active):  one teacher, must never change
--   d3 Suspended School, d4 Cancelled School
--   New auth users (no profile yet) for each acceptance
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'admin16@test'),
  ('d1000000-0000-0000-0000-000000000002', 'teacher16@test'),
  ('d1000000-0000-0000-0000-000000000003', 'off16@test'),
  ('d2000000-0000-0000-0000-000000000001', 'other16@test'),
  ('d9000000-0000-0000-0000-000000000001', 'new16@test'),
  ('d9000000-0000-0000-0000-000000000002', 'late16@test'),
  ('d9000000-0000-0000-0000-000000000003', 'audit16@test');

INSERT INTO public.tenants (id, name, subdomain, subscription_status) VALUES
  ('d1000000-0000-0000-0000-000000000000', 'Invite School',    'invite-school',    'active'),
  ('d2000000-0000-0000-0000-000000000000', 'Other School',     'other-school-16',  'active'),
  ('d3000000-0000-0000-0000-000000000000', 'Suspended School', 'suspended-school', 'suspended'),
  ('d4000000-0000-0000-0000-000000000000', 'Cancelled School', 'cancelled-school', 'cancelled');

INSERT INTO public.profiles (id, tenant_id, full_name, email, status) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000000', 'Admin 16',   'admin16@test',   'active'),
  ('d1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000000', 'Teacher 16', 'teacher16@test', 'active'),
  ('d1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000000', 'Off 16',     'off16@test',     'suspended'),
  ('d2000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000000', 'Other 16',   'other16@test',   'active');

INSERT INTO public.memberships (tenant_id, profile_id, role) VALUES
  ('d1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000001', 'school_admin'),
  ('d1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000002', 'teacher'),
  ('d1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000003', 'teacher'),
  ('d2000000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000001', 'teacher');

-- Tokens are the text in the link; only their hash is stored (0008).
INSERT INTO public.invitations (tenant_id, email, phone, role, invited_by, token_hash, status, expires_at) VALUES
  ('d1000000-0000-0000-0000-000000000000', 'New16@Test ', NULL, 'teacher', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-valid-000000000001'), 'pending', now() + interval '7 days'),
  ('d1000000-0000-0000-0000-000000000000', 'used16@test', NULL, 'teacher', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-used-0000000000001'), 'accepted', now() + interval '7 days'),
  ('d1000000-0000-0000-0000-000000000000', 'revoked16@test', NULL, 'teacher', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-revoked-0000000001'), 'revoked', now() + interval '7 days'),
  ('d1000000-0000-0000-0000-000000000000', 'late16@test', NULL, 'teacher', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-late-0000000000001'), 'pending', now() - interval '1 minute'),
  ('d1000000-0000-0000-0000-000000000000', 'expired16@test', NULL, 'student', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-expired-0000000001'), 'expired', now() + interval '7 days'),
  ('d3000000-0000-0000-0000-000000000000', 'susp16@test', NULL, 'teacher', NULL,
     public.invitation_token_hash('tok16-suspended-00000001'), 'pending', now() + interval '7 days'),
  ('d4000000-0000-0000-0000-000000000000', 'canc16@test', NULL, 'teacher', NULL,
     public.invitation_token_hash('tok16-cancelled-00000001'), 'pending', now() + interval '7 days'),
  ('d1000000-0000-0000-0000-000000000000', NULL, '+231770000016', 'parent', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-phone-000000000001'), 'pending', now() + interval '7 days'),
  -- the existing teacher gets a parent invite (second role, same school)
  ('d1000000-0000-0000-0000-000000000000', 'teacher16@test', NULL, 'parent', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-second-role-000001'), 'pending', now() + interval '7 days'),
  -- the existing teacher gets a teacher invite again
  ('d1000000-0000-0000-0000-000000000000', 'teacher16+again@test', NULL, 'teacher', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-same-role-00000001'), 'pending', now() + interval '7 days'),
  ('d1000000-0000-0000-0000-000000000000', 'audit16@test', NULL, 'student', 'd1000000-0000-0000-0000-000000000001',
     public.invitation_token_hash('tok16-audit-000000000001'), 'pending', now() + interval '7 days');

CREATE TEMP TABLE other_before AS
  SELECT (SELECT count(*) FROM public.profiles WHERE tenant_id = 'd2000000-0000-0000-0000-000000000000')
       + (SELECT count(*) FROM public.memberships WHERE tenant_id = 'd2000000-0000-0000-0000-000000000000') AS n;
GRANT SELECT ON other_before TO service_role;

-- ---------------------------------------------------------------------------
-- Who may call the functions
-- ---------------------------------------------------------------------------

SET LOCAL ROLE anon;
SELECT rls_test.refused('anon cannot call check_invitation',
  $$SELECT * FROM public.check_invitation('tok16-valid-000000000001')$$, 'permission denied');
SELECT rls_test.refused('anon cannot call accept_invitation',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd9000000-0000-0000-0000-000000000001', 'X')$$,
  'permission denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', json_build_object(
  'sub', 'd9000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true); END $$;
SELECT rls_test.refused('a signed-in user cannot call accept_invitation',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd9000000-0000-0000-0000-000000000001', 'X')$$,
  'permission denied');
SELECT rls_test.refused('a signed-in user cannot add their own membership',
  $$INSERT INTO public.memberships (tenant_id, profile_id, role)
    VALUES ('d1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000002', 'school_admin')$$,
  'row-level security');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- check_invitation (what the invite page shows before an account is made)
-- ---------------------------------------------------------------------------

SET LOCAL ROLE service_role;

SELECT rls_test.is('check: a valid link has no problem',
  (SELECT coalesce(problem, 'none') FROM public.check_invitation('tok16-valid-000000000001')), 'none');
SELECT rls_test.is('check: a valid link shows the school',
  (SELECT school_name FROM public.check_invitation('tok16-valid-000000000001')), 'Invite School');
SELECT rls_test.is('check: a valid link shows the school''s address',
  (SELECT school_subdomain FROM public.check_invitation('tok16-valid-000000000001')), 'invite-school');
SELECT rls_test.is('check: a valid link shows the role',
  (SELECT role FROM public.check_invitation('tok16-valid-000000000001')), 'teacher');
SELECT rls_test.is('check: an unknown link',
  (SELECT problem FROM public.check_invitation('tok16-nope-0000000000001')), 'invite_unknown');
SELECT rls_test.is('check: an unknown link shows no school',
  (SELECT coalesce(school_name, 'none') FROM public.check_invitation('tok16-nope-0000000000001')), 'none');
SELECT rls_test.is('check: a too-short link',
  (SELECT problem FROM public.check_invitation('short')), 'invite_unknown');
SELECT rls_test.is('check: a missing link',
  (SELECT problem FROM public.check_invitation(NULL)), 'invite_unknown');
SELECT rls_test.is('check: a used link',
  (SELECT problem FROM public.check_invitation('tok16-used-0000000000001')), 'invite_used');
SELECT rls_test.is('check: a revoked link',
  (SELECT problem FROM public.check_invitation('tok16-revoked-0000000001')), 'invite_revoked');
SELECT rls_test.is('check: a link past its expiry date',
  (SELECT problem FROM public.check_invitation('tok16-late-0000000000001')), 'invite_expired');
SELECT rls_test.is('check: a link marked expired',
  (SELECT problem FROM public.check_invitation('tok16-expired-0000000001')), 'invite_expired');
SELECT rls_test.is('check: a suspended school',
  (SELECT problem FROM public.check_invitation('tok16-suspended-00000001')), 'school_suspended');
SELECT rls_test.is('check: a cancelled school',
  (SELECT problem FROM public.check_invitation('tok16-cancelled-00000001')), 'school_cancelled');
SELECT rls_test.is('check: a phone-only invite',
  (SELECT problem FROM public.check_invitation('tok16-phone-000000000001')), 'invite_no_email');

-- ---------------------------------------------------------------------------
-- accept_invitation refusals: each one writes nothing
-- ---------------------------------------------------------------------------

SELECT rls_test.refused('accept: an unknown link',
  $$SELECT * FROM public.accept_invitation('tok16-nope-0000000000001', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'invite_unknown');
SELECT rls_test.refused('accept: a too-short link',
  $$SELECT * FROM public.accept_invitation('short', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'invite_unknown');
SELECT rls_test.refused('accept: no user',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', NULL, 'New Person')$$,
  'invite_unknown');
SELECT rls_test.refused('accept: a used link',
  $$SELECT * FROM public.accept_invitation('tok16-used-0000000000001', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'invite_used');
SELECT rls_test.refused('accept: a revoked link',
  $$SELECT * FROM public.accept_invitation('tok16-revoked-0000000001', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'invite_revoked');
SELECT rls_test.refused('accept: a link past its expiry date',
  $$SELECT * FROM public.accept_invitation('tok16-late-0000000000001', 'd9000000-0000-0000-0000-000000000002', 'Late Person')$$,
  'invite_expired');
SELECT rls_test.refused('accept: a link marked expired',
  $$SELECT * FROM public.accept_invitation('tok16-expired-0000000001', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'invite_expired');
SELECT rls_test.refused('accept: a suspended school (US-001.2)',
  $$SELECT * FROM public.accept_invitation('tok16-suspended-00000001', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'school_suspended');
SELECT rls_test.refused('accept: a cancelled school (US-001.2)',
  $$SELECT * FROM public.accept_invitation('tok16-cancelled-00000001', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'school_cancelled');
SELECT rls_test.refused('accept: a phone-only invite',
  $$SELECT * FROM public.accept_invitation('tok16-phone-000000000001', 'd9000000-0000-0000-0000-000000000001', 'New Person')$$,
  'invite_no_email');
SELECT rls_test.refused('accept: an empty name',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd9000000-0000-0000-0000-000000000001', '   ')$$,
  'invalid_name');
SELECT rls_test.refused('accept: a name over 200 characters',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd9000000-0000-0000-0000-000000000001', repeat('a', 201))$$,
  'invalid_name');
SELECT rls_test.refused('accept: a person from another school (wrong school)',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd2000000-0000-0000-0000-000000000001', 'Other 16')$$,
  'wrong_school');
SELECT rls_test.refused('accept: a suspended account in this school',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd1000000-0000-0000-0000-000000000003', 'Off 16')$$,
  'account_not_active');
SELECT rls_test.refused('accept: a role the person already has',
  $$SELECT * FROM public.accept_invitation('tok16-same-role-00000001', 'd1000000-0000-0000-0000-000000000002', 'Teacher 16')$$,
  'already_member');

SELECT rls_test.eq('refusals wrote nothing for the new user',
  rls_test.written('d9000000-0000-0000-0000-000000000001'), 0);
SELECT rls_test.eq('refusals wrote nothing for the late user',
  rls_test.written('d9000000-0000-0000-0000-000000000002'), 0);
SELECT rls_test.eq('wrong school: the other school''s person has no new rows',
  (SELECT count(*) FROM public.memberships WHERE profile_id = 'd2000000-0000-0000-0000-000000000001'), 1);
SELECT rls_test.is('refusals left the valid invite pending',
  rls_test.invite_status('tok16-valid-000000000001'), 'pending');
SELECT rls_test.is('refusals left the expired-by-date invite pending (not half-updated)',
  rls_test.invite_status('tok16-late-0000000000001'), 'pending');
SELECT rls_test.is('refusals left the same-role invite pending',
  rls_test.invite_status('tok16-same-role-00000001'), 'pending');

-- ---------------------------------------------------------------------------
-- accept_invitation: a new person accepts a valid link (US-001.1)
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE accepted AS
  SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd9000000-0000-0000-0000-000000000001', '  Nora New  ');

SELECT rls_test.is('valid: returns the school',
  (SELECT tenant_id::text FROM accepted), 'd1000000-0000-0000-0000-000000000000');
SELECT rls_test.is('valid: returns the role', (SELECT role FROM accepted), 'teacher');
SELECT rls_test.is('valid: profile in the invite''s school',
  (SELECT tenant_id::text FROM public.profiles WHERE id = 'd9000000-0000-0000-0000-000000000001'),
  'd1000000-0000-0000-0000-000000000000');
SELECT rls_test.is('valid: profile name is trimmed',
  (SELECT full_name FROM public.profiles WHERE id = 'd9000000-0000-0000-0000-000000000001'), 'Nora New');
SELECT rls_test.is('valid: profile email is the invite''s, lowercased and trimmed',
  (SELECT email FROM public.profiles WHERE id = 'd9000000-0000-0000-0000-000000000001'), 'new16@test');
SELECT rls_test.is('valid: profile is active',
  (SELECT status::text FROM public.profiles WHERE id = 'd9000000-0000-0000-0000-000000000001'), 'active');
SELECT rls_test.is('valid: one active membership with the invite''s role',
  (SELECT string_agg(role::text || '/' || status::text || '/' || tenant_id::text, ',')
   FROM public.memberships WHERE profile_id = 'd9000000-0000-0000-0000-000000000001'),
  'teacher/active/d1000000-0000-0000-0000-000000000000');
SELECT rls_test.is('valid: invite is marked accepted',
  rls_test.invite_status('tok16-valid-000000000001'), 'accepted');
SELECT rls_test.is('valid: invite records who accepted it',
  (SELECT accepted_user_id::text FROM public.invitations
   WHERE token_hash = public.invitation_token_hash('tok16-valid-000000000001')),
  'd9000000-0000-0000-0000-000000000001');
SELECT rls_test.eq('valid: exactly one invite.accept audit row',
  (SELECT count(*) FROM public.audit_log
   WHERE actor_id = 'd9000000-0000-0000-0000-000000000001' AND action = 'invite.accept'
     AND actor_kind = 'user' AND tenant_id = 'd1000000-0000-0000-0000-000000000000'
     AND resource_type = 'invitation' AND details ->> 'role' = 'teacher'), 1);

RESET ROLE;
SELECT rls_test.is('valid: the login token carries the school',
  rls_test.hook('d9000000-0000-0000-0000-000000000001') #>> '{claims,tenant_id}',
  'd1000000-0000-0000-0000-000000000000');
SELECT rls_test.is('valid: the login token carries the role',
  rls_test.hook('d9000000-0000-0000-0000-000000000001') #>> '{claims,app_roles}', '["teacher"]');
SET LOCAL ROLE service_role;

SELECT rls_test.refused('valid: the same link a second time is refused',
  $$SELECT * FROM public.accept_invitation('tok16-valid-000000000001', 'd9000000-0000-0000-0000-000000000001', 'Nora New')$$,
  'invite_used');
SELECT rls_test.is('valid: check_invitation now says used',
  (SELECT problem FROM public.check_invitation('tok16-valid-000000000001')), 'invite_used');
SELECT rls_test.eq('valid: still one membership after the second try',
  (SELECT count(*) FROM public.memberships WHERE profile_id = 'd9000000-0000-0000-0000-000000000001'), 1);

-- ---------------------------------------------------------------------------
-- An existing person in the same school gets a second role
-- ---------------------------------------------------------------------------

SELECT rls_test.is('second role: accepted',
  (SELECT role FROM public.accept_invitation('tok16-second-role-000001', 'd1000000-0000-0000-0000-000000000002', 'Ignored Name')),
  'parent');
SELECT rls_test.is('second role: the profile is kept as it was',
  (SELECT full_name FROM public.profiles WHERE id = 'd1000000-0000-0000-0000-000000000002'), 'Teacher 16');
SELECT rls_test.is('second role: both memberships',
  (SELECT string_agg(role::text, ',' ORDER BY role::text) FROM public.memberships
   WHERE profile_id = 'd1000000-0000-0000-0000-000000000002'), 'parent,teacher');
SELECT rls_test.is('second role: audit row says no new profile',
  (SELECT details ->> 'new_profile' FROM public.audit_log
   WHERE actor_id = 'd1000000-0000-0000-0000-000000000002' AND action = 'invite.accept'), 'false');

RESET ROLE;
SELECT rls_test.is('second role: the login token carries both roles',
  rls_test.hook('d1000000-0000-0000-0000-000000000002') #>> '{claims,app_roles}', '["parent", "teacher"]');
SET LOCAL ROLE service_role;

-- ---------------------------------------------------------------------------
-- All or nothing: if the audit row can't be written, nothing is kept
-- ---------------------------------------------------------------------------

RESET ROLE;
REVOKE INSERT ON public.audit_log FROM service_role;
SET LOCAL ROLE service_role;
SELECT rls_test.refused('audit insert fails: the accept fails',
  $$SELECT * FROM public.accept_invitation('tok16-audit-000000000001', 'd9000000-0000-0000-0000-000000000003', 'Audit Person')$$,
  'permission denied');
SELECT rls_test.eq('audit insert fails: no profile or membership is left',
  rls_test.written('d9000000-0000-0000-0000-000000000003'), 0);
SELECT rls_test.is('audit insert fails: the invite is still pending',
  rls_test.invite_status('tok16-audit-000000000001'), 'pending');
RESET ROLE;
GRANT INSERT ON public.audit_log TO service_role;

-- ---------------------------------------------------------------------------
-- The other school never changed
-- ---------------------------------------------------------------------------

SELECT rls_test.eq('the other school has the same people and memberships',
  (SELECT count(*) FROM public.profiles WHERE tenant_id = 'd2000000-0000-0000-0000-000000000000')
  + (SELECT count(*) FROM public.memberships WHERE tenant_id = 'd2000000-0000-0000-0000-000000000000'),
  (SELECT n FROM other_before));

ROLLBACK;
