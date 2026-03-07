import { createRouter } from "@/lib/create-app";
import { authMiddleware } from "@/middleware/auth.middleware";

import * as controllers from "@/controllers/vote.controller";
import * as routes from "@/routes/vote/vote.routes";

const router = createRouter();

// Public routes
router.openapi(routes.getCounts, controllers.getCounts);
router.openapi(routes.streamVotes, controllers.streamVotes);

// Protected routes
router.use(authMiddleware);

router.openapi(routes.upvote, controllers.upvote);
router.openapi(routes.downvote, controllers.downvote);

export default router;
