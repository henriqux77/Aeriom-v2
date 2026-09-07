-- Corrige a entrada de jogadores por convite quando RLS impede
-- o SELECT/UPDATE de campaign_invites no contexto do jogador.
--
-- O RPC continua validando auth.uid(), código, expiração e usos.
-- SECURITY DEFINER permite que a própria função consulte/atualize
-- campaign_invites e insira o membro usando as regras do RPC.
alter function public.accept_campaign_invite(text)
  security definer;

alter function public.accept_campaign_invite(text)
  set search_path = public, extensions;
