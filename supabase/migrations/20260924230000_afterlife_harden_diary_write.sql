-- AFTERLIFE: diary writes are a Master action in the current UI.
create or replace function public.append_campaign_diary_entry(
  p_campaign_id uuid,
  p_title text,
  p_body text default '',
  p_event_type text default 'note',
  p_occurred_at timestamptz default now(),
  p_source_type text default null,
  p_source_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.campaign_diary_entries
language plpgsql
security definer
set search_path='public'
as $$
declare
  r public.campaign_diary_entries;
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode='42501'; end if;
  if not public.afterlife_is_master(p_campaign_id,uid) then
    raise exception 'MASTER_REQUIRED' using errcode='42501';
  end if;
  if length(trim(coalesce(p_title,''))) < 1 or length(trim(coalesce(p_title,''))) > 180 then
    raise exception 'INVALID_TITLE' using errcode='22023';
  end if;
  insert into public.campaign_diary_entries(
    campaign_id,author_user_id,event_type,title,body,occurred_at,source_type,source_id,metadata
  )
  values(
    p_campaign_id,uid,coalesce(nullif(trim(p_event_type),''),'note'),
    left(trim(p_title),180),left(coalesce(p_body,''),5000),
    coalesce(p_occurred_at,now()),p_source_type,p_source_id,coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into r;
  return r;
end;
$$;

revoke all on function public.append_campaign_diary_entry(uuid,text,text,text,timestamptz,text,uuid,jsonb) from public,anon;
grant execute on function public.append_campaign_diary_entry(uuid,text,text,text,timestamptz,text,uuid,jsonb) to authenticated;
