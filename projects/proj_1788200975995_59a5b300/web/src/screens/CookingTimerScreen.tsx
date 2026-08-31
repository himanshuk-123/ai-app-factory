import React, { useState } from 'react';
import { ViewState } from '../types';

export const CookingTimerScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  return (
    <div className="card">
      <div className="card-title">{"Guided Appliance Cooking Mode Screen"}</div>
      <p className="card-desc">{"Full-screen high-contrast cooking mode featuring multi-stage timers, appliance-specific alerts, and step-by-step guidance."}</p>

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
          ⏳ {"Immediate renders without external fetch using pre-loaded recipe steps from screen_recipe_detail."}
        </div>
      )}

      {viewState === 'EMPTY' && (
        <div className="state-banner empty">
          📭 {"N/A - Direct screen transition with populated state."}
        </div>
      )}

      {viewState === 'ERROR' && (
        <div className="state-banner error">
          ⚠️ {"System banner if wake-lock fails: 'Keep screen awake manual toggle enabled.'"}
        </div>
      )}

      {viewState === 'SUCCESS' && (
        <div className="state-banner success">
          ✅ {"Triumphant sound chime, full-screen green glow with text 'Bon Appétit! Meal Completed!'"}
        </div>
      )}

      {/* Normal Main UI */}
      {viewState === 'NORMAL' && (
        <div>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>🎯 User Goal</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Follow step-by-step cooking instructions with precise timers without screen turning off or food burning."}</p>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>📐 Layout Architecture</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Dark high-contrast mode header -> Large central circular countdown timer -> Current appliance instruction card -> Bottom step navigation controls (Pause, Next Step, Stir Alert)."}</p>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-main)' }}>UI Components:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {["Circular Arc Progress Timer Display","Wattage / Power Level Indicator","Current Step Instruction Text","Appliance Action Alert Callout (e.g., 'Stir Bowl Now')","Primary Timer Control Buttons (Pause/Play/Skip step)"].map((comp, idx) => (
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
