-- A school can have more than one class with the same name.
-- Liberian schools name the group itself: "Grade 1", "Grade 2", "JSS 1".

DROP INDEX IF EXISTS public.classes_tenant_name_key;

NOTIFY pgrst, 'reload schema';
