import { auth } from './auth'

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema())

type Schema = Awaited<ReturnType<typeof getSchema>>
type Paths = Schema['paths']
type Components = Schema['components']
type OperationWithTags = { tags?: string[] }

export const AuthOpenAPI = {
  getPaths: (prefix = '/api/auth') =>
    getSchema().then(({ paths }) => {
      const reference: Paths = Object.create(null) as Paths

      for (const path of Object.keys(paths)) {
        const pathItem = paths[path]
        if (!pathItem) continue

        const key = prefix + path
        reference[key] = pathItem

        for (const method of Object.keys(pathItem) as Array<keyof typeof pathItem>) {
          const operation = pathItem[method]
          if (!operation || typeof operation !== 'object') continue
          ;(operation as OperationWithTags).tags = ['Better Auth']
        }
      }

      return reference
    }) as Promise<Paths>,
  components: getSchema().then(({ components }) => components) as Promise<Components>
} as const
