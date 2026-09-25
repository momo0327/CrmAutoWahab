-- Assign team_lead role to the two designated accounts
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'team_lead'::public.app_role
FROM auth.users
WHERE lower(email) IN ('kassem@autowahab.se', 'arriahmed673@gmail.com')
ON CONFLICT DO NOTHING;
