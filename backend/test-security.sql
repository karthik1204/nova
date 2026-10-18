-- Ephemeral authorization tests. All fixture users and content writes are rolled back.
begin;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data)
values ('d13ea0d1-63a7-47c5-a77b-277737a71a01','cms-test-admin@example.invalid',now(),'{}'),
       ('d13ea0d1-63a7-47c5-a77b-277737a71a02','cms-test-other@example.invalid',now(),'{"role":"admin"}'),
       ('d13ea0d1-63a7-47c5-a77b-277737a71a03','cms-test-unverified@example.invalid',null,'{}');
insert into private.website_admins values ('cms-test-admin@example.invalid'),('cms-test-unverified@example.invalid');
set local role anon;
do $$ begin
  if (select count(*) from public.website_content) <> 1 then raise exception 'FAIL anonymous draft isolation'; end if;
  begin
    update public.website_content set revision=999 where id='published';
    raise exception 'FAIL anonymous update allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','d13ea0d1-63a7-47c5-a77b-277737a71a02',true);
set local role authenticated;
do $$ begin
  if private.is_website_admin() then raise exception 'FAIL metadata escalation'; end if;
  if (select count(*) from public.website_content) <> 1 then raise exception 'FAIL nonadmin draft isolation'; end if;
  update public.website_content set revision=999 where id='draft';
  if found then raise exception 'FAIL nonadmin write'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','d13ea0d1-63a7-47c5-a77b-277737a71a03',true);
set local role authenticated;
do $$ begin
  if private.is_website_admin() then raise exception 'FAIL unverified admin'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','d13ea0d1-63a7-47c5-a77b-277737a71a01',true);
set local role authenticated;
do $$ declare r bigint; live bigint; begin
  if not private.is_website_admin() then raise exception 'FAIL verified admin'; end if;
  if (select count(*) from public.website_content) <> 2 then raise exception 'FAIL admin draft read'; end if;
  select revision into r from public.website_content where id='draft';
  update public.website_content set content='{"texts":{"Test":"Published test"},"images":{},"galleries":{}}',revision=r+1 where id='draft' and revision=r;
  if not found then raise exception 'FAIL draft save'; end if;
  update public.website_content set revision=999 where id='draft' and revision=r;
  if found then raise exception 'FAIL stale revision accepted'; end if;
  select public.publish_website(r+1) into live;
  if (select content->'texts'->>'Test' from public.website_content where id='published') <> 'Published test' then raise exception 'FAIL publish'; end if;
  if not exists(select 1 from public.website_versions where revision=live-1) then raise exception 'FAIL recovery version'; end if;
  begin
    perform public.publish_website(r);
    raise exception 'FAIL stale publish accepted';
  exception when raise_exception then
    if sqlerrm <> 'Draft changed. Reload before publishing.' then raise; end if;
  end;
end $$;
rollback;
