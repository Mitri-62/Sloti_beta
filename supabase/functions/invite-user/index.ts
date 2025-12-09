// supabase/functions/invite-user/index.ts
// À déployer avec : supabase functions deploy invite-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { email, company_id, role, redirect_url, full_name } = await req.json();

    // Validation
    if (!email || !company_id || !role) {
      return new Response(
        JSON.stringify({ error: "email, company_id et role sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client admin avec service_role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Construire l'URL de redirection
    const siteUrl = Deno.env.get("SITE_URL") || "https://getsloti.fr";
    const finalRedirectUrl = redirect_url || `${siteUrl}/signup`;

    console.log("📧 Envoi invitation à:", email);
    console.log("🏢 Company ID:", company_id);
    console.log("👤 Role:", role);
    console.log("🔗 Redirect URL:", finalRedirectUrl);

    // Inviter l'utilisateur via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: finalRedirectUrl,
        data: {
          company_id: company_id,
          role: role,
          full_name: full_name || email.split("@")[0],
        }
      }
    );

    if (inviteError) {
      console.error("❌ Erreur invitation:", inviteError);
      
      if (inviteError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Cet email est déjà enregistré dans Sloti" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw inviteError;
    }

    console.log("✅ Invitation envoyée, user ID:", inviteData.user?.id);

    // Créer l'entrée dans la table users
    if (inviteData.user) {
      const { error: userError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: inviteData.user.id,
          email: email.toLowerCase(),
          company_id: company_id,
          role: role,
          full_name: full_name || email.split("@")[0],
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (userError) {
        console.error("⚠️ Erreur création user dans DB:", userError);
        // On continue quand même, l'invitation est envoyée
      } else {
        console.log("✅ User créé dans la table users");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation envoyée à ${email}`,
        user_id: inviteData.user?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erreur globale:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});