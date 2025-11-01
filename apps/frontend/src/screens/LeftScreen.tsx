import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import NewsCard from '../components/NewsCard';

const LeftScreen = () => {
  const newsData = [
    {
      id: 1,
      title: "Progressive Policies Gain Momentum in Congress",
      summary: "Democratic lawmakers are pushing forward with ambitious social programs including healthcare expansion and climate initiatives. The proposals aim to address income inequality and environmental concerns.",
      image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop",
      sources: ["CNN", "MSNBC", "The New York Times"],
      comments: 32,
      viewpoint: "left"
    },
    {
      id: 2,
      title: "Climate Action Plan Receives Broad Support",
      summary: "Environmental groups and progressive lawmakers are celebrating the passage of new climate legislation that includes significant investments in renewable energy and green infrastructure.",
      image: "https://images.unsplash.com/photo-1569163139394-de446b2a1c0e?w=400&h=300&fit=crop",
      sources: ["The Guardian", "Vox", "Mother Jones"],
      comments: 28,
      viewpoint: "left"
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Left View</Text>
        <Text style={styles.headerSubtitle}>Left's perspective on current events</Text>
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
    color: '#007bff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default LeftScreen;