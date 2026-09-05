import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const table = "characters";
  let supabase = null;
  let user = null;

  const $ = (id) => document.getElementById(id);
  let allRows = [];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[c]);
  }

  function num(v,d=0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function title(row) {
    return String(row.name || "Ficha sem nome").trim() || "Ficha sem nome";
  }

  function card(row) {
    const ready = row.status === "completed";
    const name = title(row);
    const meta = [row.race,row.class,row.power].filter(Boolean).join(" · ") || "Ainda não configurada";

    const el = document.createElement("article");
    el.className = "mf-card";
    el.innerHTML = `
      <div class="mf-avatar">${esc(name.slice(0,1).toUpperCase())}</div>
      <div class="mf-body">
        <span class="mf-status ${ready ? "complete" : ""}">
          ${ready ? "Pronta" : "Incompleta"}
        </span>
        <h2 class="mf-title">${esc(name)}</h2>
        <div class="mf-meta">${esc(meta)}</div>
        <div class="mf-meta">
          HP ${num(row.hp_current,10)} / ${num(row.hp_max,10)}
          · Defesa ${num(row.defense,10)}
          · Movimento ${num(row.movement,9)}m
        </div>
        <div class="mf-actions">
          <button class="mf-btn primary" data-view="${esc(row.id)}" type="button">Visualizar</button>
          <button class="mf-btn" data-edit="${esc(row.id)}" type="button">Editar</button>
          <button class="mf-btn" data-delete="${esc(row.id)}" type="button">Excluir</button>
        </div>
      </div>
    `;
    return el;
  }

  function renderRows() {
    const filter = $("mf-filter")?.value || "all";
    const rows = filter === "all"
      ? allRows
      : allRows.filter(row =>
          filter === "completed"
            ? row.status === "completed"
            : row.status !== "completed"
        );

    const grid = $("mf-grid");
    grid.replaceChildren();

    const count = $("mf-count");
    if (count) {
      count.textContent =
        `${rows.length} ${rows.length === 1 ? "ficha" : "fichas"}`;
    }

    if (!rows.length) {
      grid.innerHTML = `
        <div class="mf-empty">
          <strong>Nenhuma ficha neste filtro.</strong><br>
          Ajuste o filtro ou crie uma nova ficha.
        </div>
      `;
      return;
    }

    rows.forEach(row => grid.appendChild(card(row)));
  }

  async function load() {
    const grid = $("mf-grid");
    grid.innerHTML = '<div class="mf-loading">Carregando suas fichas…</div>';

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", user.id)
      .is("campaign_id", null)
      .neq("status","archived")
      .order("updated_at",{ascending:false});

    if (error) throw error;

    allRows = data || [];
    renderRows();

    if (!allRows.length) {
      grid.innerHTML = `
        <div class="mf-empty">
          <strong>Seu grimório ainda está vazio.</strong><br>
          Crie sua primeira ficha para começar a aventura.
        </div>
      `;
      return;
    }

    data.forEach(row => grid.appendChild(card(row)));
  }

  async function remove(id) {
    if (!confirm("Excluir esta ficha? Essa ação não pode ser desfeita.")) return;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id",id)
      .eq("user_id",user.id);

    if (error) throw error;

    await load();
  }

  function bind() {
    $("mf-filter")?.addEventListener("change", renderRows);

    $("mf-new").addEventListener("click", () => {
      window.location.href = "./fichas.html?new=1";
    });

    $("mf-grid").addEventListener("click", (event) => {
      const view = event.target.closest("[data-view]");
      const edit = event.target.closest("[data-edit]");
      const del = event.target.closest("[data-delete]");

      if (view) {
        window.location.href = `./ficha.html?id=${encodeURIComponent(view.dataset.view)}`;
        return;
      }

      if (edit) {
        window.location.href = `./fichas.html?id=${encodeURIComponent(edit.dataset.edit)}`;
        return;
      }

      if (del) {
        remove(del.dataset.delete).catch(error => {
          console.error("[AERION][MINHAS FICHAS]",error);
          alert(error?.message || "Não foi possível excluir a ficha.");
        });
      }
    });
  }

  async function init() {
    try {
      supabase = await getSupabase();

      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      user = data?.user;
      if (!user) {
        window.location.replace("./index.html");
        return;
      }

      bind();
      await load();
    } catch (error) {
      console.error("[AERION][MINHAS FICHAS]",error);
      $("mf-grid").innerHTML = `
        <div class="mf-error">
          Não foi possível carregar suas fichas.<br>
          <small>${esc(error?.message || "Erro desconhecido")}</small>
        </div>
      `;
    }
  }

  init();
})();
