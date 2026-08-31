import React, { useState } from 'react';
import { ViewState } from '../types';

export const OnboardingScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  return (
    <div className="card">
      <div className="card-title">{"Appliance & Profile Setup Screen"}</div>
      <p className="card-desc">{"Capture user's available dorm cooking appliances, weekly grocery budget, and dining hall meal swipe quota to personalize recipe recommendations."}</p>

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
          ⏳ {"Skeleton shimmer boxes replacing appliance grid cards and balance inputs while loading user defaults."}
        </div>
      )}

      {viewState === 'EMPTY' && (
        <div className="state-banner empty">
          📭 {"Default state shows pre-selected standard microwave and mini-fridge options with $40 budget."}
        </div>
      )}

      {viewState === 'ERROR' && (
        <div className="state-banner error">
          ⚠️ {"Inline validation banner 'Please select at least one cooking appliance' if all are deselected on submit."}
        </div>
      )}

      {viewState === 'SUCCESS' && (
        <div className="state-banner success">
          ✅ {"Confetti micro-animation with green check toast 'Profile Saved! Customizing your meal plan...'"}
        </div>
      )}

      {/* Normal Main UI */}
      {viewState === 'NORMAL' && (
        <div>
          <div className="grid-2" style={{ marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>🎯 User Goal</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Set up profile quickly to get tailored dorm-safe recipes and budget tracking without manual filtering."}</p>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--accent)', marginBottom: '8px' }}>📐 Layout Architecture</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{"Single-column scrollable form with multi-select appliance toggle grid, slider for budget, numeric stepper for meal swipes, and fixed bottom CTA button bar."}</p>
            </div>
          </div>

          <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-main)' }}>UI Components:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {["Progress Header Stepper","Appliance Selection Toggle Grid","Weekly Budget Range Slider","Meal Swipe Counter Input","Dorm Constraints Helper Callout","Primary CTA Button (Save & Continue)"].map((comp, idx) => (
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
