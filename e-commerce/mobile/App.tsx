import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RouterProvider } from './src/navigation/Router';
import { AppShell } from './src/navigation/AppShell';
import { AuthProvider } from './src/state/AuthContext';
import { CartProvider } from './src/state/CartContext';
import { FeedbackProvider } from './src/state/FeedbackContext';
import { SettingsProvider } from './src/state/SettingsContext';
import { WishlistProvider } from './src/state/WishlistContext';
import { colors } from './src/theme';

function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <FeedbackProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <RouterProvider>
                  <StatusBar barStyle="dark-content" />
                  <View style={styles.root}>
                    <AppShell />
                  </View>
                </RouterProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </FeedbackProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});

export default App;
