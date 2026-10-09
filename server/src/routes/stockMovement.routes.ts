import { Router } from "express";
import {
  getMovements,
  createMovement,
} from "../controllers/stockMovement.controller.js";
import {
  requireAuth,
  allowRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getMovements);

router.post(
  "/",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  createMovement
);

export default router;
