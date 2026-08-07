ALTER TABLE public.promise_audit_logs
  ADD COLUMN IF NOT EXISTS promise_id uuid REFERENCES public.promises(id) ON DELETE SET NULL;

UPDATE public.promise_audit_logs l
SET promise_id = p.id
FROM public.promises p
WHERE l.promise_id IS NULL AND l.promise_code IS NOT NULL AND l.promise_code = p.code;

CREATE INDEX IF NOT EXISTS promise_audit_logs_promise_id_idx ON public.promise_audit_logs(promise_id);

DELETE FROM public.promise_settings a
USING public.promise_settings b
WHERE a.singleton AND b.singleton AND a.updated_at < b.updated_at;

CREATE UNIQUE INDEX IF NOT EXISTS promise_settings_singleton_uidx
  ON public.promise_settings(singleton) WHERE singleton;