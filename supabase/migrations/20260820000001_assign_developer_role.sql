-- Assign developer role to the developer account
-- Must be in a separate migration from the ADD VALUE so the enum commit is visible
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'developer'::public.app_role
FROM auth.users
WHERE lower(email) = 'arriahmed673@gmail.com'
ON CONFLICT DO NOTHING;
