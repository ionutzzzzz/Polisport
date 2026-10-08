require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSchema() {
  console.log("Checking columns...");
  
  let { data: t1, error: e1 } = await supabase.from('teams').select('group_name').limit(1);
  if (e1) console.log("group_name error:", e1.message);
  else console.log("group_name exists!");

  let { data: t2, error: e2 } = await supabase.from('teams').select('group_code').limit(1);
  if (e2) console.log("group_code error:", e2.message);
  else console.log("group_code exists!");

  let { data: m, error: e3 } = await supabase.from('matches').insert({
    home_team_id: '00000000-0000-0000-0000-000000000000',
    away_team_id: '00000000-0000-0000-0000-000000000000',
    status: 'unscheduled',
    stage: 'group'
  }).select();
  
  if (e3) {
    console.log("matches insert error:", e3.message);
  }
}

testSchema();
