import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  Wifi, 
  WifiOff, 
  Sliders, 
  Cpu, 
  RefreshCw, 
  Settings, 
  MapPin, 
  Activity, 
  Map,
  Sun,
  Moon,
  Bell,
  BellRing,
  BellOff
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
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '12px 24px',
      transition: 'background-color 0.25s ease, border-color 0.25s ease'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.15))',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.25)'
          }}>
            <ShieldAlert size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                FLOOD<span style={{ color: 'var(--color-cyan)' }}>GUARD</span>
              </h1>
              <span style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: 'var(--color-cyan)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                NAGPUR AI
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Smart Drainage & Flood Early Warning System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: activeTab === 'live' ? 'var(--color-cyan)' : 'var(--text-secondary)',
              background: activeTab === 'live' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Activity size={15} />
            Live Telemetry
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: activeTab === 'zones' ? 'var(--color-cyan)' : 'var(--text-secondary)',
              background: activeTab === 'zones' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <MapPin size={15} />
            Nagpur Zones ({zones ? zones.length : 0})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: activeTab === 'map' ? 'var(--color-cyan)' : 'var(--text-secondary)',
              background: activeTab === 'map' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Map size={15} />
            Flood Map
          </button>
        </div>

        {/* Action Controls & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Backend Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: backendOnline ? 'var(--color-safe-bg)' : 'var(--color-critical-bg)',
            border: `1px solid ${backendOnline ? 'var(--color-safe)' : 'var(--color-critical)'}`,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: backendOnline ? 'var(--color-safe)' : 'var(--color-critical)'
          }}>
            <span className={`live-indicator ${backendOnline ? 'online' : 'offline'}`}></span>
            {backendOnline ? 'Backend Online' : 'Backend Disconnected'}
          </div>

          {/* Active Zone Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 10px'
          }}>
            <MapPin size={14} color="#ffffff" />
            <select
              value={selectedZone}
              onChange={(e) => onSelectZone(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.825rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {zones && zones.length > 0 ? (
                zones.slice(0, 100).map((z) => (
                  <option key={z.zone_id} value={z.zone_id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                    {z.zone_id} (Risk: {z.geo_risk_score}/100)
                  </option>
                ))
              ) : (
                <option value="Z001">Z001</option>
              )}
            </select>
          </div>

          {/* Simulator Button */}
          <button 
            onClick={onOpenSimulator}
            className="btn-secondary"
            title="Simulate ESP32 readings without hardware"
          >
            <Sliders size={15} color="var(--color-cyan)" />
            Simulate
          </button>

          {/* Hardware Connection Guide */}
          <button 
            onClick={onOpenConnectModal}
            className="btn-primary"
            title="ESP32 hardware connection & firmware code"
          >
            <Cpu size={15} />
            Connect ESP32
          </button>

          {/* Push Notification Toggle Button */}
          <button
            onClick={onRequestNotification}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: notifPermission === 'granted' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-elevated)',
              border: `1px solid ${notifPermission === 'granted' ? 'var(--color-safe)' : 'var(--border-medium)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: notifPermission === 'granted' ? 'var(--color-safe)' : notifPermission === 'denied' ? 'var(--color-critical)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              position: 'relative'
            }}
            title={
              notifPermission === 'granted'
                ? 'Push Notifications: Active (Will notify on CRITICAL status)'
                : notifPermission === 'denied'
                ? 'Push Notifications: Blocked in browser settings'
                : 'Click to enable Browser Push Notifications for CRITICAL alerts'
            }
            aria-label="Push notifications"
          >
            {notifPermission === 'granted' ? (
              <BellRing size={16} />
            ) : notifPermission === 'denied' ? (
              <BellOff size={16} />
            ) : (
              <Bell size={16} />
            )}
            {notifPermission === 'granted' && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--color-safe)',
                  boxShadow: '0 0 6px var(--color-safe)'
                }}
              />
            )}
          </button>

          {/* Mode Switcher: Default (Dark) to Light Mode */}
          <button
            onClick={onToggleTheme}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme === 'light' ? '#f59e0b' : '#ffffff',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            title={theme === 'light' ? 'Switch to Default (Dark) Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme mode"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            title="Refresh Telemetry"
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} style={{
              transform: isRefreshing ? 'rotate(360deg)' : 'none',
              transition: isRefreshing ? 'transform 0.8s linear' : 'none'
            }} />
          </button>

          {/* Settings Modal Trigger */}
          <button
            onClick={onOpenSettingsModal}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            title="Network & API Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
