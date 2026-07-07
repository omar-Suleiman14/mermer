"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, MessageSquare, Copy, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/client";
import { createPortal } from "react-dom";

// ── Default templates — single source of truth for seeding & resetting ────────

export const DEFAULT_TEMPLATES = [
  { name: "الدور القادم",    body: "{patient_name}، دورك وصل دلوقتي. تعال للعيادة في أقرب وقت." },
  { name: "تذكير بالموعد",  body: "تذكير بموعدك\n{patient_name}، موعدك النهارده الساعة {time}.\n{clinic_address}\nنتمنالك الشفاء." },
  { name: "موعد فائت",      body: "{patient_name}، يبدو إنك ما جيتش في موعدك بتاريخ {date}.\nنتمنى تكون بخير. لو حبيت تحجز تاني، ابعتلنا." },
  { name: "تأكيد حجز",      body: "{patient_name}، الحجز اتأكد.\nالتاريخ: {date}\nالوقت: {time}\nهنشوفك قريب." },
  { name: "تعديل الموعد",   body: "{patient_name}، اتغير موعدك لـ {date} الساعة {time}.\nهنشوفك قريب." },
  { name: "إلغاء الموعد",   body: "{patient_name}، بنعتذر إن موعدك بتاريخ {date} اتلغى.\nلو حبيت تحجز تاني، ابعتلنا أو اتصل بينا." },
  { name: "خطة علاج",       body: "{patient_name}، اتعمل ليك خطة علاج بالتقسيط.\nأول موعد بتاريخ {date} الساعة {time}.\nهنشوفك قريب." },
  { name: "قسط متأخر",      body: "{patient_name}، عايزين نذكرك إن فيه قسط بقيمة {amount} جنيه متأخر من تاريخ {date}.\nنتمنالك دوام الصحة." },
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
  const [expandedId, setExpandedId] = useState<Id<"messageTemplates"> | null>(null);
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
    setEditId(row._id); setName(row.name); setBody(row.body); setAdding(false); setExpandedId(null);
  }
  function startNew() { setEditId(null); setName(""); setBody(""); setAdding(true); setExpandedId(null); }
  function cancel() { setAdding(false); setEditId(null); }

  function preview(b: string) {
    const loc = lang === "ar" ? "ar-EG" : "en-US";
    const now = new Date();
    return b
      .replace(/\{patient_name\}/g, "Ahmed Mohamed")
      .replace(/\{date\}/g, now.toLocaleDateString(loc, { month: "short", day: "numeric" }))
      .replace(/\{time\}/g, now.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit", hour12: true }))
      .replace(/\{clinic_address\}/g, clinicAddressLink || t("msgTpl.previewClinicFallback"))
      .replace(/\{amount\}/g, "500");
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

  async function resetOne(tpl: { _id: Id<"messageTemplates">; name: string }) {
    const def = DEFAULT_TEMPLATES.find((d) => d.name === tpl.name);
    if (!def) { toast.error("لا يوجد نص افتراضي لهذا القالب"); return; }
    setResetingId(tpl._id);
    try {
      await updateTemplate({ clerkId, templateId: tpl._id, name: tpl.name, body: def.body });
      toast.success("تم إعادة تعيين القالب");
    } catch { toast.error("فشل إعادة التعيين"); }
    finally { setResetingId(null); }
  }

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
      toast.success("تم إعادة تعيين جميع القوالب");
    } catch { toast.error("فشلت إعادة التعيين الكاملة"); }
    finally { setResettingAll(false); }
  }

  if (templates === undefined || seeding) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/40 rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {/* Header row */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {dir === "rtl"
            ? `${templates.length} قالب · اكتب @ لإدراج متغير`
            : `${templates.length} templates · Type @ to insert a variable`}
        </p>
        {templates.length > 0 && !adding && !editId && (
          <button
            onClick={resetAll}
            disabled={resettingAll}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-amber-600 transition-colors disabled:opacity-50"
          >
            {resettingAll ? <IOSSpinner size={11} className="text-amber-600" /> : <RotateCcw className="w-3 h-3" />}
            {dir === "rtl" ? "إعادة تعيين الكل" : "Reset all"}
          </button>
        )}
      </div>

      {/* Template list */}
      {templates.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-3">
            <MessageSquare className="w-6 h-6 text-[#007AFF]" />
          </div>
          <p className="text-sm font-semibold mb-1">{t("msgTpl.empty")}</p>
          <p className="text-xs text-muted-foreground mb-4">{dir === "rtl" ? "ابدأ بإضافة قالب رسالة واتساب" : "Add your first WhatsApp message template"}</p>
          <button
            onClick={startNew}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#007AFF] hover:bg-[#0062cc] px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t("msgTpl.createFirst")}
          </button>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {templates.map((tpl, idx) => (
            <motion.div
              key={tpl._id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {editId === tpl._id ? (
                <div className="p-4 bg-[#007AFF]/3 border-b border-[#007AFF]/10">
                  <EditorForm
                    name={name} setName={setName}
                    body={body} setBody={setBody}
                    onSave={save} onCancel={cancel}
                    preview={preview(body)} saving={saving}
                  />
                </div>
              ) : (
                <div className={`group transition-colors ${expandedId === tpl._id ? "bg-muted/20" : "hover:bg-muted/10"}`}>
                  {/* Row header — always visible */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-start"
                    onClick={() => setExpandedId(expandedId === tpl._id ? null : tpl._id)}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{tpl.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tpl.body.split("\n")[0]}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {expandedId === tpl._id
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded body + actions */}
                  <AnimatePresence>
                    {expandedId === tpl._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          {/* Body preview */}
                          <div className="bg-background rounded-2xl border border-border p-3">
                            <p className="text-xs text-muted-foreground font-medium mb-1.5">{dir === "rtl" ? "نص الرسالة" : "Message text"}</p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{tpl.body}</p>
                          </div>
                          {/* Live preview */}
                          <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-2xl p-3">
                            <p className="text-[10px] text-[#25D366] font-semibold uppercase tracking-wider mb-1.5">
                              {dir === "rtl" ? "معاينة واتساب" : "WhatsApp Preview"}
                            </p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{preview(tpl.body)}</p>
                          </div>
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => { navigator.clipboard.writeText(preview(tpl.body)); toast.success(t("msgTpl.copied")); }}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted/60 transition-colors text-muted-foreground"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {dir === "rtl" ? "نسخ" : "Copy"}
                            </button>
                            <button
                              onClick={() => startEdit(tpl)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-[#007AFF]/30 bg-[#007AFF]/5 hover:bg-[#007AFF]/10 transition-colors text-[#007AFF]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              {dir === "rtl" ? "تعديل" : "Edit"}
                            </button>
                            {DEFAULT_TEMPLATES.some((d) => d.name === tpl.name) && (
                              <button
                                onClick={() => resetOne(tpl)}
                                disabled={resetingId === tpl._id}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-amber-600 disabled:opacity-50"
                              >
                                {resetingId === tpl._id ? <IOSSpinner size={12} className="text-amber-600" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                {dir === "rtl" ? "إعادة تعيين" : "Reset"}
                              </button>
                            )}
                            <button
                              onClick={() => del(tpl._id)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors text-red-500 ms-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {dir === "rtl" ? "حذف" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* New template form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-[#007AFF]/3">
              <p className="text-xs font-semibold text-[#007AFF] mb-3">{dir === "rtl" ? "قالب جديد" : "New Template"}</p>
              <EditorForm
                name={name} setName={setName}
                body={body} setBody={setBody}
                onSave={save} onCancel={cancel}
                preview={preview(body)} saving={saving}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add button */}
      {!adding && !editId && templates !== undefined && (
        <div className="px-4 py-3">
          <button
            onClick={startNew}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#007AFF] hover:bg-[#007AFF]/5 py-2.5 rounded-xl transition-colors border border-dashed border-[#007AFF]/30"
          >
            <Plus className="w-4 h-4" />
            {t("msgTpl.addTemplate")}
          </button>
        </div>
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
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const variables = useMemo(() => getTemplateVariables(t, dir), [t, dir]);

  const filtered = variables.filter((v) =>
    v.label.toLowerCase().includes(mentionFilter.toLowerCase()) ||
    v.key.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  useEffect(() => {
    if (!showMention || !textareaRef.current) { setPopupPos(null); return; }
    const rect = textareaRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 220) {
      setPopupPos({ top: rect.top - 8, left: rect.left, width: rect.width });
    } else {
      setPopupPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
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
    if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(filtered[mentionIdx]); }
    else if (e.key === "Escape") { setShowMention(false); }
  }

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("msgTpl.namePlaceholder")}
        className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] font-semibold"
      />

      <div className="relative">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] text-muted-foreground">{t("msgTpl.typeAtPart1")}</span>
          <span className="font-mono bg-[#007AFF]/10 text-[#007AFF] text-[11px] font-bold px-1.5 py-0.5 rounded-md">@</span>
          <span className="text-[11px] text-muted-foreground">{t("msgTpl.typeAtPart2")}</span>
        </div>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder={t("msgTpl.bodyPlaceholder")}
          className="w-full px-4 py-3 text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none leading-relaxed"
        />

        {/* @-mention portal */}
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
                width: Math.max(popupPos.width, 260),
                transform: "translateY(-100%)",
                zIndex: 9999,
              }}
              className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {dir === "rtl" ? "اختر متغير" : "Insert variable"}
                </p>
              </div>
              {filtered.map((v, i) => (
                <button
                  key={v.key}
                  onMouseDown={(e) => { e.preventDefault(); insertVariable(v); }}
                  onMouseEnter={() => setMentionIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-start transition-colors ${i === mentionIdx ? "bg-[#007AFF]/10" : "hover:bg-muted/40"}`}
                >
                  <span className="text-[10px] font-mono font-bold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-lg shrink-0">
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

      {/* WhatsApp preview */}
      {body && (
        <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-2xl p-3">
          <p className="text-[10px] text-[#25D366] font-semibold uppercase tracking-wider mb-1.5">
            {dir === "rtl" ? "معاينة واتساب" : "WhatsApp Preview"}
          </p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{preview}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-2xl border border-border hover:bg-muted/60 transition-colors flex-1 justify-center"
        >
          <X className="w-3.5 h-3.5" /> {t("common.cancel")}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-2xl bg-[#007AFF] text-white hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex-1 justify-center shadow-sm"
        >
          {saving ? <IOSSpinner size={14} className="text-white" /> : <Check className="w-3.5 h-3.5" />}
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
