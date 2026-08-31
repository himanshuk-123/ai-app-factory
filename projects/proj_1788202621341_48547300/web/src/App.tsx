import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardScreen } from './screens/DashboardScreen';
import { ActiveWorkoutScreen } from './screens/ActiveWorkoutScreen';
import { RoutineBuilderScreen } from './screens/RoutineBuilderScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<string>('screen_dashboard');

  const navItems = [
    { id: 'screen_dashboard', label: "Today & Readiness Dashboard" },
    { id: 'screen_active_workout', label: "Active Workout Logger" },
    { id: 'screen_routine_builder', label: "Routine & Equipment Configurator" },
    { id: 'screen_analytics', label: "Progress & Analytics" }
  ];

  const screensMap: Record<string, React.ReactNode> = {
    'screen_dashboard': <DashboardScreen />,
  'screen_active_workout': <ActiveWorkoutScreen />,
  'screen_routine_builder': <RoutineBuilderScreen />,
  'screen_analytics': <AnalyticsScreen />
  };

  return (
    <div className="app-container">
      <Header
        appName="ForgeFit AI"
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
        <p>AI App Factory Generated Project • ForgeFit AI • React + TypeScript + Vite</p>
      </footer>
    </div>
  );
};

export default App;
