// supabase/functions/sendcloud-api/index.ts
// Edge Function pour l'intégration Sendcloud
// 🔒 Les clés API restent côté serveur

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDCLOUD_API_URL = "https://panel.sendcloud.sc/api/v2";

// Clés API Sendcloud (configurées dans les secrets Supabase)
const SENDCLOUD_PUBLIC_KEY = Deno.env.get("SENDCLOUD_PUBLIC_KEY") || "";
const SENDCLOUD_SECRET_KEY = Deno.env.get("SENDCLOUD_SECRET_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth header pour Sendcloud (Basic Auth)
    const authHeader = "Basic " + btoa(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`);

    // Log pour debug
    console.log("🔑 Sendcloud keys configured:", !!SENDCLOUD_PUBLIC_KEY && !!SENDCLOUD_SECRET_KEY);

    // Récupérer l'action depuis le body (POST) ou les query params (GET)
    let action = "";
    let body: any = {};

    if (req.method === "POST") {
      try {
        body = await req.json();
        action = body.action || "";
        console.log("📥 POST body:", JSON.stringify(body));
      } catch (e) {
        console.log("⚠️ No JSON body, checking query params");
      }
    }

    // Fallback sur query params
    if (!action) {
      const url = new URL(req.url);
      action = url.searchParams.get("action") || "shipping-methods";
      console.log("📥 Query param action:", action);
    }

    console.log("🎯 Action:", action);

    // ============================================================
    // ACTION: Récupérer les méthodes d'expédition disponibles
    // ============================================================
    if (action === "shipping-methods") {
      console.log("📦 Fetching shipping methods from Sendcloud...");
      
      const response = await fetch(`${SENDCLOUD_API_URL}/shipping_methods`, {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Sendcloud response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Sendcloud API error:", errorText);
        return new Response(
          JSON.stringify({ error: `Sendcloud API error: ${response.status}`, details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log("✅ Got", data.shipping_methods?.length || 0, "shipping methods");
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: Calculer les tarifs pour une expédition
    // ============================================================
    if (action === "get-rates") {
      console.log("💰 Calculating rates for:", body);

      // Validation
      if (!body.from_postal_code || !body.to_postal_code || !body.weight) {
        return new Response(
          JSON.stringify({ 
            error: "Missing required fields", 
            required: ["from_postal_code", "to_postal_code", "weight"],
            received: body 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Récupérer toutes les méthodes d'expédition
      const methodsResponse = await fetch(`${SENDCLOUD_API_URL}/shipping_methods`, {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!methodsResponse.ok) {
        const errorText = await methodsResponse.text();
        console.error("❌ Failed to fetch shipping methods:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch shipping methods", details: errorText }),
          { status: methodsResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const methodsData = await methodsResponse.json();
      const shippingMethods = methodsData.shipping_methods || [];
      console.log("📦 Got", shippingMethods.length, "shipping methods to filter");

      // Filtrer les méthodes disponibles pour ce trajet
      const fromCountry = body.from_country || "FR";
      const toCountry = body.to_country || "FR";
      const weightInKg = parseFloat(body.weight) || 1;
      const weightInGrams = weightInKg * 1000;

      const availableRates = shippingMethods
        .filter((method: any) => {
          // Vérifier le poids
          const minWeight = parseFloat(method.min_weight) || 0;
          const maxWeight = parseFloat(method.max_weight) || 999999;
          const weightOk = weightInGrams >= minWeight && weightInGrams <= maxWeight;

          if (!weightOk) return false;

          // Vérifier si la méthode supporte les pays (si l'info est disponible)
          if (method.countries && method.countries.length > 0) {
            const supportsFromCountry = method.countries.some(
              (c: any) => c.iso_2 === fromCountry || c.iso_2 === "FR"
            );
            return supportsFromCountry;
          }

          return true;
        })
        .map((method: any) => {
          // Trouver le prix pour le pays de destination
          let price = null;
          let deliveryDays = 3;

          if (method.countries && method.countries.length > 0) {
            const countryInfo = method.countries.find(
              (c: any) => c.iso_2 === toCountry || c.iso_2 === "FR"
            );
            if (countryInfo) {
              price = countryInfo.price;
              deliveryDays = Math.ceil((countryInfo.lead_time_hours || 72) / 24);
            }
          }

          return {
            id: method.id,
            name: method.name,
            carrier: method.carrier,
            price: price,
            min_weight: method.min_weight,
            max_weight: method.max_weight,
            delivery_days: deliveryDays,
            tracking: true,
          };
        });

      console.log("✅ Filtered to", availableRates.length, "available rates");

      return new Response(JSON.stringify({ 
        rates: availableRates,
        request: {
          from_postal_code: body.from_postal_code,
          to_postal_code: body.to_postal_code,
          weight: weightInKg,
          from_country: fromCountry,
          to_country: toCountry
        },
        total_methods: availableRates.length 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: Créer une expédition (parcel)
    // ============================================================
    if (action === "create-parcel") {
      console.log("📦 Creating parcel:", body);

      const parcelData = {
        parcel: {
          name: body.to_name,
          company_name: body.to_company || "",
          address: body.to_address,
          house_number: body.to_house_number || "",
          city: body.to_city,
          postal_code: body.to_postal_code,
          country: body.to_country || "FR",
          telephone: body.to_phone || "",
          email: body.to_email || "",
          shipment: {
            id: body.shipping_method_id,
          },
          weight: String(Math.round((body.weight || 1) * 1000)), // Convertir en grammes
          order_number: body.reference || "",
          request_label: body.request_label !== false,
        },
      };

      const response = await fetch(`${SENDCLOUD_API_URL}/parcels`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parcelData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Sendcloud create parcel error:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to create parcel", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log("✅ Parcel created:", data.parcel?.id);
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: Récupérer le statut d'un colis
    // ============================================================
    if (action === "track") {
      const url = new URL(req.url);
      const parcelId = url.searchParams.get("parcel_id") || body.parcel_id;
      
      if (!parcelId) {
        return new Response(
          JSON.stringify({ error: "Missing parcel_id parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(`${SENDCLOUD_API_URL}/parcels/${parcelId}`, {
        method: "GET",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: "Failed to track parcel", details: errorText }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: Test de connexion
    // ============================================================
    if (action === "test") {
      return new Response(JSON.stringify({ 
        status: "ok",
        keys_configured: !!SENDCLOUD_PUBLIC_KEY && !!SENDCLOUD_SECRET_KEY,
        public_key_preview: SENDCLOUD_PUBLIC_KEY ? SENDCLOUD_PUBLIC_KEY.substring(0, 8) + "..." : "NOT SET"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action non reconnue
    return new Response(
      JSON.stringify({ 
        error: "Unknown action: " + action, 
        available_actions: ["shipping-methods", "get-rates", "create-parcel", "track", "test"] 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});