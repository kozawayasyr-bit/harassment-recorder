import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ============================================================
// ãã©ã¹ã¡ã³ãè¨¼æ è¨é²ã¢ããª
// ãã¯ãã©ã»ã¢ã©ãã©ã®è¨é²ãå®å¨ã«ä¿å­ã»ç®¡çãããã¼ã«
// ============================================================

const STORAGE_KEY = "harassment_records_v1";

// localStorageããèª­ã¿è¾¼ã¿
function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn("ãã¼ã¿ã®èª­ã¿è¾¼ã¿ã«å¤±æãã¾ãã", e);
  }
  return [];
}

// localStorageã«ä¿å­
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn("ãã¼ã¿ã®ä¿å­ã«å¤±æãã¾ãã", e);
  }
}

const HARASSMENT_TYPES = [
  "ãã¯ãã©ï¼å¨å§ã»æ´è¨ï¼",
  "ãã¯ãã©ï¼éå¤§ãªè¦æ±ï¼",
  "ãã¯ãã©ï¼éå°ãªè¦æ±ã»ä»äºå¤ãï¼",
  "ãã¯ãã©ï¼äººéé¢ä¿ã®åãé¢ãï¼",
  "ãã¯ãã©ï¼åã®ä¾µå®³ï¼",
  "ãã¯ãã©ï¼èº«ä½çæ»æï¼",
  "ã¢ã©ãã©ï¼ç¡è¦ã»æé¤ï¼",
  "ã¢ã©ãã©ï¼äººæ ¼å¦å®ã»ä¾®è¾±ï¼",
  "ã¢ã©ãã©ï¼ãã©ã¤ãã¼ãã¸ã®å¹²æ¸ï¼",
  "ã¢ã©ãã©ï¼å«ãããã»é°å£ï¼",
  "ã»ã¯ãã©",
  "ãã®ä»",
];

const SEVERITY_LEVELS = [
  { value: 1, label: "è»½åº¦", color: "#6b7280", bg: "#f3f4f6" },
  { value: 2, label: "ä¸­åº¦", color: "#d97706", bg: "#fef3c7" },
  { value: 3, label: "éåº¦", color: "#dc2626", bg: "#fee2e2" },
];

const INITIAL_FORM = {
  date: "",
  time: "",
  location: "",
  perpetrator: "",
  type: "",
  severity: 2,
  description: "",
  witnesses: "",
  emotionalImpact: "",
  images: [],
};

