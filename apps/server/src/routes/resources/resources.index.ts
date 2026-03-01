import { createRouter } from "@/lib/create-app";
import { authMiddleware } from "@/middleware/auth.middleware";

import * as controllers from "@/controllers/resources.controller";
import * as routes from "@/routes/resources/resources.routes";

const router = createRouter();

// Public routes with optional auth checking inside the handler
router.openapi(routes.getResources, controllers.getResources);
router.openapi(routes.getResourceOptions, controllers.getResourceOptions);
router.openapi(routes.getResource, controllers.getResource);

// Protected routes inside a grouped instance
const protectedRouter = createRouter();
protectedRouter.use(authMiddleware);

protectedRouter
  .openapi(routes.getMyResources, controllers.getMyResources)
  .openapi(routes.getMyResourceById, controllers.getMyResourceById)
  .openapi(routes.createResource, controllers.createResource)
  .openapi(routes.updateResource, controllers.updateResource)
  .openapi(routes.removeResource, controllers.removeResource)
  .openapi(routes.restoreResource, controllers.restoreResource);

// Mount the protected routes into the main router
router.route("/", protectedRouter);

export default router;
