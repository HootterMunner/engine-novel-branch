import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, BookOpen, Download, Upload, MoreVertical, Trash2, Edit3, Download as DownloadIcon, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { LoadingView, ErrorView, EmptyView, PrimaryButton } from '@/components/ui';
import { fetchStories, createStory, deleteStory, exportStory, importStory } from '@/lib/db';
import type { Story } from '@/lib/types';
import { useStory } from '@/lib/story-context';

export default function LibraryScreen() {
  const { activeStory, setActiveStory } = useStory();
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [menuFor, setMenuFor] = useState<Story | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [creating, setCreating] = useState(false);

  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchStories();
      setStories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat cerita');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Judul wajib diisi');
      return;
    }
    setCreating(true);
    try {
      const story = await createStory(newTitle.trim(), newDesc.trim(), newAuthor.trim());
      setStories((prev) => [story, ...prev]);
      setActiveStory(story);
      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
      setNewAuthor('');
    } catch (e) {
      Alert.alert('Gagal membuat cerita', e instanceof Error ? e.message : undefined);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (story: Story) => {
    setMenuFor(null);
    Alert.alert(
      'Hapus cerita?',
      `"${story.title}" akan dihapus beserta semua bagian dan pilihannya.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStory(story.id);
              setStories((prev) => prev.filter((s) => s.id !== story.id));
              if (activeStory?.id === story.id) {
                setActiveStory(null);
              }
            } catch (e) {
              Alert.alert('Gagal menghapus', e instanceof Error ? e.message : undefined);
            }
          },
        },
      ],
    );
  };

  const handleExport = async (story: Story) => {
    setMenuFor(null);
    try {
      const data = await exportStory(story.id);
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        message: json,
        title: `${story.title}.novel.json`,
      });
    } catch (e) {
      Alert.alert('Gagal mengekspor', e instanceof Error ? e.message : undefined);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert('Tempelkan isi file JSON terlebih dahulu');
      return;
    }
    setImporting(true);
    try {
      const parsed = JSON.parse(importText.trim());
      const story = await importStory(parsed);
      setStories((prev) => [story, ...prev]);
      setActiveStory(story);
      setShowImport(false);
      setImportText('');
    } catch (e) {
      Alert.alert(
        'Gagal mengimpor',
        e instanceof Error ? e.message : 'Pastikan format JSON sudah benar',
      );
    } finally {
      setImporting(false);
    }
  };

  const openStory = (story: Story) => {
    setActiveStory(story);
    router.navigate('/(tabs)/editor');
  };

  if (loading) return <LoadingView message="Memuat pustaka..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pustaka</Text>
        <Text style={styles.headerSubtitle}>{stories.length} cerita</Text>
      </View>

      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyView
            icon={<BookOpen size={32} color={Colors.primary[500]} strokeWidth={2} />}
            title="Belum ada cerita"
            subtitle="Buat cerita pertamamu atau impor dari file untuk mulai menulis."
            action={
              <View style={{ gap: 10 }}>
                <PrimaryButton label="Buat Cerita Baru" onPress={() => setShowCreate(true)} />
                <Pressable
                  style={styles.importLink}
                  onPress={() => setShowImport(true)}>
                  <Upload size={16} color={Colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.importLinkText}>Impor dari JSON</Text>
                </Pressable>
              </View>
            }
          />
        }
        renderItem={({ item }) => {
          const isActive = activeStory?.id === item.id;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.storyCard,
                isActive && styles.storyCardActive,
                pressed && styles.storyCardPressed,
              ]}
              onPress={() => openStory(item)}>
              <View style={styles.storyCardLeft}>
                <View style={[styles.storyIcon, isActive && styles.storyIconActive]}>
                  {isActive ? (
                    <CheckCircle2 size={20} color={Colors.primary[600]} strokeWidth={2} />
                  ) : (
                    <BookOpen size={20} color={Colors.primary[600]} strokeWidth={2} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storyTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={styles.storyDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  {item.author ? (
                    <Text style={styles.storyAuthor}>oleh {item.author}</Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                hitSlop={12}
                onPress={() => setMenuFor(item)}
                style={styles.menuBtn}>
                <MoreVertical size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </Pressable>
            </Pressable>
          );
        }}
      />

      {stories.length > 0 && (
        <View style={styles.bottomBar}>
          <PrimaryButton label="Buat Cerita Baru" onPress={() => setShowCreate(true)} style={{ flex: 1 }} />
          <Pressable
            style={styles.importBtn}
            onPress={() => setShowImport(true)}>
            <Upload size={20} color={Colors.primary[600]} strokeWidth={2} />
          </Pressable>
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Cerita Baru</Text>
            <Text style={styles.inputLabel}>Judul</Text>
            <TextInput
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Contoh: Petualangan di Hutan"
              placeholderTextColor={Colors.neutral[300]}
            />
            <Text style={styles.inputLabel}>Deskripsi (opsional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Sinopsis singkat..."
              placeholderTextColor={Colors.neutral[300]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.inputLabel}>Penulis (opsional)</Text>
            <TextInput
              style={styles.input}
              value={newAuthor}
              onChangeText={setNewAuthor}
              placeholder="Nama Anda"
              placeholderTextColor={Colors.neutral[300]}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <PrimaryButton label={creating ? 'Membuat...' : 'Buat'} onPress={handleCreate} disabled={creating} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={showImport} animationType="slide" transparent onRequestClose={() => setShowImport(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Impor Cerita</Text>
            <Text style={styles.importHint}>
              Tempelkan isi file JSON yang diekspor dari aplikasi ini.
            </Text>
            <TextInput
              style={[styles.input, styles.importArea]}
              value={importText}
              onChangeText={setImportText}
              placeholder='{"version":"1.0",...}'
              placeholderTextColor={Colors.neutral[300]}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowImport(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <PrimaryButton label={importing ? 'Mengimpor...' : 'Impor'} onPress={handleImport} disabled={importing} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Context Menu */}
      <Modal visible={menuFor !== null} animationType="fade" transparent onRequestClose={() => setMenuFor(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuFor(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle} numberOfLines={1}>{menuFor?.title}</Text>
            <Pressable style={styles.menuItem} onPress={() => menuFor && handleExport(menuFor)}>
              <DownloadIcon size={18} color={Colors.neutral[700]} strokeWidth={2} />
              <Text style={styles.menuItemText}>Ekspor (Bagikan JSON)</Text>
            </Pressable>
            <Pressable style={[styles.menuItem, styles.menuItemDanger]} onPress={() => menuFor && handleDelete(menuFor)}>
              <Trash2 size={18} color={Colors.error[600]} strokeWidth={2} />
              <Text style={styles.menuItemTextDanger}>Hapus Cerita</Text>
            </Pressable>
          </View>
        </Pressable>
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
  storyCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  storyCardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: Colors.primary[200],
  },
  storyCardActive: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
    backgroundColor: Colors.primary[50],
  },
  storyIconActive: {
    backgroundColor: Colors.primary[100],
  },
  storyCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  storyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  storyDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    lineHeight: 18,
  },
  storyAuthor: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    marginTop: 4,
  },
  menuBtn: {
    padding: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.neutral[0],
    borderTopColor: Colors.neutral[100],
    borderTopWidth: 1,
  },
  importBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  importLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  importLinkText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
  },
  // Modals
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
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
    marginBottom: 6,
    marginTop: 12,
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
    minHeight: 80,
  },
  importArea: {
    minHeight: 160,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  importHint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    lineHeight: 20,
    marginBottom: 16,
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
  // Context menu
  menuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuSheet: {
    backgroundColor: Colors.neutral[0],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomColor: Colors.neutral[100],
    borderBottomWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
  },
  menuItemDanger: {
    borderTopColor: Colors.neutral[100],
    borderTopWidth: 1,
    marginTop: 4,
  },
  menuItemTextDanger: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.error[600],
  },
});
