import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ─── YDUQS Logo SVG ───────────────────────────────────────────────────────────
const YDUQSLogo = ({ size = 140 }) => (
  <svg width={size} height={size * 0.28} viewBox="0 0 500 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="110" fontFamily="'Georgia', serif" fontWeight="900" fontSize="130" fill="#0D2160">YDU</text>
    <text x="310" y="110" fontFamily="'Georgia', serif" fontWeight="900" fontSize="130" fill="#2DBFBF">Q</text>
    <text x="415" y="110" fontFamily="'Georgia', serif" fontWeight="900" fontSize="130" fill="#0D2160">S</text>
  </svg>
);

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  navy: "#0D2160", navyMid: "#1A3A8A", navyLight: "#2952B3",
  teal: "#2DBFBF", tealDark: "#1A9A9A", tealLight: "#5DCFCF",
  white: "#FFFFFF", gray50: "#F7F9FC", gray100: "#EDF1F7",
  gray200: "#D4DCE8", gray400: "#8898AA", gray600: "#4A5568", gray800: "#1A202C",
  red: "#E53E3E", green: "#38A169", amber: "#D69E2E",
};

// ─── DB HELPERS (Supabase) ────────────────────────────────────────────────────
const db = {
  // USERS
  async getUsers() {
    const { data } = await supabase.from("users").select("*").order("created_at");
    return data || [];
  },
  async upsertUser(user) {
    const { error } = await supabase.from("users").upsert(user);
    if (error) throw error;
  },
  async deleteUser(id) {
    await supabase.from("users").delete().eq("id", id);
  },
  async loginUser(email, password) {
    const { data } = await supabase.from("users")
      .select("*").eq("active", true)
      .ilike("email", email).eq("password", password).single();
    return data;
  },
  async ensureAdmin() {
    const { data } = await supabase.from("users").select("id").eq("role", "admin").limit(1);
    if (!data || data.length === 0) {
      await supabase.from("users").insert({
        id: "admin1", name: "Administrador", email: "admin@yduqs.com.br",
        password: "Admin@123", role: "admin", active: true
      });
    }
  },
  // UNITS
  async getUnits() {
    const { data } = await supabase.from("units").select("*").order("created_at");
    return data || [];
  },
  async upsertUnit(unit) {
    const { error } = await supabase.from("units").upsert(unit);
    if (error) throw error;
  },
  async deleteUnit(id) {
    await supabase.from("units").delete().eq("id", id);
  },
  // SWITCHES
  async getSwitches() {
    const { data } = await supabase.from("switches").select("*").order("created_at");
    return data || [];
  },
  async upsertSwitch(sw) {
    const row = {
      id: sw.id, unit_id: sw.unitId, name: sw.name, brand: sw.brand,
      model: sw.model, port_count: sw.portCount, is_poe: sw.isPoe,
      created_by: sw.createdBy, created_at: sw.createdAt
    };
    const { error } = await supabase.from("switches").upsert(row);
    if (error) throw error;
  },
  async deleteSwitch(id) {
    await supabase.from("switches").delete().eq("id", id);
  },
  // PORTS
  async getPorts() {
    const { data } = await supabase.from("ports").select("*");
    return data || [];
  },
  async upsertPort(p) {
    const row = {
      id: p.id, switch_id: p.switchId, port_number: p.portNumber,
      link_type: p.linkType || "access", uplink_target: p.uplinkTarget || null,
      uplink_direction: p.uplinkDirection || null, patch_panel: p.patchPanel || null,
      sector: p.sector || null, desk: p.desk || null
    };
    const { error } = await supabase.from("ports").upsert(row);
    if (error) throw error;
  },
  async deletePort(id) {
    await supabase.from("ports").delete().eq("id", id);
  },
};

// Map DB rows → app objects
const mapSwitch = r => ({ id: r.id, unitId: r.unit_id, name: r.name, brand: r.brand, model: r.model, portCount: r.port_count, isPoe: r.is_poe, createdBy: r.created_by, createdAt: r.created_at });
const mapPort   = r => ({ id: r.id, switchId: r.switch_id, portNumber: r.port_number, linkType: r.link_type, uplinkTarget: r.uplink_target, uplinkDirection: r.uplink_direction, patchPanel: r.patch_panel, sector: r.sector, desk: r.desk });

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: ${C.gray50}; color: ${C.gray800}; }
    input, select, textarea { font-family: 'DM Sans', sans-serif; }
    button { font-family: 'DM Sans', sans-serif; cursor: pointer; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }
    .fade-in { animation: fadeIn .4s ease both; }
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background: ${C.gray100}; }
    ::-webkit-scrollbar-thumb { background: ${C.navyLight}; border-radius:3px; }
  `}</style>
);

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, style: sx }) => {
  const base = { border: "none", borderRadius: 8, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", transition: "all .2s", display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? .6 : 1 };
  const sizes = { sm: { padding: "6px 14px", fontSize: 13 }, md: { padding: "10px 20px", fontSize: 14 }, lg: { padding: "14px 28px", fontSize: 16 } };
  const variants = {
    primary:  { background: `linear-gradient(135deg,${C.navyMid},${C.navyLight})`, color: C.white, boxShadow: "0 2px 8px rgba(13,33,96,.25)" },
    teal:     { background: `linear-gradient(135deg,${C.teal},${C.tealDark})`,     color: C.white, boxShadow: "0 2px 8px rgba(45,191,191,.3)" },
    outline:  { background: "transparent", color: C.navy, border: `2px solid ${C.navy}` },
    ghost:    { background: "transparent", color: C.gray600, border: `1px solid ${C.gray200}` },
    danger:   { background: `linear-gradient(135deg,#E53E3E,#C53030)`, color: C.white },
    success:  { background: `linear-gradient(135deg,#38A169,#276749)`, color: C.white },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...sx }}>{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required, options, style: sx }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>{label}{required && <span style={{ color: C.red }}> *</span>}</label>}
    {type === "select" ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `2px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, background: C.white, color: C.gray800, outline: "none", ...sx }}>
        <option value="">Selecione...</option>
        {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : type === "checkbox" ? (
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.teal }} />
        <span style={{ fontSize: 14, color: C.gray600 }}>{placeholder}</span>
      </label>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        style={{ width: "100%", padding: "10px 14px", border: `2px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, outline: "none", transition: "border .2s", ...sx }}
        onFocus={e => e.target.style.borderColor = C.teal}
        onBlur={e => e.target.style.borderColor = C.gray200}
      />
    )}
  </div>
);

const Card = ({ children, style: sx }) => (
  <div style={{ background: C.white, borderRadius: 16, padding: 24, boxShadow: "0 2px 16px rgba(13,33,96,.08)", border: `1px solid ${C.gray100}`, ...sx }}>{children}</div>
);

const Badge = ({ children, color = "navy" }) => {
  const colors = { navy: { bg: `${C.navy}15`, text: C.navy }, teal: { bg: `${C.teal}20`, text: C.tealDark }, green: { bg: "#38A16920", text: "#276749" }, amber: { bg: "#D69E2E20", text: "#975A16" }, red: { bg: "#E53E3E15", text: "#C53030" }, gray: { bg: C.gray100, text: C.gray600 } };
  const c = colors[color] || colors.navy;
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text }}>{children}</span>;
};

