import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'videos' | 'newspaper';

interface TopNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function TopNavigation({ activeTab, onTabChange }: TopNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('videos')}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabIcon,
                activeTab === 'videos' ? styles.activeIcon : styles.inactiveIcon,
              ]}
            >
              📹
            </Text>
            <Text
              style={[
                styles.tabText,
                { marginLeft: 6 },
                activeTab === 'videos' ? styles.activeTabText : styles.inactiveTabText,
              ]}
            >
              Videos
            </Text>
          </View>
          {activeTab === 'videos' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('newspaper')}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabIcon,
                activeTab === 'newspaper' ? styles.activeIcon : styles.inactiveIcon,
              ]}
            >
              📰
            </Text>
            <Text
              style={[
                styles.tabText,
                { marginLeft: 6 },
                activeTab === 'newspaper' ? styles.activeTabText : styles.inactiveTabText,
              ]}
            >
              Newspaper
            </Text>
          </View>
          {activeTab === 'newspaper' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    zIndex: 1000,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 18,
  },
  activeIcon: {
    opacity: 1,
  },
  inactiveIcon: {
    opacity: 0.6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  inactiveTabText: {
    color: '#8e8e93',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
    width: '60%',
    alignSelf: 'center',
  },
});

