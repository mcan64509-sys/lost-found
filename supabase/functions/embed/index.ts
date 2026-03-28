import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const model = new Supabase.ai.Session("gte-small");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string") {
      return new Response(
        JSON.stringify({ error: "input alanı gerekli" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embedding = await model.run(input.slice(0, 512), {
      mean_pool: true,
      normalize: true,
    });

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});