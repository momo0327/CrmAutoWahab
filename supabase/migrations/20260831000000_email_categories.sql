-- Email categories: per-user tags for companies' emails
CREATE TABLE IF NOT EXISTS public.email_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  label      text NOT NULL,
  color      text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email categories"
  ON public.email_categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add email_category_id to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS email_category_id uuid
  REFERENCES public.email_categories(id) ON DELETE SET NULL;
