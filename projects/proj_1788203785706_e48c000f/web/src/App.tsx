import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeScreen } from './screens/HomeScreen';
import { StylistProfileScreen } from './screens/StylistProfileScreen';
import { BookingPickerScreen } from './screens/BookingPickerScreen';
import { DigitalReceiptScreen } from './screens/DigitalReceiptScreen';
import { ClientVaultScreen } from './screens/ClientVaultScreen';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<string>('screen_home');

  const navItems = [
    { id: 'screen_home', label: "Salon Showcase & Menu Screen" },
    { id: 'screen_stylist_profile', label: "Master Stylist Showcase Screen" },
    { id: 'screen_booking_picker', label: "Precision Slot & Concierge Screen" },
    { id: 'screen_digital_receipt', label: "Luxury Confirmation Receipt Screen" },
    { id: 'screen_client_vault', label: "Concierge Client Vault Screen" }
  ];

  const screensMap: Record<string, React.ReactNode> = {
    'screen_home': <HomeScreen />,
  'screen_stylist_profile': <StylistProfileScreen />,
  'screen_booking_picker': <BookingPickerScreen />,
  'screen_digital_receipt': <DigitalReceiptScreen />,
  'screen_client_vault': <ClientVaultScreen />
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
