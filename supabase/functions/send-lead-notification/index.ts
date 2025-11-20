import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
    const { name, email, company, phone, message } = await req.json();

    // 📧 EMAIL 1 : Notification pour toi (admin)
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sloti <noreply@getsloti.fr>",
        to: ["dimitri.deremarque@gmail.com"],
        subject: ` Nouvelle demande de devis - ${company || name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2792B0 0%, #207A94 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Nouvelle demande de devis</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; margin-top: 0; font-size: 18px; border-bottom: 2px solid #2792B0; padding-bottom: 10px;">
                  👤 Informations de contact
                </h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 120px;">Nom :</td>
                    <td style="padding: 8px 0; color: #1f2937;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Email :</td>
                    <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #2792B0; text-decoration: none;">${email}</a></td>
                  </tr>
                  ${company ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Entreprise :</td>
                    <td style="padding: 8px 0; color: #1f2937;">${company}</td>
                  </tr>
                  ` : ''}
                  ${phone ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Téléphone :</td>
                    <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #2792B0; text-decoration: none;">${phone}</a></td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2 style="color: #1f2937; margin-top: 0; font-size: 18px; border-bottom: 2px solid #2792B0; padding-bottom: 10px;">
                  💬 Message
                </h2>
                <p style="color: #374151; line-height: 1.6; white-space: pre-wrap; margin: 0;">${message}</p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://getsloti.fr/admin/leads" 
                   style="display: inline-block; background: #2792B0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Voir toutes les demandes
                </a>
              </div>

              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                Vous recevez cet email car une demande a été soumise sur getsloti.fr
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!adminEmailRes.ok) {
      const errorData = await adminEmailRes.json();
      console.error("Admin email error:", errorData);
    }

    // 📧 EMAIL 2 : Confirmation pour le client
    const clientEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sloti <noreply@getsloti.fr>",
        to: [email],
        subject: "Votre demande a bien été reçue ✓",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2792B0 0%, #207A94 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Merci ${name} !</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                Votre demande a bien été reçue
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="display: inline-block; background: #10B981; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">
                    ✓
                  </div>
                </div>
                
                <h2 style="color: #1f2937; text-align: center; font-size: 22px; margin: 0 0 20px 0;">
                  Demande enregistrée avec succès
                </h2>
                
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                  Nous avons bien reçu votre demande de devis pour <strong>Sloti</strong>.
                  Notre équipe va l'étudier attentivement et vous recontactera dans les <strong>24 heures</strong>.
                </p>

                <div style="background: #eff6ff; border-left: 4px solid #2792B0; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    <strong>💡 En attendant :</strong> Découvrez nos fonctionnalités en détail sur notre site web.
                  </p>
                </div>
              </div>

              <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1f2937; margin-top: 0; font-size: 16px; margin-bottom: 15px;">
                  📋 Récapitulatif de votre demande :
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nom :</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 500; font-size: 14px;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email :</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${email}</td>
                  </tr>
                  ${company ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Entreprise :</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${company}</td>
                  </tr>
                  ` : ''}
                  ${phone ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Téléphone :</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${phone}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://getsloti.fr" 
                   style="display: inline-block; background: #2792B0; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Visiter notre site
                </a>
              </div>

              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                  Une question ? Contactez-nous :
                </p>
                <p style="margin: 0;">
                  <a href="mailto:contact@getsloti.fr" style="color: #2792B0; text-decoration: none; font-weight: 500;">
                    contact@getsloti.fr
                  </a>
                </p>
              </div>

              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; line-height: 1.5;">
                Cet email a été envoyé automatiquement suite à votre demande sur getsloti.fr<br>
                © ${new Date().getFullYear()} Sloti - Tous droits réservés
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!clientEmailRes.ok) {
      const errorData = await clientEmailRes.json();
      console.error("Client email error:", errorData);
    }

    // Retourner succès même si un email échoue
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});