import React from 'react';
import { ArrowRight, ShieldAlert, Activity, MapPin, Radio, Droplets, Layers, Search, ExternalLink } from 'lucide-react';
import { HeroMock, TelemetryMock, MapMock, LogsMock } from './LandingMocks';
import './LandingPage.css';

export default function LandingPage({ onEnterDashboard, onViewZones }) {
  return (
    <div className="lp-athas">
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <div className="lp-brand" onClick={onEnterDashboard} role="button" tabIndex={0} onKeyDown={e => e.key==='Enter' && onEnterDashboard()}>
            <span className="lp-brand-mark"><ShieldAlert size={14} /></span>
            <span className="lp-brand-name">FloodGuard</span>
          </div>
          <nav className="lp-nav-links" aria-label="Primary">
            <a href="#principles">System</a>
            <a href="#coverage">Coverage</a>
            <a href="#field">Field</a>
          </nav>
          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn-ghost" onClick={onViewZones}>Browse zones</button>
            <button className="lp-btn lp-btn-primary" onClick={onEnterDashboard}>Open dashboard <ArrowRight size={14} /></button>
          </div>
        </div>
      </header>

      <section className="lp-hero-center">
        <div className="lp-container">
          <div className="lp-pill">
            <span className="lp-pill-dot" /> Live now — 24 zones monitored
          </div>
          <h1 className="lp-h1">
            The lightweight monitor<br /><em>built for Nagpur drains.</em>
          </h1>
          <p className="lp-sub">
            Live level, forecast and maps in one quiet workspace without stitching together another collection of tools.
          </p>
          <div className="lp-hero-ctas">
            <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onEnterDashboard}>Open dashboard <ArrowRight size={16} /></button>
            <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={onViewZones}>Browse 24 zones</button>
          </div>
          <p className="lp-hero-note">Works with your sensor fleet or ours. No install friction.</p>

          <div className="lp-browser">
            <div className="lp-browser-bar">
              <span className="lp-browser-dots"><i /><i /><i /></span>
              <span className="lp-browser-url">floodguard.nagpur — live telemetry</span>
              <span className="lp-browser-status"><span className="lp-live-dot" /> Online</span>
            </div>
            <HeroMock />
          </div>
          <p className="lp-browser-caption">Nagpur drains keep getting heavier while flood work keeps moving into separate apps. FloodGuard brings level, forecast and map into one focused surface.</p>
        </div>
      </section>

      <section id="principles" className="lp-principles" aria-label="Principles">
        <div className="lp-container">
          <div className="lp-principles-grid">
            <div className="lp-principle">
              <Activity size={18} />
              <h3>Live by design</h3>
              <p>Two second poll keeps the interface responsive and the workflow direct. No spinner theatre.</p>
            </div>
            <div className="lp-principle">
              <MapPin size={18} />
              <h3>Nagpur is on the map</h3>
              <p>Zones drawn from DEM and historic waterlogging. Water bodies and hotspots layered for context.</p>
            </div>
            <div className="lp-principle">
              <Radio size={18} />
              <h3>Sensors you trust</h3>
              <p>ESP32 plus ultrasonic probes. Edge rule decides SAFE to CRITICAL before cloud. Store and forward if offline.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-metrics" aria-label="Coverage metrics">
        <div className="lp-container lp-metrics-grid">
          <div><strong>24</strong><span>Zones mapped</span></div>
          <div><strong>50cm</strong><span>Calibrated range</span></div>
          <div><strong>2s</strong><span>Poll interval</span></div>
          <div><strong>4</strong><span>Risk levels</span></div>
        </div>
        <div className="lp-metrics-note">Live municipal figures, refreshed every two seconds.</div>
      </section>

      <section className="lp-feature">
        <div className="lp-container lp-feature-grid">
          <div className="lp-feature-copy">
            <h2>Everything stays in <em>one surface.</em></h2>
            <p>FloodGuard keeps level, trend, forecast and logs close enough to use without turning the monitor into a dashboard crowd.</p>
          </div>
          <div className="lp-feature-media">
            <div className="lp-shot">
              <TelemetryMock />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-feature lp-feature-alt">
        <div className="lp-container lp-feature-grid">
          <div className="lp-feature-media">
            <div className="lp-shot">
              <MapMock />
            </div>
          </div>
          <div className="lp-feature-copy">
            <h2>Work with the map <em>beside the numbers.</em></h2>
            <p>See risk class, score and elevation while the water level updates. Click a zone on the map and the telemetry follows.</p>
            <button className="lp-btn lp-btn-ghost" onClick={onViewZones}>Browse zones <ArrowRight size={14} /></button>
          </div>
        </div>
      </section>

      <section className="lp-feature">
        <div className="lp-container lp-feature-grid">
          <div className="lp-feature-copy">
            <h2>Ship without <em>switching tabs.</em></h2>
            <p>Keep the path from reading to action inside the same workspace where you watch the drain. Logs stay searchable, CSV in one click.</p>
            <ul className="lp-mini-list">
              <li><Search size={13} /> Filter by device or risk in the ingestion log</li>
              <li><Droplets size={13} /> 0.1 cm resolution to 50 cm with headroom shown</li>
              <li><Layers size={13} /> Slope and geo risk baked per zone</li>
            </ul>
          </div>
          <div className="lp-feature-media">
            <div className="lp-shot">
              <LogsMock />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-open">
        <div className="lp-container lp-open-inner">
          <h2>Open source in spirit. Built in the open.</h2>
          <p>Read the flow, follow changes and shape a focused monitor for monsoon work. The palette stays monochrome so red means act.</p>
          <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onEnterDashboard}>Open dashboard <ArrowRight size={16} /></button>
          <div className="lp-open-note">Available for field teams and control rooms. Data stays local when you need it to.</div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-container lp-cta-inner">
          <h2>One quiet monitor for a <em>loud monsoon.</em></h2>
          <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onEnterDashboard}>Open dashboard <ArrowRight size={16} /></button>
          <p>Available on desktop. Two minute setup with your existing fleet.</p>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <span className="lp-brand-mark"><ShieldAlert size={14} /></span>
            <strong>FloodGuard</strong>
            <p>A lightweight monitor for Nagpur. Built for NMC field teams. Data stays local. Red means act.</p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="#" onClick={e => { e.preventDefault(); onEnterDashboard(); }}>Live telemetry</a>
            <a href="#" onClick={e => { e.preventDefault(); onViewZones(); }}>Zones</a>
            <a href="#" onClick={e => { e.preventDefault(); onEnterDashboard(); }}>Map</a>
          </div>
          <div>
            <h4>Field</h4>
            <a href="#field">Sensor</a>
            <a href="#principles">System</a>
            <a href="#coverage">Coverage</a>
          </div>
          <div>
            <h4>Reach</h4>
            <a href="https://github.com" target="_blank" rel="noreferrer">View source <ExternalLink size={12} style={{ display: 'inline', marginLeft: 4 }} /></a>
            <a href="#" onClick={e => { e.preventDefault(); onEnterDashboard(); }}>Open dashboard</a>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>FloodGuard Nagpur. IoT Drainage Telemetry.</span>
          <span>Built for concrete, rain and dust.</span>
        </div>
      </footer>
    </div>
  );
}
