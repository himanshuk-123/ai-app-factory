import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../theme';
import { ViewState } from '../types';

export const LoungeHomeScreen: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('NORMAL');

  const states: ViewState[] = ['NORMAL', 'LOADING', 'EMPTY', 'ERROR', 'SUCCESS'];

  return (
    <ScrollView style={styles.card}>
      <Text style={styles.cardTitle}>{"Lounge Showcase Screen"}</Text>
      <Text style={styles.cardDesc}>{"Presents the high-end salon's brand story, active master stylists, and featured grooming packages in an immersive dark-mode luxury interface."}</Text>

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
          <Text style={styles.loadingText}>⏳ {"Dark-mode shimmering skeleton loaders matching card aspect ratios with subtle gold shimmer effect."}</Text>
        </View>
      )}

      {viewState === 'EMPTY' && (
        <View style={[styles.stateBanner, styles.emptyBanner]}>
          <Text style={styles.emptyText}>📭 {"Hero banner displays 'Welcome to CrownCut - Private Reservations Opening Shortly' with an email waitlist input."}</Text>
        </View>
      )}

      {viewState === 'ERROR' && (
        <View style={[styles.stateBanner, styles.errorBanner]}>
          <Text style={styles.errorText}>⚠️ {"Toast message: 'Unable to retrieve lounge updates. Pull down to refresh connection.'"}</Text>
        </View>
      )}

      {viewState === 'SUCCESS' && (
        <View style={[styles.stateBanner, styles.successBanner]}>
          <Text style={styles.successText}>✅ {"Subtle champagne badge indicating 'Live Availability Updated'."}</Text>
        </View>
      )}

      {/* Normal Main Screen Content with Real Interactive Feature Components */}
      {viewState === 'NORMAL' && (
        <View style={{ gap: 12 }}>
          {/* Main Hero Card */}
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: Colors.primary, textTransform: 'uppercase', marginBottom: 2 }}>
              Active Screen Goal
            </Text>
            <Text style={styles.infoTitle}>{"Explore signature salon aesthetics, review featured grooming experiences, and initiate an exclusive booking."}</Text>
            <Text style={styles.infoContent}>Structure: {"Top ambient video/hero banner + horizontally scrolling Master Stylist carousel + vertical list of Signature Grooming Packages + sticky bottom navigation bar"}</Text>
          </View>

          {/* Interactive UI Component Cards */}
          {["Hero Video Carousel with Salon Ambiance","Master Stylist Spotlight Cards","Signature Package Collection List","Active Booking Status Bar","Quick Reservation Floating CTA"].map((comp, idx) => {
            const compLower = comp.toLowerCase();
            const isAction = compLower.includes('button') || compLower.includes('cta') || compLower.includes('action');
            const isChart = compLower.includes('chart') || compLower.includes('analytics') || compLower.includes('heatmap') || compLower.includes('streak');
            const isMetric = compLower.includes('card') || compLower.includes('hero') || compLower.includes('score') || compLower.includes('gauge');

            return (
              <View key={idx} style={[styles.infoBox, { backgroundColor: Colors.bgCard }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.textMain, flex: 1 }}>{comp}</Text>
                  <View style={styles.compBadge}>
                    <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: 'bold' }}>Active</Text>
                  </View>
                </View>

                {isChart ? (
                  <View style={{ marginVertical: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 4 }}>
                      {[40, 65, 30, 85, 95, 60, 75].map((h, i) => (
                        <View key={i} style={{ flex: 1, backgroundColor: i === 4 ? Colors.primary : Colors.bgCardHover, height: `${h}%`, borderRadius: 2 }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>7-Day Trend Analysis</Text>
                  </View>
                ) : isMetric ? (
                  <View style={{ marginVertical: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.primary }}>
                      {idx % 2 === 0 ? 'Optimal (92/100)' : '4 Active Items'}
                    </Text>
                    <View style={{ width: '100%', height: 4, backgroundColor: Colors.bgCardHover, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <View style={{ width: idx % 2 === 0 ? '92%' : '65%', height: '100%', backgroundColor: Colors.primary }} />
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginVertical: 4 }}>
                    Interactive mobile component offering real-time touch interaction and status updates.
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isAction ? Colors.primary : Colors.bgCardHover, marginTop: 8 }]}
                  onPress={() => setViewState('SUCCESS')}
                >
                  <Text style={[styles.actionBtnText, { color: isAction ? '#0f172a' : Colors.textMain }]}>
                    {isAction ? `⚡ ${comp}` : 'View Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
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
