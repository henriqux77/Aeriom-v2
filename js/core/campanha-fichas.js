import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  /*
   * AERION — vínculo da ficha com a campanha.
   *
   * Um jogador:
   *   Minhas Fichas -> ficha Pronta -> campanha -> Adicionar minha ficha
   *
   * O banco valida a operação nos RPCs:
   *   aerion_attach_character_to_campaign
   *   aerion_remove_character_from_campaign
   */

  let supabase=null;
  let user=null;
  let campaignId=null;
  let membership=null;
  let entries=[];

  const $=id=>document.getElementById(id);

  function esc(v){
    return String(v??"").replace(/[&<>"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[c]);
  }

  function num(v,d=0){
    const n=Number(v);
    return Number.isFinite(n)?n:d;
  }

  function notice(message,type="warning"){
    window.dispatchEvent(new CustomEvent("aerion:toast",{
      detail:{message,type}
    }));
  }

  function injectCss(){
    if($("aerion-campaign-character-css")) return;

    const s=document.createElement("style");
    s.id="aerion-campaign-character-css";
    s.textContent=`
      .aerion-campaign-character-toolbar{display:flex;justify-content:flex-end;margin-top:8px}
      .aerion-campaign-character-add{min-height:40px;padding:0 12px;border:1px solid rgba(216,182,95,.28);border-radius:10px;background:rgba(216,182,95,.07);color:#e6c66f;font-weight:900;font-size:9px;cursor:pointer}
      .aerion-campaign-character-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .aerion-campaign-character-card{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.014)}
      .aerion-campaign-character-avatar{width:44px;height:44px;display:grid;place-items:center;border-radius:11px;border:1px solid rgba(216,182,95,.15);color:#e6c66f;font-family:Cinzel,serif}
      .aerion-campaign-character-card strong{display:block;color:rgba(255,255,255,.88);font-family:Cinzel,serif;font-size:11px}
      .aerion-campaign-character-card span,.aerion-campaign-character-card small{display:block;color:rgba(255,255,255,.44);font-size:8px;line-height:1.4}
      .aerion-campaign-character-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
      .aerion-campaign-character-action{min-height:30px;padding:0 8px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.018);color:rgba(255,255,255,.66);font-size:8px;font-weight:800;cursor:pointer}
      .aerion-campaign-character-action.primary{color:#e6c66f;border-color:rgba(216,182,95,.25)}
      .aerion-campaign-character-action.danger{color:#d99a9a;border-color:rgba(200,100,100,.18)}
      .aerion-campaign-sheet-modal{position:fixed;inset:0;z-index:1700;display:none;align-items:flex-end;justify-content:center;padding:12px;background:rgba(0,0,0,.66);backdrop-filter:blur(10px)}
      .aerion-campaign-sheet-modal.is-open{display:flex}
      .aerion-campaign-sheet-card{width:min(720px,100%);max-height:88vh;overflow:auto;padding:16px;border:1px solid rgba(216,182,95,.2);border-radius:20px 20px 12px 12px;background:#0e0c0a}
      .aerion-campaign-sheet-head{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:12px}
      .aerion-campaign-sheet-head h3{margin:3px 0 0;font:500 25px Cinzel,serif}
      .aerion-campaign-sheet-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:13px 0}
      .aerion-campaign-sheet-stat{padding:10px;border:1px solid rgba(255,255,255,.06);border-radius:11px;text-align:center}
      .aerion-campaign-sheet-stat span{display:block;color:rgba(255,255,255,.4);font-size:7px;font-weight:900;letter-spacing:.1em}
      .aerion-campaign-sheet-stat strong{display:block;margin-top:4px;color:#e6c66f;font:500 20px Cinzel,serif}
      @media(max-width:700px){.aerion-campaign-character-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  async function init(){
    injectCss();

    supabase=await getSupabase();

    const auth=await supabase.auth.getUser();
    if(auth.error) throw auth.error;

    user=auth.data?.user;
    if(!user) return;

    campaignId=
      new URLSearchParams(location.search).get("campaign");

    if(!campaignId) return;

    const m=await supabase
      .from("campaign_members")
      .select("id,campaign_id,user_id,role")
      .eq("campaign_id",campaignId)
      .eq("user_id",user.id)
      .maybeSingle();

    if(m.error) throw m.error;
    if(!m.data) return;

    membership=m.data;

    ensureAddButton();
    bindSummary();
    await refresh();
  }

  function ensureAddButton(){
    const summary=$("campaign-character-summary");
    if(!summary) return;

    const section=summary.closest(".campaign-section");
    const heading=section?.querySelector(".campaign-section__heading");
    if(!heading || $("aerion-add-campaign-character")) return;

    const box=document.createElement("div");
    box.className="aerion-campaign-character-toolbar";
    box.innerHTML=`
      <button
        type="button"
        id="aerion-add-campaign-character"
        class="aerion-campaign-character-add"
      >
        + Adicionar minha ficha
      </button>
    `;
    heading.appendChild(box);

    $("aerion-add-campaign-character")
      .addEventListener("click",openPicker);
  }

  async function loadAvailable(){
    const {data,error}=await supabase
      .from("characters")
      .select("id,name,race,class,power,hp_current,hp_max,defense,status,campaign_id,updated_at")
      .eq("user_id",user.id)
      .eq("status","completed")
      .is("campaign_id",null)
      .order("updated_at",{ascending:false});

    if(error) throw error;
    return data||[];
  }

  function picker(){
    let modal=$("aerion-campaign-character-picker");
    if(modal) return modal;

    modal=document.createElement("div");
    modal.id="aerion-campaign-character-picker";
    modal.className="aerion-campaign-sheet-modal";
    modal.innerHTML=`
      <div class="aerion-campaign-sheet-card" role="dialog" aria-modal="true">
        <div class="aerion-campaign-sheet-head">
          <div>
            <span class="eyebrow">PERSONAGEM</span>
            <h3>Adicionar à campanha</h3>
          </div>
          <button type="button" class="campaign-icon-button" data-close-picker>×</button>
        </div>
        <p style="color:rgba(255,255,255,.48);font-size:10px;line-height:1.5">
          Somente fichas finalizadas e livres de outra campanha podem entrar na mesa.
        </p>
        <div id="aerion-campaign-character-picker-list"></div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click",event=>{
      if(
        event.target===modal ||
        event.target.closest("[data-close-picker]")
      ){
        modal.classList.remove("is-open");
      }
    });

    return modal;
  }

  async function openPicker(){
    const modal=picker();
    const list=$("aerion-campaign-character-picker-list");

    list.innerHTML=
      '<div class="campaign-character-summary__empty">Carregando fichas prontas…</div>';

    modal.classList.add("is-open");

    try{
      const chars=await loadAvailable();

      if(!chars.length){
        list.innerHTML=
          '<div class="campaign-character-summary__empty">Nenhuma ficha finalizada disponível. Finalize uma ficha em Minhas Fichas primeiro.</div>';
        return;
      }

      list.replaceChildren();

      chars.forEach(c=>{
        const item=document.createElement("article");
        item.className="aerion-campaign-character-card";
        item.innerHTML=`
          <div class="aerion-campaign-character-avatar">
            ${esc(String(c.name||"?").slice(0,1).toUpperCase())}
          </div>
          <div>
            <strong>${esc(c.name||"Ficha sem nome")}</strong>
            <span>${esc([c.race,c.class].filter(Boolean).join(" · ")||"Personagem")}</span>
            <small>
              HP ${num(c.hp_current)} / ${num(c.hp_max)}
              · Defesa ${num(c.defense,10)}
            </small>
            <div class="aerion-campaign-character-actions">
              <button
                type="button"
                class="aerion-campaign-character-action primary"
                data-add-character="${esc(c.id)}"
              >
                Adicionar
              </button>
            </div>
          </div>
        `;
        list.appendChild(item);
      });

      list.onclick=async event=>{
        const b=event.target.closest("[data-add-character]");
        if(!b) return;

        b.disabled=true;

        try{
          await addCharacter(b.dataset.addCharacter);
        }catch(error){
          b.disabled=false;
          console.error("[AERION][CAMPAIGN FICHA]",error);
          notice(error?.message||"Não foi possível adicionar a ficha.");
        }
      };
    }catch(error){
      console.error("[AERION][CAMPAIGN PICKER]",error);
      list.innerHTML=
        '<div class="campaign-character-summary__empty">Não foi possível carregar as fichas.</div>';
    }
  }

  async function addCharacter(characterId){
    const {data,error}=await supabase.rpc(
      "aerion_attach_character_to_campaign",
      {
        p_character_id:characterId,
        p_campaign_id:campaignId
      }
    );

    if(error) throw error;
    if(!data?.success){
      throw new Error("A ficha não pôde ser adicionada à campanha.");
    }

    picker().classList.remove("is-open");
    await refresh();

    notice("Ficha adicionada à campanha.","success");

    window.dispatchEvent(
      new CustomEvent("aerion:campaign:characters:changed",{
        detail:{characterId,campaignId}
      })
    );
  }

  async function removeCharacter(characterId){
    if(!confirm(
      "Remover esta ficha da campanha?\n\nEla voltará para Minhas Fichas."
    )) return;

    const {data,error}=await supabase.rpc(
      "aerion_remove_character_from_campaign",
      {
        p_character_id:characterId,
        p_campaign_id:campaignId
      }
    );

    if(error) throw error;
    if(!data?.success){
      throw new Error("A ficha não pôde ser removida.");
    }

    await refresh();
    notice("Ficha removida da campanha.","success");
  }

  async function refresh(){
    const {data,error}=await supabase
      .from("campaign_characters")
      .select(`
        id,
        campaign_id,
        character_id,
        is_present,
        display_order,
        characters(
          id,
          user_id,
          name,
          race,
          class,
          power,
          hp_current,
          hp_max,
          mana_current,
          mana_max,
          defense,
          movement,
          status
        )
      `)
      .eq("campaign_id",campaignId)
      .eq("is_present",true)
      .order("display_order",{ascending:true});

    if(error) throw error;

    entries=(data||[]).filter(x=>x.characters?.id);

    const root=$("campaign-character-summary");
    if(!root) return;

    root.replaceChildren();

    if(!entries.length){
      root.innerHTML=`
        <div class="campaign-character-summary__empty">
          <span aria-hidden="true">♜</span>
          <div>
            <strong>Nenhum personagem presente ainda.</strong>
            <p>Adicione uma ficha finalizada para começar.</p>
          </div>
        </div>
      `;
      return;
    }

    const list=document.createElement("div");
    list.className="aerion-campaign-character-grid";

    entries.forEach(entry=>{
      const c=entry.characters;
      const own=c.user_id===user.id;

      const card=document.createElement("article");
      card.className="aerion-campaign-character-card";
      card.innerHTML=`
        <div class="aerion-campaign-character-avatar">
          ${esc(String(c.name||"?").slice(0,1).toUpperCase())}
        </div>
        <div>
          <strong>${esc(c.name||"Personagem")}</strong>
          <span>${esc([c.race,c.class].filter(Boolean).join(" · ")||"Aventureiro")}</span>
          <small>
            HP ${num(c.hp_current)} / ${num(c.hp_max)}
            · Mana ${num(c.mana_current)} / ${num(c.mana_max)}
            · Defesa ${num(c.defense,10)}
            · Mov. ${num(c.movement,9)}m
          </small>
          <div class="aerion-campaign-character-actions">
            <button
              type="button"
              class="aerion-campaign-character-action primary"
              data-view-character="${esc(c.id)}"
            >
              Ver ficha
            </button>
            ${
              own || membership?.role==="master"
                ? '<button type="button" class="aerion-campaign-character-action danger" data-remove-character="'+esc(c.id)+'">Remover</button>'
                : ""
            }
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    root.appendChild(list);
  }

  function openView(characterId){
    const entry=entries.find(x=>x.characters?.id===characterId);
    if(!entry) return;

    const c=entry.characters;
    const modal=document.createElement("div");
    modal.className="aerion-campaign-sheet-modal is-open";

    modal.innerHTML=`
      <div class="aerion-campaign-sheet-card" role="dialog" aria-modal="true">
        <div class="aerion-campaign-sheet-head">
          <div>
            <span class="eyebrow">FICHA NA MESA</span>
            <h3>${esc(c.name||"Personagem")}</h3>
          </div>
          <button type="button" class="campaign-icon-button" data-close-view>×</button>
        </div>

        <div class="aerion-campaign-sheet-stats">
          <div class="aerion-campaign-sheet-stat"><span>HP</span><strong>${num(c.hp_current)}/${num(c.hp_max)}</strong></div>
          <div class="aerion-campaign-sheet-stat"><span>MANA</span><strong>${num(c.mana_current)}/${num(c.mana_max)}</strong></div>
          <div class="aerion-campaign-sheet-stat"><span>DEFESA</span><strong>${num(c.defense,10)}</strong></div>
        </div>

        <div class="aerion-campaign-sheet-stats">
          <div class="aerion-campaign-sheet-stat"><span>RAÇA</span><strong>${esc(c.race||"—")}</strong></div>
          <div class="aerion-campaign-sheet-stat"><span>CLASSE</span><strong>${esc(c.class||"—")}</strong></div>
          <div class="aerion-campaign-sheet-stat"><span>PODER</span><strong>${esc(c.power||"—")}</strong></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click",event=>{
      if(
        event.target===modal ||
        event.target.closest("[data-close-view]")
      ){
        modal.remove();
      }
    });
  }

  function bindSummary(){
    const root=$("campaign-character-summary");
    if(!root || root.dataset.aerionFichaBound==="1") return;

    root.dataset.aerionFichaBound="1";

    root.addEventListener("click",event=>{
      const view=event.target.closest("[data-view-character]");
      const remove=event.target.closest("[data-remove-character]");

      if(view) openView(view.dataset.viewCharacter);

      if(remove){
        removeCharacter(remove.dataset.removeCharacter)
          .catch(e=>{
            console.error("[AERION][CAMPAIGN REMOVE]",e);
            notice(e?.message||"Não foi possível remover a ficha.");
          });
      }
    });
  }

  window.addEventListener(
    "aerion:campaign:ready",
    () => {
      ensureAddButton();
      bindSummary();
      refresh().catch(console.error);
    }
  );

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init().catch(error=>{
      console.error("[AERION][CAMPAIGN FICHAS]",error);
    });
  }
})();
