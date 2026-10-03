import { Router } from "express";
import healthRouter from "./health.js";
import notificationsRouter from "./notifications.js";
import mediaProxyRouter from "./mediaProxy.js";

const router = Router();

router.use(healthRouter);
router.use(notificationsRouter);
router.use(mediaProxyRouter);

export default router;
