'use strict';
/* Geometria da Água — lógica, cálculos e missões. Sem dependências externas. */
const PI = Math.PI, PB = 120, PL = 80;               // preços DIDÁTICOS (R$/m²): fundo e paredes
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const f = (n, d = 2) => n.toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NAMES = {box: 'Paralelepípedo', cube: 'Cubo', cyl: 'Cilindro vertical'};
const DN = {c: 'Comprimento', l: 'Largura', h: 'Altura', r: 'Raio'};
const LIM = {c: 12, l: 12, h: 12, a: 12, r: 6};   // limites do laboratório = limites da busca computacional
const FIELDS = {box: [['c', 'Comprimento'], ['l', 'Largura'], ['h', 'Altura']], cube: [['a', 'Aresta']], cyl: [['r', 'Raio'], ['h', 'Altura']]};

/* ---------- Missões (valores didáticos) ---------- */
const M = [
 {id: 1, t: 'Abastecimento de uma comunidade', shapes: ['box'], open: true, minL: 24000, goal: 'minMat',
  desc: 'Uma comunidade precisa armazenar 24.000 L. Projete um reservatório retangular aberto (fundo + 4 paredes) com capacidade de pelo menos 24.000 L, gastando o mínimo de material.',
  q: ['Quais dimensões atendem à capacidade? Existem várias combinações?', 'O que acontece com a área de material quando você muda as dimensões mantendo o volume?', 'Qual projeto usa menos material?', 'Dois reservatórios de mesmo volume podem usar quantidades diferentes de material?'],
  hints: ['Converta: 24.000 L = 24 m³ (1 m³ = 1.000 L). Então c·l·h deve ser ≥ 24.', 'Fixe o volume e varie c e l: como h se ajusta? Observe o material a cada tentativa.', 'Compare bases quadradas e não quadradas de mesmo volume. Qual gastou menos material?']},
 {id: 2, t: 'Economia de materiais', shapes: ['box', 'cube'], open: true, maxMat: 60, goal: 'maxV',
  desc: 'Há 60 m² de material para o fundo e as quatro paredes de um reservatório aberto. Encontre as dimensões de maior capacidade.',
  q: ['Mais material sempre significa mais volume?', 'Projetos baixos e largos ou altos e estreitos: qual rende mais?', 'O que acontece com o volume quando só a altura muda e as outras dimensões ficam fixas?', 'Uma base quadrada é sempre a melhor escolha?'],
  hints: ['Material = c·l + 2·c·h + 2·l·h. Teste manter c = l e variar h.', 'Compare projetos baixos e largos com altos e estreitos que usam quase todo o material.', 'Observe a razão entre a altura e o lado da base nos seus melhores testes. Há padrão?']},
 {id: 3, t: 'Comparação de formatos', shapes: ['box', 'cyl'], open: true, maxMat: 60, goal: 'maxV', needBoth: true,
  desc: 'Compare um reservatório retangular e um cilíndrico, ambos abertos, com 60 m² de material (fundo + parede lateral). Salve ao menos um projeto válido de cada formato.',
  q: ['Qual formato armazena mais com este material?', 'A conclusão vale para qualquer quantidade de material ou qualquer condição de construção?'],
  hints: ['Aberto: material = área da base + área lateral. Cilindro: π·r² + 2π·r·h.', 'Para cada formato, use praticamente todo o material e compare volumes.', 'Teste o mesmo raciocínio com outra condição (ex.: reservatório fechado) antes de generalizar.']},
 {id: 4, t: 'Reservatório para uma escola', shapes: ['box'], open: true, minL: 15000, max: {c: 5, l: 4, h: 2.5}, goal: 'minMat',
  desc: 'A escola precisa de 15.000 L. O terreno permite no máximo 5 m de comprimento, 4 m de largura e 2,5 m de altura. Reservatório aberto; use o mínimo de material.',
  q: ['Quais dimensões são viáveis?', 'Usar todo o espaço disponível é sempre melhor?', 'E se o reservatório tivesse tampa: o que mudaria no material?'],
  hints: ['15.000 L = 15 m³. Respeite c ≤ 5, l ≤ 4, h ≤ 2,5.', 'Bases maiores permitem alturas menores. Veja o efeito no material.', 'Compare projetos que ocupam todo o espaço com projetos que não ocupam.']},
 {id: 5, t: 'Orçamento de construção', shapes: ['box', 'cyl'], open: true, minL: 10000, budget: 2200, goal: 'minCost',
  desc: 'Reservatório aberto de pelo menos 10.000 L com orçamento de R$ 2.200 (valores fictícios). Custo = fundo × R$ 120/m² + paredes × R$ 80/m². Obtenha o menor custo.',
  q: ['O projeto de menor área é também o de menor custo?', 'O fundo mais caro que a parede muda a melhor proporção?', 'O projeto que usa menos material necessariamente tem o menor custo?'],
  hints: ['Custo = área do fundo × 120 + área lateral × 80.', 'Compare com a Missão 1: o projeto de menor área é igual ao de menor custo?', 'Compare cilindro e caixa de mesmo volume em custo, não só em área.']},
 {id: 6, t: 'A água chega a todos?', inv: true, shapes: [], goal: null,
  desc: 'A água é distribuída da mesma maneira para todos os brasileiros? Nesta investigação, você observará dados sobre o abastecimento de água nas cinco regiões do Brasil, comparará os resultados e refletirá sobre as desigualdades que os números podem revelar.', q: [], hints: []}
];
const cur = () => M.find(m => m.id === S.mission) || (S.mission == null ? S.cu || null : null);   // missão ou condições do laboratório livre

/* ---------- Estado ---------- */
let S = {shape: 'box', c: 4, l: 3, h: 2, a: 2, r: 1.5, open: true, mission: null};
let P = {done: {}, sess: {}, hint: {}};   // sess = projetos salvos por missão
try { Object.assign(P, JSON.parse(localStorage.getItem('ea2') || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem('ea2', JSON.stringify(P)); } catch (e) {} };

/* ---------- Geometria ---------- */
const dims = () => S.shape === 'cube' ? {c: S.a, l: S.a, h: S.a} : S.shape === 'box' ? {c: S.c, l: S.l, h: S.h} : {r: S.r, h: S.h};
function geom(sh, d, open) {
  let base, lat;
  if (sh === 'cyl') { base = PI * d.r * d.r; lat = 2 * PI * d.r * d.h; }
  else { base = d.c * d.l; lat = 2 * d.h * (d.c + d.l); }
  const V = base * d.h, mat = base * (open ? 1 : 2) + lat;     // V em m³, material em m²
  return {base, lat, V, L: V * 1000, mat, cost: base * (open ? 1 : 2) * PB + lat * PL};
}
function fits(m, g, d) {                                      // verificação rápida (usada na busca)
  if (m.maxMat && g.mat > m.maxMat + 1e-9) return false;
  if (m.minL && g.L < m.minL - 1e-9) return false;
  if (m.budget && g.cost > m.budget + 1e-9) return false;
  if (m.max) for (const k in m.max) if (d[k] !== undefined && d[k] > m.max[k] + 1e-9) return false;
  return true;
}
function check(m, g, d) {                                     // verificação com mensagens
  const r = [];
  if (!m) return {ok: true, r};
  if (m.maxMat) r.push([g.mat <= m.maxMat + 1e-9, `Material: ${f(g.mat)} m² (máx. ${f(m.maxMat, 0)} m²)`]);
  if (m.minL) r.push([g.L >= m.minL - 1e-9, `Capacidade: ${f(g.L, 0)} L (mín. ${f(m.minL, 0)} L)`]);
  if (m.budget) r.push([g.cost <= m.budget + 1e-9, `Custo didático: R$ ${f(g.cost)} (máx. R$ ${f(m.budget, 0)})`]);
  if (m.max) for (const k in m.max) if (d[k] !== undefined) r.push([d[k] <= m.max[k] + 1e-9, `${DN[k]}: ${f(d[k], 1)} m (máx. ${f(m.max[k], 1)} m)`]);
  return {ok: r.every(x => x[0]), r};
}
/* Busca computacional: grade de 0,1 m + refinamento local de 0,01 m. É o melhor valor ENCONTRADO; não é prova de ótimo contínuo. */
const cache = {};
function solve(m, sh) {
  const key = JSON.stringify([m.id, m.open, m.goal, m.minL, m.maxMat, m.budget, m.max]) + sh; if (key in cache) return cache[key];
  let best = null; const mx = m.max || {}, st = 0.1;
  const val = g => m.goal === 'maxV' ? g.V : m.goal === 'minMat' ? g.mat : g.cost;
  const better = (a, b) => m.goal === 'maxV' ? a > b : a < b;
  const t = d => { if (!Object.keys(d).every(k => d[k] > 0 && d[k] <= (k === 'r' ? 6 : 12) + 1e-9)) return; const g = geom(sh === 'cube' ? 'box' : sh, d, m.open); if (!fits(m, g, d)) return; const v = val(g); if (!best || better(v, best.v)) best = {v, g, d}; };
  const n = (v, k) => Math.round((v || LIM[k]) / st), q = i => i / 10, rg = (v, w = 30) => { const o = [], c = Math.round(v * 100); for (let i = Math.max(1, c - w); i <= c + w; i++) o.push(i / 100); return o; };
  if (sh === 'cyl') { for (let i = 1; i <= n(mx.r, 'r'); i++) for (let j = 1; j <= n(mx.h, 'h'); j++) t({r: q(i), h: q(j)}); }
  else if (sh === 'cube') { const na = Math.min(n(mx.c, 'a'), n(mx.l, 'a'), n(mx.h, 'a')); for (let i = 1; i <= na; i++) t({c: q(i), l: q(i), h: q(i)}); }   // cubo: as três arestas são iguais
  else for (let i = 1; i <= n(mx.c, 'c'); i++) for (let j = 1; j <= n(mx.l, 'l'); j++) for (let k = 1; k <= n(mx.h, 'h'); k++) t({c: q(i), l: q(j), h: q(k)});
  if (best) {                                                  // refinamento local (passo 0,01 m) ao redor do melhor ponto da grade
    const b0 = best.d;
    if (sh === 'cyl') { for (const r of rg(b0.r)) for (const h of rg(b0.h)) t({r, h}); }
    else if (sh === 'cube') { for (const a of rg(b0.c)) t({c: a, l: a, h: a}); }
    else for (const c of rg(b0.c, 15)) for (const l of rg(b0.l, 15)) for (const h of rg(b0.h, 15)) t({c, l, h});
  }
  return cache[key] = best;
}

/* ---------- Navegação ---------- */
function show(v) {
  $$('.view').forEach(e => e.hidden = e.id !== v); document.body.classList.toggle('home-on', v === 'home');
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.view === v || (v === 'inv' && b.dataset.view === 'missions')));
  if (v === 'missions') renderMissions(); if (v === 'work') LAB.redraw();
}
$$('nav button').forEach(b => b.onclick = () => { if (b.dataset.view === 'work') openLab(); else show(b.dataset.view); });
$$('[data-go]').forEach(b => b.onclick = () => b.dataset.go === 'lab' ? openLab() : show(b.dataset.go));

const GL = {minMat: 'Menor material', maxV: 'Maior volume', minCost: 'Menor custo'};
const mchips = m => m.inv ? ['Investigação crítica', 'Mapa das 5 regiões', 'Observar, comparar e refletir'] : [GL[m.goal], m.shapes.map(s => NAMES[s]).join(' ou '), m.open ? 'Aberto' : 'Fechado',
  m.minL && `mín. ${f(m.minL, 0)} L`, m.maxMat && `${f(m.maxMat, 0)} m² de material`, m.max && `terreno ${f(m.max.c, 0)} × ${f(m.max.l, 0)} × ${f(m.max.h, 1)} m`, m.budget && `R$ ${f(m.budget, 0)}`].filter(Boolean);
