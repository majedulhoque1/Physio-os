// reset-clinic-admin-password.mjs
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Read secrets from .env file
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create a Supabase client that can use admin functions
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  // Tell Supabase: change this user’s password to Samir123
  const { data, error } = await supabase.auth.admin.updateUserById(
    '6ebb8904-06f4-45d2-8dd9-74c6482a1984', // this is the user id you showed me
    { password: 'Samir123' },
  )

  if (error) {
    console.error('Error updating password:', error)
  } else {
    console.log('Password updated for user:', data?.user?.email)
  }
}

// Run the function
main()