const Modal = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,33,96,.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fade-in" style={{ background: C.white, borderRadius: 20, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(13,33,96,.25)" }}>
        <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(135deg,${C.navy},${C.navyMid})`, borderRadius: "20px 20px 0 0" }}>
          <h3 style={{ color: C.white, fontSize: 18, fontFamily: "'Syne',sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.white, fontSize: 22, cursor: "pointer", opacity: .8 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

const Alert = ({ msg, type = "error" }) => {
  if (!msg) return null;
  const colors = { error: { bg: "#FED7D7", border: C.red, text: C.red }, success: { bg: "#C6F6D5", border: C.green, text: C.green }, info: { bg: "#BEE3F8", border: "#3182CE", text: "#2C5282" } };
  const c = colors[type];
  return <div style={{ padding: "10px 16px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text, fontSize: 13, marginBottom: 16 }}>{msg}</div>;
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErr(""); setLoading(true);
    try {
      const user = await db.loginUser(email, password);
      if (!user) { setErr("E-mail ou senha incorretos, ou usuário inativo."); }
      else { onLogin(user); }
    } catch { setErr("Erro ao conectar. Verifique sua conexão."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 50%,${C.tealDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {[...Array(8)].map((_, i) => <div key={i} style={{ position: "absolute", borderRadius: "50%", border: `1px solid rgba(255,255,255,.06)`, width: 200+i*80, height: 200+i*80, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />)}
      </div>
      <div className="fade-in" style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <div style={{ background: "rgba(255,255,255,.97)", borderRadius: 24, padding: "40px 36px", boxShadow: "0 24px 80px rgba(0,0,0,.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><YDUQSLogo size={160} /></div>
            <div style={{ width: 40, height: 3, background: `linear-gradient(90deg,${C.teal},${C.navyLight})`, borderRadius: 2, margin: "0 auto 16px" }} />
            <p style={{ color: C.gray600, fontSize: 14 }}>Gerenciamento de Rede — TI</p>
          </div>
          <Alert msg={err} />
          <Input label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@yduqs.com.br" required />
          <Input label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
          <Btn onClick={handleLogin} disabled={loading || !email || !password} style={{ width: "100%", justifyContent: "center", padding: "13px" }} size="lg">
            {loading ? "Entrando..." : "Entrar"}
          </Btn>
          <p style={{ textAlign: "center", fontSize: 12, color: C.gray400, marginTop: 20 }}>Acesso restrito a colaboradores autorizados</p>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ user, currentPage, setPage, onLogout }) {
  const navItems = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "units",     icon: "🏢", label: "Unidades" },
    { id: "switches",  icon: "🔌", label: "Switches" },
    { id: "report",    icon: "📊", label: "Relatório" },
    ...(user.role === "admin" ? [{ id: "users", icon: "👥", label: "Usuários" }] : []),
  ];
  return (
    <div style={{ width: 240, minHeight: "100vh", background: `linear-gradient(180deg,${C.navy} 0%,${C.navyMid} 100%)`, display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 100 }}>
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
        <YDUQSLogo size={130} />
        <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,.5)", letterSpacing: 2, textTransform: "uppercase" }}>Network Manager</div>
      </div>
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer", marginBottom: 4, transition: "all .2s", textAlign: "left", background: currentPage === item.id ? `linear-gradient(135deg,${C.teal},${C.tealDark})` : "transparent", color: currentPage === item.id ? C.white : "rgba(255,255,255,.65)", fontWeight: currentPage === item.id ? 600 : 400, fontSize: 14 }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.07)", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 4 }}><Badge color="teal">{user.role === "admin" ? "Admin" : "Técnico"}</Badge></div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "rgba(255,255,255,.7)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          ⎋ Sair
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user }) {
  const [stats, setStats] = useState({ units: 0, switches: 0, ports: 0, uplinks: 0 });
  useEffect(() => {
    (async () => {
      const [units, switches, ports] = await Promise.all([db.getUnits(), db.getSwitches(), db.getPorts()]);
      const p = ports.map(mapPort);
      setStats({ units: units.length, switches: switches.length, ports: p.length, uplinks: p.filter(x => x.linkType !== "access").length });
    })();
  }, []);
  const cards = [
    { label: "Unidades",          value: stats.units,    icon: "🏢",  color: C.navy },
    { label: "Switches",          value: stats.switches,  icon: "🔌",  color: C.navyLight },
    { label: "Portas Cadastradas",value: stats.ports,     icon: "🔗",  color: C.teal },
    { label: "Links inter-switch",value: stats.uplinks,   icon: "⬆⬇", color: C.tealDark },
  ];
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: C.navy }}>Bem-vindo, {user.name.split(" ")[0]}!</h1>
        <p style={{ color: C.gray400, marginTop: 4 }}>Visão geral da infraestrutura de rede</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 20, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: C.white, borderRadius: 16, padding: "24px 20px", boxShadow: "0 2px 16px rgba(13,33,96,.08)", borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: c.color, fontFamily: "'Syne',sans-serif" }}>{c.value}</div>
            <div style={{ fontSize: 13, color: C.gray400, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <Card>
        <h3 style={{ fontFamily: "'Syne',sans-serif", color: C.navy, marginBottom: 12 }}>Acesso Rápido</h3>
        <p style={{ color: C.gray600, fontSize: 14, lineHeight: 1.7 }}>
          Use o menu lateral para navegar. Cadastre uma <strong>Unidade</strong>, adicione os <strong>Switches</strong>, configure as <strong>Portas</strong> e gere o <strong>Relatório</strong> completo com capa, índice e página por switch.
        </p>
      </Card>
    </div>
  );
}

// ─── UNITS ────────────────────────────────────────────────────────────────────
function UnitsView({ user }) {
  const [units, setUnits] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", technician: "" });
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => { setUnits(await db.getUnits()); }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name || !form.address || !form.technician) { setErr("Preencha todos os campos."); return; }
    try {
      await db.upsertUnit({ id: editId || `unit_${Date.now()}`, name: form.name, address: form.address, technician: form.technician, created_by: user.id, created_at: new Date().toISOString() });
      setModal(false); setForm({ name: "", address: "", technician: "" }); setEditId(null);
      setSuccess("Unidade salva!"); load(); setTimeout(() => setSuccess(""), 3000);
    } catch (e) { setErr("Erro ao salvar: " + e.message); }
  };

  const del = async (id) => {
    if (!confirm("Excluir esta unidade? Switches e portas vinculados também serão removidos.")) return;
    await db.deleteUnit(id); load();
  };

  const openEdit = (u) => { setForm({ name: u.name, address: u.address, technician: u.technician }); setEditId(u.id); setErr(""); setModal(true); };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: C.navy }}>Unidades</h1>
          <p style={{ color: C.gray400, fontSize: 14, marginTop: 2 }}>Gerencie as unidades da YDUQS</p>
        </div>
        <Btn onClick={() => { setForm({ name: "", address: "", technician: "" }); setEditId(null); setErr(""); setModal(true); }} variant="teal">+ Nova Unidade</Btn>
      </div>
      <Alert msg={success} type="success" />
      {units.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}><div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div><p style={{ color: C.gray400 }}>Nenhuma unidade cadastrada ainda.</p></Card>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {units.map(u => (
            <Card key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>🏢</span>
                  <h3 style={{ fontFamily: "'Syne',sans-serif", color: C.navy, fontSize: 16 }}>{u.name}</h3>
                </div>
                <div style={{ fontSize: 13, color: C.gray600, marginLeft: 30 }}>📍 {u.address}</div>
                <div style={{ fontSize: 13, color: C.gray600, marginLeft: 30 }}>👤 Técnico: {u.technician}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" size="sm" onClick={() => openEdit(u)}>✏️ Editar</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(u.id)}>🗑️ Excluir</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Editar Unidade" : "Nova Unidade"}>
        <Alert msg={err} />
        <Input label="Nome da Unidade" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ex: Unidade Centro — Rio de Janeiro" required />
        <Input label="Endereço" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Rua, número, bairro, cidade" required />
        <Input label="Técnico Local" value={form.technician} onChange={v => setForm(f => ({ ...f, technician: v }))} placeholder="Nome do técnico responsável" required />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="teal" onClick={save}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── SWITCHES & PORTS ─────────────────────────────────────────────────────────
function SwitchesView({ user }) {
  const [units, setUnits]         = useState([]);
  const [switches, setSwitches]   = useState([]);
  const [ports, setPorts]         = useState([]);
  const [selectedUnit, setSelectedUnit]     = useState(null);
  const [selectedSwitch, setSelectedSwitch] = useState(null);
  const [swModal, setSwModal]     = useState(false);
  const [portModal, setPortModal] = useState(false);
  const [editSwId, setEditSwId]   = useState(null);
  const [editPortId, setEditPortId] = useState(null);
  const [swForm, setSwForm]   = useState({ name: "", brand: "", model: "", portCount: "", isPoe: false });
  const [portForm, setPortForm] = useState({ portNumber: "", linkType: "access", uplinkTarget: "", uplinkDirection: "recebe", patchPanel: "", sector: "", desk: "" });
  const [err, setErr]         = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const [u, sw, p] = await Promise.all([db.getUnits(), db.getSwitches(), db.getPorts()]);
    setUnits(u); setSwitches(sw.map(mapSwitch)); setPorts(p.map(mapPort));
  }, []);
  useEffect(() => { load(); }, [load]);

  const unitSwitches = switches.filter(s => s.unitId === selectedUnit?.id);
  const switchPorts  = ports.filter(p => p.switchId === selectedSwitch?.id).sort((a,b) => Number(a.portNumber)-Number(b.portNumber));
  const portGrid     = Array.from({ length: Number(selectedSwitch?.portCount || 0) }, (_, i) => String(i+1));

  const saveSw = async () => {
    if (!swForm.name || !swForm.brand || !swForm.model || !swForm.portCount) { setErr("Preencha todos os campos obrigatórios."); return; }
    try {
      await db.upsertSwitch({ id: editSwId || `sw_${Date.now()}`, unitId: selectedUnit.id, ...swForm, createdBy: user.id, createdAt: new Date().toISOString() });
      setSwModal(false); setSwForm({ name:"", brand:"", model:"", portCount:"", isPoe:false }); setEditSwId(null);
      setSuccess("Switch salvo!"); load(); setTimeout(() => setSuccess(""), 3000);
    } catch (e) { setErr("Erro: " + e.message); }
  };

  const delSw = async (id) => {
    if (!confirm("Excluir este switch? As portas também serão removidas.")) return;
    await db.deleteSwitch(id);
    if (selectedSwitch?.id === id) setSelectedSwitch(null);
    load();
  };

  const savePort = async () => {
    if (!portForm.portNumber) { setErr("Informe o número da porta."); return; }
    const max = Number(selectedSwitch.portCount);
    if (Number(portForm.portNumber) < 1 || Number(portForm.portNumber) > max) { setErr(`Porta deve ser entre 1 e ${max}.`); return; }
    const dup = ports.find(p => p.switchId === selectedSwitch.id && p.portNumber === portForm.portNumber && p.id !== editPortId);
    if (dup) { setErr("Esta porta já está cadastrada."); return; }
    try {
      await db.upsertPort({ id: editPortId || `port_${Date.now()}`, switchId: selectedSwitch.id, ...portForm });
      setPortModal(false); setPortForm({ portNumber:"", linkType:"access", uplinkTarget:"", uplinkDirection:"recebe", patchPanel:"", sector:"", desk:"" }); setEditPortId(null);
      setSuccess("Porta salva!"); load(); setTimeout(() => setSuccess(""), 3000);
    } catch (e) { setErr("Erro: " + e.message); }
  };

  const delPort = async (id) => {
    if (!confirm("Excluir esta porta?")) return;
    await db.deletePort(id); load();
  };

  const openEditSw   = sw => { setSwForm({ name:sw.name, brand:sw.brand, model:sw.model, portCount:sw.portCount, isPoe:sw.isPoe }); setEditSwId(sw.id); setErr(""); setSwModal(true); };
  const openEditPort = p  => { setPortForm({ portNumber:p.portNumber, linkType:p.linkType||"access", uplinkTarget:p.uplinkTarget||"", uplinkDirection:p.uplinkDirection||"recebe", patchPanel:p.patchPanel||"", sector:p.sector||"", desk:p.desk||"" }); setEditPortId(p.id); setErr(""); setPortModal(true); };

  // ── render ──
  return (
    <div className="fade-in">
      <Alert msg={success} type="success" />

      {!selectedUnit ? (
        <>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:C.navy }}>Switches & Portas</h1>
            <p style={{ color:C.gray400, fontSize:14, marginTop:2 }}>Selecione uma unidade para gerenciar seus switches</p>
          </div>
          {units.length === 0
            ? <Card style={{ textAlign:"center", padding:48 }}><p style={{ color:C.gray400 }}>Nenhuma unidade cadastrada. Vá em Unidades para criar.</p></Card>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                {units.map(u => (
                  <div key={u.id} onClick={() => setSelectedUnit(u)}
                    style={{ background:C.white, borderRadius:16, padding:24, border:`2px solid ${C.gray100}`, cursor:"pointer", transition:"all .2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=C.gray100; e.currentTarget.style.transform="translateY(0)"; }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>🏢</div>
                    <h3 style={{ fontFamily:"'Syne',sans-serif", color:C.navy, marginBottom:6 }}>{u.name}</h3>
                    <p style={{ fontSize:13, color:C.gray600 }}>📍 {u.address}</p>
                    <p style={{ fontSize:13, color:C.gray600 }}>👤 {u.technician}</p>
                    <div style={{ marginTop:12 }}><Badge color="teal">{switches.filter(s=>s.unitId===u.id).length} switches</Badge></div>
                  </div>
                ))}
              </div>}
        </>

      ) : !selectedSwitch ? (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <div>
              <button onClick={() => setSelectedUnit(null)} style={{ background:"none", border:"none", color:C.teal, cursor:"pointer", fontSize:14, marginBottom:4 }}>← Voltar às Unidades</button>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.navy }}>🏢 {selectedUnit.name}</h1>
              <p style={{ color:C.gray400, fontSize:13 }}>Switches desta unidade</p>
            </div>
            <Btn variant="teal" onClick={() => { setSwForm({ name:"", brand:"", model:"", portCount:"", isPoe:false }); setEditSwId(null); setErr(""); setSwModal(true); }}>+ Novo Switch</Btn>
          </div>
          {unitSwitches.length === 0
            ? <Card style={{ textAlign:"center", padding:48 }}><div style={{ fontSize:48, marginBottom:12 }}>🔌</div><p style={{ color:C.gray400 }}>Nenhum switch cadastrado.</p></Card>
            : <div style={{ display:"grid", gap:14 }}>
                {unitSwitches.map(sw => {
                  const cnt = ports.filter(p=>p.switchId===sw.id).length;
                  return (
                    <Card key={sw.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ flex:1, cursor:"pointer" }} onClick={() => setSelectedSwitch(sw)}>
                        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontSize:22 }}>🔌</span>
                          <h3 style={{ fontFamily:"'Syne',sans-serif", color:C.navy }}>{sw.name}</h3>
                          {sw.isPoe && <Badge color="amber">POE</Badge>}
                        </div>
                        <div style={{ display:"flex", gap:16, fontSize:13, color:C.gray600, marginLeft:32 }}>
                          <span>🏷️ {sw.brand} {sw.model}</span>
                          <span>🔢 {sw.portCount} portas</span>
                          <span>🔗 {cnt} cadastradas</span>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <Btn size="sm" variant="teal" onClick={() => setSelectedSwitch(sw)}>Portas</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => openEditSw(sw)}>✏️</Btn>
                        <Btn size="sm" variant="danger" onClick={() => delSw(sw.id)}>🗑️</Btn>
                      </div>
                    </Card>
                  );
                })}
              </div>}
        </>

      ) : (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <button onClick={() => setSelectedSwitch(null)} style={{ background:"none", border:"none", color:C.teal, cursor:"pointer", fontSize:14, marginBottom:4 }}>← Voltar aos Switches</button>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.navy }}>🔌 {selectedSwitch.name}</h1>
              <p style={{ color:C.gray400, fontSize:13 }}>{selectedSwitch.brand} {selectedSwitch.model} · {selectedSwitch.portCount} portas {selectedSwitch.isPoe?"· POE":""}</p>
            </div>
            <Btn variant="teal" onClick={() => { setPortForm({ portNumber:"", linkType:"access", uplinkTarget:"", uplinkDirection:"recebe", patchPanel:"", sector:"", desk:"" }); setEditPortId(null); setErr(""); setPortModal(true); }}>+ Cadastrar Porta</Btn>
          </div>

          {/* Visual port panel */}
          <Card style={{ marginBottom:20 }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", color:C.navy, marginBottom:14, fontSize:15 }}>Painel Visual de Portas</h3>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {portGrid.map(num => {
                const p = switchPorts.find(pp => pp.portNumber === num);
                const lt = p?.linkType || "access";
                const bg = !p ? C.gray200 : lt==="uplink" ? C.teal : lt==="downlink" ? C.navyLight : C.green;
                const fg = !p ? C.gray400 : C.white;
                return (
                  <div key={num} title={!p ? `Porta ${num}: Livre` : `${num}: ${lt}`}
                    onClick={() => { if(p) openEditPort(p); else { setPortForm({ portNumber:num, linkType:"access", uplinkTarget:"", uplinkDirection:"recebe", patchPanel:"", sector:"", desk:"" }); setEditPortId(null); setErr(""); setPortModal(true); }}}
                    style={{ width:44, height:44, borderRadius:8, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:fg, cursor:"pointer", border:`2px solid ${!p?C.gray200:"transparent"}`, transition:"all .15s" }}>
                    {num}
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:16, marginTop:14, fontSize:12, color:C.gray600 }}>
              {[["Livre",C.gray200],["Acesso",C.green],["Uplink",C.teal],["Downlink",C.navyLight]].map(([l,c]) => (
                <span key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:14, height:14, borderRadius:3, background:c, display:"inline-block", border: l==="Livre"?`1px solid ${C.gray400}`:"none" }} />{l}
                </span>
              ))}
            </div>
          </Card>

          {/* Port table */}
          {switchPorts.length > 0 && (
            <Card>
              <h3 style={{ fontFamily:"'Syne',sans-serif", color:C.navy, marginBottom:14, fontSize:15 }}>Portas Cadastradas</h3>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:C.gray50 }}>
                      {["Porta","Tipo","Detalhes","Patch Panel","Setor","Mesa","Ações"].map(h => (
                        <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:C.navy, fontWeight:600, fontSize:12, borderBottom:`2px solid ${C.gray100}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {switchPorts.map(p => {
                      const lt = p.linkType || "access";
                      return (
                        <tr key={p.id} style={{ borderBottom:`1px solid ${C.gray100}` }}>
                          <td style={{ padding:"10px 12px", fontWeight:700, color:C.navy }}>{p.portNumber}</td>
                          <td style={{ padding:"10px 12px" }}>{lt==="uplink"?<Badge color="teal">Uplink</Badge>:lt==="downlink"?<Badge color="navy">Downlink</Badge>:<Badge color="green">Acesso</Badge>}</td>
                          <td style={{ padding:"10px 12px", color:C.gray600 }}>{(lt==="uplink"||lt==="downlink")?`${p.uplinkDirection==="recebe"?"⬇ Recebe de":"⬆ Envia para"} ${p.uplinkTarget||"—"}`:"—"}</td>
                          <td style={{ padding:"10px 12px", color:C.gray600 }}>{p.patchPanel||"—"}</td>
                          <td style={{ padding:"10px 12px", color:C.gray600 }}>{p.sector||"—"}</td>
                          <td style={{ padding:"10px 12px", color:C.gray600 }}>{p.desk||"—"}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <Btn size="sm" variant="ghost" onClick={() => openEditPort(p)}>✏️</Btn>
                              <Btn size="sm" variant="danger" onClick={() => delPort(p.id)}>🗑️</Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Switch Modal */}
      <Modal open={swModal} onClose={() => setSwModal(false)} title={editSwId?"Editar Switch":"Novo Switch"}>
        <Alert msg={err} />
        <Input label="Nome do Switch" value={swForm.name} onChange={v => setSwForm(f=>({...f,name:v}))} placeholder="Ex: SW-CORE-01" required />
        <Input label="Marca" value={swForm.brand} onChange={v => setSwForm(f=>({...f,brand:v}))} placeholder="Ex: Cisco, HP, TP-Link" required />
        <Input label="Modelo" value={swForm.model} onChange={v => setSwForm(f=>({...f,model:v}))} placeholder="Ex: SG300-28P" required />
        <Input label="Quantidade de Portas" type="number" value={swForm.portCount} onChange={v => setSwForm(f=>({...f,portCount:v}))} placeholder="Ex: 24" required />
        <Input type="checkbox" value={swForm.isPoe} onChange={v => setSwForm(f=>({...f,isPoe:v}))} placeholder="Este switch é POE (Power over Ethernet)" />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={() => setSwModal(false)}>Cancelar</Btn>
          <Btn variant="teal" onClick={saveSw}>Salvar</Btn>
        </div>
      </Modal>

      {/* Port Modal */}
      <Modal open={portModal} onClose={() => setPortModal(false)} title={editPortId?"Editar Porta":"Cadastrar Porta"} width={500}>
        <Alert msg={err} />
        <Input label="Número da Porta" type="number" value={portForm.portNumber} onChange={v => setPortForm(f=>({...f,portNumber:v}))} placeholder={`1 a ${selectedSwitch?.portCount}`} required />
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:C.navy, marginBottom:8 }}>Tipo de Conexão <span style={{ color:C.red }}>*</span></label>
          <div style={{ display:"flex", gap:8 }}>
            {[{value:"access",label:"🔗 Acesso",color:C.green},{value:"uplink",label:"⬆ Uplink",color:C.teal},{value:"downlink",label:"⬇ Downlink",color:C.navyLight}].map(opt => (
              <button key={opt.value} onClick={() => setPortForm(f=>({...f,linkType:opt.value,uplinkTarget:"",uplinkDirection:"recebe"}))}
                style={{ flex:1, padding:"10px 8px", borderRadius:10, border:`2px solid ${portForm.linkType===opt.value?opt.color:C.gray200}`, background:portForm.linkType===opt.value?`${opt.color}18`:C.white, color:portForm.linkType===opt.value?opt.color:C.gray400, fontWeight:600, fontSize:13, cursor:"pointer", transition:"all .2s" }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {(portForm.linkType==="uplink"||portForm.linkType==="downlink") && (
          <div style={{ background:C.gray50, borderRadius:10, padding:"14px 14px 2px", marginBottom:16, border:`1px solid ${C.gray200}` }}>
            <Input label="Direção" type="select" value={portForm.uplinkDirection} onChange={v => setPortForm(f=>({...f,uplinkDirection:v}))}
              options={[{value:"recebe",label:"⬇ Recebe de (entrada)"},{value:"envia",label:"⬆ Envia para (saída)"}]} />
            <Input label="Switch de origem / destino" type="select" value={portForm.uplinkTarget} onChange={v => setPortForm(f=>({...f,uplinkTarget:v}))}
              options={switches.filter(s=>s.id!==selectedSwitch?.id).map(s=>({value:s.name,label:s.name}))} />
          </div>
        )}
        <div style={{ borderTop:`1px solid ${C.gray100}`, paddingTop:16, marginTop:4 }}>
          <Input label="Porta do Patch Panel" value={portForm.patchPanel} onChange={v => setPortForm(f=>({...f,patchPanel:v}))} placeholder="Ex: PP-01 / Porta 12" />
          {portForm.linkType==="access" && (
            <>
              <Input label="Setor que atende" value={portForm.sector} onChange={v => setPortForm(f=>({...f,sector:v}))} placeholder="Ex: Financeiro, TI, RH" />
              <Input label="Mesa que atende" value={portForm.desk} onChange={v => setPortForm(f=>({...f,desk:v}))} placeholder="Ex: Mesa 05, Estação 12A" />
            </>
          )}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={() => setPortModal(false)}>Cancelar</Btn>
          <Btn variant="teal" onClick={savePort}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
function ReportView() {
  const [units, setUnits]     = useState([]);
  const [switches, setSwitches] = useState([]);
  const [ports, setPorts]     = useState([]);
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    (async () => {
      const [u, sw, p] = await Promise.all([db.getUnits(), db.getSwitches(), db.getPorts()]);
      setUnits(u); setSwitches(sw.map(mapSwitch)); setPorts(p.map(mapPort));
    })();
  }, []);

  const filtered = units.filter(u => !filter || u.id === filter);
  const getLT = p => p.linkType || "access";

  const printReport = () => {
    const now  = new Date().toLocaleString("pt-BR");
    const date = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });

    const badge = type => {
      const cfg = { uplink:{bg:"#2DBFBF",text:"#fff",label:"Uplink"}, downlink:{bg:"#1A3A8A",text:"#fff",label:"Downlink"}, access:{bg:"#38A169",text:"#fff",label:"Acesso"} };
      const c = cfg[type]||cfg.access;
      return `<span style="display:inline-block;padding:3px 11px;border-radius:20px;font-size:10px;font-weight:700;background:${c.bg};color:${c.text};">${c.label}</span>`;
    };

    const portSquare = (num, type) => {
      const bg = type==="uplink"?"#2DBFBF":type==="downlink"?"#1A3A8A":type==="access"?"#38A169":"#DDE3ED";
      const fg = type==="free"?"#8898AA":"#fff";
      return `<div style="width:36px;height:36px;border-radius:7px;background:${bg};color:${fg};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;margin:3px;">${num}</div>`;
    };

    const unitData = filtered.map(unit => ({
      ...unit,
      switches: switches.filter(s => s.unitId === unit.id).map(sw => ({
        ...sw,
        ports: ports.filter(p => p.switchId === sw.id).sort((a,b) => Number(a.portNumber)-Number(b.portNumber))
      }))
    }));

    const css = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'DM Sans',Arial,sans-serif;background:#fff;color:#1A202C;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .page{width:210mm;min-height:297mm;display:flex;flex-direction:column;page-break-after:always;position:relative;overflow:hidden;background:#fff;}
      .page:last-child{page-break-after:auto;}
      /* COVER */
      .cover{background:#0D2160;color:#fff;}
      .cover-diagonal{position:absolute;bottom:0;right:0;width:55%;height:100%;background:linear-gradient(135deg,transparent 0%,#142E7A 30%,#1a9898 100%);clip-path:polygon(30% 0%,100% 0%,100% 100%,0% 100%);opacity:.6;}
      .cover-teal-bar{position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#2DBFBF,#1a9090,#0D2160);}
      .cover-left-accent{position:absolute;top:0;bottom:0;left:0;width:6px;background:linear-gradient(180deg,#2DBFBF 0%,#1A3A8A 100%);}
      .cover-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;padding:0 60px;}
      .logo-text{font-size:64px;font-weight:900;letter-spacing:-3px;line-height:1;color:#fff;}
      .logo-text .q{color:#2DBFBF;}
      .logo-tagline{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:10px;}
      .cover-top-section{padding-top:55px;padding-bottom:30px;border-bottom:1px solid rgba(45,191,191,.3);}
      .cover-mid-section{flex:1;display:flex;flex-direction:column;justify-content:center;padding:50px 0;}
      .cover-label{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#2DBFBF;margin-bottom:16px;}
      .cover-main-title{font-size:48px;font-weight:800;line-height:1.1;color:#fff;margin-bottom:12px;}
      .cover-main-subtitle{font-size:15px;color:rgba(255,255,255,.5);font-weight:300;}
      .cover-divider{width:60px;height:3px;background:#2DBFBF;border-radius:2px;margin:28px 0;}
      .cover-unit-block{background:rgba(255,255,255,.06);border:1px solid rgba(45,191,191,.25);border-radius:16px;padding:30px 36px;margin-bottom:28px;display:grid;grid-template-columns:1fr 1fr;}
      .unit-field{padding:10px 0;}
      .unit-field.full{grid-column:span 2;border-top:1px solid rgba(255,255,255,.07);}
      .unit-field-label{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#2DBFBF;margin-bottom:5px;}
      .unit-field-value{font-size:17px;font-weight:700;color:#fff;line-height:1.3;}
      .unit-field-value.sm{font-size:13px;font-weight:400;color:rgba(255,255,255,.75);}
      .cover-stats{display:flex;gap:12px;padding-bottom:48px;}
      .stat-pill{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:18px 10px;text-align:center;border-top:3px solid #2DBFBF;}
      .stat-pill-num{font-size:32px;font-weight:800;color:#2DBFBF;line-height:1;}
      .stat-pill-lbl{font-size:9px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1.5px;margin-top:4px;}
      .cover-timestamp{font-size:9px;color:rgba(255,255,255,.25);text-align:right;margin-top:-36px;padding-bottom:14px;}
      /* HEADER/FOOTER */
      .page-header{background:linear-gradient(135deg,#0D2160 0%,#1A3A8A 100%);padding:14px 44px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}
      .hdr-logo-text{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;}
      .hdr-logo-text .q{color:#2DBFBF;}
      .hdr-logo-sub{font-size:8.5px;color:#2DBFBF;letter-spacing:2.5px;text-transform:uppercase;margin-top:3px;}
      .hdr-right{text-align:right;}
      .hdr-unit{font-size:11px;color:rgba(255,255,255,.7);font-weight:600;}
      .hdr-page{font-size:9px;color:rgba(255,255,255,.4);margin-top:2px;}
      .hdr-accent{height:3px;background:linear-gradient(90deg,#2DBFBF 0%,rgba(45,191,191,0) 60%);}
      .page-footer{border-top:1px solid #E8EDF5;padding:8px 44px;display:flex;justify-content:space-between;align-items:center;font-size:8.5px;color:#A0AEC0;flex-shrink:0;background:#FAFBFD;}
      .ftr-logo{font-weight:800;color:#0D2160;margin-right:6px;}
      /* INDEX */
      .idx-body{padding:32px 44px;flex:1;}
      .idx-heading-label{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#2DBFBF;margin-bottom:6px;}
      .idx-heading-title{font-size:30px;font-weight:800;color:#0D2160;}
      .idx-heading-bar{height:4px;background:linear-gradient(90deg,#0D2160,#2DBFBF,rgba(45,191,191,0));border-radius:2px;margin-top:20px;margin-bottom:28px;}
      .idx-entry{display:flex;align-items:center;padding:14px 18px;border-radius:12px;margin-bottom:10px;background:#F4F7FB;border-left:5px solid #2DBFBF;gap:0;}
      .idx-entry:nth-child(even){border-left-color:#0D2160;}
      .idx-num{width:40px;height:40px;background:linear-gradient(135deg,#0D2160,#1A3A8A);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:800;flex-shrink:0;margin-right:16px;}
      .idx-entry:nth-child(even) .idx-num{background:linear-gradient(135deg,#2DBFBF,#1a9090);}
      .idx-sw-name{font-weight:700;color:#0D2160;font-size:14px;}
      .idx-sw-detail{font-size:10.5px;color:#8898AA;margin-top:3px;}
      .idx-dots{flex:1;border-bottom:2px dotted #CBD5E0;margin:0 16px;}
      .idx-page-label{font-size:8px;color:#A0AEC0;text-transform:uppercase;letter-spacing:1px;}
      .idx-page-num{font-size:26px;font-weight:800;color:#0D2160;line-height:1;}
      /* SWITCH PAGE */
      .sw-body{padding:24px 44px;flex:1;display:flex;flex-direction:column;gap:16px;}
      .sw-header-bar{display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:2px solid #EDF1F7;}
      .sw-icon-box{width:52px;height:52px;background:linear-gradient(135deg,#2DBFBF,#1a9090);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
      .sw-title{font-size:22px;font-weight:800;color:#0D2160;}
      .sw-subtitle{font-size:12px;color:#8898AA;margin-top:4px;}
      .poe-chip{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;vertical-align:middle;background:#D69E2E22;color:#975A16;border:1px solid #D69E2E55;margin-left:8px;}
      .sw-stats-row{display:flex;gap:10px;}
      .sw-stat{flex:1;background:#F4F7FB;border-radius:10px;padding:10px 14px;border-top:3px solid #2DBFBF;}
      .sw-stat-num{font-size:22px;font-weight:800;color:#0D2160;}
      .sw-stat-lbl{font-size:9px;color:#8898AA;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}
      .port-vis{background:#F4F7FB;border:1px solid #DDE3ED;border-radius:12px;padding:16px 18px;}
      .port-vis-label{font-size:8.5px;font-weight:700;color:#8898AA;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
      .port-vis-grid{display:flex;flex-wrap:wrap;}
      .port-legend{display:flex;gap:20px;margin-top:12px;padding-top:10px;border-top:1px solid #DDE3ED;}
      .leg-item{display:flex;align-items:center;gap:5px;font-size:9.5px;color:#4A5568;}
      .leg-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
      .link-bar{background:rgba(45,191,191,.06);border:1px solid rgba(45,191,191,.2);border-radius:10px;padding:12px 16px;}
      .link-bar-title{font-size:8.5px;font-weight:700;color:#0E7878;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;}
      .link-chips{display:flex;flex-wrap:wrap;gap:7px;}
      .link-chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid rgba(45,191,191,.3);border-radius:8px;padding:5px 12px;font-size:11px;}
      .port-table-wrap{flex:1;}
      .port-table-label{font-size:8.5px;font-weight:700;color:#8898AA;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      thead tr{background:#0D2160;}
      th{color:#fff;padding:9px 12px;text-align:left;font-weight:600;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;}
      th:first-child{border-radius:8px 0 0 0;}th:last-child{border-radius:0 8px 0 0;}
      tbody tr{border-bottom:1px solid #EDF1F7;}
      tbody tr:nth-child(even){background:#F7FAFC;}
      td{padding:8px 12px;vertical-align:middle;}
      .td-port{font-weight:800;color:#0D2160;font-size:13px;text-align:center;}
      .td-link{color:#2D3748;}.td-meta{color:#4A5568;}.td-empty{color:#CBD5E0;}
      @media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}.page{page-break-after:always;}.page:last-child{page-break-after:auto;}}
    `;

    const hdr = (unitName, pageLabel) => `
      <div class="page-header">
        <div><div class="hdr-logo-text">YDU<span class="q">Q</span>S</div><div class="hdr-logo-sub">Infraestrutura de Rede · TI</div></div>
        <div class="hdr-right"><div class="hdr-unit">${unitName}</div><div class="hdr-page">${pageLabel}</div></div>
      </div><div class="hdr-accent"></div>`;

    const ftr = (right) => `
      <div class="page-footer">
        <span><span class="ftr-logo">YDUQS</span>Relatório de Infraestrutura de Rede · ${date}</span>
        <span>${right}</span>
      </div>`;

    const buildCover = unit => {
      const totalPorts = unit.switches.reduce((s,sw)=>s+sw.ports.length,0);
      const totalLinks = unit.switches.reduce((s,sw)=>s+sw.ports.filter(p=>getLT(p)!=="access").length,0);
      return `<div class="page cover">
        <div class="cover-diagonal"></div><div class="cover-teal-bar"></div><div class="cover-left-accent"></div>
        <div class="cover-inner">
          <div class="cover-top-section"><div class="logo-text">YDU<span class="q">Q</span>S</div><div class="logo-tagline">Tecnologia da Informação · Infraestrutura de Rede</div></div>
          <div class="cover-mid-section">
            <div class="cover-label">Relatório Técnico</div>
            <div class="cover-main-title">Switches &amp;<br>Conexões<br>de Rede</div>
            <div class="cover-divider"></div>
            <div class="cover-main-subtitle">Documentação completa de infraestrutura<br>de switches, portas e conexões inter-switch</div>
          </div>
          <div>
            <div class="cover-unit-block">
              <div class="unit-field"><div class="unit-field-label">Nome da Unidade</div><div class="unit-field-value">${unit.name}</div></div>
              <div class="unit-field"><div class="unit-field-label">Técnico Responsável</div><div class="unit-field-value">${unit.technician}</div></div>
              <div class="unit-field full"><div class="unit-field-label">Endereço</div><div class="unit-field-value sm">${unit.address}</div></div>
            </div>
            <div class="cover-stats">
              ${[{icon:"🔌",num:unit.switches.length,lbl:"Switches"},{icon:"🔗",num:totalPorts,lbl:"Portas cadastradas"},{icon:"⬆⬇",num:totalLinks,lbl:"Links inter-switch"}].map(s=>`<div class="stat-pill"><div style="font-size:18px;margin-bottom:4px;">${s.icon}</div><div class="stat-pill-num">${s.num}</div><div class="stat-pill-lbl">${s.lbl}</div></div>`).join("")}
            </div>
            <div class="cover-timestamp">Gerado em ${now}</div>
          </div>
        </div>
      </div>`;
    };

    const buildIndex = (unit, swWithPage) => `<div class="page">
      ${hdr(unit.name,"Página 2 · Índice de Switches")}
      <div class="idx-body">
        <div class="idx-heading-label">Sumário</div>
        <div class="idx-heading-title">Índice de Switches</div>
        <div style="font-size:13px;color:#8898AA;margin-top:6px;">Unidade: <strong style="color:#0D2160;">${unit.name}</strong> · ${unit.switches.length} switch${unit.switches.length!==1?"es":""}</div>
        <div class="idx-heading-bar"></div>
        ${swWithPage.length===0
          ? `<div style="text-align:center;padding:60px 0;color:#8898AA;font-style:italic;">Nenhum switch cadastrado.</div>`
          : swWithPage.map((sw,i) => {
              const ac=sw.ports.filter(p=>getLT(p)==="access").length;
              const up=sw.ports.filter(p=>getLT(p)==="uplink").length;
              const dn=sw.ports.filter(p=>getLT(p)==="downlink").length;
              const parts=[];
              if(ac) parts.push(`${ac} acesso${ac!==1?"s":""}`);
              if(up) parts.push(`<span style="color:#2DBFBF;font-weight:600;">${up} uplink${up!==1?"s":""}</span>`);
              if(dn) parts.push(`<span style="color:#1A3A8A;font-weight:600;">${dn} downlink${dn!==1?"s":""}</span>`);
              return `<div class="idx-entry">
                <div class="idx-num">${i+1}</div>
                <div style="flex:1;">
                  <div class="idx-sw-name">${sw.name}${sw.isPoe?`<span style="display:inline-block;margin-left:8px;padding:1px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#D69E2E22;color:#975A16;border:1px solid #D69E2E55;vertical-align:middle;">POE</span>`:""}</div>
                  <div class="idx-sw-detail">${sw.brand} ${sw.model} · ${sw.portCount} portas${parts.length?` · ${parts.join(" · ")}`:""}</div>
                </div>
                <div class="idx-dots"></div>
                <div style="text-align:right;flex-shrink:0;">
                  <div class="idx-page-label">página</div>
                  <div class="idx-page-num">${sw.pageNum}</div>
                </div>
              </div>`;
            }).join("")}
      </div>
      ${ftr(`${unit.name} · Índice`)}
    </div>`;

    const buildSwitchPage = (sw, unit, pageNum, totalPages) => {
      const linked = sw.ports.filter(p => getLT(p)!=="access");
      const ac=sw.ports.filter(p=>getLT(p)==="access").length;
      const up=sw.ports.filter(p=>getLT(p)==="uplink").length;
      const dn=sw.ports.filter(p=>getLT(p)==="downlink").length;
      const grid = Array.from({length:Number(sw.portCount)},(_,i)=>portSquare(String(i+1), sw.ports.find(pp=>pp.portNumber===String(i+1))?getLT(sw.ports.find(pp=>pp.portNumber===String(i+1))):"free")).join("");
      return `<div class="page">
        ${hdr(unit.name,`Página ${pageNum} · ${sw.name}`)}
        <div class="sw-body">
          <div class="sw-header-bar">
            <div class="sw-icon-box">🔌</div>
            <div style="flex:1;"><div class="sw-title">${sw.name}${sw.isPoe?`<span class="poe-chip">POE</span>`:""}</div><div class="sw-subtitle">${sw.brand} ${sw.model} · ${sw.portCount} portas no total</div></div>
          </div>
          <div class="sw-stats-row">
            <div class="sw-stat"><div class="sw-stat-num">${sw.ports.length}</div><div class="sw-stat-lbl">Cadastradas</div></div>
            <div class="sw-stat" style="border-top-color:#38A169;"><div class="sw-stat-num">${ac}</div><div class="sw-stat-lbl">Acesso</div></div>
            <div class="sw-stat" style="border-top-color:#2DBFBF;"><div class="sw-stat-num">${up}</div><div class="sw-stat-lbl">Uplinks</div></div>
            <div class="sw-stat" style="border-top-color:#1A3A8A;"><div class="sw-stat-num">${dn}</div><div class="sw-stat-lbl">Downlinks</div></div>
            <div class="sw-stat" style="border-top-color:#E8EDF5;"><div class="sw-stat-num" style="color:#8898AA;">${Number(sw.portCount)-sw.ports.length}</div><div class="sw-stat-lbl">Livres</div></div>
          </div>
          <div class="port-vis">
            <div class="port-vis-label">Painel visual de portas</div>
            <div class="port-vis-grid">${grid}</div>
            <div class="port-legend">
              <div class="leg-item"><div class="leg-dot" style="background:#DDE3ED;border:1px solid #C5CDD8;"></div>Livre</div>
              <div class="leg-item"><div class="leg-dot" style="background:#38A169;"></div>Acesso</div>
              <div class="leg-item"><div class="leg-dot" style="background:#2DBFBF;"></div>Uplink</div>
              <div class="leg-item"><div class="leg-dot" style="background:#1A3A8A;"></div>Downlink</div>
            </div>
          </div>
          ${linked.length>0?`<div class="link-bar"><div class="link-bar-title">Conexões inter-switch (${linked.length})</div><div class="link-chips">${linked.map(p=>`<div class="link-chip">${badge(getLT(p))}<span style="font-weight:700;color:#0D2160;">Porta ${p.portNumber}</span><span style="color:#8898AA;">${p.uplinkDirection==="recebe"?"⬇ de":"⬆ para"}</span><span style="font-weight:600;color:#0D2160;">${p.uplinkTarget||"—"}</span>${p.patchPanel?`<span style="color:#8898AA;font-size:10px;">· PP: ${p.patchPanel}</span>`:""}</div>`).join("")}</div></div>`:""}
          <div class="port-table-wrap">
            <div class="port-table-label">Detalhamento de portas</div>
            ${sw.ports.length===0
              ?`<div style="text-align:center;padding:28px;color:#8898AA;font-style:italic;background:#F4F7FB;border-radius:10px;">Nenhuma porta cadastrada neste switch.</div>`
              :`<table><thead><tr><th style="width:48px;">Porta</th><th style="width:90px;">Tipo</th><th>Conectado a</th><th>Patch Panel</th><th>Setor</th><th>Mesa</th></tr></thead><tbody>${sw.ports.map(p=>{const t=getLT(p);const isLink=t!=="access";return`<tr><td class="td-port">${p.portNumber}</td><td>${badge(t)}</td><td class="${isLink?"td-link":"td-empty"}">${isLink?`${p.uplinkDirection==="recebe"?"⬇ Recebe de":"⬆ Envia para"} <strong>${p.uplinkTarget||"—"}</strong>`:"—"}</td><td class="${p.patchPanel?"td-meta":"td-empty"}">${p.patchPanel||"—"}</td><td class="${p.sector?"td-meta":"td-empty"}">${p.sector||"—"}</td><td class="${p.desk?"td-meta":"td-empty"}">${p.desk||"—"}</td></tr>`;}).join("")}</tbody></table>`}
          </div>
        </div>
        ${ftr(`${sw.name} · pág. ${pageNum} de ${totalPages}`)}
      </div>`;
    };

    const body = unitData.map(unit => {
      const swWithPage = unit.switches.map((sw,i) => ({...sw, pageNum:3+i}));
      const totalPages = 2 + unit.switches.length;
      return [buildCover(unit), buildIndex(unit, swWithPage), ...swWithPage.map(sw => buildSwitchPage(sw, unit, sw.pageNum, totalPages))].join("\n");
    }).join("\n");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório YDUQS</title><style>${css}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),900);<\/script></body></html>`;
    const w = window.open("","_blank");
    if(w){w.document.write(html);w.document.close();}
    else alert("Pop-up bloqueado! Permita pop-ups e tente novamente.");
  };

  return (
    <div className="fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:C.navy }}>Relatório de Rede</h1>
          <p style={{ color:C.gray400, fontSize:14, marginTop:2 }}>Capa · Índice · Uma página por switch</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ padding:"9px 14px", border:`2px solid ${C.gray200}`, borderRadius:8, fontSize:14, outline:"none" }}>
            <option value="">Todas as Unidades</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Btn variant="teal" onClick={printReport}>🖨️ Imprimir / PDF</Btn>
        </div>
      </div>
      {filtered.map(unit => {
        const unitSws = switches.filter(s => s.unitId === unit.id);
        return (
          <Card key={unit.id} style={{ marginBottom:20 }}>
            <div style={{ borderBottom:`2px solid ${C.navy}`, paddingBottom:12, marginBottom:16 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", color:C.navy, fontSize:18 }}>🏢 {unit.name}</h2>
              <div style={{ display:"flex", gap:16, fontSize:13, color:C.gray600, marginTop:4 }}>
                <span>📍 {unit.address}</span><span>👤 {unit.technician}</span>
                <Badge color="navy">{unitSws.length} switches</Badge>
              </div>
            </div>
            {unitSws.length === 0
              ? <p style={{ color:C.gray400, fontStyle:"italic" }}>Nenhum switch cadastrado.</p>
              : unitSws.map(sw => {
                  const swPorts = ports.filter(p=>p.switchId===sw.id).sort((a,b)=>Number(a.portNumber)-Number(b.portNumber));
                  const linkPorts = swPorts.filter(p=>getLT(p)!=="access");
                  return (
                    <div key={sw.id} style={{ marginBottom:20, background:C.gray50, borderRadius:12, padding:16 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                        <span style={{ fontSize:20 }}>🔌</span>
                        <div>
                          <strong style={{ fontFamily:"'Syne',sans-serif", color:C.navy }}>{sw.name}</strong>
                          <span style={{ fontSize:12, color:C.gray400, marginLeft:10 }}>{sw.brand} {sw.model} · {sw.portCount} portas</span>
                          {sw.isPoe && <span style={{ marginLeft:8 }}><Badge color="amber">POE</Badge></span>}
                        </div>
                      </div>
                      {linkPorts.length > 0 && (
                        <div style={{ background:`${C.teal}12`, border:`1px solid ${C.teal}30`, borderRadius:8, padding:"8px 14px", marginBottom:12 }}>
                          <strong style={{ fontSize:13, color:C.tealDark }}>⬆⬇ Links ({linkPorts.length}): </strong>
                          {linkPorts.map((p,i) => { const lt=getLT(p); return <span key={p.id} style={{ fontSize:13, color:C.tealDark }}>{i>0?" · ":""}<Badge color={lt==="uplink"?"teal":"navy"}>{lt==="uplink"?"UP":"DOWN"}</Badge> Porta {p.portNumber} {p.uplinkDirection==="recebe"?"⬇":"⬆"} {p.uplinkTarget||"?"}</span>; })}
                        </div>
                      )}
                      {swPorts.length > 0 && (
                        <div style={{ overflowX:"auto" }}>
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead>
                              <tr style={{ background:C.navy }}>
                                {["Porta","Tipo","Link / Direção","Patch Panel","Setor","Mesa"].map(h => <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:C.white, fontWeight:600 }}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {swPorts.map(p => {
                                const lt=getLT(p);
                                return (
                                  <tr key={p.id} style={{ borderBottom:`1px solid ${C.gray100}`, background:C.white }}>
                                    <td style={{ padding:"7px 10px", fontWeight:700, color:C.navy }}>{p.portNumber}</td>
                                    <td style={{ padding:"7px 10px" }}>{lt==="uplink"?<Badge color="teal">Uplink</Badge>:lt==="downlink"?<Badge color="navy">Downlink</Badge>:<Badge color="green">Acesso</Badge>}</td>
                                    <td style={{ padding:"7px 10px", fontSize:12, color:C.gray600 }}>{(lt==="uplink"||lt==="downlink")?`${p.uplinkDirection==="recebe"?"⬇":"⬆"} ${p.uplinkTarget||"—"}`:"—"}</td>
                                    <td style={{ padding:"7px 10px", color:C.gray600 }}>{p.patchPanel||"—"}</td>
                                    <td style={{ padding:"7px 10px", color:C.gray600 }}>{p.sector||"—"}</td>
                                    <td style={{ padding:"7px 10px", color:C.gray600 }}>{p.desk||"—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {swPorts.length===0 && <p style={{ color:C.gray400, fontSize:13, fontStyle:"italic" }}>Nenhuma porta cadastrada.</p>}
                    </div>
                  );
                })}
          </Card>
        );
      })}
      {filtered.length===0 && <Card style={{ textAlign:"center", padding:48 }}><p style={{ color:C.gray400 }}>Nenhuma unidade encontrada.</p></Card>}
    </div>
  );
}

// ─── USERS ────────────────────────────────────────────────────────────────────
function UsersView({ currentUser }) {
  const [users, setUsers]     = useState([]);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ name:"", email:"", password:"", role:"tech", active:true });
  const [editId, setEditId]   = useState(null);
  const [err, setErr]         = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => { setUsers(await db.getUsers()); }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name || !form.email || (!editId && !form.password)) { setErr("Preencha todos os campos obrigatórios."); return; }
    const all = await db.getUsers();
    if (all.find(u => u.email.toLowerCase()===form.email.toLowerCase() && u.id!==editId)) { setErr("E-mail já cadastrado."); return; }
    try {
      await db.upsertUser({
        id: editId || `user_${Date.now()}`,
        name: form.name, email: form.email, role: form.role, active: form.active,
        ...(form.password ? { password: form.password } : editId ? {} : { password: "" }),
        created_at: new Date().toISOString()
      });
      setModal(false); setForm({ name:"", email:"", password:"", role:"tech", active:true }); setEditId(null);
      setSuccess("Usuário salvo!"); load(); setTimeout(() => setSuccess(""), 3000);
    } catch(e) { setErr("Erro: " + e.message); }
  };

  const toggleActive = async (u) => {
    await db.upsertUser({ ...u, active: !u.active }); load();
  };

  const del = async (id) => {
    if (id===currentUser.id) { alert("Não é possível excluir seu próprio usuário."); return; }
    if (!confirm("Excluir este usuário?")) return;
    await db.deleteUser(id); load();
  };

  const openEdit = u => { setForm({ name:u.name, email:u.email, password:"", role:u.role, active:u.active }); setEditId(u.id); setErr(""); setModal(true); };

  return (
    <div className="fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:C.navy }}>Usuários</h1>
          <p style={{ color:C.gray400, fontSize:14, marginTop:2 }}>Gerencie os acessos ao sistema</p>
        </div>
        <Btn variant="teal" onClick={() => { setForm({ name:"", email:"", password:"", role:"tech", active:true }); setEditId(null); setErr(""); setModal(true); }}>+ Novo Usuário</Btn>
      </div>
      <Alert msg={success} type="success" />
      <Card>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:C.gray50 }}>
              {["Nome","E-mail","Perfil","Status","Ações"].map(h => <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.navy, fontWeight:600, fontSize:12, borderBottom:`2px solid ${C.gray100}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom:`1px solid ${C.gray100}` }}>
                <td style={{ padding:"12px 14px", fontWeight:600, color:C.navy }}>{u.name}</td>
                <td style={{ padding:"12px 14px", color:C.gray600 }}>{u.email}</td>
                <td style={{ padding:"12px 14px" }}><Badge color={u.role==="admin"?"teal":"navy"}>{u.role==="admin"?"Admin":"Técnico"}</Badge></td>
                <td style={{ padding:"12px 14px" }}><Badge color={u.active?"green":"red"}>{u.active?"Ativo":"Inativo"}</Badge></td>
                <td style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn size="sm" variant="ghost" onClick={() => openEdit(u)}>✏️</Btn>
                    <Btn size="sm" variant={u.active?"outline":"success"} onClick={() => toggleActive(u)}>{u.active?"Desativar":"Ativar"}</Btn>
                    {u.id!==currentUser.id && <Btn size="sm" variant="danger" onClick={() => del(u.id)}>🗑️</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editId?"Editar Usuário":"Novo Usuário"}>
        <Alert msg={err} />
        <Input label="Nome completo" value={form.name} onChange={v => setForm(f=>({...f,name:v}))} required />
        <Input label="E-mail" type="email" value={form.email} onChange={v => setForm(f=>({...f,email:v}))} required />
        <Input label={editId?"Nova senha (em branco para manter)":"Senha"} type="password" value={form.password} onChange={v => setForm(f=>({...f,password:v}))} required={!editId} />
        <Input label="Perfil" type="select" value={form.role} onChange={v => setForm(f=>({...f,role:v}))} options={[{value:"tech",label:"Técnico"},{value:"admin",label:"Administrador"}]} />
        <Input type="checkbox" value={form.active} onChange={v => setForm(f=>({...f,active:v}))} placeholder="Usuário ativo" />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="teal" onClick={save}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]   = useState(null);
  const [page, setPage]   = useState("dashboard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db.ensureAdmin().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${C.navy},${C.tealDark})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:C.white, fontSize:18, animation:"pulse 1.5s ease infinite" }}>Conectando ao banco de dados...</div>
    </div>
  );

  if (!user) return <><GlobalStyle /><LoginView onLogin={setUser} /></>;

  const pages = {
    dashboard: <Dashboard user={user} />,
    units:     <UnitsView user={user} />,
    switches:  <SwitchesView user={user} />,
    report:    <ReportView />,
    users:     <UsersView currentUser={user} />,
  };

  return (
    <>
      <GlobalStyle />
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <Sidebar user={user} currentPage={page} setPage={setPage} onLogout={() => setUser(null)} />
        <main style={{ marginLeft:240, flex:1, padding:"32px 36px", maxWidth:"calc(100vw - 240px)" }}>
          {pages[page] || pages.dashboard}
        </main>
      </div>
    </>
  );
}
