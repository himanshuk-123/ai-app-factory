import React, { useState } from 'react';
import { ViewState } from '../types';

export const RoutineBuilderScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  return (
    <div className="card">
      <div className="card-title">{"Routine & Equipment Configurator"}</div>
      <p className="card-desc">{"Enables users to design custom workout splits, auto-generate AI routines, and filter exercises dynamically by available equipment."}</p>

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
          ⏳ {"Grid skeleton pulses for exercise cards and loading spinner inside equipment filter list."}
        </div>
      )}

      {viewState === 'EMPTY' && (
        <div className="state-banner empty">
          📭 {"Illustration showing empty gym bag with text 'No routines match selected equipment filter. Adjust filters or generate with AI.'"}
        </div>
      )}

      {viewState === 'ERROR' && (
        <div className="state-banner error">
          ⚠️ {"Alert dialog 'Unable to save routine offline changes. Retry when connected.'"}
        </div>
      )}

      {viewState === 'SUCCESS' && (
        <div className="state-banner success">
          ✅ {"Toast popup 'Routine Upper Body Hypertrophy updated and set as active routine!'"}
        </div>
      )}

      {/* Normal Main UI */}
      {viewState === 'NORMAL' && (
        <div>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>🎯 User Goal</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Create or modify workout routines that align with target muscle groups and available gym equipment."}</p>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>📐 Layout Architecture</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Top sticky equipment filter pill carousel + Workout split tab strip (e.g., Day 1: Push, Day 2: Pull) + Reorderable exercise vertical list + Sticky bottom CTA bar."}</p>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-main)' }}>UI Components:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {["Equipment Filter Pill Selector","Split Tab Navigator","Reorderable Exercise Drag-Cards","AI Routine Auto-Generator Toggle","Add/Swap Exercise Button Modal Trigger","Target Muscle Split Distribution Meter"].map((comp, idx) => (
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
