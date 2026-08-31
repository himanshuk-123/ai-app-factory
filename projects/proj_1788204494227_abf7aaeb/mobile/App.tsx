import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text } from 'react-native';
import { Header } from './src/components/Header';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors, Spacing } from './src/theme';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgMain} />
      <View style={styles.container}>
        <Header appName="CrownCut" tagline="AI Generated React Native Expo Application" />
        <AppNavigator />
        <View style={styles.footer}>
          <Text style={styles.footerText}>AI App Factory • React Native + Expo • CrownCut</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgMain,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    padding: Spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderColor,
    marginTop: Spacing.xs,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
