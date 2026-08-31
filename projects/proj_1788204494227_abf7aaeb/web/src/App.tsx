import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LoungeHomeScreen } from './screens/LoungeHomeScreen';
import { StylistPortfolioScreen } from './screens/StylistPortfolioScreen';
import { ServiceConciergeScreen } from './screens/ServiceConciergeScreen';
import { SlotPickerScreen } from './screens/SlotPickerScreen';
import { VipReceiptScreen } from './screens/VipReceiptScreen';
import { BarberDashboardScreen } from './screens/BarberDashboardScreen';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<string>('screen_lounge_home');

  const navItems = [
    { id: 'screen_lounge_home', label: "Lounge Showcase Screen" },
    { id: 'screen_stylist_portfolio', label: "Master Stylist Profile Screen" },
    { id: 'screen_service_concierge', label: "Service Menu & Concierge Preferences Screen" },
    { id: 'screen_slot_picker', label: "Schedule & Time Slot Selector Screen" },
    { id: 'screen_vip_receipt', label: "VIP Digital Receipt & Pass Screen" },
    { id: 'screen_barber_dashboard', label: "Stylist Schedule & Client Intel Screen" }
  ];

  const screensMap: Record<string, React.ReactNode> = {
    'screen_lounge_home': <LoungeHomeScreen />,
  'screen_stylist_portfolio': <StylistPortfolioScreen />,
  'screen_service_concierge': <ServiceConciergeScreen />,
  'screen_slot_picker': <SlotPickerScreen />,
  'screen_vip_receipt': <VipReceiptScreen />,
  'screen_barber_dashboard': <BarberDashboardScreen />
  };

  return (
    <div className="app-container">
      <Header
        appName="CrownCut"
        tagline="AI Generated React Application"
      />

      <Navigation
        items={navItems}
        activeId={activeScreen}
        onSelect={(id) => setActiveScreen(id)}
      />

      <main>
        {screensMap[activeScreen] || <div>Screen not found.</div>}
      </main>

      <footer className="footer">
        <p>AI App Factory Generated Project • CrownCut • React + TypeScript + Vite</p>
      </footer>
    </div>
  );
};

export default App;
