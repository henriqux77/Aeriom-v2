(() => {
  "use strict";

  const rootId = "campaign-theme-selector";
  const sectionId = "aeriom-cinematic-controls";
  const campaignId = () => window.AERIOM_CAMPAIGN?.getContext?.()?.campaignId || window.AERIOM_CAMPAIGN?.getContext?.()?.campaign?.id || new URLSearchParams(location.search).get("campaign");
  const isMaster = () => String(window.AERIOM_CAMPAIGN?.getContext?.()?.membership?.role || "").toLowerCase() === "master";
  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const defaults = Object.freeze({ animations_enabled:true, particles_enabled:true, particle_density:12, animation_speed:0.62 });
  let values = { ...defaults };
  let saveTimer = null;
  let loading = false;

  function style() {
    if (document.getElementById("aeriom-cinematic-controls-style")) return;
    const s = document.createElement("style");
    s.id = "aeriom-cinematic-controls-style";
    s.textContent = `
      #${sectionId}{margin-top:0}
      .aeriom-cinematic-control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .aeriom-cinematic-control{display:grid;gap:7px;padding:10px 11px;border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.015)}
      .aeriom-cinematic-control__head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .aeriom-cinematic-control__head strong{font-size:9px;color:rgba(255,255,255,.72)}
      .aeriom-cinematic-control__head span{font-size:8px;font-weight:800;color:#d1b76b}
      .aeriom-cinematic-control small{font-size:7px;color:rgba(255,255,255,.33);line-height:1.45}
      .aeriom-cinematic-control input[type=range]{width:100%;accent-color:var(--campaign-gold,#c49e53)}
      .aeriom-cinematic-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:35px;padding:0 10px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.015);font-size:8px;color:rgba(255,255,255,.6)}
      .aeriom-cinematic-switch input{width:16px;height:16px;accent-color:var(--campaign-gold,#c49e53)}
      .aeriom-cinematic-save-note{margin-top:8px;font-size:7px;color:rgba(255,255,255,.28)}
      @media(max-width:700px){.aeriom-cinematic-control-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function setValues(next) {
    values = {
      ...values,
      ...next,
      animations_enabled: next.animations_enabled !== undefined ? Boolean(next.animations_enabled) : values.animations_enabled,
      particles_enabled: next.particles_enabled !== undefined ? Boolean(next.particles_enabled) : values.particles_enabled,
      particle_density: Math.max(0, Math.min(60, Number(next.particle_density ?? values.particle_density))),
      animation_speed: Math.max(0.25, Math.min(2.5, Number(next.animation_speed ?? values.animation_speed)))
    };
  }

  function save(partial) {
    if (!isMaster()) return;
    setValues(partial);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const sb = ctx()?.supabase;
      const id = campaignId();
      if (!sb || !id || loading) return;
      loading = true;
      try {
        const payload = {
          campaign_id:id,
          animations_enabled:Boolean(values.animations_enabled),
          particles_enabled:Boolean(values.particles_enabled),
          particle_density:Math.round(values.particle_density),
          animation_speed:Number(values.animation_speed.toFixed(2)),
          updated_by:ctx()?.user?.id || null,
          updated_at:new Date().toISOString()
        };
        const result = await sb.from("campaign_atmosphere_settings").upsert(payload,{onConflict:"campaign_id"});
        if (result.error) throw result.error;
        window.dispatchEvent(new CustomEvent("aeriom:atmospherechange", { detail:{ campaignId:id, settings:{ ...values } } }));
      } catch(error) {
        console.error("[AERIOM][CINEMATIC CONTROLS]",error);
      } finally { loading=false; }
    }, 350);
  }

  function inputMarkup() {
    const disabled = isMaster() ? "" : " disabled";
    const speed = Number(values.animation_speed || defaults.animation_speed);
    return `
      <section id="${sectionId}" class="aeriom-atmosphere__section">
        <div class="aeriom-atmosphere__head"><div><h3>Cinema e animações</h3><p>Controle o ritmo dos efeitos da mesa sem interferir no jogo.</p></div><span class="aeriom-atmosphere__badge">PERFORMANCE</span></div>
        <div class="aeriom-cinematic-control-grid">
          <div class="aeriom-cinematic-control"><div class="aeriom-cinematic-control__head"><strong>Animações</strong></div><label class="aeriom-cinematic-switch"><span>Ativar efeitos cinematográficos</span><input type="checkbox" data-cin-toggle="animations_enabled"${values.animations_enabled?" checked":""}${disabled}></label><small>Desligue para deixar a interface estática e economizar recursos.</small></div>
          <div class="aeriom-cinematic-control"><div class="aeriom-cinematic-control__head"><strong>Partículas</strong></div><label class="aeriom-cinematic-switch"><span>Mostrar partículas</span><input type="checkbox" data-cin-toggle="particles_enabled"${values.particles_enabled?" checked":""}${disabled}></label><small>Folhas, poeira, brasas, névoa e outros efeitos ambientais.</small></div>
          <div class="aeriom-cinematic-control"><div class="aeriom-cinematic-control__head"><strong>Densidade das partículas</strong><span data-cin-value="particle_density">${Math.round(values.particle_density)}%</span></div><input type="range" min="0" max="60" step="1" value="${Math.round(values.particle_density)}" data-cin-range="particle_density"${disabled}><small>Quanto maior, mais elementos aparecem simultaneamente.</small></div>
          <div class="aeriom-cinematic-control"><div class="aeriom-cinematic-control__head"><strong>Velocidade da animação</strong><span data-cin-value="animation_speed">${speed.toFixed(2)}×</span></div><input type="range" min="0.25" max="2.5" step="0.05" value="${speed}" data-cin-range="animation_speed"${disabled}><small>Valores baixos criam uma sensação mais lenta e cinematográfica.</small></div>
        </div>
        <div class="aeriom-cinematic-save-note">As mudanças são publicadas para todos os jogadores da campanha.</div>
      </section>`;
  }

  async function hydrateFromDatabase() {
    const sb = ctx()?.supabase;
    const id = campaignId();
    if (!sb || !id) return;
    try {
      const { data } = await sb.from("campaign_atmosphere_settings").select("animations_enabled,particles_enabled,particle_density,animation_speed").eq("campaign_id",id).maybeSingle();
      if (data) setValues(data);
    } catch {}
  }

  function bind(root) {
    root.querySelectorAll("[data-cin-toggle]").forEach(input => input.addEventListener("change", () => {
      if (!isMaster()) return;
      save({ [input.dataset.cinToggle]:input.checked });
    }));
    root.querySelectorAll("[data-cin-range]").forEach(input => input.addEventListener("input", () => {
      if (!isMaster()) return;
      const field=input.dataset.cinRange;
      const value=Number(input.value);
      setValues({ [field]:value });
      const out=root.querySelector(`[data-cin-value="${field}"]`);
      if(out) out.textContent=field==="animation_speed"?`${value.toFixed(2)}×`:`${Math.round(value)}%`;
      save({ [field]:value });
    }));
  }

  async function enhance() {
    style();
    const root = document.getElementById(rootId);
    if (!root) return;
    if (!root.querySelector(`#${sectionId}`)) {
      await hydrateFromDatabase();
      const host = root.querySelector(".aeriom-atmosphere");
      if (!host) return;
      host.insertAdjacentHTML("beforeend", inputMarkup());
      bind(root);
    }
  }

  window.addEventListener("aeriom:campaign:ready", () => setTimeout(enhance,250));
  window.addEventListener("aeriom:campaigntabchange", e => { if(e.detail?.tab==="theme") setTimeout(enhance,120); });
  window.addEventListener("aeriom:atmospherechange", e => {
    if (e.detail?.settings) setValues(e.detail.settings);
    setTimeout(enhance,60);
    const host=document.getElementById(rootId);
    if(!host) return;
    host.querySelectorAll("[data-cin-toggle]").forEach(input => { const f=input.dataset.cinToggle; if(f in values) input.checked=Boolean(values[f]); });
    host.querySelectorAll("[data-cin-range]").forEach(input => { const f=input.dataset.cinRange; if(f in values) input.value=String(values[f]); });
  });
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(enhance,350),{once:true}); else setTimeout(enhance,350);
})();
