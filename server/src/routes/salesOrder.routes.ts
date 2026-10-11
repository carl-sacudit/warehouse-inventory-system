import { Router } from "express";
import {
  getSalesOrderById,
  getSalesOrders,
  postSalesOrder,
} from "../controllers/salesOrder.controller.js";
import { allowRoles, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", getSalesOrders);
router.get("/:id", getSalesOrderById);
router.post(
  "/",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER", "INVENTORY_STAFF"),
  postSalesOrder
);

export default router;