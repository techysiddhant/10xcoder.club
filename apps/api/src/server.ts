import { app } from '@/app'
import { env } from '@/config/env'

app.listen(env.PORT, () => {
  console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)
  // console.log(
  //   `📚 OpenAPI documentation at http://${app.server?.hostname}:${app.server?.port}/docs`,
  // );
})
