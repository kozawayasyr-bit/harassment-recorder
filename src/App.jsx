import { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ============================================================
// ハラスメント証拠記録アプリ
// パワハラ・モラハラの記録を安全に保存・管理するツール
// ============================================================

const STORAGE_KEY = "harassment_records_v1";

// localStorageから読み込み
function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn("データの読み込みに失敗しました", e);
  }
  return [];
}

// localStorageに保存
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn("データの保存に失敗しました", e);
  }
}

const HARASSMENT_TYPES = [
  "パワハラ（威圧・暴言）",
  "パワハラ（過大な要求）",
  "パワハラ（過小な要求・仕事外し）",
  "パワハラ（人間関係の切り離し）",
  "パワハラ（個の侵害）",
  "パワハラ（身体的攻撃）",
  "モラハラ（無視・排除）",
  "モラハラ（人格否定・侮辱）",
  "モラハラ（プライベートへの干渉）",
  "モラハラ（嫌がらせ・陰口）",
  "セクハラ",
  "その他",
];

const SEVERITY_LEVELS = [
  { value: 1, label: "軽度", color: "#6b7280", bg: "#f3f4f6" },
  { value: 2, label: "中度", color: "#d97706", bg: "#fef3c7" },
  { value: 3, label: "重度", color: "#dc2626", bg: "#fee2e2" },
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
  workImpact: "",
  images: [],
};

// ---- PDF生成 ----
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
        <tr><td style="color:#6b7280;width:100px;padding:4px 0;">種別</td><td>${escHtml(r.type)}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">加害者</td><td>${escHtml(r.perpetrator)}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">場所</td><td>${escHtml(r.location)}</td></tr>
        ${r.witnesses ? `<tr><td style="color:#6b7280;padding:4px 0;">目撃者</td><td>${escHtml(r.witnesses)}</td></tr>` : ""}
      </table>
      <div style="margin-top:10px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">詳細内容</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.6;">${escHtml(r.description)}</div>
      </div>
      ${
        r.emotionalImpact
          ? `<div style="margin-top:10px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">精神的・身体的影響</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.6;">${escHtml(r.emotionalImpact)}</div>
      </div>`
          : ""
      }
      ${
        r.workImpact
          ? `<div style="margin-top:10px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">業務上の影響</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.6;">${escHtml(r.workImpact)}</div>
      </div>`
          : ""
      }
      ${
        r.images && r.images.length > 0
          ? `<div style="margin-top:10px;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">添付画像 (${r.images.length}件)</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${r.images.map((img) => `<img src="${img}" style="max-width:200px;max-height:150px;border-radius:4px;border:1px solid #e5e7eb;" />`).join("")}
        </div>
      </div>`
          : ""
      }
    </div>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ハラスメント証拠記録</title>
