-- Add team_lead value to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_lead';
