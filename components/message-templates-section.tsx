"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, MessageSquare, Copy } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { createPortal } from "react-dom";

function getTemplateVariables(t: (key: string) => string) {
  return [
    { key: "{patient_name}", label: t("msgTpl.varPatientName"), preview: "Ahmed Mohamed" },
    { key: "{date}", label: t("msgTpl.varDate"), preview: "May 13" },
    { key: "{time}", label: t("msgTpl.varTime"), preview: "2:30 PM" },
    { key: "{clinic_address}", label: t("msgTpl.varClinicAddress"), preview: "123 Street, Cairo" },
  ];
}

export function MessageTemplatesSection({ clerkId, clinicAddressLink }: { clerkId: string; clinicAddressLink: string }) {
  const { t, lang } = useI18n();
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
  const seeded = useRef(false);

  // Auto-seed 3 default templates when empty
  useEffect(() => {
    if (!clerkId || templates === undefined || templates.length > 0 || seeded.current || seeding) return;
    seeded.current = true;
    setSeeding(true);
    const defaults = [
      { name: "الدور القادم", body: "مرحباً {patient_name}، دورك القادم الآن. يرجى التوجه إلى العيادة في أقرب وقت." },
      { name: "تذكير بالموعد", body: "مرحباً {patient_name}، نذكّرك بموعدك اليوم الساعة {time}. عنوان العيادة: {clinic_address}. نراك قريباً." },
      { name: "موعد فائت", body: "مرحباً {patient_name}، يبدو أنك لم تحضر موعدك بتاريخ {date}. يسعدنا إعادة الحجز عند اتصالك بنا." },
    ];
    Promise.all(defaults.map((d) => createTemplate({ clerkId, name: d.name, body: d.body })))
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

  return (
    <div className="space-y-3">
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
                    <button onClick={() => {
                      navigator.clipboard.writeText(preview(tpl.body));
                      toast.success(t("msgTpl.copied"));
                    }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => startEdit(tpl)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => del(tpl._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-muted-foreground">
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

// ── Template Editor with @-mention variable picker ──────────────────────────

function EditorForm({ name, setName, body, setBody, onSave, onCancel, preview, saving }: {
  name: string; setName: (v: string) => void;
  body: string; setBody: (v: string) => void;
  onSave: () => void; onCancel: () => void;
  preview: string; saving: boolean;
}) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMention, setShowMention] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  // Fixed position for the popup (escapes overflow:hidden parents)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const variables = useMemo(() => getTemplateVariables(t), [t]);

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
    <div className="border border-[#007AFF]/30 bg-[#007AFF]/[0.03] rounded-xl p-4 space-y-3">
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
