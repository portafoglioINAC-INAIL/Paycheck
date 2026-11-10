const { useState, useMemo, useRef, useEffect } = React;
const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const CATEGORIE = ["Necessit\xE0/Imprevisti", "Alimentari", "Svago", "Shopping", "Cura personale", "Benzina", "Spese fisse", "Take away", "Spese mediche", "Viaggi", "Hobby", "Varie"];
const CAT_COL = { "Necessit\xE0/Imprevisti": "#8AA0C8", "Alimentari": "#7FBEA6", "Svago": "#E6A97C", "Shopping": "#D493B8", "Cura personale": "#7FBEDC", "Benzina": "#6E8FC7", "Spese fisse": "#5C82BE", "Take away": "#E8C06B", "Spese mediche": "#E28C8C", "Viaggi": "#9E8FD0", "Hobby": "#96C77E", "Varie": "#A9B6C6" };
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parse = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const nf0 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n) => {
  const r = Math.round((Number(n) || 0) * 100) / 100;
  return Number.isInteger(r) ? nf0.format(r) : nf2.format(r);
};
const fmt0 = (n) => nf0.format(Math.round(Number(n) || 0));
const sum = (a, f) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);
const round2 = (n) => Math.round(n * 100) / 100;
const dShort = (s) => {
  if (!s) return "\u2014";
  const d = parse(s);
  return d.getDate() + " " + MESI_BREVI[d.getMonth()];
};
const num = (x) => {
  if (typeof x === "number") return x;
  const v = parseFloat(String(x).replace(",", "."));
  return isNaN(v) ? 0 : v;
};
const uuid = () => window.crypto && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  return (c === "x" ? r : r & 3 | 8).toString(16);
});
const clone = (o) => JSON.parse(JSON.stringify(o));
const errMsg = (e) => e && (e.message || e.details || e.hint) || String(e);
function shiftMonth(s) {
  if (!s) return null;
  const d = parse(s);
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return iso(t);
}
function defaultRange(y, mi, c) {
  return { inizio: iso(new Date(y, mi, c)), fine: iso(new Date(y, mi + 1, c - 1)) };
}
const cfg = window.PAYCHECK_CONFIG || {};
const CONFIG_OK = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_URL).startsWith("INCOLLA");
const sb = CONFIG_OK ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const q = async (p) => {
  const r = await p;
  if (r.error) throw r.error;
  return r.data;
};
async function fetchPaged(make) {
  let out = [], from = 0;
  for (; ; ) {
    const r = await make().range(from, from + 999);
    if (r.error) throw r.error;
    out = out.concat(r.data || []);
    if (!r.data || r.data.length < 1e3) break;
    from += 1e3;
  }
  return out;
}
async function loadAll(userId) {
  const cy = (/* @__PURE__ */ new Date()).getFullYear();
  const [lo, hi, imp] = await Promise.all([
    sb.from("movimenti").select("anno").order("anno", { ascending: true }).limit(1),
    sb.from("movimenti").select("anno").order("anno", { ascending: false }).limit(1),
    sb.from("impostazioni").select("*").eq("user_id", userId).maybeSingle()
  ]);
  if (lo.error) throw lo.error;
  const minY = Math.min(cy, lo.data && lo.data[0] ? lo.data[0].anno : cy);
  const maxY = Math.max(cy + 1, hi.data && hi.data[0] ? hi.data[0].anno : cy);
  const years = [];
  for (let y = minY; y <= maxY; y++) years.push(y);
  const ciclo2 = imp.data && imp.data.ciclo_inizio_giorno || 24;
  let risparmiOk = true;
  const R = { movimenti: {}, promemoria: {}, mesi: {}, obiettivi: {}, risparmi: {} };
  await Promise.all(years.map(async (y) => {
    const [mv, pr, me, ob, rs] = await Promise.all([
      fetchPaged(() => sb.from("movimenti").select("*").eq("anno", y).order("id", { ascending: true })),
      fetchPaged(() => sb.from("promemoria").select("*").eq("anno", y).order("id", { ascending: true })),
      sb.from("mesi").select("*").eq("anno", y),
      sb.from("obiettivi").select("*, accantonamenti(*)").eq("anno", y),
      sb.from("risparmi").select("*").eq("anno", y)
    ]);
    if (me.error) throw me.error;
    if (ob.error) throw ob.error;
    R.movimenti[y] = mv;
    R.promemoria[y] = pr;
    R.mesi[y] = me.data || [];
    R.obiettivi[y] = ob.data || [];
    if (rs.error) {
      risparmiOk = false;
      R.risparmi[y] = [];
    } else R.risparmi[y] = rs.data || [];
  }));
  return { db: buildDb(R, ciclo2, years), ciclo: ciclo2, risparmiOk };
}
function buildDb(R, ciclo2, years) {
  const anni = {}, obiettivi = {};
  years.forEach((y) => {
    const mesi = {};
    MESI.forEach((me, mi) => {
      const row = (R.mesi[y] || []).find((x) => x.mese === me);
      const def = defaultRange(y, mi, ciclo2);
      mesi[me] = { rangeInizio: row && row.range_inizio || def.inizio, rangeFine: row && row.range_fine || def.fine, entrate: [], spese: [], promemoria: [], risparmi: [] };
    });
    (R.movimenti[y] || []).forEach((m) => {
      const t = mesi[m.mese];
      if (!t) return;
      if (m.tipo_mov === "entrata") t.entrate.push({ id: m.id, descrizione: m.descrizione, valore: Number(m.valore), tipo: m.tipo_entrata, contanti: !!m.contanti });
      else t.spese.push({ id: m.id, data: m.data, descrizione: m.descrizione, valore: Number(m.valore), categoria: m.categoria, contanti: !!m.contanti });
    });
    (R.promemoria[y] || []).forEach((p) => {
      const t = mesi[p.mese];
      if (!t) return;
      t.promemoria.push({ id: p.id, pagato: !!p.pagato, scadenza: p.scadenza, descrizione: p.descrizione, valore: Number(p.valore), movimentoId: p.movimento_id || null });
    });
    (R.risparmi[y] || []).forEach((r) => {
      const t = mesi[r.mese];
      if (!t) return;
      t.risparmi.push({ id: r.id, data: r.data, goalId: r.obiettivo_id || null, descrizione: r.descrizione || "", valore: Number(r.valore) });
    });
    anni[y] = { mesi };
    obiettivi[y] = (R.obiettivi[y] || []).map((o) => ({
      id: o.id,
      nome: o.nome,
      target: Number(o.target),
      obiettivoMensile: Number(o.obiettivo_mensile) || 0,
      accantonamenti: Object.fromEntries((o.accantonamenti || []).map((a) => [a.mese, Number(a.valore)]))
    }));
  });
  return { anni, obiettivi };
}
function getCicli(db) {
  const out = [];
  Object.keys(db.anni).map(Number).sort((a, b) => a - b).forEach((a) => MESI.forEach((me) => {
    const m = db.anni[a].mesi[me];
    if (m) out.push({ anno: a, mese: me, m, key: a + "|" + me });
  }));
  return out;
}
function findCycle(cicli, d) {
  return cicli.find((c) => c.m.rangeInizio && c.m.rangeFine && d >= c.m.rangeInizio && d <= c.m.rangeFine);
}
function ciclo(db, c) {
  const obs = db.obiettivi[c.anno] || [];
  const entrate = sum(c.m.entrate, (e) => e.valore);
  const speso = sum(c.m.spese, (s) => s.valore);
  const inArrivo = sum(c.m.promemoria.filter((p) => !p.pagato), (p) => p.valore);
  const restano = entrate - speso - inArrivo;
  const messo = sum(obs, (g) => g.accantonamenti[c.mese]) + sum((c.m.risparmi || []).filter((r) => !r.goalId), (r) => r.valore);
  return { entrate, speso, inArrivo, restano, messo, obs };
}
const noCarryKey = (c) => "pc_nocarry_" + c.anno + "_" + c.mese;
const getFlag = (k) => {
  try {
    return localStorage.getItem(k) === "1";
  } catch (e) {
    return false;
  }
};
const setFlag = (k) => {
  try {
    localStorage.setItem(k, "1");
  } catch (e) {
  }
};
const CSS = `
/* Layout: registra a sinistra (azione principale), numero chiaro + contesto a destra; sfondo sfumato azzurro/bianco */
:root{--ink:#1B2333;--muted:#66708A;--line:#DCE6F3;--accent:#2F5FD6;--accent-soft:#E6EEFC;--pos:#23906F;--neg:#C7433C;--warn:#C98A1B;--card:#FFFFFF;
--bg:linear-gradient(180deg,#DCEAFB 0%,#EEF4FC 38%,#FFFFFF 100%);--font:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif}
*{box-sizing:border-box}
html,body{min-height:100%}
body{margin:0;font-family:var(--font);color:var(--ink);background:#EEF4FC;background-image:var(--bg);background-attachment:fixed;font-size:14px;line-height:1.45}
.wrap{max-width:min(1500px,98vw);margin:0 auto;padding:18px max(16px,env(safe-area-inset-left,0px)) 80px max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
h1,h2{margin:0}
.top{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px}
.brand{display:flex;align-items:center;gap:10px;margin-right:auto;min-width:0}
.logo{width:36px;height:36px;border-radius:11px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:800;font-size:18px}
.brand h1{font-size:19px;font-weight:800;letter-spacing:-.01em}
.brand small{color:var(--muted);font-size:12px}
.cycles{display:flex;gap:4px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:rgba(255,255,255,.7);color:var(--muted);border-radius:999px;padding:5px 12px;font:600 13px var(--font);cursor:pointer}
.chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.tabs{display:flex;background:rgba(255,255,255,.7);border:1px solid var(--line);border-radius:12px;padding:3px}
.tabs button{border:0;background:none;padding:6px 14px;border-radius:9px;font:700 13px var(--font);color:var(--muted);cursor:pointer}
.tabs button.on{background:#fff;color:var(--accent);box-shadow:0 1px 3px rgba(40,70,140,.15)}
.grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:16px;align-items:start}
.grid.year{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}
.col{display:flex;flex-direction:column;gap:16px;min-width:0}
.two{align-items:start;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 2px 14px rgba(47,95,214,.07);min-width:0}
.ch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.ch h2{font-size:15px;font-weight:800}
.mut{color:var(--muted)}
button{font-family:var(--font)}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* registra */
.reg{display:flex;flex-direction:column;gap:12px;border-color:#BFD2F2;box-shadow:0 6px 28px rgba(47,95,214,.14)}
.seg{display:inline-flex;align-self:flex-start;background:#EEF3FB;border-radius:11px;padding:3px}
.seg button{border:0;background:none;padding:7px 16px;border-radius:9px;font:700 13px var(--font);color:var(--muted);cursor:pointer}
.seg button.on{background:#fff;color:var(--accent);box-shadow:0 1px 3px rgba(40,70,140,.18)}
.seg button.on.pos{color:var(--pos)}
.seg button.on.sav{color:var(--accent)}.v.sav{color:var(--accent)}.eq .sv2{border:0;padding:3px 0;font-size:13px}.eq .sv2 dd{color:var(--accent)}.seg.sm button{padding:5px 11px;font-size:12px}
.amtrow{display:flex;align-items:baseline;gap:6px;border-bottom:2px solid var(--line);padding-bottom:4px}
.amtrow:focus-within{border-color:var(--accent)}
#amt{border:0;background:none;font:800 44px var(--font);color:var(--ink);width:100%;min-width:0;padding:0;outline:none;font-variant-numeric:tabular-nums}
#amt::placeholder{color:#BCC7DB}
.eur{font:700 26px var(--font);color:var(--muted)}
.txt{width:100%;border:1px solid var(--line);border-radius:11px;padding:10px 12px;font:500 15px var(--font);color:var(--ink);background:#fff;min-width:0}
.txt:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px var(--accent-soft)}
.cats{display:flex;flex-wrap:wrap;gap:6px}
.cat{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 11px;font:600 12.5px var(--font);color:var(--ink);cursor:pointer}
.cat i{width:9px;height:9px;border-radius:50%;background:var(--c)}
.cat.on{background:color-mix(in srgb,var(--c) 22%,#fff);border-color:var(--c)}
.cat em{font-style:normal;font-size:10.5px;color:var(--muted);font-weight:600}
.opts{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dt{border:1px solid var(--line);border-radius:9px;padding:5px 8px;font:500 13px var(--font)}
.cash{display:inline-flex;gap:6px;align-items:center;color:var(--muted);font-weight:600;font-size:13px;margin-left:auto;cursor:pointer}
.go{border:0;background:var(--accent);color:#fff;border-radius:13px;padding:13px;font:800 15px var(--font);cursor:pointer;display:flex;gap:10px;justify-content:center;align-items:center}
.go:disabled{background:#B9C8E6;cursor:default}
.go kbd{font:600 11px var(--font);background:rgba(255,255,255,.22);border-radius:6px;padding:2px 7px}
.hint{margin:0;color:var(--muted);font-size:12px}
/* liste */
.list,.goals,.cl,.yl{list-style:none;margin:0;padding:0}
.list li{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #EDF2FA}
.list li:first-child{border-top:0}
.dot{width:10px;height:10px;border-radius:50%;flex:none}
.t{min-width:0;flex:1}
.t b{display:block;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t small{color:var(--muted);font-size:12px}
.v{font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.v.pos,.pos{color:var(--pos)}.v.neg,.neg .v{color:var(--neg)}
.x{border:0;background:none;color:#A5B0C6;font-size:20px;line-height:1;cursor:pointer;padding:0 4px;border-radius:6px}
.x:hover{color:var(--neg);background:#FBECEB}
.empty{color:var(--muted);padding:8px 0}
.search{border:1px solid var(--line);border-radius:9px;padding:6px 10px;font:500 13px var(--font);width:140px;min-width:0}
.link{border:0;background:none;color:var(--accent);font:700 13px var(--font);cursor:pointer;padding:6px 0}
.mini{border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);border-radius:9px;padding:5px 11px;font:700 12.5px var(--font);cursor:pointer;white-space:nowrap}
.mini:hover{background:var(--accent);color:#fff}
.mini.ghost{background:#fff}
.addrow{display:grid;grid-template-columns:1fr 90px 140px auto;gap:8px;margin-bottom:8px}
.addrow .txt{padding:7px 10px;font-size:13px}
.gform,.edrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 0;list-style:none}
.gform .txt:first-child{grid-column:1/-1}
.gform label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted);font-weight:600}
.frow{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}
.list li.edrow{display:grid;grid-template-columns:1fr 100px 150px;gap:8px;padding:8px 0}
.edrow .txt{padding:7px 10px;font-size:13px}
.link.sm{font-size:12px;padding:0}
.mini.danger{color:var(--neg);border-color:#E9B8B5;background:#fff;margin-left:auto}
.mini.dangerb{background:var(--neg);color:#fff;border-color:var(--neg);margin-left:auto}
.list.paid{margin-top:4px}
@media (max-width:520px){.list li.edrow{grid-template-columns:1fr 1fr}}
/* hero */
.hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px;padding:24px;background:linear-gradient(135deg,#fff 0%,#F2F7FF 100%)}
.lab{font-weight:700;color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.07em}
.big{font:800 72px/1.02 var(--font);letter-spacing:-.03em;color:var(--pos);font-variant-numeric:tabular-nums;margin:4px 0}
.hero.neg .big{color:var(--neg)}
.fixed{display:flex;flex-direction:column;gap:2px;background:#FFF6E3;border:1px solid #F0DDB0;border-radius:12px;padding:9px 12px;margin:0 0 14px;max-width:46ch}.fixed b{font-weight:800}.fixed span{color:var(--muted);font-size:13px}.fixed.done{background:#E6F5EE;border-color:#BFE3D3}.perday{font-size:18px;color:var(--ink)}
.perday b{color:var(--pos);font-weight:800}
.msg{margin:10px 0 14px;color:var(--ink);font-size:14.5px;max-width:46ch}
.prog{height:8px;border-radius:99px;background:#E3ECF9;overflow:hidden}
.prog i{display:block;height:100%;background:var(--accent);border-radius:99px}
.plab{color:var(--muted);display:block;margin-top:6px}
.eq{margin:0;display:flex;flex-direction:column;justify-content:center;gap:2px;border-left:1px solid var(--line);padding-left:22px}
.eq div{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--line)}
.eq dt{color:var(--muted);font-weight:600}
.eq dd{margin:0;font-weight:800;font-variant-numeric:tabular-nums}
.eq .pos dd{color:var(--pos)}
.eq .tot{border:0;padding-top:12px;font-size:16px}
.eq .tot dt{color:var(--ink);font-weight:800}
.hero.neg .eq .tot dd{color:var(--neg)}.hero.ok .eq .tot dd{color:var(--pos)}
/* settimana / obiettivi */
.wk{font:800 32px var(--font);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.sub{margin:6px 0 0;color:var(--muted);font-size:13px}
.sub b{color:var(--ink)}
.goals li{padding:9px 0}
.gt{display:flex;justify-content:space-between;gap:10px;font-size:13.5px}
.gt span{color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.bar{height:9px;border-radius:99px;background:#E3ECF9;margin:6px 0;overflow:hidden}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#6E9BEA,var(--accent));border-radius:99px}
.gf{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:26px}
.gf small{color:var(--muted)}
.okp{color:var(--pos);font-weight:700;font-size:12.5px}
/* categorie */
.cl li{padding:8px 0}
.cn{display:flex;justify-content:space-between;font-weight:600}
.cn i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}
.bar2{position:relative;height:8px;border-radius:99px;background:#EDF2FA;margin:6px 0 3px}
.bar2 i{position:absolute;left:0;top:0;bottom:0;border-radius:99px}
.bar2 u{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink);opacity:.55;text-decoration:none}
.dl{color:var(--muted);font-size:12px}.dl.up{color:var(--neg)}.dl.dn{color:var(--pos)}
/* anno */
.yl li{display:grid;grid-template-columns:90px 1fr 90px;gap:12px;align-items:center;padding:7px 0}
.yb{display:flex;flex-direction:column;gap:3px}
.yb i{display:block;height:8px;border-radius:99px}
.yb .e{background:#8DB1F0}.yb .s{background:#2B4A8C}
.yl .v{text-align:right}
.foot{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:22px;color:var(--muted);font-size:12px}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:max(22px,env(safe-area-inset-bottom,0px));background:var(--ink);color:#fff;border-radius:14px;padding:11px 14px 11px 18px;display:flex;gap:14px;align-items:center;box-shadow:0 8px 30px rgba(20,30,60,.3);max-width:calc(100vw - 32px);z-index:20}
.toast button{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:8px;padding:5px 11px;font:700 13px var(--font);cursor:pointer}
@media (max-width:1000px){.grid,.grid.year{grid-template-columns:minmax(0,1fr)}.two{grid-template-columns:minmax(0,1fr)}.hero{grid-template-columns:minmax(0,1fr)}.eq{border-left:0;padding-left:0}}
@media (max-width:520px){.big{font-size:54px}.addrow{grid-template-columns:1fr 1fr}.yl li{grid-template-columns:70px 1fr 74px}}
@media (prefers-reduced-motion:no-preference){.bar i,.prog i,.bar2 i{transition:width .4s ease}}

.pc-center{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.login{text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;max-width:380px}
.logo.big{width:52px;height:52px;font-size:26px;border-radius:15px}
.yearsel,.monthsel{border:1px solid var(--line);background:rgba(255,255,255,.8);border-radius:999px;padding:5px 10px;font:600 13px var(--font);color:var(--ink)}
.who{font-size:12px;color:var(--muted);display:flex;gap:8px;align-items:center}
.note{background:#FFF6E3;border:1px solid #F0DDB0;border-radius:12px;padding:9px 12px;margin-bottom:12px;font-size:13px}
.toast.err{background:#8A2B26}
.rangeed{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}
.edmov{display:grid;grid-template-columns:1fr 100px;gap:8px;padding:8px 0;list-style:none}
.list li.edmov{display:grid;grid-template-columns:1fr 110px;gap:8px;padding:8px 0}
.list li.edmov .cash{margin-left:0}
.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:8px}
.trio div{background:#F4F8FE;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.trio small{color:var(--muted)}.trio b{font:800 20px var(--font)}
.cmpwrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:10px}
.cmp b{display:block;margin-bottom:4px}
.cmprow{display:grid;grid-template-columns:70px 1fr 80px;gap:8px;align-items:center;font-size:12.5px}
.cmprow span{color:var(--muted)}.cmprow em{font-style:normal;font-weight:700;text-align:right}
@media (max-width:700px){.trio{grid-template-columns:1fr}.cmpwrap{grid-template-columns:1fr}}
`;
(function() {
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.appendChild(s);
})();
function App({ session }) {
  const userId = session.user.id;
  const [db, setDb] = useState(null);
  const dbRef = useRef(null);
  dbRef.current = db;
  const [cicloDef, setCicloDef] = useState(24);
  const [risparmiOk, setRisparmiOk] = useState(true);
  const [loadErr, setLoadErr] = useState(null);
  const [selKey, setSelKey] = useState(null);
  const [tab, setTab] = useState("mese");
  const [toast, setToast] = useState(null);
  const carried = useRef(/* @__PURE__ */ new Set());
  const today = iso(/* @__PURE__ */ new Date());
  useEffect(() => {
    try {
      if (!document.getElementById("pc-font")) {
        const l = document.createElement("link");
        l.id = "pc-font";
        l.rel = "stylesheet";
        l.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";
        document.head.appendChild(l);
      }
    } catch (e) {
    }
  }, []);
  const reload = async () => {
    try {
      const r = await loadAll(userId);
      setDb(r.db);
      setCicloDef(r.ciclo);
      setRisparmiOk(r.risparmiOk);
      setLoadErr(null);
      return r.db;
    } catch (e) {
      setLoadErr(errMsg(e));
      return null;
    }
  };
  useEffect(() => {
    (async () => {
      const d = await reload();
      if (d) {
        const cc = getCicli(d);
        const cur = findCycle(cc, today) || [...cc].reverse().find((c) => c.m.spese.length || c.m.entrate.length) || cc[cc.length - 1];
        setSelKey(cur.key);
      }
    })();
  }, []);
  useEffect(() => {
    if (!toast || toast.busy) return;
    const t = setTimeout(() => setToast(null), toast.error ? 12e3 : 6500);
    return () => clearTimeout(t);
  }, [toast]);
  const cicli = useMemo(() => db ? getCicli(db) : [], [db]);
  const curr = useMemo(() => findCycle(cicli, today) || [...cicli].reverse().find((c) => c.m.spese.length || c.m.entrate.length) || cicli[cicli.length - 1], [cicli]);
  const act = async ({ local, remote, inverse, msg }) => {
    const before = dbRef.current;
    setDb((d) => {
      const n = clone(d);
      local(n);
      return n;
    });
    setToast({ msg, busy: true });
    try {
      await remote();
      setToast({ msg, undo: inverse ? async () => {
        const b2 = dbRef.current;
        setDb((d) => {
          const n = clone(d);
          inverse.local(n);
          return n;
        });
        setToast({ msg: "Annullo\u2026", busy: true });
        try {
          await inverse.remote();
          setToast({ msg: "Annullato" });
        } catch (e) {
          setDb(b2);
          setToast({ msg: "Impossibile annullare: " + errMsg(e), error: true });
        }
      } : null });
    } catch (e) {
      setDb(before);
      setToast({ msg: "Non salvato: " + errMsg(e), error: true });
    }
  };
  const M = (d, c) => d.anni[c.anno].mesi[c.mese];
  const goalOf = (d, c, id) => (d.obiettivi[c.anno] || []).find((g) => g.id === id);
  const accNow = (c, id) => {
    const g = goalOf(dbRef.current, c, id);
    return g ? Number(g.accantonamenti[c.mese]) || 0 : 0;
  };
  const setAcc = (id, mese, v) => v > 0 ? q(sb.from("accantonamenti").upsert({ user_id: userId, obiettivo_id: id, mese, valore: v }, { onConflict: "user_id,obiettivo_id,mese" })) : q(sb.from("accantonamenti").delete().eq("obiettivo_id", id).eq("mese", mese));
  const movPayload = (c, r, kind) => kind === "spesa" ? { id: r.id, user_id: userId, anno: c.anno, mese: c.mese, tipo_mov: "spesa", data: r.data, descrizione: r.descrizione, valore: r.valore, categoria: r.categoria, contanti: !!r.contanti } : { id: r.id, user_id: userId, anno: c.anno, mese: c.mese, tipo_mov: "entrata", descrizione: r.descrizione, valore: r.valore, tipo_entrata: r.tipo || "Occasionale", contanti: !!r.contanti };
  const listOf = (m, kind) => kind === "spesa" ? m.spese : m.entrate;
  const A = {
    addMov: (c, r, kind) => act({
      local: (d) => {
        listOf(M(d, c), kind).push(r);
      },
      remote: () => q(sb.from("movimenti").insert(movPayload(c, r, kind))),
      inverse: { local: (d) => {
        const m = M(d, c);
        if (kind === "spesa") m.spese = m.spese.filter((x) => x.id !== r.id);
        else m.entrate = m.entrate.filter((x) => x.id !== r.id);
      }, remote: () => q(sb.from("movimenti").delete().eq("id", r.id)) },
      msg: kind === "spesa" ? "Spesa registrata: " + fmt(r.valore) + " \xB7 " + r.categoria : "Entrata registrata: " + fmt(r.valore)
    }),
    delMov: (c, r, kind) => act({
      local: (d) => {
        const m = M(d, c);
        if (kind === "spesa") m.spese = m.spese.filter((x) => x.id !== r.id);
        else m.entrate = m.entrate.filter((x) => x.id !== r.id);
      },
      remote: () => q(sb.from("movimenti").delete().eq("id", r.id)),
      inverse: { local: (d) => {
        listOf(M(d, c), kind).push(r);
      }, remote: () => q(sb.from("movimenti").insert(movPayload(c, r, kind))) },
      msg: kind === "spesa" ? "Spesa eliminata" : "Entrata eliminata"
    }),
    editMov: (c, r, n, kind) => act({
      local: (d) => {
        const x = listOf(M(d, c), kind).find((y) => y.id === r.id);
        if (x) Object.assign(x, n);
      },
      remote: () => q(sb.from("movimenti").update(kind === "spesa" ? { descrizione: n.descrizione, valore: n.valore, categoria: n.categoria, data: n.data, contanti: !!n.contanti } : { descrizione: n.descrizione, valore: n.valore, contanti: !!n.contanti }).eq("id", r.id)),
      msg: "Modifica salvata"
    }),
    addRisp: (c, { goalId, descrizione, valore, data }) => {
      if (!goalId && !risparmiOk) {
        setToast({ msg: "Per i risparmi senza obiettivo serve aggiornare il database: esegui il file aggiorna_schema_v2.sql su Supabase. Scegli intanto un obiettivo.", error: true });
        return;
      }
      const id = uuid();
      const prev2 = goalId ? accNow(c, goalId) : 0;
      const nv = round2(prev2 + valore);
      const row = { id, data, goalId: goalId || null, descrizione: descrizione || "", valore };
      const ins = () => sb.from("risparmi").insert({ id, user_id: userId, anno: c.anno, mese: c.mese, data, obiettivo_id: goalId || null, descrizione: descrizione || null, valore });
      return act({
        local: (d) => {
          const m = M(d, c);
          if (risparmiOk) m.risparmi.push(row);
          if (goalId) {
            const g = goalOf(d, c, goalId);
            if (g) g.accantonamenti[c.mese] = nv;
          }
        },
        remote: async () => {
          if (goalId) await setAcc(goalId, c.mese, nv);
          if (risparmiOk) await q(ins());
        },
        inverse: {
          local: (d) => {
            const m = M(d, c);
            m.risparmi = m.risparmi.filter((x) => x.id !== id);
            if (goalId) {
              const g = goalOf(d, c, goalId);
              if (g) {
                if (prev2 > 0) g.accantonamenti[c.mese] = prev2;
                else delete g.accantonamenti[c.mese];
              }
            }
          },
          remote: async () => {
            if (goalId) await setAcc(goalId, c.mese, prev2);
            if (risparmiOk) await q(sb.from("risparmi").delete().eq("id", id));
          }
        },
        msg: "Messi da parte " + fmt(valore)
      });
    },
    delRisp: (c, r) => {
      const prev2 = r.goalId ? accNow(c, r.goalId) : 0;
      const nv = Math.max(0, round2(prev2 - r.valore));
      act({
        local: (d) => {
          const m = M(d, c);
          m.risparmi = m.risparmi.filter((x) => x.id !== r.id);
          if (r.goalId) {
            const g = goalOf(d, c, r.goalId);
            if (g) {
              if (nv > 0) g.accantonamenti[c.mese] = nv;
              else delete g.accantonamenti[c.mese];
            }
          }
        },
        remote: async () => {
          if (r.goalId) await setAcc(r.goalId, c.mese, nv);
          await q(sb.from("risparmi").delete().eq("id", r.id));
        },
        inverse: {
          local: (d) => {
            M(d, c).risparmi.push(r);
            if (r.goalId) {
              const g = goalOf(d, c, r.goalId);
              if (g) g.accantonamenti[c.mese] = prev2;
            }
          },
          remote: async () => {
            if (r.goalId) await setAcc(r.goalId, c.mese, prev2);
            await q(sb.from("risparmi").insert({ id: r.id, user_id: userId, anno: c.anno, mese: c.mese, data: r.data, obiettivo_id: r.goalId, descrizione: r.descrizione || null, valore: r.valore }));
          }
        },
        msg: "Risparmio eliminato"
      });
    },
    pay: (c, p) => {
      const sid = uuid();
      const data = p.scadenza && p.scadenza <= today ? p.scadenza : today;
      const row = { id: sid, data, descrizione: p.descrizione, valore: p.valore, categoria: "Spese fisse", contanti: false };
      act({
        local: (d) => {
          const m = M(d, c);
          m.spese.push(row);
          const x = m.promemoria.find((y) => y.id === p.id);
          x.pagato = true;
          x.movimentoId = sid;
        },
        remote: async () => {
          await q(sb.from("movimenti").insert(movPayload(c, row, "spesa")));
          await q(sb.from("promemoria").update({ pagato: true, movimento_id: sid }).eq("id", p.id));
        },
        inverse: {
          local: (d) => {
            const m = M(d, c);
            m.spese = m.spese.filter((y) => y.id !== sid);
            const x = m.promemoria.find((y) => y.id === p.id);
            x.pagato = false;
            x.movimentoId = null;
          },
          remote: async () => {
            await q(sb.from("promemoria").update({ pagato: false, movimento_id: null }).eq("id", p.id));
            await q(sb.from("movimenti").delete().eq("id", sid));
          }
        },
        msg: p.descrizione + " pagato: aggiunto alle spese"
      });
    },
    reopen: (c, p) => act({
      local: (d) => {
        const m = M(d, c);
        if (p.movimentoId) m.spese = m.spese.filter((y) => y.id !== p.movimentoId);
        const x = m.promemoria.find((y) => y.id === p.id);
        x.pagato = false;
        x.movimentoId = null;
      },
      remote: async () => {
        await q(sb.from("promemoria").update({ pagato: false, movimento_id: null }).eq("id", p.id));
        if (p.movimentoId) await q(sb.from("movimenti").delete().eq("id", p.movimentoId));
      },
      msg: p.descrizione + " rimesso da pagare"
    }),
    addImp: (c, { descrizione, valore, scadenza }) => {
      const row = { id: uuid(), pagato: false, scadenza, descrizione, valore, movimentoId: null };
      act({
        local: (d) => {
          M(d, c).promemoria.push(row);
        },
        remote: () => q(sb.from("promemoria").insert({ id: row.id, user_id: userId, anno: c.anno, mese: c.mese, pagato: false, scadenza, descrizione, valore })),
        msg: "Impegno aggiunto"
      });
    },
    editImp: (c, p, n) => act({
      local: (d) => {
        const m = M(d, c);
        const x = m.promemoria.find((y) => y.id === p.id);
        if (!x) return;
        Object.assign(x, n);
        if (x.movimentoId) {
          const s = m.spese.find((y) => y.id === x.movimentoId);
          if (s) {
            s.descrizione = n.descrizione;
            s.valore = n.valore;
          }
        }
      },
      remote: async () => {
        await q(sb.from("promemoria").update({ descrizione: n.descrizione, valore: n.valore, scadenza: n.scadenza }).eq("id", p.id));
        if (p.movimentoId) await q(sb.from("movimenti").update({ descrizione: n.descrizione, valore: n.valore }).eq("id", p.movimentoId));
      },
      msg: "Impegno aggiornato"
    }),
    delImp: (c, p) => {
      const left = c.m.promemoria.filter((x) => x.id !== p.id).length;
      if (left === 0) setFlag(noCarryKey(c));
      act({
        local: (d) => {
          const m = M(d, c);
          m.promemoria = m.promemoria.filter((y) => y.id !== p.id);
        },
        remote: () => q(sb.from("promemoria").delete().eq("id", p.id)),
        msg: p.pagato ? "Impegno eliminato (la spesa gi\xE0 registrata resta)" : "Impegno eliminato"
      });
    },
    addGoal: (c, { nome, target, mensile }) => {
      const g = { id: uuid(), nome, target, obiettivoMensile: mensile, accantonamenti: {} };
      act({
        local: (d) => {
          if (!d.obiettivi[c.anno]) d.obiettivi[c.anno] = [];
          d.obiettivi[c.anno].push(g);
        },
        remote: () => q(sb.from("obiettivi").insert({ id: g.id, user_id: userId, anno: c.anno, nome, target, obiettivo_mensile: mensile })),
        msg: "Obiettivo creato: " + nome
      });
    },
    editGoal: (c, g, { nome, target, mensile }) => act({
      local: (d) => {
        const x = goalOf(d, c, g.id);
        if (x) {
          x.nome = nome;
          x.target = target;
          x.obiettivoMensile = mensile;
        }
      },
      remote: () => q(sb.from("obiettivi").update({ nome, target, obiettivo_mensile: mensile }).eq("id", g.id)),
      msg: "Obiettivo aggiornato"
    }),
    delGoal: (c, g) => act({
      local: (d) => {
        d.obiettivi[c.anno] = d.obiettivi[c.anno].filter((x) => x.id !== g.id);
      },
      remote: () => q(sb.from("obiettivi").delete().eq("id", g.id)),
      msg: "Obiettivo eliminato: " + g.nome
    }),
    setRange: (c, ini, fine) => act({
      local: (d) => {
        const m = M(d, c);
        m.rangeInizio = ini;
        m.rangeFine = fine;
      },
      remote: () => q(sb.from("mesi").upsert({ user_id: userId, anno: c.anno, mese: c.mese, range_inizio: ini, range_fine: fine }, { onConflict: "user_id,anno,mese" })),
      msg: "Date del mese aggiornate"
    })
  };
  useEffect(() => {
    if (!db || !selKey) return;
    const c = cicli.find((x) => x.key === selKey);
    if (!c) return;
    if (c.m.promemoria.length || carried.current.has(selKey) || getFlag(noCarryKey(c))) return;
    if (c.m.rangeFine < today) return;
    const i = cicli.indexOf(c);
    const p = i > 0 ? cicli[i - 1] : null;
    if (!p || !p.m.promemoria.length) return;
    carried.current.add(selKey);
    const rows = p.m.promemoria.map((x) => ({ id: uuid(), pagato: false, scadenza: shiftMonth(x.scadenza), descrizione: x.descrizione, valore: x.valore, movimentoId: null }));
    act({
      local: (d) => {
        M(d, c).promemoria.push(...rows);
      },
      remote: () => q(sb.from("promemoria").insert(rows.map((r) => ({ id: r.id, user_id: userId, anno: c.anno, mese: c.mese, pagato: false, scadenza: r.scadenza, descrizione: r.descrizione, valore: r.valore })))),
      msg: "Impegni riportati da " + p.mese + ": puoi modificarli o toglierli"
    });
  }, [selKey, db]);
  if (loadErr) return /* @__PURE__ */ React.createElement("div", { className: "pc-center" }, /* @__PURE__ */ React.createElement("div", { className: "card", style: { maxWidth: 520 } }, /* @__PURE__ */ React.createElement("h2", null, "Non riesco a caricare i dati"), /* @__PURE__ */ React.createElement("p", { className: "sub" }, loadErr), /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: () => location.reload() }, "Riprova")));
  if (!db || !selKey) return /* @__PURE__ */ React.createElement("div", { className: "pc-center" }, /* @__PURE__ */ React.createElement("div", { className: "mut" }, "Carico i tuoi dati\u2026"));
  const sel = cicli.find((c) => c.key === selKey) || curr;
  const idx = cicli.findIndex((c) => c.key === sel.key);
  const prev = idx > 0 ? cicli[idx - 1] : null;
  const T = ciclo(db, sel);
  const years = Object.keys(db.anni).map(Number).sort((a, b) => b - a);
  const currIdx = cicli.indexOf(curr);
  return /* @__PURE__ */ React.createElement("div", { className: "wrap" }, /* @__PURE__ */ React.createElement("header", { className: "top" }, /* @__PURE__ */ React.createElement("div", { className: "brand" }, /* @__PURE__ */ React.createElement("span", { className: "logo" }, "\u20AC"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", null, "Pay Check"), /* @__PURE__ */ React.createElement("small", null, "Oggi: ", dShort(today)))), /* @__PURE__ */ React.createElement("select", { className: "yearsel", value: sel.anno, "aria-label": "Anno", onChange: (e) => {
    const y = Number(e.target.value);
    const cc = cicli.filter((c) => c.anno === y);
    const pick = cc.find((c) => c.key === curr.key) || [...cc].reverse().find((c) => c.m.spese.length || c.m.entrate.length) || cc[0];
    setSelKey(pick.key);
  } }, years.map((y) => /* @__PURE__ */ React.createElement("option", { key: y, value: y }, y))), /* @__PURE__ */ React.createElement("nav", { className: "cycles", "aria-label": "Mese" }, cicli.filter((c) => c.anno === sel.anno && (c.m.spese.length || c.m.entrate.length || c.key === curr.key || c.key === sel.key || cicli.indexOf(c) === currIdx + 1)).map((c) => /* @__PURE__ */ React.createElement("button", { key: c.key, className: "chip " + (c.key === sel.key ? "on" : ""), onClick: () => setSelKey(c.key) }, c.mese.slice(0, 3))), /* @__PURE__ */ React.createElement("select", { className: "monthsel", value: sel.mese, "aria-label": "Altri mesi", onChange: (e) => setSelKey(sel.anno + "|" + e.target.value) }, MESI.map((m) => /* @__PURE__ */ React.createElement("option", { key: m }, m)))), /* @__PURE__ */ React.createElement("div", { className: "tabs" }, [["mese", "Questo mese"], ["contanti", "Contanti"], ["anno", "Anno " + sel.anno]].map(([k, l]) => /* @__PURE__ */ React.createElement("button", { key: k, className: tab === k ? "on" : "", onClick: () => setTab(k) }, l))), /* @__PURE__ */ React.createElement("div", { className: "who" }, session.user.email, " ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => sb.auth.signOut() }, "Esci"))), !risparmiOk && /* @__PURE__ */ React.createElement("div", { className: "note" }, "Il database non ha ancora la tabella dei risparmi liberi. Tutto il resto funziona; per usarli esegui ", /* @__PURE__ */ React.createElement("b", null, "aggiorna_schema_v2.sql"), " su Supabase."), tab === "mese" && /* @__PURE__ */ React.createElement("main", { className: "grid" }, /* @__PURE__ */ React.createElement("div", { className: "col" }, /* @__PURE__ */ React.createElement(Registra, { db, sel, cicli, today, A }), /* @__PURE__ */ React.createElement(Movimenti, { db, sel, A })), /* @__PURE__ */ React.createElement("div", { className: "col" }, /* @__PURE__ */ React.createElement(Hero, { sel, T, today, A }), /* @__PURE__ */ React.createElement("div", { className: "two" }, /* @__PURE__ */ React.createElement(Settimana, { cicli, today }), /* @__PURE__ */ React.createElement(Obiettivi, { sel, T, A })), /* @__PURE__ */ React.createElement(InArrivo, { sel, today, A }), /* @__PURE__ */ React.createElement(DoveVanno, { sel, prev }))), tab === "contanti" && /* @__PURE__ */ React.createElement(Contanti, { db, sel }), tab === "anno" && /* @__PURE__ */ React.createElement(Anno, { db, sel, cicli }), /* @__PURE__ */ React.createElement("footer", { className: "foot" }, /* @__PURE__ */ React.createElement("span", null, "I dati sono salvati su Supabase e sono uguali su ogni dispositivo.")), toast && /* @__PURE__ */ React.createElement("div", { className: "toast " + (toast.error ? "err" : ""), role: "status" }, /* @__PURE__ */ React.createElement("span", null, toast.msg), toast.undo && /* @__PURE__ */ React.createElement("button", { onClick: toast.undo }, "Annulla")));
}
function Registra({ db, sel, cicli, today, A }) {
  const [mode, setMode] = useState("spesa");
  const [amt, setAmt] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState(null);
  const [when, setWhen] = useState("oggi");
  const [custom, setCustom] = useState(today);
  const [cash, setCash] = useState(false);
  const [goal, setGoal] = useState("libero");
  const amtRef = useRef(null);
  useEffect(() => {
    amtRef.current && amtRef.current.focus();
  }, []);
  const memo = useMemo(() => {
    const map = {};
    cicli.forEach((c) => c.m.spese.slice().sort((a, b) => (a.data || "") < (b.data || "") ? -1 : 1).forEach((s) => {
      map[String(s.descrizione).trim().toLowerCase()] = s.categoria;
    }));
    return map;
  }, [cicli]);
  const suggest = useMemo(() => {
    const k = desc.trim().toLowerCase();
    if (k.length < 2) return null;
    if (memo[k]) return memo[k];
    const hit = Object.keys(memo).find((x) => x.startsWith(k));
    return hit ? memo[hit] : null;
  }, [desc, memo]);
  const goals = db.obiettivi[sel.anno] || [];
  useEffect(() => {
    if (goal !== "libero" && !goals.find((g) => g.id === goal)) setGoal("libero");
  }, [goals.length]);
  const effCat = cat || suggest || "Varie";
  const date = when === "oggi" ? today : when === "ieri" ? addDays(today, -1) : custom;
  const val = num(amt);
  const ok = val > 0;
  function save() {
    if (!ok) {
      amtRef.current && amtRef.current.focus();
      return;
    }
    const v = round2(val);
    if (mode === "spesa") {
      const target = findCycle(cicli, date) || sel;
      A.addMov(target, { id: uuid(), data: date, descrizione: desc.trim() || effCat, valore: v, categoria: effCat, contanti: cash }, "spesa");
    } else if (mode === "entrata") {
      A.addMov(sel, { id: uuid(), descrizione: desc.trim() || "Entrata", valore: v, tipo: "Occasionale", contanti: cash }, "entrata");
    } else {
      A.addRisp(sel, { goalId: goal === "libero" ? null : goal, descrizione: desc.trim(), valore: v, data: date });
    }
    setAmt("");
    setDesc("");
    setCat(null);
    setCash(false);
    amtRef.current && amtRef.current.focus();
  }
  const onKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (mode === "spesa" && e.target.id === "desc" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const i = CATEGORIE.indexOf(effCat);
      const n = (i + (e.key === "ArrowDown" ? 1 : -1) + CATEGORIE.length) % CATEGORIE.length;
      setCat(CATEGORIE[n]);
    }
  };
  return /* @__PURE__ */ React.createElement("section", { className: "card reg", onKeyDown: onKey }, /* @__PURE__ */ React.createElement("div", { className: "seg", role: "tablist" }, /* @__PURE__ */ React.createElement("button", { className: mode === "spesa" ? "on" : "", onClick: () => setMode("spesa") }, "Spesa"), /* @__PURE__ */ React.createElement("button", { className: mode === "entrata" ? "on pos" : "", onClick: () => setMode("entrata") }, "Entrata"), /* @__PURE__ */ React.createElement("button", { className: mode === "risparmio" ? "on sav" : "", onClick: () => setMode("risparmio") }, "Risparmio")), /* @__PURE__ */ React.createElement("div", { className: "amtrow" }, /* @__PURE__ */ React.createElement("input", { id: "amt", ref: amtRef, inputMode: "decimal", autoComplete: "off", placeholder: "0,00", value: amt, onChange: (e) => setAmt(e.target.value), "aria-label": "Importo" }), /* @__PURE__ */ React.createElement("span", { className: "eur" }, "\u20AC")), /* @__PURE__ */ React.createElement("input", { id: "desc", className: "txt", autoComplete: "off", placeholder: mode === "spesa" ? "Cos'era? (es. Esselunga)" : mode === "entrata" ? "Da chi? (es. Stipendio)" : "Nota (facoltativa)", value: desc, onChange: (e) => setDesc(e.target.value), "aria-label": "Descrizione" }), mode === "spesa" && /* @__PURE__ */ React.createElement("div", { className: "cats", "aria-label": "Categoria" }, CATEGORIE.map((c) => /* @__PURE__ */ React.createElement("button", { key: c, className: "cat " + (effCat === c ? "on" : ""), style: { "--c": CAT_COL[c] || "#A9B6C6" }, onClick: () => setCat(c) }, /* @__PURE__ */ React.createElement("i", null), c, !cat && suggest === c ? /* @__PURE__ */ React.createElement("em", null, "suggerita") : null))), mode === "risparmio" && /* @__PURE__ */ React.createElement("div", { className: "cats", "aria-label": "Obiettivo" }, goals.map((g) => /* @__PURE__ */ React.createElement("button", { key: g.id, className: "cat " + (goal === g.id ? "on" : ""), style: { "--c": "#2F5FD6" }, onClick: () => setGoal(g.id) }, /* @__PURE__ */ React.createElement("i", null), g.nome)), /* @__PURE__ */ React.createElement("button", { className: "cat " + (goal === "libero" ? "on" : ""), style: { "--c": "#2F5FD6" }, onClick: () => setGoal("libero") }, /* @__PURE__ */ React.createElement("i", null), "Libero (nessun obiettivo)")), /* @__PURE__ */ React.createElement("div", { className: "opts" }, mode !== "entrata" && /* @__PURE__ */ React.createElement("div", { className: "seg sm" }, /* @__PURE__ */ React.createElement("button", { className: when === "oggi" ? "on" : "", onClick: () => setWhen("oggi") }, "Oggi"), /* @__PURE__ */ React.createElement("button", { className: when === "ieri" ? "on" : "", onClick: () => setWhen("ieri") }, "Ieri"), /* @__PURE__ */ React.createElement("button", { className: when === "altro" ? "on" : "", onClick: () => setWhen("altro") }, "Altra data")), when === "altro" && mode !== "entrata" && /* @__PURE__ */ React.createElement("input", { type: "date", id: "dt", className: "dt", value: custom, onChange: (e) => setCustom(e.target.value) }), mode !== "risparmio" && /* @__PURE__ */ React.createElement("label", { className: "cash" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: cash, onChange: (e) => setCash(e.target.checked) }), " Contanti")), /* @__PURE__ */ React.createElement("button", { className: "go", disabled: !ok, onClick: save }, mode === "spesa" ? "Aggiungi spesa" : mode === "entrata" ? "Aggiungi entrata" : "Metti da parte", " ", /* @__PURE__ */ React.createElement("kbd", null, "Invio")), /* @__PURE__ */ React.createElement("p", { className: "hint" }, "Scrivi l'importo, premi Tab, scrivi cosa era e premi Invio. La categoria si ricorda da sola; con \u2191 \u2193 la cambi."), mode === "spesa" && findCycle(cicli, date) && findCycle(cicli, date).key !== sel.key && /* @__PURE__ */ React.createElement("p", { className: "hint" }, "Questa data cade nel mese di ", findCycle(cicli, date).mese, ": la spesa va l\xEC."));
}
function Movimenti({ db, sel, A }) {
  const [q2, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [edId, setEdId] = useState(null);
  const [e, setE] = useState({});
  const [confirm, setConfirm] = useState(null);
  const list = sel.m.spese.slice().sort((a, b) => (a.data || "") < (b.data || "") ? 1 : (a.data || "") > (b.data || "") ? -1 : 0).filter((s) => !q2 || (s.descrizione + s.categoria).toLowerCase().includes(q2.toLowerCase()));
  const shown = all || q2 ? list : list.slice(0, 8);
  const goalName = (id) => {
    const g = (db.obiettivi[sel.anno] || []).find((x) => x.id === id);
    return g ? g.nome : "Libero";
  };
  const startEd = (r, kind) => {
    setEdId(r.id);
    setConfirm(null);
    setE({ kind, d: r.descrizione, v: String(r.valore).replace(".", ","), c: r.categoria || "Varie", dt: r.data || "", cash: !!r.contanti });
  };
  const saveEd = (r) => {
    const v = num(e.v);
    if (!(v > 0) || !e.d.trim()) return;
    A.editMov(sel, r, e.kind === "spesa" ? { descrizione: e.d.trim(), valore: round2(v), categoria: e.c, data: e.dt || r.data, contanti: e.cash } : { descrizione: e.d.trim(), valore: round2(v), contanti: e.cash }, e.kind);
    setEdId(null);
  };
  const editForm = (r) => /* @__PURE__ */ React.createElement("li", { key: r.id, className: "edmov", onKeyDown: (ev) => {
    if (ev.key === "Enter") saveEd(r);
    if (ev.key === "Escape") setEdId(null);
  } }, /* @__PURE__ */ React.createElement("input", { className: "txt", id: "em-d", value: e.d, onChange: (ev) => setE({ ...e, d: ev.target.value }), autoFocus: true }), /* @__PURE__ */ React.createElement("input", { className: "txt", id: "em-v", inputMode: "decimal", value: e.v, onChange: (ev) => setE({ ...e, v: ev.target.value }) }), e.kind === "spesa" && /* @__PURE__ */ React.createElement("select", { className: "txt", id: "em-c", value: e.c, onChange: (ev) => setE({ ...e, c: ev.target.value }) }, CATEGORIE.map((c) => /* @__PURE__ */ React.createElement("option", { key: c }, c))), e.kind === "spesa" && /* @__PURE__ */ React.createElement("input", { className: "txt", id: "em-dt", type: "date", value: e.dt, onChange: (ev) => setE({ ...e, dt: ev.target.value }) }), /* @__PURE__ */ React.createElement("label", { className: "cash" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: e.cash, onChange: (ev) => setE({ ...e, cash: ev.target.checked }) }), " Contanti"), /* @__PURE__ */ React.createElement("div", { className: "frow" }, /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: () => saveEd(r) }, "Salva"), /* @__PURE__ */ React.createElement("button", { className: "mini ghost", onClick: () => setEdId(null) }, "Annulla"), confirm === r.id ? /* @__PURE__ */ React.createElement("button", { className: "mini dangerb", onClick: () => {
    A.delMov(sel, r, e.kind);
    setEdId(null);
  } }, "Conferma: elimina") : /* @__PURE__ */ React.createElement("button", { className: "mini ghost danger", onClick: () => setConfirm(r.id) }, "Elimina")));
  return /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Movimenti"), /* @__PURE__ */ React.createElement("input", { className: "search", placeholder: "Cerca\u2026", value: q2, onChange: (ev) => setQ(ev.target.value), "aria-label": "Cerca movimenti" })), /* @__PURE__ */ React.createElement("ul", { className: "list" }, sel.m.entrate.map((r) => edId === r.id ? editForm(r) : /* @__PURE__ */ React.createElement("li", { key: r.id }, /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: "var(--pos)" } }), /* @__PURE__ */ React.createElement("div", { className: "t" }, /* @__PURE__ */ React.createElement("b", null, r.descrizione), /* @__PURE__ */ React.createElement("small", null, "Entrata", r.contanti ? " \xB7 contanti" : "", " \xB7 ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => startEd(r, "entrata") }, "Modifica"))), /* @__PURE__ */ React.createElement("span", { className: "v pos" }, "+", fmt(r.valore)))), (sel.m.risparmi || []).map((r) => /* @__PURE__ */ React.createElement("li", { key: r.id }, /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: "var(--accent)" } }), /* @__PURE__ */ React.createElement("div", { className: "t" }, /* @__PURE__ */ React.createElement("b", null, r.descrizione || "Messo da parte"), /* @__PURE__ */ React.createElement("small", null, dShort(r.data), " \xB7 Risparmio \xB7 ", r.goalId ? goalName(r.goalId) : "Libero")), /* @__PURE__ */ React.createElement("span", { className: "v sav" }, fmt(r.valore)), /* @__PURE__ */ React.createElement("button", { className: "x", "aria-label": "Elimina", onClick: () => A.delRisp(sel, r) }, "\xD7"))), shown.map((r) => edId === r.id ? editForm(r) : /* @__PURE__ */ React.createElement("li", { key: r.id }, /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: CAT_COL[r.categoria] || "#A9B6C6" } }), /* @__PURE__ */ React.createElement("div", { className: "t" }, /* @__PURE__ */ React.createElement("b", null, r.descrizione), /* @__PURE__ */ React.createElement("small", null, dShort(r.data), " \xB7 ", r.categoria, r.contanti ? " \xB7 contanti" : "", " \xB7 ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => startEd(r, "spesa") }, "Modifica"))), /* @__PURE__ */ React.createElement("span", { className: "v" }, "\u2212", fmt(r.valore)))), !shown.length && !sel.m.entrate.length && /* @__PURE__ */ React.createElement("li", { className: "empty" }, "Ancora nessun movimento in questo mese.")), !q2 && list.length > 8 && /* @__PURE__ */ React.createElement("button", { className: "link", onClick: () => setAll(!all) }, all ? "Mostra meno" : "Mostra tutte (" + list.length + ")"));
}
function Hero({ sel, T, today, A }) {
  const [editRange, setEditRange] = useState(false);
  const [r1, setR1] = useState(sel.m.rangeInizio);
  const [r2, setR2] = useState(sel.m.rangeFine);
  useEffect(() => {
    setR1(sel.m.rangeInizio);
    setR2(sel.m.rangeFine);
    setEditRange(false);
  }, [sel.key]);
  const start = sel.m.rangeInizio, end = sel.m.rangeFine;
  const total = diffDays(start, end) + 1;
  const status = today < start ? "futuro" : today > end ? "chiuso" : "in corso";
  const elapsed = status === "in corso" ? diffDays(start, today) + 1 : status === "chiuso" ? total : 0;
  const neg = T.restano < 0;
  const pendList = sel.m.promemoria.filter((p) => !p.pagato).sort((x, y) => (x.scadenza || "") < (y.scadenza || "") ? -1 : 1);
  const nPend = pendList.length, nTot = sel.m.promemoria.length, prox = pendList[0];
  let msg;
  if (T.entrate === 0 && status !== "chiuso") msg = "Non hai ancora registrato entrate in questo mese: registra lo stipendio come Entrata e il numero si aggiorna.";
  else if (status === "chiuso") msg = neg ? "Mese chiuso: hai speso " + fmt(-T.restano) + " pi\xF9 di quanto avevi a disposizione." : "Mese chiuso: ti sono avanzati " + fmt(T.restano) + ".";
  else if (neg) msg = "Hai speso " + fmt(T.speso) + " su " + fmt(T.entrate) + " entrati" + (T.inArrivo > 0 ? ", e devi ancora pagare " + fmt(T.inArrivo) + " di impegni" : "") + ".";
  else msg = "Fino al " + dShort(end) + " hai ancora " + fmt(T.restano) + " liberi, dopo aver pagato gli impegni in arrivo.";
  const rows = [["Entrate", T.entrate, "pos", "+"], ["Gi\xE0 speso", T.speso, "", ""], ["Impegni ancora in arrivo", T.inArrivo, "", ""]];
  const pct = Math.min(100, Math.round(elapsed / total * 100));
  const saveRange = () => {
    if (r1 && r2 && r1 <= r2) {
      A.setRange(sel, r1, r2);
      setEditRange(false);
    }
  };
  return /* @__PURE__ */ React.createElement("section", { className: "card hero " + (neg ? "neg" : "ok") }, /* @__PURE__ */ React.createElement("div", { className: "hl" }, /* @__PURE__ */ React.createElement("span", { className: "lab" }, status === "chiuso" ? "Com'\xE8 finito il mese" : neg ? "Sei oltre di" : "Ti restano fino al " + dShort(end)), /* @__PURE__ */ React.createElement("div", { className: "big" }, fmt0(Math.abs(T.restano))), /* @__PURE__ */ React.createElement("p", { className: "msg" }, msg), nTot > 0 && /* @__PURE__ */ React.createElement("div", { className: "fixed " + (nPend === 0 ? "done" : "") }, /* @__PURE__ */ React.createElement("b", null, nPend === 0 ? "Tutte le spese fisse sono pagate" : (nPend === 1 ? "Manca 1 spesa fissa su " : "Mancano " + nPend + " spese fisse su ") + nTot), nPend > 0 && /* @__PURE__ */ React.createElement("span", null, fmt(T.inArrivo), " da pagare \xB7 la prossima: ", prox.descrizione, ", ", dShort(prox.scadenza))), /* @__PURE__ */ React.createElement("div", { className: "prog", title: "Giorni passati del mese" }, /* @__PURE__ */ React.createElement("i", { style: { width: pct + "%" } })), /* @__PURE__ */ React.createElement("small", { className: "plab" }, dShort(start), " \u2192 ", dShort(end), status === "in corso" ? " \xB7 giorno " + elapsed + " di " + total : "", " \xB7 ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => setEditRange(!editRange) }, "Cambia date")), editRange && /* @__PURE__ */ React.createElement("div", { className: "rangeed", onKeyDown: (e) => {
    if (e.key === "Enter") saveRange();
  } }, /* @__PURE__ */ React.createElement("input", { type: "date", className: "dt", id: "r-i", value: r1, onChange: (e) => setR1(e.target.value) }), /* @__PURE__ */ React.createElement("span", null, "\u2192"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "dt", id: "r-f", value: r2, onChange: (e) => setR2(e.target.value) }), /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: saveRange }, "Salva"))), /* @__PURE__ */ React.createElement("dl", { className: "eq" }, rows.map(([k, v, c, s], i) => /* @__PURE__ */ React.createElement("div", { key: k, className: c }, /* @__PURE__ */ React.createElement("dt", null, i > 0 ? "\u2212  " : "", k), /* @__PURE__ */ React.createElement("dd", null, s, fmt(v)))), /* @__PURE__ */ React.createElement("div", { className: "tot" }, /* @__PURE__ */ React.createElement("dt", null, "=  ", neg ? "Oltre" : "Restano"), /* @__PURE__ */ React.createElement("dd", null, fmt(T.restano))), /* @__PURE__ */ React.createElement("div", { className: "sv2" }, /* @__PURE__ */ React.createElement("dt", null, "Messo da parte questo mese"), /* @__PURE__ */ React.createElement("dd", null, fmt(T.messo))), /* @__PURE__ */ React.createElement("div", { className: "sv2" }, /* @__PURE__ */ React.createElement("dt", null, "Avanzo dopo i risparmi"), /* @__PURE__ */ React.createElement("dd", null, fmt(T.restano - T.messo)))));
}
function Settimana({ cicli, today }) {
  const all = cicli.flatMap((c) => c.m.spese);
  const w1 = all.filter((s) => s.data > addDays(today, -7) && s.data <= today);
  const w0 = all.filter((s) => s.data > addDays(today, -14) && s.data <= addDays(today, -7));
  const a = sum(w1, (s) => s.valore), b = sum(w0, (s) => s.valore);
  const by = {};
  w1.forEach((s) => {
    by[s.categoria] = (by[s.categoria] || 0) + s.valore;
  });
  const top = Object.entries(by).sort((x, y) => y[1] - x[1])[0];
  const diff = a - b;
  return /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Ultimi 7 giorni")), /* @__PURE__ */ React.createElement("div", { className: "wk" }, fmt(a)), /* @__PURE__ */ React.createElement("p", { className: "sub" }, b > 0 ? diff > 0 ? fmt(diff) + " in pi\xF9 della settimana prima (" + fmt(b) + ")" : diff < 0 ? fmt(-diff) + " in meno della settimana prima (" + fmt(b) + ")" : "Come la settimana prima" : "Nessun dato per la settimana prima"), top ? /* @__PURE__ */ React.createElement("p", { className: "sub" }, "Voce principale: ", /* @__PURE__ */ React.createElement("b", { style: { color: CAT_COL[top[0]] } }, "\u25CF"), " ", /* @__PURE__ */ React.createElement("b", null, top[0]), " (", fmt(top[1]), ")") : /* @__PURE__ */ React.createElement("p", { className: "sub" }, "Nessuna spesa negli ultimi 7 giorni."));
}
function Obiettivi({ sel, T, A }) {
  const obs = T.obs;
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({ nome: "", target: "", mensile: "" });
  const [confirmDel, setConfirmDel] = useState(null);
  const startEdit = (g) => {
    setEditing(g.id);
    setConfirmDel(null);
    setF({ nome: g.nome, target: String(g.target), mensile: String(g.obiettivoMensile) });
  };
  const startNew = () => {
    setEditing("new");
    setConfirmDel(null);
    setF({ nome: "", target: "", mensile: "100" });
  };
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  function saveG() {
    const t = num(f.target), m = num(f.mensile) || 0;
    if (!f.nome.trim() || !(t > 0)) return;
    if (editing === "new") A.addGoal(sel, { nome: f.nome.trim(), target: t, mensile: m });
    else {
      const g = T.obs.find((x) => x.id === editing);
      if (g) A.editGoal(sel, g, { nome: f.nome.trim(), target: t, mensile: m });
    }
    setEditing(null);
  }
  function delG(g) {
    A.delGoal(sel, g);
    setConfirmDel(null);
    setEditing(null);
  }
  function put(g) {
    A.addRisp(sel, { goalId: g.id, descrizione: "Quota mensile", valore: Number(g.obiettivoMensile) || 0, data: iso(/* @__PURE__ */ new Date()) });
  }
  const eta = (g) => {
    const tot = sum(Object.values(g.accantonamenti), (x) => x);
    const left = g.target - tot;
    const m = Number(g.obiettivoMensile) || 0;
    if (left <= 0) return "Raggiunto";
    if (!m) return "Quota mensile non impostata";
    const n = Math.ceil(left / m);
    return n > 24 ? "A " + fmt(m) + "/mese: circa " + (n / 12).toFixed(1).replace(".", ",") + " anni" : "A " + fmt(m) + "/mese: " + n + " mesi";
  };
  const form = (g) => /* @__PURE__ */ React.createElement("div", { className: "gform", onKeyDown: (e) => {
    if (e.key === "Enter") saveG();
    if (e.key === "Escape") setEditing(null);
  } }, /* @__PURE__ */ React.createElement("input", { className: "txt", id: "g-n", placeholder: "Nome obiettivo", value: f.nome, onChange: upd("nome"), autoFocus: true }), /* @__PURE__ */ React.createElement("label", null, "Da raggiungere (\u20AC)", /* @__PURE__ */ React.createElement("input", { className: "txt", id: "g-t", inputMode: "decimal", value: f.target, onChange: upd("target") })), /* @__PURE__ */ React.createElement("label", null, "Quota mensile (\u20AC)", /* @__PURE__ */ React.createElement("input", { className: "txt", id: "g-m", inputMode: "decimal", value: f.mensile, onChange: upd("mensile") })), /* @__PURE__ */ React.createElement("div", { className: "frow" }, /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: saveG }, "Salva"), /* @__PURE__ */ React.createElement("button", { className: "mini ghost", onClick: () => setEditing(null) }, "Annulla"), g && (confirmDel === g.id ? /* @__PURE__ */ React.createElement("button", { className: "mini dangerb", onClick: () => delG(g) }, "Conferma: elimina") : /* @__PURE__ */ React.createElement("button", { className: "mini ghost danger", onClick: () => setConfirmDel(g.id) }, "Elimina"))));
  return /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Obiettivi"), /* @__PURE__ */ React.createElement("button", { className: "mini ghost", onClick: () => editing === "new" ? setEditing(null) : startNew() }, editing === "new" ? "Chiudi" : "+ Nuovo")), editing === "new" && form(null), /* @__PURE__ */ React.createElement("ul", { className: "goals" }, obs.map((g) => {
    const tot = sum(Object.values(g.accantonamenti), (x) => x);
    const pct = Math.min(100, Math.round(tot / g.target * 100));
    const m = Number(g.obiettivoMensile) || 0;
    const done = m > 0 && (Number(g.accantonamenti[sel.mese]) || 0) >= m;
    if (editing === g.id) return /* @__PURE__ */ React.createElement("li", { key: g.id }, form(g));
    return /* @__PURE__ */ React.createElement("li", { key: g.id }, /* @__PURE__ */ React.createElement("div", { className: "gt" }, /* @__PURE__ */ React.createElement("b", null, g.nome), /* @__PURE__ */ React.createElement("span", null, fmt(tot), " / ", fmt(g.target))), /* @__PURE__ */ React.createElement("div", { className: "bar" }, /* @__PURE__ */ React.createElement("i", { style: { width: Math.max(pct, tot > 0 ? 2 : 0) + "%" } })), /* @__PURE__ */ React.createElement("div", { className: "gf" }, /* @__PURE__ */ React.createElement("small", null, eta(g), " \xB7 ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => startEdit(g) }, "Modifica")), m > 0 && (done ? /* @__PURE__ */ React.createElement("span", { className: "okp" }, "Fatto questo mese") : /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: () => put(g) }, "+ ", fmt(m)))));
  }), !obs.length && /* @__PURE__ */ React.createElement("li", { className: "empty" }, 'Nessun obiettivo. Creane uno con "+ Nuovo".')));
}
function InArrivo({ sel, today, A }) {
  const [adding, setAdding] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [d1, setD1] = useState("");
  const [v1, setV1] = useState("");
  const [s1, setS1] = useState(today);
  const [edId, setEdId] = useState(null);
  const [e, setE] = useState({ d: "", v: "", s: "" });
  const [confirmDel, setConfirmDel] = useState(null);
  const pend = sel.m.promemoria.filter((p) => !p.pagato).sort((a, b) => (a.scadenza || "") < (b.scadenza || "") ? -1 : 1);
  const paid = sel.m.promemoria.filter((p) => p.pagato).sort((a, b) => (a.scadenza || "") < (b.scadenza || "") ? -1 : 1);
  function pay(p) {
    A.pay(sel, p);
  }
  function reopen(p) {
    A.reopen(sel, p);
  }
  function add() {
    const v = num(v1);
    if (!(v > 0) || !d1.trim()) return;
    A.addImp(sel, { descrizione: d1.trim(), valore: round2(v), scadenza: s1 });
    setD1("");
    setV1("");
    setAdding(false);
  }
  function startEd(p) {
    setEdId(p.id);
    setConfirmDel(null);
    setE({ d: p.descrizione, v: String(p.valore).replace(".", ","), s: p.scadenza || "" });
  }
  function saveEd() {
    const v = num(e.v);
    if (!(v > 0) || !e.d.trim()) return;
    const p = sel.m.promemoria.find((x) => x.id === edId);
    if (!p) return;
    A.editImp(sel, p, { descrizione: e.d.trim(), valore: round2(v), scadenza: e.s || p.scadenza });
    setEdId(null);
  }
  function del(p) {
    A.delImp(sel, p);
    setConfirmDel(null);
    setEdId(null);
  }
  const when = (s) => {
    if (!s) return "senza data";
    const n = diffDays(today, s);
    return n < 0 ? "scaduto da " + -n + " g" : n === 0 ? "oggi" : n === 1 ? "domani" : "tra " + n + " giorni";
  };
  const editRow = (p) => /* @__PURE__ */ React.createElement("li", { key: p.id, className: "edrow", onKeyDown: (ev) => {
    if (ev.key === "Enter") saveEd();
    if (ev.key === "Escape") setEdId(null);
  } }, /* @__PURE__ */ React.createElement("input", { className: "txt", id: "ie-d", value: e.d, onChange: (ev) => setE({ ...e, d: ev.target.value }), autoFocus: true }), /* @__PURE__ */ React.createElement("input", { className: "txt num", id: "ie-v", inputMode: "decimal", value: e.v, onChange: (ev) => setE({ ...e, v: ev.target.value }) }), /* @__PURE__ */ React.createElement("input", { className: "txt", id: "ie-s", type: "date", value: e.s, onChange: (ev) => setE({ ...e, s: ev.target.value }) }), /* @__PURE__ */ React.createElement("div", { className: "frow" }, /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: saveEd }, "Salva"), /* @__PURE__ */ React.createElement("button", { className: "mini ghost", onClick: () => setEdId(null) }, "Annulla"), confirmDel === p.id ? /* @__PURE__ */ React.createElement("button", { className: "mini dangerb", onClick: () => del(p) }, "Conferma: elimina") : /* @__PURE__ */ React.createElement("button", { className: "mini ghost danger", onClick: () => setConfirmDel(p.id) }, "Elimina")));
  return /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Impegni del mese"), /* @__PURE__ */ React.createElement("button", { className: "mini ghost", onClick: () => setAdding(!adding) }, adding ? "Chiudi" : "+ Nuovo")), adding && /* @__PURE__ */ React.createElement("div", { className: "addrow", onKeyDown: (ev) => {
    if (ev.key === "Enter") add();
  } }, /* @__PURE__ */ React.createElement("input", { id: "ia-d", className: "txt", placeholder: "Cosa", value: d1, onChange: (ev) => setD1(ev.target.value) }), /* @__PURE__ */ React.createElement("input", { id: "ia-v", className: "txt num", inputMode: "decimal", placeholder: "\u20AC", value: v1, onChange: (ev) => setV1(ev.target.value) }), /* @__PURE__ */ React.createElement("input", { id: "ia-s", className: "txt", type: "date", value: s1, onChange: (ev) => setS1(ev.target.value) }), /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: add }, "Aggiungi")), /* @__PURE__ */ React.createElement("ul", { className: "list" }, pend.map((p) => edId === p.id ? editRow(p) : /* @__PURE__ */ React.createElement("li", { key: p.id }, /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: "var(--warn)" } }), /* @__PURE__ */ React.createElement("div", { className: "t" }, /* @__PURE__ */ React.createElement("b", null, p.descrizione), /* @__PURE__ */ React.createElement("small", null, dShort(p.scadenza), " \xB7 ", when(p.scadenza), " \xB7 ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => startEd(p) }, "Modifica"))), /* @__PURE__ */ React.createElement("span", { className: "v" }, fmt(p.valore)), /* @__PURE__ */ React.createElement("button", { className: "mini", onClick: () => pay(p) }, "Pagato"))), !pend.length && /* @__PURE__ */ React.createElement("li", { className: "empty" }, sel.m.promemoria.length ? "Nessun impegno da pagare. Tutto a posto." : 'Nessun impegno. Aggiungine uno con "+ Nuovo".')), paid.length > 0 && /* @__PURE__ */ React.createElement("button", { className: "link", onClick: () => setShowPaid(!showPaid) }, showPaid ? "Nascondi" : "Mostra", " i gi\xE0 pagati: ", paid.length, " (", fmt(sum(paid, (p) => p.valore)), ")"), showPaid && /* @__PURE__ */ React.createElement("ul", { className: "list paid" }, paid.map((p) => edId === p.id ? editRow(p) : /* @__PURE__ */ React.createElement("li", { key: p.id }, /* @__PURE__ */ React.createElement("span", { className: "dot", style: { background: "var(--pos)" } }), /* @__PURE__ */ React.createElement("div", { className: "t" }, /* @__PURE__ */ React.createElement("b", null, p.descrizione), /* @__PURE__ */ React.createElement("small", null, dShort(p.scadenza), " \xB7 ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => startEd(p) }, "Modifica"), " \xB7 ", /* @__PURE__ */ React.createElement("button", { className: "link sm", onClick: () => reopen(p) }, "Rimetti da pagare"))), /* @__PURE__ */ React.createElement("span", { className: "v" }, fmt(p.valore))))));
}
function DoveVanno({ sel, prev }) {
  const cats = Object.keys(CAT_COL);
  const by = (m) => {
    const o = {};
    m.spese.forEach((s) => {
      o[s.categoria] = (o[s.categoria] || 0) + Number(s.valore);
    });
    return o;
  };
  const now = by(sel.m), before = prev ? by(prev.m) : {};
  const rows = cats.map((c) => ({ c, v: now[c] || 0, p: before[c] || 0 })).filter((r) => r.v > 0 || r.p > 0).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.v, r.p)));
  return /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Dove vanno i soldi"), prev && /* @__PURE__ */ React.createElement("small", { className: "mut" }, "vs ", prev.mese)), /* @__PURE__ */ React.createElement("ul", { className: "cl" }, rows.map((r) => {
    const d = r.v - r.p;
    return /* @__PURE__ */ React.createElement("li", { key: r.c }, /* @__PURE__ */ React.createElement("div", { className: "cn" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { style: { background: CAT_COL[r.c] } }), r.c), /* @__PURE__ */ React.createElement("b", null, fmt(r.v))), /* @__PURE__ */ React.createElement("div", { className: "bar2" }, /* @__PURE__ */ React.createElement("i", { style: { width: r.v / max * 100 + "%", background: CAT_COL[r.c] } }), prev && /* @__PURE__ */ React.createElement("u", { style: { left: r.p / max * 100 + "%" }, title: "Ciclo prima: " + fmt(r.p) })), prev && /* @__PURE__ */ React.createElement("small", { className: "dl " + (d > 5 ? "up" : d < -5 ? "dn" : "") }, Math.abs(d) <= 5 ? "Come " + prev.mese : (d > 0 ? "+" : "\u2212") + fmt(Math.abs(d)) + " rispetto a " + prev.mese));
  }), !rows.length && /* @__PURE__ */ React.createElement("li", { className: "empty" }, "Ancora nessuna spesa.")));
}
function Anno({ db, sel, cicli }) {
  const rows = cicli.filter((c) => c.anno === sel.anno && (c.m.spese.length || c.m.entrate.length)).map((c) => ({ c, ...ciclo(db, c) }));
  const max = Math.max(1, ...rows.map((r) => Math.max(r.entrate, r.speso)));
  const tot = rows.reduce((a, r) => ({ e: a.e + r.entrate, s: a.s + r.speso }), { e: 0, s: 0 });
  const obs = db.obiettivi[sel.anno] || [];
  return /* @__PURE__ */ React.createElement("main", { className: "grid year" }, /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Mese per mese"), /* @__PURE__ */ React.createElement("small", { className: "mut" }, "barra azzurra = entrate \xB7 barra scura = spese")), /* @__PURE__ */ React.createElement("ul", { className: "yl" }, rows.map((r) => {
    const sal = r.entrate - r.speso;
    return /* @__PURE__ */ React.createElement("li", { key: r.c.key }, /* @__PURE__ */ React.createElement("b", null, r.c.mese), /* @__PURE__ */ React.createElement("div", { className: "yb" }, /* @__PURE__ */ React.createElement("i", { className: "e", style: { width: r.entrate / max * 100 + "%" } }), /* @__PURE__ */ React.createElement("i", { className: "s", style: { width: r.speso / max * 100 + "%" } })), /* @__PURE__ */ React.createElement("span", { className: "v " + (sal < 0 ? "neg" : "pos") }, sal < 0 ? "\u2212" : "+", fmt(Math.abs(sal))));
  })), /* @__PURE__ */ React.createElement("p", { className: "sub" }, "In ", rows.length, " mesi hai incassato ", fmt(tot.e), " e speso ", fmt(tot.s), ": ", tot.e - tot.s >= 0 ? "avanzo" : "disavanzo", " di ", /* @__PURE__ */ React.createElement("b", null, fmt(Math.abs(tot.e - tot.s))), ".")), /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Obiettivi ", sel.anno)), /* @__PURE__ */ React.createElement("ul", { className: "goals" }, obs.map((g) => {
    const t = sum(Object.values(g.accantonamenti), (x) => x);
    return /* @__PURE__ */ React.createElement("li", { key: g.id }, /* @__PURE__ */ React.createElement("div", { className: "gt" }, /* @__PURE__ */ React.createElement("b", null, g.nome), /* @__PURE__ */ React.createElement("span", null, fmt(t), " / ", fmt(g.target))), /* @__PURE__ */ React.createElement("div", { className: "bar" }, /* @__PURE__ */ React.createElement("i", { style: { width: Math.max(Math.min(100, t / g.target * 100), t > 0 ? 2 : 0) + "%" } })));
  }))));
}
function Contanti({ db, sel }) {
  const m = sel.m;
  const entCash = sum(m.entrate.filter((e) => e.contanti), (e) => e.valore), entCard = sum(m.entrate.filter((e) => !e.contanti), (e) => e.valore);
  const speCash = sum(m.spese.filter((s) => s.contanti), (s) => s.valore), speCard = sum(m.spese.filter((s) => !s.contanti), (s) => s.valore);
  const catCash = {};
  m.spese.filter((s) => s.contanti).forEach((s) => {
    catCash[s.categoria] = (catCash[s.categoria] || 0) + s.valore;
  });
  const list = Object.entries(catCash).sort((a, b) => b[1] - a[1]);
  const yc = Object.values(db.anni[sel.anno].mesi);
  const yEnt = sum(yc.flatMap((x) => x.entrate.filter((e) => e.contanti)), (e) => e.valore);
  const ySpe = sum(yc.flatMap((x) => x.spese.filter((s) => s.contanti)), (s) => s.valore);
  const max = Math.max(1, entCash, entCard, speCash, speCard);
  const bar = (label, a, b) => /* @__PURE__ */ React.createElement("div", { className: "cmp", key: label }, /* @__PURE__ */ React.createElement("b", null, label), [["Contanti", a, "#C9922B"], ["Bancomat", b, "#2F5FD6"]].map(([k, v, c]) => /* @__PURE__ */ React.createElement("div", { className: "cmprow", key: k }, /* @__PURE__ */ React.createElement("span", null, k), /* @__PURE__ */ React.createElement("div", { className: "bar" }, /* @__PURE__ */ React.createElement("i", { style: { width: v / max * 100 + "%", background: c } })), /* @__PURE__ */ React.createElement("em", null, fmt(v)))));
  return /* @__PURE__ */ React.createElement("main", { className: "grid year" }, /* @__PURE__ */ React.createElement("div", { className: "col" }, /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Contanti \xB7 ", sel.mese)), /* @__PURE__ */ React.createElement("div", { className: "trio" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("small", null, "Entrate in contanti"), /* @__PURE__ */ React.createElement("b", { style: { color: "var(--cash)" } }, fmt(entCash))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("small", null, "Spese in contanti"), /* @__PURE__ */ React.createElement("b", { style: { color: "var(--cash)" } }, fmt(speCash))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("small", null, "Saldo contanti"), /* @__PURE__ */ React.createElement("b", { className: entCash - speCash < 0 ? "neg" : "pos" }, fmt(entCash - speCash)))), /* @__PURE__ */ React.createElement("p", { className: "sub" }, "Nell'anno ", sel.anno, ": entrate in contanti ", fmt(yEnt), ", spese in contanti ", fmt(ySpe), "."), /* @__PURE__ */ React.createElement("div", { className: "cmpwrap" }, bar("Entrate", entCash, entCard), bar("Spese", speCash, speCard)), /* @__PURE__ */ React.createElement("p", { className: "hint" }, 'Segna un movimento come contante con la casella "Contanti" quando lo registri.'))), /* @__PURE__ */ React.createElement("div", { className: "col" }, /* @__PURE__ */ React.createElement("section", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "ch" }, /* @__PURE__ */ React.createElement("h2", null, "Per cosa spendi il contante")), /* @__PURE__ */ React.createElement("ul", { className: "cl" }, list.map(([c, v]) => /* @__PURE__ */ React.createElement("li", { key: c }, /* @__PURE__ */ React.createElement("div", { className: "cn" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("i", { style: { background: CAT_COL[c] } }), c), /* @__PURE__ */ React.createElement("b", null, fmt(v))), /* @__PURE__ */ React.createElement("div", { className: "bar2" }, /* @__PURE__ */ React.createElement("i", { style: { width: (speCash > 0 ? v / speCash * 100 : 0) + "%", background: "#C9922B" } })))), !list.length && /* @__PURE__ */ React.createElement("li", { className: "empty" }, "Nessuna spesa in contanti in questo mese.")))));
}
function Login() {
  const signIn = () => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
  return /* @__PURE__ */ React.createElement("div", { className: "pc-center" }, /* @__PURE__ */ React.createElement("div", { className: "card login" }, /* @__PURE__ */ React.createElement("span", { className: "logo big" }, "\u20AC"), /* @__PURE__ */ React.createElement("h1", null, "Pay Check"), /* @__PURE__ */ React.createElement("p", { className: "sub" }, "Spese, obiettivi e risparmi. Accedi con Google: solo tu vedi i tuoi dati."), /* @__PURE__ */ React.createElement("button", { className: "go", onClick: signIn }, "Accedi con Google")));
}
function ConfigWarning() {
  return /* @__PURE__ */ React.createElement("div", { className: "pc-center" }, /* @__PURE__ */ React.createElement("div", { className: "card", style: { maxWidth: 520 } }, /* @__PURE__ */ React.createElement("h2", null, "Configurazione mancante"), /* @__PURE__ */ React.createElement("p", { className: "sub" }, "Apri config.js e inserisci il Project URL e la chiave del tuo progetto Supabase.")));
}
function Root() {
  const [session, setSession] = useState(void 0);
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!CONFIG_OK) return /* @__PURE__ */ React.createElement(ConfigWarning, null);
  if (session === void 0) return /* @__PURE__ */ React.createElement("div", { className: "pc-center" }, /* @__PURE__ */ React.createElement("div", { className: "mut" }, "Carico\u2026"));
  if (session === null) return /* @__PURE__ */ React.createElement(Login, null);
  return /* @__PURE__ */ React.createElement(App, { session });
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(Root, null));
