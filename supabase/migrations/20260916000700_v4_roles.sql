-- Add roles before the following migration uses their permissions.
alter type public.user_role add value if not exists 'editor_in_chief';
alter type public.user_role add value if not exists 'sub_editor';
alter type public.user_role add value if not exists 'contributor';
alter type public.user_role add value if not exists 'moderator';
alter type public.user_role add value if not exists 'analyst';
alter type public.user_role add value if not exists 'ad_manager';
