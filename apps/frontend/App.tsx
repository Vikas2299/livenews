import React, { useEffect, useState, memo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal, 
  Pressable
} from 'react-native';
import { getSummaries, type SummaryRow } from './src/lib/api/summaries';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


const { height, width } = Dimensions.get('window');
const SMALL_SCREEN = height < 750;
const IMAGE_RATIO = SMALL_SCREEN ? 0.36 : 0.42;
const SUMMARY_RATIO = SMALL_SCREEN ? 0.26 : 0.28; 

// ----- Small presentational card for a single story -----
// ----- Small presentational card for a single story -----
const StoryCard = memo(function StoryCard({ row }: { row: SummaryRow }) {
  const [activeTab, setActiveTab] = useState<'G' | 'R' | 'L' | 'C'>('G');

  // Which overlay is open?
  type Sheet = 'comments' | 'sources' | null;
  const [sheet, setSheet] = useState<Sheet>(null);

  const openComments = () =>
    setSheet((s) => (s === 'comments' ? null : 'comments'));
  const openSources = () =>
    setSheet((s) => (s === 'sources' ? null : 'sources'));
  const closeSheet = () => setSheet(null);

  const tabs = [
    { id: 'G' as const, label: 'General', color: '#6c757d', textColor: '#fff' },
    { id: 'R' as const, label: 'Republican', color: '#dc3545', textColor: '#fff' },
    { id: 'L' as const, label: 'Liberal', color: '#007bff', textColor: '#fff' },
    { id: 'C' as const, label: 'Conservative', color: '#ffffff', textColor: '#000' },
  ];

  const textByTab: Record<typeof activeTab, string> = {
    G: row.center?.trim() || row.left?.trim() || row.right?.trim() || '—',
    R: row.right?.trim() || '—',
    L: row.left?.trim() || '—',
    C: row.center?.trim() || '—',
  };

  const imageUri = `https://picsum.photos/seed/${encodeURIComponent(row.title)}/1200/800`;

  // demo data
  const comments = [
    { user: 'JohnDoe123', text: 'Finally some bipartisan action! This is what we need.', time: '1h ago' },
    { user: 'PoliticalWatcher', text: 'Concerned about the national debt implications.', time: '45m ago' },
    { user: 'NewsJunkie', text: 'Great to see investment in infrastructure!', time: '30m ago' },
  ];
  const sources = ['BBC', 'CNN', 'NPR'];

  return (
    <View style={styles.page}>
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.newsImage} resizeMode="cover" />
      </View>

      {/* Tabs */}
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

      {/* Title + Summary + Buttons */}
      <View style={styles.textContainer}>
        <Text style={styles.newsTitle}>{row.title}</Text>

        <View style={styles.shortSection}>
          <View style={styles.shortHeader}>
            <View style={styles.shortLine} />
            <Text style={styles.shortLabel}>livenews</Text>
            <View style={styles.shortLine} />
          </View>
          <Text style={styles.newsContent}>{textByTab[activeTab]}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={openSources}>
            <Text style={styles.actionButtonText}>📰 Sources ({sources.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openComments}>
            <Text style={styles.actionButtonText}>💬 Comments ({comments.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== Bottom-sheet overlay (on top of the text) ===== */}
      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <View style={styles.overlay}>
          {/* Tap outside to close */}
          <Pressable style={styles.backdrop} onPress={closeSheet} />

          <View style={styles.sheet}>
            <View style={styles.handleBar} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {sheet === 'comments' ? `Comments (${comments.length})` : 'News Sources'}
              </Text>
              <TouchableOpacity onPress={closeSheet}>
                <Text style={styles.sheetClose}>Close</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {sheet === 'comments' ? (
              <ScrollView style={{ maxHeight: height * 0.55 }}>
                {comments.map((c, i) => (
                  <View key={`${c.user}-${i}`} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{c.user}</Text>
                      <Text style={styles.commentTime}>{c.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <ScrollView style={{ maxHeight: height * 0.55 }}>
                {sources.map((s) => (
                  <View key={s} style={styles.sourceItem}>
                    <View style={styles.sourceBullet} />
                    <Text style={styles.sourceText}>{s}</Text>
                  </View>
                ))}
                <Text style={styles.sourcesNote}>
                  This story has been synthesized from multiple viewpoints to provide balanced coverage.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
});


// ----- App: fetch summaries and render a vertical paged list -----
export default function App() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getSummaries({ signal: ctrl.signal })
      .then((res) => setRows(res.rows))
      .catch((e: any) => setErr(e?.message ?? 'Failed to load summaries'))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <View style={[styles.page, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading…</Text>
      </View>
    );
  }
  if (err) {
    return (
      <View style={[styles.page, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'red' }}>{err}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.title}
      renderItem={({ item }) => <StoryCard row={item} />}
      pagingEnabled
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      // make each item exactly one "screen" tall so paging snaps per story
      getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
    />
  );
}

// ----- Styles (mostly from your mock) -----
const styles = StyleSheet.create({

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 12,
  },
  handleBar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  sheetClose: { color: '#2563eb', fontWeight: '600' },

  page: { height, backgroundColor: '#fff' },

  imageContainer: { width: '100%', height: height * IMAGE_RATIO, backgroundColor: '#f0f0f0' },
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
});