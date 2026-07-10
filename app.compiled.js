const { useState, useEffect, useMemo, useRef, useCallback } = React;
const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const CATEGORIE = ["Necessit\xE0/Imprevisti", "Alimentari", "Svago", "Shopping", "Cura personale", "Benzina", "Spese fisse", "Take away", "Spese mediche", "Viaggi", "Hobby", "Varie"];
const CAT_COLORI = {
  "Necessit\xE0/Imprevisti": "#8AA0C8",
  "Alimentari": "#7FBEA6",
  "Svago": "#E6A97C",
  "Shopping": "#D493B8",
  "Cura personale": "#7FBEDC",
  "Benzina": "#6E8FC7",
  "Spese fisse": "#5C82BE",
  "Take away": "#E8C06B",
  "Spese mediche": "#E28C8C",
  "Viaggi": "#9E8FD0",
  "Hobby": "#96C77E",
  "Varie": "#A9B6C6"
};
const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtN = (n) => new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const parseNum = (s) => {
  if (typeof s === "number") return s;
  const v = parseFloat(String(s).replace(",", "."));
  return isNaN(v) ? 0 : v;
};
const dLabel = (iso) => {
  if (!iso) return "\u2014";
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
};
const todayISO = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const shiftMonthDate = (iso) => {
  if (!iso) return null;
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  const day = d.getDate();
  let m = d.getMonth() + 1, y = d.getFullYear();
  if (m > 11) {
    m = 0;
    y += 1;
  }
  const nd = new Date(y, m, day);
  if (nd.getMonth() !== m) nd.setDate(0);
  return nd.toISOString().slice(0, 10);
};
const cfg = window.PAYCHECK_CONFIG || {};
const CONFIG_OK = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.startsWith("INCOLLA");
const sb = CONFIG_OK ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const CSS = `
.pc-root{--paper:#EAF1FB;--surface:#FFFFFF;--ink:#1C2C4C;--muted:#64738F;--line:#D8E4F4;--accent:#3E6FD6;--accent-soft:#E5EDFB;--pos:#3AA189;--neg:#D45B54;--cash:#C99433;--cash-soft:#F7EFDC;
  font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);
  background:linear-gradient(180deg,#EAF1FB 0%,#EEF4FC 40%,#F3F0FA 100%);background-attachment:fixed;min-height:100vh;font-size:14px;line-height:1.45;}
.pc-root *{box-sizing:border-box;}
.pc-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}
.pc-wrap{max-width:960px;margin:0 auto;padding:0 14px 90px;}
.pc-top{position:sticky;top:0;z-index:20;background:rgba(234,241,251,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:14px 0 10px;}
.pc-brand{display:flex;align-items:baseline;gap:9px;justify-content:space-between;}
.pc-brand .l{display:flex;align-items:baseline;gap:9px;}
.pc-brand b{font-size:19px;letter-spacing:-.02em;font-weight:700;}
.pc-brand span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;}
.pc-who{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:8px;}
.pc-who button{border:none;background:transparent;color:var(--accent);font-weight:700;cursor:pointer;font-size:11.5px;}
.pc-selrow{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap;align-items:center;}
.pc-sel{appearance:none;background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:7px 11px;font-size:14px;color:var(--ink);font-weight:600;cursor:pointer;}
.pc-cycle{margin-left:auto;font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px;}
.pc-cycle input{border:1px solid var(--line);border-radius:7px;padding:4px 6px;font-size:12px;font-family:inherit;color:var(--ink);}
.pc-tabs{display:flex;gap:4px;margin-top:11px;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.pc-tab{white-space:nowrap;border:none;background:transparent;padding:7px 12px;border-radius:8px;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;}
.pc-tab.on{background:linear-gradient(135deg,#4C7DE4,#3E6FD6);color:#fff;box-shadow:0 2px 8px rgba(62,111,214,.28);}
.pc-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0;}
.pc-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px 14px;}
.pc-card.tint-a{background:linear-gradient(180deg,#E9F1FE,#F7FAFE);border-color:#D2E1F7;}
.pc-card.tint-b{background:linear-gradient(180deg,#F1ECFA,#FAF8FE);border-color:#E1D8F2;}
.pc-card.tint-c{background:linear-gradient(180deg,#E5F4EF,#F5FBF9);border-color:#CBE8DD;}
.pc-card .k{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;}
.pc-card .v{font-size:21px;font-weight:700;margin-top:5px;letter-spacing:-.02em;}
.pc-sec{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:15px 16px;margin-bottom:14px;}
.pc-sec h3{margin:0 0 3px;font-size:15px;font-weight:700;letter-spacing:-.01em;}
.pc-sec .sub{font-size:12px;color:var(--muted);margin-bottom:11px;}
.pc-list{display:flex;flex-direction:column;}
.pc-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line);}
.pc-item:first-child{border-top:none;}
.pc-item .desc{flex:1;min-width:0;}
.pc-item .desc .t{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pc-item .desc .m{font-size:11.5px;color:var(--muted);display:flex;gap:7px;align-items:center;margin-top:2px;flex-wrap:wrap;}
.pc-amt{font-weight:700;white-space:nowrap;}
.pc-dot{width:9px;height:9px;border-radius:3px;flex:none;}
.pc-tag{font-size:10px;padding:1px 6px;border-radius:20px;background:var(--accent-soft);color:var(--accent);font-weight:700;letter-spacing:.03em;}
.pc-tag.cash{background:var(--cash-soft);color:var(--cash);}
.pc-tag.fisso{background:#EEF0F2;color:#5A6570;}
.pc-x{border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:15px;padding:3px 5px;border-radius:6px;line-height:1;}
.pc-x:hover{background:#F0F2EE;color:var(--neg);}
.pc-edit{border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:13px;padding:3px 5px;border-radius:6px;}
.pc-edit:hover{color:var(--accent);}
.pc-add{margin-top:11px;display:flex;gap:7px;flex-wrap:wrap;align-items:flex-end;background:#FAFBFD;border:1px dashed var(--line);border-radius:12px;padding:11px;}
.pc-f{display:flex;flex-direction:column;gap:3px;}
.pc-f label{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;padding-left:2px;}
.pc-in{border:1px solid var(--line);border-radius:9px;padding:8px 9px;font-size:14px;font-family:inherit;color:var(--ink);background:#fff;min-width:0;}
.pc-in:focus{outline:2px solid var(--accent-soft);border-color:var(--accent);}
.pc-btn{background:var(--accent);color:#fff;border:none;border-radius:9px;padding:9px 15px;font-size:14px;font-weight:700;cursor:pointer;}
.pc-btn:disabled{opacity:.55;cursor:default;}
.pc-btn:hover:not(:disabled){filter:brightness(1.07);}
.pc-btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line);}
.pc-check{width:20px;height:20px;border:1.5px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;}
.pc-check.on{background:var(--pos);border-color:var(--pos);}
.pc-bar{height:8px;background:#EEF0EC;border-radius:20px;overflow:hidden;}
.pc-bar > i{display:block;height:100%;border-radius:20px;}
.pc-brow{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line);}
.pc-brow:first-child{border-top:none;}
.pc-brow .nm{width:130px;font-size:13px;font-weight:600;flex:none;}
.pc-brow .bx{flex:1;}
.pc-brow .rr{width:92px;text-align:right;font-size:13px;font-weight:700;flex:none;}
.pc-empty{color:var(--muted);font-size:13px;padding:14px 0;text-align:center;}
.pc-table{width:100%;border-collapse:collapse;font-size:13px;}
.pc-table th{text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:7px 8px;border-bottom:1px solid var(--line);font-weight:700;}
.pc-table th:first-child{text-align:left;}
.pc-table td{padding:8px;border-bottom:1px solid var(--line);text-align:right;}
.pc-table td:first-child{text-align:left;font-weight:600;}
.pc-note{font-size:11.5px;color:var(--muted);background:#FAFBFD;border:1px solid var(--line);border-radius:10px;padding:9px 11px;margin-bottom:12px;}
.pc-goal{border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:11px;}
.pc-goal .gh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:9px;}
.pc-goal .gh b{font-size:15px;}
.pc-split{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pc-login{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;text-align:center;padding:20px;}
.pc-login h1{font-size:26px;margin:0;}
.pc-login p{color:var(--muted);max-width:340px;margin:0;}
.pc-gbtn{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 22px;font-size:15px;font-weight:600;color:var(--ink);cursor:pointer;box-shadow:0 2px 10px rgba(30,44,76,.06);}
.pc-gbtn:hover{filter:brightness(.98);}
.pc-loading{min-height:100vh;display:flex;align-items:center;justify-content:center;color:var(--muted);}
.pc-warn{max-width:520px;margin:60px auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;}
@media(max-width:620px){.pc-cards{grid-template-columns:1fr;}.pc-split{grid-template-columns:1fr;}.pc-brow .nm{width:96px;}.pc-cycle{margin-left:0;width:100%;}}
`;
function Money({ v, color }) {
  const c = color === "auto" ? v > 0 ? "var(--pos)" : v < 0 ? "var(--neg)" : "var(--ink)" : color || "var(--ink)";
  return /* @__PURE__ */ React.createElement("span", { className: "pc-num", style: { color: c } }, fmt(v));
}
function DonutChart({ data }) {
  const tot = data.reduce((a, b) => a + b.value, 0);
  if (tot <= 0) return /* @__PURE__ */ React.createElement("div", { className: "pc-empty" }, "Nessuna spesa da mostrare.");
  const R = 70, r = 44, cx = 90, cy = 90;
  let acc = 0;
  const arcs = data.map((d) => {
    const frac = d.value / tot;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)];
    const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
    const p2 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const p3 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const path = `M ${p0[0]} ${p0[1]} A ${R} ${R} 0 ${large} 1 ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} A ${r} ${r} 0 ${large} 0 ${p3[0]} ${p3[1]} Z`;
    return /* @__PURE__ */ React.createElement("path", { key: d.name, d: path, fill: d.color });
  });
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 180 180", style: { width: "100%", maxWidth: 220, display: "block", margin: "0 auto" } }, arcs, /* @__PURE__ */ React.createElement("circle", { cx, cy, r: r - 1, fill: "#fff" }), /* @__PURE__ */ React.createElement("text", { x: cx, y: cy - 3, textAnchor: "middle", fontSize: "13", fontWeight: "700", fill: "#1C2C4C" }, fmt(tot)), /* @__PURE__ */ React.createElement("text", { x: cx, y: cy + 13, textAnchor: "middle", fontSize: "9.5", fill: "#64738F" }, "totale speso"));
}
function CompareBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.a, r.b)));
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14, padding: "6px 4px" } }, rows.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.label }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, marginBottom: 5 } }, r.label), [["Contanti", r.a, "#C99433"], ["Bancomat", r.b, "#3E6FD6"]].map(([lb, v, c]) => /* @__PURE__ */ React.createElement("div", { key: lb, style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 62, fontSize: 11, color: "var(--muted)" } }, lb), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, background: "#EEF0EC", borderRadius: 6, height: 16, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { width: v / max * 100 + "%", background: c, height: "100%", borderRadius: 6 } })), /* @__PURE__ */ React.createElement("span", { className: "pc-num", style: { width: 70, textAlign: "right", fontSize: 11.5, fontWeight: 600 } }, fmt(v)))))));
}
function TrendChart({ rows }) {
  if (rows.length === 0) return /* @__PURE__ */ React.createElement("div", { className: "pc-empty" }, "Nessun dato da mostrare.");
  const W = 680, H = 220, pad = 30;
  const vals = rows.flatMap((r) => [r.entrate, r.spese, r.risparmio]);
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const x = (i) => pad + i * ((W - 2 * pad) / Math.max(1, rows.length - 1));
  const y = (v) => H - pad - (v - min) / (max - min || 1) * (H - 2 * pad);
  const line = (key, color) => {
    const pts = rows.map((r, i) => `${x(i)},${y(r[key])}`).join(" ");
    return /* @__PURE__ */ React.createElement("polyline", { key, points: pts, fill: "none", stroke: color, strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" });
  };
  return /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, style: { width: "100%", minWidth: 480, display: "block" } }, /* @__PURE__ */ React.createElement("line", { x1: pad, y1: y(0), x2: W - pad, y2: y(0), stroke: "#D8E4F4", strokeWidth: "1" }), line("entrate", "#3E6FD6"), line("spese", "#D45B54"), line("risparmio", "#3AA189"), rows.map((r, i) => /* @__PURE__ */ React.createElement("text", { key: r.mese, x: x(i), y: H - 8, fontSize: "9", fill: "#64738F", textAnchor: "middle" }, r.mese.slice(0, 3)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, justifyContent: "center", marginTop: 6, fontSize: 11.5 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#3E6FD6", fontWeight: 700 } }, "\u25CF Entrate"), /* @__PURE__ */ React.createElement("span", { style: { color: "#D45B54", fontWeight: 700 } }, "\u25CF Spese"), /* @__PURE__ */ React.createElement("span", { style: { color: "#3AA189", fontWeight: 700 } }, "\u25CF Risparmio")));
}
function Login() {
  const signIn = () => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
  return /* @__PURE__ */ React.createElement("div", { className: "pc-root" }, /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { className: "pc-login" }, /* @__PURE__ */ React.createElement("h1", null, "\u{1F4B6} Pay Check"), /* @__PURE__ */ React.createElement("p", null, "Spese, obiettivi e risparmi personali. Accedi con Google per continuare \u2014 solo tu potrai vedere i tuoi dati."), /* @__PURE__ */ React.createElement("button", { className: "pc-gbtn", onClick: signIn }, /* @__PURE__ */ React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 48 48" }, /* @__PURE__ */ React.createElement("path", { fill: "#FFC107", d: "M43.6 20.5H42V20H24v8h11.3C33.9 32.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l6-6C34.5 5.7 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" }), /* @__PURE__ */ React.createElement("path", { fill: "#FF3D00", d: "m6.3 14.7 6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.9 1.2 8 3.1l6-6C34.5 5.7 29.5 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z" }), /* @__PURE__ */ React.createElement("path", { fill: "#4CAF50", d: "M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35.4 26.8 36 24 36c-5.4 0-9.9-3.5-11.4-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z" }), /* @__PURE__ */ React.createElement("path", { fill: "#1976D2", d: "M43.6 20.5H42V20H24v8h11.3c-1 3-3.4 5.4-6.3 6.9l6.3 5.3C38.5 37.7 44 32.4 44 24c0-1.2-.1-2.4-.4-3.5z" })), "Accedi con Google")));
}
function ConfigWarning() {
  return /* @__PURE__ */ React.createElement("div", { className: "pc-root" }, /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { className: "pc-warn" }, /* @__PURE__ */ React.createElement("h3", { style: { marginTop: 0 } }, "Configurazione mancante"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--muted)", fontSize: 13 } }, "Apri ", /* @__PURE__ */ React.createElement("b", null, "config.js"), " e inserisci il Project URL e la anon key del tuo progetto Supabase (li trovi in Project Settings \u2192 API). Poi ricarica la pagina.")));
}
function App({ session }) {
  const userId = session.user.id;
  const [anno, setAnnoState] = useState((/* @__PURE__ */ new Date()).getFullYear());
  const [mese, setMeseState] = useState(MESI[(/* @__PURE__ */ new Date()).getMonth()]);
  const [tab, setTab] = useState("mese");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movimenti, setMovimenti] = useState([]);
  const [promemoria, setPromemoria] = useState([]);
  const [budget, setBudget] = useState([]);
  const [meseRow, setMeseRow] = useState(null);
  const [obiettivi, setObiettivi] = useState([]);
  const [accantonamenti, setAccantonamenti] = useState([]);
  const [cicloDefault, setCicloDefault] = useState(24);
  const [anniDisponibili, setAnniDisponibili] = useState([]);
  const loadAnno = useCallback(async (y) => {
    setLoading(true);
    const [mv, pr, bu, me, ob, imp] = await Promise.all([
      sb.from("movimenti").select("*").eq("anno", y).order("data", { ascending: true }),
      sb.from("promemoria").select("*").eq("anno", y),
      sb.from("budget").select("*").eq("anno", y),
      sb.from("mesi").select("*").eq("anno", y),
      sb.from("obiettivi").select("*, accantonamenti(*)").eq("anno", y),
      sb.from("impostazioni").select("*").eq("user_id", userId).maybeSingle()
    ]);
    setMovimenti(mv.data || []);
    setPromemoria(pr.data || []);
    setBudget(bu.data || []);
    setObiettivi(ob.data || []);
    if (imp.data) setCicloDefault(imp.data.ciclo_inizio_giorno || 24);
    const mr = (me.data || []).find((m) => m.mese === mese);
    setMeseRow(mr || null);
    setLoading(false);
  }, [userId, mese]);
  const loadAnniDisponibili = useCallback(async () => {
    const { data } = await sb.from("movimenti").select("anno").order("anno", { ascending: false });
    const set = new Set((data || []).map((r) => r.anno));
    set.add((/* @__PURE__ */ new Date()).getFullYear());
    setAnniDisponibili([...set].sort((a, b) => b - a));
  }, []);
  useEffect(() => {
    loadAnniDisponibili();
  }, [loadAnniDisponibili]);
  useEffect(() => {
    loadAnno(anno);
  }, [anno]);
  useEffect(() => {
    (async () => {
      const { data } = await sb.from("mesi").select("*").eq("anno", anno).eq("mese", mese).maybeSingle();
      setMeseRow(data || null);
    })();
  }, [mese, anno]);
  const copyingRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    const promThisMonth = promemoria.filter((p) => p.mese === mese);
    if (promThisMonth.length > 0) return;
    if (copyingRef.current) return;
    copyingRef.current = true;
    (async () => {
      const idx = MESI.indexOf(mese);
      const prevMese = idx === 0 ? "Dicembre" : MESI[idx - 1];
      const prevAnno = idx === 0 ? anno - 1 : anno;
      const { data } = await sb.from("promemoria").select("*").eq("anno", prevAnno).eq("mese", prevMese);
      if (data && data.length > 0) {
        const inserts = data.map((p) => ({
          user_id: userId,
          anno,
          mese,
          scadenza: shiftMonthDate(p.scadenza),
          descrizione: p.descrizione,
          valore: p.valore,
          pagato: false
        }));
        await sb.from("promemoria").insert(inserts);
        await refreshPromemoria();
      }
      copyingRef.current = false;
    })();
  }, [mese, anno, loading, promemoria.length]);
  const setAnno = async (y) => {
    setAnnoState(y);
    const { data } = await sb.from("movimenti").select("mese").eq("anno", y);
    const withData = new Set((data || []).map((r) => r.mese));
    if (withData.size > 0 && !withData.has(mese)) {
      const first = MESI.find((m) => withData.has(m));
      if (first) setMeseState(first);
    }
  };
  const rangeDefault = useMemo(() => {
    const mi = MESI.indexOf(mese);
    const si = new Date(anno, mi, cicloDefault);
    let ny = anno, nm = mi + 1;
    if (nm > 11) {
      nm = 0;
      ny += 1;
    }
    const fi = new Date(ny, nm, cicloDefault - 1);
    return { inizio: si.toISOString().slice(0, 10), fine: fi.toISOString().slice(0, 10) };
  }, [anno, mese, cicloDefault]);
  const rangeInizio = meseRow?.range_inizio || rangeDefault.inizio;
  const rangeFine = meseRow?.range_fine || rangeDefault.fine;
  const saveRange = async (campo, val) => {
    setSaving(true);
    const payload = { user_id: userId, anno, mese, range_inizio: campo === "inizio" ? val : rangeInizio, range_fine: campo === "fine" ? val : rangeFine };
    const { data } = await sb.from("mesi").upsert(payload, { onConflict: "user_id,anno,mese" }).select().maybeSingle();
    setMeseRow(data);
    setSaving(false);
  };
  const M = useMemo(() => ({
    entrate: movimenti.filter((m) => m.mese === mese && m.tipo_mov === "entrata"),
    spese: movimenti.filter((m) => m.mese === mese && m.tipo_mov === "spesa"),
    promemoria: promemoria.filter((p) => p.mese === mese),
    budget: Object.fromEntries(budget.filter((b) => b.mese === mese).map((b) => [b.categoria, b.valore]))
  }), [movimenti, promemoria, budget, mese]);
  const totEntrate = M.entrate.reduce((a, b) => a + Number(b.valore), 0);
  const totSpese = M.spese.reduce((a, b) => a + Number(b.valore), 0);
  const risparmio = totEntrate - totSpese;
  const perCat = useMemo(() => {
    const o = {};
    CATEGORIE.forEach((c) => o[c] = 0);
    M.spese.forEach((s) => {
      o[s.categoria] = (o[s.categoria] || 0) + Number(s.valore);
    });
    return o;
  }, [M]);
  const refreshMovimenti = async () => {
    const { data } = await sb.from("movimenti").select("*").eq("anno", anno).order("data", { ascending: true });
    setMovimenti(data || []);
  };
  const refreshPromemoria = async () => {
    const { data } = await sb.from("promemoria").select("*").eq("anno", anno);
    setPromemoria(data || []);
  };
  const refreshBudget = async () => {
    const { data } = await sb.from("budget").select("*").eq("anno", anno);
    setBudget(data || []);
  };
  const refreshObiettivi = async () => {
    const { data } = await sb.from("obiettivi").select("*, accantonamenti(*)").eq("anno", anno);
    setObiettivi(data || []);
  };
  const ctx = {
    userId,
    anno,
    mese,
    setTab,
    tab,
    rangeInizio,
    rangeFine,
    saveRange,
    saving,
    setSaving,
    M,
    totEntrate,
    totSpese,
    risparmio,
    perCat,
    refreshMovimenti,
    refreshPromemoria,
    refreshBudget,
    refreshObiettivi,
    obiettivi
  };
  return /* @__PURE__ */ React.createElement("div", { className: "pc-root" }, /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { className: "pc-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "pc-top" }, /* @__PURE__ */ React.createElement("div", { className: "pc-brand" }, /* @__PURE__ */ React.createElement("div", { className: "l" }, /* @__PURE__ */ React.createElement("b", null, "\u{1F4B6} Pay Check"), /* @__PURE__ */ React.createElement("span", null, "Spese \xB7 Obiettivi \xB7 Risparmi")), /* @__PURE__ */ React.createElement("div", { className: "pc-who" }, session.user.email, /* @__PURE__ */ React.createElement("button", { onClick: () => sb.auth.signOut() }, "Esci"))), /* @__PURE__ */ React.createElement("div", { className: "pc-selrow" }, /* @__PURE__ */ React.createElement("select", { className: "pc-sel", value: anno, onChange: (e) => setAnno(Number(e.target.value)) }, anniDisponibili.map((y) => /* @__PURE__ */ React.createElement("option", { key: y, value: y }, y)), /* @__PURE__ */ React.createElement("option", { value: Math.max(...anniDisponibili, anno) + 1 }, Math.max(...anniDisponibili, anno) + 1, " (nuovo)")), /* @__PURE__ */ React.createElement("select", { className: "pc-sel", value: mese, onChange: (e) => setMeseState(e.target.value) }, MESI.map((m) => /* @__PURE__ */ React.createElement("option", { key: m }, m))), /* @__PURE__ */ React.createElement("div", { className: "pc-cycle" }, /* @__PURE__ */ React.createElement("span", null, "ciclo", saving ? " \xB7 salvo\u2026" : ""), /* @__PURE__ */ React.createElement("input", { type: "date", value: rangeInizio, onChange: (e) => saveRange("inizio", e.target.value) }), /* @__PURE__ */ React.createElement("span", null, "\u2192"), /* @__PURE__ */ React.createElement("input", { type: "date", value: rangeFine, onChange: (e) => saveRange("fine", e.target.value) }))), /* @__PURE__ */ React.createElement("div", { className: "pc-tabs" }, [["mese", "Mese"], ["budget", "Budget"], ["contanti", "Contanti"], ["obiettivi", "Obiettivi"], ["anno", "Anno"]].map(([k, l]) => /* @__PURE__ */ React.createElement("button", { key: k, className: "pc-tab" + (tab === k ? " on" : ""), onClick: () => setTab(k) }, l)))), loading ? /* @__PURE__ */ React.createElement("div", { className: "pc-empty", style: { padding: 40 } }, "Carico i dati\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, tab === "mese" && /* @__PURE__ */ React.createElement(MeseView, { ctx }), tab === "budget" && /* @__PURE__ */ React.createElement(BudgetView, { ctx }), tab === "contanti" && /* @__PURE__ */ React.createElement(ContantiView, { ctx }), tab === "obiettivi" && /* @__PURE__ */ React.createElement(ObiettiviView, { ctx }), tab === "anno" && /* @__PURE__ */ React.createElement(AnnoView, { ctx, movimenti, anno }))));
}
function MeseView({ ctx }) {
  const { M, totEntrate, totSpese, risparmio } = ctx;
  const promTot = M.promemoria.reduce((a, b) => a + Number(b.valore), 0);
  const promDaPagare = M.promemoria.filter((p) => !p.pagato).reduce((a, b) => a + Number(b.valore), 0);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "pc-cards" }, /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-a" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Entrate"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: totEntrate }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-b" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Spese"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: totSpese }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-c" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Risparmio"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: risparmio, color: "auto" })))), /* @__PURE__ */ React.createElement(EntrateSec, { ctx }), /* @__PURE__ */ React.createElement(SpeseSec, { ctx }), /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Promemoria"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "Uscite ricorrenti previste \xB7 ", fmt(promDaPagare), " ancora da pagare su ", fmt(promTot)), /* @__PURE__ */ React.createElement(PromForm, { ctx }), /* @__PURE__ */ React.createElement("div", { className: "pc-list", style: { marginTop: 11 } }, M.promemoria.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "pc-empty" }, "Nessun promemoria. Aggiungine sopra."), M.promemoria.map((p) => /* @__PURE__ */ React.createElement(PromItem, { key: p.id, p, ctx })))));
}
function PromItem({ p, ctx }) {
  const togglePagato = async () => {
    await sb.from("promemoria").update({ pagato: !p.pagato }).eq("id", p.id);
    ctx.refreshPromemoria();
  };
  const remove = async () => {
    await sb.from("promemoria").delete().eq("id", p.id);
    ctx.refreshPromemoria();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "pc-item" }, /* @__PURE__ */ React.createElement("button", { className: "pc-check" + (p.pagato ? " on" : ""), onClick: togglePagato }, p.pagato ? "\u2713" : ""), /* @__PURE__ */ React.createElement("div", { className: "desc" }, /* @__PURE__ */ React.createElement("div", { className: "t", style: { textDecoration: p.pagato ? "line-through" : "none", opacity: p.pagato ? 0.55 : 1 } }, p.descrizione), /* @__PURE__ */ React.createElement("div", { className: "m" }, "scad. ", dLabel(p.scadenza))), /* @__PURE__ */ React.createElement("span", { className: "pc-amt pc-num" }, fmt(p.valore)), /* @__PURE__ */ React.createElement("button", { className: "pc-x", onClick: remove }, "\u2715"));
}
function EntrateSec({ ctx }) {
  const { userId, anno, mese, M } = ctx;
  const [edit, setEdit] = useState(null);
  const blank = { descrizione: "", valore: "", tipo: "Occasionale", contanti: false };
  const [f, setF] = useState(blank);
  const start = (e) => {
    setEdit(e.id);
    setF({ descrizione: e.descrizione, valore: String(e.valore), tipo: e.tipo_entrata || "Occasionale", contanti: e.contanti });
  };
  const save = async () => {
    if (!f.descrizione.trim()) return;
    const payload = { user_id: userId, anno, mese, tipo_mov: "entrata", descrizione: f.descrizione.trim(), valore: parseNum(f.valore), tipo_entrata: f.tipo, contanti: f.contanti };
    if (edit) await sb.from("movimenti").update(payload).eq("id", edit);
    else await sb.from("movimenti").insert(payload);
    setF(blank);
    setEdit(null);
    ctx.refreshMovimenti();
  };
  const remove = async (id) => {
    await sb.from("movimenti").delete().eq("id", id);
    ctx.refreshMovimenti();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Entrate"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "Stipendio e incassi del mese"), /* @__PURE__ */ React.createElement("div", { className: "pc-list" }, M.entrate.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "pc-empty" }, "Nessuna entrata registrata."), M.entrate.map((e) => /* @__PURE__ */ React.createElement("div", { className: "pc-item", key: e.id }, /* @__PURE__ */ React.createElement("div", { className: "desc" }, /* @__PURE__ */ React.createElement("div", { className: "t" }, e.descrizione), /* @__PURE__ */ React.createElement("div", { className: "m" }, /* @__PURE__ */ React.createElement("span", { className: "pc-tag " + (e.tipo_entrata === "Fisso" ? "fisso" : "") }, e.tipo_entrata || "Occasionale"), e.contanti && /* @__PURE__ */ React.createElement("span", { className: "pc-tag cash" }, "contanti"))), /* @__PURE__ */ React.createElement("span", { className: "pc-amt pc-num" }, fmt(e.valore)), /* @__PURE__ */ React.createElement("button", { className: "pc-edit", onClick: () => start(e) }, "modifica"), /* @__PURE__ */ React.createElement("button", { className: "pc-x", onClick: () => remove(e.id) }, "\u2715")))), /* @__PURE__ */ React.createElement("div", { className: "pc-add" }, /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { flex: 2, minWidth: 150 } }, /* @__PURE__ */ React.createElement("label", null, "Descrizione"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: f.descrizione, onChange: (e) => setF({ ...f, descrizione: e.target.value }), placeholder: "es. Stipendio" })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 110 } }, /* @__PURE__ */ React.createElement("label", null, "Valore \u20AC"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: f.valore, onChange: (e) => setF({ ...f, valore: e.target.value }), placeholder: "0,00", inputMode: "decimal" })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 130 } }, /* @__PURE__ */ React.createElement("label", null, "Tipo"), /* @__PURE__ */ React.createElement("select", { className: "pc-in", value: f.tipo, onChange: (e) => setF({ ...f, tipo: e.target.value }) }, /* @__PURE__ */ React.createElement("option", null, "Fisso"), /* @__PURE__ */ React.createElement("option", null, "Occasionale"))), /* @__PURE__ */ React.createElement("button", { className: "pc-check" + (f.contanti ? " on" : ""), title: "contanti", style: { marginBottom: 1 }, onClick: () => setF({ ...f, contanti: !f.contanti }) }, f.contanti ? "\u20AC" : ""), /* @__PURE__ */ React.createElement("button", { className: "pc-btn", onClick: save }, edit ? "Salva" : "Aggiungi"), edit && /* @__PURE__ */ React.createElement("button", { className: "pc-btn ghost", onClick: () => {
    setF(blank);
    setEdit(null);
  } }, "Annulla")));
}
function SpeseSec({ ctx }) {
  const { userId, anno, mese, M } = ctx;
  const [edit, setEdit] = useState(null);
  const blank = { data: todayISO(), descrizione: "", valore: "", categoria: "Alimentari", contanti: false };
  const [f, setF] = useState(blank);
  const start = (s) => {
    setEdit(s.id);
    setF({ data: s.data || todayISO(), descrizione: s.descrizione, valore: String(s.valore), categoria: s.categoria, contanti: s.contanti });
  };
  const save = async () => {
    if (!f.descrizione.trim()) return;
    const payload = { user_id: userId, anno, mese, tipo_mov: "spesa", data: f.data, descrizione: f.descrizione.trim(), valore: parseNum(f.valore), categoria: f.categoria, contanti: f.contanti };
    if (edit) await sb.from("movimenti").update(payload).eq("id", edit);
    else await sb.from("movimenti").insert(payload);
    setF({ ...blank, data: f.data, categoria: f.categoria });
    setEdit(null);
    ctx.refreshMovimenti();
  };
  const remove = async (id) => {
    await sb.from("movimenti").delete().eq("id", id);
    ctx.refreshMovimenti();
  };
  const sorted = [...M.spese].sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  return /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Spese"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, M.spese.length, " movimenti"), /* @__PURE__ */ React.createElement("div", { className: "pc-list" }, sorted.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "pc-empty" }, "Nessuna spesa. Aggiungi il primo movimento sotto."), sorted.map((s) => /* @__PURE__ */ React.createElement("div", { className: "pc-item", key: s.id }, /* @__PURE__ */ React.createElement("span", { className: "pc-dot", style: { background: CAT_COLORI[s.categoria] || "#888" } }), /* @__PURE__ */ React.createElement("div", { className: "desc" }, /* @__PURE__ */ React.createElement("div", { className: "t" }, s.descrizione), /* @__PURE__ */ React.createElement("div", { className: "m" }, dLabel(s.data), " \xB7 ", s.categoria, s.contanti && /* @__PURE__ */ React.createElement("span", { className: "pc-tag cash" }, "contanti"))), /* @__PURE__ */ React.createElement("span", { className: "pc-amt pc-num" }, fmt(s.valore)), /* @__PURE__ */ React.createElement("button", { className: "pc-edit", onClick: () => start(s) }, "modifica"), /* @__PURE__ */ React.createElement("button", { className: "pc-x", onClick: () => remove(s.id) }, "\u2715")))), /* @__PURE__ */ React.createElement("div", { className: "pc-add" }, /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 140 } }, /* @__PURE__ */ React.createElement("label", null, "Data"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "pc-in", value: f.data, onChange: (e) => setF({ ...f, data: e.target.value }) })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { flex: 2, minWidth: 140 } }, /* @__PURE__ */ React.createElement("label", null, "Descrizione"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: f.descrizione, onChange: (e) => setF({ ...f, descrizione: e.target.value }), placeholder: "es. Spesa Eurospin" })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 100 } }, /* @__PURE__ */ React.createElement("label", null, "Valore \u20AC"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: f.valore, onChange: (e) => setF({ ...f, valore: e.target.value }), placeholder: "0,00", inputMode: "decimal" })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 150 } }, /* @__PURE__ */ React.createElement("label", null, "Categoria"), /* @__PURE__ */ React.createElement("select", { className: "pc-in", value: f.categoria, onChange: (e) => setF({ ...f, categoria: e.target.value }) }, CATEGORIE.map((c) => /* @__PURE__ */ React.createElement("option", { key: c }, c)))), /* @__PURE__ */ React.createElement("button", { className: "pc-check" + (f.contanti ? " on" : ""), title: "contanti", style: { marginBottom: 1 }, onClick: () => setF({ ...f, contanti: !f.contanti }) }, f.contanti ? "\u20AC" : ""), /* @__PURE__ */ React.createElement("button", { className: "pc-btn", onClick: save }, edit ? "Salva" : "Aggiungi"), edit && /* @__PURE__ */ React.createElement("button", { className: "pc-btn ghost", onClick: () => {
    setF(blank);
    setEdit(null);
  } }, "Annulla")));
}
function PromForm({ ctx }) {
  const { userId, anno, mese } = ctx;
  const blank = { scadenza: todayISO(), descrizione: "", valore: "" };
  const [f, setF] = useState(blank);
  const add = async () => {
    if (!f.descrizione.trim()) return;
    await sb.from("promemoria").insert({ user_id: userId, anno, mese, pagato: false, scadenza: f.scadenza, descrizione: f.descrizione.trim(), valore: parseNum(f.valore) });
    setF(blank);
    ctx.refreshPromemoria();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "pc-add" }, /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 140 } }, /* @__PURE__ */ React.createElement("label", null, "Scadenza"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "pc-in", value: f.scadenza, onChange: (e) => setF({ ...f, scadenza: e.target.value }) })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { flex: 2, minWidth: 140 } }, /* @__PURE__ */ React.createElement("label", null, "Descrizione"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: f.descrizione, onChange: (e) => setF({ ...f, descrizione: e.target.value }), placeholder: "es. Affitto" })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 110 } }, /* @__PURE__ */ React.createElement("label", null, "Valore \u20AC"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: f.valore, onChange: (e) => setF({ ...f, valore: e.target.value }), placeholder: "0,00", inputMode: "decimal" })), /* @__PURE__ */ React.createElement("button", { className: "pc-btn", onClick: add }, "Aggiungi"));
}
function BudgetView({ ctx }) {
  const { userId, anno, mese, M, perCat, totSpese } = ctx;
  const totBudget = CATEGORIE.reduce((a, c) => a + (Number(M.budget[c]) || 0), 0);
  const pieData = CATEGORIE.map((c) => ({ name: c, value: perCat[c], color: CAT_COLORI[c] })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const setBudgetVal = async (cat, val) => {
    await sb.from("budget").upsert({ user_id: userId, anno, mese, categoria: cat, valore: parseNum(val) }, { onConflict: "user_id,anno,mese,categoria" });
    ctx.refreshBudget();
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "pc-note" }, "Il ", /* @__PURE__ */ React.createElement("b", null, "budget previsionale"), " \xE8 il tetto che ti dai per categoria. Il ", /* @__PURE__ */ React.createElement("b", null, "rimanente"), " \xE8 quanto ti resta: verde se sei sotto budget, rosso se l'hai sforato."), /* @__PURE__ */ React.createElement("div", { className: "pc-split" }, /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Budget vs speso"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "Tetto totale ", fmt(totBudget), " \xB7 speso ", fmt(totSpese)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, CATEGORIE.map((c) => {
    const b = Number(M.budget[c]) || 0;
    const sp = perCat[c] || 0;
    const rem = b - sp;
    const pct = b > 0 ? Math.min(100, sp / b * 100) : sp > 0 ? 100 : 0;
    return /* @__PURE__ */ React.createElement("div", { className: "pc-brow", key: c }, /* @__PURE__ */ React.createElement("div", { className: "nm", style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "pc-dot", style: { background: CAT_COLORI[c] } }), c), /* @__PURE__ */ React.createElement("div", { className: "bx" }, /* @__PURE__ */ React.createElement("div", { className: "pc-bar" }, /* @__PURE__ */ React.createElement("i", { style: { width: pct + "%", background: rem < 0 ? "var(--neg)" : "var(--accent)" } })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 3 } }, /* @__PURE__ */ React.createElement("input", { className: "pc-in pc-num", style: { width: 78, padding: "2px 6px", fontSize: 11 }, defaultValue: b || "", placeholder: "budget", onBlur: (e) => setBudgetVal(c, e.target.value) }), /* @__PURE__ */ React.createElement("span", { className: "pc-num" }, "speso ", fmtN(sp)))), /* @__PURE__ */ React.createElement("div", { className: "rr pc-num", style: { color: rem < 0 ? "var(--neg)" : "var(--pos)" } }, fmtN(rem)));
  }))), /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Resoconto spese"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "Dove sono andati i soldi questo mese"), /* @__PURE__ */ React.createElement(DonutChart, { data: pieData }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, pieData.map((d) => /* @__PURE__ */ React.createElement("div", { key: d.name, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" } }, /* @__PURE__ */ React.createElement("span", { className: "pc-dot", style: { background: d.color } }), /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, d.name), /* @__PURE__ */ React.createElement("span", { className: "pc-num", style: { color: "var(--muted)" } }, totSpese > 0 ? (d.value / totSpese * 100).toFixed(1) : 0, "%"), /* @__PURE__ */ React.createElement("span", { className: "pc-num", style: { fontWeight: 600, width: 78, textAlign: "right" } }, fmt(d.value))))))));
}
function ContantiView({ ctx }) {
  const { M } = ctx;
  const entCash = M.entrate.filter((e) => e.contanti).reduce((a, b) => a + Number(b.valore), 0);
  const entCard = M.entrate.filter((e) => !e.contanti).reduce((a, b) => a + Number(b.valore), 0);
  const speCash = M.spese.filter((s) => s.contanti).reduce((a, b) => a + Number(b.valore), 0);
  const speCard = M.spese.filter((s) => !s.contanti).reduce((a, b) => a + Number(b.valore), 0);
  const catCash = {};
  CATEGORIE.forEach((c) => catCash[c] = 0);
  M.spese.filter((s) => s.contanti).forEach((s) => catCash[s.categoria] += Number(s.valore));
  const cashCatList = CATEGORIE.map((c) => ({ c, v: catCash[c] })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const saldoCash = entCash - speCash;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "pc-note" }, "Traccia quanto entra e esce in ", /* @__PURE__ */ React.createElement("b", null, "contanti"), " rispetto al bancomat. Segna un movimento come contante con il tasto ", /* @__PURE__ */ React.createElement("b", { style: { color: "var(--cash)" } }, "\u20AC"), " in fase di inserimento."), /* @__PURE__ */ React.createElement("div", { className: "pc-cards" }, /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-a" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Entrate contanti"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: entCash, color: "var(--cash)" }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-b" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Spese contanti"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: speCash, color: "var(--cash)" }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-c" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Saldo contanti"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: saldoCash, color: "auto" })))), /* @__PURE__ */ React.createElement("div", { className: "pc-split" }, /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Contanti vs bancomat"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "Confronto sul mese"), /* @__PURE__ */ React.createElement(CompareBars, { rows: [{ label: "Entrate", a: entCash, b: entCard }, { label: "Spese", a: speCash, b: speCard }] })), /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Contanti per categoria"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "Per cosa spendi il contante"), cashCatList.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "pc-empty" }, "Nessuna spesa in contanti questo mese.") : cashCatList.map((x) => /* @__PURE__ */ React.createElement("div", { className: "pc-brow", key: x.c }, /* @__PURE__ */ React.createElement("div", { className: "nm", style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { className: "pc-dot", style: { background: CAT_COLORI[x.c] } }), x.c), /* @__PURE__ */ React.createElement("div", { className: "bx" }, /* @__PURE__ */ React.createElement("div", { className: "pc-bar" }, /* @__PURE__ */ React.createElement("i", { style: { width: (speCash > 0 ? x.v / speCash * 100 : 0) + "%", background: "var(--cash)" } }))), /* @__PURE__ */ React.createElement("div", { className: "rr pc-num" }, fmt(x.v)))))));
}
function ObiettiviView({ ctx }) {
  const { userId, anno, mese, obiettivi } = ctx;
  const [nf, setNf] = useState({ nome: "", target: "" });
  const totTarget = obiettivi.reduce((a, g) => a + Number(g.target), 0);
  const accOf = (g) => (g.accantonamenti || []).reduce((a, b) => a + Number(b.valore), 0);
  const totAcc = obiettivi.reduce((a, g) => a + accOf(g), 0);
  const addGoal = async () => {
    if (!nf.nome.trim()) return;
    await sb.from("obiettivi").insert({ user_id: userId, anno, nome: nf.nome.trim(), target: parseNum(nf.target), obiettivo_mensile: 0 });
    setNf({ nome: "", target: "" });
    ctx.refreshObiettivi();
  };
  const removeGoal = async (id) => {
    await sb.from("obiettivi").delete().eq("id", id);
    ctx.refreshObiettivi();
  };
  const setAccantonamento = async (g, val) => {
    const v = parseNum(val);
    if (v > 0) await sb.from("accantonamenti").upsert({ user_id: userId, obiettivo_id: g.id, mese, valore: v }, { onConflict: "user_id,obiettivo_id,mese" });
    else await sb.from("accantonamenti").delete().eq("obiettivo_id", g.id).eq("mese", mese);
    ctx.refreshObiettivi();
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "pc-cards" }, /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-a" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Totale obiettivi"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: totTarget }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-b" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Accantonato"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: totAcc, color: "var(--pos)" }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-c" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Rimanente"), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: totTarget - totAcc })))), obiettivi.map((g) => {
    const acc = accOf(g);
    const pct = g.target > 0 ? Math.min(100, acc / g.target * 100) : 0;
    const thisMonth = (g.accantonamenti || []).find((a) => a.mese === mese)?.valore || "";
    return /* @__PURE__ */ React.createElement("div", { className: "pc-goal", key: g.id }, /* @__PURE__ */ React.createElement("div", { className: "gh" }, /* @__PURE__ */ React.createElement("b", null, g.nome), /* @__PURE__ */ React.createElement("span", { className: "pc-num", style: { color: "var(--muted)", fontSize: 13 } }, fmt(acc), " / ", fmt(g.target))), /* @__PURE__ */ React.createElement("div", { className: "pc-bar" }, /* @__PURE__ */ React.createElement("i", { style: { width: pct + "%", background: "var(--pos)" } })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9, gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, pct.toFixed(0), "% raggiunto \xB7 manca ", fmt(g.target - acc)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "var(--muted)" } }, "accantona a ", mese.toLowerCase(), ":"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "pc-in pc-num",
        style: { width: 90, padding: "5px 8px" },
        defaultValue: thisMonth || "",
        placeholder: "0,00",
        inputMode: "decimal",
        onBlur: (e) => setAccantonamento(g, e.target.value)
      }
    ), /* @__PURE__ */ React.createElement("button", { className: "pc-x", title: "elimina obiettivo", onClick: () => removeGoal(g.id) }, "\u2715"))));
  }), /* @__PURE__ */ React.createElement("div", { className: "pc-add", style: { marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { flex: 2, minWidth: 160 } }, /* @__PURE__ */ React.createElement("label", null, "Nuovo obiettivo"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: nf.nome, onChange: (e) => setNf({ ...nf, nome: e.target.value }), placeholder: "es. Vacanza estate" })), /* @__PURE__ */ React.createElement("div", { className: "pc-f", style: { width: 130 } }, /* @__PURE__ */ React.createElement("label", null, "Importo \u20AC"), /* @__PURE__ */ React.createElement("input", { className: "pc-in", value: nf.target, onChange: (e) => setNf({ ...nf, target: e.target.value }), placeholder: "0,00", inputMode: "decimal" })), /* @__PURE__ */ React.createElement("button", { className: "pc-btn", onClick: addGoal }, "Crea obiettivo")));
}
function AnnoView({ movimenti, anno }) {
  const rows = MESI.map((m) => {
    const ms = movimenti.filter((x) => x.mese === m);
    const e = ms.filter((x) => x.tipo_mov === "entrata").reduce((a, b) => a + Number(b.valore), 0);
    const s = ms.filter((x) => x.tipo_mov === "spesa").reduce((a, b) => a + Number(b.valore), 0);
    return { mese: m, entrate: e, spese: s, risparmio: e - s };
  });
  const tot = rows.reduce((a, r) => ({ entrate: a.entrate + r.entrate, spese: a.spese + r.spese, risparmio: a.risparmio + r.risparmio }), { entrate: 0, spese: 0, risparmio: 0 });
  const chart = rows.filter((r) => r.entrate || r.spese);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "pc-cards" }, /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-a" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Entrate ", anno), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: tot.entrate }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-b" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Spese ", anno), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: tot.spese }))), /* @__PURE__ */ React.createElement("div", { className: "pc-card tint-c" }, /* @__PURE__ */ React.createElement("div", { className: "k" }, "Risparmio ", anno), /* @__PURE__ */ React.createElement("div", { className: "v" }, /* @__PURE__ */ React.createElement(Money, { v: tot.risparmio, color: "auto" })))), /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Andamento mensile"), /* @__PURE__ */ React.createElement("div", { className: "sub" }, "Entrate, uscite e risparmio"), /* @__PURE__ */ React.createElement(TrendChart, { rows: chart })), /* @__PURE__ */ React.createElement("div", { className: "pc-sec" }, /* @__PURE__ */ React.createElement("h3", null, "Riepilogo annuale"), /* @__PURE__ */ React.createElement("table", { className: "pc-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Mese"), /* @__PURE__ */ React.createElement("th", null, "Entrate"), /* @__PURE__ */ React.createElement("th", null, "Uscite"), /* @__PURE__ */ React.createElement("th", null, "Risparmi"))), /* @__PURE__ */ React.createElement("tbody", null, rows.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.mese }, /* @__PURE__ */ React.createElement("td", null, r.mese), /* @__PURE__ */ React.createElement("td", { className: "pc-num" }, fmtN(r.entrate)), /* @__PURE__ */ React.createElement("td", { className: "pc-num" }, fmtN(r.spese)), /* @__PURE__ */ React.createElement("td", { className: "pc-num", style: { color: r.risparmio < 0 ? "var(--neg)" : r.risparmio > 0 ? "var(--pos)" : "var(--ink)", fontWeight: 600 } }, fmtN(r.risparmio)))), /* @__PURE__ */ React.createElement("tr", { style: { borderTop: "2px solid var(--ink)" } }, /* @__PURE__ */ React.createElement("td", { style: { fontWeight: 700 } }, "TOTALE"), /* @__PURE__ */ React.createElement("td", { className: "pc-num", style: { fontWeight: 700 } }, fmtN(tot.entrate)), /* @__PURE__ */ React.createElement("td", { className: "pc-num", style: { fontWeight: 700 } }, fmtN(tot.spese)), /* @__PURE__ */ React.createElement("td", { className: "pc-num", style: { fontWeight: 700, color: tot.risparmio < 0 ? "var(--neg)" : "var(--pos)" } }, fmtN(tot.risparmio)))))));
}
function Root() {
  const [session, setSession] = useState(void 0);
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!CONFIG_OK) return /* @__PURE__ */ React.createElement(ConfigWarning, null);
  if (session === void 0) return /* @__PURE__ */ React.createElement("div", { className: "pc-root" }, /* @__PURE__ */ React.createElement("style", null, CSS), /* @__PURE__ */ React.createElement("div", { className: "pc-loading" }, "Carico\u2026"));
  if (session === null) return /* @__PURE__ */ React.createElement(Login, null);
  return /* @__PURE__ */ React.createElement(App, { session });
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(Root, null));
