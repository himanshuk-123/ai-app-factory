import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing } from '../theme';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { CookingTimerScreen } from '../screens/CookingTimerScreen';
import { GroceryListScreen } from '../screens/GroceryListScreen';

export const AppNavigator: React.FC = () => {
  const tabs = [
    { id: 'screen_onboarding', label: "Appliance & Profile Setup Screen", component: OnboardingScreen },
    { id: 'screen_dashboard', label: "Home Dashboard Screen", component: DashboardScreen },
    { id: 'screen_recipe_detail', label: "Recipe Detail & Prep Screen", component: RecipeDetailScreen },
    { id: 'screen_cooking_timer', label: "Guided Appliance Cooking Mode Screen", component: CookingTimerScreen },
    { id: 'screen_grocery_list', label: "Smart Mini-Fridge Grocery Screen", component: GroceryListScreen }
  ];

  const [activeTabId, setActiveTabId] = useState<string>('screen_onboarding');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const ActiveComponent = activeTab.component;

  return (
    <View style={styles.container}>
      {/* Mobile Screen Tab Navigation Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.navTab, activeTabId === tab.id && styles.navTabActive]}
            onPress={() => setActiveTabId(tab.id)}
          >
            <Text style={[styles.navTabText, activeTabId === tab.id && styles.navTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Render Active Mobile Screen */}
      <View style={styles.contentContainer}>
        <ActiveComponent />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    maxHeight: 50,
    marginBottom: Spacing.sm,
  },
  navTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginRight: 8,
    justifyContent: 'center',
  },
  navTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  navTabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  navTabTextActive: {
    color: '#0f172a',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
});
