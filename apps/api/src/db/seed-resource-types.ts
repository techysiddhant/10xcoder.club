// /**
//  * Seed Resource Types
//  * Run with: bun run src/db/seed-resource-types.ts
//  */

// import { db } from '@/db'
// import { resourceType } from '@/db/schema'

// const INITIAL_TYPES = [
//     { name: 'video', label: 'Video', icon: 'video' },
//     { name: 'blog', label: 'Blog Article', icon: 'file-text' },
//     { name: 'tool', label: 'AI Tool', icon: 'sparkles' },
//     { name: 'repo', label: 'GitHub Repo', icon: 'github' },
//     { name: 'course', label: 'Course', icon: 'graduation-cap' },
//     { name: 'documentation', label: 'Documentation', icon: 'book' }
// ]

// async function seed() {
//     console.log('Seeding resource types...')

//     for (const type of INITIAL_TYPES) {
//         try {
//             await db.insert(resourceType).values(type).onConflictDoNothing()
//             console.log(`  ✓ ${type.name}`)
//         } catch (error) {
//             console.log(`  ✗ ${type.name} (already exists or error)`)
//         }
//     }

//     console.log('Done!')
//     process.exit(0)
// }

// seed()
