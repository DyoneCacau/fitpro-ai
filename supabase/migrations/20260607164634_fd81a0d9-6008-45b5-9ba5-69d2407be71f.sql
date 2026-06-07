
REVOKE EXECUTE ON FUNCTION public.can_see_feed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_feed(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.auto_close_stale_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_stale_sessions() TO service_role;
