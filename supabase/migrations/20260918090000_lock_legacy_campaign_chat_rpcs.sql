-- AFTERLIFE FASE 1
-- Fecha completamente a superfície RPC do chat global legado.
-- A tabela campaign_messages pode permanecer por histórico/rollback,
-- mas nenhum cliente autenticado deve conseguir chamar estas funções.

revoke execute on function public.list_campaign_messages(uuid,integer,uuid) from anon, authenticated, public;
revoke execute on function public.send_campaign_message(uuid,text,text,jsonb) from anon, authenticated, public;
revoke execute on function public.delete_campaign_message(uuid) from anon, authenticated, public;
