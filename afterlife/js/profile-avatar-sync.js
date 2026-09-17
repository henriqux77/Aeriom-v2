import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { aeriom, ensureAfterlifeSession } from './aeriom-client-v2.js?v=20260915-6';

(() => {
  'use strict';
  if (window.__afterlifeProfileAvatarSyncBooted) return;
  window.__afterlifeProfileAvatarSyncBooted = true;

  const PORTAL_URL = 'https://kitlpowgcugvlxwhwhqv.supabase.co';
  const PORTAL_KEY = 'sb_publishable_WDlPiR0b8T6mlQfYMbwjGg_BGvQPZDW';
  const PORTAL_STORAGE_KEY = 'sb-kitlpowgcugvlxwhwhqv-auth-token';
  const HANDOFF_KEY = 'afterlife_portal_handoff';
  const SYNC_KEY = '__AFTERLIFE_PROFILE_AVATAR_SYNC_PROMISE__';

  function parse(value) {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }

  function makePortalClient() {
    return createClient(PORTAL_URL, PORTAL_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: PORTAL_STORAGE_KEY,
      },
    });
  }

  async function portalSession() {
    const candidate = parse(localStorage.getItem(PORTAL_STORAGE_KEY)) || parse(localStorage.getItem(HANDOFF_KEY));
    if (!candidate?.access_token || !candidate?.refresh_token) return null;
    const client = makePortalClient();
    const { data, error } = await client.auth.setSession({ access_token: candidate.access_token, refresh_token: candidate.refresh_token });
    if (error || !data?.session?.user?.id) return null;
    return { client, session: data.session };
  }

  async function sync() {
    const portal = await portalSession();
    if (!portal) return false;

    const afterlifeSession = await ensureAfterlifeSession();
    const afterlifeUser = afterlifeSession?.user;
    if (!afterlifeUser?.id) return false;

    const { client, session } = portal;
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id,display_name,avatar_path')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const updates = {
      portal_user_id: session.user.id,
      display_name: profile?.display_name || session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Sobrevivente',
      updated_at: new Date().toISOString(),
    };

    if (profile?.avatar_path) {
      const signed = await client.storage.from('avatars').createSignedUrl(profile.avatar_path, 3600);
      const signedUrl = signed.data?.signedUrl || '';
      if (signedUrl) {
        const response = await fetch(signedUrl, { cache: 'no-store' });
        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0) {
            const extension = (String(profile.avatar_path).match(/\.([a-z0-9]+)(?:\?.*)?$/i)?.[1] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'jpg';
            const path = `${afterlifeUser.id}/profile.${extension}`;
            const { error: uploadError } = await aeriom.storage.from('avatars').upload(path, blob, {
              upsert: true,
              contentType: response.headers.get('content-type') || blob.type || 'image/jpeg',
              cacheControl: '3600',
            });
            if (uploadError) throw uploadError;
            updates.avatar_path = path;
          }
        }
      }
    }

    const { error: updateError } = await aeriom.from('profiles').update(updates).eq('id', afterlifeUser.id);
    if (updateError) {
      console.warn('[AFTERLIFE][PROFILE AVATAR SYNC]', updateError.message || updateError);
      return false;
    }

    window.dispatchEvent(new CustomEvent('afterlife:profile-synced', { detail: { userId: afterlifeUser.id, avatarPath: updates.avatar_path || '' } }));
    return true;
  }

  async function boot() {
    if (globalThis[SYNC_KEY]) return globalThis[SYNC_KEY];
    globalThis[SYNC_KEY] = sync()
      .catch((error) => {
        console.warn('[AFTERLIFE][PROFILE AVATAR SYNC]', error?.message || error);
        return false;
      })
      .finally(() => { globalThis[SYNC_KEY] = null; });
    return globalThis[SYNC_KEY];
  }

  window.AfterlifeProfileAvatarSync = { sync: boot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
