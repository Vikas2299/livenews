import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

import {
  getHealth,
  type Health,
  getSourceArticles,
  getArticle,
  type ArticleListItem,
  type FullArticleResponse,
} from './src/lib/api';

const { height, width } = Dimensions.get('window');

export default function App() {
  const [activeTab, setActiveTab] = useState('G');
  const [showSources, setShowSources] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // ---- API health banner state ----
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getHealth()
      .then((h) => {
        if (mounted) setHealth(h);
      })
      .catch((e) => {
        if (mounted) setHealthError(e?.status ? String(e.status) : 'unknown');
      })
      .finally(() => {
        if (mounted) setHealthLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ---- Live BBC list + article preview (from backend) ----
  const [bbcLoading, setBbcLoading] = useState(false);
  const [bbcError, setBbcError] = useState<string | null>(null);
  const [bbcItems, setBbcItems] = useState<ArticleListItem[]>([]);
  const [selected, setSelected] = useState<FullArticleResponse | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);

  useEffect(() => {
    let mounted = true;
    setBbcLoading(true);
    getSourceArticles('BBC', 15)
      .then((resp) => {
        if (mounted) setBbcItems(resp.articles ?? []);
      })
      .catch((e) => {
        if (mounted) setBbcError(e?.status ? `HTTP ${e.status}` : 'Failed to load');
      })
      .finally(() => {
        if (mounted) setBbcLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openArticle = async (item: ArticleListItem) => {
    try {
      setLoadingArticle(true);
      const full = await getArticle('BBC', item.filename);
      setSelected(full);
    } catch (e: any) {
      setBbcError(e?.status ? `HTTP ${e.status}` : 'Failed to open article');
    } finally {
      setLoadingArticle(false);
    }
  };

  // ---- Sample static card you already had ----
  const newsStory = {
    title: 'Major Infrastructure Bill Passes Congress',
    content:
      'The United States Congress has passed a comprehensive infrastructure bill worth $1.2 trillion, marking one of the largest investments in American infrastructure in decades. The bill includes funding for roads, bridges, public transit, broadband internet, and clean energy initiatives. Supporters argue this will create millions of jobs and modernize aging infrastructure, while critics raise concerns about the cost and implementation timeline. The legislation received bipartisan support after months of negotiations.',
    image:
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop',
    time: '2 hours ago',
    sources: ['CNN', 'Fox News', 'NPR', 'Reuters', 'Associated Press'],
    swipeHint: 'swipe left for more at YouTube / 2 hours ago',
  };

  const comments = [
    { user: 'JohnDoe123', text: 'Finally some bipartisan action! This is what we need.', time: '1h ago' },
    { user: 'PoliticalWatcher', text: 'Concerned about the national debt implications.', time: '45m ago' },
    { user: 'NewsJunkie', text: 'Great to see investment in infrastructure!', time: '30m ago' },
  ];

  const tabs = [
    { id: 'G', label: 'General', color: '#6c757d', textColor: '#fff' },
    { id: 'R', label: 'Republican', color: '#dc3545', textColor: '#fff' },
    { id: 'L', label: 'Liberal', color: '#007bff', textColor: '#fff' },
    { id: 'C', label: 'Conservative', color: '#ffffff', textColor: '#000' },
  ];

  return (
    <View style={styles.container}>
      {/* ---- API health banner ---- */}
      <View style={styles.apiBanner}>
        <Text style={styles.apiBannerText}>
          {healthLoading
            ? 'Pinging API...'
            : health
            ? `API: ${health.status} – ${health.service}`
            : `API error: ${healthError ?? 'unknown'}`}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: newsStory.image }} style={styles.newsImage} resizeMode="cover" />
        </View>

        {/* Small, subtle tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                { backgroundColor: tab.color },
                activeTab === tab.id && styles.activeTab,
                tab.id === 'C' && { borderWidth: 1, borderColor: '#ddd' },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tab.textColor },
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.id}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Static demo card */}
        <View style={styles.textContainer}>
          <Text style={styles.newsTitle}>{newsStory.title}</Text>

          <View style={styles.shortSection}>
            <View style={styles.shortHeader}>
              <View style={styles.shortLine} />
              <Text style={styles.shortLabel}>short</Text>
              <View style={styles.shortLine} />
            </View>
            <Text style={styles.newsContent}>{newsStory.content}</Text>
          </View>

          <Text style={styles.swipeHint}>{newsStory.swipeHint}</Text>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowSources(!showSources)}
            >
              <Text style={styles.actionButtonText}>📰 Sources ({newsStory.sources.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowComments(!showComments)}
            >
              <Text style={styles.actionButtonText}>💬 Comments ({comments.length})</Text>
            </TouchableOpacity>
          </View>

          {showSources && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.sectionTitle}>News Sources</Text>
              {newsStory.sources.map((source, index) => (
                <View key={index} style={styles.sourceItem}>
                  <View style={styles.sourceBullet} />
                  <Text style={styles.sourceText}>{source}</Text>
                </View>
              ))}
              <Text style={styles.sourcesNote}>
                This story has been synthesized from multiple viewpoints to provide balanced coverage.
              </Text>
            </View>
          )}

          {showComments && (
            <View style={styles.commentsContainer}>
              <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
              {comments.map((comment, index) => (
                <View key={index} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{comment.user}</Text>
                    <Text style={styles.commentTime}>{comment.time}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.addCommentButton}>
                <Text style={styles.addCommentText}>+ Add Comment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ---- Live BBC section from API ---- */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6 }}>BBC (live from API)</Text>

          {bbcLoading && <ActivityIndicator />}
          {bbcError && <Text style={{ color: 'red', marginBottom: 8 }}>{bbcError}</Text>}

          {bbcItems.map((it) => (
            <TouchableOpacity
              key={it.filename}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}
              onPress={() => openArticle(it)}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1d4ed8' }}>
                {it.title || it.filename}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{it.published}</Text>
            </TouchableOpacity>
          ))}

          {loadingArticle && <ActivityIndicator style={{ marginTop: 8 }} />}

          {selected && (
            <View style={{ marginTop: 12, backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                {selected.metadata?.Title ?? selected.filename}
              </Text>
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>
                {selected.content.slice(0, 1200)}
                {selected.content.length > 1200 ? '…' : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={{ marginTop: 10 }}>
                <Text style={{ color: '#2563eb', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // API banner
  apiBanner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f2f2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  apiBannerText: { fontSize: 12, color: '#555' },

  contentContainer: { flex: 1 },
  imageContainer: { width: '100%', height: height * 0.5, backgroundColor: '#f0f0f0' },
  newsImage: { width: '100%', height: '100%' },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 0.5,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  activeTab: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007bff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  activeTabText: { fontSize: 13, fontWeight: '700', color: '#007bff' },

  textContainer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff' },
  newsTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', lineHeight: 26, marginBottom: 8 },
  shortSection: { marginBottom: 10 },
  shortHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  shortLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  shortLabel: { fontSize: 12, fontWeight: 'bold', color: '#95a5a6', marginHorizontal: 10, textTransform: 'lowercase' },
  newsContent: { fontSize: 14, lineHeight: 20, color: '#34495e', textAlign: 'left' },
  swipeHint: { fontSize: 12, color: '#95a5a6', fontStyle: 'italic', marginTop: 8, marginBottom: 12 },

  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ecf0f1',
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  sourcesContainer: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12, marginTop: 3, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  sourceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sourceBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3498db', marginRight: 12 },
  sourceText: { fontSize: 15, color: '#34495e', fontWeight: '500' },
  sourcesNote: { fontSize: 12, color: '#7f8c8d', fontStyle: 'italic', marginTop: 15, lineHeight: 18 },

  commentsContainer: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12, marginTop: 3, marginBottom: 8 },
  commentItem: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#3498db' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  commentUser: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
  commentTime: { fontSize: 12, color: '#95a5a6' },
  commentText: { fontSize: 14, color: '#34495e', lineHeight: 20 },

  addCommentButton: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  addCommentText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  bottomPadding: { height: 10 },
});
