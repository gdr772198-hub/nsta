import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import notificationsRouter from "./notifications.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notificationsRouter);

export default router;
