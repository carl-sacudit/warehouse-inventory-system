import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  ArrowLeftRight,
  Settings,
  Warehouse,
  X,
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  {
    section: "MAIN MENU",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Products",
        icon: Package,
      },
      {
        label: "Categories",
        icon: Tags,
      },
      {
        label: "Suppliers",
        icon: Truck,
      },
      {
        label: "Stock Movements",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    section: "PREFERENCES",
    items: [
      {
        label: "Settings",
        icon: Settings,
      },
    ],
  },
];

function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Warehouse size={24} strokeWidth={2.2} />
          </div>

          <div className="sidebar-brand-text">
            <h2>StockFlow</h2>
            <span>Inventory Management</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-workspace">
          <div className="workspace-avatar">SF</div>

          <div className="workspace-info">
            <strong>Main Warehouse</strong>
            <span>Workspace</span>
          </div>
        </div>

        <nav className="sidebar-navigation">
          {navigationItems.map((section) => (
            <div
              className="sidebar-section"
              key={section.section}
            >
              <p className="sidebar-section-title">
                {section.section}
              </p>

              <div className="sidebar-nav-items">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.label;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={`sidebar-nav-item ${
                        isActive ? "active" : ""
                      }`}
                      onClick={() => {
                        onNavigate(item.label);
                        onClose();
                      }}
                    >
                      <Icon size={19} strokeWidth={1.8} />

                      <span>{item.label}</span>

                      {isActive && (
                        <span className="sidebar-active-indicator" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">CB</div>

          <div className="sidebar-user-info">
            <strong>Administrator</strong>
            <span>Warehouse Manager</span>
          </div>

          <span className="sidebar-status-dot" />
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
