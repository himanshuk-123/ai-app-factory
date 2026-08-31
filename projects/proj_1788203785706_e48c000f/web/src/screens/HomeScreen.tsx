import React, { useState } from 'react';
import { ViewState } from '../types';

export const HomeScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  return (
    <div className="card">
      <div className="card-title">{"Salon Showcase & Menu Screen"}</div>
      <p className="card-desc">{"Primary landing screen highlighting salon ambiance, signature grooming treatments, master barber recommendations, and express rebooking shortcuts."}</p>

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
          ⏳ {"Dark obsidian shimmer placeholders over hero carousel, skeleton cards for stylist list and services"}
        </div>
      )}

      {viewState === 'EMPTY' && (
        <div className="state-banner empty">
          📭 {"Minimalist luxury text banner: 'No recent visits recorded. Select a Master Stylist below to begin your journey.'"}
        </div>
      )}

      {viewState === 'ERROR' && (
        <div className="state-banner error">
          ⚠️ {"Top slide-down alert banner: 'Unable to load live salon availability. Showing offline menu cache.' with a 'Refresh' button"}
        </div>
      )}

      {viewState === 'SUCCESS' && (
        <div className="state-banner success">
          ✅ {"Discreet top notification badge: 'VIP Membership Active: Complimentary Reserve Tasting Unlocked'"}
        </div>
      )}

      {/* Normal Main UI with Real Interactive Feature Components */}
      {viewState === 'NORMAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Hero Card */}
          <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', tracking: '0.05em', color: 'var(--primary)' }}>
                Active Goal & Plan
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>
                {"Explore luxury services, view available master barbers, and rapidly initiate a bespoke booking."}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Architecture: {"Sticky luxury header with VIP badge + Hero ambiance video carousel + Express rebook banner + Horizontal signature services menu + Master stylist spotlight + Sticky bottom navigation bar"}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>85%</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status Score</span>
            </div>
          </div>

          {/* Interactive Domain-Rich Feature Cards */}
          <div className="grid-2">
            {["Luxury Header Bar","Hero Ambiance Carousel","Express Rebook Card","Signature Service Menu Accordion","Master Stylist Horizontal Scroll","Concierge Quick-Assist Floating Pill"].map((comp, idx) => {
              const compLower = comp.toLowerCase();
              const isBooking = compLower.includes('booking') || compLower.includes('slot') || compLower.includes('calendar') || compLower.includes('schedule') || compLower.includes('time');
              const isService = compLower.includes('service') || compLower.includes('menu') || compLower.includes('haircut') || compLower.includes('price') || compLower.includes('package');
              const isSpecialist = compLower.includes('barber') || compLower.includes('stylist') || compLower.includes('staff') || compLower.includes('specialist') || compLower.includes('team');
              const isChart = compLower.includes('chart') || compLower.includes('analytics') || compLower.includes('heatmap') || compLower.includes('streak');
              const isMetric = compLower.includes('card') || compLower.includes('hero') || compLower.includes('score') || compLower.includes('gauge') || compLower.includes('status');

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '12px',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {comp}
                    </h4>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-card-hover)', color: 'var(--primary)', fontWeight: 600 }}>
                      Live Feature
                    </span>
                  </div>

                  {isService ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { title: 'Classic Haircut & Styling', price: '$35', time: '30 mins' },
                        { title: 'Beard Trim & Hot Towel Shave', price: '$25', time: '20 mins' },
                        { title: 'Executive Grooming Package', price: '$55', time: '50 mins' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{item.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ {item.time}</div>
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>{item.price}</div>
                        </div>
                      ))}
                    </div>
                  ) : isSpecialist ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { name: 'Alex Rivera', role: 'Master Barber', rating: '4.9 ★ (120 reviews)' },
                        { name: 'Marcus Chen', role: 'Fade & Styling Specialist', rating: '4.8 ★ (94 reviews)' },
                      ].map((barber, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0f172a' }}>
                            {barber.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{barber.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{barber.role} • {barber.rating}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isBooking ? (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Select Available Time Slot:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {['09:00 AM', '10:30 AM', '01:15 PM', '03:45 PM', '05:00 PM'].map((slot, i) => (
                          <span key={i} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', background: i === 1 ? 'var(--primary)' : 'var(--bg-card-hover)', color: i === 1 ? '#0f172a' : 'var(--text-main)', fontWeight: i === 1 ? 700 : 500, cursor: 'pointer' }}>
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : isChart ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '60px', marginTop: '8px', marginBottom: '8px' }}>
                        {[40, 65, 30, 85, 95, 60, 75].map((h, i) => (
                          <div key={i} style={{ flex: 1, background: i === 4 ? 'var(--primary)' : 'var(--bg-card-hover)', height: `${h}%`, borderRadius: '4px' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-Time Activity Trends</span>
                    </div>
                  ) : isMetric ? (
                    <div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', margin: '4px 0' }}>
                        {idx % 2 === 0 ? '98% Positive Feedback' : '$45 Average Ticket'}
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-card-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: idx % 2 === 0 ? '98%' : '75%', height: '100%', background: 'var(--primary)' }} />
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Interactive module with live state management and dynamic UI response.
                    </p>
                  )}

                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} onClick={() => setViewState('SUCCESS')}>
                    ⚡ Select & Continue
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
