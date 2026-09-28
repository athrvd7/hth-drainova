import React from 'react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { LineChart as ChartIcon, Activity } from 'lucide-react';

export default function TelemetryCharts({ history }) {
  // Format history for charts (reverse so chronological order goes left to right)
  const chartData = (history || []).slice().reverse().map((item, idx) => ({
    time: item.observed_at ? new Date(item.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${idx}`,
    waterLevel: Number(item.water_level_cm || 0),
    probability: Math.round(Number(item.flood_probability || 0) * 100),
    trend: Number(item.water_trend_cm_per_hour || 0),
    risk: item.risk_level || 'SAFE'
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip" style={{
          background: 'var(--bg-surface-glass)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          boxShadow: 'var(--shadow-card)',
          fontSize: '0.8rem'
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
          <div style={{ color: 'var(--accent)', fontWeight: 700 }}>
            Water Level: {data.waterLevel.toFixed(1)} cm
          </div>
          <div style={{ color: 'var(--color-purple)', fontWeight: 700 }}>
            Flood Risk: {data.probability}% ({data.risk})
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Trend: {data.trend > 0 ? `+${data.trend}` : data.trend} cm/h
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card telemetry-charts" style={{ padding: '24px' }}>
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChartIcon size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Real-Time Water Level &amp; Risk Trends</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {chartData.length} Telemetry Records
        </span>
      </div>

      {chartData.length === 0 ? (
        <div style={{
          height: '280px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          gap: '12px'
        }}>
          <Activity size={32} />
          <span>Awaiting sensor telemetry stream...</span>
        </div>
      ) : (
        <div className="telemetry-chart-canvas" style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--status-critical)" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="var(--status-critical)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>} 
              />
              <Area 
                type="monotone" 
                dataKey="waterLevel" 
                name="Water Level (cm)" 
                stroke="var(--accent)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorWater)" 
              />
              <Line 
                type="monotone" 
                dataKey="probability" 
                name="Flood Risk (%)" 
                stroke="var(--status-critical)" 
                strokeWidth={2}
                dot={false} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
