import { db } from '..'
import { resourceType } from '../schema'
import { INITIAL_TYPES } from './resourceType'
let exitCode = 0
try {
  for (const type of INITIAL_TYPES) {
    await db.insert(resourceType).values(type).onConflictDoNothing()
    console.log(`  ✓ ${type.name}`)
  }
} catch (error) {
  console.error('🔴 Error seeding', error)
  exitCode = 1
} finally {
  process.exit(exitCode)
}
