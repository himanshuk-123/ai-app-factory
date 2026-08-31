import React, { useState } from 'react';
import { ViewState } from '../types';

export const AnalyticsScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  return (
    <div className="card">
      <div className="card-title">{"Progress & Analytics"}</div>
      <p className="card-desc">{"Presents deep visual analytical feedback on long-term strength progression, calculated 1RM estimations, training volume, and muscle group symmetry."}</p>

      {/* UX State Simulation Controls */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '8px' }}>Test UX States:</span>
        <div className="state-controls" style={{ display: 'inline-flex' }}>
          {(['NORMAL', 'LOADING', 'EMPTY', 'ERROR', 'SUCCESS'] as ViewState[]).map((st) => (
            <button
              key={st}
              className={`state-btn ${viewState === st ? 'active' : ''}`}
              onClick={() => setViewState(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* UX State Displays */}
      {viewState === 'LOADING' && (
        <div className="state-banner loading">
          ⏳ {"Animated chart path skeleton placeholders and pulse effects on summary metrics cards."}
        </div>
      )}

      {viewState === 'EMPTY' && (
        <div className="state-banner empty">
          📭 {"Card overlay with message 'Complete at least 3 workouts to reveal auto-calculated 1RM progression charts.'"}
        </div>
      )}

      {viewState === 'ERROR' && (
        <div className="state-banner error">
          ⚠️ {"Inline error banner 'Failed to refresh chart data. Tap to reload.'"}
        </div>
      )}

      {viewState === 'SUCCESS' && (
        <div className="state-banner success">
          ✅ {"Gold badge overlay highlight 'New Personal Record Detected: Bench Press +10 lbs!'"}
        </div>
      )}

      {/* Normal Main UI */}
      {viewState === 'NORMAL' && (
        <div>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>🎯 User Goal</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Analyze personal records, spot strength imbalances, and verify progressive overload progress over time."}</p>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>📐 Layout Architecture</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Top filter controls (Timeframe & Metric switchers) + Vertical scrollable analytical card feed (1RM Trend Chart, Total Volume Stacked Bar, Muscle Balance Radar Chart, PR Milestone History)."}</p>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-main)' }}>UI Components:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {["Timeframe Segmented Control (1M, 3M, 6M, 1Y, ALL)","Exercise Selector Dropdown","Interactive 1RM Line Chart","Volume Progression Chart","Muscle Balance Radar Graph","Personal Record (PR) Milestone Feed"].map((comp, idx) => (
              <span
                key={idx}
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-color)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                }}
              >
                🧩 {comp}
              </span>
            ))}
          </div>

          <button className="btn btn-primary" onClick={() => setViewState('SUCCESS')}>
            Execute Primary Action
          </button>
        </div>
      )}
    </div>
  );
};
