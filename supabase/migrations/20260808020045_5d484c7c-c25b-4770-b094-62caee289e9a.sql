ALTER TABLE public.promise_audit_logs
  ADD COLUMN IF NOT EXISTS actor_key text,
  ADD COLUMN IF NOT EXISTS actor_user_id uuid;

UPDATE public.promise_audit_logs
SET actor_key = lower(actor)
WHERE actor_key IS NULL;

ALTER TABLE public.promise_audit_logs
  ALTER COLUMN actor_key SET DEFAULT 'console@softwarevala.com';

CREATE INDEX IF NOT EXISTS promise_audit_logs_actor_key_idx
  ON public.promise_audit_logs (actor_key);