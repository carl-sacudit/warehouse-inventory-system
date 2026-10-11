import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  ChevronRight,
  FolderTree,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tags,
  X,
} from "lucide-react";
import {
  createProductCategory,
  getProductCategories,
  type ProductCategory,
  updateProductCategory,
} from "../services/productService";
import { useToast } from "./ToastProvider.tsx";
import "./Categories.css";

interface CategoriesProps {
  canManageCategories: boolean;
  onViewProducts: (categoryName: string) => void;
}

function Categories({ canManageCategories, onViewProducts }: CategoriesProps) {
  const notify = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [formError, setFormError] = useState("");

  const loadCategories = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      setCategories(await getProductCategories());
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Unable to load categories.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    const timerId = window.setTimeout(() => void loadCategories(), 0);
    return () => window.clearTimeout(timerId);
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  const assignedProducts = categories.reduce(
    (total, category) => total + Number(category.product_count ?? 0),
    0
  );
  const unusedCategories = categories.filter(
    (category) => Number(category.product_count ?? 0) === 0
  ).length;

  function openCreateDialog() {
    setEditingCategory(null);
    setCategoryName("");
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(category: ProductCategory) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (isSaving) return;
    setDialogOpen(false);
    setEditingCategory(null);
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const name = categoryName.trim();

    if (!name) {
      setFormError("Enter a category name.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await updateProductCategory(editingCategory.id, name);
        notify("success", `“${name}” was renamed successfully.`);
      } else {
        await createProductCategory(name);
        notify("success", `“${name}” was added successfully.`);
      }

      setDialogOpen(false);
      setEditingCategory(null);
      await loadCategories(true);
    } catch (err) {
      notify("error",
        err instanceof Error ? err.message : "Unable to save this category."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="categories-page">
      <header className="categories-page-heading">
        <div>
          <span className="categories-eyebrow">CATALOG ORGANIZATION</span>
          <h1>Categories</h1>
          <p>Organize products with a shared category list.</p>
        </div>
        {canManageCategories && (
          <button
            type="button"
            className="categories-primary-button"
            onClick={openCreateDialog}
          >
            <Plus size={17} />
            Add category
          </button>
        )}
      </header>

      <div className="categories-summary" aria-label="Category summary">
        <article>
          <span className="categories-summary-icon categories-summary-sage"><Tags size={18} /></span>
          <div><span>Total categories</span><strong>{isLoading ? "—" : categories.length}</strong></div>
        </article>
        <article>
          <span className="categories-summary-icon categories-summary-blue"><Package size={18} /></span>
          <div><span>Assigned products</span><strong>{isLoading ? "—" : assignedProducts}</strong></div>
        </article>
        <article>
          <span className="categories-summary-icon categories-summary-amber"><FolderTree size={18} /></span>
          <div><span>Unused categories</span><strong>{isLoading ? "—" : unusedCategories}</strong></div>
        </article>
      </div>

      <section className="categories-panel">
        <div className="categories-panel-heading">
          <div>
            <h2>Product categories</h2>
            <p>Category names are shared by every assigned product.</p>
          </div>
          <button
            type="button"
            className="categories-icon-button"
            title="Refresh categories"
            aria-label="Refresh categories"
            onClick={() => void loadCategories(true)}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw size={16} className={isRefreshing ? "categories-spin" : ""} />
          </button>
        </div>

        <div className="categories-toolbar">
          <label className="categories-search">
            <Search size={17} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
            />
          </label>
          <span>{filteredCategories.length} shown</span>
        </div>

        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Products</th>
                <th className="categories-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} className="categories-table-message">Loading categories...</td></tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="categories-table-message">
                    <div className="categories-empty">
                      <FolderTree size={25} />
                      <strong>{searchQuery ? "No matching categories" : "No categories yet"}</strong>
                      <span>{searchQuery ? "Try another search." : "Add a category to organize your products."}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category, index) => (
                  <tr key={category.id}>
                    <td>
                      <div className="categories-name-cell">
                        <span className={`categories-row-mark categories-mark-${index % 5}`}>
                          <Tags size={16} />
                        </span>
                        <div><strong>{category.name}</strong><small>Shared product category</small></div>
                      </div>
                    </td>
                    <td>
                      <span className="categories-product-count">
                        <Package size={15} />
                        {Number(category.product_count ?? 0)}
                        <span>{Number(category.product_count ?? 0) === 1 ? "product" : "products"}</span>
                      </span>
                    </td>
                    <td>
                      <div className="categories-row-actions">
                        {canManageCategories && (
                          <button
                            type="button"
                            className="categories-edit-button"
                            title={`Rename ${category.name}`}
                            aria-label={`Rename ${category.name}`}
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil size={15} />
                            Rename
                          </button>
                        )}
                        <button
                          type="button"
                          className="categories-view-button"
                          title={`View ${category.name} products`}
                          aria-label={`View products in ${category.name}`}
                          onClick={() => onViewProducts(category.name)}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="categories-panel-footer">
          <span>Changes to a category name appear on all assigned products.</span>
        </footer>
      </section>

      {dialogOpen && (
        <div
          className="categories-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className="categories-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="categories-dialog-title"
          >
            <header className="categories-dialog-header">
              <div className="categories-dialog-icon"><Tags size={19} /></div>
              <div>
                <h2 id="categories-dialog-title">
                  {editingCategory ? "Rename category" : "Add category"}
                </h2>
                <p>{editingCategory ? "The new name will apply to assigned products." : "Create a category for grouping products."}</p>
              </div>
              <button type="button" aria-label="Close dialog" onClick={closeDialog} disabled={isSaving}>
                <X size={19} />
              </button>
            </header>
            <form onSubmit={handleSubmit}>
              <div className="categories-dialog-body">
                {formError && <div className="categories-form-error" role="alert">{formError}</div>}
                <label htmlFor="category-name">Category name</label>
                <input
                  id="category-name"
                  type="text"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="e.g. Safety Equipment"
                  maxLength={100}
                  autoFocus
                  required
                  disabled={isSaving}
                />
                <small>Use a clear name that staff can select when adding or editing a product.</small>
              </div>
              <footer className="categories-dialog-footer">
                <button type="button" className="categories-cancel-button" onClick={closeDialog} disabled={isSaving}>Cancel</button>
                <button type="submit" className="categories-primary-button" disabled={isSaving}>
                  {isSaving ? <RefreshCw size={16} className="categories-spin" /> : <Check size={16} />}
                  {isSaving ? "Saving..." : editingCategory ? "Save name" : "Create category"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default Categories;