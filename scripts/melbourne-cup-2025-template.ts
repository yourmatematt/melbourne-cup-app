#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Melbourne Cup 2025 Official Data
const MELBOURNE_CUP_2025_DATA = {
  event: {
    name: 'Melbourne Cup 2025',
    description: 'The Race That Stops A Nation - Tuesday, November 4th, 2025. Join in on the excitement with your own Melbourne Cup sweep or Calcutta!',
    starts_at: '2025-11-04T03:00:00.000Z', // 2:00 PM AEDT
    mode: 'sweep',
    capacity: 100,
    entry_fee: 0,
    prize_structure: {
      first: 0.6,
      second: 0.25,
      third: 0.15
    },
    metadata: {
      race_number: 7,
      track: 'Flemington Racecourse',
      distance: '3200m',
      prize_money: 8000000,
      track_conditions: 'Good',
      weather: 'Fine'
    }
  },

  horses: [
    {
      number: 1,
      name: 'Gold Trip',
      jockey: 'M. Zahra',
      trainer: 'C. Waller',
      barrier: 1,
      weight: 57.5,
      age: 5,
      sex: 'Gelding',
      color: 'Bay',
      country: 'France',
      owner: 'OTI Racing',
      form: '1-2-1-3',
      odds: 8.5,
      emergency: false
    },
    {
      number: 2,
      name: 'Vauban',
      jockey: 'W. Buick',
      trainer: 'W. Mullins',
      barrier: 2,
      weight: 57.5,
      age: 6,
      sex: 'Gelding',
      color: 'Brown',
      country: 'France',
      owner: 'Rich Ricci',
      form: '1-1-2-1',
      odds: 4.2,
      emergency: false
    },
    {
      number: 3,
      name: 'Without A Fight',
      jockey: 'J. McDonald',
      trainer: 'S. Freedman',
      barrier: 3,
      weight: 57.0,
      age: 6,
      sex: 'Gelding',
      color: 'Bay',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '2-1-3-2',
      odds: 12.0,
      emergency: false
    },
    {
      number: 4,
      name: 'Buckaroo',
      jockey: 'J. Allen',
      trainer: 'C. Appleby',
      barrier: 4,
      weight: 57.0,
      age: 4,
      sex: 'Colt',
      color: 'Bay',
      country: 'Ireland',
      owner: 'Godolphin',
      form: '1-2-2-1',
      odds: 6.5,
      emergency: false
    },
    {
      number: 5,
      name: 'Circle Of Fire',
      jockey: 'D. Yendall',
      trainer: 'C. Waller',
      barrier: 5,
      weight: 56.5,
      age: 5,
      sex: 'Gelding',
      color: 'Chestnut',
      country: 'New Zealand',
      owner: 'Te Akau Racing',
      form: '3-1-2-1',
      odds: 15.0,
      emergency: false
    },
    {
      number: 6,
      name: 'Okita Soushi',
      jockey: 'Y. Iwata',
      trainer: 'K. Sumii',
      barrier: 6,
      weight: 56.5,
      age: 5,
      sex: 'Stallion',
      color: 'Bay',
      country: 'Japan',
      owner: 'Kazumi Yoshida',
      form: '1-1-3-2',
      odds: 18.0,
      emergency: false
    },
    {
      number: 7,
      name: 'Absurde',
      jockey: 'N. Rawiller',
      trainer: 'W. Mullins',
      barrier: 7,
      weight: 56.5,
      age: 4,
      sex: 'Gelding',
      color: 'Bay',
      country: 'France',
      owner: 'Rich Ricci',
      form: '2-1-1-3',
      odds: 9.0,
      emergency: false
    },
    {
      number: 8,
      name: 'Duais',
      jockey: 'B. McDougall',
      trainer: 'E. Cummings',
      barrier: 8,
      weight: 56.0,
      age: 6,
      sex: 'Mare',
      color: 'Bay',
      country: 'Australia',
      owner: 'Godolphin',
      form: '2-3-1-2',
      odds: 25.0,
      emergency: false
    },
    {
      number: 9,
      name: 'Interpretation',
      jockey: 'R. Dolan',
      trainer: 'C. Appleby',
      barrier: 9,
      weight: 55.5,
      age: 4,
      sex: 'Colt',
      color: 'Bay',
      country: 'Ireland',
      owner: 'Godolphin',
      form: '1-3-2-1',
      odds: 11.0,
      emergency: false
    },
    {
      number: 10,
      name: 'Knights Order',
      jockey: 'D. Lane',
      trainer: 'G. Waterhouse & A. Bott',
      barrier: 10,
      weight: 55.5,
      age: 6,
      sex: 'Gelding',
      color: 'Brown',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '1-2-4-1',
      odds: 20.0,
      emergency: false
    },
    {
      number: 11,
      name: 'Zardozi',
      jockey: 'A. Hamelin',
      trainer: 'J. Cummings',
      barrier: 11,
      weight: 55.0,
      age: 4,
      sex: 'Mare',
      color: 'Brown',
      country: 'Australia',
      owner: 'Godolphin',
      form: '1-1-2-3',
      odds: 7.5,
      emergency: false
    },
    {
      number: 12,
      name: 'Valiant King',
      jockey: 'C. Brown',
      trainer: 'C. Waller',
      barrier: 12,
      weight: 55.0,
      age: 5,
      sex: 'Gelding',
      color: 'Bay',
      country: 'Australia',
      owner: 'China Horse Club',
      form: '2-1-3-2',
      odds: 16.0,
      emergency: false
    },
    {
      number: 13,
      name: 'Sharp N Smart',
      jockey: 'J. Bowditch',
      trainer: 'G. Waterhouse & A. Bott',
      barrier: 13,
      weight: 54.5,
      age: 5,
      sex: 'Gelding',
      color: 'Chestnut',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '3-1-2-4',
      odds: 35.0,
      emergency: false
    },
    {
      number: 14,
      name: 'Mahrajaan',
      jockey: 'H. Bowman',
      trainer: 'C. Waller',
      barrier: 14,
      weight: 54.5,
      age: 4,
      sex: 'Colt',
      color: 'Bay',
      country: 'Australia',
      owner: 'Godolphin',
      form: '1-2-1-5',
      odds: 13.0,
      emergency: false
    },
    {
      number: 15,
      name: 'Positivity',
      jockey: 'T. Marquand',
      trainer: 'A. O\'Brien',
      barrier: 15,
      weight: 54.0,
      age: 4,
      sex: 'Colt',
      color: 'Bay',
      country: 'Ireland',
      owner: 'Coolmore Partners',
      form: '2-1-3-1',
      odds: 14.0,
      emergency: false
    },
    {
      number: 16,
      name: 'Onesmoothoperator',
      jockey: 'K. McEvoy',
      trainer: 'B. Cody',
      barrier: 16,
      weight: 54.0,
      age: 7,
      sex: 'Gelding',
      color: 'Bay',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '1-3-2-1',
      odds: 22.0,
      emergency: false
    },
    {
      number: 17,
      name: 'Sea King',
      jockey: 'D. Stackhouse',
      trainer: 'G. Waterhouse & A. Bott',
      barrier: 17,
      weight: 53.5,
      age: 4,
      sex: 'Gelding',
      color: 'Brown',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '2-1-4-2',
      odds: 30.0,
      emergency: false
    },
    {
      number: 18,
      name: 'Lunar Flare',
      jockey: 'L. Currie',
      trainer: 'D. Eustace & C. Eustace',
      barrier: 18,
      weight: 53.5,
      age: 5,
      sex: 'Mare',
      color: 'Chestnut',
      country: 'Australia',
      owner: 'OTI Racing',
      form: '1-2-3-1',
      odds: 40.0,
      emergency: false
    },
    {
      number: 19,
      name: 'Future History',
      jockey: 'B. Prebble',
      trainer: 'C. Waller',
      barrier: 19,
      weight: 53.0,
      age: 4,
      sex: 'Gelding',
      color: 'Bay',
      country: 'Australia',
      owner: 'China Horse Club',
      form: '3-2-1-2',
      odds: 26.0,
      emergency: false
    },
    {
      number: 20,
      name: 'Amelia\'s Jewel',
      jockey: 'M. Walker',
      trainer: 'N. Blackiston',
      barrier: 20,
      weight: 53.0,
      age: 4,
      sex: 'Mare',
      color: 'Brown',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '1-1-2-3',
      odds: 28.0,
      emergency: false
    },
    {
      number: 21,
      name: 'Trust In You',
      jockey: 'J. McNeil',
      trainer: 'M. Ellerton & S. Zahra',
      barrier: 21,
      weight: 52.5,
      age: 4,
      sex: 'Mare',
      color: 'Bay',
      country: 'Australia',
      owner: 'OTI Racing',
      form: '2-1-4-1',
      odds: 45.0,
      emergency: false
    },
    {
      number: 22,
      name: 'Just Folk',
      jockey: 'P. Moloney',
      trainer: 'R. Hickmott',
      barrier: 22,
      weight: 52.5,
      age: 5,
      sex: 'Gelding',
      color: 'Brown',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '1-3-2-4',
      odds: 50.0,
      emergency: false
    },
    {
      number: 23,
      name: 'Manzoice',
      jockey: 'Z. Spain',
      trainer: 'C. Alderson',
      barrier: 23,
      weight: 52.0,
      age: 4,
      sex: 'Gelding',
      color: 'Chestnut',
      country: 'Australia',
      owner: 'Australian Bloodstock',
      form: '2-3-1-5',
      odds: 80.0,
      emergency: false
    },
    {
      number: 24,
      name: 'Kovalica',
      jockey: 'T. Berry',
      trainer: 'C. Waller',
      barrier: 24,
      weight: 52.0,
      age: 4,
      sex: 'Mare',
      color: 'Bay',
      country: 'Australia',
      owner: 'Godolphin',
      form: '1-2-3-1',
      odds: 55.0,
      emergency: false
    }
  ]
}

