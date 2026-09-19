-- AFTERLIFE: chat global foi descontinuado.
-- Dependências verificadas: nenhum frontend atual referencia campaign_messages
-- e nenhuma outra tabela possui FK apontando para ela.
-- As três RPCs legadas também foram removidas nesta migração.

drop function if exists public.list_campaign_messages(uuid,integer,uuid);
drop function if exists public.send_campaign_message(uuid,text,text,jsonb);
drop function if exists public.delete_campaign_message(uuid);

drop index if exists public.campaign_messages_author_idx;
drop index if exists public.campaign_messages_campaign_idx;

drop table if exists public.campaign_messages cascade;
