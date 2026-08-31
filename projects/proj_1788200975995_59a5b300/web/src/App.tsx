import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { RecipeDetailScreen } from './screens/RecipeDetailScreen';
import { CookingTimerScreen } from './screens/CookingTimerScreen';
import { GroceryListScreen } from './screens/GroceryListScreen';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<string>('screen_onboarding');

  const navItems = [
    { id: 'screen_onboarding', label: "Appliance & Profile Setup Screen" },
    { id: 'screen_dashboard', label: "Home Dashboard Screen" },
    { id: 'screen_recipe_detail', label: "Recipe Detail & Prep Screen" },
    { id: 'screen_cooking_timer', label: "Guided Appliance Cooking Mode Screen" },
    { id: 'screen_grocery_list', label: "Smart Mini-Fridge Grocery Screen" }
  ];

  const screensMap: Record<string, React.ReactNode> = {
    'screen_onboarding': <OnboardingScreen />,
  'screen_dashboard': <DashboardScreen />,
  'screen_recipe_detail': <RecipeDetailScreen />,
  'screen_cooking_timer': <CookingTimerScreen />,
  'screen_grocery_list': <GroceryListScreen />
  };

  return (
    <div className="app-container">
      <Header
        appName="QuickBite: Dorm Eats & Timers"
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
        <p>AI App Factory Generated Project • QuickBite: Dorm Eats & Timers • React + TypeScript + Vite</p>
      </footer>
    </div>
  );
};

export default App;
