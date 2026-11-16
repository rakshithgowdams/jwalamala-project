-- Allow admins (and message authors) to delete chat content.

drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete on public.chat_messages
  for delete to authenticated
  using (
    public.has_role('admin')
    or sender_id = auth.uid()
  );

grant delete on public.chat_messages to authenticated;
grant delete on public.chat_rooms to authenticated;
grant delete on public.chat_room_members to authenticated;
