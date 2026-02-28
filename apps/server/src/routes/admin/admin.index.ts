import { createRouter } from "../../lib/create-app";
import { adminAuthMiddleware } from "../../middleware/auth.middleware";

import * as handlers from "../../controllers/admin.controller";
import * as routes from "./admin.routes";

const router = createRouter();

// All admin routes require admin auth
router.use(adminAuthMiddleware);

const adminRouter = router
  .openapi(routes.getStats, handlers.getStats)
  .openapi(routes.getFailed, handlers.getFailed)
  .openapi(routes.retryAll, handlers.retryAll);

export default adminRouter;
