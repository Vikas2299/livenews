import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import NewsCard from '../components/NewsCard';

const ConservativeScreen = () => {
  const newsData = [
    {
      id: 1,
      title: "Traditional Values Movement Gains Support",
      summary: "Conservative activists are seeing increased engagement in their efforts to promote traditional family values and constitutional principles. The movement emphasizes limited government and individual responsibility.",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
      sources: ["National Review", "The Heritage Foundation", "The Federalist"],
      comments: 19,
      viewpoint: "conservative"
    },
    {
      id: 2,
      title: "Free Market Solutions Address Economic Challenges",
      summary: "Conservative economists are advocating for market-based solutions to address current economic challenges, emphasizing the importance of entrepreneurship and private sector innovation.",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
      sources: ["Wall Street Journal", "The American Enterprise Institute", "Reason Magazine"],
      comments: 14,
      viewpoint: "conservative"
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conservative View</Text>
        <Text style={styles.headerSubtitle}>Traditional perspective on current events</Text>
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

export default ConservativeScreen;