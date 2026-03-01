import { createRouter } from "@/lib/create-app";
import { authMiddleware } from "@/middleware/auth.middleware";
import { scrapeRateLimitMiddleware } from "@/middleware/rate-limit.middleware";

import * as controllers from "@/controllers/scrape.controller";
import * as routes from "@/routes/scrape/scrape.routes";

const router = createRouter();

// All scrape routes require authentication + rate limiting
router.use(authMiddleware);
router.use(scrapeRateLimitMiddleware);

const scrapeRouter = router.openapi(routes.scrapeUrl, controllers.scrape);

export default scrapeRouter;
