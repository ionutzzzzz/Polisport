require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSchema() {
  let { data: m, error: e3 } = await supabase.from('matches').insert({
    home_team_id: '00000000-0000-0000-0000-000000000000',
    away_team_id: '00000000-0000-0000-0000-000000000000',
    status: 'scheduled',
    stage: 'group',
    match_time: null
  }).select();
  
  if (e3) {
    console.log("matches insert error:", e3.message);
  } else {
    console.log("matches insert success with match_time = null!");
  }
}

testSchema();
