// app.tsx
import React, { useEffect, useState, memo, useMemo } from 'react';
import {
  ActivityIndicator, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity,
  View, ScrollView, Platform, UIManager, Modal, Pressable, useWindowDimensions,
} from 'react-native';
import { getSummaries, type SummaryRow } from '../services/api/summaries';
import { getClusterCovers } from '../services/api/thumbnail';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: initialWindowHeight } = Dimensions.get('window');
const SMALL_SCREEN = initialWindowHeight < 750;
const IMAGE_RATIO = SMALL_SCREEN ? 0.36 : 0.42;

/** Space under article text before the fixed Sources / Comments bar */
const SUMMARY_SCROLL_BOTTOM_PAD = 34;
/** Lift action bar slightly from the physical bottom of the card */
const ACTIONS_BOTTOM_OFFSET = 10;

type TabId = 'G' | 'R' | 'L' | 'C';

/** Same outlet pools as `cluster_organizer_real.VIEW_TO_SOURCES` (display names). */
const POOL_LEFT = ['The Guardian', 'CNN', 'Washington Post'] as const;
const POOL_CENTER = ['BBC', 'NPR', 'PBS'] as const;
const POOL_RIGHT = ['Fox News', 'Breitbart', 'Dow Jones'] as const;
const POOL_GENERAL = [...POOL_LEFT, ...POOL_CENTER, ...POOL_RIGHT] as const;

const HARDCODED_SOURCES_BY_TAB: Record<TabId, readonly string[]> = {
  G: POOL_GENERAL,
  L: POOL_LEFT,
  R: POOL_RIGHT,
  C: POOL_CENTER,
};

/** Backend placeholder when a view has no articles to summarize */
const MORE_SOURCES_NEEDED = /^more\s+(left|right|center|general)\s+sources\s+needed\.?$/i;

function rawSummaryForPerspective(row: SummaryRow, tab: TabId): string | undefined {
  switch (tab) {
    case 'G':
      return row.general;
    case 'L':
      return row.left;
    case 'R':
      return row.right;
    case 'C':
      return row.center;
  }
}

/** True when this perspective has a real summary (not empty, em dash, or “more … sources needed”). */
function hasRealSummaryForPerspective(row: SummaryRow, tab: TabId): boolean {
  const t = rawSummaryForPerspective(row, tab)?.trim() ?? '';
  if (!t || t === '—') return false;
  if (MORE_SOURCES_NEEDED.test(t)) return false;
  return true;
}

