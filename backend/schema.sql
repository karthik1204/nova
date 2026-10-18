-- Nova Website CMS. Applied through Supabase migrations, not on every build.
-- Public schema reference: the private administrator email is deliberately omitted.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table private.website_admins (email text primary key check (email = lower(email)));
alter table private.website_admins enable row level security;
revoke all on private.website_admins from anon, authenticated;
-- A trusted database administrator must insert the owner's approved email separately.
-- The existing production allowlist is already configured; do not rerun this setup.

-- Authorization uses the current verified Auth record, never user-editable metadata.
create function private.is_website_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u join private.website_admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until < now())
  );
$$;
revoke all on function private.is_website_admin() from public, anon;
grant execute on function private.is_website_admin() to authenticated;

create table public.website_content (
  id text primary key check (id in ('draft', 'published')),
  content jsonb not null default '{"texts":{},"images":{},"galleries":{}}',
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(content) = 'object' and octet_length(content::text) < 1000000)
);
alter table public.website_content enable row level security;
revoke all on public.website_content from anon, authenticated;
grant select on public.website_content to anon, authenticated;
grant update on public.website_content to authenticated;
create policy published_read on public.website_content for select to anon using (id = 'published');
create policy member_read on public.website_content for select to authenticated
  using (id = 'published' or (select private.is_website_admin()));
create policy admin_write on public.website_content for update to authenticated
  using ((select private.is_website_admin())) with check ((select private.is_website_admin()));
insert into public.website_content (id) values ('draft'), ('published');

create table public.website_versions (
  revision bigint primary key,
  content jsonb not null,
  published_at timestamptz not null default now()
);
alter table public.website_versions enable row level security;
revoke all on public.website_versions from anon, authenticated;
grant select, insert on public.website_versions to authenticated;
create policy admin_read on public.website_versions for select to authenticated using ((select private.is_website_admin()));
create policy admin_insert on public.website_versions for insert to authenticated with check ((select private.is_website_admin()));

create function public.publish_website(expected_revision bigint) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare draft public.website_content; live public.website_content;
begin
  if not private.is_website_admin() then raise exception 'Admin access required'; end if;
  select * into draft from public.website_content where id = 'draft' for update;
  if draft.revision <> expected_revision then raise exception 'Draft changed. Reload before publishing.'; end if;
  select * into live from public.website_content where id = 'published' for update;
  insert into public.website_versions(revision, content) values (live.revision, live.content);
  update public.website_content set content = draft.content, revision = live.revision + 1, updated_at = now() where id = 'published';
  return live.revision + 1;
end;
$$;
revoke all on function public.publish_website(bigint) from public, anon;
grant execute on function public.publish_website(bigint) to authenticated;

-- Public image files are intentional: uploads are viewable by URL immediately.
-- Draft text remains private. Unique immutable names prevent cache/stale-image issues.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('website-images', 'website-images', true, 10485760, array['image/jpeg','image/png','image/webp']);
create policy website_image_read on storage.objects for select to authenticated
  using (bucket_id = 'website-images' and (select private.is_website_admin()));
create policy website_image_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'website-images' and (select private.is_website_admin()));
-- No direct delete/update: removing from a gallery preserves older published versions.
