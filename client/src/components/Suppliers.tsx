import { useEffect, useState } from "react";
import {
  Search,
  Truck,
  Pencil,
  Trash2,
  ArrowUpDown,
  Plus,
  Mail,
  Phone,
  MapPin,
  UserRound,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../services/supplierService";
import type {
  Supplier,
  SupplierInput,
} from "../services/supplierService";
import "./Suppliers.css";


interface SuppliersProps {
  canManageSuppliers: boolean;
  canDeleteSuppliers: boolean;
}

const EMPTY_FORM: SupplierInput = {
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
};

function Suppliers({
  canManageSuppliers,
  canDeleteSuppliers,
}: SuppliersProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierInput>(EMPTY_FORM);

  async function loadSuppliers() {
    setLoading(true);
    setError("");

    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }

useEffect(() => {
  let ignore = false;

  async function fetchSuppliers() {
    try {
      setError("");

      const data = await getSuppliers();

      if (!ignore) {
        setSuppliers(data);
      }
    } catch (err) {
      if (!ignore) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load suppliers."
        );
      }
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  }

  void fetchSuppliers();

  return () => {
    ignore = true;
  };
}, []);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return true;

    return [
      supplier.name,
      supplier.contact_person,
      supplier.email,
      supplier.phone,
      supplier.address,
    ].some((value) =>
      (value || "").toLowerCase().includes(query)
    );
  });

  function openCreateModal() {
    setEditingSupplier(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingSupplier(null);
    setForm({ ...EMPTY_FORM });
  }

  function updateField(
    field: keyof SupplierInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setNotice("");

    const input: SupplierInput = {
      name: form.name.trim(),
      contact_person: form.contact_person?.trim() || "",
      email: form.email?.trim() || "",
      phone: form.phone?.trim() || "",
      address: form.address?.trim() || "",
    };

    if (!input.name) {
      setError("Supplier name is required.");
      return;
    }

    setSaving(true);

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, input);
        setNotice("Supplier updated successfully.");
      } else {
        await createSupplier(input);
        setNotice("Supplier added successfully.");
      }

      setModalOpen(false);
      setEditingSupplier(null);
      setForm({ ...EMPTY_FORM });
      await loadSuppliers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save supplier."
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(supplier: Supplier) {
    setSupplierToDelete(supplier);
    setError("");
    setNotice("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setSupplierToDelete(null);
  }

  async function handleDelete() {
    if (!supplierToDelete) return;

    const supplier = supplierToDelete;
    setError("");
    setNotice("");
    setDeleting(true);

    try {
      await deleteSupplier(supplier.id);
      setNotice(`"${supplier.name}" was deleted successfully.`);
      setSupplierToDelete(null);
      await loadSuppliers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete supplier."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="suppliers-page">
      <section className="suppliers-panel">
        <div className="suppliers-panel-header">
          <div>
            <h2>Supplier Management</h2>
            <p>
              Manage supplier details and warehouse vendor contacts.
            </p>
          </div>

          <div className="suppliers-header-actions">
            <div className="suppliers-count">
              <Truck size={16} />
              <span>
                {suppliers.length}{" "}
                {suppliers.length === 1 ? "supplier" : "suppliers"}
              </span>
            </div>

            {canManageSuppliers && (
              <button
                type="button"
                className="supplier-primary-button"
                onClick={openCreateModal}
              >
                <Plus size={17} />
                Add Supplier
              </button>
            )}
          </div>
        </div>

        <div className="suppliers-toolbar">
          <div className="suppliers-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name, contact, email, or phone..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              aria-label="Search suppliers"
            />
          </div>

          <div className="suppliers-toolbar-label">
            <ArrowUpDown size={15} />
            <span>Supplier directory</span>
          </div>
        </div>

        {error && !modalOpen && !supplierToDelete && (
          <div className="suppliers-message suppliers-error" role="alert">
            {error}
          </div>
        )}

        {notice && !modalOpen && (
          <div className="suppliers-message suppliers-success" role="status">
            {notice}
          </div>
        )}

        <div className="suppliers-table-wrapper">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                {(canManageSuppliers || canDeleteSuppliers) && (
                  <th className="supplier-actions-heading">Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={
                      canManageSuppliers || canDeleteSuppliers ? 6 : 5
                    }
                    className="supplier-table-message"
                  >
                    <span className="loading-spinner" />
                    Loading suppliers...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      canManageSuppliers || canDeleteSuppliers ? 6 : 5
                    }
                    className="supplier-table-message"
                  >
                    <div className="empty-suppliers">
                      <Truck size={32} />
                      <strong>
                        {searchQuery
                          ? "No matching suppliers"
                          : "No suppliers found"}
                      </strong>
                      <span>
                        {searchQuery
                          ? "Try another search term."
                          : "Add a supplier to start building your directory."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="supplier-name-cell">
                        <div className="supplier-avatar">
                          <Truck size={19} />
                        </div>
                        <div className="supplier-name-info">
                          <strong>{supplier.name}</strong>
                          <span>Supplier #{supplier.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="supplier-detail-cell">
                        <UserRound size={15} />
                        <span>
                          {supplier.contact_person || "Not provided"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="supplier-detail-cell">
                        <Mail size={15} />
                        {supplier.email ? (
                          <a href={`mailto:${supplier.email}`}>
                            {supplier.email}
                          </a>
                        ) : (
                          <span>Not provided</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="supplier-detail-cell">
                        <Phone size={15} />
                        {supplier.phone ? (
                          <a href={`tel:${supplier.phone}`}>
                            {supplier.phone}
                          </a>
                        ) : (
                          <span>Not provided</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="supplier-detail-cell supplier-address">
                        <MapPin size={15} />
                        <span>
                          {supplier.address || "Not provided"}
                        </span>
                      </div>
                    </td>

                    {(canManageSuppliers || canDeleteSuppliers) && (
                      <td>
                        <div className="supplier-actions">
                          {canManageSuppliers && (
                            <button
                              type="button"
                              className="table-action-button edit-action"
                              title={`Edit ${supplier.name}`}
                              aria-label={`Edit ${supplier.name}`}
                              onClick={() => openEditModal(supplier)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {canDeleteSuppliers && (
                            <button
                              type="button"
                              className="table-action-button delete-action"
                              title={`Delete ${supplier.name}`}
                              aria-label={`Delete ${supplier.name}`}
                              onClick={() => openDeleteModal(supplier)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="suppliers-panel-footer">
          <span>
            Showing {filteredSuppliers.length} of {suppliers.length}{" "}
            {suppliers.length === 1 ? "supplier" : "suppliers"}
          </span>
          <span>StockFlow Supplier Directory</span>
        </div>
      </section>

      {modalOpen && (
        <div
          className="supplier-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="supplier-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-modal-title"
          >
            <div className="supplier-modal-header">
              <div>
                <span className="supplier-modal-eyebrow">
                  SUPPLIER DIRECTORY
                </span>
                <h2 id="supplier-modal-title">
                  {editingSupplier ? "Edit Supplier" : "Add Supplier"}
                </h2>
                <p>
                  Enter the supplier's contact and business information.
                </p>
              </div>

              <button
                type="button"
                className="supplier-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="supplier-form-body">
                {error && (
                  <div className="suppliers-message suppliers-error" role="alert">
                    {error}
                  </div>
                )}

                <label className="supplier-form-field">
                  <span>Supplier Name <b>*</b></span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="e.g. Cebu Industrial Supplies"
                    maxLength={150}
                    required
                  />
                </label>

                <label className="supplier-form-field">
                  <span>Contact Person</span>
                  <input
                    type="text"
                    value={form.contact_person || ""}
                    onChange={(event) =>
                      updateField("contact_person", event.target.value)
                    }
                    placeholder="e.g. Juan Dela Cruz"
                    maxLength={100}
                  />
                </label>

                <div className="supplier-form-grid">
                  <label className="supplier-form-field">
                    <span>Email Address</span>
                    <input
                      type="email"
                      value={form.email || ""}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      placeholder="supplier@example.com"
                      maxLength={150}
                    />
                  </label>

                  <label className="supplier-form-field">
                    <span>Phone Number</span>
                    <input
                      type="tel"
                      value={form.phone || ""}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      placeholder="+63 9XX XXX XXXX"
                      maxLength={30}
                    />
                  </label>
                </div>

                <label className="supplier-form-field">
                  <span>Business Address</span>
                  <textarea
                    value={form.address || ""}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    placeholder="Enter the supplier's business address"
                    maxLength={255}
                    rows={3}
                  />
                </label>
              </div>

              <div className="supplier-modal-footer">
                <button
                  type="button"
                  className="supplier-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="supplier-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingSupplier
                      ? "Save Changes"
                      : "Create Supplier"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {supplierToDelete && (
        <div
          className="supplier-delete-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <section
            className="supplier-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="supplier-delete-title"
            aria-describedby="supplier-delete-description"
          >
            <div className="supplier-delete-icon">
              <AlertTriangle size={22} />
            </div>
            <h2 id="supplier-delete-title">Delete supplier?</h2>
            <p id="supplier-delete-description">
              Are you sure you want to delete <strong>{supplierToDelete.name}</strong>?
              This action cannot be undone.
            </p>
            {error && (
              <div className="supplier-delete-error" role="alert">
                {error}
              </div>
            )}
            <div className="supplier-delete-actions">
              <button
                type="button"
                className="supplier-delete-cancel"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="supplier-delete-confirm"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting && <span className="supplier-delete-spinner" aria-hidden="true" />}
                {deleting ? "Deleting..." : "Delete supplier"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Suppliers;
