import { getSupabase } from "./supabase.js";

(() => {
  "use strict";

  const S = {
    sb: null,
    user: null,
    campaignId: null,
    nodes: [],
    edges: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    connect: false,
    connectFrom: null,
    connectDrag: null,
    channel: null,
    ready: false
  };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

  const TYPES = {
    note:"Nota", npc:"NPC", location:"Local", clue:"Pista", quest:"Quest",
    item:"Item", faction:"Facção", event:"Evento", organization:"Organização",
    mystery:"Mistério", character:"Personagem"
  };

  const ICONS = {
    note:"📝", npc:"🧑", location:"📍", clue:"🔎", quest:"⚔", item:"🎒",
    faction:"🏛", event:"📅", organization:"🏢", mystery:"❓", character:"👤"
  };

  const ctx = () => window.AERIOM_CAMPAIGN?.getContext?.() || {};
  const toast = (message, type = "info") => {
    const region = $("aeriom-toast-region");
    if (!region) return;
    const node = document.createElement("div");
    node.className = "aeriom-toast";
    node.dataset.type = type;
    node.setAttribute("role", "status");
    node.textContent = message;
    region.appendChild(node);
    window.setTimeout(() => node.remove(), 3200);
  };

  async function ready() {
    const c = ctx();
    S.sb = c.supabase || S.sb;
    S.user = c.user || S.user;
    S.campaignId = c.campaignId || S.campaignId;
    if (!S.sb) S.sb = await getSupabase();
    if (!S.user && S.sb) {
      const auth = await S.sb.auth.getUser();
      S.user = auth.data?.user || null;
    }
    S.ready = Boolean(S.sb && S.user && S.campaignId);
    return S.ready;
  }

  function board() { return $("aerion-mind-map-board"); }

  function visibleNodes() {
    const q = String($("knowledge-search")?.value || "").trim().toLowerCase();
    const filter = String($("knowledge-type-filter")?.value || "");
    return S.nodes.filter((n) =>
      (!filter || n.node_type === filter) &&
      (!q || [n.title, n.content, ...(Array.isArray(n.tags) ? n.tags : [])].join(" ").toLowerCase().includes(q))
    );
  }

  function updateStats() {
    $("knowledge-stat-nodes") && ($("knowledge-stat-nodes").textContent = String(S.nodes.length));
    $("knowledge-stat-edges") && ($("knowledge-stat-edges").textContent = String(S.edges.length));
    $("knowledge-stat-private") && ($("knowledge-stat-private").textContent = String(S.nodes.filter(n => n.visibility !== "public").length));
  }

  function renderArchive() {
    const root = $("knowledge-archive-grid");
    if (!root) return;
    root.replaceChildren();
    const list = visibleNodes();
    if (!list.length) {
      root.innerHTML = '<div class="aerion-mind-map-empty"><strong>Nenhuma entidade encontrada</strong><span>Crie uma entidade ou ajuste o filtro.</span></div>';
      return;
    }
    list.forEach((n) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "aeriom-knowledge-archive-card";
      card.innerHTML = '<span></span><div><strong></strong><small></small><p></p></div>';
      card.querySelector("span").textContent = ICONS[n.node_type] || "•";
      card.querySelector("strong").textContent = n.title;
      card.querySelector("small").textContent = TYPES[n.node_type] || n.node_type;
      card.querySelector("p").textContent = n.content || "Sem descrição.";
      card.addEventListener("click", () => editor(n));
      root.appendChild(card);
    });
  }

  function edgePoints() {
    const b = board();
    if (!b) return new Map();
    const r = b.getBoundingClientRect();
    return new Map(S.nodes.map((n) => [
      String(n.id),
      { x: Number(n.pos_x) / 100 * r.width, y: Number(n.pos_y) / 100 * r.height }
    ]));
  }

  function drawEdges() {
    const svg = $("aerion-mind-map-svg");
    if (!svg) return;
    const pts = edgePoints();
    svg.replaceChildren();

    const visible = new Set(visibleNodes().map((n) => String(n.id)));
    S.edges.forEach((edge) => {
      if (!visible.has(String(edge.from_node_id)) || !visible.has(String(edge.to_node_id))) return;
      const a = pts.get(String(edge.from_node_id));
      const z = pts.get(String(edge.to_node_id));
      if (!a || !z) return;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", z.x);
      line.setAttribute("y2", z.y);
      line.setAttribute("stroke", edge.color || "#8b6f36");
      line.setAttribute("stroke-width", "2.5");
      line.setAttribute("stroke-linecap", "round");
      line.dataset.edgeId = edge.id;
      line.addEventListener("click", (event) => {
        event.stopPropagation();
        editEdge(edge);
      });
      svg.appendChild(line);

      if (edge.label) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", (a.x + z.x) / 2);
        text.setAttribute("y", (a.y + z.y) / 2 - 8);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", "aerion-mind-edge-label");
        text.textContent = edge.label;
        svg.appendChild(text);
      }
    });

    if (S.connectDrag) {
      const from = pts.get(String(S.connectDrag.from));
      if (from) {
        const preview = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const r = board().getBoundingClientRect();
        preview.setAttribute("x1", from.x);
        preview.setAttribute("y1", from.y);
        preview.setAttribute("x2", S.connectDrag.x - r.left);
        preview.setAttribute("y2", S.connectDrag.y - r.top);
        preview.setAttribute("stroke", "#d8b65f");
        preview.setAttribute("stroke-width", "2.5");
        preview.setAttribute("stroke-dasharray", "7 6");
        preview.setAttribute("stroke-linecap", "round");
        preview.setAttribute("pointer-events", "none");
        svg.appendChild(preview);
      }
    }
  }

  function applyTransform() {
    const world = $("aerion-mind-map-world");
    if (!world) return;
    world.style.transform = "translate(" + S.panX + "px," + S.panY + "px) scale(" + S.zoom + ")";
    const label = $("aerion-mind-map-tools")?.querySelector("[data-zoom-label]");
    if (label) label.textContent = Math.round(S.zoom * 100) + "%";
  }

  function render() {
    const b = board();
    const root = $("aerion-mind-map-nodes");
    const empty = $("aerion-mind-map-empty");
    if (!b || !root) return;

    const list = visibleNodes();
    if (empty) empty.hidden = S.nodes.length > 0;
    updateStats();
    renderArchive();

    root.replaceChildren();
    list.forEach((n) => {
      const el = document.createElement("article");
      el.className = "aerion-mind-node" + (S.connectFrom === String(n.id) ? " is-connect" : "");
      el.dataset.nodeId = String(n.id);
      el.style.left = Number(n.pos_x) + "%";
      el.style.top = Number(n.pos_y) + "%";
      el.style.setProperty("--node-color", n.metadata?.color || "#8b6f36");

      const image = n._imageUrl
        ? '<img class="aerion-mind-node__image" src="' + esc(n._imageUrl) + '" alt="" loading="lazy">'
        : "";

      el.innerHTML =
        '<button type="button" class="aerion-mind-node__connector" aria-label="Criar relação">↗</button>' +
        '<button type="button" class="aerion-mind-node__edit" aria-label="Editar">✎</button>' +
        '<div class="aerion-mind-node__type">' + esc(ICONS[n.node_type] || "•") + " " + esc(TYPES[n.node_type] || n.node_type) + '</div>' +
        '<h3></h3>' + image + '<p></p>';

      el.querySelector("h3").textContent = n.title;
      el.querySelector("p").textContent = n.content || "";

      el.querySelector(".aerion-mind-node__edit").addEventListener("click", (event) => {
        event.stopPropagation();
        editor(n);
      });

      el.querySelector(".aerion-mind-node__connector").addEventListener("pointerdown", (event) => {
        startConnectorDrag(event, n);
      });

      el.addEventListener("click", () => {
        if (!S.connect || S.connectDrag) return;
        const id = String(n.id);
        if (!S.connectFrom) {
          S.connectFrom = id;
          render();
          toast("Agora selecione a entidade de destino.", "info");
        } else if (S.connectFrom !== id) {
          const from = S.connectFrom;
          S.connectFrom = null;
          S.connect = false;
          createEdge(from, id).catch((error) => toast(error.message || "Falha ao criar relação.", "error"));
        }
      });

      dragNode(el, n);
      root.appendChild(el);
    });

    drawEdges();
    applyTransform();
  }

  function dragNode(el, node) {
    let dragging = false;
    let moved = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;

    el.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button") || S.connect) return;
      dragging = true;
      moved = false;
      sx = event.clientX;
      sy = event.clientY;
      ox = Number(node.pos_x);
      oy = Number(node.pos_y);
      el.setPointerCapture?.(event.pointerId);
    });

    el.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      event.preventDefault();
      const r = board().getBoundingClientRect();
      const dx = ((event.clientX - sx) / r.width / (S.zoom || 1)) * 100;
      const dy = ((event.clientY - sy) / r.height / (S.zoom || 1)) * 100;
      if (Math.abs(event.clientX - sx) + Math.abs(event.clientY - sy) > 4) moved = true;
      node.pos_x = Math.max(2, Math.min(98, ox + dx));
      node.pos_y = Math.max(4, Math.min(96, oy + dy));
      el.style.left = node.pos_x + "%";
      el.style.top = node.pos_y + "%";
      drawEdges();
    });

    el.addEventListener("pointerup", async () => {
      if (!dragging) return;
      dragging = false;
      if (!moved) return;
      const { error } = await S.sb.from("knowledge_nodes")
        .update({ pos_x: node.pos_x, pos_y: node.pos_y, updated_at: new Date().toISOString() })
        .eq("id", node.id);
      if (error) toast(error.message, "error");
    });
  }

  function startConnectorDrag(event, node) {
    event.preventDefault();
    event.stopPropagation();
    S.connect = true;
    S.connectDrag = { from: String(node.id), x: event.clientX, y: event.clientY };

    const move = (ev) => {
      if (!S.connectDrag) return;
      S.connectDrag.x = ev.clientX;
      S.connectDrag.y = ev.clientY;
      drawEdges();
    };

    const up = async (ev) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      const drag = S.connectDrag;
      S.connectDrag = null;

      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.(".aerion-mind-node");
      if (target?.dataset?.nodeId && String(target.dataset.nodeId) !== String(drag.from)) {
        S.connect = false;
        try { await createEdge(drag.from, String(target.dataset.nodeId)); }
        catch (error) { toast(error.message || "Falha ao criar relação.", "error"); }
        render();
        return;
      }

      S.connect = false;
      const r = board().getBoundingClientRect();
      if (!target && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        const x = Math.max(2, Math.min(98, ((ev.clientX - r.left) / r.width) * 100));
        const y = Math.max(4, Math.min(96, ((ev.clientY - r.top) / r.height) * 100));
        const shouldCreate = window.confirm("Criar uma nova entidade aqui e conectar à origem?");
        if (shouldCreate) editor(null, x, y, drag.from);
      }
      render();
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, { once: true });
    drawEdges();
  }

  async function createEdge(from, to) {
    if (String(from) === String(to)) throw new Error("Uma entidade não pode se relacionar consigo mesma.");
    const duplicate = S.edges.some((e) =>
      (String(e.from_node_id) === String(from) && String(e.to_node_id) === String(to)) ||
      (String(e.from_node_id) === String(to) && String(e.to_node_id) === String(from))
    );
    if (duplicate) throw new Error("Esta relação já existe.");

    const label = window.prompt("Nome da relação:", "relacionado a") || "relacionado a";
    const { data, error } = await S.sb.from("knowledge_edges").insert({
      campaign_id: S.campaignId,
      from_node_id: from,
      to_node_id: to,
      created_by: S.user.id,
      label,
      color: "#8b6f36",
      style: "solid"
    }).select("*").single();

    if (error) throw error;
    S.edges.push(data);
    toast("Relação criada.", "success");
  }

  function modal() {
    let el = $("aerion-mind-modal");
    if (!el) {
      el = document.createElement("div");
      el.id = "aerion-mind-modal";
      el.className = "aerion-mind-modal";
      document.body.appendChild(el);
    }
    return el;
  }

  async function uploadKnowledgeImage(file, nodeId) {
    if (!file) return null;
    const allowed = ["image/png","image/jpeg","image/webp","image/gif"];
    if (!allowed.includes(file.type)) throw new Error("Use PNG, JPG, WEBP ou GIF.");
    if (file.size > 8 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 8 MB.");
    const ext = (String(file.name || "imagem.jpg").split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = S.campaignId + "/knowledge/" + nodeId + "." + ext;
    const upload = await S.sb.storage.from("campaign-assets").upload(path, file, {
      upsert: true, contentType: file.type, cacheControl: "3600"
    });
    if (upload.error) throw upload.error;
    return path;
  }

  function editor(node = null, posX = null, posY = null, connectFrom = null) {
    if (!S.ready) return toast("Campanha ainda não carregada.", "error");
    const m = modal();
    const currentColor = node?.metadata?.color || "#8b6f36";
    const selectedType = node?.node_type || "note";
    const selectedVisibility = node?.visibility || "public";
    m.innerHTML =
      '<div class="aerion-mind-modal__card">' +
        '<header><div><span class="knowledge-form-eyebrow">ENTIDADE</span><h2>' + (node ? "Editar conhecimento" : "Novo conhecimento") + '</h2></div><button type="button" data-close>×</button></header>' +
        '<form data-form>' +
          '<label>Nome<input name="title" required maxlength="180" value="' + esc(node?.title || "") + '" placeholder="Ex.: Mira, a ferreira"></label>' +
          '<label>Tipo<select name="type">' +
            Object.keys(TYPES).map((type) => '<option value="' + type + '"' + (type === selectedType ? " selected" : "") + '>' + esc(TYPES[type]) + '</option>').join("") +
          '</select></label>' +
          '<label>Descrição / conteúdo<textarea name="content" maxlength="5000" placeholder="Descreva a informação…">' + esc(node?.content || "") + '</textarea></label>' +
          '<label>Imagem da galeria<input name="image_file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small class="knowledge-upload-help">Selecione uma imagem do aparelho. Ela será armazenada na campanha.</small></label>' +
          '<div class="knowledge-form-preview" data-image-preview></div>' +
          '<label>Tags<input name="tags" maxlength="500" value="' + esc(Array.isArray(node?.tags) ? node.tags.join(", ") : "") + '" placeholder="reino, mistério, NPC"></label>' +
          '<label>Revelar quando<input name="reveal_condition" maxlength="240" value="' + esc(node?.metadata?.reveal_condition || "") + '" placeholder="Ex.: após abrir a cripta"></label>' +
          '<label>Cor<input name="color" type="color" value="' + esc(currentColor) + '"></label>' +
          '<label>Visibilidade<select name="visibility"><option value="public"' + (selectedVisibility === "public" ? " selected" : "") + '>Todos</option><option value="private"' + (selectedVisibility === "private" ? " selected" : "") + '>Somente eu</option><option value="master"' + (selectedVisibility === "master" ? " selected" : "") + '>Somente Mestre</option><option value="shared"' + (selectedVisibility === "shared" ? " selected" : "") + '>Compartilhado</option></select></label>' +
          '<footer>' +
            (node ? '<button type="button" data-del class="aeriom-mini-button aeriom-mini-button--danger">Excluir</button>' : '') +
            '<span></span><button type="button" data-close class="aeriom-mini-button">Cancelar</button><button type="submit" class="aeriom-mini-button">Salvar</button>' +
          '</footer>' +
        '</form>' +
      '</div>';

    m.classList.add("is-open");
    m.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => m.classList.remove("is-open")));

    const preview = m.querySelector("[data-image-preview]");
    const input = m.querySelector("[name=image_file]");
    if (node?._imageUrl) {
      preview.innerHTML = '<img src="' + esc(node._imageUrl) + '" alt="" loading="lazy">';
    }
    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      preview.innerHTML = '<img src="' + esc(url) + '" alt="Pré-visualização">';
      preview.querySelector("img")?.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    });

    m.querySelector("[data-del]")?.addEventListener("click", async () => {
      if (!window.confirm("Excluir definitivamente este conhecimento?")) return;
      try {
        const { error } = await S.sb.from("knowledge_nodes").delete().eq("id", node.id);
        if (error) throw error;
        m.classList.remove("is-open");
        await load();
        render();
        toast("Conhecimento excluído.", "success");
      } catch (error) {
        toast(error.message || "Não foi possível excluir.", "error");
      }
    });

    m.querySelector("[data-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const f = event.currentTarget;
      try {
        const newId = node?.id || crypto.randomUUID();
        const file = f.elements.image_file?.files?.[0] || null;
        const uploadedPath = file ? await uploadKnowledgeImage(file, newId) : null;
        const payload = {
          id: newId,
          campaign_id: S.campaignId,
          created_by: node?.created_by || S.user.id,
          owner_id: node?.owner_id || S.user.id,
          title: f.elements.title.value.trim(),
          node_type: f.elements.type.value,
          content: f.elements.content.value.trim() || null,
          image_url: uploadedPath || node?.image_url || null,
          tags: f.elements.tags.value.split(",").map((x) => x.trim()).filter(Boolean),
          visibility: f.elements.visibility.value,
          pos_x: posX ?? Number(node?.pos_x ?? 35),
          pos_y: posY ?? Number(node?.pos_y ?? 35),
          metadata: {
            ...(node?.metadata || {}),
            color: f.elements.color.value,
            image_url: uploadedPath || node?.image_url || null,
            reveal_condition: f.elements.reveal_condition.value.trim() || null
          },
          updated_at: new Date().toISOString()
        };

        const result = node
          ? await S.sb.from("knowledge_nodes").update(payload).eq("id", node.id).select("*").single()
          : await S.sb.from("knowledge_nodes").insert(payload).select("*").single();

        if (result.error) throw result.error;

        if (connectFrom && result.data?.id) {
          try { await createEdge(connectFrom, result.data.id); } catch (error) { toast(error.message || "A nova entidade foi criada, mas a relação falhou.", "error"); }
        }

        m.classList.remove("is-open");
        await load();
        render();
        toast(node ? "Conhecimento atualizado." : "Conhecimento criado.", "success");
      } catch (error) {
        toast(error?.message || "Não foi possível salvar o conhecimento.", "error");
      }
    });
  }

  function editEdge(edge) {
    const m = modal();
    m.innerHTML =
      '<div class="aerion-mind-modal__card"><header><div><span class="knowledge-form-eyebrow">RELAÇÃO</span><h2>Editar relação</h2></div><button type="button" data-close>×</button></header>' +
      '<form data-form><label>Nome<input name="label" maxlength="120" value="' + esc(edge.label || "") + '"></label><label>Cor<input name="color" type="color" value="' + esc(edge.color || "#8b6f36") + '"></label>' +
      '<footer><button type="button" data-del class="aeriom-mini-button aeriom-mini-button--danger">Excluir</button><span></span><button type="button" data-close class="aeriom-mini-button">Cancelar</button><button type="submit" class="aeriom-mini-button">Salvar</button></footer></form></div>';
    m.classList.add("is-open");
    m.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => m.classList.remove("is-open")));
    m.querySelector("[data-del]").addEventListener("click", async () => {
      if (!window.confirm("Excluir esta relação?")) return;
      const { error } = await S.sb.from("knowledge_edges").delete().eq("id", edge.id);
      if (error) return toast(error.message, "error");
      m.classList.remove("is-open"); await load(); render(); toast("Relação excluída.", "success");
    });
    m.querySelector("[data-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      const f = event.currentTarget;
      const { error } = await S.sb.from("knowledge_edges").update({
        label: f.elements.label.value.trim() || null,
        color: f.elements.color.value,
        updated_at: new Date().toISOString()
      }).eq("id", edge.id);
      if (error) return toast(error.message, "error");
      m.classList.remove("is-open"); await load(); render(); toast("Relação atualizada.", "success");
    });
  }

  async function load() {
    if (!await ready()) return;
    const [nodes, edges] = await Promise.all([
      S.sb.from("knowledge_nodes").select("*").eq("campaign_id", S.campaignId).order("created_at", { ascending: true }),
      S.sb.from("knowledge_edges").select("*").eq("campaign_id", S.campaignId).order("created_at", { ascending: true })
    ]);
    if (nodes.error) throw nodes.error;
    if (edges.error) throw edges.error;

    S.nodes = await Promise.all((nodes.data || []).map(async (node) => {
      if (!node.image_url) return node;
      try {
        const signed = await S.sb.storage.from("campaign-assets").createSignedUrl(node.image_url, 3600);
        return { ...node, _imageUrl: signed.data?.signedUrl || "" };
      } catch {
        return node;
      }
    }));
    S.edges = edges.data || [];
  }

  function setup() {
    const tools = $("aerion-mind-map-tools");
    const b = board();
    if (!tools || !b || tools.dataset.bound) return true;

    tools.dataset.bound = "1";
    tools.innerHTML =
      '<button type="button" class="aeriom-mini-button" data-add>＋ Criar</button>' +
      '<button type="button" class="aeriom-mini-button" data-connect>🔗 Relacionar</button>' +
      '<button type="button" class="aeriom-mini-button" data-minus>−</button><span data-zoom-label>100%</span><button type="button" class="aeriom-mini-button" data-plus>＋</button><button type="button" class="aeriom-mini-button" data-reset>⟳</button>';

    tools.querySelector("[data-add]").onclick = () => editor();
    tools.querySelector("[data-connect]").onclick = () => {
      S.connect = !S.connect;
      S.connectFrom = null;
      S.connectDrag = null;
      render();
      toast(S.connect ? "Use ↗ para puxar uma conexão ou toque em duas entidades." : "Modo de relação encerrado.");
    };
    tools.querySelector("[data-minus]").onclick = () => { S.zoom = Math.max(.5, S.zoom - .15); drawEdges(); applyTransform(); };
    tools.querySelector("[data-plus]").onclick = () => { S.zoom = Math.min(2.5, S.zoom + .15); drawEdges(); applyTransform(); };
    tools.querySelector("[data-reset]").onclick = () => { S.zoom = 1; S.panX = 0; S.panY = 0; applyTransform(); };

    if (!b.dataset.bound) {
      b.dataset.bound = "1";
      let pan = null;
      b.addEventListener("pointerdown", (event) => {
        if (event.target.closest?.(".aerion-mind-node") || S.connect) return;
        pan = { x: event.clientX, y: event.clientY, px: S.panX, py: S.panY };
        b.setPointerCapture?.(event.pointerId);
      });
      b.addEventListener("pointermove", (event) => {
        if (!pan) return;
        event.preventDefault();
        S.panX = pan.px + event.clientX - pan.x;
        S.panY = pan.py + event.clientY - pan.y;
        applyTransform();
      });
      b.addEventListener("pointerup", () => { pan = null; });
      b.addEventListener("pointercancel", () => { pan = null; });
    }
    return true;
  }

  function subscribe() {
    if (!S.sb || !S.campaignId || S.channel) return;
    S.channel = S.sb.channel("aeriom-knowledge-" + S.campaignId)
      .on("postgres_changes", { event:"*", schema:"public", table:"knowledge_nodes", filter:"campaign_id=eq." + S.campaignId }, async () => {
        try { await load(); render(); } catch (error) { toast(error.message || "Falha ao atualizar Conhecimento.", "error"); }
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"knowledge_edges", filter:"campaign_id=eq." + S.campaignId }, async () => {
        try { await load(); render(); } catch (error) { toast(error.message || "Falha ao atualizar relações.", "error"); }
      })
      .subscribe();
  }

  async function init() {
    if (!await ready()) return;
    setup();
    subscribe();
    $("knowledge-search")?.addEventListener("input", render);
    $("knowledge-type-filter")?.addEventListener("change", render);
    $("aeriom-add-node")?.addEventListener("click", () => editor());
    $("aeriom-mind-map-empty")?.querySelector("[data-mind-add]")?.addEventListener("click", () => editor());
    document.querySelector("[data-aeriom-add-node]")?.addEventListener("click", () => editor());
    document.querySelector("[data-knowledge-focus-all]")?.addEventListener("click", () => {
      S.zoom = 1; S.panX = 0; S.panY = 0; applyTransform();
    });
    await load();
    render();
  }

  function trigger() {
    window.setTimeout(() => {
      init().catch((error) => {
        console.error("[AERION][KNOWLEDGE] Falha ao inicializar.", error);
        toast(error?.message || "Não foi possível carregar o Conhecimento.", "error");
      });
    }, 50);
  }

  window.addEventListener("aerion:campaign:ready", trigger);
  window.addEventListener("aerion:campaigntabchange", (event) => {
    if (event.detail?.tab === "knowledge") trigger();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trigger, { once: true });
  } else {
    trigger();
  }
})();