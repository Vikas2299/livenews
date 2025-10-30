import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import NewsCard from '../components/NewsCard';

const RepublicanScreen = () => {
  const newsData = [
    {
      id: 1,
      title: "Conservative Leaders Rally Behind New Economic Plan",
      summary: "Republican lawmakers are uniting behind a comprehensive economic strategy that focuses on tax cuts and deregulation. The plan aims to stimulate business growth and create jobs across the country.",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
      sources: ["Fox News", "The Daily Wire", "Breitbart"],
      comments: 18,
      viewpoint: "republican"
    },
    {
      id: 2,
      title: "Border Security Measures Show Positive Results",
      summary: "New border enforcement policies have led to a significant reduction in illegal crossings, according to recent data. Administration officials credit the multi-layered approach for the success.",
      image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400&h=300&fit=crop",
      sources: ["Fox News", "The Federalist", "Washington Examiner"],
      comments: 25,
      viewpoint: "republican"
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Republican View</Text>
        <Text style={styles.headerSubtitle}>Conservative perspective on current events</Text>
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
    color: '#dc3545',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default RepublicanScreen;