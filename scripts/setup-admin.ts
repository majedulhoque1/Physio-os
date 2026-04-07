import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function setupAdmin() {
  const email = "majedulhoqueofficial@gmail.com";
  const password = "Majed123";
  const fullName = "Majedul Hoque Shakil";

  try {
    console.log("Creating auth user...");
    // Create auth user via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes("already exists")) {
        console.log("User already exists, proceeding with clinic setup...");
        // Try to get the user
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          email
        );
        if (userError) {
          console.error("Failed to get existing user:", userError);
          process.exit(1);
        }
        authData.user = userData;
      } else {
        console.error("Failed to create auth user:", authError);
        process.exit(1);
      }
    }

    const userId = authData.user.id;
    console.log("✓ Auth user created:", userId);

    // Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      console.log("✓ User profile already exists");
    } else {
      console.log("Creating user profile...");
      const { error: profileError } = await supabase.from("user_profiles").insert({
        id: userId,
        full_name: fullName,
      });

      if (profileError) {
        console.error("Failed to create user profile:", profileError);
        process.exit(1);
      }
      console.log("✓ User profile created");
    }

    // Check if clinic exists
    const { data: existingClinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    let clinicId: string;

    if (existingClinic) {
      clinicId = existingClinic.id;
      console.log("✓ Clinic already exists:", clinicId);
    } else {
      console.log("Creating clinic...");
      const { data: clinicData, error: clinicError } = await supabase
        .from("clinics")
        .insert({
          name: `${fullName}'s Clinic`,
          slug: `physio-clinic-${Date.now()}`,
          owner_user_id: userId,
        })
        .select("id")
        .single();

      if (clinicError) {
        console.error("Failed to create clinic:", clinicError);
        process.exit(1);
      }

      clinicId = clinicData.id;
      console.log("✓ Clinic created:", clinicId);
    }

    // Update default clinic in profile
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ default_clinic_id: clinicId })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update default clinic:", updateError);
      process.exit(1);
    }

    // Check if membership exists
    const { data: existingMembership } = await supabase
      .from("clinic_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (existingMembership) {
      console.log("✓ Clinic membership already exists");
    } else {
      console.log("Creating clinic membership...");
      const { error: membershipError } = await supabase.from("clinic_memberships").insert({
        clinic_id: clinicId,
        user_id: userId,
        role: "clinic_admin",
        status: "active",
      });

      if (membershipError) {
        console.error("Failed to create clinic membership:", membershipError);
        process.exit(1);
      }
      console.log("✓ Clinic membership created with admin role");
    }

    console.log("\n✅ Admin user setup complete!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("User ID:", userId);
    console.log("Clinic ID:", clinicId);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

setupAdmin();
