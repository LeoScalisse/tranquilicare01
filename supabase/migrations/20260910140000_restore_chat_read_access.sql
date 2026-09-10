-- The existing RLS policies call this helper, but authenticated lacked EXECUTE.
-- Keep the participant-only policies: this restores reads and Realtime without
-- exposing conversations to non-participants or allowing sender impersonation.
grant execute on function private.is_chat_participant(uuid, uuid) to authenticated;