function renderMissions() {
  const n = Object.keys(P.done).length;
  $('#mprog').innerHTML = `<b>${n} de ${M.length}</b> missões concluídas<div class="pct-b"><i style="width:${n / M.length * 100}%"></i></div>`;
  $('#mlist').innerHTML = M.map(m => { const d = P.done[m.id], iv = m.inv ? M6K.filter(k => ((P.inv || {})[k] || '').trim()).length : 0, se = m.inv ? (iv ? {att: []} : null) : P.sess[m.id], np = se ? se.att.length : 0;
    const st = d ? `✔ Concluída${d.eff != null ? ', ' + f(Math.min(100, d.eff * 100), 1) + '% do melhor valor' : ''}` : se ? `Em andamento, ${m.inv ? iv + ' resposta(s) escrita(s)' : np + ' projeto(s) salvo(s)'}` : 'Não iniciada';
    return `<article class="mc ${d ? 'done' : ''}"><div class="mc-n" aria-hidden="true">${m.id}</div>
    <div class="mc-b"><h3>${m.t}</h3><p>${m.desc}</p><ul class="chips">${mchips(m).map((c, i) => `<li class="${i ? '' : 'goal'}">${c}</li>`).join('')}</ul></div>
    <div class="mc-f"><span class="st ${d ? 'ok' : ''}">${st}</span><button class="btn sm" data-m="${m.id}" aria-label="${d ? 'Rever' : se ? 'Continuar' : 'Iniciar'} a missão ${m.id}">${d ? 'Rever' : se ? 'Continuar' : 'Iniciar'}</button></div></article>`; }).join('');
}
function setupShapes(list) {
  $('#shape').innerHTML = list.map(s => `<option value="${s}">${NAMES[s]}</option>`).join('');
  if (!list.includes(S.shape)) S.shape = list[0];
  $('#shape').value = S.shape; enforce(); buildCtl();
}
function openLab() {
  S.mission = null; setupShapes(['box', 'cube', 'cyl']);
  $('#open').checked = S.open; $('#open').disabled = false; if (S.cu) S.cu.open = S.open; $('#condbox').hidden = false; $('#mbox').hidden = $('#mwork').hidden = true; $('#saveproj').hidden = $('#saved').hidden = true; show('work'); render();
}
function openMission(id) {
  const m = M.find(x => x.id === id); if (m.inv) return openInv(); S.mission = id; S.open = m.open;
  setupShapes(m.shapes); $('#open').checked = m.open; $('#open').disabled = true;
  $('#condbox').hidden = true; $('#mbox').hidden = $('#mwork').hidden = false; $('#saveproj').hidden = $('#saved').hidden = false; $('#saved').textContent = '';
  $('#mbox').innerHTML = `<h3>Missão ${m.id} — ${m.t}</h3><p>${m.desc}</p><p class="muted">Perguntas para investigar:</p><ul>${m.q.map(q => `<li>${q}</li>`).join('')}</ul>`;
  $('#fb').innerHTML = '';
  show('work'); renderHints(); renderAtt(); render();
}
window.openMission = openMission;

/* ---------- Controles ---------- */
function buildCtl() {
  $('#ctl').innerHTML = FIELDS[S.shape].map(([k, n]) => `<div class="dim"><label for="n_${k}">${n} (m)</label>
    <input type="range" id="r_${k}" min="0.1" max="${lim(k)}" step="0.1" value="${S[k]}" aria-label="${n}, controle deslizante" oninput="upd('${k}',this.value)">
    <input type="number" id="n_${k}" min="0.1" max="${lim(k)}" step="0.1" value="${S[k]}" onchange="upd('${k}',this.value)"></div>`).join('');
}
/* Limites das missões: dimensões máximas, material máximo e orçamento TRAVAM os controles.
   Ao atingir o limite, o valor para de crescer; é preciso diminuir outra dimensão para aumentar esta. */
const lim = k => { const m = cur(); return Math.min(LIM[k], m && m.max && m.max[k] !== undefined ? m.max[k] : Infinity); };
const capBad = (m, d) => { if (!m) return null; const g = geom(S.shape, d, S.open);
  if (m.maxMat && g.mat > m.maxMat + 1e-9) return `material de ${f(m.maxMat, 0)} m²`;
  if (m.budget && g.cost > m.budget + 1e-9) return `orçamento de R$ ${f(m.budget, 0)}`; return null; };
function enforce() {                                          // ajusta dimensões que já violam um limite (ao abrir missão, trocar sólido ou aplicar condições)
  const m = cur(); if (!m) return false; let ch = false;
  FIELDS[S.shape].forEach(([k]) => { if (S[k] > lim(k) + 1e-9) { S[k] = lim(k); ch = true; } });
  if (capBad(m, dims())) {
    const o = {}; FIELDS[S.shape].forEach(([k]) => o[k] = S[k]); let lo = 0, hi = 1;
    const set = t => FIELDS[S.shape].forEach(([k]) => S[k] = Math.max(0.1, Math.floor(o[k] * t * 100) / 100));
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; set(mid); if (capBad(m, dims())) hi = mid; else lo = mid; }
    set(lo); ch = true;
  }
  $('#err').textContent = ch ? 'Dimensões ajustadas para respeitar os limites da missão.' : ''; return ch;
}
window.upd = (k, v) => {
  const x0 = parseFloat(String(v).replace(',', '.')), back = () => { $('#r_' + k).value = S[k]; $('#n_' + k).value = S[k]; }, L = lim(k);
  if (!(x0 >= 0.1) || !isFinite(x0) || x0 > L + 1e-9) { $('#err').textContent = `Informe um número entre 0,1 e ${f(L, 1)} m (limite ${L < LIM[k] ? 'da missão' : 'do laboratório'}).`; back(); return; }
  const m = cur(), old = S[k]; let x = Math.round(x0 * 100) / 100, msg = ''; S[k] = x;
  const bad = capBad(m, dims());
  if (bad) {
    S[k] = 0.1;
    if (capBad(m, dims())) { S[k] = old; $('#err').textContent = `Limite de ${bad} atingido: diminua outra dimensão primeiro.`; back(); return; }
    let lo = 0.1, hi = x; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; S[k] = mid; if (capBad(m, dims())) hi = mid; else lo = mid; }
    x = Math.floor(lo * 100) / 100; S[k] = x; msg = `Limite de ${bad} atingido: para aumentar esta dimensão, diminua outra.`;
  }
  $('#err').textContent = msg; back(); render();
};
$('#shape').onchange = e => { S.shape = e.target.value; enforce(); buildCtl(); render(); };
$('#open').checked = true; $('#open').onchange = e => { S.open = e.target.checked; if (S.cu) S.cu.open = S.open; render(); };

