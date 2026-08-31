import React from 'react';

interface HeaderProps {
  appName: string;
  tagline: string;
}

export const Header: React.FC<HeaderProps> = ({ appName, tagline }) => {
  return (
    <header className="header">
      <div>
        <h1 className="header-title">{appName}</h1>
        <p className="header-subtitle">{tagline}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--accent)', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--accent)' }}>
          ● Live App
        </span>
      </div>
    </header>
  );
};
