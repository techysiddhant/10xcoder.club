import { createRouter } from "@/lib/create-app";
import { authMiddleware } from "@/middleware/auth.middleware";

import * as controllers from "@/controllers/resources.controller";
import * as routes from "@/routes/resources/resources.routes";

const router = createRouter();

const publicResourceRoutePattern =
  /^\/api\/resources\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  const isPublicGetRoute =
    method === "GET" &&
    (path === "/api/resources" ||
      path === "/api/resources/options" ||
      publicResourceRoutePattern.test(path));

  if (isPublicGetRoute) {
    await next();
    return;
  }

  await authMiddleware(c, next);
});

// Public routes with optional auth checking inside the handler
router.openapi(routes.getResources, controllers.getResources);
router.openapi(routes.getResourceOptions, controllers.getResourceOptions);

router
  .openapi(routes.getMyResources, controllers.getMyResources)
  .openapi(routes.getMyResourceById, controllers.getMyResourceById)
  .openapi(routes.createResource, controllers.createResource)
  .openapi(routes.updateResource, controllers.updateResource)
  .openapi(routes.removeResource, controllers.removeResource)
  .openapi(routes.restoreResource, controllers.restoreResource);

router.openapi(routes.getResource, controllers.getResource);

export default router;
