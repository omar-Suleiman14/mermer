"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, MessageSquare, Copy, RotateCcw } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/client";
import { createPortal } from "react-dom";

// ── Default templates — single source of truth for seeding & resetting ────────

export const DEFAULT_TEMPLATES = [
  { name: "الدور القادم",    body: "مرحباً {patient_name}\nدورك القادم الآن. يرجى التوجه إلى العيادة في أقرب وقت." },
  { name: "تذكير بالموعد",  body: "تذكير بموعدك\nمرحباً {patient_name}، موعدك اليوم الساعة {time}.\n{clinic_address}\nنتمنى لك الشفاء العاجل." },
  { name: "موعد فائت",      body: "مرحباً {patient_name}\nيبدو أنك لم تحضر موعدك بتاريخ {date}.\nنتمنى أن تكون بخير. يسعدنا إعادة الحجز عند اتصالك بنا." },
  { name: "تأكيد حجز",      body: "مرحباً {patient_name}\nتم تأكيد حجزك بتاريخ {date} الساعة {time}.\nنراك قريباً." },
  { name: "تعديل الموعد",   body: "مرحباً {patient_name}\nتم تعديل موعدك ليصبح بتاريخ {date} الساعة {time}.\nنراك قريباً." },
  { name: "إلغاء الموعد",   body: "مرحباً {patient_name}\nنعتذر عن إلغاء موعدك بتاريخ {date}.\nيسعدنا إعادة الحجز عند اتصالك بنا." },
  { name: "خطة علاج",       body: "مرحباً {patient_name}\nتم إنشاء خطة تقسيط علاجية خاصة بك.\nموعدك الأول بتاريخ {date} الساعة {time}.\nنراك قريباً." },
  { name: "قسط متأخر",      body: "مرحباً {patient_name}\nنود تذكيركم بوجود قسط متأخر بقيمة {amount} مستحق الدفع بتاريخ {date}.\nنتمنى لكم دوام الصحة والعافية." },
];

function getTemplateVariables(t: (key: string) => string, dir: string) {
  return [
    { key: "{patient_name}", label: t("msgTpl.varPatientName"), preview: "Ahmed Mohamed" },
    { key: "{date}", label: t("msgTpl.varDate"), preview: "May 13" },
    { key: "{time}", label: t("msgTpl.varTime"), preview: "2:30 PM" },
    { key: "{clinic_address}", label: t("msgTpl.varClinicAddress"), preview: "123 Street, Cairo" },
    { key: "{amount}", label: dir === "rtl" ? "المبلغ المستحق" : "Due Amount", preview: "500 EGP" },
  ];
}