/* ---------- Render principal ---------- */
function render() {
  const m = cur(), d = dims(), g = geom(S.shape, d, S.open), ck = check(m, g, d);
  const costRow = `<tr><td>Custo didático (fundo R$ 120/m², paredes R$ 80/m²)</td><td>R$ ${f(g.cost)}</td></tr>`;
  $('#res').innerHTML = `<table class="kv">
   <tr><td>Área da base</td><td>${f(g.base)} m²</td></tr><tr><td>Área lateral</td><td>${f(g.lat)} m²</td></tr>
   <tr><td>Material (${S.open ? 'fundo + paredes' : 'fundo + tampa + paredes'})</td><td>${f(g.mat)} m²</td></tr>
   <tr><td>Volume total</td><td>${f(g.V, 3)} m³</td></tr><tr><td>Capacidade total</td><td>${f(g.L, 0)} L</td></tr>${costRow}</table>`;
  $('#cons').innerHTML = m ? ck.r.map(([ok, t]) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'} ${t}</li>`).join('') : '<li class="muted">Laboratório livre: sem restrições.</li>';
  LAB.set(S.shape, d, S.open);
}

/* ---------- Visualização 3D (canvas): arraste para girar, role para aproximar ---------- */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
function Viewer(cv, o = {}) {
  const ctx = cv.getContext('2d'), ptr = new Map(), TAU = Math.PI * 2;
  const C = o.dark
    ? {edge: '#ffffff', hid: 'rgba(255,255,255,.32)', txt: '#fff', halo: 'rgba(0,41,74,.9)', glass: 'rgba(255,255,255,.07)', lid: 'rgba(124,218,249,.30)', shadow: '0,20,40'}
    : {edge: '#004173', hid: 'rgba(0,65,115,.30)', txt: '#004173', halo: '#f7fcfe', glass: 'rgba(255,255,255,.18)', lid: 'rgba(9,121,176,.26)', shadow: '0,65,115'};
  const V = {yaw: -0.62, pitch: 0.5, zoom: 1, shape: 'box', d: {c: 4, l: 3, h: 2}, cube: false, open: true, lv: 1, auto: !!o.auto && !RM, t: 0, vis: true, raf: 0, wave: o.wave || 0};
  let W = 0, H = 0, k = 1, cx = 0, cy = 0, sY = 0, cY = 1, sP = 0, cP = 1;

  /* geometria: x = comprimento, y = altura (para cima), z = largura; o sólido fica centrado na origem */
  const rot = (x, y, z) => { const x1 = x * cY + z * sY, z1 = -x * sY + z * cY; return [x1, y * cP - z1 * sP, y * sP + z1 * cP]; };
  const pr = (x, y, z) => { const r = rot(x, y, z); return [cx + r[0] * k, cy - r[1] * k, r[2]]; };
  const path = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
  const fill = (pts, col, stroke) => { path(pts); ctx.fillStyle = col; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } };
  const line = (a, b, col, w, dash) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
  const text = (t, x, y, al) => { ctx.font = '600 14px system-ui,Segoe UI,Arial,sans-serif'; ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = C.halo; ctx.strokeText(t, x, y); ctx.fillStyle = C.txt; ctx.fillText(t, x, y); };
  const fm = (n) => n.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1});

  /* cota: linha paralela à aresta, afastada do centro do sólido, com o valor */
  function dim(p, q, label) {
    const ctr = pr(0, 0, 0), mx = (p[0] + q[0]) / 2 - ctr[0], my = (p[1] + q[1]) / 2 - ctr[1], L = Math.hypot(mx, my) || 1, ux = mx / L, uy = my / L, off = 16;
    const a = [p[0] + ux * off, p[1] + uy * off], b = [q[0] + ux * off, q[1] + uy * off], dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / dl * 5, ny = (b[0] - a[0]) / dl * 5;
    line(p, a, C.hid, 1); line(q, b, C.hid, 1); line(a, b, C.edge, 1.4);
    line([a[0] - nx, a[1] - ny], [a[0] + nx, a[1] + ny], C.edge, 1.4); line([b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], C.edge, 1.4);
    const al = Math.abs(ux) > .6 ? (ux > 0 ? 'left' : 'right') : 'center';
    text(label, (a[0] + b[0]) / 2 + ux * 10 + (al === 'center' ? 0 : ux * 6), (a[1] + b[1]) / 2 + uy * 14, al);
  }

  /* paralelepípedo: 6 faces; trás → água → frente (painter correto para sólidos convexos) */
  const FACES = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
  function faces(c, h) {
    return FACES.map(([ax, sg]) => {
      const o1 = (ax + 1) % 3, o2 = (ax + 2) % 3, pts = [];
      for (const [s1, s2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = [0, 0, 0]; p[ax] = c[ax] + sg * h[ax]; p[o1] = c[o1] + s1 * h[o1]; p[o2] = c[o2] + s2 * h[o2]; pts.push(pr(p[0], p[1], p[2])); }
      const n = [0, 0, 0]; n[ax] = sg;
      return {ax, sg, pts, front: rot(n[0], n[1], n[2])[2] > 0};
    });
  }
  function waves(a, b, y) {                                  // superfície ondulada (só na página inicial)
    const n = 10, A = .16 * V.wave, t = V.t, g = [], q = [];
    for (let i = 0; i <= n; i++) { g[i] = []; for (let j = 0; j <= n; j++) { const x = -a + 2 * a * i / n, z = -b + 2 * b * j / n, e = Math.sin(Math.PI * i / n) * Math.sin(Math.PI * j / n), dy = A * e * Math.sin(x * 2.1 + t * 1.7) * Math.cos(z * 2.5 - t * 1.3); g[i][j] = {p: pr(x, y + dy, z), dy}; } }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = [g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]]; q.push({pts: v.map(s => s.p), z: v.reduce((s, w) => s + w.p[2], 0) / 4, u: Math.max(0, Math.min(1, v.reduce((s, w) => s + w.dy, 0) / 4 / A * .5 + .5))}); }
    q.sort((m, w) => m.z - w.z).forEach(s => fill(s.pts, `rgba(${Math.round(12 + 188 * s.u)},${Math.round(183 + 62 * s.u)},${Math.round(242 + 13 * s.u)},.85)`));
  }
  function drawBox() {
    const {c, l, h} = V.d, a = c / 2, b = l / 2, hh = h / 2, w = h * V.lv, half = [a, hh, b];
    const gl = faces([0, 0, 0], [a, hh, b]), wf = w > 1e-6 ? faces([0, -hh + w / 2, 0], [a, w / 2, b]) : [];
    const top = f => f.ax === 1 && f.sg === 1, skip = f => V.open && top(f);
    const water = f => { if (top(f)) { if (V.wave && f.front) waves(a, b, -hh + w); else fill(f.pts, 'rgba(124,218,249,.78)', 'rgba(255,255,255,.7)'); }
      else fill(f.pts, f.ax === 1 ? 'rgba(9,121,176,.5)' : f.ax === 0 ? 'rgba(12,183,242,.55)' : 'rgba(12,183,242,.42)'); };
    gl.filter(f => !f.front && !skip(f)).forEach(f => fill(f.pts, top(f) ? C.lid : C.glass));
    wf.filter(f => !f.front).forEach(water); wf.filter(f => f.front).forEach(water);
    gl.filter(f => f.front && !skip(f)).forEach(f => fill(f.pts, top(f) ? C.lid : C.glass));
    const ed = [];                                           // 12 arestas: visível se alguma das duas faces vizinhas está de frente
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
      const [ai, si] = FACES[i], [aj, sj] = FACES[j]; if (ai === aj) continue; const t = 3 - ai - aj;
      const e = [-1, 1].map(s => { const p = [0, 0, 0]; p[ai] = si * half[ai]; p[aj] = sj * half[aj]; p[t] = s * half[t]; return pr(p[0], p[1], p[2]); });
      ed.push({e, vis: gl[i].front || gl[j].front});
    }
    ed.filter(x => !x.vis).forEach(x => line(x.e[0], x.e[1], C.hid, 1, [4, 4]));
    ed.filter(x => x.vis).forEach(x => line(x.e[0], x.e[1], C.edge, 1.8));
    if (!o.labels) return;
    let best = null; const pick = (cand, score) => cand.reduce((u, v) => score(v) > score(u) ? v : u);
    const ce = pick([-b, b].map(z => [pr(-a, -hh, z), pr(a, -hh, z)]), e => e[0][1] + e[1][1]);
    dim(ce[0], ce[1], (V.cube ? 'a = ' : 'c = ') + fm(c) + ' m');
    if (V.cube) return;
    const le = pick([-a, a].map(x => [pr(x, -hh, -b), pr(x, -hh, b)]), e => e[0][0] + e[1][0]);
    dim(le[0], le[1], 'l = ' + fm(l) + ' m');
    const he = pick([[-a, -b], [-a, b], [a, -b], [a, b]].map(([x, z]) => [pr(x, -hh, z), pr(x, hh, z)]), e => -(e[0][0] + e[1][0]));
    dim(he[0], he[1], 'h = ' + fm(h) + ' m');
  }

  /* cilindro: anel de 56 segmentos */
  function drawCyl() {
    const {r, h} = V.d, hh = h / 2, N = 56, yb = -hh, yt = hh, yw = -hh + h * V.lv;
    const ring = y => Array.from({length: N}, (_, i) => pr(r * Math.cos(TAU * i / N), y, r * Math.sin(TAU * i / N)));
    const nf = Array.from({length: N}, (_, i) => rot(Math.cos(TAU * (i + .5) / N), 0, Math.sin(TAU * (i + .5) / N))[2] > 0);
    const RB = ring(yb), RT = ring(yt), RW = ring(yw), topF = rot(0, 1, 0)[2] > 0, wet = h * V.lv > 1e-6;
    const side = (A, B, i, col) => fill([A[i], A[(i + 1) % N], B[(i + 1) % N], B[i]], col);
    const sides = (A, B, front, col) => { for (let i = 0; i < N; i++) if (nf[i] === front) side(A, B, i, col); };
    sides(RB, RT, false, C.glass);                           // vidro (trás)
    if (!topF && !V.open) fill(RT, C.lid); if (topF) fill(RB, C.glass);
    if (wet) { sides(RB, RW, false, 'rgba(12,183,242,.45)'); fill(topF ? RB : RW, topF ? 'rgba(9,121,176,.5)' : 'rgba(124,218,249,.78)');   // água (trás)
      sides(RB, RW, true, 'rgba(12,183,242,.55)'); if (topF) fill(RW, 'rgba(124,218,249,.78)', 'rgba(255,255,255,.7)'); else fill(RB, 'rgba(9,121,176,.5)'); }
    sides(RB, RT, true, C.glass);                            // vidro (frente)
    if (topF && !V.open) fill(RT, C.lid); if (!topF) fill(RB, C.glass);
    for (const [R, disc] of [[RB, !topF], [RT, topF]]) for (let i = 0; i < N; i++) { const j = (i + 1) % N, vis = disc || nf[i]; line(R[i], R[j], vis ? C.edge : C.hid, vis ? 1.8 : 1, vis ? null : [4, 4]); }
    for (let i = 0; i < N; i++) if (nf[i] !== nf[(i + N - 1) % N]) line(RB[i], RT[i], C.edge, 1.8);
    if (!o.labels) return;
    const y0 = topF ? yt : yb, c0 = pr(0, y0, 0), c1 = pr(r, y0, 0);
    line(c0, c1, '#b3261e', 2.2); ctx.beginPath(); ctx.arc(c0[0], c0[1], 3.5, 0, TAU); ctx.fillStyle = C.edge; ctx.fill();
    text('r = ' + fm(r) + ' m', (c0[0] + c1[0]) / 2, Math.min(c0[1], c1[1]) - 14);
    let m = 0; for (let i = 1; i < N; i++) if (RB[i][0] < RB[m][0]) m = i;
    dim(RB[m], RT[m], 'h = ' + fm(h) + ' m');
  }

  function resize() {
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h; return true;
  }
  function draw() {
    if (!resize()) return;
    ctx.clearRect(0, 0, W, H);
    sY = Math.sin(V.yaw); cY = Math.cos(V.yaw); sP = Math.sin(V.pitch); cP = Math.cos(V.pitch);
    const d = V.d, cyl = V.shape === 'cyl', R = cyl ? Math.hypot(d.r, d.h / 2) : Math.hypot(d.c, d.l, d.h) / 2;
    k = Math.min(W, H) / 2 * (o.labels ? .62 : .8) / R * V.zoom; cx = W / 2; cy = H / 2;
    const g = pr(0, -d.h / 2, 0), rx = (cyl ? d.r : Math.hypot(d.c, d.l) / 2) * k * 1.2, ry = rx * (.16 + .3 * Math.abs(sP)), gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(${C.shadow},.28)`); gr.addColorStop(1, `rgba(${C.shadow},0)`);
    ctx.save(); ctx.translate(g[0], g[1] + 6); ctx.scale(1, ry / rx); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();   // sombra no chão
    cyl ? drawCyl() : drawBox();
    if (o.onFrame) o.onFrame(V);
  }
  const loop = ts => {
    V.raf = 0; V.t = ts / 1000;
    if (V.auto) V.yaw += .004;
    if (o.fill) V.lv = .58 + .27 * Math.sin(V.t * .55);      // nível sobe e desce (página inicial)
    draw(); if (!RM && (V.auto || o.fill)) schedule();
  };
  function schedule() { if (!V.raf && V.vis && !document.hidden) V.raf = requestAnimationFrame(loop); }

  /* interação: arrastar gira; roda/pinça aproxima; setas giram, + e − aproximam */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), zoomBy = z => { V.zoom = clamp(V.zoom * z, .5, 3); schedule(); };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); V.auto = false; cv.classList.add('grab'); });
  cv.addEventListener('pointermove', e => {
    const p = ptr.get(e.pointerId); if (!p) return;
    if (ptr.size === 1) { V.yaw += (e.clientX - p[0]) * .01; V.pitch = clamp(V.pitch + (e.clientY - p[1]) * .01, -1.5, 1.5); }
    else if (ptr.size === 2) { const [A, B] = [...ptr.entries()], o2 = A[0] === e.pointerId ? B[1] : A[1], d0 = Math.hypot(p[0] - o2[0], p[1] - o2[1]), d1 = Math.hypot(e.clientX - o2[0], e.clientY - o2[1]); if (d0 > 0) zoomBy(d1 / d0); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); schedule();
  });
  const up = e => { ptr.delete(e.pointerId); if (!ptr.size) cv.classList.remove('grab'); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); V.auto = false; zoomBy(Math.exp(-e.deltaY * .0015)); }, {passive: false});
  cv.addEventListener('keydown', e => {
    const m = {ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12]}[e.key];
    if (m) { e.preventDefault(); V.auto = false; V.yaw += m[0]; V.pitch = clamp(V.pitch + m[1], -1.5, 1.5); schedule(); }
    else if (e.key === '+' || e.key === '=') zoomBy(1.15); else if (e.key === '-') zoomBy(1 / 1.15);
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { V.vis = es[0].isIntersecting; if (V.vis) schedule(); }).observe(cv);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(cv);
  document.addEventListener('visibilitychange', schedule);
  return {
    V, redraw: schedule, zoomBy,
    reset() { V.yaw = -.62; V.pitch = .5; V.zoom = 1; V.auto = false; schedule(); },
    set(shape, d, open) { V.cube = shape === 'cube'; V.shape = shape === 'cyl' ? 'cyl' : 'box'; V.d = d; V.open = open; schedule(); }
  };
}
const LAB = Viewer($('#cv'), {labels: true});
$('#vin').onclick = () => LAB.zoomBy(1.2); $('#vout').onclick = () => LAB.zoomBy(1 / 1.2); $('#vreset').onclick = () => LAB.reset();
const HERO = Viewer($('#herocv'), {dark: true, auto: true, fill: true, wave: 1, onFrame: v => { $('#herol').textContent = f(v.d.c * v.d.l * v.d.h * v.lv * 1000, 0) + ' L'; }});
HERO.set('box', {c: 4, l: 3, h: 2.4}, true);

/* ---------- Condições definidas pelo aluno (laboratório livre) ---------- */
const num = id => { const x = parseFloat(String($(id).value).replace(',', '.')); return x > 0 && isFinite(x) ? x : undefined; };
function applyCu() { const c = {id: 'cu', open: S.open, goal: 'minMat', minL: num('#cu_minL'), maxMat: num('#cu_maxMat'), budget: num('#cu_bud')}; S.cu = (c.minL || c.maxMat || c.budget) ? c : null; enforce(); buildCtl(); render(); return S.cu; }
$('#cu_apply').onclick = () => { $('#cu_out').textContent = applyCu() ? 'Condições aplicadas: veja as restrições no painel.' : 'Nenhuma condição definida.'; };
$('#cu_clr').onclick = () => { ['#cu_minL', '#cu_maxMat', '#cu_bud'].forEach(i => $(i).value = ''); S.cu = null; $('#cu_out').textContent = ''; buildCtl(); render(); };
$('#cu_chk').onclick = () => {
  const c = applyCu(), o = $('#cu_out'); if (!c) { o.textContent = 'Defina ao menos uma condição.'; return; }
  const sh = S.shape === 'cube' ? 'box' : S.shape, b = solve(c, sh);
  o.textContent = b ? `Viável: a busca numérica (grade de 0,1 m, refinada a 0,01 m) encontrou um projeto (${NAMES[sh]}, ${dimStr(sh, b.d)}) com ${f(b.g.mat)} m² de material, ${f(b.g.L, 0)} L e custo R$ ${f(b.g.cost)}.`
    : `Inviável para ${NAMES[sh]} nos limites do laboratório (até ${LIM.c} m por dimensão; raio até ${LIM.r} m): nenhum projeto testado atende a todas as condições. Relaxe uma delas (mais material ou orçamento, ou menos capacidade).`;
};


/* ---------- Meus projetos (tabela única): salvar, comparar e escolher UM para concluir ---------- */
const ss = () => { const x = P.sess[S.mission] = P.sess[S.mission] || {att: [], sel: null}; x.att.forEach((t, i) => { if (t.id == null) t.id = 'p' + Date.now().toString(36) + i; }); return x; };
const dimStr = (sh, d) => sh === 'cyl' ? `r=${f(d.r, 2)}; h=${f(d.h, 2)}` : sh === 'cube' ? `a=${f(d.c, 2)}` : `c=${f(d.c, 2)}; l=${f(d.l, 2)}; h=${f(d.h, 2)}`;
function snapshot() { const d = dims(), g = geom(S.shape, d, S.open), m = cur(); return {id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), shape: S.shape, open: S.open, d: Object.assign({}, d), dim: dimStr(S.shape, d), mat: g.mat, V: g.V, L: g.L, cost: g.cost, ok: check(m, g, d).ok, mid: S.mission}; }
function changed(p, n) {                                      // variáveis alteradas entre projetos consecutivos
  if (!p) return 'primeiro projeto'; const o = [];
  if (p.shape !== n.shape) o.push('formato'); if (p.open !== n.open) o.push('tampa');
  for (const k in n.d) if (p.d[k] !== undefined && Math.abs(p.d[k] - n.d[k]) > 1e-9) o.push(`${k}: ${f(p.d[k], 1)}→${f(n.d[k], 1)}`);
  return o.join('; ') || 'nenhuma (repetido)';
}
$('#saveproj').onclick = () => { const x = ss(), n = snapshot(); n.chg = changed(x.att[x.att.length - 1], n); x.att.push(n); save(); renderAtt(); $('#saved').textContent = `Projeto ${x.att.length} salvo em “Meus projetos”, logo abaixo.`; };
const GOAL = {maxV: ['maior volume', t => t.V, (u, w) => u > w, v => `${f(v, 3)} m³`], minMat: ['menor material', t => t.mat, (u, w) => u < w, v => `${f(v, 2)} m²`], minCost: ['menor custo', t => t.cost, (u, w) => u < w, v => `R$ ${f(v, 2)}`]};
function bestIdx(a, m) {                                      // melhor projeto válido segundo o objetivo da missão
  const G = m && GOAL[m.goal]; if (!G) return -1; let b = -1;
  a.forEach((t, i) => { if (t.ok && (b < 0 || G[2](G[1](t), G[1](a[b])))) b = i; });
  return b;
}
const dl = (v, p, d) => p === undefined || Math.abs(v - p) < 1e-9 ? '' : ` <small class="dl" title="em relação ao projeto anterior">${v > p ? '▲' : '▼'} ${f(Math.abs(v - p), d)}</small>`;
const attRows = (a, m, edit, sel) => { const b = bestIdx(a, m); return a.map((t, i) => { const p = a[i - 1] || {}, on = edit && String(t.id) === String(sel);
  return `<tr class="${t.ok ? '' : 'inv'}${i === b ? ' best' : ''}${on ? ' pick' : ''}">${edit ? `<td><input type="radio" name="pick" value="${t.id}" ${on ? 'checked' : ''} ${t.ok ? '' : 'disabled title="Este projeto não atende às restrições"'} aria-label="Escolher o projeto ${i + 1}"></td>` : ''}<td>${i === b ? '★ ' : ''}${i + 1}</td><td>${NAMES[t.shape]}</td><td>${t.dim}</td><td>${esc(t.chg)}</td><td>${f(t.mat)}${dl(t.mat, p.mat, 2)}</td><td>${f(t.V, 3)}${dl(t.V, p.V, 3)}</td><td>${f(t.L, 0)}</td><td>${f(t.cost)}${dl(t.cost, p.cost, 2)}</td><td class="${t.ok ? 'ok' : 'no'}">${t.ok ? '✔ Atende' : '✘ Viola restrição'}</td>${edit ? `<td><button class="btn sm ghost" data-del="${i}" aria-label="Remover projeto ${i + 1}">×</button></td>` : ''}</tr>`; }).join(''); };
const ATTH = edit => '<tr>' + (edit ? '<th scope="col">Escolher</th>' : '') + '<th scope="col">#</th><th scope="col">Sólido</th><th scope="col">Dimensões (m)</th><th scope="col">O que mudou</th><th scope="col">Material (m²)</th><th scope="col">Volume (m³)</th><th scope="col">Litros</th><th scope="col">Custo (R$)</th><th scope="col">Situação</th>' + (edit ? '<th></th>' : '') + '</tr>';
function renderAtt() {
  const m = M.find(x => x.id === S.mission); if (!m) return; const x = ss(), a = x.att, G = GOAL[m.goal], b = bestIdx(a, m), nv = a.filter(t => t.ok).length;
  if (x.sel != null && !a.some(t => String(t.id) === String(x.sel))) x.sel = null;
  $('#attsum').innerHTML = `<b>Objetivo:</b> ${G[0]}. ` + (a.length ? `${a.length} projeto(s) salvo(s), ${nv} que atende(m) às restrições. ` + (b >= 0 ? `<b>Melhor até agora:</b> ★ nº ${b + 1} (${NAMES[a[b].shape]}, ${a[b].dim}) com ${G[3](G[1](a[b]))}.` : 'Ainda nenhum atende às restrições.') : 'Ajuste as dimensões acima e clique em “Salvar projeto”.');
  $('#atttab').innerHTML = ATTH(true) + (a.length ? attRows(a, m, true, x.sel) : '<tr><td colspan="11" class="muted">Nenhum projeto salvo.</td></tr>');
}
$('#atttab').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { const x = ss(), t = x.att.splice(+b.dataset.del, 1)[0]; if (t && String(t.id) === String(x.sel)) x.sel = null; save(); renderAtt(); } };
$('#atttab').onchange = e => { if (e.target.name === 'pick') { ss().sel = e.target.value; save(); renderAtt(); } };
function renderHints() { const m = cur(), n = P.hint[m.id] || 0; $('#hintbtn').textContent = `Pedir dica (${n}/3)`; $('#hint').innerHTML = m.hints.slice(0, n).map((h, i) => `<p><b>Dica ${i + 1}:</b> ${h}</p>`).join(''); }
$('#hintbtn').onclick = () => { const m = cur(); P.hint[m.id] = Math.min(3, (P.hint[m.id] || 0) + 1); save(); renderHints(); };
$('#restart').onclick = () => {
  if (!P.sess[S.mission] || !confirm('Reiniciar esta missão? Os projetos salvos serão apagados.')) return;
  delete P.sess[S.mission]; delete P.done[S.mission]; delete P.hint[S.mission]; save(); $('#fb').innerHTML = ''; $('#saved').textContent = ''; renderHints(); renderAtt(); renderProg();
};
$('#print').onclick = () => {                                 // página de impressão (use “Salvar como PDF” na janela de impressão)
  const m = cur(), x = ss(), pi = x.att.findIndex(t => String(t.id) === String(x.sel));
  $('#printarea').innerHTML = `<h1>Geometria da Água — Projetos salvos</h1><h2>Missão ${m.id} — ${m.t}</h2><p>${m.desc}</p><p>${$('#attsum').innerHTML}</p>`
    + (pi >= 0 ? `<p><b>Projeto escolhido:</b> nº ${pi + 1}</p>` : '')
    + '<table>' + ATTH(false) + attRows(x.att, m, false) + '</table>'
    + `<p><small>Gerado em ${new Date().toLocaleString('pt-BR')}. Valores e preços são didáticos.</small></p>`;
  window.print();
};
$('#mlist').onclick = e => { const b = e.target.closest('[data-m]'); if (b) openMission(+b.dataset.m); };

/* ---------- Conclusão: escolher UM projeto salvo ---------- */
$('#finish').onclick = () => {
  const m = cur(), x = ss(), fb = $('#fb'), v = x.att.filter(t => t.ok), pick = x.att.find(t => String(t.id) === String(x.sel)), pend = [];
  if (!v.length) pend.push('salve pelo menos um projeto que atenda às restrições');
  else if (!pick) pend.push('escolha um projeto salvo na tabela (coluna “Escolher”)');
  if (m.needBoth && !['box', 'cyl'].every(g => v.some(t => (t.shape === 'cyl' ? 'cyl' : 'box') === g))) pend.push('salve um projeto válido de cada formato (paralelepípedo e cilindro) para poder compará-los');
  if (pend.length) { fb.innerHTML = `<div class="bad"><b>Para concluir a missão, falta:</b><ul>${pend.map(t => `<li>${t}</li>`).join('')}</ul></div>`; fb.scrollIntoView({behavior: 'smooth', block: 'center'}); return; }
  const val = t => m.goal === 'maxV' ? t.V : m.goal === 'minMat' ? t.mat : t.cost, better = (u, w) => m.goal === 'maxV' ? u > w : u < w, un = m.goal === 'maxV' ? 'm³' : m.goal === 'minMat' ? 'm²' : 'R$';
  const groups = m.needBoth ? ['box', 'cyl'] : [null], lines = []; let eff = null;
  for (const gr of groups) {
    const cand = v.filter(t => !gr || (t.shape === 'cyl' ? 'cyl' : 'box') === gr); let b = gr ? cand[0] : pick; if (gr) cand.forEach(t => { if (better(val(t), val(b))) b = t; });
    const shs = [...new Set((gr ? [gr] : m.shapes).map(q => q === 'cube' ? 'box' : q))], opts = shs.map(q => solve(m, q)).filter(Boolean);
    if (!opts.length) continue; const ov = opts.reduce((u, o) => better(o.v, u) ? o.v : u, opts[0].v), e = m.goal === 'maxV' ? val(b) / ov : ov / val(b);
    eff = eff === null ? e : Math.min(eff, e);
    lines.push(`<li>${gr ? NAMES[gr] + ': seu melhor projeto salvo' : 'Seu projeto escolhido'} (${NAMES[b.shape]}, ${b.dim}) → ${f(val(b), 3)} ${un}; melhor valor encontrado pela busca: ${f(ov, 3)} ${un} (${e >= 1 - 1e-9 ? 'seu projeto é igual ou melhor que o encontrado' : 'seu projeto chega a ' + f(e * 100, 1) + '% do melhor encontrado'}).</li>`);
  }
  const pct = eff == null ? null : Math.min(100, eff * 100); P.done[m.id] = {t: Date.now(), eff, pick: pick.dim}; save(); renderProg();
  const A = 60, extra = (m.id === 2 || m.id === 3) ? `<p>Para comparar com a teoria (cálculo, aberto, ${A} m²): caixa de base quadrada com x = √(A/3) = ${f(Math.sqrt(A / 3))} m e h = x/2 → V = ${f(Math.pow(A / 3, 1.5) / 2, 3)} m³; cilindro com r = h = √(A/3π) = ${f(Math.sqrt(A / (3 * PI)))} m → V = ${f(PI * Math.pow(A / (3 * PI), 1.5), 3)} m³. Vale para <b>esta</b> condição, não é regra geral.</p>` : '';
  fb.innerHTML = `<div><h3>Missão concluída</h3>${pct == null ? '' : `<div class="pct" role="img" aria-label="${f(pct, 1)} por cento do melhor valor encontrado"><div class="pct-n">${f(pct, 1)}%</div><div class="pct-b"><i style="width:${pct.toFixed(1)}%"></i></div><p class="muted">Quanto o seu projeto escolhido chegou do melhor valor encontrado pela busca (100% = igual ou melhor).</p></div>`}<p>Projeto escolhido: <b>${NAMES[pick.shape]}, ${pick.dim}</b> (${pick.open ? 'aberto' : 'fechado'}): ${f(pick.mat)} m² de material, ${f(pick.V, 3)} m³, ${f(pick.L, 0)} L e custo de R$ ${f(pick.cost)}. Compare-o na tabela com os outros projetos salvos: o que mudou no material, no volume e no custo? Discuta com o professor e a turma.</p>
   <h4>Desafio de otimização (informativo)</h4><ul>${lines.join('')}</ul><p class="muted">A busca testa uma grade de 0,1 m dentro dos limites do laboratório e refina em passos de 0,01 m ao redor do melhor ponto: é o melhor valor <i>entre os testados</i>, não o ótimo matemático absoluto. Você pode salvar novos projetos e escolher outro.</p>${extra}
   <p class="muted">Cálculos: V = Ab·h; material = ${m.open ? 'Ab + Alat' : '2·Ab + Alat'}; 1 m³ = 1.000 L.</p></div>`;
  fb.scrollIntoView({behavior: 'smooth', block: 'center'});
};

function renderProg() { const n = Object.keys(P.done).length; $('#prog').innerHTML = `Missões <b>${n}/${M.length}</b><span class="pbar"><i style="width:${n / M.length * 100}%"></i></span>`; }
const setHH = () => document.documentElement.style.setProperty('--hh', $('header').offsetHeight + 'px');
if ('ResizeObserver' in window) new ResizeObserver(setHH).observe($('header')); setHH();
/* ---------- Missão 6: A água chega a todos? (módulo separado, 3 etapas) ---------- */
/* DADOS REAIS: SINISA 2025 (Ministério das Cidades), ano de referência 2024, relatório “Abastecimento de Água”.
   t = IAG0001, atendimento da população TOTAL com rede de abastecimento de água (%);
   u = IAG0002 (população urbana); r = IAG0003 (população rural). Brasil: 84,1% / 92,3% / 22,9%.
   Os valores são os publicados no relatório, sem cálculo nem arredondamento adicional.
   MAPA: tenta carregar a malha oficial de Grandes Regiões do serviço de malhas do IBGE; se estiver sem conexão,
   mantém o desenho local de contingência e informa essa limitação ao usuário. */
const M6_SRC = 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/008_RELATORIO_SINISA_ABASTECIMENTO_AGUA_2025_defeso.pdf';
const M6_MAP = {"w":575,"h":588,"r":{"1":{"d":"M404.3,105.4L403.9,106.9L403.2,110.0L402.2,114.6L400.8,120.8L398.9,126.9L396.6,132.9L393.9,138.8L390.7,144.6L387.9,149.8L385.5,154.5L383.3,158.7L381.6,162.3L380.4,166.5L379.9,171.2L380.0,176.5L380.7,182.3L382.4,187.8L385.0,193.1L388.6,198.1L393.2,202.8L397.0,207.9L400.0,213.3L402.2,219.1L403.6,225.3L404.3,231.2L404.3,236.8L403.6,242.1L402.2,247.2L401.0,251.9L400.1,256.3L399.5,260.3L399.2,263.9L398.9,266.6L398.7,268.4L398.6,269.3L397.8,270.2L396.0,272.1L393.4,274.8L389.8,278.4L386.1,280.9L382.0,282.1L377.7,282.2L373.1,281.1L368.7,279.7L364.5,277.9L360.5,275.7L356.6,273.1L353.0,270.0L349.6,266.2L346.6,261.7L343.7,256.6L341.8,251.6L340.8,246.5L340.6,241.4L341.3,236.3L340.8,232.0L339.3,228.4L336.5,225.5L332.7,223.3L327.6,221.8L321.2,221.1L313.7,221.1L304.9,221.8L296.1,222.5L287.3,223.3L278.5,224.0L269.7,224.7L261.7,224.7L254.4,224.0L248.0,222.5L242.4,220.4L236.1,219.7L229.3,220.6L221.8,223.1L213.7,227.1L207.2,231.1L202.3,235.1L198.9,239.1L197.2,243.0L195.7,247.3L194.4,251.8L193.5,256.6L192.8,261.7L192.9,266.7L193.7,271.6L195.4,276.4L197.9,281.1L199.7,284.7L201.0,287.0L201.6,288.2L200.0,287.7L196.8,286.6L192.1,284.9L185.7,282.8L179.8,280.5L174.4,278.1L169.4,275.7L164.8,273.1L160.0,270.6L155.1,268.1L150.0,265.5L144.7,263.0L140.4,259.9L137.1,256.3L134.7,252.1L133.3,247.4L130.8,243.5L127.3,240.4L122.7,238.1L117.1,236.7L111.4,236.6L105.6,237.9L99.7,240.5L93.7,244.5L87.6,247.4L81.5,249.2L75.2,249.9L68.9,249.6L62.7,248.1L56.5,245.6L50.4,242.0L44.4,237.2L39.1,233.2L34.3,230.0L30.2,227.4L26.7,225.6L23.4,222.7L20.4,218.7L17.7,213.7L15.2,207.5L14.0,201.5L14.0,195.7L15.2,190.1L17.7,184.6L19.9,179.7L21.8,175.1L23.5,171.0L24.9,167.4L27.7,164.0L31.9,160.7L37.6,157.6L44.6,154.7L50.7,152.5L55.8,151.1L59.9,150.4L63.1,150.4L65.8,147.7L68.1,142.2L70.0,134.1L71.4,123.2L72.0,113.4L71.8,104.7L70.8,97.1L69.1,90.5L68.2,85.2L68.2,81.0L69.1,78.0L70.8,76.2L74.4,74.1L79.6,71.8L86.7,69.1L95.5,66.2L102.2,65.0L106.7,65.3L109.2,67.3L109.5,70.9L111.0,73.6L113.7,75.2L117.5,75.8L122.4,75.5L127.4,74.6L132.5,73.1L137.7,71.1L143.0,68.6L146.9,65.9L149.6,63.0L150.9,59.9L150.9,56.6L151.4,53.1L152.5,49.3L154.1,45.2L156.2,40.8L158.8,37.3L162.0,34.6L165.7,32.7L169.9,31.6L174.1,30.3L178.3,28.9L182.6,27.2L186.8,25.4L190.2,23.5L192.9,21.5L194.7,19.4L195.8,17.3L197.2,15.6L198.9,14.5L201.0,14.0L203.5,14.0L205.5,14.8L207.1,16.4L208.3,18.9L209.0,22.2L209.1,25.6L208.5,29.2L207.4,33.0L205.6,37.0L204.7,40.9L204.7,44.7L205.6,48.5L207.4,52.1L209.4,55.5L211.7,58.8L214.2,61.9L217.1,64.8L220.4,66.5L224.3,67.0L228.7,66.4L233.6,64.6L238.3,63.2L242.7,62.3L246.8,61.9L250.7,61.9L254.1,61.9L257.1,61.9L259.6,61.9L261.8,61.9L264.5,61.5L267.8,60.8L271.8,59.7L276.4,58.2L280.5,57.1L284.2,56.2L287.4,55.5L290.3,55.2L293.2,55.1L296.2,55.3L299.2,55.7L302.4,56.4L305.6,56.0L308.7,54.3L311.9,51.5L315.1,47.5L317.8,43.7L320.1,39.8L321.9,36.1L323.3,32.5L325.1,31.9L327.2,34.2L329.7,39.6L332.5,47.9L334.8,55.7L336.5,63.0L337.8,69.7L338.5,75.8L340.0,81.2L342.3,85.7L345.3,89.4L349.2,92.3L353.1,95.2L356.9,97.9L360.8,100.5L364.7,103.0L368.8,104.5L373.2,104.9L377.9,104.1L382.8,102.3L387.4,101.3L391.6,101.1L395.5,101.8L399.0,103.2L401.6,104.3L403.4,105.0L404.3,105.4Z","x":186.1,"y":144.6},"2":{"d":"M404.3,105.4L405.7,106.6L408.5,108.9L412.7,112.5L418.4,117.2L423.8,120.8L429.1,123.4L434.2,124.8L439.1,125.2L443.9,125.7L448.4,126.4L452.8,127.3L457.1,128.4L461.8,129.2L467.1,129.8L472.9,130.1L479.2,130.1L485.3,130.9L491.1,132.5L496.7,135.0L501.9,138.2L507.0,141.4L512.0,144.5L516.7,147.5L521.3,150.4L526.3,153.2L531.8,155.9L537.7,158.5L544.0,161.1L548.9,163.5L552.4,165.9L554.5,168.1L555.3,170.3L556.1,173.1L557.2,176.6L558.4,180.7L559.8,185.4L560.8,189.8L561.3,194.0L561.4,197.9L561.1,201.5L560.3,205.4L559.0,209.6L557.4,214.0L555.3,218.7L552.9,223.2L550.2,227.4L547.3,231.3L544.2,234.9L541.2,238.1L538.4,241.0L535.7,243.6L533.3,245.8L530.8,248.3L528.3,251.2L525.9,254.5L523.4,258.1L520.9,261.7L518.5,265.3L516.0,269.0L513.5,272.6L511.4,276.1L509.4,279.6L507.7,282.9L506.3,286.2L505.2,289.6L504.3,293.3L503.7,297.1L503.3,301.1L503.1,305.3L502.9,309.9L502.8,314.7L502.8,319.8L502.6,324.4L502.3,328.5L501.8,332.3L501.1,335.5L500.1,338.9L499.0,342.3L497.6,345.9L496.0,349.5L494.9,352.2L494.1,354.0L493.7,354.9L492.6,354.6L490.4,353.8L487.1,352.8L482.7,351.3L478.9,349.4L475.9,347.0L473.4,344.2L471.7,341.0L470.0,337.4L468.4,333.6L466.9,329.5L465.5,325.2L463.6,321.7L461.1,318.9L458.1,317.0L454.6,315.9L451.4,314.6L448.6,313.0L446.2,311.0L444.0,308.9L441.8,306.7L439.3,304.5L436.7,302.3L433.8,300.2L431.0,298.7L428.2,298.0L425.4,298.0L422.6,298.7L419.3,299.1L415.6,299.1L411.5,298.7L406.9,298.0L403.5,297.4L401.2,297.1L400.1,296.9L400.1,296.1L400.3,294.5L400.6,292.0L400.9,288.7L401.0,285.4L400.8,281.9L400.4,278.4L399.7,274.8L399.2,272.1L398.8,270.2L398.6,269.3L398.7,268.4L398.9,266.6L399.2,263.9L399.5,260.3L400.1,256.3L401.0,251.9L402.2,247.2L403.6,242.1L404.3,236.8L404.3,231.2L403.6,225.3L402.2,219.1L400.0,213.3L397.0,207.9L393.2,202.8L388.6,198.1L385.0,193.1L382.4,187.8L380.7,182.3L380.0,176.5L379.9,171.2L380.4,166.5L381.6,162.3L383.3,158.7L385.5,154.5L387.9,149.8L390.7,144.6L393.9,138.8L396.6,132.9L398.9,126.9L400.8,120.8L402.2,114.6L403.2,110.0L403.9,106.9L404.3,105.4Z","x":457.8,"y":199.7},"3":{"d":"M493.7,354.9L493.6,355.3L493.5,356.0L493.4,357.1L493.2,358.6L492.6,361.1L491.4,364.7L489.8,369.4L487.7,375.2L485.5,381.0L483.2,386.6L480.8,392.1L478.4,397.5L475.8,402.3L473.2,406.3L470.4,409.5L467.6,412.1L465.3,414.3L463.6,416.3L462.3,418.0L461.6,419.5L460.1,420.7L457.6,421.6L454.3,422.2L450.0,422.6L445.9,422.8L441.8,423.0L437.9,423.1L434.0,423.1L430.8,423.4L428.1,423.9L426.1,424.8L424.7,425.8L423.3,426.8L421.9,427.7L420.5,428.6L419.1,429.3L417.2,430.2L414.9,431.3L412.2,432.5L409.0,434.0L406.4,435.2L404.3,436.1L402.7,436.7L401.6,437.1L400.2,438.0L398.5,439.4L396.4,441.4L393.9,444.0L391.5,446.1L389.2,447.7L387.0,448.9L384.9,449.6L383.0,450.5L381.2,451.6L379.6,452.9L378.2,454.3L377.2,455.4L376.5,456.1L376.1,456.5L375.4,455.7L374.0,454.0L371.9,451.6L369.1,448.3L365.9,445.3L362.4,442.6L358.5,440.2L354.3,438.0L349.7,435.5L344.8,432.5L339.5,429.3L333.9,425.7L328.4,422.6L322.9,420.0L317.5,418.0L312.3,416.6L308.3,415.5L305.7,414.8L304.3,414.4L305.1,413.9L306.7,412.8L309.1,411.2L312.3,409.0L315.1,406.6L317.5,404.1L319.6,401.4L321.4,398.5L323.0,395.7L324.4,393.2L325.6,390.8L326.7,388.7L327.8,386.6L329.1,384.6L330.4,382.7L331.8,380.9L333.5,379.0L335.7,377.0L338.1,374.9L340.9,372.7L343.6,370.4L346.0,368.1L348.3,365.6L350.4,363.1L352.8,360.9L355.4,359.1L358.4,357.7L361.5,356.6L364.6,355.4L367.6,354.1L370.5,352.8L373.3,351.3L375.7,349.4L377.6,347.0L379.1,344.2L380.2,341.0L381.4,337.8L382.8,334.7L384.4,331.7L386.2,328.8L388.0,326.1L389.9,323.6L392.0,321.2L394.1,319.0L395.7,316.6L397.0,313.9L397.8,310.9L398.1,307.6L398.5,304.8L398.8,302.4L399.2,300.5L399.5,299.1L399.8,298.0L400.0,297.3L400.1,296.9L401.2,297.1L403.5,297.4L406.9,298.0L411.5,298.7L415.6,299.1L419.3,299.1L422.6,298.7L425.4,298.0L428.2,298.0L431.0,298.7L433.8,300.2L436.7,302.3L439.3,304.5L441.8,306.7L444.0,308.9L446.2,311.0L448.6,313.0L451.4,314.6L454.6,315.9L458.1,317.0L461.1,318.9L463.6,321.7L465.5,325.2L466.9,329.5L468.4,333.6L470.0,337.4L471.7,341.0L473.4,344.2L475.9,347.0L478.9,349.4L482.7,351.3L487.1,352.8L490.4,353.8L492.6,354.6L493.7,354.9Z","x":415.5,"y":385.4},"4":{"d":"M376.1,456.5L375.7,456.7L374.8,457.0L373.5,457.6L371.7,458.3L370.3,459.8L369.3,461.9L368.6,464.8L368.2,468.5L368.0,472.2L368.0,476.0L368.2,479.9L368.6,483.9L368.6,487.7L368.5,491.3L368.0,494.8L367.3,498.0L366.4,501.3L365.1,504.5L363.6,507.8L361.9,511.1L360.1,513.5L358.4,515.2L356.6,516.0L354.8,516.0L352.8,517.0L350.5,519.0L348.0,522.0L345.2,525.9L342.4,529.6L339.8,532.8L337.2,535.7L334.8,538.3L332.1,541.1L329.3,544.2L326.3,547.5L323.2,551.2L319.6,555.2L315.8,559.8L311.5,564.8L307.0,570.2L303.5,573.3L301.3,574.0L300.1,572.4L300.1,568.4L299.4,564.8L298.0,561.8L295.9,559.1L293.1,557.0L290.3,554.6L287.4,552.1L284.6,549.3L281.8,546.4L279.3,544.0L277.0,542.0L274.9,540.5L273.2,539.4L271.0,538.0L268.3,536.4L265.3,534.5L261.8,532.3L258.1,530.6L254.4,529.3L250.7,528.5L246.8,528.1L244.3,527.5L243.3,526.6L243.6,525.4L245.4,523.9L247.7,521.8L250.5,518.9L253.8,515.2L257.7,510.9L261.3,507.0L264.7,503.5L267.7,500.6L270.5,498.0L273.7,495.5L277.2,492.9L281.1,490.4L285.3,487.9L288.7,485.1L291.1,482.2L292.7,479.2L293.4,475.9L293.4,472.8L292.7,469.9L291.3,467.2L289.2,464.6L287.4,462.7L286.0,461.2L285.0,460.3L284.3,459.9L283.7,458.3L283.4,455.5L283.2,451.5L283.2,446.2L283.2,442.3L283.2,439.7L283.2,438.4L283.7,437.9L284.8,436.9L286.4,435.4L288.5,433.4L290.6,431.2L292.7,429.0L294.8,426.6L296.9,424.0L298.8,421.8L300.4,419.8L301.7,418.0L302.7,416.6L303.5,415.5L304.1,414.8L304.3,414.4L305.7,414.8L308.3,415.5L312.3,416.6L317.5,418.0L322.9,420.0L328.4,422.6L333.9,425.7L339.5,429.3L344.8,432.5L349.7,435.5L354.3,438.0L358.5,440.2L362.4,442.6L365.9,445.3L369.1,448.3L371.9,451.6L374.0,454.0L375.4,455.7L376.1,456.5Z","x":319.8,"y":487.0},"5":{"d":"M398.6,269.3L397.8,270.2L396.0,272.1L393.4,274.8L389.8,278.4L386.1,280.9L382.0,282.1L377.7,282.2L373.1,281.1L368.7,279.7L364.5,277.9L360.5,275.7L356.6,273.1L353.0,270.0L349.6,266.2L346.6,261.7L343.7,256.6L341.8,251.6L340.8,246.5L340.6,241.4L341.3,236.3L340.8,232.0L339.3,228.4L336.5,225.5L332.7,223.3L327.6,221.8L321.2,221.1L313.7,221.1L304.9,221.8L296.1,222.5L287.3,223.3L278.5,224.0L269.7,224.7L261.7,224.7L254.4,224.0L248.0,222.5L242.4,220.4L236.1,219.7L229.3,220.6L221.8,223.1L213.7,227.1L207.2,231.1L202.3,235.1L198.9,239.1L197.2,243.0L195.7,247.3L194.4,251.8L193.5,256.6L192.8,261.7L192.9,266.7L193.7,271.6L195.4,276.4L197.9,281.1L199.7,284.7L201.0,287.0L201.6,288.2L201.7,289.4L202.1,291.7L202.6,295.3L203.3,300.0L204.6,304.7L206.3,309.4L208.6,314.1L211.4,318.8L214.4,322.5L217.6,325.0L220.9,326.5L224.4,326.8L227.3,328.0L229.4,330.0L230.8,332.8L231.5,336.4L232.5,339.9L233.7,343.1L235.2,346.2L236.9,349.1L238.4,352.0L239.7,354.9L240.6,357.8L241.3,360.7L241.3,363.6L240.4,366.5L238.7,369.4L236.2,372.3L234.7,375.5L234.2,379.0L234.7,382.7L236.1,386.7L237.1,390.7L237.8,394.6L238.2,398.6L238.2,402.6L239.3,405.7L241.6,407.9L245.0,409.2L249.6,409.5L253.7,410.1L257.4,410.8L260.7,411.7L263.5,412.8L265.9,414.7L267.8,417.4L269.3,420.9L270.4,425.3L271.9,429.0L273.8,432.0L276.2,434.3L279.0,435.9L281.1,437.1L282.5,437.9L283.2,438.4L304.1,414.8L303.5,415.5L302.7,416.6L301.7,418.0L300.4,419.8L298.8,421.8L296.9,424.0L294.8,426.6L292.7,429.0L290.6,431.2L288.5,433.4L286.4,435.4L284.8,436.9L283.7,437.9L283.2,438.4L305.1,413.9L306.7,412.8L309.1,411.2L312.3,409.0L315.1,406.6L317.5,404.1L319.6,401.4L321.4,398.5L323.0,395.7L324.4,393.2L325.6,390.8L326.7,388.7L327.8,386.6L329.1,384.6L330.4,382.7L331.8,380.9L333.5,379.0L335.7,377.0L338.1,374.9L340.9,372.7L343.6,370.4L346.0,368.1L348.3,365.6L350.4,363.1L352.8,360.9L355.4,359.1L358.4,357.7L361.5,356.6L364.6,355.4L367.6,354.1L370.5,352.8L373.3,351.3L375.7,349.4L377.6,347.0L379.1,344.2L380.2,341.0L381.4,337.8L382.8,334.7L384.4,331.7L386.2,328.8L388.0,326.1L389.9,323.6L392.0,321.2L394.1,319.0L395.7,316.6L397.0,313.9L397.8,310.9L398.1,307.6L398.5,304.8L398.8,302.4L399.2,300.5L399.5,299.1L399.8,298.0L400.0,297.3L400.1,296.9L400.1,296.1L400.3,294.5L400.6,292.0L400.9,288.7L401.0,285.4L400.8,281.9L400.4,278.4L399.7,274.8L399.2,272.1L398.8,270.2L398.6,269.3Z","x":283.2,"y":312.9}}};
const M6REG = {1: {n: 'Norte', t: 62.8, u: 74.9, r: 13.3}, 2: {n: 'Nordeste', t: 73.7, u: 85.3, r: 29.9}, 3: {n: 'Sudeste', t: 92.1, u: 96.2, r: 21.4},
  4: {n: 'Sul', t: 88.3, u: 97.5, r: 17.3}, 5: {n: 'Centro-Oeste', t: 89.7, u: 97.0, r: 9.4}};
const M6REF = {n: 'Brasil (média nacional)', t: 84.1, u: 92.3, r: 22.9};
const M6_ORDER = [1, 2, 5, 3, 4];                               // Norte, Nordeste, Centro-Oeste, Sudeste, Sul
const M6COL = ['#d7f1fb', '#8fdcf6', '#3fc3ee', '#1596d0', '#0b5fa5'], M6BINS = [65, 75, 85, 90];
const m6bin = v => M6BINS.filter(b => v >= b).length;
const m6binTxt = i => i === 0 ? `menos de ${M6BINS[0]}%` : i === 4 ? `${M6BINS[3]}% ou mais` : `${M6BINS[i - 1]}% a menos de ${M6BINS[i]}%`;
const m6n = v => f(v, 1);

const M6K = ['m6q1', 'm6q2', 'm6crit', 'm6res'];                // campos de resposta do aluno (salvos em P.inv)
const M6Q = {m6q1: 'Qual região apresenta o maior percentual de atendimento? E qual apresenta o menor?',
  m6q2: 'Qual é a diferença, em pontos percentuais, entre esses dois valores?',
  m6crit: 'Se uma região apresenta um percentual menor de atendimento, isso significa que todos os seus habitantes têm a mesma dificuldade de acesso à água? O que mais precisaríamos investigar para compreender essa realidade?',
  m6res: 'Além de compreender as diferenças no acesso à água, precisamos pensar em como planejar seu armazenamento. De que maneira o estudo da área e do volume dos reservatórios pode contribuir para essa discussão?'};
const M6STEPS = ['Observar o mapa', 'Comparar os dados', 'Refletir criticamente'];
P.inv = P.inv || {}; P.invm = Object.assign({step: 0}, P.invm || {});
if (!(P.invm.step >= 0 && P.invm.step <= 2)) P.invm.step = 0;                  // versão anterior tinha 6 etapas
if (P.done[6] && P.done[6].v !== 2) delete P.done[6];                           // conclusão antiga não vale para a nova missão
let m6sel = null;
const m6a = k => (P.inv[k] || '').trim();
const m6ta = (k, rows) => `<textarea id="i_${k}" data-k="${k}" rows="${rows}">${esc(P.inv[k] || '')}</textarea>`;

/* ----- Etapa 1: mapa ----- */
function m6MapHtml() {
  const paths = M6_ORDER.map(id => { const r = M6REG[id];
    return `<path d="${M6_MAP.r[id].d}" data-id="${id}" tabindex="0" role="button" aria-pressed="false" fill="${M6COL[m6bin(r.t)]}" aria-label="${r.n}: ${m6n(r.t)}% da população atendida por rede de abastecimento de água"><title>${r.n}: ${m6n(r.t)}%</title></path>`; }).join('');
  const labels = M6_ORDER.map(id => { const r = M6REG[id], p = M6_MAP.r[id];
    const ln = r.n === 'Centro-Oeste' ? ['Centro-', 'Oeste'] : [r.n], ts = ln.concat(m6n(r.t) + '%').map((t, i) => `<tspan x="${p.x}" dy="${i ? '1.15em' : ln.length > 1 ? '-.55em' : '0'}">${t}</tspan>`).join('');   // nomes longos quebram em 2 linhas (cabem na região em telas pequenas)
    return `<text x="${p.x}" y="${p.y}" class="mlb" text-anchor="middle" aria-hidden="true">${ts}</text>`; }).join('');
  return `<svg viewBox="0 0 ${M6_MAP.w} ${M6_MAP.h}" class="imap" role="group" aria-label="Mapa do Brasil dividido nas cinco regiões. A cor indica o percentual da população atendida por rede de abastecimento de água. Use Tab e Enter para escolher uma região.">${paths}<path id="m6ov" class="m6ov" d="" fill="none" aria-hidden="true"/>${labels}</svg><p id="m6mapstatus" class="map-status" role="status">Carregando os limites geográficos oficiais do IBGE…</p>`;
}
let m6OfficialMapAttempted = false;
const M6_GEO_URL = 'https://servicodados.ibge.gov.br/api/v4/malhas/paises/BR?formato=application%2Fvnd.geo%2Bjson&intrarregiao=regiao';
function m6Coords(geom, out=[]) {
  const walk = v => { if (!Array.isArray(v)) return; if (v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number') out.push(v); else v.forEach(walk); };
  if (geom && geom.coordinates) walk(geom.coordinates);
  return out;
}
function m6GeoId(feature) {
  const p = feature.properties || {};
  const raw = String(feature.id ?? p.id ?? p.codarea ?? p.CD_REGIAO ?? p.codigo ?? '');
  if (/^[1-5]$/.test(raw)) return raw;
  const name = String(p.nome ?? p.NM_REGIAO ?? p.name ?? p.regiao ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (name.includes('norte')) return '1';
  if (name.includes('nordeste')) return '2';
  if (name.includes('sudeste')) return '3';
  if (name.includes('sul')) return '4';
  if (name.includes('centro')) return '5';
  return '';
}
function m6ProjectGeoJSON(features) {
  const all = features.flatMap(f => m6Coords(f.geometry));
  if (!all.length) throw new Error('A resposta cartográfica não contém coordenadas.');
  const minLon=Math.min(...all.map(c=>c[0])), maxLon=Math.max(...all.map(c=>c[0]));
  const minLat=Math.min(...all.map(c=>c[1])), maxLat=Math.max(...all.map(c=>c[1]));
  const W=M6_MAP.w,H=M6_MAP.h,pad=22, scale=Math.min((W-2*pad)/(maxLon-minLon),(H-2*pad)/(maxLat-minLat));
  const ox=(W-(maxLon-minLon)*scale)/2, oy=(H-(maxLat-minLat)*scale)/2;
  const xy=c=>[ox+(c[0]-minLon)*scale, H-(oy+(c[1]-minLat)*scale)];
  const ringPath=ring=>ring.map((c,i)=>{const q=xy(c);return `${i?'L':'M'}${q[0].toFixed(2)},${q[1].toFixed(2)}`}).join(' ')+'Z';
  const geomPath=g=>{
    if (!g) return '';
    if (g.type==='Polygon') return g.coordinates.map(ringPath).join(' ');
    if (g.type==='MultiPolygon') return g.coordinates.map(poly=>poly.map(ringPath).join(' ')).join(' ');
    return '';
  };
  const mapped = new Map();
  features.forEach(feature=>{const id=m6GeoId(feature); if(id && M6REG[id]) { const d=geomPath(feature.geometry); if(d) mapped.set(id,d); }});
  if (mapped.size !== 5) throw new Error('Não foi possível identificar as cinco regiões na malha do IBGE.');
  // Atualiza a geometria usada tanto no desenho quanto no destaque de seleção.
  M6_ORDER.forEach(id=>{
    const feature=features.find(f=>m6GeoId(f)===String(id));
    M6_MAP.r[id].d=mapped.get(String(id));
    const pts=m6Coords(feature.geometry).map(xy);
    M6_MAP.r[id].x=(Math.min(...pts.map(p=>p[0]))+Math.max(...pts.map(p=>p[0])))/2;
    M6_MAP.r[id].y=(Math.min(...pts.map(p=>p[1]))+Math.max(...pts.map(p=>p[1])))/2;
  });
  return m6MapSvgFromCurrent();
}
function m6MapSvgFromCurrent() {
  const paths=M6_ORDER.map(id=>{const r=M6REG[id];return `<path d="${M6_MAP.r[id].d}" data-id="${id}" tabindex="0" role="button" aria-pressed="${String(m6sel===String(id))}" fill="${M6COL[m6bin(r.t)]}" aria-label="${r.n}: ${m6n(r.t)}% da população atendida por rede de abastecimento de água"><title>${r.n}: ${m6n(r.t)}%</title></path>`}).join('');
  const labels=M6_ORDER.map(id=>{const r=M6REG[id],p=M6_MAP.r[id];const txt=r.n==='Centro-Oeste'?['Centro-Oeste',m6n(r.t)+'%']:[r.n,m6n(r.t)+'%'];return `<text x="${p.x}" y="${p.y}" class="mlb" text-anchor="middle" aria-hidden="true">${txt.map((t,i)=>`<tspan x="${p.x}" dy="${i?'1.15em':'0'}">${t}</tspan>`).join('')}</text>`}).join('');
  return `<svg viewBox="0 0 ${M6_MAP.w} ${M6_MAP.h}" class="imap" role="group" aria-label="Mapa oficial do Brasil dividido nas cinco Grandes Regiões do IBGE. Use Tab e Enter para escolher uma região.">${paths}<path id="m6ov" class="m6ov" d="" fill="none" aria-hidden="true"/>${labels}</svg>`;
}
async function m6LoadOfficialMap() {
  if (m6OfficialMapAttempted) return; m6OfficialMapAttempted=true;
  const host=$('#imap'); if(!host) return;
  const status=$('#m6mapstatus');
  try {
    const response=await fetch(M6_GEO_URL,{mode:'cors',cache:'force-cache'});
    if(!response.ok) throw new Error('O serviço cartográfico não respondeu.');
    const data=await response.json();
    const features=data.features || data.geometries || [];
    if(!Array.isArray(features)) throw new Error('Formato geográfico não reconhecido.');
    const svg=m6ProjectGeoJSON(features);
    if(!$('#imap')) return;
    $('#imap').innerHTML=svg;
    const st=$('#m6mapstatus'); if(st) st.remove();
    m6Sync();
  } catch(err) {
    const st=$('#m6mapstatus');
    if(st) st.textContent='Não foi possível carregar a malha oficial agora. O mapa de contingência é esquemático; confira os dados na tabela abaixo.';
    if(st) st.setAttribute('class','map-status map-status-warn');
  }
}
const m6Legend = () => `<b>% da população atendida por rede de água</b><ul class="leg">${M6COL.map((c, i) => `<li><i style="background:${c}"></i>${m6binTxt(i)}</li>`).join('')}</ul>`;
const m6SelHtml = () => { const r = M6REG[m6sel];
  return r ? `<div class="icard"><h4>${r.n}</h4><div class="pct-n">${m6n(r.t)}%</div><div class="pct-b" role="img" aria-label="${m6n(r.t)} por cento"><i style="width:${r.t}%"></i></div><p class="muted">da população atendida por rede de abastecimento de água (ano de referência 2024)</p></div>`
    : '<div class="attsum">Escolha uma região no mapa ou na tabela para ver o percentual.</div>'; };
function m6Sync() {                                             // atualiza destaque, botões e cartão sem recriar o mapa (preserva o foco do teclado)
  const ov = $('#m6ov'); if (ov) ov.setAttribute('d', m6sel ? M6_MAP.r[m6sel].d : '');
  $$('#istep path[data-id]').forEach(p => p.setAttribute('aria-pressed', String(p.dataset.id === m6sel)));
  $$('#istep .m6r').forEach(b => { const on = b.dataset.id === m6sel; b.setAttribute('aria-pressed', String(on)); b.closest('tr').classList.toggle('on', on); });
  const c = $('#m6sel'); if (c) c.innerHTML = m6SelHtml();
}
function m6Select(id) { m6sel = m6sel === String(id) ? null : String(id); m6Sync(); }

/* ----- Etapa 2: barras e perguntas ----- */
const m6Row = (r, ref) => `<li class="${ref ? 'ref' : ''}"><span>${r.n}</span><span class="m6bar" aria-hidden="true"><i style="width:${r.t}%"></i></span><b>${m6n(r.t)}%</b></li>`;
function m6Check() {                                            // confere com os dados; não avalia nem bloqueia o texto do aluno
  const L = M6_ORDER.map(id => M6REG[id]), mx = Math.max(...L.map(r => r.t)), mn = Math.min(...L.map(r => r.t)), d = Math.round((mx - mn) * 10) / 10;
  const nm = v => L.filter(r => r.t === v).map(r => r.n).join(' e ');
  const o = $('#m6chkout'); o.hidden = false;
  o.innerHTML = `<b>Conferindo com os dados do mapa:</b><ul class="sym"><li>Maior percentual: <b>${nm(mx)}</b>, com ${m6n(mx)}%.</li><li>Menor percentual: <b>${nm(mn)}</b>, com ${m6n(mn)}%.</li><li>Diferença: ${m6n(mx)} − ${m6n(mn)} = <b>${m6n(d)} pontos percentuais</b>.</li></ul>
    <p class="muted">Atenção: ${m6n(d)} p.p. é a distância entre duas porcentagens. Não é o mesmo que dizer que uma região tem “${m6n(d)}% a menos” que a outra: isso exigiria outro cálculo (variação percentual). Se sua resposta ficou diferente, releia os dados e registre em seu texto o que você observou. Você pode editar o que escreveu.</p>`;
}

/* ----- Etapas (conteúdo) ----- */
const m6Steps = [
  () => `<p class="m6lead">Observe as cores e os números. O que chama sua atenção?</p>
    <div class="m6s1"><div class="idark"><div id="imap">${m6MapHtml()}</div><div id="ileg" class="ileg">${m6Legend()}</div></div>
    <div><div id="m6sel" aria-live="polite"></div>
    <div class="tw"><table class="m6tab"><caption>Percentual da população atendida por rede de abastecimento de água, 2024</caption><tr><th scope="col">Região</th><th scope="col">% atendida</th></tr>${M6_ORDER.map(id => `<tr><td><button type="button" class="m6r" data-id="${id}" aria-pressed="false">${M6REG[id].n}</button></td><td>${m6n(M6REG[id].t)}%</td></tr>`).join('')}<tr class="ref"><td>${M6REF.n}</td><td>${m6n(M6REF.t)}%</td></tr></table></div></div></div>`,
  () => `<p class="m6lead">Os mesmos dados do mapa, agora em barras. Observe os comprimentos e responda com suas palavras.</p>
    <ul class="m6bars" aria-label="Percentual da população atendida por rede de água, por região">${M6_ORDER.map(id => m6Row(M6REG[id])).join('')}${m6Row(M6REF, true)}</ul>
    <div class="rq"><label for="i_m6q1">1. ${M6Q.m6q1}</label>${m6ta('m6q1', 3)}</div>
    <div class="rq"><label for="i_m6q2">2. ${M6Q.m6q2}</label><span class="muted">Escreva a conta que você fez. Pontos percentuais (p.p.) são a diferença entre duas porcentagens: valor maior − valor menor.</span>${m6ta('m6q2', 3)}</div>
    <div class="row"><button type="button" class="btn sm ghost" id="m6chk">Conferir com os dados</button></div><div id="m6chkout" class="attsum" aria-live="polite" hidden></div>`,
  () => `<blockquote class="m6q">${M6Q.m6crit}</blockquote>
    <div class="rq"><label for="i_m6crit">Escreva sua interpretação</label><span class="muted">Não há uma única resposta certa. Você pode pensar nas diferenças entre municípios de uma mesma região, entre áreas urbanas e rurais e nas condições de abastecimento.</span>${m6ta('m6crit', 6)}</div>
    <details class="m6det"><summary>Ver também os dados urbano e rural (opcional)</summary><div class="tw"><table class="m6tab"><caption>Atendimento por rede de abastecimento de água, 2024 (%)</caption><tr><th scope="col">Região</th><th scope="col">Total</th><th scope="col">Urbana</th><th scope="col">Rural</th></tr>${M6_ORDER.map(id => `<tr><td>${M6REG[id].n}</td><td>${m6n(M6REG[id].t)}</td><td>${m6n(M6REG[id].u)}</td><td>${m6n(M6REG[id].r)}</td></tr>`).join('')}<tr class="ref"><td>${M6REF.n}</td><td>${m6n(M6REF.t)}</td><td>${m6n(M6REF.u)}</td><td>${m6n(M6REF.r)}</td></tr></table></div></details>
    <h4 class="m6h4">Do mapa aos reservatórios</h4>
    <blockquote class="m6q">${M6Q.m6res}</blockquote>
    <p class="rnote">Pense no armazenamento como uma parte do planejamento. Construir reservatórios, por si só, não resolve desigualdades de abastecimento: elas também envolvem redes de distribuição, investimentos, gestão, continuidade e qualidade da água.</p>
    <div class="rq"><label for="i_m6res">Escreva sua reflexão (opcional)</label>${m6ta('m6res', 4)}</div>
    <div class="row"><button type="button" class="btn" id="m6fin">Registrar minha investigação</button><button type="button" class="btn sm ghost" id="m6print">Imprimir / salvar PDF das respostas</button><button type="button" class="btn sm ghost" id="m6lab">Rever o Laboratório</button></div>
    <div id="ifb" class="fb" aria-live="polite"></div>`];

function drawStep(focus) {
  const s = P.invm.step;
  $('#iseg').innerHTML = M6STEPS.map((t, i) => `<button type="button" class="${i === s ? 'on' : ''}" data-s="${i}" ${i === s ? 'aria-current="step"' : ''}>Etapa ${i + 1}: ${t}</button>`).join('');
  $('#istep').innerHTML = `<h3 id="m6h" tabindex="-1">Etapa ${s + 1}: ${M6STEPS[s]}</h3>` + m6Steps[s]();
  $('#iback').disabled = !s; $('#inext').disabled = s === M6STEPS.length - 1;
  if (s === 0) { m6Sync(); m6LoadOfficialMap(); }
  if (s === 1) $('#m6chk').onclick = m6Check;
  if (s === 2) {
    $('#m6fin').onclick = m6Finish; $('#m6print').onclick = m6Print; $('#m6lab').onclick = openLab;
    if (P.done[6] && P.done[6].v === 2) m6DoneMessage();
  }
  if (focus) $('#m6h').focus();
}
function m6DoneMessage() {
  const fb=$('#ifb'); if(!fb) return;
  fb.innerHTML='<div class="m6-success"><h3>✓ Missão 6 concluída!</h3><p>Sua investigação foi registrada. As respostas ficam salvas neste navegador; você pode voltar para reler ou editar suas ideias. A conclusão também aparece no progresso geral e na lista de missões.</p></div>';
  const btn=$('#m6fin'); if(btn){btn.textContent='Investigação concluída ✓';btn.classList.add('m6-finished');}
}
function m6Finish() {
  // Lê os campos diretamente antes de validar, evitando depender somente do evento input.
  M6K.forEach(k=>{const el=$(`#i_${k}`);if(el) P.inv[k]=el.value;});
  P.inv=P.inv||{};
  const fb=$('#ifb'), miss=[];
  if (!m6a('m6q1')) miss.push('responder à pergunta 1: identificar a região com maior e menor percentual');
  if (!m6a('m6q2')) miss.push('responder à pergunta 2: registrar a diferença em pontos percentuais');
  if (!m6a('m6crit')) miss.push('escrever sua interpretação na pergunta crítica');
  if (miss.length) {
    fb.innerHTML=`<div class="bad"><b>Antes de finalizar, complete estes campos:</b><ul>${miss.map(t=>`<li>${t}</li>`).join('')}</ul></div>`;
    fb.scrollIntoView({behavior:'smooth',block:'center'}); save(); return;
  }
  P.done[6]={t:Date.now(),eff:null,v:2};
  P.invm.step=2; save(); renderProg(); renderMissions(); m6DoneMessage();
  fb.scrollIntoView({behavior:'smooth',block:'center'});
}
function m6Print() {
  const br = t => esc(t || '—').replace(/\n/g, '<br>');
  $('#printarea').innerHTML = `<h1>Geometria da Água — Missão 6</h1><h2>A água chega a todos?</h2>
    <p>Dados: SINISA 2025 (Ministério das Cidades), ano de referência 2024: percentual da população total atendida por rede de abastecimento de água.</p>
    <table><tr><th>Região</th><th>% atendida</th></tr>${M6_ORDER.map(id => `<tr><td>${M6REG[id].n}</td><td>${m6n(M6REG[id].t)}%</td></tr>`).join('')}<tr><td>${M6REF.n}</td><td>${m6n(M6REF.t)}%</td></tr></table>
    <h3>Etapa 2: Comparar os dados</h3><p><b>1. ${M6Q.m6q1}</b></p><p>${br(P.inv.m6q1)}</p><p><b>2. ${M6Q.m6q2}</b></p><p>${br(P.inv.m6q2)}</p>
    <h3>Etapa 3: Refletir criticamente</h3><p><b>${M6Q.m6crit}</b></p><p>${br(P.inv.m6crit)}</p><p><b>${M6Q.m6res}</b></p><p>${br(P.inv.m6res)}</p>
    <p><small>Gerado em ${new Date().toLocaleString('pt-BR')}.</small></p>`;
  window.print();
}
function renderInv() {
  if (!$('#inv').dataset.ok) { $('#inv').dataset.ok = 1;
    $('#inv').innerHTML = `<div class="mhead"><div><h2>Missão 6 — A água chega a todos?</h2><p class="m6intro">A água é distribuída da mesma maneira para todos os brasileiros? Nesta investigação, você observará dados sobre o abastecimento de água nas cinco regiões do Brasil, comparará os resultados e refletirá sobre as desigualdades que os números podem revelar.</p></div><button type="button" class="btn sm ghost" id="m6back">← Voltar às missões</button></div>
    <div id="iseg" class="iseg" role="group" aria-label="Etapas da missão"></div>
    <div id="istep" class="panel stepbody"></div>
    <div class="row"><button type="button" class="btn sm ghost" id="iback">← Voltar</button><button type="button" class="btn sm" id="inext">Avançar →</button><button type="button" class="btn sm ghost" id="irst">Reiniciar investigação</button></div>
    <p class="muted m6src"><b>Fonte dos dados:</b> <a href="${M6_SRC}" target="_blank" rel="noopener">SINISA 2025, Relatório dos Serviços de Abastecimento de Água</a> (Ministério das Cidades), ano de referência 2024, indicador “atendimento da população total com rede de abastecimento de água”, informado pelos prestadores de serviço.</p>`;
    $('#m6back').onclick = () => show('missions');
    $('#istep').onclick = e => { const t = e.target.closest('[data-id]'); if (t) m6Select(t.dataset.id); };
    $('#istep').onkeydown = e => { const t = e.target.closest('path[data-id]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); m6Select(t.dataset.id); } };
    $('#iseg').onclick = e => { const b = e.target.closest('[data-s]'); if (b) { P.invm.step = +b.dataset.s; save(); drawStep(true); } };
    $('#iback').onclick = () => { P.invm.step--; save(); drawStep(true); }; $('#inext').onclick = () => { P.invm.step++; save(); drawStep(true); };
    $('#irst').onclick = () => { if (!confirm('Reiniciar a investigação? Suas respostas serão apagadas.')) return; M6K.forEach(k => delete P.inv[k]); P.invm.step = 0; m6sel = null; delete P.done[6]; save(); renderProg(); renderMissions(); drawStep(); };
    $('#inv').oninput = e => { const k = e.target.dataset.k; if (k) { P.inv[k] = e.target.value; save(); } };
    drawStep();
  }
  window.scrollTo(0, 0);
}
const openInv = () => { show('inv'); renderInv(); };

renderProg(); show('home');