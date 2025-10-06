#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

interface SeedOptions {
  tenants?: number
  events?: number
  participants?: number
  horses?: number
  clean?: boolean
}

class DatabaseSeeder {
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

  async cleanDatabase() {
    console.log('Cleaning existing data...')

    try {
      // Delete in order of dependencies
      await this.supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.supabase.from('patron_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.supabase.from('event_horses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.supabase.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      console.log('✓ Database cleaned')
    } catch (error) {
      console.error('Failed to clean database:', error)
      throw error
    }
  }

  async seedTenants(count: number): Promise<any[]> {
    console.log(`Creating ${count} tenants...`)

    const venues = [
      'The Royal Melbourne',
      'Crown Casino',
      'The Windsor Hotel',
      'Flemington Racecourse',
      'The Cricket Club',
      'Luna Park',
      'Queen Victoria Market',
      'Federation Square',
      'The Botanical Gardens',
      'Brighton Beach Club'
    ]

    const tenants = []
    for (let i = 0; i < count; i++) {
      const venueName = venues[i % venues.length]
      tenants.push({
        id: faker.string.uuid(),
        name: `${venueName} ${i > 9 ? faker.location.city() : ''}`.trim(),
        slug: faker.string.alphanumeric(8).toLowerCase(),
        contact_email: faker.internet.email(),
        contact_phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        postcode: faker.location.zipCode(),
        country: 'Australia',
        timezone: 'Australia/Melbourne',
        brand_color: faker.internet.color(),
        logo_url: faker.image.avatar(),
        settings: {
          allow_multiple_entries: faker.datatype.boolean(),
          require_phone: faker.datatype.boolean(),
          require_email: faker.datatype.boolean(),
          default_capacity: faker.number.int({ min: 50, max: 500 })
        },
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    const { data, error } = await this.supabase
      .from('tenants')
      .insert(tenants)
      .select()

    if (error) {
      console.error('Failed to seed tenants:', error)
      throw error
    }

    console.log(`✓ Created ${data.length} tenants`)
    return data
  }

  async seedEvents(tenants: any[], count: number): Promise<any[]> {
    console.log(`Creating ${count} events...`)

    const raceNames = [
      'Melbourne Cup Classic',
      'Spring Racing Carnival',
      'Golden Slipper Stakes',
      'Cox Plate Championship',
      'The Everest Challenge',
      'Derby Day Special',
      'Oaks Day Classic',
      'Cup Day Extravaganza',
      'Caulfield Cup',
      'Blue Diamond Stakes'
    ]

    const events = []
    for (let i = 0; i < count; i++) {
      const tenant = tenants[i % tenants.length]
      const startsAt = faker.date.future()
      const capacity = faker.number.int({ min: 50, max: 300 })

      events.push({
        id: faker.string.uuid(),
        tenant_id: tenant.id,
        name: `${raceNames[i % raceNames.length]} ${faker.date.recent().getFullYear()}`,
        description: faker.lorem.paragraphs(2),
        starts_at: startsAt.toISOString(),
        capacity,
        mode: faker.helpers.arrayElement(['sweep', 'calcutta']),
        status: faker.helpers.arrayElement(['draft', 'lobby', 'drawing', 'complete']),
        visibility: faker.helpers.arrayElement(['public', 'private']),
        entry_fee: faker.number.float({ min: 0, max: 50, multipleOf: 0.01 }),
        prize_structure: {
          first: 0.6,
          second: 0.25,
          third: 0.15
        },
        settings: {
          auto_assign: faker.datatype.boolean(),
          allow_spectators: faker.datatype.boolean(),
          require_approval: faker.datatype.boolean(),
          send_notifications: faker.datatype.boolean()
        },
        metadata: {
          track_conditions: faker.helpers.arrayElement(['Good', 'Soft', 'Heavy']),
          weather: faker.helpers.arrayElement(['Fine', 'Overcast', 'Light Rain']),
          race_distance: faker.helpers.arrayElement(['1200m', '1600m', '2000m', '3200m'])
        },
        created_at: faker.date.past().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    const { data, error } = await this.supabase
      .from('events')
      .insert(events)
      .select()

    if (error) {
      console.error('Failed to seed events:', error)
      throw error
    }

    console.log(`✓ Created ${data.length} events`)
    return data
  }

  async seedHorses(events: any[], horsesPerEvent: number): Promise<any[]> {
    console.log(`Creating horses for events...`)

    const horseNames = [
      'Thunder Bolt', 'Lightning Strike', 'Golden Arrow', 'Silver Bullet',
      'Midnight Express', 'Desert Storm', 'Ocean Breeze', 'Mountain Thunder',
      'Fire Spirit', 'Wind Walker', 'Star Dancer', 'Moon Shadow',
      'Royal Knight', 'Wild Heart', 'Swift Arrow', 'Brave Soul',
      'Diamond Flash', 'Ruby Storm', 'Emerald Dream', 'Sapphire Speed',
      'Crimson Fire', 'Azure Wings', 'Golden Mane', 'Silver Star'
    ]

    const jockeyNames = [
      'J. Smith', 'M. Johnson', 'L. Williams', 'D. Brown', 'S. Davis',
      'K. Miller', 'R. Wilson', 'A. Moore', 'T. Taylor', 'C. Anderson',
      'J. Thomas', 'M. Jackson', 'L. White', 'D. Harris', 'S. Martin',
      'K. Thompson', 'R. Garcia', 'A. Martinez', 'T. Robinson', 'C. Clark'
    ]

    const horses = []
    for (const event of events) {
      for (let i = 1; i <= horsesPerEvent; i++) {
        horses.push({
          id: faker.string.uuid(),
          event_id: event.id,
          number: i,
          name: horseNames[(horses.length) % horseNames.length],
          jockey: jockeyNames[faker.number.int({ min: 0, max: jockeyNames.length - 1 })],
          trainer: faker.person.fullName(),
          weight: faker.number.float({ min: 52, max: 62, multipleOf: 0.5 }),
          barrier: i,
          odds: faker.number.float({ min: 2.5, max: 50.0, multipleOf: 0.5 }),
          form: faker.helpers.arrayElement(['1-2-1', '3-1-2', '2-4-1', '1-1-3', '4-2-1']),
          age: faker.number.int({ min: 3, max: 8 }),
          color: faker.helpers.arrayElement(['Bay', 'Chestnut', 'Brown', 'Black', 'Grey']),
          sex: faker.helpers.arrayElement(['Gelding', 'Mare', 'Colt', 'Filly']),
          is_scratched: faker.datatype.boolean({ probability: 0.05 }), // 5% chance
          created_at: faker.date.past().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }

    const { data, error } = await this.supabase
      .from('event_horses')
      .insert(horses)
      .select()

    if (error) {
      console.error('Failed to seed horses:', error)
      throw error
    }

    console.log(`✓ Created ${data.length} horses`)
    return data
  }

  async seedParticipants(events: any[], participantsPerEvent: number): Promise<any[]> {
    console.log(`Creating participants for events...`)

    const participants = []
    for (const event of events) {
      const eventParticipants = Math.min(participantsPerEvent, event.capacity)

      for (let i = 0; i < eventParticipants; i++) {
        const hasEmail = faker.datatype.boolean({ probability: 0.8 })
        const hasPhone = faker.datatype.boolean({ probability: 0.9 })

        participants.push({
          id: faker.string.uuid(),
          event_id: event.id,
          display_name: faker.person.fullName(),
          email: hasEmail ? faker.internet.email() : null,
          phone: hasPhone ? faker.phone.number() : null,
          join_code: faker.string.alphanumeric(6).toUpperCase(),
          marketing_consent: faker.datatype.boolean({ probability: 0.3 }),
          source: faker.helpers.arrayElement(['qr', 'link', 'manual']),
          metadata: {
            user_agent: faker.internet.userAgent(),
            ip_address: faker.internet.ipv4(),
            referrer: faker.internet.url()
          },
          created_by: faker.string.uuid(),
          created_at: faker.date.past().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }

    const { data, error } = await this.supabase
      .from('patron_entries')
      .insert(participants)
      .select()

    if (error) {
      console.error('Failed to seed participants:', error)
      throw error
    }

    console.log(`✓ Created ${data.length} participants`)
    return data
  }

  async seedAssignments(events: any[], participants: any[], horses: any[]): Promise<any[]> {
    console.log(`Creating assignments...`)

    const assignments = []
    for (const event of events) {
      if (event.status === 'draft') continue // Skip draft events

      const eventParticipants = participants.filter(p => p.event_id === event.id)
      const eventHorses = horses.filter(h => h.event_id === event.id && !h.is_scratched)

      if (eventParticipants.length === 0 || eventHorses.length === 0) continue

      // Shuffle participants for random assignment
      const shuffledParticipants = faker.helpers.shuffle(eventParticipants)

      for (let i = 0; i < shuffledParticipants.length; i++) {
        const participant = shuffledParticipants[i]
        const horse = eventHorses[i % eventHorses.length] // Round-robin assignment

        assignments.push({
          id: faker.string.uuid(),
          event_id: event.id,
          patron_entry_id: participant.id,
          event_horse_id: horse.id,
          draw_order: i + 1,
          assigned_at: faker.date.past().toISOString(),
          created_at: faker.date.past().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }

    if (assignments.length > 0) {
      const { data, error } = await this.supabase
        .from('assignments')
        .insert(assignments)
        .select()

      if (error) {
        console.error('Failed to seed assignments:', error)
        throw error
      }

      console.log(`✓ Created ${data.length} assignments`)
      return data
    }

    console.log('✓ No assignments created (no eligible events)')
    return []
  }

  async seedAuditLogs(events: any[]): Promise<void> {
    console.log('Creating audit logs...')

    const actions = [
      'event_created', 'event_published', 'participant_joined',
      'draw_started', 'draw_completed', 'horse_scratched',
      'assignment_created', 'notification_sent'
    ]

    const auditLogs = []
    for (const event of events) {
      // Create 5-15 audit logs per event
      const logCount = faker.number.int({ min: 5, max: 15 })

      for (let i = 0; i < logCount; i++) {
        auditLogs.push({
          id: faker.string.uuid(),
          event_id: event.id,
          action: faker.helpers.arrayElement(actions),
          details: {
            timestamp: faker.date.past().toISOString(),
            user_agent: faker.internet.userAgent(),
            ip_address: faker.internet.ipv4()
          },
          created_by: faker.string.uuid(),
          created_at: faker.date.past().toISOString()
        })
      }
    }

    const { error } = await this.supabase
      .from('audit_logs')
      .insert(auditLogs)

    if (error) {
      console.error('Failed to seed audit logs:', error)
      throw error
    }

    console.log(`✓ Created ${auditLogs.length} audit logs`)
  }

  async seed(options: SeedOptions = {}): Promise<void> {
    const {
      tenants: tenantCount = 3,
      events: eventCount = 10,
      participants: participantCount = 20,
      horses: horseCount = 24,
      clean = false
    } = options

    console.log('Starting database seeding...')
    console.log(`Options: ${tenantCount} tenants, ${eventCount} events, ${participantCount} participants/event, ${horseCount} horses/event`)

    try {
      if (clean) {
        await this.cleanDatabase()
      }

      // Seed in order of dependencies
      const tenants = await this.seedTenants(tenantCount)
      const events = await this.seedEvents(tenants, eventCount)
      const horses = await this.seedHorses(events, horseCount)
      const participants = await this.seedParticipants(events, participantCount)
      const assignments = await this.seedAssignments(events, participants, horses)
      await this.seedAuditLogs(events)

      console.log('\\n🎉 Database seeding completed successfully!')
      console.log(`Summary:`)
      console.log(`  - ${tenants.length} tenants`)
      console.log(`  - ${events.length} events`)
      console.log(`  - ${horses.length} horses`)
      console.log(`  - ${participants.length} participants`)
      console.log(`  - ${assignments.length} assignments`)

    } catch (error) {
      console.error('Seeding process failed:', error)
      process.exit(1)
    }
  }
}

// CLI interface
async function main() {
  const options: SeedOptions = {
    tenants: parseInt(process.env.SEED_TENANTS || '3'),
    events: parseInt(process.env.SEED_EVENTS || '10'),
    participants: parseInt(process.env.SEED_PARTICIPANTS || '20'),
    horses: parseInt(process.env.SEED_HORSES || '24'),
    clean: process.argv.includes('--clean')
  }

  // Parse command line arguments
  const args = process.argv.slice(2)
  args.forEach(arg => {
    if (arg.startsWith('--tenants=')) {
      options.tenants = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--events=')) {
      options.events = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--participants=')) {
      options.participants = parseInt(arg.split('=')[1])
    } else if (arg.startsWith('--horses=')) {
      options.horses = parseInt(arg.split('=')[1])
    }
  })

  if (args.includes('--help')) {
    console.log(`
Database Seeding Tool

Usage:
  npm run seed [options]

Options:
  --tenants=N        Number of tenants to create (default: 3)
  --events=N         Number of events to create (default: 10)
  --participants=N   Number of participants per event (default: 20)
  --horses=N         Number of horses per event (default: 24)
  --clean            Clean existing data before seeding
  --help             Show this help

Environment Variables:
  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Examples:
  npm run seed
  npm run seed --clean
  npm run seed --tenants=5 --events=20
  npm run seed --clean --participants=50
    `)
    return
  }

  const seeder = new DatabaseSeeder()
  await seeder.seed(options)
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Seeding tool error:', error)
    process.exit(1)
  })
}

export { DatabaseSeeder }