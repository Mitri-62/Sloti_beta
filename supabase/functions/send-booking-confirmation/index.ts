// supabase/functions/send-booking-confirmation/index.ts
// Edge Function pour envoyer un email de confirmation de RDV via Resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Sloti <noreply@getsloti.fr>"; // Même adresse que ta fonction existante

interface BookingData {
  name: string;
  email: string;
  company?: string;
  date: string;
  time: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const booking: BookingData = await req.json();
    
    // Formater la date
    const dateObj = new Date(booking.date + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Créer le lien Google Calendar
    const startDateTime = `${booking.date.replace(/-/g, "")}T${booking.time.replace(":", "")}00`;
    // Ajouter 30 min pour la fin
    const [hours, minutes] = booking.time.split(":").map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const endTime = `${String(endHours).padStart(2, "0")}${String(endMinutes % 60).padStart(2, "0")}00`;
    const endDateTime = `${booking.date.replace(/-/g, "")}T${endTime}`;
    
    const calendarTitle = encodeURIComponent(`Démo Sloti - ${booking.name}${booking.company ? ` (${booking.company})` : ""}`);
    const calendarDetails = encodeURIComponent(`Démo Sloti avec ${booking.name}\n\nEmail: ${booking.email}${booking.company ? `\nEntreprise: ${booking.company}` : ""}\n\nLien visio à envoyer avant le RDV`);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&dates=${startDateTime}/${endDateTime}&details=${calendarDetails}&ctz=Europe/Paris`;

    // Email au prospect
    const prospectEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [booking.email],
        subject: `✅ RDV confirmé - Démo Sloti le ${formattedDate}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0891b2 0%, #0284c7 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
        🎉 RDV Confirmé !
      </h1>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      
      <p style="font-size: 18px; color: #1f2937; margin-bottom: 24px;">
        Bonjour <strong>${booking.name}</strong>,
      </p>
      
      <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
        Merci pour votre intérêt pour Sloti ! Votre démo est confirmée.
      </p>
      
      <!-- RDV Box -->
      <div style="background: #f0fdfa; border: 2px solid #0891b2; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 24px; margin-right: 12px;">📅</span>
          <div>
            <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Date</div>
            <div style="font-size: 18px; color: #0f172a; font-weight: 600;">${formattedDate}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">🕐</span>
          <div>
            <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Heure</div>
            <div style="font-size: 18px; color: #0f172a; font-weight: 600;">${booking.time.replace(":", "h")}</div>
          </div>
        </div>
      </div>
      
      <!-- What to expect -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 12px;">📋 Au programme :</h3>
        <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Présentation de Sloti (10 min)</li>
          <li>Démo des fonctionnalités clés (15 min)</li>
          <li>Questions / Réponses (5 min)</li>
        </ul>
      </div>
      
      <!-- Meet link info -->
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>📧 Vous recevrez le lien Google Meet</strong> dans un email séparé la veille du RDV.
        </p>
      </div>
      
      <!-- Contact -->
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Une question avant le RDV ? Répondez directement à cet email ou appelez-moi au 
        <a href="tel:+33630671713" style="color: #0891b2; text-decoration: none;">06 30 67 17 13</a>.
      </p>
      
      <p style="font-size: 16px; color: #1f2937; margin-top: 24px;">
        À très vite,<br>
        <strong>Dimitri</strong><br>
        <span style="color: #6b7280; font-size: 14px;">Fondateur de Sloti</span>
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        Sloti - Optimisez votre supply chain de l'entrepôt à la livraison
      </p>
      <p style="margin: 0;">
        <a href="https://getsloti.fr" style="color: #0891b2; text-decoration: none;">getsloti.fr</a>
      </p>
    </div>
    
  </div>
</body>
</html>
        `,
      }),
    });

    if (!prospectEmail.ok) {
      const error = await prospectEmail.text();
      console.error("Erreur envoi email prospect:", error);
      throw new Error("Erreur envoi email prospect");
    }

    // Email de notification à Dimitri
    const adminEmail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ["dimitri.deremarque@gmail.com"],
        subject: `🆕 Nouveau RDV démo - ${booking.name}${booking.company ? ` (${booking.company})` : ""}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
  <h2 style="color: #0891b2;">🆕 Nouveau RDV de démo</h2>
  
  <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Nom</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${booking.name}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
        <a href="mailto:${booking.email}" style="color: #0891b2;">${booking.email}</a>
      </td>
    </tr>
    ${booking.company ? `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Entreprise</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${booking.company}</td>
    </tr>
    ` : ""}
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${formattedDate}</td>
    </tr>
    <tr>
      <td style="padding: 8px; color: #6b7280;">Heure</td>
      <td style="padding: 8px; font-weight: 600;">${booking.time}</td>
    </tr>
  </table>
  
  <p style="margin-top: 24px;">
    <a href="${googleCalendarUrl}" style="display: inline-block; background: #4285f4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 10px;">
      📅 Ajouter à Google Calendar
    </a>
    <a href="https://getsloti.fr/admin/bookings" style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Voir dans l'admin →
    </a>
  </p>
</body>
</html>
        `,
      }),
    });

    if (!adminEmail.ok) {
      console.error("Erreur envoi email admin (non bloquant)");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Emails envoyés" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});