// ----- Small presentational card for a single story -----
const StoryCard = memo(function StoryCard({
  row,
  imageUri,
  pageHeight,
}: { row: SummaryRow; imageUri: string; pageHeight: number }) {
  const [activeTab, setActiveTab] = useState<TabId>('G');

  // Which overlay is open?
  type Sheet = 'comments' | 'sources' | 'tabLegend' | null;
  const [sheet, setSheet] = useState<Sheet>(null);
  const openComments = () => setSheet(s => (s === 'comments' ? null : 'comments'));
  const openSources  = () => setSheet(s => (s === 'sources'  ? null : 'sources'));
  const toggleTabLegend = () => setSheet(s => (s === 'tabLegend' ? null : 'tabLegend'));
  const closeSheet   = () => setSheet(null);

  // Match list row height (measured FlatList) so layout does not peek next card on Android
  const winH = pageHeight;

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

  const textByTab: Record<TabId, string> = {
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
  const activePerspectiveLabel = tabs.find((t) => t.id === activeTab)?.label ?? 'General';

  const perspectiveSources = useMemo(() => {
    if (!hasRealSummaryForPerspective(row, activeTab)) return [];
    return [...HARDCODED_SOURCES_BY_TAB[activeTab]];
  }, [row, activeTab]);

  const sourcesSheetNote =
    perspectiveSources.length === 0
      ? `No summary is available for this perspective yet, so no sources are listed.`
      : activeTab === 'G'
        ? 'General summaries draw on the full set of outlets below (left, center, and right pools).'
        : `Summaries for this perspective are produced from articles in these ${activePerspectiveLabel.toLowerCase()}-leaning outlets.`;

  return (
    <SafeAreaView style={[styles.page, { height: pageHeight }]} edges={[]}>
      <View style={[styles.page, { height: pageHeight }]}>
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

          {/* Tabs centered on screen; i sits in right flex column so it does not shift G–C */}
          <View style={styles.tabsRow} onLayout={(e) => setTabsH(e.nativeEvent.layout.height)}>
            <View style={styles.tabsSideBalance} />
            <View style={styles.tabsInner}>
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
            <View style={styles.tabsSideBalance}>
              <TouchableOpacity
                onPress={toggleTabLegend}
                style={styles.tabInfoHit}
                accessibilityLabel="What do G, R, L, and C mean?"
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <View style={styles.tabInfoCircle}>
                  <Text style={styles.tabInfoLetter}>i</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary: only scroll when needed */}
          <ScrollView
            style={[
              styles.summaryScroll,
              shouldScroll && { maxHeight: maxSummaryH },
            ]}
            contentContainerStyle={{ paddingBottom: SUMMARY_SCROLL_BOTTOM_PAD }}
            showsVerticalScrollIndicator={shouldScroll}
            scrollEnabled={shouldScroll}
            onContentSizeChange={(_, h) => setContentH(h)}
          >
            <Text style={styles.newsContent}>{textByTab[activeTab]}</Text>
          </ScrollView>

          {/* Action buttons (measured) */}
          <View
            style={[styles.actionsContainer, { bottom: ACTIONS_BOTTOM_OFFSET }]}
            onLayout={(e) => setActionsH(e.nativeEvent.layout.height)}
          >
            <TouchableOpacity style={styles.actionButton} onPress={openSources}>
              <Text style={styles.actionButtonText}>
                📰 Sources ({perspectiveSources.length})
              </Text>
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
                  {sheet === 'comments'
                    ? `Comments (${comments.length})`
                    : sheet === 'sources'
                      ? `Sources · ${activePerspectiveLabel}`
                      : 'Viewpoint labels'}
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
              ) : sheet === 'sources' ? (
                <ScrollView style={{ maxHeight: winH * 0.55 }}>
                  {perspectiveSources.map((s, i) => (
                    <View key={`${s}-${i}`} style={styles.sourceItem}>
                      <View style={styles.sourceBullet} />
                      <Text style={styles.sourceText}>{s}</Text>
                    </View>
                  ))}
                  <Text style={styles.sourcesNote}>{sourcesSheetNote}</Text>
                </ScrollView>
              ) : (
                <ScrollView style={{ maxHeight: winH * 0.55 }} contentContainerStyle={styles.tabLegendBody}>
                  {tabs.map((tab) => (
                    <View key={tab.id} style={styles.tabLegendRow}>
                      <Text style={styles.tabLegendKey}>{tab.id}</Text>
                      <Text style={styles.tabLegendDash}>—</Text>
                      <Text style={styles.tabLegendLabel}>{tab.label}</Text>
                    </View>
                  ))}
                  <Text style={styles.tabLegendFootnote}>
                    Each letter switches the summary to that editorial perspective for this story.
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
  const { height: winHeight } = useWindowDimensions();
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [coverMap, setCoverMap] = useState<Map<number, string>>(new Map()); // ✅
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [listHeight, setListHeight] = useState(winHeight);

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
      extraData={listHeight}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h <= 0) return;
        setListHeight((prev) => (Math.abs(h - prev) > 0.5 ? h : prev));
      }}
      renderItem={({ item, index }) => {
        const img = coverMap.get(index + 1) || GENERIC(item.title);
        return (
          <View style={{ height: listHeight, overflow: 'hidden' }}>
            <StoryCard row={item} imageUri={img} pageHeight={listHeight} />
          </View>
        );
      }}
      pagingEnabled
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={listHeight}
      disableIntervalMomentum
      getItemLayout={(_, i) => ({
        length: listHeight,
        offset: listHeight * i,
        index: i,
      })}
    />
  );
}

// ----- Styles (mostly from your mock) -----
const styles = StyleSheet.create({
  summaryScroll: { paddingHorizontal: 0, flex: 1, alignSelf: 'stretch', width: '100%' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: initialWindowHeight * 0.6,
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

  page: { width: '100%', backgroundColor: '#fff' },

  imageContainer: { width: '100%', height: initialWindowHeight * IMAGE_RATIO, backgroundColor: '#f0f0f0' },
  newsImage: { width: '100%', height: '100%' },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 1,
    paddingBottom: 1,
    backgroundColor: '#fff',
  },
  /** Equal flex keeps G–L–R–C centered; icon lives in the right column */
  tabsSideBalance: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /** Tab buttons are 42px tall; circle is 18px (< 21px = half of 42) */
  tabInfoHit: {
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabInfoCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#7f8c8d',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabInfoLetter: {
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#5d6d7e',
    marginTop: -1,
  },
  tabLegendBody: { paddingBottom: 8 },
  tabLegendRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tabLegendKey: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2c3e50',
    width: 22,
  },
  tabLegendDash: { fontSize: 15, color: '#95a5a6', marginHorizontal: 6 },
  tabLegendLabel: { flex: 1, fontSize: 15, color: '#34495e', fontWeight: '500' },
  tabLegendFootnote: { fontSize: 13, color: '#7f8c8d', lineHeight: 19, marginTop: 4 },
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
  newsContent: { fontSize: 14, lineHeight: 20, color: '#34495e', textAlign: 'left' },
  swipeHint: { fontSize: 12, color: '#95a5a6', fontStyle: 'italic', marginTop: 8, marginBottom: 12 },

  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 5,
    paddingBottom: 3,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderColor: '#ecf0f1',
    position: 'absolute',
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