// ---- PDFçæ ----
function generatePDFContent(records) {
  const escHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const rows = records
    .map(
      (r) => `
    <div style="border:1px solid #ccc;border-radius:8px;padding:16px;margin-bottom:16px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:bold;font-size:14px;">${escHtml(r.date)} ${escHtml(r.time || "")}</span>
        <span style="background:${SEVERITY_LEVELS[r.severity - 1]?.bg || "#f3f4f6"};color:${SEVERITY_LEVELS[r.severity - 1]?.color || "#6b7280"};padding:2px 10px;border-radius:12px;font-size:12px;">
          ${escHtml(SEVERITY_LEVELS[r.severity - 1]?.label || "")}
        </span>
      </div>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="color:#6b7280;width:100px;padding:4px 0;">ç¨®å¥</td><td>${escHtml(r.type)}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">å å®³è</td><td>${escHtml(r.perpetrator)}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">å ´æ</td><td>${escHtml(r.location)}</td></tr>
        ${r.witnesses ? `<tr><td style="color:#6b7280;padding:4px 0;">ç®æè</td><td>${escHtml(r.witnesses)}</td></tr>` : ""}
      </table>
      <div style="margin-top:10px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">è©³ç´°åå®¹</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.6;">${escHtml(r.description)}</div>
      </div>
      ${
        r.emotionalImpact
          ? `<div style="margin-top:10px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">ç²¾ç¥çå½±é¿</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.6;">${escHtml(r.emotionalImpact)}</div>
      </div>`
          : ""
      }
      ${
        r.images && r.images.length > 0
          ? `<div style="margin-top:10px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">æ·»ä»ç»å (${r.images.length}ä»¶)</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${r.images.map((img) => `<img src="${img}" style="max-width:200px;max-height:150px;border-radius:4px;border:1px solid #e5e7eb;" />`).join("")}
        </div>
      </div>`
          : ""
      }
    </div>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ãã©ã¹ã¡ã³ãè¨¼æ è¨é²</title>
<style>@media print{body{margin:0;padding:20px;}}</style></head>
<body style="font-family:'Hiragino Sans','Meiryo',sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1f2937;">
<h1 style="font-size:20px;border-bottom:2px solid #374151;padding-bottom:12px;margin-bottom:8px;">ãã©ã¹ã¡ã³ãè¨¼æ è¨é²</h1>
<p style="font-size:12px;color:#6b7280;margin-bottom:24px;">åºåæ¥: ${new Date().toLocaleDateString("ja-JP")}ã/ãè¨é²ä»¶æ°: ${records.length}ä»¶</p>
${rows}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
ãã®ææ¸ã¯ããã©ã¹ã¡ã³ãè¨¼æ è¨é²ã¢ããªãã«ããèªåçæããã¾ãã
</div></body></html>`;
}

// ---- CSVçæ ----
function generateCSV(records) {
  const headers = [
    "æ¥ä»",
    "æå»",
    "å ´æ",
    "å å®³è",
    "ç¨®å¥",
    "æ·±å»åº¦",
    "è©³ç´°åå®¹",
    "ç®æè",
    "ç²¾ç¥çå½±é¿",
    "ç»åæ°",
  ];
  const csvEscape = (s) => {
    const str = String(s || "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const rows = records.map((r) =>
    [
      r.date,
      r.time,
      r.location,
      r.perpetrator,
      r.type,
      SEVERITY_LEVELS[r.severity - 1]?.label || "",
      r.description,
      r.witnesses,
      r.emotionalImpact,
      r.images?.length || 0,
    ]
      .map(csvEscape)
      .join(",")
  );
  return "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
}

// ---- ã¡ã¤ã³ã³ã³ãã¼ãã³ã ----
export default function App() {
  const [records, setRecords] = useState(() => loadRecords());
  const [form, setForm] = useState({ ...INITIAL_FORM, date: new Date().toISOString().split("T")[0] });
  const [view, setView] = useState("form"); // list | form | detail
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState(0);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showInfo, setShowInfo] = useState(() => !localStorage.getItem("harassment_app_info_seen"));
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  // recordsãå¤ãããã³ã«localStorageã«ä¿å­
  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // èªåããã¯ã¢ããï¼ãã¦ã³ã­ã¼ããã©ã«ãã«ä¿å­ï¼
  const downloadBackup = useCallback((recs) => {
    if (recs.length === 0) return;
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: recs }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ãã©ã¹ã¡ã³ãè¨é²_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ç»åè¿½å 
  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ev.target.result],
        }));
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // è¨é²ä¿å­
  const handleSave = () => {
    if (!form.date || !form.type || !form.description || !form.perpetrator) {
      showToast("æ¥ä»ã»ç¨®å¥ã»å å®³èã»è©³ç´°åå®¹ã¯å¿é ã§ã");
      return;
    }
    let updatedRecords;
    if (editingId) {
      updatedRecords = records.map((r) =>
        r.id === editingId ? { ...form, id: editingId, updatedAt: new Date().toISOString() } : r
      );
      setRecords(updatedRecords);
      setEditingId(null);
      showToast("è¨é²ãæ´æ°ãã¾ãã â ããã¯ã¢ãããä¿å­ä¸­â¦");
    } else {
      const newRecord = {
        ...form,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString(),
      };
      updatedRecords = [newRecord, ...records];
      setRecords(updatedRecords);
      showToast("è¨é²ãä¿å­ãã¾ãã â ããã¯ã¢ãããä¿å­ä¸­â¦");
    }
    // èªåããã¯ã¢ããããã¦ã³ã­ã¼ããã©ã«ãã«ä¿å­
    setTimeout(() => downloadBackup(updatedRecords), 300);
    setForm({ ...INITIAL_FORM, date: new Date().toISOString().split("T")[0] });
    setView("list");
  };

  // åé¤
  const handleDelete = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setShowDeleteConfirm(null);
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
      setView("list");
    }
    showToast("è¨é²ãåé¤ãã¾ãã");
  };

  // ç·¨é
  const handleEdit = (record) => {
    setForm({ ...record });
    setEditingId(record.id);
    setView("form");
  };

  // ãã£ã«ã¿
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterType && r.type !== filterType) return false;
      if (filterSeverity && r.severity !== filterSeverity) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.description.toLowerCase().includes(q) ||
          r.perpetrator.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          (r.witnesses || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, searchQuery, filterType, filterSeverity]);

  // PDFåºå
  const handleExportPDF = () => {
    const target = filteredRecords.length > 0 ? filteredRecords : records;
    if (target.length === 0) {
      showToast("åºåããè¨é²ãããã¾ãã");
      return;
    }
    const html = generatePDFContent(target);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => w.print(), 500);
    showToast("PDFåºåç¨ã®ç»é¢ãéãã¾ããï¼å°å·âPDFã§ä¿å­ï¼");
  };

  // CSVåºå
  const handleExportCSV = () => {
    const target = filteredRecords.length > 0 ? filteredRecords : records;
    if (target.length === 0) {
      showToast("åºåããè¨é²ãããã¾ãã");
      return;
    }
    const csv = generateCSV(target);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harassment_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSVãã¡ã¤ã«ããã¦ã³ã­ã¼ããã¾ãã");
  };

  // JSONããã¯ã¢ãã
  const handleBackup = () => {
    if (records.length === 0) {
      showToast("ããã¯ã¢ããããè¨é²ãããã¾ãã");
      return;
    }
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harassment_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ããã¯ã¢ãããã¡ã¤ã«ãä¿å­ãã¾ãã");
  };

  // JSONå¾©å
  const handleRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.records && Array.isArray(data.records)) {
          setRecords((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newRecords = data.records.filter((r) => !existingIds.has(r.id));
            return [...newRecords, ...prev];
          });
          showToast(`${data.records.length}ä»¶ã®è¨é²ãå¾©åãã¾ãã`);
        } else {
          showToast("ç¡å¹ãªããã¯ã¢ãããã¡ã¤ã«ã§ã");
        }
      } catch {
        showToast("ãã¡ã¤ã«ã®èª­ã¿è¾¼ã¿ã«å¤±æãã¾ãã");
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = "";
  };

  // ---- ã¹ã¿ã¤ã« ----
  const styles = {
    app: {
      fontFamily: "'Hiragino Sans', 'Meiryo', 'Noto Sans JP', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      background: "#f9fafb",
      minHeight: "100vh",
      color: "#1f2937",
      position: "relative",
    },
    header: {
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
      padding: "16px 20px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    headerTitle: { fontSize: 17, fontWeight: 700, color: "#374151", margin: 0 },
    headerSub: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
    nav: {
      display: "flex",
      gap: 8,
      padding: "12px 20px",
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
    },
    navBtn: (active) => ({
      flex: 1,
      padding: "8px 0",
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      background: active ? "#374151" : "#f3f4f6",
      color: active ? "#fff" : "#6b7280",
      transition: "all 0.15s",
    }),
    body: { padding: "16px 20px 100px" },
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      border: "1px solid #e5e7eb",
      cursor: "pointer",
      transition: "box-shadow 0.15s",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      color: "#1f2937",
      background: "#fff",
    },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      minHeight: 100,
      resize: "vertical",
      lineHeight: 1.6,
      color: "#1f2937",
      fontFamily: "inherit",
    },
    label: { fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 },
    select: {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      fontSize: 14,
      outline: "none",
      background: "#fff",
      color: "#1f2937",
      boxSizing: "border-box",
    },
    btn: (bg = "#374151", color = "#fff") => ({
      padding: "10px 20px",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      background: bg,
      color,
      transition: "opacity 0.15s",
    }),
    badge: (sev) => ({
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: SEVERITY_LEVELS[sev - 1]?.bg || "#f3f4f6",
      color: SEVERITY_LEVELS[sev - 1]?.color || "#6b7280",
    }),
    toast: {
      position: "fixed",
      bottom: 80,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#374151",
      color: "#fff",
      padding: "10px 24px",
      borderRadius: 24,
      fontSize: 13,
      fontWeight: 500,
      zIndex: 100,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      whiteSpace: "nowrap",
    },
    fieldGroup: { marginBottom: 18 },
    row: { display: "flex", gap: 12 },
    emptyState: { textAlign: "center", padding: "60px 20px", color: "#9ca3af" },
    deleteOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    },
    deleteModal: {
      background: "#fff",
      borderRadius: 16,
      padding: 24,
      maxWidth: 320,
      width: "90%",
      textAlign: "center",
    },
    imgThumb: {
      width: 56,
      height: 56,
      objectFit: "cover",
      borderRadius: 6,
      border: "1px solid #e5e7eb",
    },
    filterBar: {
      display: "flex",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap",
    },
    filterSelect: {
      padding: "6px 10px",
      border: "1px solid #d1d5db",
      borderRadius: 6,
      fontSize: 12,
      background: "#fff",
      color: "#374151",
      outline: "none",
    },
  };

  // ---- è¨é²ãã©ã¼ã  ----
  const renderForm = () => (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#374151" }}>
        {editingId ? "è¨é²ãç·¨é" : "æ°ããè¨é²ãè¿½å "}
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>æ¥ä» *</label>
          <input
            type="date"
            style={styles.input}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>æå»</label>
          <input
            type="time"
            style={styles.input}
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>ãã©ã¹ã¡ã³ãã®ç¨®å¥ *</label>
        <select style={styles.select} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="">é¸æãã¦ãã ãã</option>
          {HARASSMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>æ·±å»åº¦</label>
        <div style={{ display: "flex", gap: 8 }}>
          {SEVERITY_LEVELS.map((s) => (
            <button
              key={s.value}
              onClick={() => setForm({ ...form, severity: s.value })}
              style={{
                flex: 1,
                padding: "8px 0",
                border: form.severity === s.value ? `2px solid ${s.color}` : "2px solid #e5e7eb",
                borderRadius: 8,
                background: form.severity === s.value ? s.bg : "#fff",
                color: form.severity === s.value ? s.color : "#9ca3af",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>å å®³èï¼æ°åã»å½¹è·ãªã©ï¼ *</label>
        <input
          style={styles.input}
          placeholder="ä¾: å±±ç°é¨é·"
          value={form.perpetrator}
          onChange={(e) => setForm({ ...form, perpetrator: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>å ´æ</label>
        <input
          style={styles.input}
          placeholder="ä¾: 3æ¦ä¼è­°å®¤ããªãã£ã¹ãã­ã¢"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>è©³ç´°åå®¹ *</label>
        <textarea
          style={styles.textarea}
          placeholder="ä½ãèµ·ããããå·ä½çã«è¨é²ãã¦ãã ãããçºè¨ã®å¼ç¨ãç¶æ³ãè©³ããæ¸ãã¨è¨¼æ ã¨ãã¦æå¹ã§ãã"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>ç®æè</label>
        <input
          style={styles.input}
          placeholder="ä¾: é´æ¨ããï¼åãèª²ï¼"
          value={form.witnesses}
          onChange={(e) => setForm({ ...form, witnesses: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>ç²¾ç¥çã»èº«ä½çå½±é¿</label>
        <textarea
          style={{ ...styles.textarea, minHeight: 60 }}
          placeholder="ãã®ã¨ãæãããã¨ãä½èª¿ã®å¤åãªã©"
          value={form.emotionalImpact}
          onChange={(e) => setForm({ ...form, emotionalImpact: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>åçã»ã¹ã¯ãªã¼ã³ã·ã§ãã</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleImageAdd}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...styles.btn("#f3f4f6", "#374151"),
            width: "100%",
            border: "1px dashed #d1d5db",
          }}
        >
          + ç»åãè¿½å 
        </button>
        {form.images.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {form.images.map((img, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={img} alt="" style={styles.imgThumb} />
                <button
                  onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Ã
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button
          onClick={() => {
            setView("list");
            setEditingId(null);
            setForm({ ...INITIAL_FORM, date: new Date().toISOString().split("T")[0] });
          }}
          style={{ ...styles.btn("#f3f4f6", "#6b7280"), flex: 1 }}
        >
          ã­ã£ã³ã»ã«
        </button>
        <button onClick={handleSave} style={{ ...styles.btn("#374151", "#fff"), flex: 2 }}>
          {editingId ? "æ´æ°ãã" : "è¨é²ãä¿å­"}
        </button>
      </div>
    </div>
  );

  // ---- ä¸è¦§è¡¨ç¤º ----
  const renderList = () => (
    <div>
      {/* æ¤ç´¢ */}
      <input
        style={{ ...styles.input, marginBottom: 10, background: "#fff" }}
        placeholder="ã­ã¼ã¯ã¼ãã§æ¤ç´¢..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* ãã£ã«ã¿ */}
      <div style={styles.filterBar}>
        <select style={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">ãã¹ã¦ã®ç¨®å¥</option>
          {HARASSMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          style={styles.filterSelect}
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(Number(e.target.value))}
        >
          <option value={0}>ãã¹ã¦ã®æ·±å»åº¦</option>
          {SEVERITY_LEVELS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {records.length > 0 && (
          <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center", marginLeft: "auto" }}>
            {filteredRecords.length}/{records.length}ä»¶
          </span>
        )}
      </div>

      {/* è¨é²ä¸è¦§ */}
      {filteredRecords.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>ð</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {records.length === 0 ? "ã¾ã è¨é²ãããã¾ãã" : "è©²å½ããè¨é²ãããã¾ãã"}
          </div>
          <div style={{ fontSize: 13 }}>
            {records.length === 0 ? "ãè¨é²ãããã¿ãããæåã®è¨é²ãè¿½å ãã¾ããã" : "æ¤ç´¢æ¡ä»¶ãå¤æ´ãã¦ã¿ã¦ãã ãã"}
          </div>
        </div>
      ) : (
        filteredRecords.map((r) => (
          <div
            key={r.id}
            style={styles.card}
            onClick={() => {
              setSelectedRecord(r);
              setView("detail");
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                {r.date} {r.time && `${r.time}`}
              </span>
              <span style={styles.badge(r.severity)}>{SEVERITY_LEVELS[r.severity - 1]?.label}</span>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              {r.type} â {r.perpetrator}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#4b5563",
                lineHeight: 1.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.description}
            </div>
            {r.images?.length > 0 && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>ð ç»å {r.images.length}ä»¶</div>
            )}
          </div>
        ))
      )}

      {/* ã¨ã¯ã¹ãã¼ããã¿ã³ */}
      {records.length > 0 && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>ãã¼ã¿åºå</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExportPDF} style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db" }}>
              PDFåºå
            </button>
            <button onClick={handleExportCSV} style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db" }}>
              CSVåºå
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleBackup} style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db" }}>
              ããã¯ã¢ããä¿å­
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db" }}
            >
              å¾©å
            </button>
          </div>
          <input ref={importInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleRestore} />
        </div>
      )}

      {/* è¨é²ããªãå ´åãããã¯ã¢ããå¾©åã¯å¯è½ */}
      {records.length === 0 && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => importInputRef.current?.click()}
            style={{ ...styles.btn("#f3f4f6", "#6b7280"), width: "100%" }}
          >
            ããã¯ã¢ããããå¾©å
          </button>
          <input ref={importInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleRestore} />
        </div>
      )}
    </div>
  );

  // ---- è©³ç´°è¡¨ç¤º ----
  const renderDetail = () => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div>
        <button
          onClick={() => setView("list")}
          style={{
            background: "none",
            border: "none",
            color: "#6b7280",
            fontSize: 13,
            cursor: "pointer",
            padding: "4px 0",
            marginBottom: 12,
          }}
        >
          â ä¸è¦§ã«æ»ã
        </button>

        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#374151" }}>
                {r.date} {r.time}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{r.type}</div>
            </div>
            <span style={styles.badge(r.severity)}>{SEVERITY_LEVELS[r.severity - 1]?.label}</span>
          </div>

          {[
            ["å å®³è", r.perpetrator],
            ["å ´æ", r.location],
            ["ç®æè", r.witnesses],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14 }}>{value}</div>
              </div>
            ))}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>è©³ç´°åå®¹</div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                background: "#f9fafb",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {r.description}
            </div>
          </div>

          {r.emotionalImpact && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>ç²¾ç¥çã»èº«ä½çå½±é¿</div>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  background: "#f9fafb",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {r.emotionalImpact}
              </div>
            </div>
          )}

          {r.images?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>æ·»ä»ç»å</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    style={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: "#d1d5db", marginTop: 16 }}>
            è¨é²ID: {r.id} / ä½æ: {r.createdAt ? new Date(r.createdAt).toLocaleString("ja-JP") : "-"}
            {r.updatedAt && ` / æ´æ°: ${new Date(r.updatedAt).toLocaleString("ja-JP")}`}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => handleEdit(r)} style={{ ...styles.btn("#f3f4f6", "#374151"), flex: 1 }}>
              ç·¨é
            </button>
            <button
              onClick={() => setShowDeleteConfirm(r.id)}
              style={{ ...styles.btn("#fee2e2", "#dc2626"), flex: 1 }}
            >
              åé¤
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      {/* ãããã¼ */}
      <div style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={styles.headerTitle}>ãã©ã¹ã¡ã³ãè¨¼æ è¨é²</h1>
            <div style={styles.headerSub}>ãã¯ãã©ã»ã¢ã©ãã©ã®è¨é²ãå®å¨ã«ç®¡ç</div>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            style={{
              background: "none",
              border: "1px solid #d1d5db",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 15,
              cursor: "pointer",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            title="ãã®ã¢ããªã«ã¤ãã¦"
          >
            ?
          </button>
        </div>
      </div>

      {/* ããã²ã¼ã·ã§ã³ */}
      <div style={styles.nav}>
        <button style={styles.navBtn(view === "list" || view === "detail")} onClick={() => setView("list")}>
          è¨é²ä¸è¦§
        </button>
        <button
          style={styles.navBtn(view === "form")}
          onClick={() => {
            setEditingId(null);
            setForm({ ...INITIAL_FORM, date: new Date().toISOString().split("T")[0] });
            setView("form");
          }}
        >
          + è¨é²ãã
        </button>
      </div>

      {/* ã¡ã¤ã³ã³ã³ãã³ã */}
      <div style={styles.body}>
        {view === "form" && renderForm()}
        {view === "list" && renderList()}
        {view === "detail" && renderDetail()}
      </div>

      {/* ãã¼ã¹ã */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* åé¤ç¢ºèªã¢ã¼ãã« */}
      {showDeleteConfirm && (
        <div style={styles.deleteOverlay} onClick={() => setShowDeleteConfirm(null)}>
          <div style={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>è¨é²ãåé¤ãã¾ããï¼</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              ãã®æä½ã¯åãæ¶ãã¾ããã
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ ...styles.btn("#f3f4f6", "#6b7280"), flex: 1 }}>
                ã­ã£ã³ã»ã«
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={{ ...styles.btn("#dc2626", "#fff"), flex: 1 }}>
                åé¤ãã
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ãã¼ã¿ä¿ç®¡èª¬æã¢ã¼ãã«ï¼åå or ?ãã¿ã³ï¼ */}
      {showInfo && (
        <div style={styles.deleteOverlay} onClick={() => { setShowInfo(false); localStorage.setItem("harassment_app_info_seen", "1"); }}>
          <div
            style={{ ...styles.deleteModal, maxWidth: 360, textAlign: "left" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, textAlign: "center", color: "#374151" }}>
              ãã¼ã¿ã®ä¿ç®¡ã«ã¤ãã¦
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: "#4b5563" }}>
              <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <span style={{ fontWeight: 600, color: "#166534" }}>ããªãã®è¨é²ã¯å®å¨ã§ã</span><br />
                ãã¼ã¿ã¯ãã®ç«¯æ«ã®ãã©ã¦ã¶åã«ã®ã¿ä¿å­ããã¾ãããµã¼ãã¼ã¸ã®éä¿¡ã¯ä¸åããã¾ãããä»ã®äººããè¦ããããã¨ã¯ããã¾ããã
              </div>
              <div style={{ marginBottom: 12, padding: "10px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                <span style={{ fontWeight: 600, color: "#92400e" }}>ãæ³¨æãã ãã</span><br />
                ã»å¥ã®ç«¯æ«ãå¥ã®ãã©ã¦ã¶ããã¯è¨é²ãè¦ããã¾ãã<br />
                ã»ãã©ã¦ã¶ã®ãã¼ã¿æ¶å»ãè¡ãã¨è¨é²ãæ¶ãã¾ã
              </div>
              <div style={{ padding: "10px 12px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                <span style={{ fontWeight: 600, color: "#1e40af" }}>èªåããã¯ã¢ããæ©è½</span><br />
                è¨é²ãä¿å­ãããã³ã«ãããã¯ã¢ãããã¡ã¤ã«ãç«¯æ«ã®ãã¦ã³ã­ã¼ããã©ã«ãã«èªåä¿å­ããã¾ããä¸ãä¸ãã¼ã¿ãæ¶ãã¦ãããããã¯ã¢ããããå¾©åãã§åã«æ»ãã¾ãã
              </div>
            </div>
            <button
              onClick={() => { setShowInfo(false); localStorage.setItem("harassment_app_info_seen", "1"); }}
              style={{ ...styles.btn("#374151", "#fff"), width: "100%", marginTop: 18 }}
            >
              ãããã¾ãã
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
