import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Tab = 'videos' | 'newspaper';
interface TopNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function TopNavigation({ activeTab, onTabChange }: TopNavigationProps) {
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.tab} onPress={() => onTabChange('videos')} activeOpacity={0.7}>
          <View style={styles.tabContent}>
            <Text style={[styles.tabIcon, activeTab === 'videos' ? styles.activeIcon : styles.inactiveIcon]}>📹</Text>
            <Text style={[styles.tabText, { marginLeft: 6 }, activeTab === 'videos' ? styles.activeTabText : styles.inactiveTabText]}>
              Videos
            </Text>
          </View>
          {activeTab === 'videos' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => onTabChange('newspaper')} activeOpacity={0.7}>
          <View style={styles.tabContent}>
            <Text style={[styles.tabIcon, activeTab === 'newspaper' ? styles.activeIcon : styles.inactiveIcon]}>📰</Text>
            <Text style={[styles.tabText, { marginLeft: 6 }, activeTab === 'newspaper' ? styles.activeTabText : styles.inactiveTabText]}>
              Newspaper
            </Text>
          </View>
          {activeTab === 'newspaper' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ROW_H = 29; // 3/5 of original 48

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  navBar: {
    height: ROW_H, // fixed row height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'transparent', // no second tint layer
  },
  tab: {
    flex: 1,
    height: '100%',             // so underline is measured inside the bar
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    position: 'relative',
  },
  tabContent: { flexDirection: 'row', alignItems: 'center' },

  tabIcon: {
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeIcon: { opacity: 1 },
  inactiveIcon: { opacity: 0.85 },

  tabText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    textShadowColor: 'rgba(0,0,0,0.45)',  // helps on bright photos
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeTabText: { color: '#fff', fontWeight: '700' },
  inactiveTabText: { color: '#d0d0d0' },

  activeIndicator: {
    position: 'absolute',
    bottom: 0,                  // at the very bottom of the navbar, touching the image
    height: 2,
    width: '60%',
    backgroundColor: '#fff',
    borderRadius: 0,
    alignSelf: 'center',
  },
});