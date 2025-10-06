#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import { MelbourneCupTemplateCreator } from './melbourne-cup-2025-template'

// Royal Oak Venue Demo Data
const ROYAL_OAK_DEMO_DATA = {
  tenant: {
    name: 'The Royal Oak Hotel',
    slug: 'royal-oak',
    contact_email: 'events@royaloak.com.au',
    contact_phone: '+61 3 9123 4567',
    address: '123 Collins Street',
    city: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    country: 'Australia',
    timezone: 'Australia/Melbourne',
    brand_color: '#8B4513', // Saddle brown
    logo_url: 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=200&h=200&fit=crop&crop=center',
    settings: {
      allow_multiple_entries: false,
      require_phone: true,
      require_email: true,
      default_capacity: 100,
      auto_approve_entries: true,
      send_welcome_emails: true,
      enable_qr_codes: true,
      enable_tv_display: true
    },
    metadata: {
      established: '1885',
      venue_type: 'Traditional Pub',
      capacity: 250,
      features: ['Sports Bar', 'Beer Garden', 'Private Function Room', 'Live Entertainment'],
      opening_hours: {
        monday: '11:00-23:00',
        tuesday: '11:00-23:00',
        wednesday: '11:00-23:00',
        thursday: '11:00-23:00',
        friday: '11:00-01:00',
        saturday: '11:00-01:00',
        sunday: '11:00-22:00'
      }
    }
  },

  // Sample participants for the event
  sampleParticipants: [
    { name: 'James Mitchell', email: 'james.mitchell@email.com', phone: '+61 412 345 678' },
    { name: 'Sarah Thompson', email: 'sarah.thompson@email.com', phone: '+61 423 456 789' },
    { name: 'Michael O\'Connor', email: 'michael.oconnor@email.com', phone: '+61 434 567 890' },
    { name: 'Emma Wilson', email: 'emma.wilson@email.com', phone: '+61 445 678 901' },
    { name: 'David Chen', email: 'david.chen@email.com', phone: '+61 456 789 012' },
    { name: 'Lisa Rodriguez', email: 'lisa.rodriguez@email.com', phone: '+61 467 890 123' },
    { name: 'Ryan Murphy', email: 'ryan.murphy@email.com', phone: '+61 478 901 234' },
    { name: 'Jennifer Lee', email: 'jennifer.lee@email.com', phone: '+61 489 012 345' },
    { name: 'Andrew Taylor', email: 'andrew.taylor@email.com', phone: '+61 490 123 456' },
    { name: 'Michelle Brown', email: 'michelle.brown@email.com', phone: '+61 401 234 567' },
    { name: 'Christopher Davis', email: 'chris.davis@email.com', phone: '+61 412 345 679' },
    { name: 'Amanda White', email: 'amanda.white@email.com', phone: '+61 423 456 780' },
    { name: 'Matthew Johnson', email: 'matt.johnson@email.com', phone: '+61 434 567 891' },
    { name: 'Rebecca Garcia', email: 'rebecca.garcia@email.com', phone: '+61 445 678 902' },
    { name: 'Daniel Martin', email: 'daniel.martin@email.com', phone: '+61 456 789 013' },
    { name: 'Jessica Anderson', email: 'jessica.anderson@email.com', phone: '+61 467 890 124' },
    { name: 'Joshua Williams', email: 'josh.williams@email.com', phone: '+61 478 901 235' },
    { name: 'Lauren Thompson', email: 'lauren.thompson@email.com', phone: '+61 489 012 346' },
    { name: 'Benjamin Clark', email: 'ben.clark@email.com', phone: '+61 490 123 457' },
    { name: 'Samantha Lewis', email: 'sam.lewis@email.com', phone: '+61 401 234 568' },
    { name: 'Kevin Walker', email: 'kevin.walker@email.com', phone: '+61 412 345 680' },
    { name: 'Nicole Hall', email: 'nicole.hall@email.com', phone: '+61 423 456 781' },
    { name: 'Robert Young', email: 'robert.young@email.com', phone: '+61 434 567 892' },
    { name: 'Ashley King', email: 'ashley.king@email.com', phone: '+61 445 678 903' },
    { name: 'Jason Scott', email: 'jason.scott@email.com', phone: '+61 456 789 014' },
    { name: 'Stephanie Green', email: 'stephanie.green@email.com', phone: '+61 467 890 125' },
    { name: 'Timothy Adams', email: 'tim.adams@email.com', phone: '+61 478 901 236' },
    { name: 'Crystal Baker', email: 'crystal.baker@email.com', phone: '+61 489 012 347' },
    { name: 'Brandon Hill', email: 'brandon.hill@email.com', phone: '+61 490 123 458' },
    { name: 'Rachel Nelson', email: 'rachel.nelson@email.com', phone: '+61 401 234 569' },
    { name: 'Jonathan Carter', email: 'jonathan.carter@email.com', phone: '+61 412 345 681' },
    { name: 'Megan Roberts', email: 'megan.roberts@email.com', phone: '+61 423 456 782' },
    { name: 'Steven Mitchell', email: 'steven.mitchell@email.com', phone: '+61 434 567 893' },
    { name: 'Heather Campbell', email: 'heather.campbell@email.com', phone: '+61 445 678 904' },
    { name: 'Patrick Phillips', email: 'patrick.phillips@email.com', phone: '+61 456 789 015' },
    { name: 'Kimberly Evans', email: 'kim.evans@email.com', phone: '+61 467 890 126' },
    { name: 'Gregory Turner', email: 'greg.turner@email.com', phone: '+61 478 901 237' },
    { name: 'Vanessa Parker', email: 'vanessa.parker@email.com', phone: '+61 489 012 348' },
    { name: 'Aaron Collins', email: 'aaron.collins@email.com', phone: '+61 490 123 459' },
    { name: 'Tiffany Stewart', email: 'tiffany.stewart@email.com', phone: '+61 401 234 570' },
    { name: 'Nathan Morris', email: 'nathan.morris@email.com', phone: '+61 412 345 682' },
    { name: 'Brittany Cook', email: 'brittany.cook@email.com', phone: '+61 423 456 783' },
    { name: 'Jeremy Rogers', email: 'jeremy.rogers@email.com', phone: '+61 434 567 894' },
    { name: 'Danielle Reed', email: 'danielle.reed@email.com', phone: '+61 445 678 905' },
    { name: 'Sean Bailey', email: 'sean.bailey@email.com', phone: '+61 456 789 016' },
    { name: 'Melissa Hughes', email: 'melissa.hughes@email.com', phone: '+61 467 890 127' },
    { name: 'Marcus Price', email: 'marcus.price@email.com', phone: '+61 478 901 238' },
    { name: 'Courtney Wood', email: 'courtney.wood@email.com', phone: '+61 489 012 349' },
    { name: 'Tyler Watson', email: 'tyler.watson@email.com', phone: '+61 490 123 460' },
    { name: 'Diana Brooks', email: 'diana.brooks@email.com', phone: '+61 401 234 571' }
  ]
}