<style>@media print{body{margin:0;padding:20px;}}</style></head>
<body style="font-family:'Hiragino Sans','Meiryo',sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#1f2937;">
<h1 style="font-size:20px;border-bottom:2px solid #374151;padding-bottom:12px;margin-bottom:8px;">マイメモ - 記録一覧</h1>
<p style="font-size:12px;color:#6b7280;margin-bottom:24px;">出力日: ${new Date().toLocaleDateString("ja-JP")}　/　記録件数: ${records.length}件</p>
${rows}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
この文書は「マイメモ」により自動生成されました
</div></body></html>`;
}

// ---- CSV生成 ----
function generateCSV(records) {
  const headers = [
    "日付",
    "時刻",
    "場所",
    "加害者",
    "種別",
    "深刻度",
    "詳細内容",
    "目撃者",
    "精神的影響",
    "業務上の影響",
    "画像数",
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
      r.workImpact,
      r.images?.length || 0,
    ]
      .map(csvEscape)
      .join(",")
  );
  return "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
}

// ---- メインコンポーネント ----
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
  const [showInfo, setShowInfo] = useState(false);
  const [showSetup, setShowSetup] = useState(() => {
    if (localStorage.getItem("harassment_app_setup_done_v2")) return false;
    // PWAとして起動済みならセットアップ不要
    if (window.matchMedia("(display-mode: standalone)").matches) return false;
    if (window.navigator.standalone) return false;
    return true;
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showGuideTooltip, setShowGuideTooltip] = useState(!localStorage.getItem("harassment_app_guide_read_v2"));
  const fileInputRef = useRef(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // beforeinstallprompt: Android Chrome etc.
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      showToast("インストールしました！");
      setShowSetup(false);
      localStorage.setItem("harassment_app_setup_done_v2", "1");
    }
    setDeferredPrompt(null);
  };
  // importInputRef は不要（バックアップをlocalStorage方式に変更）

  // recordsが変わるたびにlocalStorageに保存
  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // バックアップ用のlocalStorageキー
  const BACKUP_KEY = "harassment_backup_v1";

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // 画像追加
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

  // 記録保存
  const handleSave = () => {
    if (!form.date || !form.type || !form.description || !form.perpetrator) {
      showToast("日付・種別・加害者・詳細内容は必須です");
      return;
    }
    let updatedRecords;
    if (editingId) {
      updatedRecords = records.map((r) =>
        r.id === editingId ? { ...form, id: editingId, updatedAt: new Date().toISOString() } : r
      );
      setRecords(updatedRecords);
      setEditingId(null);
      showToast("記録を更新しました");
    } else {
      const newRecord = {
        ...form,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString(),
      };
      updatedRecords = [newRecord, ...records];
      setRecords(updatedRecords);
      showToast("記録を保存しました");
    }
    // 注: 自動ダウンロードはiOSで問題が起きるため無効化
    // 手動の「バックアップ保存」ボタンからダウンロードしてください
    setForm({ ...INITIAL_FORM, date: new Date().toISOString().split("T")[0] });
    setView("list");
  };

  // 削除
  const handleDelete = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setShowDeleteConfirm(null);
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
      setView("list");
    }
    showToast("記録を削除しました");
  };

  // 編集
  const handleEdit = (record) => {
    setForm({ ...record });
    setEditingId(record.id);
    setView("form");
  };

  // フィルタ
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

  // PDF出力
  const handleExportPDF = () => {
    const target = filteredRecords.length > 0 ? filteredRecords : records;
    if (target.length === 0) {
      showToast("出力する記録がありません");
      return;
    }
    const html = generatePDFContent(target);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => w.print(), 500);
    showToast("PDF出力用の画面を開きました（印刷→PDFで保存）");
  };

  // CSV出力
  const handleExportCSV = () => {
    const target = filteredRecords.length > 0 ? filteredRecords : records;
    if (target.length === 0) {
      showToast("出力する記録がありません");
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
    showToast("CSVファイルをダウンロードしました");
  };

  // バックアップ保存（localStorageに保存）
  const handleBackup = () => {
    if (records.length === 0) {
      showToast("バックアップする記録がありません");
      return;
    }
    try {
      const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records });
      localStorage.setItem(BACKUP_KEY, data);
      showToast(`${records.length}件の記録をバックアップしました`);
    } catch (e) {
      console.warn("バックアップ保存に失敗しました", e);
      showToast("バックアップの保存に失敗しました");
    }
  };

  // エクスポート（機種変更・端末移行用のファイル書き出し）
  const handleExportBackup = () => {
    if (records.length === 0) {
      showToast("エクスポートする記録がありません");
      return;
    }
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2);
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harassment_backup_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("バックアップファイルをエクスポートしました");
  };

  // インポート（ファイルからの復元 — 機種変更時に使用）
  const importInputRef = useRef(null);
  const handleImportBackup = (e) => {
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
          showToast(`${data.records.length}件の記録をインポートしました`);
        } else {
          showToast("ファイル形式が正しくありません");
        }
      } catch {
        showToast("ファイルの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = "";
  };

  // バックアップから復元（localStorageから読み込み）
  const handleRestore = () => {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) {
        showToast("バックアップデータがありません");
        return;
      }
      const data = JSON.parse(raw);
      if (data.records && Array.isArray(data.records)) {
        setRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newRecords = data.records.filter((r) => !existingIds.has(r.id));
          return [...newRecords, ...prev];
        });
        const savedDate = data.exportedAt ? new Date(data.exportedAt).toLocaleString("ja-JP") : "";
        showToast(`${data.records.length}件の記録を復元しました${savedDate ? `（${savedDate}時点）` : ""}`);
      } else {
        showToast("バックアップデータが無効です");
      }
    } catch {
      showToast("復元に失敗しました");
    }
  };

  // バックアップの月無を確認
  const hasBackup = () => {
    try {
      return !!localStorage.getItem(BACKUP_KEY);
    } catch {
      return false;
    }
  };

  // ---- スタイル ----
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

  // ---- 記録フォーム ----
  const renderForm = () => (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#374151" }}>
        {editingId ? "記録を編集" : "新しい記録を追加"}
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>日付 *</label>
          <input
            type="date"
            style={styles.input}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>時刻</label>
          <input
            type="time"
            style={styles.input}
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>ハラスメントの種別 *</label>
        <select style={styles.select} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="">選択してください</option>
          {HARASSMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>深刻度</label>
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
        <label style={styles.label}>加害者（氏名・役職など） *</label>
        <input
          style={styles.input}
          placeholder="例: 山田部長"
          value={form.perpetrator}
          onChange={(e) => setForm({ ...form, perpetrator: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>場所</label>
        <input
          style={styles.input}
          placeholder="例: 3风会議室、オフィスフロア"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>詳細内容 *</label>
        <textarea
          style={styles.textarea}
          placeholder="何が起きたか、具体的に記録してください。発言の引用や状況を詳しく書くと証拠として有効です。"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>目撃者</label>
        <input
          style={styles.input}
          placeholder="例: 鈴木さん（同じ課）"
          value={form.witnesses}
          onChange={(e) => setForm({ ...form, witnesses: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>精神的・身体的影響</label>
        <textarea
          style={{ ...styles.textarea, minHeight: 60 }}
          placeholder="そのとき感じたこと、体調の変化など"
          value={form.emotionalImpact}
          onChange={(e) => setForm({ ...form, emotionalImpact: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>業務への支障</label>
        <textarea
          style={{ ...styles.textarea, minHeight: 60 }}
          placeholder="例: 業務に集中できない、担当を外された、納期に遅れが出た、会議で発言できなくなった"
          value={form.workImpact}
          onChange={(e) => setForm({ ...form, workImpact: e.target.value })}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>写真・スクリーンショット</label>
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
          + 画像を追加
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
                  ×
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
          キャンセル
        </button>
        <button onClick={handleSave} style={{ ...styles.btn("#374151", "#fff"), flex: 2 }}>
          {editingId ? "更新する" : "記録を保存"}
        </button>
      </div>
    </div>
  );

  // ---- 一覧表示 ----
  const renderList = () => (
    <div>
      {/* 検索 */}
      <input
        style={{ ...styles.input, marginBottom: 10, background: "#fff" }}
        placeholder="キーワードで検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* フィルタ */}
      <div style={styles.filterBar}>
        <select style={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">すべての種別</option>
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
          <option value={0}>すべての深刻度</option>
          {SEVERITY_LEVELS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {records.length > 0 && (
          <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center", marginLeft: "auto" }}>
            {filteredRecords.length}/{records.length}件
          </span>
        )}
      </div>

      {/* 記録一覧 */}
      {filteredRecords.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {records.length === 0 ? "まだ記録がありません" : "該当する記録がありません"}
          </div>
          <div style={{ fontSize: 13 }}>
            {records.length === 0 ? "「記録する」タブから最初の記録を追加しましょう" : "検索条件を変更してみてください"}
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
              {r.type} — {r.perpetrator}
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
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>📎 画像 {r.images.length}件</div>
            )}
          </div>
        ))
      )}

      {/* データ出力 */}
      {records.length > 0 && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>データ出力</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExportPDF} style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db" }}>
              PDF出力
            </button>
            <button onClick={handleExportCSV} style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db" }}>
              CSV出力
            </button>
          </div>
        </div>
      )}

      {/* バックアップ・復元（常に表示） */}
      <div style={{ marginTop: records.length > 0 ? 12 : 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>バックアップ</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleBackup}
            style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db", opacity: records.length > 0 ? 1 : 0.4 }}
            disabled={records.length === 0}
          >
            バックアップ保存
          </button>
          <button
            onClick={handleRestore}
            style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db", opacity: hasBackup() ? 1 : 0.4 }}
            disabled={!hasBackup()}
          >
            復元{hasBackup() ? "" : "（未保存）"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>機種変更・端末移行</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleExportBackup}
            style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db", fontSize: 12, opacity: records.length > 0 ? 1 : 0.4 }}
            disabled={records.length === 0}
          >
            ファイルに書き出し
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            style={{ ...styles.btn("#fff", "#374151"), flex: 1, border: "1px solid #d1d5db", fontSize: 12 }}
          >
            ファイルから復元
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".txt,.json"
            style={{ display: "none" }}
            onChange={handleImportBackup}
          />
        </div>
      </div>
    </div>
  );

  // ---- 詳細表示 ----
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
          ← 一覧に戻る
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
            ["加害者", r.perpetrator],
            ["場所", r.location],
            ["目撃者", r.witnesses],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14 }}>{value}</div>
              </div>
            ))}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>詳細内容</div>
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
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>精神的・身体的影響</div>
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

          {r.workImpact && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>業務上の影響</div>
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
                {r.workImpact}
              </div>
            </div>
          )}

          {r.images?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>添付画像</div>
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
            記録ID: {r.id} / 作成: {r.createdAt ? new Date(r.createdAt).toLocaleString("ja-JP") : "-"}
            {r.updatedAt && ` / 更新: ${new Date(r.updatedAt).toLocaleString("ja-JP")}`}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => handleEdit(r)} style={{ ...styles.btn("#f3f4f6", "#374151"), flex: 1 }}>
              編集
            </button>
            <button
              onClick={() => setShowDeleteConfirm(r.id)}
              style={{ ...styles.btn("#fee2e2", "#dc2626"), flex: 1 }}
            >
              削除
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={styles.headerTitle}>マイメモ</h1>
            <div style={styles.headerSub}>日々の記録を安全に管理</div>
          </div>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => { setShowSetup(true); setShowGuideTooltip(false); localStorage.setItem("harassment_app_guide_read_v2", "1"); }}
              style={{
                background: "#f0f9ff",
                border: "1px solid #93c5fd",
                borderRadius: 16,
                padding: "6px 12px",
                fontSize: 13,
                cursor: "pointer",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
                flexShrink: 0,
                position: "relative",
              }}
              title="使い方・設定"
            >
              📖 使い方
              {!localStorage.getItem("harassment_app_guide_read_v2") && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#ef4444", border: "2px solid #fff",
                }} />
              )}
            </button>
            {showGuideTooltip && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#1e293b", color: "#fff", padding: "10px 14px",
                borderRadius: 10, fontSize: 12, lineHeight: 1.6,
                width: 220, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}>
                <div style={{ position: "absolute", top: -6, right: 16, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid #1e293b" }} />
                ホーム画面への追加方法や、大切な注意事項を確認できます。
                <div
                  onClick={() => { setShowGuideTooltip(false); localStorage.setItem("harassment_app_guide_read_v2", "1"); }}
                  style={{ marginTop: 8, color: "#93c5fd", cursor: "pointer", fontSize: 11, textAlign: "right" }}
                >閉じる</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <div style={styles.nav}>
        <button style={styles.navBtn(view === "list" || view === "detail")} onClick={() => setView("list")}>
          記録一覧
        </button>
        <button
          style={styles.navBtn(view === "form")}
          onClick={() => {
            setEditingId(null);
            setForm({ ...INITIAL_FORM, date: new Date().toISOString().split("T")[0] });
            setView("form");
          }}
        >
          + 記録する
        </button>
      </div>

      {/* メインコンテンツ */}
      <div style={styles.body}>
        {view === "form" && renderForm()}
        {view === "list" && renderList()}
        {view === "detail" && renderDetail()}
      </div>

      {/* トースト */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div style={styles.deleteOverlay} onClick={() => setShowDeleteConfirm(null)}>
          <div style={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>記録を削除しますか？</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              この操作は取り消せません。
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ ...styles.btn("#f3f4f6", "#6b7280"), flex: 1 }}>
                キャンセル
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm)} style={{ ...styles.btn("#dc2626", "#fff"), flex: 1 }}>
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 初回セットアップガイド（ホーム画面に追加） */}
      {showSetup && (
        <div style={styles.deleteOverlay}>
          <div
            style={{ ...styles.deleteModal, maxWidth: 370, textAlign: "left", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, textAlign: "center", color: "#374151" }}>
              はじめに
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", marginBottom: 16 }}>
              アプリとして快適に使うための設定
            </div>

            {/* iOS向け */}
            {deferredPrompt ? (
              <div style={{ fontSize: 13, lineHeight: 1.8, color: "#4b5563" }}>
                <div style={{ padding: "12px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", marginBottom: 12, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 12, fontSize: 14 }}>
                    ワンタップでインストール
                  </div>
                  <button
                    onClick={handleInstallClick}
                    style={{ padding: "12px 32px", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", background: "#3b82f6", color: "#fff" }}
                  >
                    ホーム画面に追加
                  </button>
                </div>
                <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 12, color: "#166534" }}>
                  ホーム画面から起動すると、通常のアプリと同じように全画面で使えます。
                </div>
              </div>
            ) : /iPhone|iPad|iPod/.test(navigator.userAgent) ? (
              <div style={{ fontSize: 13, lineHeight: 1.8, color: "#4b5563" }}>
                <div style={{ padding: "12px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8, fontSize: 14 }}>
                    ホーム画面に追加する
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>「共有」ボタン<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: "middle", flexShrink: 0}}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>をタップ</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</span>
                    <span>一覧に「ホーム画面に追加」があればタップ。<br />見つからない場合は<strong>「もっと見る」</strong>をタップ</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</span>
                    <span>「ホーム画面に追加」をタップ</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>4</span>
                    <span>右上の<strong>「追加」</strong>をタップして完了</span>
                  </div>
                </div>
                <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 12, color: "#166534" }}>
                  ホーム画面から起動すると、通常のアプリと同じように全画面で使えます。
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, lineHeight: 1.8, color: "#4b5563" }}>
                <div style={{ padding: "12px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8, fontSize: 14 }}>
                    ホーム画面に追加する
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
                    <span>画面右上の <strong>&#x22EE;</strong>（メニュー）をタップ</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</span>
                    <span><strong>「ホーム画面に追加」</strong>または<br /><strong>「アプリをインストール」</strong>をタップ</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</span>
                    <span><strong>「追加」</strong>または<strong>「インストール」</strong>をタップして完了</span>
                  </div>
                </div>
                <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 12, color: "#166534" }}>
                  ホーム画面から起動すると、通常のアプリと同じように全画面で使えます。
                </div>
              </div>
            )}

                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 4, cursor: "pointer" }}>
                          <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} style={{ width: 16, height: 16 }} />
                          <span style={{ fontSize: 12, color: "#6b7280" }}>今後表示しない</span>
                        </label>
                        <button
              onClick={() => {
                setShowSetup(false);
                if (dontShowAgain) { localStorage.setItem("harassment_app_setup_done_v2", "1"); }
                setDontShowAgain(false);
                setShowInfo(true);
              }}
              style={{ ...styles.btn("#374151", "#fff"), width: "100%", marginTop: 16 }}
            >
              設定できました
            </button>
            <button
              onClick={() => {
                setShowSetup(false);
                if (dontShowAgain) { localStorage.setItem("harassment_app_setup_done_v2", "1"); }
                setDontShowAgain(false);
                setShowInfo(true);
              }}
              style={{ ...styles.btn("#f3f4f6", "#6b7280"), width: "100%", marginTop: 8, fontSize: 12 }}
            >
              あとで設定する
            </button>
          </div>
        </div>
      )}

      {/* データ保管説明モーダル（初回 or ?ボタン） */}
      {showInfo && (
        <div style={styles.deleteOverlay} onClick={() => { setShowInfo(false); }}>
          <div
            style={{ ...styles.deleteModal, maxWidth: 360, textAlign: "left", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, textAlign: "center", color: "#374151" }}>
              データの保管について
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: "#4b5563" }}>
              <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <span style={{ fontWeight: 600, color: "#166534" }}>あなたの記録は安全です</span><br />
                データはこの端末のブラウザ内にのみ保存されます。サーバーへの送信は一切ありません。他の人から見られることはありません。
              </div>
              <div style={{ marginBottom: 12, padding: "10px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                <span style={{ fontWeight: 600, color: "#92400e" }}>ご注意ください</span><br />
                ・別の端末や別のブラウザからは記録を見られません<br />
                ・ブラウザのデータ消去を行うと記録も消えます
              </div>
              <div style={{ padding: "10px 12px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                <span style={{ fontWeight: 600, color: "#1e40af" }}>バックアップ機能</span><br />
                一覧画面の「バックアップ保存」ボタンを押すと、記録のコピーが端末内に自動保存されます。万が一データが消えても「復元」ボタンで元に戻せます。機種変更時は「ファイルに書き出し」→新端末で「ファイルから復元」でデータを移行できます。
              </div>
            </div>
            <button
              onClick={() => { setShowInfo(false); }}
              style={{ ...styles.btn("#374151", "#fff"), width: "100%", marginTop: 18 }}
            >
              わかりました
            </button>
            <button
              onClick={() => { setShowInfo(false); setShowSetup(true); }}
              style={{ ...styles.btn("#f3f4f6", "#6b7280"), width: "100%", marginTop: 8, fontSize: 12 }}
            >
              ホーム画面への追加方法を見る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
