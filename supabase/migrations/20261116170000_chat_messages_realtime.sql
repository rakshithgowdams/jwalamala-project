-- Enable Realtime for staff chat messages (idempotent).
-- Run if chat tables already exist but messages do not appear live for other users.

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;
