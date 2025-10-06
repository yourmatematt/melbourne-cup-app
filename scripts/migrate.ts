#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

interface MigrationFile {
  filename: string
  timestamp: number
  name: string
  sql: string
}

class DatabaseMigrator {
  private supabase: any
  private migrationTable = 'schema_migrations'

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

  async ensureMigrationTable() {
    const { error } = await this.supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${this.migrationTable} (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (error) {
      console.error('Failed to create migration table:', error)
      throw error
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from(this.migrationTable)
      .select('filename')
      .order('filename')

    if (error) {
      console.error('Failed to fetch executed migrations:', error)
      throw error
    }

    return data.map((row: any) => row.filename)
  }

  async loadMigrationFiles(directory: string): Promise<MigrationFile[]> {
    try {
      const files = readdirSync(directory)
        .filter(file => file.endsWith('.sql'))
        .sort()

      return files.map(filename => {
        const filePath = join(directory, filename)
        const sql = readFileSync(filePath, 'utf-8')

        // Extract timestamp and name from filename (format: YYYYMMDD_HHMMSS_name.sql)
        const match = filename.match(/^(\\d{8}_\\d{6})_(.+)\\.sql$/)
        const timestamp = match ? parseInt(match[1].replace('_', '')) : 0
        const name = match ? match[2].replace(/_/g, ' ') : filename

        return {
          filename,
          timestamp,
          name,
          sql
        }
      })
    } catch (error) {
      console.error(`Failed to load migration files from ${directory}:`, error)
      return []
    }
  }

  async executeMigration(migration: MigrationFile): Promise<boolean> {
    console.log(`Executing migration: ${migration.filename}`)

    try {
      // Execute the migration SQL
      const { error: sqlError } = await this.supabase.rpc('exec_sql', {
        sql: migration.sql
      })

      if (sqlError) {
        console.error(`Migration ${migration.filename} failed:`, sqlError)
        return false
      }

      // Record the migration as executed
      const { error: recordError } = await this.supabase
        .from(this.migrationTable)
        .insert({ filename: migration.filename })

      if (recordError) {
        console.error(`Failed to record migration ${migration.filename}:`, recordError)
        return false
      }

      console.log(`✓ Migration ${migration.filename} completed successfully`)
      return true
    } catch (error) {
      console.error(`Migration ${migration.filename} failed with exception:`, error)
      return false
    }
  }

  async runMigrations(directory: string = './sql/migrations'): Promise<void> {
    console.log('Starting database migration...')

    try {
      // Ensure migration tracking table exists
      await this.ensureMigrationTable()

      // Load all migration files
      const migrations = await this.loadMigrationFiles(directory)

      if (migrations.length === 0) {
        console.log('No migration files found.')
        return
      }

      // Get already executed migrations
      const executedMigrations = await this.getExecutedMigrations()

      // Filter out already executed migrations
      const pendingMigrations = migrations.filter(
        migration => !executedMigrations.includes(migration.filename)
      )

      if (pendingMigrations.length === 0) {
        console.log('All migrations are up to date.')
        return
      }

      console.log(`Found ${pendingMigrations.length} pending migrations:`)
      pendingMigrations.forEach(migration => {
        console.log(`  - ${migration.filename}: ${migration.name}`)
      })

      // Execute pending migrations
      let successCount = 0
      for (const migration of pendingMigrations) {
        const success = await this.executeMigration(migration)
        if (success) {
          successCount++
        } else {
          console.error(`Migration failed: ${migration.filename}`)
          break // Stop on first failure
        }
      }

      console.log(`\\nMigration completed: ${successCount}/${pendingMigrations.length} migrations executed successfully.`)

    } catch (error) {
      console.error('Migration process failed:', error)
      process.exit(1)
    }
  }

  async rollback(steps: number = 1): Promise<void> {
    console.log(`Rolling back ${steps} migration(s)...`)

    try {
      // Get executed migrations in reverse order
      const { data, error } = await this.supabase
        .from(this.migrationTable)
        .select('filename')
        .order('executed_at', { ascending: false })
        .limit(steps)

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        console.log('No migrations to rollback.')
        return
      }

      for (const row of data) {
        const filename = row.filename
        const rollbackFile = filename.replace('.sql', '.rollback.sql')

        try {
          // Look for rollback file
          const rollbackSql = readFileSync(`./sql/migrations/${rollbackFile}`, 'utf-8')

          // Execute rollback
          const { error: sqlError } = await this.supabase.rpc('exec_sql', {
            sql: rollbackSql
          })

          if (sqlError) {
            console.error(`Rollback of ${filename} failed:`, sqlError)
            continue
          }

          // Remove from migration table
          const { error: deleteError } = await this.supabase
            .from(this.migrationTable)
            .delete()
            .eq('filename', filename)

          if (deleteError) {
            console.error(`Failed to remove migration record ${filename}:`, deleteError)
            continue
          }

          console.log(`✓ Rolled back migration: ${filename}`)
        } catch (fileError) {
          console.error(`Rollback file not found for ${filename}:`, fileError)
        }
      }

    } catch (error) {
      console.error('Rollback process failed:', error)
      process.exit(1)
    }
  }

  async status(): Promise<void> {
    try {
      await this.ensureMigrationTable()

      const migrations = await this.loadMigrationFiles('./sql/migrations')
      const executedMigrations = await this.getExecutedMigrations()

      console.log('\\nMigration Status:')
      console.log('================')

      if (migrations.length === 0) {
        console.log('No migration files found.')
        return
      }

      migrations.forEach(migration => {
        const isExecuted = executedMigrations.includes(migration.filename)
        const status = isExecuted ? '✓ Executed' : '✗ Pending'
        console.log(`${status}: ${migration.filename} - ${migration.name}`)
      })

      const pendingCount = migrations.length - executedMigrations.length
      console.log(`\\nSummary: ${executedMigrations.length} executed, ${pendingCount} pending`)

    } catch (error) {
      console.error('Failed to get migration status:', error)
      process.exit(1)
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2]
  const migrator = new DatabaseMigrator()

  switch (command) {
    case 'migrate':
    case 'up':
      await migrator.runMigrations()
      break

    case 'rollback':
    case 'down':
      const steps = parseInt(process.argv[3]) || 1
      await migrator.rollback(steps)
      break

    case 'status':
      await migrator.status()
      break

    case 'help':
    default:
      console.log(`
Database Migration Tool

Usage:
  npm run migrate [command]

Commands:
  migrate, up    Run pending migrations
  rollback, down [steps]  Rollback migrations (default: 1 step)
  status         Show migration status
  help           Show this help

Environment Variables Required:
  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Examples:
  npm run migrate
  npm run migrate rollback
  npm run migrate rollback 3
  npm run migrate status
      `)
      break
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Migration tool error:', error)
    process.exit(1)
  })
}

export { DatabaseMigrator }