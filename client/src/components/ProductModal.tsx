import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X, Package, Save, Trash2 } from "lucide-react";
import {
  getProductCategories,
  getProductImageUrl,
  uploadProductImage,
} from "../services/productService";
import { getSuppliers } from "../services/supplierService";
import type {
  Product,
  ProductCategory,
  ProductInput,
} from "../services/productService";
import type { Supplier } from "../services/supplierService";

interface ProductModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (data: ProductInput) => Promise<void>;
}

interface ProductForm {
  category_id: string;
  supplier_id: string;
  sku: string;
  name: string;
  description: string;
  image_url: string;
  quantity: string;
  unit_price: string;
  reorder_level: string;
}

const EMPTY_FORM: ProductForm = {
  category_id: "",
  supplier_id: "",
  sku: "",
  name: "",
  description: "",
  image_url: "",
  quantity: "0",
  unit_price: "0.00",
  reorder_level: "10",
};

function ProductModal({
  isOpen,
  product,
  onClose,
  onSubmit,
}: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <ProductModalForm
      key={product ? `edit-${product.id}` : "create"}
      product={product}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface ProductModalFormProps {
  product: Product | null;
  onClose: () => void;
  onSubmit: (data: ProductInput) => Promise<void>;
}

function ProductModalForm({
  product,
  onClose,
  onSubmit,
}: ProductModalFormProps) {
  const [form, setForm] = useState<ProductForm>(() =>
    product
      ? {
          category_id: product.category_id ? String(product.category_id) : "",
          supplier_id: product.supplier_id ? String(product.supplier_id) : "",
          sku: product.sku,
          name: product.name,
          description: product.description ?? "",
          image_url: product.image_url ?? "",
          quantity: String(product.quantity),
          unit_price: String(product.unit_price),
          reorder_level: String(product.reorder_level),
        }
      : { ...EMPTY_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState("");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersError, setSuppliersError] = useState("");
  const [suppliersLoading, setSuppliersLoading] = useState(true);

  useEffect(() => {
    if (!imageFile) {
      setLocalImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setLocalImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  useEffect(() => {
    let cancelled = false;

    getProductCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCategoriesError(
            err instanceof Error
              ? err.message
              : "Unable to load product categories."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getSuppliers()
      .then((data) => {
        if (!cancelled) setSuppliers(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSuppliersError(
            err instanceof Error
              ? err.message
              : "Unable to load suppliers."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSuppliersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isEditing = product !== null;

  const updateField = (
    field: keyof ProductForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Product images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setError("");
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setForm((previous) => ({ ...previous, image_url: "" }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unit_price);
    const reorderLevel = Number(form.reorder_level);

    if (!form.sku.trim() || !form.name.trim()) {
      setError("SKU and product name are required.");
      return;
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      !Number.isSafeInteger(reorderLevel) ||
      reorderLevel < 0
    ) {
      setError(
        "Quantity and reorder level must be whole numbers of zero or greater."
      );
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("Unit price must be a valid non-negative number.");
      return;
    }

    setSaving(true);

    try {
      const imageUrl = imageFile
        ? await uploadProductImage(imageFile)
        : form.image_url.trim() || null;

      await onSubmit({
        category_id: form.category_id ? Number(form.category_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: imageUrl,
        quantity,
        unit_price: unitPrice,
        reorder_level: reorderLevel,
      });

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the product."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <header className="product-modal-header">
          <div className="product-modal-heading">
            <div className="product-modal-icon">
              <Package size={22} />
            </div>

            <div>
              <h2 id="product-modal-title">
                {isEditing ? "Edit Product" : "Add New Product"}
              </h2>
              <p>
                {isEditing
                  ? "Update your inventory product details."
                  : "Enter the details of your new inventory item."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-button"
            aria-label="Close modal"
            disabled={saving}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="product-modal-body">
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <div className="form-section-heading">
              Product Information
            </div>

            <div className="form-field">
              <label htmlFor="product-category">Category</label>
              <select
                id="product-category"
                value={form.category_id}
                onChange={(event) =>
                  updateField("category_id", event.target.value)
                }
                disabled={categoriesLoading || categories.length === 0}
                aria-describedby="product-category-help"
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categoriesError ? (
                <small id="product-category-help" role="status">
                  {categoriesError}
                </small>
              ) : categoriesLoading ? (
                <small id="product-category-help" role="status">
                  Loading categories...
                </small>
              ) : categories.length === 0 ? (
                <small id="product-category-help">
                  No categories are available. Uncategorized products are still allowed.
                </small>
              ) : (
                <small id="product-category-help">
                  Select a category or leave this as Uncategorized.
                </small>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="product-supplier">Supplier / Source</label>
              <select
                id="product-supplier"
                value={form.supplier_id}
                onChange={(event) =>
                  updateField("supplier_id", event.target.value)
                }
                disabled={suppliersLoading || suppliers.length === 0}
                aria-describedby="product-supplier-help"
              >
                <option value="">No supplier assigned</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {suppliersError ? (
                <small id="product-supplier-help" role="status">
                  {suppliersError}
                </small>
              ) : suppliersLoading ? (
                <small id="product-supplier-help" role="status">
                  Loading suppliers...
                </small>
              ) : suppliers.length === 0 ? (
                <small id="product-supplier-help">
                  No suppliers are available. You can still save without one.
                </small>
              ) : (
                <small id="product-supplier-help">
                  Select the supplier this product came from, or leave it unassigned.
                </small>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="product-sku">
                SKU <span>*</span>
              </label>
              <input
                id="product-sku"
                type="text"
                placeholder="e.g. SF-ITEM-001"
                value={form.sku}
                onChange={(event) =>
                  updateField("sku", event.target.value)
                }
                maxLength={50}
                required
              />
              <small>
                A unique stock-keeping unit for this product.
              </small>
            </div>

            <div className="form-field">
              <label htmlFor="product-name">
                Product Name <span>*</span>
              </label>
              <input
                id="product-name"
                type="text"
                placeholder="Enter product name"
                value={form.name}
                onChange={(event) =>
                  updateField("name", event.target.value)
                }
                maxLength={150}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="product-description">
                Description
              </label>
              <textarea
                id="product-description"
                placeholder="Describe the product..."
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={3}
              />
            </div>

            <div className="form-field">
              <label htmlFor="product-image">Product Image</label>
              <input
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                disabled={saving}
              />
              <small>JPG, PNG, WebP, or GIF. Maximum file size: 5 MB.</small>
              {(localImagePreview || form.image_url) && (
                <div className="product-image-preview">
                  <img
                    src={
                      localImagePreview ||
                      getProductImageUrl(form.image_url)
                    }
                    alt="Product preview"
                  />
                  <button
                    type="button"
                    className="table-action-button delete-action"
                    title="Remove product image"
                    aria-label="Remove product image"
                    onClick={handleRemoveImage}
                    disabled={saving}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="form-section-heading">
              Stock & Pricing
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="product-quantity">
                  Quantity <span>*</span>
                </label>
                <input
                  id="product-quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={(event) =>
                    updateField("quantity", event.target.value)
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="product-reorder">
                  Reorder Level <span>*</span>
                </label>
                <input
                  id="product-reorder"
                  type="number"
                  min="0"
                  step="1"
                  value={form.reorder_level}
                  onChange={(event) =>
                    updateField("reorder_level", event.target.value)
                  }
                  required
                />
              </div>

              <div className="form-field form-field-full">
                <label htmlFor="product-price">
                  Unit Price (PHP) <span>*</span>
                </label>
                <div className="price-input-wrapper">
                  <span>₱</span>
                  <input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(event) =>
                      updateField("unit_price", event.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="product-modal-footer">
            <button
              type="button"
              className="button-secondary"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button-primary"
              disabled={saving}
            >
              <Save size={17} />
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Product"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default ProductModal;
