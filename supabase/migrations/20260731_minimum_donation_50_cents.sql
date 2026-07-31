alter table public.donations
  drop constraint if exists donations_amount_cents_check;

alter table public.donations
  add constraint donations_amount_cents_check
  check (amount_cents >= 50);
