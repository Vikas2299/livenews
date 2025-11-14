import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import TopNavigation from './src/components/TopNavigation';
import VideosScreen from './src/screens/VideosScreen';
import NewspaperScreenOld from './src/screens/NewspaperScreen';

type Tab = 'videos' | 'newspaper';
const NAV_HEIGHT = 29; // 3/5 of original 48

function Root() {
  const [activeTab, setActiveTab] = useState<Tab>('newspaper');
  const insets = useSafeAreaInsets();

  const overlayH = insets.top + NAV_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Transparent status bar so content can sit behind it */}
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Content renders behind the nav */}
      <View style={styles.content}>
        {activeTab === 'videos' ? <VideosScreen /> : <NewspaperScreenOld />}
      </View>

      {/* Single translucent overlay that handles the safe area */}
      <View
        style={[styles.navOverlay, { paddingTop: insets.top, height: overlayH }]}
        pointerEvents="box-none"
      >
        <View style={styles.navInner} pointerEvents="auto">
          <TopNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content:   { flex: 1 },

  navOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.30)', // the ONLY tint layer
    zIndex: 10,
    elevation: 10,
  },
  navInner: {
    height: NAV_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden', // keeps underline inside the bar
  },
});