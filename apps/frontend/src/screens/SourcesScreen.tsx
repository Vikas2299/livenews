import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

interface SourcesScreenProps {
  route: {
    params: {
      sources: string[];
    };
  };
}

const SourcesScreen: React.FC<SourcesScreenProps> = ({route}) => {
  const {sources} = route.params;

  const openSource = (source: string) => {
    // In a real app, this would open the source URL
    console.log(`Opening source: ${source}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Article Sources</Text>
          <Text style={styles.subtitle}>
            These sources were used to synthesize the article content
          </Text>
        </View>
        
        <View style={styles.sourcesList}>
          {sources.map((source, index) => (
            <TouchableOpacity
              key={index}
              style={styles.sourceItem}
              onPress={() => openSource(source)}>
              <View style={styles.sourceContent}>
                <Ionicons name="document-text-outline" size={24} color="#666" />
                <Text style={styles.sourceName}>{source}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sources are automatically aggregated and synthesized to provide 
            balanced viewpoints on political topics.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  sourcesList: {
    padding: 20,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sourceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 20,
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default SourcesScreen;