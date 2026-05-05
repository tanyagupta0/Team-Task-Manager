import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
