import { db } from '..'
import { resourceType } from '../schema'
import { INITIAL_TYPES } from './resourceType'

try {
  for (const type of INITIAL_TYPES) {
    try {
      await db.insert(resourceType).values(type).onConflictDoNothing()
      console.log(`  ✓ ${type.name}`)
    } catch (error) {
      console.log(`  ✗ ${type.name} (already exists or error)`)
    }
  }
} catch (error) {
  console.error('🔴 Error seeding', error)
} finally {
  process.exit(0)
}