export function MessageTemplatesSection({ clerkId, clinicAddressLink }: { clerkId: string; clinicAddressLink: string }) {
  const { t, lang, dir } = useI18n();
  const templates = useQuery(api.messageTemplates.listTemplates, clerkId ? { clerkId } : "skip");
  const createTemplate = useMutation(api.messageTemplates.createTemplate);
  const updateTemplate = useMutation(api.messageTemplates.updateTemplate);
  const deleteTemplate = useMutation(api.messageTemplates.deleteTemplate);

  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<Id<"messageTemplates"> | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [resetingId, setResetingId] = useState<Id<"messageTemplates"> | null>(null);
  const seeded = useRef(false);

  // Auto-seed default templates when empty
  useEffect(() => {
    if (!clerkId || templates === undefined || templates.length > 0 || seeded.current || seeding) return;
    seeded.current = true;
    setSeeding(true);
    Promise.all(DEFAULT_TEMPLATES.map((d) => createTemplate({ clerkId, name: d.name, body: d.body })))
      .then(() => setSeeding(false))
      .catch(() => setSeeding(false));
  }, [clerkId, templates, createTemplate, seeding]);

  function startEdit(row: { _id: Id<"messageTemplates">; name: string; body: string }) {
    setEditId(row._id); setName(row.name); setBody(row.body); setAdding(false);
  }
  function startNew() { setEditId(null); setName(""); setBody(""); setAdding(true); }
  function cancel() { setAdding(false); setEditId(null); }

  function preview(b: string) {
    const loc = lang === "ar" ? "ar-EG" : "en-US";
    const now = new Date();
    return b
      .replace(/\{patient_name\}/g, "Ahmed Mohamed")
      .replace(/\{date\}/g, now.toLocaleDateString(loc, { month: "short", day: "numeric" }))
      .replace(/\{time\}/g, now.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit", hour12: true }))
      .replace(/\{clinic_address\}/g, clinicAddressLink || t("msgTpl.previewClinicFallback"));
  }

  async function save() {
    if (!name.trim()) { toast.error(t("msgTpl.nameRequired")); return; }
    if (!body.trim()) { toast.error(t("msgTpl.bodyRequired")); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateTemplate({ clerkId, templateId: editId, name: name.trim(), body: body.trim() });
        toast.success(t("msgTpl.updated"));
      } else {
        await createTemplate({ clerkId, name: name.trim(), body: body.trim() });
        toast.success(t("msgTpl.created"));
      }
      cancel();
    } catch { toast.error(t("msgTpl.saveFailed")); }
    finally { setSaving(false); }
  }

  async function del(id: Id<"messageTemplates">) {
    if (!confirm(t("msgTpl.deleteConfirm"))) return;
    try { await deleteTemplate({ clerkId, templateId: id }); toast.success(t("toast.deleted")); }
    catch { toast.error(t("msgTpl.deleteFailed")); }
  }

  /** Reset a single template to its default body (matched by name). */
  async function resetOne(tpl: { _id: Id<"messageTemplates">; name: string }) {
    const def = DEFAULT_TEMPLATES.find((d) => d.name === tpl.name);
    if (!def) {
      toast.error("لا يوجد نص افتراضي لهذا القالب");
      return;
    }
    setResetingId(tpl._id);
    try {
      await updateTemplate({ clerkId, templateId: tpl._id, name: tpl.name, body: def.body });
      toast.success("تم إعادة تعيين القالب إلى النص الافتراضي");
    } catch {
      toast.error("فشل إعادة التعيين");
    } finally {
      setResetingId(null);
    }
  }

  /** Reset ALL templates that match a default name back to default bodies. */
  async function resetAll() {
    if (!templates || templates.length === 0) return;
    if (!confirm("هل تريد إعادة تعيين جميع القوالب إلى النصوص الافتراضية؟")) return;
    setResettingAll(true);
    try {
      await Promise.all(
        templates.map((tpl) => {
          const def = DEFAULT_TEMPLATES.find((d) => d.name === tpl.name);
          if (!def) return Promise.resolve();
          return updateTemplate({ clerkId, templateId: tpl._id, name: tpl.name, body: def.body });
        })
      );
      toast.success("تم إعادة تعيين جميع القوالب إلى النصوص الافتراضية");
    } catch {
      toast.error("فشلت إعادة التعيين الكاملة");
    } finally {
      setResettingAll(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Header with Reset All */}
      {templates && templates.length > 0 && !adding && !editId && (
        <div className="flex items-center justify-end">
          <button
            onClick={resetAll}
            disabled={resettingAll}
            title="إعادة تعيين جميع القوالب"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {resettingAll ? <IOSSpinner size={12} className="text-muted-foreground" /> : <RotateCcw className="w-3 h-3" />}
            {resettingAll ? "جارٍ الإعادة..." : "إعادة تعيين الكل"}
          </button>
        </div>
      )}

      {/* Template list */}
      {templates === undefined ? (
        <div className="h-10 bg-muted/30 rounded-xl animate-pulse" />
      ) : templates.length === 0 && !adding ? (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-3">{t("msgTpl.empty")}</p>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> {t("msgTpl.createFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div key={tpl._id}>
              {editId === tpl._id ? (
                <EditorForm
                  name={name} setName={setName}
                  body={body} setBody={setBody}
                  onSave={save} onCancel={cancel}
                  preview={preview(body)} saving={saving}
                />
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card group hover:border-[#007AFF]/20 transition-colors">
                  <MessageSquare className="w-4 h-4 text-[#007AFF] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.body}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(preview(tpl.body));
                        toast.success(t("msgTpl.copied"));
                      }}
                      title="نسخ"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startEdit(tpl)}
                      title="تعديل"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Per-template reset button — only shown when a default exists */}
                    {DEFAULT_TEMPLATES.some((d) => d.name === tpl.name) && (
                      <button
                        onClick={() => resetOne(tpl)}
                        disabled={resetingId === tpl._id}
                        title="إعادة تعيين إلى الافتراضي"
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-colors text-muted-foreground disabled:opacity-50"
                      >
                        {resetingId === tpl._id
                          ? <IOSSpinner size={12} className="text-amber-600" />
                          : <RotateCcw className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                    <button
                      onClick={() => del(tpl._id)}
                      title="حذف"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-muted-foreground"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New template form */}
      {adding && (
        <EditorForm
          name={name} setName={setName}
          body={body} setBody={setBody}
          onSave={save} onCancel={cancel}
          preview={preview(body)} saving={saving}
        />
      )}

      {!adding && !editId && templates && templates.length > 0 && (
        <button
          onClick={startNew}
          className="flex items-center gap-2 text-sm font-semibold text-[#007AFF] hover:underline"
        >
          <Plus className="w-4 h-4" /> {t("msgTpl.addTemplate")}
        </button>
      )}
    </div>
  );
}

// ── Template Editor with @-mention variable picker ───────────────────────────

function EditorForm({ name, setName, body, setBody, onSave, onCancel, preview, saving }: {
  name: string; setName: (v: string) => void;
  body: string; setBody: (v: string) => void;
  onSave: () => void; onCancel: () => void;
  preview: string; saving: boolean;
}) {
  const { t, dir } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMention, setShowMention] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  // Fixed position for the popup (escapes overflow:hidden parents)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const variables = useMemo(() => getTemplateVariables(t, dir), [t, dir]);

  const filtered = variables.filter((v) =>
    v.label.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    v.key.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Recompute popup position whenever the mention opens
  useEffect(() => {
    if (!showMention || !textareaRef.current) { setPopupPos(null); return; }
    const rect = textareaRef.current.getBoundingClientRect();
    setPopupPos({ top: rect.top - 8, left: rect.left, width: rect.width });
  }, [showMention]);

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setBody(val);

    const before = val.slice(0, pos);
    const atIdx = before.lastIndexOf("@");

    if (atIdx >= 0) {
      const afterAt = before.slice(atIdx + 1);
      const precededBySpace = atIdx === 0 || before[atIdx - 1] === " " || before[atIdx - 1] === "\n";
      if (precededBySpace && !afterAt.includes(" ") && !afterAt.includes("\n")) {
        setShowMention(true);
        setMentionFilter(afterAt);
        setMentionStart(atIdx);
        setMentionIdx(0);
        return;
      }
    }
    setShowMention(false);
  }, [setBody]);

  function insertVariable(variable: (typeof variables)[0]) {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const pos = ta.selectionStart;
    const before = body.slice(0, mentionStart);
    const after = body.slice(pos);
    const newBody = before + variable.key + " " + after;
    setBody(newBody);
    setShowMention(false);
    setMentionFilter("");
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = mentionStart + variable.key.length + 1;
      ta.setSelectionRange(newPos, newPos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showMention || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertVariable(filtered[mentionIdx]);
    } else if (e.key === "Escape") {
      setShowMention(false);
    }
  }

  return (
    <div className="border border-[#007AFF]/30 bg-[#007AFF]/3 rounded-xl p-4 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("msgTpl.namePlaceholder")}
        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
      />

      <div className="relative">
        <div className="flex items-center gap-1 mb-1.5 text-[10px] text-muted-foreground">
          <span>{t("msgTpl.typeAtPart1")}</span>
          <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[#007AFF] font-bold">@</span>
          <span>{t("msgTpl.typeAtPart2")}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={t("msgTpl.bodyPlaceholder")}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none font-mono"
        />

        {/* @-mention dropdown — rendered via portal to escape overflow:hidden parents */}
        {showMention && filtered.length > 0 && popupPos && typeof window !== "undefined" && createPortal(
          <AnimatePresence>
            <motion.div
              key="mention-popup"
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "fixed",
                top: popupPos.top,
                left: popupPos.left,
                width: popupPos.width,
                transform: "translateY(-100%)",
                zIndex: 9999,
              }}
              className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              {filtered.map((v, i) => (
                <button
                  key={v.key}
                  onMouseDown={(e) => { e.preventDefault(); insertVariable(v); }}
                  onMouseEnter={() => setMentionIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === mentionIdx ? "bg-[#007AFF]/10" : "hover:bg-muted/40"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-md shrink-0">
                    {v.key}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{v.label}</p>
                    <p className="text-[10px] text-muted-foreground">{t("msgTpl.varEg")} {v.preview}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
      </div>

      {/* Live preview */}
      {body && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed">
          <span className="font-semibold">{t("msgTpl.preview")} </span>{preview}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex items-center gap-1 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
          <X className="w-3 h-3" /> {t("common.cancel")}
        </button>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-1 text-xs bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors disabled:opacity-60">
          {saving ? <IOSSpinner size={12} className="text-white" /> : <Check className="w-3 h-3" />} {t("common.save")}
        </button>
      </div>
    </div>
  );
}
