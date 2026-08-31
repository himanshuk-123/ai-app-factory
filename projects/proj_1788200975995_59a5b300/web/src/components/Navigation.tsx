import React from 'react';

interface NavItem {
  id: string;
  label: string;
}

interface NavigationProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ items, activeId, onSelect }) => {
  return (
    <nav className="nav-bar">
      {items.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeId === item.id ? 'active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
};
