import { useEffect, useState } from "react";
import { Avatar, Button, Dropdown, Layout, Tooltip } from "antd";
import {
  BarChartOutlined,
  DownOutlined,
  LeftOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  PhoneOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./AgentLayout.css";

const { Sider, Header, Content } = Layout;

// Existing assets in frontend/public/images/
const LOGO_SRC = "/images/outline.png";

// Keep the existing agent routes. The online indicator is STATUS, not navigation.
const NAV_ITEMS = [
  { path: "/agent/leads", label: "My Lead Queue", icon: PhoneOutlined },
  { path: "/agent/reports", label: "My Reports", icon: BarChartOutlined },
];

const getInitials = (name) => {
  const parts = String(name || "Agent").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function AgentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Same existing localStorage login session and logout behavior.
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

  const navigateTo = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const isReportsPage = location.pathname.startsWith("/agent/reports");
  const displayName = user?.name || "Agent";
  const avatarInitials = getInitials(displayName);

  const headerTitle = isReportsPage
    ? "Agent Performance Report"
    : "Agent Calling Dashboard";
  const headerSubtitle = isReportsPage
    ? "Your calling performance, lead progress, and daily activity"
    : "Assigned leads, remarks, and call tracking";
  const HeaderIcon = isReportsPage ? BarChartOutlined : PhoneOutlined;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  const accountMenu = {
    items: [
      {
        key: "email",
        label: user?.email || "Dispatch Agent",
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
    <Layout
      className={`cl-agent-shell${collapsed ? " cl-agent-shell--collapsed" : ""}`}
    >
      {mobileOpen && (
        <button
          type="button"
          className="cl-agent-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sider
        className={`cl-agent-sidebar${mobileOpen ? " cl-agent-sidebar--open" : ""}`}
        width={252}
        collapsedWidth={72}
        collapsed={collapsed}
        collapsible
        trigger={null}
        theme="dark"
      >
        <div className="cl-agent-sidebar-inner">
          <div className="cl-agent-brand-area">
            <div className="cl-agent-brand-card" aria-label="CoreLynx Logistics">
              <img
                src={LOGO_SRC}
                alt="CoreLynx"
                className="cl-agent-logo-full"
                draggable={false}
              />
              <span className="cl-agent-logo-mini" aria-hidden="true">C</span>
            </div>

            <Tooltip
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              placement="right"
            >
              <button
                className="cl-agent-collapse-btn"
                type="button"
                onClick={() => setCollapsed((current) => !current)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
              >
                {collapsed ? <RightOutlined /> : <LeftOutlined />}
              </button>
            </Tooltip>

            <button
              className="cl-agent-close-btn"
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="cl-agent-divider" />

          {/* Online status must not be an interactive menu item. */}
          <Tooltip title={collapsed && !mobileOpen ? "Agent Online" : ""} placement="right">
            <div className="cl-agent-online" role="status" aria-label="Agent Online">
              <span className="cl-agent-online-dot" aria-hidden="true" />
              <span className="cl-agent-online-label">Agent Online</span>
            </div>
          </Tooltip>

          <div className="cl-agent-section-title">WORKSPACE</div>
          <nav className="cl-agent-nav" aria-label="Agent navigation">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
              return (
                <Tooltip
                  key={path}
                  title={collapsed && !mobileOpen ? label : ""}
                  placement="right"
                  mouseEnterDelay={0.4}
                >
                  <button
                    className={`cl-agent-nav-link${isActive ? " cl-agent-nav-link--active" : ""}`}
                    type="button"
                    onClick={() => navigateTo(path)}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={label}
                  >
                    <Icon className="cl-agent-nav-icon" aria-hidden="true" />
                    <span className="cl-agent-nav-text">{label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </nav>

          <div className="cl-agent-sidebar-spacer" />
          <div className="cl-agent-sidebar-footer" aria-hidden="true">
            <span className="cl-agent-footer-mark">✦</span>
            <span className="cl-agent-footer-label">CORELYNX · DISPATCH</span>
          </div>
        </div>
      </Sider>

      <Layout className="cl-agent-main">
        <Header className="cl-agent-header">
          <div className="cl-agent-header-left">
            <Button
              type="text"
              className="cl-agent-mobile-toggle"
              icon={<MenuUnfoldOutlined />}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            />
       
<div className="cl-agent-header-symbol" aria-hidden="true">
  <img
    src="/images/agentIcon.png"
    alt=""
    className="cl-agent-header-custom-icon"
    draggable={false}
  />
</div>

            <div className="cl-agent-header-copy">
              <h1 className="cl-agent-header-title">{headerTitle}</h1>
              <p className="cl-agent-header-subtitle">{headerSubtitle}</p>
            </div>
          </div>

          <div className="cl-agent-header-right">
            <Dropdown menu={accountMenu} trigger={["click"]} placement="bottomRight">
              <button
                type="button"
                className="cl-agent-profile"
                aria-label={`${displayName}: account options`}
              >
                <Avatar size={36} className="cl-agent-avatar">
                  {avatarInitials}
                </Avatar>
                <span className="cl-agent-profile-copy">
                  <strong title={displayName}>{displayName}</strong>
                  <span className="cl-agent-profile-role">Dispatch Agent</span>
                </span>
                <span className="cl-agent-profile-chevron"><DownOutlined /></span>
              </button>
            </Dropdown>

            <Button
              className="cl-agent-logout"
              icon={<LogoutOutlined />}
              onClick={logout}
              aria-label="Log out"
            >
              <span className="cl-agent-logout-label">Log Out</span>
            </Button>
          </div>
        </Header>

        <Content className="cl-agent-content">
          <div className="cl-agent-content-inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
