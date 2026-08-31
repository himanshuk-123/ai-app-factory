import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing } from '../theme';
import { LoungeHomeScreen } from '../screens/LoungeHomeScreen';
import { StylistPortfolioScreen } from '../screens/StylistPortfolioScreen';
import { ServiceConciergeScreen } from '../screens/ServiceConciergeScreen';
import { SlotPickerScreen } from '../screens/SlotPickerScreen';
import { VipReceiptScreen } from '../screens/VipReceiptScreen';
import { BarberDashboardScreen } from '../screens/BarberDashboardScreen';

export const AppNavigator: React.FC = () => {
  const tabs = [
    { id: 'screen_lounge_home', label: "Lounge Showcase Screen", component: LoungeHomeScreen },
    { id: 'screen_stylist_portfolio', label: "Master Stylist Profile Screen", component: StylistPortfolioScreen },
    { id: 'screen_service_concierge', label: "Service Menu & Concierge Preferences Screen", component: ServiceConciergeScreen },
    { id: 'screen_slot_picker', label: "Schedule & Time Slot Selector Screen", component: SlotPickerScreen },
    { id: 'screen_vip_receipt', label: "VIP Digital Receipt & Pass Screen", component: VipReceiptScreen },
    { id: 'screen_barber_dashboard', label: "Stylist Schedule & Client Intel Screen", component: BarberDashboardScreen }
  ];

  const [activeTabId, setActiveTabId] = useState<string>('screen_lounge_home');

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
