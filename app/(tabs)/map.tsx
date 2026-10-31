import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Map as MapIcon, Star, Trash2 } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/lib/theme';
import { LoadingView, ErrorView, EmptyView } from '@/components/ui';
import {
  fetchPassages,
  fetchAllChoices,
  fetchChapters,
  deletePassage,
} from '@/lib/db';
import type { Passage, Choice, Chapter } from '@/lib/types';
import { useStory } from '@/lib/story-context';

const CARD_W = 140;
const CARD_H = 70;
const GAP_X = 200;
const GAP_Y = 120;
const PADDING = 60;

interface PositionedPassage extends Passage {
  x: number;
  y: number;
}

export default function MapScreen() {
  const { activeStory } = useStory();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);


  const load = useCallback(async () => {
    if (!activeStory) return;
    try {
      setError(null);
      const [pData, cData, chData] = await Promise.all([
        fetchPassages(activeStory.id),
        fetchAllChoices(activeStory.id),
        fetchChapters(activeStory.id),
      ]);
      setPassages(pData);
      setChoices(cData);
      setChapters(chData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat peta');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStory]);

  useEffect(() => {
    if (activeStory) {
      setLoading(true);
      load();
    } else {
      setPassages([]);
      setChoices([]);
      setLoading(false);
    }
  }, [activeStory, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Layout passages in a grid based on stored positions, falling back to auto-layout
  const positioned: PositionedPassage[] = passages.map((p, i) => {
    const useStored = p.position_x !== 0 || p.position_y !== 0;
    if (useStored) {
      return { ...p, x: p.position_x + PADDING, y: p.position_y + PADDING };
    }
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      ...p,
      x: PADDING + col * GAP_X,
      y: PADDING + row * GAP_Y,
    };
  });

  const posMap = new Map(positioned.map((p) => [p.id, p]));

  const canvasWidth = Math.max(
    Dimensions.get('window').width,
    ...positioned.map((p) => p.x + CARD_W + PADDING),
  );
  const canvasHeight = Math.max(
    Dimensions.get('window').height - 200,
    ...positioned.map((p) => p.y + CARD_H + PADDING),
  );

  const handleDelete = (p: Passage) => {
    Alert.alert(
      'Hapus bagian?',
      `"${p.title}" akan dihapus dari peta.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePassage(p.id);
              setSelected(null);
              load();
            } catch (e) {
              Alert.alert('Gagal', e instanceof Error ? e.message : undefined);
            }
          },
        },
      ],
    );
  };

  if (!activeStory) {
    if (loading) return <LoadingView message="Memuat cerita..." />;
    return (
      <EmptyView
        icon={<MapIcon size={32} color={Colors.primary[500]} strokeWidth={2} />}
        title="Tidak ada cerita dipilih"
        subtitle="Pilih cerita dari tab Pustaka untuk melihat peta ceritanya."
      />
    );
  }

  if (loading) return <LoadingView message="Memuat peta..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Peta</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>{activeStory.title}</Text>
      </View>

      {positioned.length === 0 ? (
        <EmptyView
          icon={<MapIcon size={32} color={Colors.primary[500]} strokeWidth={2} />}
          title="Peta kosong"
          subtitle="Buat bagian cerita di tab Editor untuk melihatnya di sini."
        />
      ) : (
        <ScrollView
          horizontal={false}
          contentContainerStyle={{ width: canvasWidth }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ScrollView horizontal contentContainerStyle={{ minHeight: canvasHeight }}>
            <View style={{ width: canvasWidth, height: canvasHeight }}>
              {/* Connections */}
              <Svg style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth, height: canvasHeight }}>
                {choices.map((c) => {
                  const from = posMap.get(c.from_passage_id);
                  const to = c.to_passage_id ? posMap.get(c.to_passage_id) : null;
                  if (!from) return null;
                  if (!to) {
                    return null;
                  }
                  const x1 = from.x + CARD_W / 2;
                  const y1 = from.y + CARD_H;
                  const x2 = to.x + CARD_W / 2;
                  const y2 = to.y;
                  const midY = (y1 + y2) / 2;
                  const isHighlighted = selected === from.id || selected === to.id;
                  return (
                    <Path
                      key={c.id}
                      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                      stroke={isHighlighted ? Colors.primary[500] : Colors.neutral[300]}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      fill="none"
                    />
                  );
                })}
              </Svg>

              {/* Passage cards */}
              {positioned.map((p) => {
                const isSelected = selected === p.id;
                const incoming = choices.filter((c) => c.to_passage_id === p.id).length;
                const outgoing = choices.filter((c) => c.from_passage_id === p.id).length;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelected(isSelected ? null : p.id)}
                    style={[
                      styles.node,
                      { left: p.x, top: p.y },
                      p.is_start && styles.nodeStart,
                      isSelected && styles.nodeSelected,
                    ]}>
                    {p.is_start && (
                      <View style={styles.nodeStartDot}>
                        <Star size={9} color={Colors.neutral[900]} strokeWidth={2} fill={Colors.neutral[900]} />
                      </View>
                    )}
                    <Text style={styles.nodeTitle} numberOfLines={1}>{p.title}</Text>
                    <View style={styles.nodeMeta}>
                      <Text style={styles.nodeMetaText}>{outgoing} keluar</Text>
                      <Text style={styles.nodeMetaSep}>·</Text>
                      <Text style={styles.nodeMetaText}>{incoming} masuk</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.nodeActions}>
                        <Pressable
                          style={styles.nodeActionBtn}
                          onPress={() => handleDelete(p)}>
                          <Trash2 size={14} color={Colors.error[500]} strokeWidth={2} />
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Legend */}
      {positioned.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.accent[400] }]} />
            <Text style={styles.legendText}>Bagian awal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine]} />
            <Text style={styles.legendText}>Pilihan/cabang</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: Colors.neutral[0],
    borderBottomColor: Colors.neutral[100],
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    marginTop: 4,
  },
  node: {
    position: 'absolute',
    width: CARD_W,
    minHeight: CARD_H,
    borderRadius: 14,
    backgroundColor: Colors.neutral[0],
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    padding: 12,
    justifyContent: 'center',
  },
  nodeStart: {
    borderColor: Colors.accent[400],
    backgroundColor: Colors.accent[50],
  },
  nodeSelected: {
    borderColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  nodeStartDot: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accent[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  nodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nodeMetaText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
  },
  nodeMetaSep: {
    fontSize: 10,
    color: Colors.neutral[300],
  },
  nodeActions: {
    position: 'absolute',
    bottom: -16,
    right: 0,
    flexDirection: 'row',
    gap: 6,
  },
  nodeActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLine: {
    width: 16,
    height: 2,
    backgroundColor: Colors.neutral[300],
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
});
