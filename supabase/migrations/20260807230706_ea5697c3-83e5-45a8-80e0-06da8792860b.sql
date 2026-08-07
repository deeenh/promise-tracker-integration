REVOKE EXECUTE ON FUNCTION public.pt_prune_health_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pt_prune_health_events() TO service_role;