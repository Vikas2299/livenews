// app.tsx
import React, { useEffect, useState, memo } from 'react';
import {
  ActivityIndicator, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity,
  View, ScrollView, Platform, UIManager, Modal, Pressable, useWindowDimensions,
} from 'react-native';
import { getSummaries, type SummaryRow } from '../services/api/summaries';
import { getClusterCovers } from '../services/api/thumbnail';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height } = Dimensions.get('window');
const SMALL_SCREEN = height < 750;
const IMAGE_RATIO = SMALL_SCREEN ? 0.36 : 0.42;

// ----- Small presentational card for a single story -----
const StoryCard = memo(function StoryCard({
  row,
  imageUri, // ✅ new prop
}: { row: SummaryRow; imageUri: string }) {
  const [activeTab, setActiveTab] = useState<'G' | 'R' | 'L' | 'C'>('G');

  // Which overlay is open?
  type Sheet = 'comments' | 'sources' | null;
  const [sheet, setSheet] = useState<Sheet>(null);
  const openComments = () => setSheet(s => (s === 'comments' ? null : 'comments'));
  const openSources  = () => setSheet(s => (s === 'sources'  ? null : 'sources'));
  const closeSheet   = () => setSheet(null);

  // Responsive measurements
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Measure heights of dynamic blocks
  const [tabsH, setTabsH]       = useState(0);
  const [headerH, setHeaderH]   = useState(0);
  const [actionsH, setActionsH] = useState(0);
  const [contentH, setContentH] = useState(0); // natural text height

  // Image height
  const imageRatio = winH < 750 ? 0.34 : 0.40;
  const imageH = Math.round(winH * imageRatio);

  // Space budgeting - actions are absolutely positioned, so don't subtract their height
  const gutters = 2;
  const BOTTOM_MIN = 0;
  const SUMMARY_MAX_RATIO = winH < 750 ? 0.82 : 0.85;

  const availableForSummary = Math.max(
    0,
    winH - (imageH + tabsH + headerH + BOTTOM_MIN + gutters)
  );
  const maxSummaryH = Math.min(winH * SUMMARY_MAX_RATIO, availableForSummary);
  const shouldScroll = contentH > maxSummaryH + 1; // +1 avoids jitter on equality

  const tabs = [
    { id: 'G' as const, label: 'General', color: '#6c757d', textColor: '#fff' },
    { id: 'R' as const, label: 'Right',   color: '#dc3545', textColor: '#fff' },
    { id: 'L' as const, label: 'Left',    color: '#007bff', textColor: '#fff' },
    { id: 'C' as const, label: 'Center',  color: '#ffffff', textColor: '#000' },
  ];

  const textByTab: Record<typeof activeTab, string> = {
    G: row.general?.trim() || row.left?.trim() || row.right?.trim() || '—',
    R: row.right?.trim() || '—',
    L: row.left?.trim() || '—',
    C: row.center?.trim() || '—',
  };

  // ✅ restore demo data (unchanged behavior)
  const comments = [
    { user: 'JohnDoe123',       text: 'Finally some bipartisan action! This is what we need.', time: '1h ago' },
    { user: 'PoliticalWatcher', text: 'Concerned about the national debt implications.',       time: '45m ago' },
    { user: 'NewsJunkie',       text: 'Great to see investment in infrastructure!',            time: '30m ago' },
  ];
  const sources = ['BBC', 'CNN', 'NPR'];

  return (
    <SafeAreaView style={styles.page} edges={[]}>
      <View style={styles.page}>
        {/* Image */}
        <View style={[styles.imageContainer, { height: imageH }]}>
          <Image source={{ uri: imageUri }} style={styles.newsImage} resizeMode="cover" />
        </View>

        {/* Title + Summary + Buttons */}
        <View style={[styles.textContainer, { paddingBottom: BOTTOM_MIN }]}>
          {/* Title (measured) */}
          <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} style={{ width: '100%' }}>
            <Text style={styles.newsTitle}>{row.title}</Text>
            <View style={styles.shortHeader}>
              <View style={styles.shortLine} />
              <Text style={styles.shortLabel}>GlassBox News</Text>
              <View style={styles.shortLine} />
            </View>
          </View>

          {/* Tabs - moved below title */}
          <View style={styles.tabsContainer} onLayout={(e) => setTabsH(e.nativeEvent.layout.height)}>
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

          {/* Summary: only scroll when needed */}
          <ScrollView
            style={[
              styles.summaryScroll,
              shouldScroll && { maxHeight: maxSummaryH },
            ]}
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={shouldScroll}
            scrollEnabled={shouldScroll}
            onContentSizeChange={(_, h) => setContentH(h)}
          >
            <Text style={styles.newsContent}>{textByTab[activeTab]}</Text>
          </ScrollView>

          {/* Action buttons (measured) */}
          <View
            style={styles.actionsContainer}
            onLayout={(e) => setActionsH(e.nativeEvent.layout.height)}
          >
            <TouchableOpacity style={styles.actionButton} onPress={openSources}>
              <Text style={styles.actionButtonText}>📰 Sources ({sources.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={openComments}>
              <Text style={styles.actionButtonText}>💬 Comments ({comments.length})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom-sheet for comments/sources */}
        <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={closeSheet}>
          <View style={styles.overlay}>
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

              {sheet === 'comments' ? (
                <ScrollView style={{ maxHeight: winH * 0.55 }}>
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
                <ScrollView style={{ maxHeight: winH * 0.55 }}>
                  {sources.map((s) => (
                    <View key={s} style={styles.sourceItem}>
                      <View style={styles.sourceBullet} />
                      <Text style={styles.sourceText}>{s}</Text>
                    </View>
                  ))}
                  <Text style={styles.sourcesNote}>
                    This story has been synthesized from multiple sources to provide balanced coverage.
                  </Text>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
});

// ----- App: fetch summaries + covers, render list -----
export default function NewspaperScreen() {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [coverMap, setCoverMap] = useState<Map<number, string>>(new Map()); // ✅
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [sumRes, covRes] = await Promise.all([
          getSummaries({ signal: ctrl.signal }),
          getClusterCovers({ signal: ctrl.signal }),  // ✅ fetch covers
        ]);
        setRows(sumRes.rows);

        const m = new Map<number, string>();
        (covRes.rows ?? []).forEach(r => m.set(r.clusterId, r.imageUrl));
        setCoverMap(m);
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
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

  const GENERIC = (title: string) =>
    `https://picsum.photos/seed/${encodeURIComponent(title)}/1200/800`; // ✅ fallback

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.title}
      renderItem={({ item, index }) => {
        // index is 0-based; cluster_id starts at 1
        const img = coverMap.get(index + 1) || GENERIC(item.title);
        return <StoryCard row={item} imageUri={img} />;
      }}
      pagingEnabled
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      // make each item exactly one "screen" tall so paging snaps per story
      getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
    />
  );
}

// ----- Styles (mostly from your mock) -----
const styles = StyleSheet.create({
  summaryScroll: { paddingHorizontal: 0, flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
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
  handleBar: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  sheetClose: { color: '#2563eb', fontWeight: '600' },

  page: { height, backgroundColor: '#fff' },

  imageContainer: { width: '100%', height: height * IMAGE_RATIO, backgroundColor: '#f0f0f0' },
  newsImage: { width: '100%', height: '100%' },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 1,
    paddingBottom: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tab: {
    width: 42,
    height: 42,
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 7,
    borderWidth: 0.5,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 2,
  },
  activeTab: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#007bff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: { fontSize: 17, fontWeight: '600' },
  activeTabText: { fontSize: 17, fontWeight: '700', color: '#007bff' },

  textContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 1, backgroundColor: '#fff', alignItems: 'center' },
  newsTitle: { fontSize: 19, fontWeight: 'bold', color: '#2c3e50', lineHeight: 25, marginBottom: 0, textAlign: 'center', flexShrink: 1 },
  shortSection: { marginBottom: 10 },
  shortHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 1, marginTop: 0 },
  shortLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  shortLabel: { fontSize: 12, fontWeight: 'bold', color: '#95a5a6', marginHorizontal: 10, textTransform: 'lowercase' },
  newsContent: { fontSize: 14, lineHeight: 20, color: '#34495e', textAlign: 'center' },
  swipeHint: { fontSize: 12, color: '#95a5a6', fontStyle: 'italic', marginTop: 8, marginBottom: 12 },

  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 6,
    paddingBottom: 4,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#ecf0f1',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

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
