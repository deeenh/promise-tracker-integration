CREATE TABLE public.promise_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  level text NOT NULL DEFAULT 'error',
  event text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.promise_health_events TO anon;
GRANT SELECT, INSERT, DELETE ON public.promise_health_events TO authenticated;
GRANT ALL ON public.promise_health_events TO service_role;

ALTER TABLE public.promise_health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pt_health_all ON public.promise_health_events FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX promise_health_events_created_at_idx ON public.promise_health_events (created_at DESC);

CREATE OR REPLACE FUNCTION public.pt_prune_health_events()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.promise_health_events WHERE created_at < now() - interval '14 days';
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.promise_health_events;