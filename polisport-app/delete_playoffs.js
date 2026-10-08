const { createClient } = require("@supabase/supabase-js");

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.from('matches').delete().eq('stage', 'playoff');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Deleted playoffs successfully.");
  }
}
run();
