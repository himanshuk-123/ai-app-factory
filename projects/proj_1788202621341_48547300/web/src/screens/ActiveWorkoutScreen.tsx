import React, { useState } from 'react';
import { ViewState } from '../types';

export const ActiveWorkoutScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  return (
    <div className="card">
      <div className="card-title">{"Active Workout Logger"}</div>
      <p className="card-desc">{"High-contrast, low-friction interface for real-time set tracking, rest timer orchestration, and auto-regulated weight/rep dynamic adjustments."}</p>

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
          ⏳ {"Minimal translucent loading overlay with text 'Preparing dynamic session adjustments...'"}
        </div>
      )}

      {viewState === 'EMPTY' && (
        <div className="state-banner empty">
          📭 {"Empty exercise log placeholder with prompt 'No exercises in this session. Tap + to add an exercise.'"}
        </div>
      )}

      {viewState === 'ERROR' && (
        <div className="state-banner error">
          ⚠️ {"Inline notification badge 'Timer sound muted due to silent mode. Rest timer visible on screen.'"}
        </div>
      )}

      {viewState === 'SUCCESS' && (
        <div className="state-banner success">
          ✅ {"Full-screen celebration modal with confetti effect, total volume summary, and 'Workout Saved' badge."}
        </div>
      )}

      {/* Normal Main UI */}
      {viewState === 'NORMAL' && (
        <div>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>🎯 User Goal</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Effortlessly log sets, reps, and RPE during a workout while adhering to automated rest timing and load adjustments."}</p>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>📐 Layout Architecture</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Top fixed bar (timer, workout progress bar, finish button) + Scrollable stack of exercise log cards with interactive set rows + Bottom fixed rest timer controller strip."}</p>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-main)' }}>UI Components:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {["Workout Timer Header Bar","Exercise Navigation Card Stack","Set Row Matrix (Previous weight/reps, Target weight/reps, Actual Input, RPE selector, Checkbox)","AI Load Adjustment Chip","Floating Rest Countdown Timer Bar","Exercise Swap Dropdown Menu"].map((comp, idx) => (
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
