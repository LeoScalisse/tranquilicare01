-- Run this single statement before accepting real payments.
update private.runtime_feature_flags
set enabled = false,
    updated_at = now()
where key = 'donation_simulation';

