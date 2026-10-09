
import { Router } from "express";

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";

import {
  requireAuth,
  allowRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

// All product endpoints require an authenticated user.
router.use(requireAuth);

// All authenticated roles can view products.
router.get("/", getProducts);
router.get("/:id", getProductById);

// Only admins and warehouse managers can modify inventory.
router.post(
  "/",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  createProduct
);

router.put(
  "/:id",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  updateProduct
);

router.delete(
  "/:id",
  allowRoles("ADMIN"),
  deleteProduct
);

export default router;