CREATE TABLE public.valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vehicle details
  brand TEXT,
  model TEXT,
  vehicle_type TEXT,
  axle_config TEXT,
  year INTEGER,
  mileage INTEGER,
  body_builder TEXT,
  capacity TEXT,
  equipment TEXT,

  -- Valuation
  valuation_price INTEGER,
  valuation_date DATE,
  purchase_price INTEGER,
  purchase_date DATE,
  sale_price INTEGER,
  sale_date DATE,

  -- Free notes
  notes TEXT,

  -- Images stored as array of Supabase Storage paths
  images TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.valuations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.valuations TO authenticated;
GRANT ALL ON public.valuations TO service_role;

DROP POLICY IF EXISTS "Owner select valuations" ON public.valuations;
CREATE POLICY "Owner select valuations" ON public.valuations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner insert valuations" ON public.valuations;
CREATE POLICY "Owner insert valuations" ON public.valuations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner update valuations" ON public.valuations;
CREATE POLICY "Owner update valuations" ON public.valuations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner delete valuations" ON public.valuations;
CREATE POLICY "Owner delete valuations" ON public.valuations FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all valuations" ON public.valuations;
CREATE POLICY "Admins view all valuations" ON public.valuations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_valuations_user ON public.valuations(user_id);
CREATE INDEX idx_valuations_brand ON public.valuations(user_id, brand);
CREATE INDEX idx_valuations_date ON public.valuations(user_id, valuation_date DESC);

CREATE TRIGGER update_valuations_updated_at
  BEFORE UPDATE ON public.valuations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for valuation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('valuation-images', 'valuation-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own valuation images" ON storage.objects;
CREATE POLICY "Users upload own valuation images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'valuation-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own valuation images" ON storage.objects;
CREATE POLICY "Users read own valuation images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'valuation-images');

DROP POLICY IF EXISTS "Users delete own valuation images" ON storage.objects;
CREATE POLICY "Users delete own valuation images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'valuation-images' AND (storage.foldername(name))[1] = auth.uid()::text);
