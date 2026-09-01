-- Harden SECURITY DEFINER functions that predate the empty-search-path
-- convention used by the current schema. No data is changed.

alter function public.consume_payment_rate_limit(text, text, integer, integer)
  set search_path = '';

alter function public.cleanup_payment_rate_limits()
  set search_path = '';

alter function public.update_platform_impact_stats()
  set search_path = '';
