import { Router } from "express";
import healthRouter from "./health.js";
import notificationsRouter from "./notifications.js";

const router = Router();

router.use(healthRouter);
router.use(notificationsRouter);

export default router;
