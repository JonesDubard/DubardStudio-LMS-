-- Tests for 0018 (US-008b): create-or-reuse an invitation, and mark it sent.
-- Run on a database with 0001-0018 applied; everything is rolled back at the end.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f tests/rls/0018_invitation_send_tests.sql
\pset tuples_only on
\pset format unaligned
BEGIN;
CREATE SCHEMA rls_test;
CREATE FUNCTION rls_test.is(label text, got text, want text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN RAISE EXCEPTION 'FAIL - % (got %, want %)', label, got, want; END IF;
  RAISE NOTICE 'ok - %', label;
END $$;
CREATE FUNCTION rls_test.refused(label text, stmt text, want_text text DEFAULT '') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF position(want_text IN SQLERRM) = 0 THEN
      RAISE EXCEPTION 'FAIL - % (refused, but with "%", expected "%")', label, SQLERRM, want_text;
    END IF;
    RAISE NOTICE 'ok - % (refused: %)', label, SQLERRM; RETURN;
  END;
  RAISE EXCEPTION 'FAIL - % (was allowed)', label;
END $$;
GRANT USAGE ON SCHEMA rls_test TO service_role, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_test TO service_role, authenticated;

INSERT INTO public.tenants (id, name, subdomain, contact_name, contact_email, subscription_status, onboarding_status, primary_color, secondary_color)
VALUES ('91000000-0000-4000-8000-000000000001', 'Invite School', 'invite-school', 'Ada', 'ada@example.test', 'trial', 'provisioning', '#1F3A5F', '#F2A900'),
       ('91000000-0000-4000-8000-000000000002', 'Other School',  'other-school',  'Bo',  'bo@example.test',  'trial', 'provisioning', '#1F3A5F', '#F2A900'),
       ('91000000-0000-4000-8000-000000000003', 'Frozen School', 'frozen-school', 'Cy',  'cy@example.test',  'suspended', 'provisioning', '#1F3A5F', '#F2A900');

CREATE TABLE rls_test.ids (k text, v uuid);
GRANT ALL ON rls_test.ids TO service_role;
CREATE FUNCTION rls_test.h(c char) RETURNS text LANGUAGE sql AS $$ SELECT repeat(c::text, 64) $$;
GRANT EXECUTE ON FUNCTION rls_test.h(char) TO service_role;
CREATE FUNCTION rls_test.n(tenant uuid) RETURNS text LANGUAGE sql AS $$
  SELECT count(*)::text FROM public.invitations WHERE tenant_id = tenant $$;
GRANT EXECUTE ON FUNCTION rls_test.n(uuid) TO service_role;

SET LOCAL ROLE service_role;

-- 1. First call creates one invitation, unsent
INSERT INTO rls_test.ids SELECT 'first', invitation_id
  FROM public.upsert_invitation('91000000-0000-4000-8000-000000000001', '  Ada@Example.test ', 'school_admin', NULL, rls_test.h('a'));
SELECT rls_test.is('first call creates exactly one invitation', rls_test.n('91000000-0000-4000-8000-000000000001'), '1');
SELECT rls_test.is('it is pending, unsent, lowercase email, 7 days, no inviter',
  (SELECT status || '/' || (sent_at IS NULL) || '/' || email || '/' || (expires_at > now() + interval '6 days 23 hours') || '/' || (invited_by IS NULL)
   FROM public.invitations WHERE id = (SELECT v FROM rls_test.ids WHERE k = 'first')),
  'pending/true/ada@example.test/true/true');
-- 2. It can be marked sent, only with the token that was emailed
SELECT rls_test.is('mark sent with the wrong token does nothing',
  public.mark_invitation_sent((SELECT v FROM rls_test.ids WHERE k = 'first'), rls_test.h('b'))::text, 'false');
SELECT rls_test.is('sent_at still empty after the wrong token',
  (SELECT (sent_at IS NULL)::text FROM public.invitations WHERE id = (SELECT v FROM rls_test.ids WHERE k = 'first')), 'true');
SELECT rls_test.is('mark sent with the right token works',
  public.mark_invitation_sent((SELECT v FROM rls_test.ids WHERE k = 'first'), rls_test.h('a'))::text, 'true');
SELECT rls_test.is('sent_at is now set',
  (SELECT (sent_at IS NOT NULL)::text FROM public.invitations WHERE id = (SELECT v FROM rls_test.ids WHERE k = 'first')), 'true');

-- 3. A resend reuses the same row, new token, sent_at cleared
INSERT INTO rls_test.ids SELECT 'again', invitation_id
  FROM public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'ADA@example.test', 'school_admin', NULL, rls_test.h('c'));
SELECT rls_test.is('resend returns the same invitation id',
  (SELECT v::text FROM rls_test.ids WHERE k = 'again'), (SELECT v::text FROM rls_test.ids WHERE k = 'first'));
SELECT rls_test.is('still exactly one invitation after a resend', rls_test.n('91000000-0000-4000-8000-000000000001'), '1');
SELECT rls_test.is('resend replaced the token and cleared sent_at',
  (SELECT (token_hash = rls_test.h('c'))::text || '/' || (sent_at IS NULL)::text FROM public.invitations
   WHERE id = (SELECT v FROM rls_test.ids WHERE k = 'first')), 'true/true');
SELECT rls_test.is('reused = true on a resend',
  (SELECT reused::text FROM public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'ada@example.test', 'school_admin', NULL, rls_test.h('d'))),
  'true');
SELECT rls_test.is('the old token can no longer mark it sent (a slow older call cannot win)',
  public.mark_invitation_sent((SELECT v FROM rls_test.ids WHERE k = 'first'), rls_test.h('c'))::text, 'false');
