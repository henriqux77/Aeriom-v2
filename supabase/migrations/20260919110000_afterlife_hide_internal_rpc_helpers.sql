-- AFTERLIFE: helpers internos não precisam ficar expostos via PostgREST RPC.
revoke execute on function public.append_campaign_event(uuid,text,text,text,uuid,jsonb)
  from anon,authenticated,public;

revoke execute on function public.ensure_campaign_storage(uuid,text)
  from anon,authenticated,public;
