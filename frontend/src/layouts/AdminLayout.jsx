import { useEffect, useState } from "react";
import { Avatar, Button, Dropdown, Layout, Tooltip } from "antd";
import {
  BarChartOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  DownOutlined,
  LeftOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  RadarChartOutlined,
  RightOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

const { Sider, Header, Content } = Layout;

// Assets already stored in public/images/ (adjust extensions only if necessary).
const LOGO_SRC = "/images/outline.png";

// Existing routes are preserved. The first two navigation options intentionally
// point to the existing /admin/tracking route; Live Tracking targets its section.
const NAV_ITEMS = [
  { key: "dashboard", label: "Operations Dashboard", icon: DashboardOutlined },
{ key: "tracking", label: "Live Tracking", icon: CustomerServiceOutlined }, 
  { key: "agents", label: "Agents", icon: TeamOutlined },
  { key: "create", label: "Create Agent", icon: UserAddOutlined },
  { key: "assign", label: "Assign Lead Sheet", icon: CloudUploadOutlined },
];

const ROUTES = {
  dashboard: "/admin/tracking",
  tracking: "/admin/tracking#live-tracking",
  agents: "/admin/agents",
  create: "/admin/create-agent",
  assign: "/admin/assign-leads",
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // The existing logged-in user and logout behavior are unchanged.
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const navigateTo = (key) => {
    navigate(ROUTES[key]);
    setMobileOpen(false);
    if (key === "tracking") {
      requestAnimationFrame(() => {
        document.getElementById("live-tracking")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const activeKey = (() => {
    if (location.pathname.startsWith("/admin/agents")) return "agents";
    if (location.pathname.startsWith("/admin/create-agent")) return "create";
    if (location.pathname.startsWith("/admin/assign-leads")) return "assign";
    if (location.hash === "#live-tracking") return "tracking";
    return "dashboard";
  })();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const displayName = user?.name || "Admin";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const accountMenu = {
    items: [
      {
        key: "identity",
        label: user?.email || "System Administrator",
        disabled: true,
      },
      { type: "divider" },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Log out",
        onClick: logout,
      },
    ],
  };

  return (
    <Layout className={`cl-admin-shell${collapsed ? " cl-admin-shell--collapsed" : ""}`}>
      {mobileOpen && (
        <button
          type="button"
          className="cl-admin-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sider
        className={`cl-admin-sidebar${mobileOpen ? " cl-admin-sidebar--open" : ""}`}
        width={252}
        collapsedWidth={72}
        collapsed={collapsed}
        collapsible
        trigger={null}
        theme="dark"
      >
        <div className="cl-admin-sidebar-inner">
          <div className="cl-admin-brand-area">
            <div className="cl-admin-brand-card" aria-label="CoreLynx Logistics">
              <img
                className="cl-admin-logo-full"
                src={LOGO_SRC}
                alt="CoreLynx"
                draggable={false}
              />
              <span className="cl-admin-logo-mini" aria-hidden="true">C</span>
            </div>

            <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
              <button
                type="button"
                className="cl-admin-collapse-btn"
                onClick={() => setCollapsed((previous) => !previous)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
              >
                {collapsed ? <RightOutlined /> : <LeftOutlined />}
              </button>
            </Tooltip>

            <button
              type="button"
              className="cl-admin-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="cl-admin-divider" />
          <div className="cl-admin-section-title">WORKSPACE</div>

          <nav className="cl-admin-nav" aria-label="Administrator navigation">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const isActive = activeKey === key;
              return (
                <Tooltip
                  key={key}
                  title={collapsed && !mobileOpen ? label : ""}
                  placement="right"
                  mouseEnterDelay={0.5}
                >
                  <button
                    type="button"
                    className={`cl-admin-nav-link${isActive ? " cl-admin-nav-link--active" : ""}`}
                    onClick={() => navigateTo(key)}
                    aria-label={label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="cl-admin-nav-icon" aria-hidden="true" />
                    <span className="cl-admin-nav-text">{label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </nav>

          <div className="cl-admin-sidebar-spacer" />
          <div className="cl-admin-sidebar-footer" aria-hidden="true">
            <span className="cl-admin-footer-dot" />
            <span className="cl-admin-footer-label">DISPATCH OPERATIONS</span>
          </div>
        </div>
      </Sider>

      <Layout className="cl-admin-main">
        <Header className="cl-admin-header">
          <div className="cl-admin-header-left">
            <Button
              type="text"
              className="cl-admin-mobile-toggle"
              icon={<MenuUnfoldOutlined />}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            />
            <div className="cl-admin-header-symbol" aria-hidden="true">
  <img
    src="/images/admin.png"
    alt=""
    className="cl-admin-header-custom-icon"
  />
</div>
            <div className="cl-admin-header-text">
              <h1 className="cl-admin-header-title">Admin Control Center</h1>
              <p className="cl-admin-header-description">
                Manage agents, lead sheets, attendance, and live progress
              </p>
            </div>
          </div>

          <div className="cl-admin-header-right">
            <Dropdown menu={accountMenu} trigger={["click"]} placement="bottomRight">
              <button
                type="button"
                className="cl-admin-profile"
                aria-label={`${displayName}: account options`}
              >
                <Avatar className="cl-admin-profile-avatar" size={36}>
                  {avatarLetter}
                </Avatar>
                <span className="cl-admin-profile-copy">
                  <strong>{displayName}</strong>
                  <span>System Administrator</span>
                </span>
                <DownOutlined className="cl-admin-profile-arrow" aria-hidden="true" />
              </button>
            </Dropdown>

            <Button
              className="cl-admin-logout"
              icon={<LogoutOutlined />}
              onClick={logout}
              aria-label="Log out"
            >
              <span className="cl-admin-logout-text">Log Out</span>
            </Button>
          </div>
        </Header>

        <Content className="cl-admin-content">
          <div className="cl-admin-content-inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
