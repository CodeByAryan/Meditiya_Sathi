import { Router, type IRouter } from "express";
import healthRouter from "./health";
import statsRouter from "./stats";
import eventsRouter from "./events";
import noticesRouter from "./notices";
import galleryRouter from "./gallery";
import donationsRouter from "./donations";
import festivalsRouter from "./festivals";
import volunteersRouter from "./volunteers";
import competitionsRouter from "./competitions";
import servicesRouter from "./services";
import marketplaceRouter from "./marketplace";
import lostfoundRouter from "./lostfound";
import committeeRouter from "./committee";
import emergencyRouter from "./emergency";
import sponsorsRouter from "./sponsors";
import usersRouter from "./users";
import adminRouter from "./admin";
import adminAuthRouter from "./admin-auth";
import residentsRouter from "./residents";


const router: IRouter = Router();

router.use(healthRouter);
router.use(statsRouter);
router.use(eventsRouter);
router.use(noticesRouter);
router.use(galleryRouter);
router.use(donationsRouter);
router.use(festivalsRouter);
router.use(volunteersRouter);
router.use(competitionsRouter);
router.use(servicesRouter);
router.use(marketplaceRouter);
router.use(lostfoundRouter);
router.use(committeeRouter);
router.use(emergencyRouter);
router.use(sponsorsRouter);
router.use(usersRouter);
router.use(adminRouter);
router.use(adminAuthRouter);
router.use(residentsRouter);


export default router;
