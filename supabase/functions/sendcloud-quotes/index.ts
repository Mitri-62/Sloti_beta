// supabase/functions/sendcloud-quotes/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDCLOUD_PUBLIC_KEY = Deno.env.get('SENDCLOUD_PUBLIC_KEY')!;
const SENDCLOUD_SECRET_KEY = Deno.env.get('SENDCLOUD_SECRET_KEY')!;
const SENDCLOUD_API_URL = 'https://panel.sendcloud.sc/api/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const credentials = btoa(`${SENDCLOUD_PUBLIC_KEY}:${SENDCLOUD_SECRET_KEY}`);
    
    // Récupérer les shipping methods
    const response = await fetch(`${SENDCLOUD_API_URL}/shipping_methods`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sendcloud error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Sendcloud API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});