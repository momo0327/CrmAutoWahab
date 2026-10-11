import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Send, Loader2, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { sendEmailFn, getEmailTemplatesFn } from "@/lib/email.functions";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  is_shared: boolean;
};

type Props = {
  companyId: string;
  companyName: string;
  contactName?: string | null;
  toEmail: string;
  onClose: () => void;
  onSent?: () => void;
};

export function EmailComposer({ companyId, companyName, contactName, toEmail, onClose, onSent }: Props) {
  const nameForTemplate = contactName?.trim() || companyName;
  const sendEmail = useServerFn(sendEmailFn);
  const getTemplates = useServerFn(getEmailTemplatesFn);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTemplates({}).then((r) => setTemplates(r.templates as unknown as Template[]));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowTemplates(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function applyTemplate(t: Template) {
    setSelectedTemplate(t);
    setSubject(t.subject);
    setBody(t.body.replace(/\{\{name\}\}/g, nameForTemplate));
    setShowTemplates(false);
  }

  async function send() {
    if (!subject.trim() || !body.trim()) return toast.error("Ämne och meddelande krävs");
    setSending(true);
    const res = await sendEmail({
      data: {
        companyId,
        toEmail,
        toName: companyName,
        subject: subject.trim(),
        body: body.trim(),
        templateId: selectedTemplate?.id,
      },
    });
    setSending(false);
    if (!res.ok) return toast.error(res.error ?? "Kunde inte skicka mejl");
    toast.success("Mejl skickat!");
    onSent?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="font-display text-lg">Nytt mejl</h2>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded-md border hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* To */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-12 shrink-0">Till</span>
            <div className="flex-1 px-3 py-2 rounded-md border bg-muted/40 text-muted-foreground">
              {companyName} &lt;{toEmail}&gt;
            </div>
          </div>

          {/* Template picker */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setShowTemplates((o) => !o)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-muted"
            >
              {selectedTemplate ? selectedTemplate.name : "Välj mall (valfritt)"}
              <ChevronDown className={`size-3.5 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
            </button>
            {showTemplates && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-background border rounded-lg shadow-lg z-10 py-1 max-h-56 overflow-y-auto">
                {templates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Inga mallar ännu</div>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <span className="flex-1 truncate">{t.name}</span>
                      {t.is_shared && <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">Delad</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-12 shrink-0">Ämne</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ämnesrad…"
              className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
            />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Hej ${nameForTemplate},\n\n`}
            rows={12}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none font-mono"
          />
          <p className="text-[11px] text-muted-foreground">Använd {"{{name}}"} i mallar för att automatiskt fylla i kundens namn.</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md hover:bg-muted">Avbryt</button>
          <button
            onClick={send}
            disabled={sending || !subject.trim() || !body.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Skicka mejl
          </button>
        </div>
      </div>
    </div>
  );
}
