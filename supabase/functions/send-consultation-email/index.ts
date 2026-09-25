// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This Supabase Edge Function receives consultation submission records and delivers an email notification to the firm.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TO_EMAIL = Deno.env.get("NOTIFICATION_EMAIL") || "contact@shivaprashanth.com";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    service: string;
    message: string;
    created_at: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const record = payload.record || (payload as any);

    if (!record || !record.name || !record.email) {
      return new Response(JSON.stringify({ error: "Missing record data in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceLabels: Record<string, string> = {
      tax: "Indian Taxation",
      fssai: "FSSAI Registration",
      gst: "GST Registration & Filing",
      audit: "Audit & Assurance",
      other: "General Inquiry",
    };

    const serviceName = serviceLabels[record.service] || record.service;

    // Format HTML Email Template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #333333; margin: 0; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { background-color: #0A192F; padding: 24px; text-align: center; }
            .header h1 { color: #ffffff; font-size: 22px; margin: 0; }
            .header p { color: #D4AF37; margin: 4px 0 0 0; font-size: 14px; font-weight: 600; }
            .content { padding: 32px 24px; }
            .field-row { margin-bottom: 16px; border-bottom: 1px solid #edf2f7; padding-bottom: 12px; }
            .field-label { font-size: 12px; text-transform: uppercase; color: #718096; font-weight: 700; margin-bottom: 4px; }
            .field-value { font-size: 16px; color: #1a202c; }
            .message-box { background: #f7fafc; border-left: 4px solid #D4AF37; padding: 16px; border-radius: 4px; margin-top: 8px; font-size: 15px; line-height: 1.6; }
            .footer { background: #edf2f7; padding: 16px; text-align: center; font-size: 12px; color: #718096; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>ShivaPrashanth & Associates</h1>
              <p>NEW CONSULTATION REQUEST</p>
            </div>
            <div class="content">
              <div class="field-row">
                <div class="field-label">Reference ID</div>
                <div class="field-value">${record.id || 'N/A'}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Client Name</div>
                <div class="field-value"><strong>${record.name}</strong></div>
              </div>
              <div class="field-row">
                <div class="field-label">Email Address</div>
                <div class="field-value"><a href="mailto:${record.email}">${record.email}</a></div>
              </div>
              <div class="field-row">
                <div class="field-label">Phone Number</div>
                <div class="field-value">${record.phone || 'Not provided'}</div>
              </div>
              <div class="field-row">
                <div class="field-label">Service Requested</div>
                <div class="field-value"><strong>${serviceName}</strong></div>
              </div>
              <div class="field-row" style="border-bottom: none;">
                <div class="field-label">Inquiry Message</div>
                <div class="message-box">${record.message}</div>
              </div>
            </div>
            <div class="footer">
              This is an automated notification from your website consultation system.<br>
              Received on ${new Date().toUTCString()}
            </div>
          </div>
        </body>
      </html>
    `;

    // Deliver via Resend if API key is provided
    if (RESEND_API_KEY) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [TO_EMAIL],
          reply_to: record.email,
          subject: `🔔 New Consultation Request: ${record.name} (${serviceName})`,
          html: emailHtml,
        }),
      });

      const resendData = await resendRes.json();
      return new Response(JSON.stringify({ success: true, emailResult: resendData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("No RESEND_API_KEY set in Edge Function secrets. Notification prepared:", {
      to: TO_EMAIL,
      client: record.name,
      service: serviceName,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email notification logged (set RESEND_API_KEY secret in Supabase to deliver live emails)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