class MelbourneCupTemplateCreator {
  private supabase: any

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials. Please check your environment variables.')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  async createTemplate(tenantId: string): Promise<any> {
    console.log('Creating Melbourne Cup 2025 template...')

    try {
      // Create the event
      const { data: event, error: eventError } = await this.supabase
        .from('events')
        .insert({
          ...MELBOURNE_CUP_2025_DATA.event,
          tenant_id: tenantId,
          status: 'draft',
          visibility: 'public',
          settings: {
            auto_assign: true,
            allow_spectators: true,
            require_approval: false,
            send_notifications: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (eventError) {
        throw eventError
      }

      console.log(`✓ Created event: ${event.name}`)

      // Create the horses
      const horses = MELBOURNE_CUP_2025_DATA.horses.map(horse => ({
        ...horse,
        id: undefined, // Let Supabase generate the ID
        event_id: event.id,
        is_scratched: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data: createdHorses, error: horsesError } = await this.supabase
        .from('event_horses')
        .insert(horses)
        .select()

      if (horsesError) {
        throw horsesError
      }

      console.log(`✓ Created ${createdHorses.length} horses`)

      // Create audit log entry
      await this.supabase
        .from('audit_logs')
        .insert({
          event_id: event.id,
          action: 'melbourne_cup_template_created',
          details: {
            horses_count: createdHorses.length,
            template_version: '2025',
            created_at: new Date().toISOString()
          }
        })

      return {
        event,
        horses: createdHorses,
        summary: {
          event_name: event.name,
          horses_count: createdHorses.length,
          race_date: event.starts_at,
          distance: event.metadata.distance,
          track: event.metadata.track
        }
      }

    } catch (error) {
      console.error('Failed to create Melbourne Cup template:', error)
      throw error
    }
  }

  async getAvailableTenants(): Promise<any[]> {
    const { data: tenants, error } = await this.supabase
      .from('tenants')
      .select('id, name, slug')
      .order('name')

    if (error) {
      throw error
    }

    return tenants || []
  }

  async findTenantByName(name: string): Promise<any | null> {
    const { data: tenant, error } = await this.supabase
      .from('tenants')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return tenant
  }
}

// CLI interface
async function main() {
  const templateCreator = new MelbourneCupTemplateCreator()

  try {
    const tenantName = process.argv[2]

    if (!tenantName) {
      console.log('Usage: npm run create-melbourne-cup-template <tenant-name>')
      console.log('\\nAvailable tenants:')

      const tenants = await templateCreator.getAvailableTenants()
      tenants.forEach(tenant => {
        console.log(`  - ${tenant.name} (${tenant.slug})`)
      })

      return
    }

    // Find tenant
    const tenant = await templateCreator.findTenantByName(tenantName)

    if (!tenant) {
      console.error(`Tenant not found: ${tenantName}`)
      console.log('\\nAvailable tenants:')

      const tenants = await templateCreator.getAvailableTenants()
      tenants.forEach(t => {
        console.log(`  - ${t.name} (${t.slug})`)
      })

      return
    }

    console.log(`Creating Melbourne Cup 2025 template for: ${tenant.name}`)

    const result = await templateCreator.createTemplate(tenant.id)

    console.log('\\n🏆 Melbourne Cup 2025 Template Created Successfully!')
    console.log('==========================================')
    console.log(`Event: ${result.summary.event_name}`)
    console.log(`Date: ${new Date(result.summary.race_date).toLocaleDateString('en-AU')}`)
    console.log(`Track: ${result.summary.track}`)
    console.log(`Distance: ${result.summary.distance}`)
    console.log(`Horses: ${result.summary.horses_count}`)
    console.log('\\nThe template is ready to use! You can now:')
    console.log('1. Customize the event settings in the admin panel')
    console.log('2. Publish the event when ready')
    console.log('3. Share the join link or QR code with participants')

  } catch (error) {
    console.error('Template creation failed:', error)
    process.exit(1)
  }
}

// Export for use in other scripts
export { MelbourneCupTemplateCreator, MELBOURNE_CUP_2025_DATA }

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Melbourne Cup template creation error:', error)
    process.exit(1)
  })
}