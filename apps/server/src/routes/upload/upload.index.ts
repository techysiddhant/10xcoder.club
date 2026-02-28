import { createRouter } from "../../lib/create-app";
import { authMiddleware } from "../../middleware/auth.middleware";

import * as controllers from "../../controllers/upload.controller";
import * as routes from "./upload.routes";

const router = createRouter();

// All upload routes require authentication
router.use(authMiddleware);

const uploadRouter = router.openapi(
  routes.createPresigned,
  controllers.createPresigned,
);

export default uploadRouter;
