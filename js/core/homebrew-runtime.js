import { getSupabase } from "./supabase.js";

(() => {
  "use strict";
  const state = { sources: [], content: [], races: [], classes: [], items: [], all: [], ready: false };
  const emit = (name, detail={}) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const normalize = v => String(v ?? "").trim().toLowerCase();
  const parseArray = v => Array.isArray(v) ? v : (v ? String(v).split(/[,\n]/).map(x => x.trim()).filter(Boolean) : []);
  async function load(){
    try{
      const sb = await getSupabase();
      const user = await sb.auth.getUser();
      if(user.error || !user.data.user) return;
      const src = await sb.from("homebrew_sources")
        .select("id,name,slug,status,visibility,owner_id,version")
        .order("updated_at",{ascending:false});
      if(src.error) throw src.error;
      state.sources = src.data || [];
      const rows = [];
      for(const s of state.sources){
        const r = await sb.from("homebrew_content")
          .select("id,source_id,content_type,title,slug,summary,content,status,data,tags")
          .eq("source_id",s.id).eq("status","published")
          .order("sort_order").order("updated_at",{ascending:false});
        if(!r.error){
          (r.data || []).forEach(x => rows.push({...x, homebrew_source:s}));
        }
      }
      state.content = rows;
      state.all = rows;
      state.races = rows.filter(x => ["race","subrace","animalha"].includes(x.content_type));
      state.classes = rows.filter(x => x.content_type === "class");
      state.items = rows.filter(x => ["item","equipment"].includes(x.content_type));
      state.ready = true;
      window.AERION_HOMEBREW = Object.freeze(state);
      emit("aerion:homebrew:ready",{homebrew:state});
    }catch(error){
      console.warn("[AERIOM][HOMEBREW] runtime load failed", error);
    }
  }
  window.AERION_HOMEBREW = state;
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, {once:true});
  else load();
})();