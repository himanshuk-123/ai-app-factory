import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../theme';

interface HeaderProps {
  appName: string;
  tagline: string;
}

export const Header: React.FC<HeaderProps> = ({ appName, tagline }) => {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{appName}</Text>
        <Text style={styles.subtitle}>{tagline}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>● Mobile Expo</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Colors.accent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
});
