import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import {useNavigation} from '@react-navigation/native';

const {width, height} = Dimensions.get('window');

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  image: string;
  sources: string[];
  comments: number;
  viewpoint: 'General' | 'Republican' | 'Liberal' | 'Conservative';
}

const mockArticles: NewsArticle[] = [
  {
    id: '1',
    title: "Supreme Court Rules on Affirmative Action in College Admissions",
    content: "The Supreme Court has issued a landmark decision regarding affirmative action policies in higher education. The ruling affects how universities can consider race in their admissions processes, potentially reshaping the landscape of college admissions across the United States.",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    sources: ["CNN", "Fox News", "NPR", "Washington Post"],
    comments: 127,
    viewpoint: 'General'
  },
  {
    id: '2',
    title: "Climate Change Legislation Passes House Committee",
    content: "A comprehensive climate change bill has advanced through the House Energy and Commerce Committee, marking a significant step forward in environmental policy. The legislation includes provisions for renewable energy investments and carbon emission reductions.",
    image: "https://images.unsplash.com/photo-1569163139394-de44683a7a1a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    sources: ["Reuters", "Associated Press", "Bloomberg"],
    comments: 89,
    viewpoint: 'Liberal'
  },
  {
    id: '3',
    title: "Tax Reform Package Gains Senate Support",
    content: "A bipartisan tax reform package has garnered significant support in the Senate, with lawmakers from both parties expressing optimism about the potential economic benefits. The proposal aims to simplify the tax code while maintaining revenue neutrality.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    sources: ["Wall Street Journal", "Politico", "The Hill"],
    comments: 156,
    viewpoint: 'Conservative'
  }
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePageSelected = (e: any) => {
    setCurrentIndex(e.nativeEvent.position);
  };

  const openSources = () => {
    const currentArticle = mockArticles[currentIndex];
    navigation.navigate('Sources', {sources: currentArticle.sources});
  };

  const openComments = () => {
    const currentArticle = mockArticles[currentIndex];
    navigation.navigate('Comments', {articleId: currentArticle.id, title: currentArticle.title});
  };

  const renderArticle = (article: NewsArticle, index: number) => (
    <View key={article.id} style={styles.articleContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image source={{uri: article.image}} style={styles.articleImage} />
          <View style={styles.viewpointLabel}>
            <Text style={styles.viewpointText}>{article.viewpoint}</Text>
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.content}>{article.content}</Text>
        </View>
        
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Swipe left for more • {article.comments} comments
          </Text>
        </View>
        
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.sourcesButton} onPress={openSources}>
            <Text style={styles.sourcesButtonText}>Sources</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.commentsButton} onPress={openComments}>
            <Text style={styles.commentsButtonText}>Comments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
        orientation="vertical">
        {mockArticles.map((article, index) => renderArticle(article, index))}
      </PagerView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pagerView: {
    flex: 1,
  },
  articleContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    position: 'relative',
    height: height * 0.4,
  },
  articleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  viewpointLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  viewpointText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    lineHeight: 32,
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    color: '#4a4a4a',
    lineHeight: 24,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#8a8a8a',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  sourcesButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sourcesButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  commentsButton: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  commentsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;

