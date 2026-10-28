import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Plus,
  FileText,
  ChevronRight,
  Trash2,
  Star,
  Pencil,
  Link2,
} from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { LoadingView, ErrorView, EmptyView, PrimaryButton, SecondaryButton } from '@/components/ui';
import {
  fetchPassages,
  createPassage,
  updatePassage,
  deletePassage,
  fetchChoices,
  createChoice,
  updateChoice,
  deleteChoice,
  setStartPassage,
} from '@/lib/db';
import type { Passage, Choice } from '@/lib/types';
import { useStory } from '@/lib/story-context';

export default function EditorScreen() {
  const { activeStory } = useStory();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [showPassageEditor, setShowPassageEditor] = useState(false);
  const [showChoiceEditor, setShowChoiceEditor] = useState(false);
  const [choicesFor, setChoicesFor] = useState<Passage | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);

  // passage editor state
  const [pTitle, setPTitle] = useState('');
  const [pContent, setPContent] = useState('');
  const [saving, setSaving] = useState(false);

  // choice editor state
  const [editingChoice, setEditingChoice] = useState<Choice | null>(null);
  const [cText, setCText] = useState('');
  const [cTarget, setCTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeStory) return;
    try {
      setError(null);
      const data = await fetchPassages(activeStory.id);
      setPassages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat bagian');
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
      setLoading(false);
    }
  }, [activeStory, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openNewPassage = () => {
    setEditingPassage(null);
    setPTitle('');
    setPContent('');
    setShowPassageEditor(true);
  };

  const openEditPassage = (p: Passage) => {
    setEditingPassage(p);
    setPTitle(p.title);
    setPContent(p.content);
    setShowPassageEditor(true);
  };

  const savePassage = async () => {
    if (!activeStory) return;
    if (!pTitle.trim()) {
      Alert.alert('Judul bagian wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editingPassage) {
        await updatePassage(editingPassage.id, { title: pTitle.trim(), content: pContent });
        setPassages((prev) =>
          prev.map((p) =>
            p.id === editingPassage.id ? { ...p, title: pTitle.trim(), content: pContent } : p,
          ),
        );
      } else {
        const offset = passages.length * 60;
        const created = await createPassage(activeStory.id, pTitle.trim(), pContent, offset, offset);
        setPassages((prev) => [...prev, created]);
        if (passages.length === 0) {
          await setStartPassage(activeStory.id, created.id);
          setPassages((prev) => prev.map((p) => (p.id === created.id ? { ...p, is_start: true } : p)));
        }
      }
      setShowPassageEditor(false);
    } catch (e) {
      Alert.alert('Gagal menyimpan', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePassage = (p: Passage) => {
    Alert.alert(
      'Hapus bagian?',
      `"${p.title}" dan semua pilihan yang terhubung akan dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePassage(p.id);
              setPassages((prev) => prev.filter((x) => x.id !== p.id));
            } catch (e) {
              Alert.alert('Gagal menghapus', e instanceof Error ? e.message : undefined);
            }
          },
        },
      ],
    );
  };

  const handleSetStart = async (p: Passage) => {
    if (!activeStory) return;
    try {
      await setStartPassage(activeStory.id, p.id);
      setPassages((prev) => prev.map((x) => ({ ...x, is_start: x.id === p.id })));
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : undefined);
    }
  };

  const openChoices = async (p: Passage) => {
    setChoicesFor(p);
    setShowPassageEditor(false);
    try {
      const data = await fetchChoices(p.id);
      setChoices(data);
    } catch (e) {
      Alert.alert('Gagal memuat pilihan', e instanceof Error ? e.message : undefined);
    }
    setShowChoiceEditor(true);
  };

  const openNewChoice = () => {
    setEditingChoice(null);
    setCText('');
    setCTarget(null);
  };

  const openEditChoice = (c: Choice) => {
    setEditingChoice(c);
    setCText(c.text);
    setCTarget(c.to_passage_id);
  };

  const saveChoice = async () => {
    if (!choicesFor) return;
    if (!cText.trim()) {
      Alert.alert('Teks pilihan wajib diisi');
      return;
    }
    try {
      if (editingChoice) {
        await updateChoice(editingChoice.id, { text: cText.trim(), to_passage_id: cTarget });
        setChoices((prev) =>
          prev.map((c) =>
            c.id === editingChoice.id ? { ...c, text: cText.trim(), to_passage_id: cTarget } : c,
          ),
        );
      } else {
        const sortOrder = choices.length;
        const created = await createChoice(choicesFor.id, cText.trim(), cTarget, sortOrder);
        setChoices((prev) => [...prev, created]);
      }
      setEditingChoice(null);
      setCText('');
      setCTarget(null);
    } catch (e) {
      Alert.alert('Gagal menyimpan pilihan', e instanceof Error ? e.message : undefined);
    }
  };

  const handleDeleteChoice = (c: Choice) => {
    Alert.alert('Hapus pilihan?', undefined, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChoice(c.id);
            setChoices((prev) => prev.filter((x) => x.id !== c.id));
          } catch (e) {
            Alert.alert('Gagal', e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  };

  if (!activeStory) {
    return (
      <EmptyView
        icon={<Pencil size={32} color={Colors.primary[500]} strokeWidth={2} />}
        title="Tidak ada cerita dipilih"
        subtitle="Pilih cerita dari tab Pustaka untuk mulai mengedit bagian dan pilihan."
      />
    );
  }

  if (loading) return <LoadingView message="Memuat bagian..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Editor</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>{activeStory.title}</Text>
      </View>

      <FlatList
        data={passages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyView
            icon={<FileText size={32} color={Colors.primary[500]} strokeWidth={2} />}
            title="Belum ada bagian"
            subtitle="Buat bagian pertama untuk mulai menulis cerita bercabang."
            action={<PrimaryButton label="Buat Bagian" onPress={openNewPassage} />}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.passageCard}>
            <Pressable
              style={({ pressed }) => [styles.passageMain, pressed && { opacity: 0.7 }]}
              onPress={() => openEditPassage(item)}>
              <View style={{ flex: 1 }}>
                <View style={styles.passageHeader}>
                  {item.is_start && (
                    <View style={styles.startBadge}>
                      <Star size={10} color={Colors.accent[600]} strokeWidth={2.5} fill={Colors.accent[400]} />
                      <Text style={styles.startBadgeText}>Mulai</Text>
                    </View>
                  )}
                  <Text style={styles.passageTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                {item.content ? (
                  <Text style={styles.passageContent} numberOfLines={2}>{item.content}</Text>
                ) : (
                  <Text style={styles.passageEmpty}>Bagian kosong</Text>
                )}
              </View>
              <ChevronRight size={20} color={Colors.neutral[300]} strokeWidth={2} />
            </Pressable>
            <View style={styles.passageActions}>
              <Pressable style={styles.passageActionBtn} onPress={() => openChoices(item)}>
                <Link2 size={15} color={Colors.primary[600]} strokeWidth={2} />
                <Text style={styles.passageActionText}>Pilihan</Text>
              </Pressable>
              {!item.is_start && (
                <Pressable style={styles.passageActionBtn} onPress={() => handleSetStart(item)}>
                  <Star size={15} color={Colors.neutral[400]} strokeWidth={2} />
                  <Text style={styles.passageActionTextMuted}>Jadikan Awal</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.passageActionBtn, styles.passageActionDanger]}
                onPress={() => handleDeletePassage(item)}>
                <Trash2 size={15} color={Colors.error[500]} strokeWidth={2} />
                <Text style={styles.passageActionTextDanger}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {passages.length > 0 && (
        <View style={styles.bottomBar}>
          <PrimaryButton label="Buat Bagian" onPress={openNewPassage} style={{ flex: 1 }} />
        </View>
      )}

      {/* Passage Editor Modal */}
      <Modal visible={showPassageEditor} animationType="slide" transparent onRequestClose={() => setShowPassageEditor(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editingPassage ? 'Edit Bagian' : 'Bagian Baru'}</Text>
            <Text style={styles.inputLabel}>Judul</Text>
            <TextInput
              style={styles.input}
              value={pTitle}
              onChangeText={setPTitle}
              placeholder="Contoh: Di Depan Pintu"
              placeholderTextColor={Colors.neutral[300]}
            />
            <Text style={styles.inputLabel}>Isi Cerita</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={pContent}
              onChangeText={setPContent}
              placeholder="Tulis cerita di bagian ini..."
              placeholderTextColor={Colors.neutral[300]}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowPassageEditor(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <PrimaryButton label={saving ? 'Menyimpan...' : 'Simpan'} onPress={savePassage} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Choice Editor Modal */}
      <Modal visible={showChoiceEditor} animationType="slide" transparent onRequestClose={() => setShowChoiceEditor(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.choiceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Pilihan Cerita</Text>
                <Text style={styles.choiceSubtitle} numberOfLines={1}>Dari: {choicesFor?.title}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setShowChoiceEditor(false)}>
                <Text style={styles.closeBtnText}>Tutup</Text>
              </Pressable>
            </View>

            {editingChoice ? (
              <View style={styles.choiceEditForm}>
                <Text style={styles.inputLabel}>Teks Pilihan</Text>
                <TextInput
                  style={styles.input}
                  value={cText}
                  onChangeText={setCText}
                  placeholder="Contoh: Buka pintu itu"
                  placeholderTextColor={Colors.neutral[300]}
                />
                <Text style={styles.inputLabel}>Tujuan</Text>
                <ScrollView>
                  {passages
                    .filter((p) => p.id !== choicesFor?.id)
                    .map((p) => (
                      <Pressable
                        key={p.id}
                        style={[styles.targetItem, cTarget === p.id && styles.targetItemSelected]}
                        onPress={() => setCTarget(p.id)}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.targetItemText} numberOfLines={1}>{p.title}</Text>
                        </View>
                        {cTarget === p.id && <View style={styles.targetCheck} />}
                      </Pressable>
                    ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.modalCancel}
                    onPress={() => { setEditingChoice(null); setCText(''); setCTarget(null); }}>
                    <Text style={styles.modalCancelText}>Kembali</Text>
                  </Pressable>
                  <PrimaryButton label="Simpan Pilihan" onPress={saveChoice} />
                </View>
              </View>
            ) : (
              <View style={{ maxHeight: 400 }}>
                <FlatList
                  data={choices}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={
                    <View style={styles.choiceEmpty}>
                      <Text style={styles.choiceEmptyText}>Belum ada pilihan di bagian ini.</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const target = passages.find((p) => p.id === item.to_passage_id);
                    return (
                      <View style={styles.choiceItem}>
                        <Pressable
                          style={{ flex: 1 }}
                          onPress={() => openEditChoice(item)}>
                          <Text style={styles.choiceText}>{item.text}</Text>
                          <Text style={styles.choiceTarget} numberOfLines={1}>
                            {target ? `→ ${target.title}` : '→ ujung buntu'}
                          </Text>
                        </Pressable>
                        <Pressable hitSlop={12} onPress={() => handleDeleteChoice(item)} style={styles.choiceDelete}>
                          <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
                        </Pressable>
                      </View>
                    );
                  }}
                />
                <View style={{ marginTop: 16 }}>
                  <SecondaryButton label="Tambah Pilihan" onPress={openNewChoice} />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  passageCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
    overflow: 'hidden',
  },
  passageMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  passageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  startBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  passageTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    flexShrink: 1,
  },
  passageContent: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    lineHeight: 18,
  },
  passageEmpty: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[300],
    fontStyle: 'italic',
  },
  passageActions: {
    flexDirection: 'row',
    borderTopColor: Colors.neutral[100],
    borderTopWidth: 1,
  },
  passageActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  passageActionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
  },
  passageActionTextMuted: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[400],
  },
  passageActionTextDanger: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.error[500],
  },
  passageActionDanger: {
    borderLeftColor: Colors.neutral[100],
    borderLeftWidth: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.neutral[0],
    borderTopColor: Colors.neutral[100],
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.neutral[0],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    backgroundColor: Colors.neutral[50],
  },
  textArea: {
    minHeight: 160,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalCancel: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[500],
  },
  // Choice editor
  choiceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  choiceSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    marginTop: 2,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.neutral[100],
  },
  closeBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
  },
  choiceEditForm: {},
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: 8,
    backgroundColor: Colors.neutral[50],
  },
  targetItemSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  targetItemText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[800],
  },
  targetCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary[500],
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomColor: Colors.neutral[100],
    borderBottomWidth: 1,
    gap: 12,
  },
  choiceText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[800],
  },
  choiceTarget: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    marginTop: 4,
  },
  choiceDelete: {
    padding: 6,
  },
  choiceEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  choiceEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
  },
});
