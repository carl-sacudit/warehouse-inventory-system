
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  ArrowLeftRight,
  Settings,
  Warehouse,
  X,
  LogOut,
  Users,
} from "lucide-react";

import type { AuthUser } from "../services/authService";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onLogout: () => void;
}

interface NavigationItem {
  label: string;
  icon: typeof LayoutDashboard;
  allowedRoles: AuthUser["role"][];
}

interface NavigationSection {
  section: string;
  items: NavigationItem[];
}

const ALL_ROLES: AuthUser["role"][] = [
  "ADMIN",
  "WAREHOUSE_MANAGER",
  "INVENTORY_STAFF",
];

const MANAGEMENT_ROLES: AuthUser["role"][] = [
  "ADMIN",
  "WAREHOUSE_MANAGER",
];

const ADMIN_ROLES: AuthUser["role"][] = ["ADMIN"];

const navigationItems: NavigationSection[] = [
  {
    section: "MAIN MENU",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Products",
        icon: Package,
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Categories",
        icon: Tags,
        allowedRoles: ALL_ROLES,
      },
      {
        label: "Suppliers",
        icon: Truck,
        allowedRoles: MANAGEMENT_ROLES,
      },
      {
        label: "Stock Movements",
        icon: ArrowLeftRight,
        allowedRoles: ALL_ROLES,
      },
      {
        label: "User Management",
        icon: Users,
        allowedRoles: ADMIN_ROLES,
      },
    ],
  },
  {
    section: "PREFERENCES",
    items: [
      {
        label: "Settings",
        icon: Settings,
        allowedRoles: ALL_ROLES,
      },
    ],
  },
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRole(role: AuthUser["role"]): string {
  return role
    .split("_")
    .map(
      (part) =>
        part.charAt(0) + part.slice(1).toLowerCase()
    )
    .join(" ");
}

function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onClose,
  user,
  onLogout,
}: SidebarProps) {
  const visibleSections = navigationItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.allowedRoles.includes(user.role)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
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
          {visibleSections.map((section) => (
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
          <div className="sidebar-user-avatar">
            {getInitials(user.full_name)}
          </div>

          <div className="sidebar-user-info">
            <strong title={user.full_name}>
              {user.full_name}
            </strong>
            <span>{formatRole(user.role)}</span>
          </div>

          <button
            type="button"
            className="sidebar-logout-button"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={17} />
          </button>

          <span className="sidebar-status-dot" />
        </div>
      </aside>
    </>
  );
}

export default Sidebar;