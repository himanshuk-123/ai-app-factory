import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../theme';
import { ViewState } from '../types';

export const DashboardScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  const states: ViewState[] = ['NORMAL', 'LOADING', 'EMPTY', 'ERROR', 'SUCCESS'];

  return (
    <ScrollView style={styles.card}>
      <Text style={styles.cardTitle}>{"Home Dashboard Screen"}</Text>
      <Text style={styles.cardDesc}>{"Serve as daily command center for meal planning, swipe/budget balancing, and rapid launch into cooking timers."}</Text>

      {/* UX State Selector */}
      <Text style={styles.sectionLabel}>Test UX States:</Text>
      <View style={styles.stateRow}>
        {states.map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.stateBtn, viewState === st && styles.stateBtnActive]}
            onPress={() => setViewState(st)}
          >
            <Text style={[styles.stateBtnText, viewState === st && styles.stateBtnTextActive]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* UX State View Outputs */}
      {viewState === 'LOADING' && (
        <View style={[styles.stateBanner, styles.loadingBanner]}>
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.loadingText}>⏳ {"Pulsing skeleton layout for balance summary and horizontal recipe cards."}</Text>
        </View>
      )}

      {viewState === 'EMPTY' && (
        <View style={[styles.stateBanner, styles.emptyBanner]}>
          <Text style={styles.emptyText}>📭 {"Card stating 'No meals planned for today' with a button 'Generate Quick Meal Plan'."}</Text>
        </View>
      )}

      {viewState === 'ERROR' && (
        <View style={[styles.stateBanner, styles.errorBanner]}>
          <Text style={styles.errorText}>⚠️ {"Toast alert at top: 'Could not update meal swipes. Tap to retry connection.'"}</Text>
        </View>
      )}

      {viewState === 'SUCCESS' && (
        <View style={[styles.stateBanner, styles.successBanner]}>
          <Text style={styles.successText}>✅ {"Badge animation on swipe counter when logged; recipe cards highlight recommended badge."}</Text>
        </View>
      )}

      {/* Normal Main Screen Content */}
      {viewState === 'NORMAL' && (
        <View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🎯 User Goal</Text>
            <Text style={styles.infoContent}>{"Instantly see what I can cook right now based on my ingredients, swipes left, and available appliances."}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📐 Layout Architecture</Text>
            <Text style={styles.infoContent}>{"Top status bar with swipe/budget counter -> Horizontal scrolling 'Quick Eats' launchpad -> Vertical scrollable daily meal schedule feed -> Bottom tab navigation."}</Text>
          </View>

          <Text style={styles.sectionLabel}>UI Components:</Text>
          <View style={styles.badgeContainer}>
            {["Meal Swipe & Budget Balance Card","Appliance Quick-Filter Chips","Under-10-Min Recipe Carousel","Daily Meal Plan Timeline","Quick Start Timer Floating Action Button"].map((comp, idx) => (
              <View key={idx} style={styles.compBadge}>
                <Text style={styles.compBadgeText}>🧩 {comp}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setViewState('SUCCESS')}>
            <Text style={styles.actionBtnText}>Execute Screen Action</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textMain,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  stateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  stateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.bgMain,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  stateBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stateBtnText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  stateBtnTextActive: {
    color: '#0f172a',
    fontWeight: 'bold',
  },
  stateBanner: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  loadingText: {
    color: Colors.primary,
    fontSize: 13,
  },
  emptyBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: Colors.warning,
    borderWidth: 1,
  },
  emptyText: {
    color: Colors.warning,
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: Colors.danger,
    borderWidth: 1,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.accent,
    borderWidth: 1,
  },
  successText: {
    color: Colors.accent,
    fontSize: 13,
  },
  infoBox: {
    backgroundColor: Colors.bgMain,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: Spacing.md,
  },
  infoTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoContent: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  compBadge: {
    backgroundColor: Colors.bgCardHover,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  compBadgeText: {
    color: Colors.textMain,
    fontSize: 12,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  actionBtnText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
