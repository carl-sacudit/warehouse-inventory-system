
import { Router } from "express";
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  postPurchaseOrder,
  putPurchaseOrder,
  patchPurchaseOrderStatus,
  postReceivePurchaseOrder,
} from "../controllers/purchaseOrder.controller.js";
import {
  requireAuth,
  allowRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getPurchaseOrders);
router.get("/:id", getPurchaseOrderById);

router.post(
  "/",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  postPurchaseOrder
);

router.put(
  "/:id",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  putPurchaseOrder
);

router.patch(
  "/:id/status",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  patchPurchaseOrderStatus
);

router.post(
  "/:id/receive",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER", "INVENTORY_STAFF"),
  postReceivePurchaseOrder
);

export default router;
