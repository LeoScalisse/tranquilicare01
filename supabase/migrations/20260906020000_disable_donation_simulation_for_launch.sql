-- Production launch invariant: simulated donations must never be accepted.
update private.runtime_feature_flags
set enabled = false,
    updated_at = now()
where key = 'donation_simulation';
