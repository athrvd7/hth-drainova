import React from 'react';
import {
  ShieldAlert,
  MapPin,
  Activity,
  Map,
  Sun,
  Moon,
  Bell,
  BellRing,
  BellOff,
  Sliders,
  Cpu,
  RefreshCw,
  Settings
} from 'lucide-react';

export default function Navbar({
  backendOnline,
  selectedZone,
  zones,
  onSelectZone,
  onRefresh,
  isRefreshing,
  onOpenSimulator,
  onOpenConnectModal,
  onOpenSettingsModal,
  activeTab,
  setActiveTab,
  theme = 'dark',
  onToggleTheme,
  notifPermission = 'default',
  onRequestNotification
}) {
  return (
    <header style={{
      background: 'var(--bg-surface-glass)',
      backdropFilter: 'blur(24px) saturate(140%)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: 'var(--space-lg) var(--space-xl)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-lg)'
      }}>
        {/* Brand - Cleaner, more minimal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={20} color="var(--bg-primary)" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              marginBottom: '2px'
            }}>
              FloodGuard
            </h1>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              Nagpur Smart Drainage
            </p>
          </div>
        </div>

        {/* Navigation - More spacious */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface-elevated)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          <NavTab
            active={activeTab === 'live'}
            onClick={() => setActiveTab('live')}
            icon={<Activity size={14} />}
            label="Live"
          />
          <NavTab
            active={activeTab === 'zones'}
            onClick={() => setActiveTab('zones')}
            icon={<MapPin size={14} />}
            label={`Zones (${zones ? zones.length : 0})`}
          />
          <NavTab
            active={activeTab === 'map'}
            onClick={() => setActiveTab('map')}
            icon={<Map size={14} />}
            label="Map"
          />
        </div>

        {/* Controls - Cleaner layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          {/* Status indicator - minimal */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: '6px 14px',
            background: backendOnline ? 'var(--status-safe-bg)' : 'var(--status-critical-bg)',
            border: `1px solid ${backendOnline ? 'var(--status-safe)' : 'var(--status-critical)'}`,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: backendOnline ? 'var(--status-safe)' : 'var(--status-critical)'
          }}>
            <span className={`live-indicator ${backendOnline ? 'online' : 'offline'}`}></span>
            {backendOnline ? 'Online' : 'Offline'}
          </div>

          {/* Zone selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px'
          }}>
            <MapPin size={13} color="var(--text-secondary)" />
            <select
              value={selectedZone}
              onChange={(e) => onSelectZone(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {zones && zones.length > 0 ? (
                zones.slice(0, 100).map((z) => (
                  <option key={z.zone_id} value={z.zone_id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                    {z.zone_id}
                  </option>
                ))
              ) : (
                <option value="Z001">Z001</option>
              )}
            </select>
          </div>

          {/* Action buttons */}
          <button
            onClick={onOpenSimulator}
            className="btn-secondary"
            title="Simulate readings"
          >
            <Sliders size={14} />
            Simulate
          </button>

          <button
            onClick={onOpenConnectModal}
            className="btn-primary"
            title="Connect ESP32"
          >
            <Cpu size={14} />
            Connect
          </button>

          {/* Icon buttons */}
          <button
            onClick={onRequestNotification}
            className="btn-icon"
            style={{
              color: notifPermission === 'granted' ? 'var(--status-safe)' :
                     notifPermission === 'denied' ? 'var(--status-critical)' :
                     'var(--text-secondary)',
              borderColor: notifPermission === 'granted' ? 'var(--status-safe)' : 'var(--border-medium)',
              position: 'relative'
            }}
            title={
              notifPermission === 'granted' ? 'Notifications enabled' :
              notifPermission === 'denied' ? 'Notifications blocked' :
              'Enable notifications'
            }
          >
            {notifPermission === 'granted' ? <BellRing size={15} /> :
             notifPermission === 'denied' ? <BellOff size={15} /> :
             <Bell size={15} />}
            {notifPermission === 'granted' && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--status-safe)'
              }} />
            )}
          </button>

          <button
            onClick={onToggleTheme}
            className="btn-icon"
            title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <button
            onClick={onRefresh}
            className="btn-icon"
            title="Refresh"
          >
            <RefreshCw
              size={15}
              style={{
                transform: isRefreshing ? 'rotate(360deg)' : 'none',
                transition: isRefreshing ? 'transform 0.8s linear' : 'none'
              }}
            />
          </button>

          <button
            onClick={onOpenSettingsModal}
            className="btn-icon"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavTab({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--bg-surface)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        border: active ? '1px solid var(--border-medium)' : '1px solid transparent'
      }}
    >
      {icon}
      {label}
    </button>
  );
}
