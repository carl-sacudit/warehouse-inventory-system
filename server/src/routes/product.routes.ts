
import { Router } from "express";

import {
  getProducts,
  getCategories,
  createCategory,
  updateCategory,
  getProductById,
  saveProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { uploadProductImage } from "../middleware/upload.middleware.js";

import {
  requireAuth,
  allowRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

// All product endpoints require an authenticated user.
router.use(requireAuth);

// All authenticated roles can view products.
router.get("/", getProducts);
router.get("/categories", getCategories);
router.post(
  "/categories",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  createCategory
);
router.put(
  "/categories/:id",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  updateCategory
);
router.post(
  "/upload",
  allowRoles("ADMIN", "WAREHOUSE_MANAGER"),
  uploadProductImage,
  saveProductImage
);
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