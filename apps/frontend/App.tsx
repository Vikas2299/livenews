import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TopNavigation from './src/components/TopNavigation';
import VideosScreen from './src/screens/VideosScreen';
import NewspaperScreen from './src/screens/NewspaperScreen';

type Tab = 'videos' | 'newspaper';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('newspaper');

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <TopNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <View style={styles.content}>
          {activeTab === 'videos' ? <VideosScreen /> : <NewspaperScreen />}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
});