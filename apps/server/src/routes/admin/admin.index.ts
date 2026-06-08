import { createRouter } from "@/lib/create-app";
import { adminAuthMiddleware } from "@/middleware/auth.middleware";

import * as handlers from "@/controllers/admin.controller";
import * as routes from "@/routes/admin/admin.routes";

const router = createRouter();

// All admin routes require admin auth
router.use(adminAuthMiddleware);

const adminRouter = router
  .openapi(routes.getStats, handlers.getStats)
  .openapi(routes.getFailed, handlers.getFailed)
  .openapi(routes.retryAll, handlers.retryAll)
  .openapi(routes.listResources, handlers.listResources)
  .openapi(routes.updateResourceStatus, handlers.updateStatus)
  .openapi(routes.removeResource, handlers.removeResource)
  .openapi(routes.listResourceTypes, handlers.listResourceTypes)
  .openapi(routes.createResourceType, handlers.createResourceType)
  .openapi(routes.updateResourceType, handlers.updateResourceType)
  .openapi(routes.deleteResourceType, handlers.deleteResourceType)
  .openapi(routes.generateDescription, handlers.generateDescription);

export default adminRouter;
