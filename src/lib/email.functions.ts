import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Send Email ───────────────────────────────────────────────────────────────

export const sendEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      companyId: z.string().uuid().optional(),
      toEmail: z.string().email(),
      toName: z.string().optional(),
      subject: z.string().min(1),
      body: z.string().min(1),
      templateId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get sender's email from auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, error: "No sender email found" };

    const fromEmail = user.email;
    const fromName = user.user_metadata?.display_name || user.user_metadata?.full_name || fromEmail;

    const apiKey = process.env["SENDGRID_API_KEY"];
    if (!apiKey) return { ok: false, error: "SendGrid API key not configured" };

    // Call SendGrid API
    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: data.toEmail, name: data.toName ?? data.toEmail }],
        }],
        from: { email: fromEmail, name: fromName },
        reply_to: { email: fromEmail, name: fromName },
        subject: data.subject,
        content: [{ type: "text/html", value: data.body.replace(/\n/g, "<br>") }],
      }),
    });

    if (!sgRes.ok) {
      const errText = await sgRes.text();
      return { ok: false, error: `SendGrid error: ${errText}` };
    }

    // Log the sent email
    await supabase.from("email_logs" as any).insert({
      user_id: userId,
      company_id: data.companyId ?? null,
      from_email: fromEmail,
      to_email: data.toEmail,
      subject: data.subject,
      body: data.body,
      template_id: data.templateId ?? null,
    });

    return { ok: true };
  });

// ─── Templates CRUD ───────────────────────────────────────────────────────────

export const getEmailTemplatesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("email_templates" as any)
      .select("*")
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order("name");
    if (error) return { templates: [] };
    return { templates: data ?? [] };
  });

export const saveEmailTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      isShared: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { name: data.name, subject: data.subject, body: data.body, is_shared: data.isShared };
    if (data.id) {
      const { error } = await supabase.from("email_templates" as any).update(payload).eq("id", data.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("email_templates" as any).insert({ ...payload, user_id: userId });
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  });

export const deleteEmailTemplateFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("email_templates" as any).delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ─── Email Logs for a company ─────────────────────────────────────────────────

export const getCompanyEmailLogsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: logs, error } = await supabase
      .from("email_logs" as any)
      .select("*")
      .eq("company_id", data.companyId)
      .order("sent_at", { ascending: false });
    if (error) return { logs: [] };
    return { logs: logs ?? [] };
  });
