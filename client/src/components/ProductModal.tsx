import { useState, type FormEvent } from "react";
import { X, Package, Save } from "lucide-react";
import type {
  Product,
  ProductInput,
} from "../services/productService";

interface ProductModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (data: ProductInput) => Promise<void>;
}

interface ProductForm {
  sku: string;
  name: string;
  description: string;
  quantity: string;
  unit_price: string;
  reorder_level: string;
}

const EMPTY_FORM: ProductForm = {
  sku: "",
  name: "",
  description: "",
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
          sku: product.sku,
          name: product.name,
          description: product.description ?? "",
          quantity: String(product.quantity),
          unit_price: String(product.unit_price),
          reorder_level: String(product.reorder_level),
        }
      : { ...EMPTY_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      await onSubmit({
        category_id: product?.category_id ?? null,
        supplier_id: product?.supplier_id ?? null,
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
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
