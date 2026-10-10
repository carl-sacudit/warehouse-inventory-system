
import { Router } from "express";

import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller.js";

import {
  requireAuth,
  allowRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getSuppliers);
router.get("/:id", getSupplierById);

router.post(
  "/",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  createSupplier
);

router.put(
  "/:id",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  updateSupplier
);

router.delete(
  "/:id",
  allowRoles("ADMIN"),
  deleteSupplier
);

export default router;