SELECT rls_test.is('five resends later: still one invitation', (
  SELECT rls_test.n('91000000-0000-4000-8000-000000000001') FROM generate_series(1, 5) g
  WHERE (SELECT count(*) FROM public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'ada@example.test', 'school_admin', NULL, rls_test.h('e'))) = 1
  LIMIT 1), '1');

-- A resend of an invitation that is about to expire gives it a fresh 7 days
RESET ROLE;
UPDATE public.invitations SET expires_at = now() + interval '1 hour' WHERE id = (SELECT v FROM rls_test.ids WHERE k = 'first');
SET LOCAL ROLE service_role;
SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'ada@example.test', 'school_admin', NULL, rls_test.h('6'));
SELECT rls_test.is('a resend extends the expiry to a fresh 7 days',
  (SELECT (expires_at > now() + interval '6 days 23 hours')::text FROM public.invitations WHERE id = (SELECT v FROM rls_test.ids WHERE k = 'first')), 'true');

-- 4. Other people, roles and schools get their own invitations
SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'teach@example.test', 'teacher', NULL, rls_test.h('f'));
SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'ada@example.test', 'teacher', NULL, rls_test.h('1'));
SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000002', 'ada@example.test', 'school_admin', NULL, rls_test.h('2'));
SELECT rls_test.is('a call for a new person reports reused = false',
  (SELECT reused::text FROM public.upsert_invitation('91000000-0000-4000-8000-000000000002', 'new.person@example.test', 'parent', NULL, rls_test.h('9'))),
  'false');
SELECT rls_test.is('another person, another role, another school each get their own',
  rls_test.n('91000000-0000-4000-8000-000000000001') || '/' || rls_test.n('91000000-0000-4000-8000-000000000002'), '3/2');

-- 5. Refusals
SELECT rls_test.refused('bad email',      $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'nope', 'teacher', NULL, rls_test.h('3'))$q$, 'invalid_email');
SELECT rls_test.refused('null email',     $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', NULL, 'teacher', NULL, rls_test.h('3'))$q$, 'invalid_email');
SELECT rls_test.refused('unknown role',   $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'x@example.test', 'platform_admin', NULL, rls_test.h('3'))$q$, 'invalid_role');
SELECT rls_test.refused('bad token hash', $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'x@example.test', 'teacher', NULL, 'abc')$q$, 'invalid_token_hash');
SELECT rls_test.refused('unknown school', $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-0000000000ff', 'x@example.test', 'teacher', NULL, rls_test.h('3'))$q$, 'school_not_found');
SELECT rls_test.refused('suspended school', $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000003', 'x@example.test', 'teacher', NULL, rls_test.h('3'))$q$, 'school_suspended');
RESET ROLE;

-- Already a member of the school with that role
INSERT INTO auth.users (id, email) VALUES ('91000000-0000-4000-8000-0000000000b1', 'member@example.test');
INSERT INTO public.profiles (id, tenant_id, full_name, email, status)
VALUES ('91000000-0000-4000-8000-0000000000b1', '91000000-0000-4000-8000-000000000001', 'Mem Ber', 'member@example.test', 'active');
INSERT INTO public.memberships (tenant_id, profile_id, role, status)
VALUES ('91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-0000000000b1', 'teacher', 'active');
SET LOCAL ROLE service_role;
SELECT rls_test.refused('inviting someone who already has the role',
  $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'MEMBER@example.test', 'teacher', NULL, rls_test.h('3'))$q$, 'already_member');
RESET ROLE;
INSERT INTO auth.users (id, email) VALUES ('91000000-0000-4000-8000-0000000000b2', 'gone@example.test');
INSERT INTO public.profiles (id, tenant_id, full_name, email, status)
VALUES ('91000000-0000-4000-8000-0000000000b2', '91000000-0000-4000-8000-000000000001', 'Gone Person', 'gone@example.test', 'active');
INSERT INTO public.memberships (tenant_id, profile_id, role, status)
VALUES ('91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-0000000000b2', 'teacher', 'removed');
SET LOCAL ROLE service_role;
SELECT rls_test.is('a removed member can be invited again',
  (SELECT count(*)::text FROM public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'gone@example.test', 'teacher', NULL, rls_test.h('7'))), '1');
SELECT rls_test.is('...but a different role is fine',
  (SELECT count(*)::text FROM public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'member@example.test', 'parent', NULL, rls_test.h('4'))), '1');

-- 6. An accepted invitation is not reused: a new one is created for a new invite
RESET ROLE;
UPDATE public.invitations SET status = 'accepted' WHERE id = (SELECT v FROM rls_test.ids WHERE k = 'first');
SET LOCAL ROLE service_role;
SELECT rls_test.is('after accepting, inviting the same person again makes a new invitation',
  (SELECT (invitation_id <> (SELECT v FROM rls_test.ids WHERE k = 'first'))::text || '/' || (NOT reused)::text
   FROM public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'ada@example.test', 'school_admin', NULL, rls_test.h('5'))),
  'true/true');
SELECT rls_test.is('mark sent does not touch an accepted invitation',
  public.mark_invitation_sent((SELECT v FROM rls_test.ids WHERE k = 'first'), rls_test.h('6'))::text, 'false');
RESET ROLE;

-- 7. Users cannot call these
SET LOCAL ROLE authenticated;
SELECT rls_test.refused('a signed-in user cannot create invitations this way',
  $q$SELECT public.upsert_invitation('91000000-0000-4000-8000-000000000001', 'x@example.test', 'teacher', NULL, repeat('a', 64))$q$, 'permission denied');
RESET ROLE;

\echo 'All 0018 tests passed. Rolling back.'
ROLLBACK;