class DemoDataCreator {
  private supabase: any
  private templateCreator: MelbourneCupTemplateCreator

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

    this.templateCreator = new MelbourneCupTemplateCreator()
  }

  async createDemoTenant(): Promise<any> {
    console.log('Creating Royal Oak Hotel demo tenant...')

    try {
      const { data: tenant, error } = await this.supabase
        .from('tenants')
        .insert({
          ...ROYAL_OAK_DEMO_DATA.tenant,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log(`✓ Created tenant: ${tenant.name}`)
      return tenant

    } catch (error) {
      if (error.code === '23505') {
        // Tenant already exists, fetch it
        const { data: existingTenant } = await this.supabase
          .from('tenants')
          .select('*')
          .eq('slug', ROYAL_OAK_DEMO_DATA.tenant.slug)
          .single()

        if (existingTenant) {
          console.log(`✓ Using existing tenant: ${existingTenant.name}`)
          return existingTenant
        }
      }
      throw error
    }
  }

  async createDemoEvent(tenant: any): Promise<any> {
    console.log('Creating Melbourne Cup 2025 demo event...')

    try {
      const result = await this.templateCreator.createTemplate(tenant.id)
      console.log(`✓ Created Melbourne Cup 2025 event with ${result.horses.length} horses`)
      return result

    } catch (error) {
      console.error('Failed to create demo event:', error)
      throw error
    }
  }

  async createDemoParticipants(event: any, count: number = 50): Promise<any[]> {
    console.log(`Creating ${count} demo participants...`)

    try {
      const participants = []
      const usedNames = new Set()

      // Use predefined participants first, then generate random ones
      const baseParticipants = ROYAL_OAK_DEMO_DATA.sampleParticipants.slice(0, count)
      const remainingCount = Math.max(0, count - baseParticipants.length)

      // Add predefined participants
      for (const participant of baseParticipants) {
        participants.push({
          event_id: event.event.id,
          display_name: participant.name,
          email: participant.email,
          phone: participant.phone,
          join_code: this.generateUniqueJoinCode(),
          marketing_consent: faker.datatype.boolean({ probability: 0.3 }),
          source: faker.helpers.arrayElement(['qr', 'link', 'manual']),
          metadata: {
            demo_participant: true,
            user_agent: faker.internet.userAgent(),
            ip_address: faker.internet.ipv4(),
            join_timestamp: faker.date.recent().toISOString()
          },
          created_by: faker.string.uuid(),
          created_at: faker.date.recent().toISOString(),
          updated_at: new Date().toISOString()
        })
        usedNames.add(participant.name)
      }

      // Generate additional random participants if needed
      for (let i = 0; i < remainingCount; i++) {
        let name
        do {
          name = faker.person.fullName()
        } while (usedNames.has(name))

        usedNames.add(name)

        participants.push({
          event_id: event.event.id,
          display_name: name,
          email: faker.internet.email(),
          phone: faker.phone.number('+61 4## ### ###'),
          join_code: this.generateUniqueJoinCode(),
          marketing_consent: faker.datatype.boolean({ probability: 0.3 }),
          source: faker.helpers.arrayElement(['qr', 'link', 'manual']),
          metadata: {
            demo_participant: true,
            user_agent: faker.internet.userAgent(),
            ip_address: faker.internet.ipv4(),
            join_timestamp: faker.date.recent().toISOString()
          },
          created_by: faker.string.uuid(),
          created_at: faker.date.recent().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      const { data: createdParticipants, error } = await this.supabase
        .from('patron_entries')
        .insert(participants)
        .select()

      if (error) {
        throw error
      }

      console.log(`✓ Created ${createdParticipants.length} participants`)
      return createdParticipants

    } catch (error) {
      console.error('Failed to create demo participants:', error)
      throw error
    }
  }

  async createDemoAssignments(event: any, participants: any[]): Promise<any[]> {
    console.log('Creating demo assignments...')

    try {
      const availableHorses = event.horses.filter((horse: any) => !horse.is_scratched)

      if (availableHorses.length === 0) {
        console.log('No available horses for assignments')
        return []
      }

      // Shuffle participants for random assignment
      const shuffledParticipants = faker.helpers.shuffle(participants)
      const assignments = []

      for (let i = 0; i < shuffledParticipants.length; i++) {
        const participant = shuffledParticipants[i]
        const horse = availableHorses[i % availableHorses.length] // Round-robin assignment

        assignments.push({
          event_id: event.event.id,
          patron_entry_id: participant.id,
          event_horse_id: horse.id,
          draw_order: i + 1,
          assigned_at: faker.date.recent().toISOString(),
          metadata: {
            demo_assignment: true,
            assignment_method: 'round_robin'
          },
          created_at: faker.date.recent().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      const { data: createdAssignments, error } = await this.supabase
        .from('assignments')
        .insert(assignments)
        .select(`
          *,
          patron_entry:patron_entries(*),
          event_horse:event_horses(*)
        `)

      if (error) {
        throw error
      }

      console.log(`✓ Created ${createdAssignments.length} assignments`)
      return createdAssignments

    } catch (error) {
      console.error('Failed to create demo assignments:', error)
      throw error
    }
  }

  private generateUniqueJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  async createAuditLogs(event: any): Promise<void> {
    console.log('Creating demo audit logs...')

    const auditLogs = [
      {
        event_id: event.event.id,
        action: 'tenant_created',
        details: { tenant_name: 'The Royal Oak Hotel', demo: true },
        created_by: faker.string.uuid(),
        created_at: faker.date.past().toISOString()
      },
      {
        event_id: event.event.id,
        action: 'event_created',
        details: { event_name: event.event.name, template: 'melbourne_cup_2025', demo: true },
        created_by: faker.string.uuid(),
        created_at: faker.date.past().toISOString()
      },
      {
        event_id: event.event.id,
        action: 'horses_imported',
        details: { horses_count: event.horses.length, source: 'melbourne_cup_2025_template', demo: true },
        created_by: faker.string.uuid(),
        created_at: faker.date.past().toISOString()
      },
      {
        event_id: event.event.id,
        action: 'event_published',
        details: { visibility: 'public', qr_code_generated: true, demo: true },
        created_by: faker.string.uuid(),
        created_at: faker.date.recent().toISOString()
      }
    ]

    const { error } = await this.supabase
      .from('audit_logs')
      .insert(auditLogs)

    if (error) {
      throw error
    }

    console.log(`✓ Created ${auditLogs.length} audit log entries`)
  }

  async cleanExistingDemoData(): Promise<void> {
    console.log('Cleaning existing demo data...')

    try {
      // Delete assignments first (foreign key constraints)
      await this.supabase
        .from('assignments')
        .delete()
        .eq('metadata->>demo_assignment', 'true')

      // Delete participants
      await this.supabase
        .from('patron_entries')
        .delete()
        .eq('metadata->>demo_participant', 'true')

      // Delete events and horses (cascade should handle horses)
      await this.supabase
        .from('events')
        .delete()
        .eq('name', 'Melbourne Cup 2025')

      // Delete audit logs
      await this.supabase
        .from('audit_logs')
        .delete()
        .eq('details->>demo', 'true')

      // Delete tenant
      await this.supabase
        .from('tenants')
        .delete()
        .eq('slug', ROYAL_OAK_DEMO_DATA.tenant.slug)

      console.log('✓ Cleaned existing demo data')

    } catch (error) {
      console.warn('Warning: Could not clean all existing demo data:', error)
    }
  }

  async createFullDemo(participantCount: number = 50, clean: boolean = false): Promise<any> {
    console.log('Creating complete Royal Oak Hotel demo...')

    try {
      if (clean) {
        await this.cleanExistingDemoData()
      }

      // Create tenant
      const tenant = await this.createDemoTenant()

      // Create Melbourne Cup 2025 event
      const event = await this.createDemoEvent(tenant)

      // Create participants
      const participants = await this.createDemoParticipants(event, participantCount)

      // Create assignments
      const assignments = await this.createDemoAssignments(event, participants)

      // Create audit logs
      await this.createAuditLogs(event)

      // Update event status to lobby (ready for action)
      await this.supabase
        .from('events')
        .update({
          status: 'lobby',
          updated_at: new Date().toISOString()
        })
        .eq('id', event.event.id)

      const summary = {
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
          brand_color: tenant.brand_color
        },
        event: {
          name: event.event.name,
          id: event.event.id,
          horses_count: event.horses.length,
          participants_count: participants.length,
          assignments_count: assignments.length,
          join_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${event.event.id}`,
          admin_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/events/${event.event.id}`,
          tv_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tv/${event.event.id}`
        }
      }

      return summary

    } catch (error) {
      console.error('Demo creation failed:', error)
      throw error
    }
  }
}

// CLI interface
async function main() {
  const participantCount = parseInt(process.argv[2]) || 50
  const clean = process.argv.includes('--clean')

  if (process.argv.includes('--help')) {
    console.log(`
Royal Oak Hotel Demo Data Creator

Usage:
  npm run demo-seed [participant-count] [--clean] [--help]

Arguments:
  participant-count    Number of participants to create (default: 50)

Options:
  --clean             Clean existing demo data before creating new
  --help              Show this help

Examples:
  npm run demo-seed
  npm run demo-seed 100
  npm run demo-seed 25 --clean
    `)
    return
  }

  const demoCreator = new DemoDataCreator()

  try {
    console.log(`Creating Royal Oak Hotel demo with ${participantCount} participants...`)
    if (clean) {
      console.log('Will clean existing demo data first')
    }

    const result = await demoCreator.createFullDemo(participantCount, clean)

    console.log('\\n🎉 Royal Oak Hotel Demo Created Successfully!')
    console.log('===========================================')
    console.log(`Venue: ${result.tenant.name}`)
    console.log(`Event: ${result.event.name}`)
    console.log(`Horses: ${result.event.horses_count}`)
    console.log(`Participants: ${result.event.participants_count}`)
    console.log(`Assignments: ${result.event.assignments_count}`)
    console.log('\\nURLs:')
    console.log(`Join Event: ${result.event.join_url}`)
    console.log(`Admin Panel: ${result.event.admin_url}`)
    console.log(`TV Display: ${result.event.tv_url}`)
    console.log('\\nDemo is ready to use! 🏇')

  } catch (error) {
    console.error('Demo creation error:', error)
    process.exit(1)
  }
}

// Export for use in other scripts
export { DemoDataCreator, ROYAL_OAK_DEMO_DATA }

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Demo creation error:', error)
    process.exit(1)
  })
}