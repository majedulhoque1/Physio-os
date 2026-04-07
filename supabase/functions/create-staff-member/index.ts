import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify calling user is a clinic_admin
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
    } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve caller's active clinic via their default_clinic_id
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("default_clinic_id")
      .eq("id", caller.id)
      .single();

    const targetClinicId = profile?.default_clinic_id;
    if (!targetClinicId) {
      return new Response(
        JSON.stringify({ error: "No clinic associated with your account" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify caller is clinic_admin for that specific clinic
    const { data: membership } = await supabaseAdmin
      .from("clinic_memberships")
      .select("clinic_id, role")
      .eq("user_id", caller.id)
      .eq("clinic_id", targetClinicId)
      .eq("role", "clinic_admin")
      .eq("status", "active")
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Only clinic admins can add staff" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const clinicId = targetClinicId;
    const { email, password, full_name, role, phone, specialization } =
      await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          clinic_id: clinicId,
          app_role: role,
        },
      });

    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({
          error: authError?.message ?? "Failed to create user",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = authData.user.id;

    // 2. Upsert user_profile (trigger may have already created a bare row)
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .upsert({
        id: userId,
        full_name,
        phone: phone || null,
        default_clinic_id: clinicId,
      }, { onConflict: "id" });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Create clinic_membership
    const { error: membershipError } = await supabaseAdmin
      .from("clinic_memberships")
      .insert({
        clinic_id: clinicId,
        user_id: userId,
        role,
        status: "active",
        invited_by: caller.id,
      });

    if (membershipError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: membershipError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. If therapist, create therapist record
    if (role === "therapist") {
      const { error: therapistError } = await supabaseAdmin
        .from("therapists")
        .insert({
          clinic_id: clinicId,
          user_id: userId,
          name: full_name,
          phone: phone || null,
          specialization: specialization || null,
          status: "active",
        });

      if (therapistError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: therapistError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email,
        role,
        message: `Staff member ${full_name} created`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
