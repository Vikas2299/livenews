import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import NewsCard from '../components/NewsCard';

const GeneralScreen = () => {
  const newsData = [
    {
      id: 1,
      title: "Breaking: Major Policy Announcement Expected Today",
      summary: "The White House is expected to make a significant policy announcement that could impact millions of Americans. Sources close to the administration suggest this could be related to healthcare or economic policy.",
      image: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop",
      sources: ["CNN", "Fox News", "NPR", "Reuters"],
      comments: 23,
      viewpoint: "general"
    },
    {
      id: 2,
      title: "Economic Indicators Show Mixed Signals",
      summary: "Latest economic data reveals conflicting trends with unemployment dropping while inflation concerns persist. Economists are divided on the implications for the Federal Reserve's next moves.",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
      sources: ["Bloomberg", "Wall Street Journal", "CNBC"],
      comments: 15,
      viewpoint: "general"
    },
    {
      id: 3,
      title: "Climate Summit Reaches New Agreement",
      summary: "International climate talks have resulted in a new framework agreement, though critics argue it doesn't go far enough to address the urgency of climate change.",
      image: "https://images.unsplash.com/photo-1569163139394-de446b2a1c0e?w=400&h=300&fit=crop",
      sources: ["BBC", "The Guardian", "Associated Press"],
      comments: 31,
      viewpoint: "general"
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>General News</Text>
        <Text style={styles.headerSubtitle}>Balanced coverage from multiple sources</Text>
      </View>
      
      {newsData.map((news) => (
        <NewsCard key={news.id} news={news} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default GeneralScreen;