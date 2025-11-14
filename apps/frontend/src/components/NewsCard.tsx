import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  image: string;
  sources: string[];
  comments: number;
  viewpoint: string;
}

interface NewsCardProps {
  news: NewsItem;
}

const NewsCard = ({ news }: NewsCardProps) => {
  return (
    <View style={styles.card}>
      <Image source={{ uri: news.image }} style={styles.image} />
      
      <View style={styles.content}>
        <Text style={styles.title}>{news.title}</Text>
        <Text style={styles.summary}>{news.summary}</Text>
        
        <View style={styles.footer}>
          <TouchableOpacity style={styles.sourcesButton}>
            <Text style={styles.sourcesText}>
              Sources ({news.sources.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.commentsButton}>
            <Text style={styles.commentsText}>
              Comments ({news.comments})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    lineHeight: 24,
  },
  summary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourcesButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sourcesText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  commentsButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  commentsText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});

export default NewsCard;