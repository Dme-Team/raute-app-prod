
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const { data: drivers, error } = await supabase
        .from('drivers')
        .select('id, name, user_id, status')

    if (error) {
        console.error('Error fetching drivers:', error)
        return
    }

    console.log('--- Current Drivers in Database ---')
    if (drivers.length === 0) {
        console.log("No drivers found. The seed might not have been run yet.")
    } else {
        console.table(drivers)
    }
}

main()
