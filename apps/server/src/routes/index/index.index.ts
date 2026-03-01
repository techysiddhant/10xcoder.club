import { createRouter } from "@/lib/create-app";

import * as handlers from "@/controllers/index.controller";
import * as routes from "@/routes/index/index.routes";

const router = createRouter()
  .openapi(routes.getInfo, handlers.getInfo)
  .openapi(routes.healthCheck, handlers.healthCheck);

export default router;
