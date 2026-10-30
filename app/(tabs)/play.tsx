import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Play as PlayIcon, RotateCcw, BookOpen, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { LoadingView, ErrorView, EmptyView, PrimaryButton } from '@/components/ui';
import {
  fetchPassages,
  fetchAllChoices,
} from '@/lib/db';
import type { Passage, Choice } from '@/lib/types';
import { useStory } from '@/lib/story-context';

interface HistoryEntry {
  passage: Passage;
  choices: Choice[];
}

export default function PlayScreen() {
  const { activeStory } = useStory();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [allChoices, setAllChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentPassage, setCurrentPassage] = useState<Passage | null>(null);

  const load = useCallback(async () => {
    if (!activeStory) return;
    try {
      setError(null);
      const [pData, cData] = await Promise.all([
        fetchPassages(activeStory.id),
        fetchAllChoices(activeStory.id),
      ]);
      setPassages(pData);
      setAllChoices(cData);

      const start = pData.find((p) => p.is_start) ?? pData[0] ?? null;
      if (start) {
        setCurrentPassage(start);
        const startChoices = cData.filter((c) => c.from_passage_id === start.id);
        setHistory([{ passage: start, choices: startChoices }]);
      } else {
        setCurrentPassage(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat cerita');
    } finally {
      setLoading(false);
    }
  }, [activeStory]);

  useEffect(() => {
    if (activeStory) {
      setLoading(true);
      setHistory([]);
      load();
    } else {
      setPassages([]);
      setAllChoices([]);
      setCurrentPassage(null);
      setLoading(false);
    }
  }, [activeStory, load]);

  const navigateTo = (passageId: string) => {
    const target = passages.find((p) => p.id === passageId);
    if (!target) return;
    const targetChoices = allChoices.filter((c) => c.from_passage_id === target.id);
    setCurrentPassage(target);
    setHistory((prev) => [...prev, { passage: target, choices: targetChoices }]);
  };

  const restart = () => {
    const start = passages.find((p) => p.is_start) ?? passages[0] ?? null;
    if (start) {
      const startChoices = allChoices.filter((c) => c.from_passage_id === start.id);
      setCurrentPassage(start);
      setHistory([{ passage: start, choices: startChoices }]);
    }
  };

  const goBack = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const last = newHistory[newHistory.length - 1];
    setCurrentPassage(last.passage);
  };

  if (!activeStory) {
    if (loading) return <LoadingView message="Memuat cerita..." />;
    return (
      <EmptyView
        icon={<PlayIcon size={32} color={Colors.primary[500]} strokeWidth={2} />}
        title="Tidak ada cerita dipilih"
        subtitle="Pilih cerita dari tab Pustaka untuk mulai bermain."
      />
    );
  }

  if (loading) return <LoadingView message="Memuat cerita..." />;
  if (error) return <ErrorView message={error} />;

  if (passages.length === 0) {
    return (
      <EmptyView
        icon={<BookOpen size={32} color={Colors.primary[500]} strokeWidth={2} />}
        title="Cerita masih kosong"
        subtitle="Buat bagian cerita di tab Editor terlebih dahulu."
      />
    );
  }

  if (!currentPassage) {
    return (
      <EmptyView
        icon={<BookOpen size={32} color={Colors.primary[500]} strokeWidth={2} />}
        title="Tidak ada bagian awal"
        subtitle="Tandai sebuah bagian sebagai titik mulai di tab Editor."
      />
    );
  }

  const currentChoices = allChoices.filter((c) => c.from_passage_id === currentPassage.id);
  const isDeadEnd = currentChoices.length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Main</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{activeStory.title}</Text>
        </View>
        <Pressable style={styles.restartBtn} onPress={restart} hitSlop={12}>
          <RotateCcw size={18} color={Colors.primary[600]} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View>
          <View style={styles.passageSection}>
            <View style={styles.passageTitleRow}>
              <Text style={styles.passageTitle}>{currentPassage.title}</Text>
              {currentPassage.is_start && (
                <View style={styles.startBadge}>
                  <Text style={styles.startBadgeText}>Awal</Text>
                </View>
              )}
            </View>
            {currentPassage.content ? (
              <Text style={styles.passageText}>{currentPassage.content}</Text>
            ) : (
              <Text style={styles.passageEmpty}>Bagian ini belum memiliki teks.</Text>
            )}
          </View>

          {isDeadEnd ? (
            <View style={styles.endSection}>
              <View style={styles.endIcon}>
                <BookOpen size={28} color={Colors.neutral[400]} strokeWidth={2} />
              </View>
              <Text style={styles.endTitle}>Cerita berakhir di sini</Text>
              <Text style={styles.endSubtitle}>Tidak ada pilihan lagi untuk dilanjutkan.</Text>
              <View style={{ marginTop: 20, gap: 10, width: '100%' }}>
                <PrimaryButton label="Mulai Ulang" onPress={restart} />
                {history.length > 1 && (
                  <Pressable style={styles.backLink} onPress={goBack}>
                    <Text style={styles.backLinkText}>Kembali ke bagian sebelumnya</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.choicesSection}>
              <Text style={styles.choicesLabel}>Pilihan:</Text>
              {currentChoices.map((c, i) => {
                const target = c.to_passage_id ? passages.find((p) => p.id === c.to_passage_id) : null;
                return (
                  <Pressable
                    key={c.id}
                    style={({ pressed }) => [styles.choiceCard, pressed && styles.choiceCardPressed]}
                    onPress={() => c.to_passage_id && navigateTo(c.to_passage_id)}
                    disabled={!c.to_passage_id}>
                    <View style={styles.choiceNumber}>
                      <Text style={styles.choiceNumberText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceText}>{c.text}</Text>
                      {!c.to_passage_id && (
                        <Text style={styles.choiceDeadEnd}>ujung buntu</Text>
                      )}
                    </View>
                    <ChevronRight size={18} color={Colors.primary[400]} strokeWidth={2} />
                  </Pressable>
                );
              })}
              {history.length > 1 && (
                <Pressable style={styles.backLink} onPress={goBack}>
                  <Text style={styles.backLinkText}>← Kembali</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.progressDots}>
          {history.map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i === history.length - 1 && styles.progressDotActive]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>Bagian {history.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  restartBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  passageSection: {
    backgroundColor: Colors.neutral[0],
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  passageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  passageTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    flexShrink: 1,
  },
  startBadge: {
    backgroundColor: Colors.accent[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  startBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.accent[600],
  },
  passageText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[700],
    lineHeight: 24,
  },
  passageEmpty: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[300],
    fontStyle: 'italic',
  },
  choicesSection: {},
  choicesLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.neutral[0],
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.neutral[100],
  },
  choiceCardPressed: {
    borderColor: Colors.primary[400],
    backgroundColor: Colors.primary[50],
    transform: [{ scale: 0.98 }],
  },
  choiceNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceNumberText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[700],
  },
  choiceText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[800],
    lineHeight: 21,
  },
  choiceDeadEnd: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    marginTop: 4,
  },
  endSection: {
    alignItems: 'center',
    padding: 32,
  },
  endIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  endTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  endSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    backgroundColor: Colors.neutral[0],
    borderTopColor: Colors.neutral[100],
    borderTopWidth: 1,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutral[200],
  },
  progressDotActive: {
    backgroundColor: Colors.primary[500],
    width: 18,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
  },
});
