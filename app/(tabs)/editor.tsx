import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
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
  FolderInput,
  MoreHorizontal,
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
  fetchChapters,
  createChapter,
  updateChapter,
  deleteChapter,
} from '@/lib/db';
import type { Passage, Choice, Chapter } from '@/lib/types';
import { useStory } from '@/lib/story-context';

const UNASSIGNED = '__none__';

export default function EditorScreen() {
  const { activeStory } = useStory();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allPassages, setAllPassages] = useState<Passage[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [showPassageEditor, setShowPassageEditor] = useState(false);
  const [showChapterEditor, setShowChapterEditor] = useState(false);
  const [menuChapterId, setMenuChapterId] = useState<string | null>(null);
  const [choicesFor, setChoicesFor] = useState<Passage | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [movePassage, setMovePassage] = useState<Passage | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>(UNASSIGNED);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const initialized = useRef(false);
  const creatingInChapter = useRef<string>(UNASSIGNED);

  const [pTitle, setPTitle] = useState('');
  const [pContent, setPContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chTitle, setChTitle] = useState('');
  const [chSaving, setChSaving] = useState(false);

  const [editingChoice, setEditingChoice] = useState<Choice | null>(null);
  const [showChoiceForm, setShowChoiceForm] = useState(false);
  const [cText, setCText] = useState('');
  const [cTarget, setCTarget] = useState<string | null>(null);

  const unassignedPassages = allPassages.filter((p) => p.chapter_id === null);
  const getChapterPassages = (chId: string) => allPassages.filter((p) => p.chapter_id === chId);

  const toggleChapter = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadChapters = useCallback(async () => {
    if (!activeStory) return;
    try {
      const data = await fetchChapters(activeStory.id);
      setChapters(data);
      if (!initialized.current) {
        const initExpanded = new Set<string>([UNASSIGNED]);
        data.forEach((ch) => initExpanded.add(ch.id));
        setExpanded(initExpanded);
        initialized.current = true;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat bab');
    }
  }, [activeStory]);

  const loadPassages = useCallback(async () => {
    if (!activeStory) return;
    try {
      setError(null);
      const data = await fetchPassages(activeStory.id);
      setAllPassages(data);
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
      loadChapters().then(() => loadPassages());
    } else {
      setChapters([]);
      setAllPassages([]);
      setLoading(false);
      initialized.current = false;
    }
  }, [activeStory, loadChapters, loadPassages]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChapters().then(() => loadPassages());
  };

  // --- Chapter operations ---

  const openNewChapter = () => {
    setEditingChapter(null);
    setChTitle('');
    setShowChapterEditor(true);
  };

  const openEditChapter = (ch: Chapter) => {
    setEditingChapter(ch);
    setChTitle(ch.title);
    setShowChapterEditor(true);
    setMenuChapterId(null);
  };

  const saveChapter = async () => {
    if (!activeStory) return;
    if (!chTitle.trim()) {
      setError('Judul bab wajib diisi');
      return;
    }
    setChSaving(true);
    try {
      if (editingChapter) {
        await updateChapter(editingChapter.id, { title: chTitle.trim() });
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === editingChapter.id ? { ...ch, title: chTitle.trim() } : ch,
          ),
        );
      } else {
        const sortOrder = chapters.length;
        const created = await createChapter(activeStory.id, chTitle.trim(), sortOrder);
        setChapters((prev) => [...prev, created]);
        setExpanded((prev) => new Set(prev).add(created.id));
      }
      setShowChapterEditor(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan bab');
    } finally {
      setChSaving(false);
    }
  };

  const handleDeleteChapter = (ch: Chapter) => {
    setConfirmDialog({
      title: 'Hapus bab?',
      message: `"${ch.title}" akan dihapus. Bagian di dalamnya tidak terhapus, tapi menjadi tanpa bab.`,
      onConfirm: async () => {
        try {
          await deleteChapter(ch.id);
          setChapters((prev) => prev.filter((x) => x.id !== ch.id));
          setAllPassages((prev) =>
            prev.map((p) => (p.chapter_id === ch.id ? { ...p, chapter_id: null } : p)),
          );
          setExpanded((prev) => {
            const next = new Set(prev);
            next.delete(ch.id);
            next.add(UNASSIGNED);
            return next;
          });
          setMenuChapterId(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Gagal menghapus');
        }
      },
    });
  };

  const handleDeleteAllUnassigned = () => {
    if (unassignedPassages.length === 0) return;
    setConfirmDialog({
      title: 'Hapus semua bagian tanpa bab?',
      message: `${unassignedPassages.length} bagian akan dihapus beserta pilihannya.`,
      onConfirm: async () => {
        try {
          for (const p of unassignedPassages) {
            await deletePassage(p.id);
          }
          setAllPassages((prev) => prev.filter((p) => p.chapter_id !== null));
          setMenuChapterId(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Gagal menghapus');
        }
      },
    });
  };

  // --- Passage operations ---

  const openNewPassage = (chapterId: string) => {
    creatingInChapter.current = chapterId;
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
      setError('Judul bagian wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const chapterId = creatingInChapter.current === UNASSIGNED ? null : creatingInChapter.current;
      if (editingPassage) {
        await updatePassage(editingPassage.id, { title: pTitle.trim(), content: pContent });
        setAllPassages((prev) =>
          prev.map((p) =>
            p.id === editingPassage.id ? { ...p, title: pTitle.trim(), content: pContent } : p,
          ),
        );
      } else {
        const chPassages = chapterId === null ? unassignedPassages : getChapterPassages(chapterId);
        const offset = chPassages.length * 60;
        const created = await createPassage(
          activeStory.id,
          pTitle.trim(),
          pContent,
          offset,
          offset,
          chapterId,
        );
        setAllPassages((prev) => [...prev, created]);
        if (allPassages.length === 0) {
          await setStartPassage(activeStory.id, created.id);
          setAllPassages((prev) =>
            prev.map((p) => (p.id === created.id ? { ...p, is_start: true } : p)),
          );
        }
      }
      setShowPassageEditor(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePassage = (p: Passage) => {
    setConfirmDialog({
      title: 'Hapus bagian?',
      message: `"${p.title}" dan semua pilihan yang terhubung akan dihapus.`,
      onConfirm: async () => {
        try {
          await deletePassage(p.id);
          setAllPassages((prev) => prev.filter((x) => x.id !== p.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Gagal menghapus');
        }
      },
    });
  };

  const handleSetStart = async (p: Passage) => {
    if (!activeStory) return;
    try {
      await setStartPassage(activeStory.id, p.id);
      setAllPassages((prev) => prev.map((x) => ({ ...x, is_start: x.id === p.id })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal');
    }
  };

  // --- Move / Copy passage ---

  const openMovePassage = (p: Passage) => {
    setMovePassage(p);
    setMoveTarget(UNASSIGNED);
  };

  const handleMovePassage = async () => {
    if (!movePassage) return;
    const newChapterId = moveTarget === UNASSIGNED ? null : moveTarget;
    try {
      await updatePassage(movePassage.id, { chapter_id: newChapterId });
      setAllPassages((prev) =>
        prev.map((p) => (p.id === movePassage.id ? { ...p, chapter_id: newChapterId } : p)),
      );
      setExpanded((prev) => new Set(prev).add(moveTarget));
      setMovePassage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memindahkan');
    }
  };

  const handleCopyPassage = async () => {
    if (!movePassage || !activeStory) return;
    const newChapterId = moveTarget === UNASSIGNED ? null : moveTarget;
    try {
      const chPassages = newChapterId === null ? unassignedPassages : getChapterPassages(newChapterId);
      const offset = (chPassages.length + 1) * 60;
      const created = await createPassage(
        activeStory.id,
        movePassage.title,
        movePassage.content,
        offset,
        offset,
        newChapterId,
      );
      const passageChoices = await fetchChoices(movePassage.id);
      for (const c of passageChoices) {
        await createChoice(created.id, c.text, c.to_passage_id, c.sort_order);
      }
      setAllPassages((prev) => [...prev, created]);
      setExpanded((prev) => new Set(prev).add(moveTarget));
      setMovePassage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyalin');
    }
  };

  // --- Choice operations ---

  const openChoices = async (p: Passage) => {
    setChoicesFor(p);
    setShowPassageEditor(false);
    try {
      const data = await fetchChoices(p.id);
      setChoices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat pilihan');
    }
  };

  const openNewChoice = () => {
    setEditingChoice(null);
    setCText('');
    setCTarget(null);
    setShowChoiceForm(true);
  };

  const openEditChoice = (c: Choice) => {
    setEditingChoice(c);
    setCText(c.text);
    setCTarget(c.to_passage_id);
    setShowChoiceForm(true);
  };

  const saveChoice = async () => {
    if (!choicesFor) return;
    if (!cText.trim()) {
      setError('Teks pilihan wajib diisi');
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
      setShowChoiceForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan pilihan');
    }
  };

  const handleDeleteChoice = (c: Choice) => {
    setConfirmDialog({
      title: 'Hapus pilihan?',
      message: '',
      onConfirm: async () => {
        try {
          await deleteChoice(c.id);
          setChoices((prev) => prev.filter((x) => x.id !== c.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Gagal menghapus');
        }
      },
    });
  };

  // --- Render helpers ---

  const renderPassageCard = (p: Passage) => (
    <View key={p.id} style={styles.passageCard}>
      <Pressable
        style={({ pressed }) => [styles.passageMain, pressed && { opacity: 0.7 }]}
        onPress={() => openEditPassage(p)}>
        <View style={{ flex: 1 }}>
          <View style={styles.passageHeader}>
            {p.is_start && (
              <View style={styles.startBadge}>
                <Star size={10} color={Colors.accent[600]} strokeWidth={2.5} fill={Colors.accent[400]} />
                <Text style={styles.startBadgeText}>Mulai</Text>
              </View>
            )}
            <Text style={styles.passageTitle} numberOfLines={1}>{p.title}</Text>
          </View>
          {p.content ? (
            <Text style={styles.passageContent} numberOfLines={2}>{p.content}</Text>
          ) : (
            <Text style={styles.passageEmpty}>Bagian kosong</Text>
          )}
        </View>
        <ChevronRight size={20} color={Colors.neutral[300]} strokeWidth={2} />
      </Pressable>
      <View style={styles.passageActions}>
        <Pressable style={styles.passageActionBtn} onPress={() => openChoices(p)}>
          <Link2 size={14} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.passageActionText}>Pilihan</Text>
        </Pressable>
        <Pressable style={styles.passageActionBtn} onPress={() => openMovePassage(p)}>
          <FolderInput size={14} color={Colors.neutral[600]} strokeWidth={2} />
          <Text style={styles.passageActionTextMuted}>Pindah</Text>
        </Pressable>
        {!p.is_start && (
          <Pressable style={styles.passageActionBtn} onPress={() => handleSetStart(p)}>
            <Star size={14} color={Colors.neutral[400]} strokeWidth={2} />
            <Text style={styles.passageActionTextMuted}>Awal</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.passageActionBtn, styles.passageActionDanger]}
          onPress={() => handleDeletePassage(p)}>
          <Trash2 size={14} color={Colors.error[500]} strokeWidth={2} />
          <Text style={styles.passageActionTextDanger}>Hapus</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderAddPassageBtn = (chapterId: string) => (
    <Pressable
      style={({ pressed }) => [styles.addPassageBtn, pressed && { opacity: 0.7 }]}
      onPress={() => openNewPassage(chapterId)}>
      <Plus size={16} color={Colors.primary[600]} strokeWidth={2.5} />
      <Text style={styles.addPassageText}>Tambah Bagian</Text>
    </Pressable>
  );

  const renderAccordion = (id: string, title: string, count: number) => {
    const isExpanded = expanded.has(id);
    const chPassages = id === UNASSIGNED ? unassignedPassages : getChapterPassages(id);
    return (
      <View key={id} style={styles.accordionSection}>
        <View style={styles.accordionHeader}>
          <Pressable
            style={styles.accordionHeaderLeft}
            onPress={() => toggleChapter(id)}>
            <View style={[styles.chevronWrap, isExpanded && styles.chevronExpanded]}>
              <ChevronRight size={16} color={Colors.neutral[500]} strokeWidth={2.5} />
            </View>
            <Text style={styles.accordionTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.accordionCount}>
              <Text style={styles.accordionCountText}>{count}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.accordionMenuBtn}
            onPress={() => setMenuChapterId(id)}
            hitSlop={8}>
            <MoreHorizontal size={18} color={Colors.neutral[400]} strokeWidth={2} />
          </Pressable>
        </View>
        {isExpanded && (
          <View style={styles.accordionBody}>
            {chPassages.length > 0 ? (
              chPassages.map(renderPassageCard)
            ) : (
              <Text style={styles.accordionEmpty}>Belum ada bagian di sini.</Text>
            )}
            {renderAddPassageBtn(id)}
          </View>
        )}
      </View>
    );
  };

  // --- Render guards ---

  if (!activeStory) {
    if (loading) return <LoadingView message="Memuat cerita..." />;
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

  const isEmpty = chapters.length === 0 && allPassages.length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Editor</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>{activeStory.title}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {isEmpty ? (
          <EmptyView
            icon={<FileText size={32} color={Colors.primary[500]} strokeWidth={2} />}
            title="Belum ada bab atau bagian"
            subtitle="Mulai dengan membuat bab pertama atau bagian pertama."
            action={
              <View style={{ gap: 10 }}>
                <PrimaryButton label="Buat Bab" onPress={openNewChapter} />
                <SecondaryButton label="Buat Bagian Tanpa Bab" onPress={() => openNewPassage(UNASSIGNED)} />
              </View>
            }
          />
        ) : (
          <>
            {unassignedPassages.length > 0 && renderAccordion(UNASSIGNED, 'Tanpa Bab', unassignedPassages.length)}
            {chapters.map((ch) =>
              renderAccordion(ch.id, ch.title, getChapterPassages(ch.id).length),
            )}
            <Pressable
              style={({ pressed }) => [styles.addChapterBtn, pressed && { opacity: 0.7 }]}
              onPress={openNewChapter}>
              <Plus size={18} color={Colors.primary[600]} strokeWidth={2.5} />
              <Text style={styles.addChapterText}>Tambah Bab</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

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

      {/* Chapter Editor Modal */}
      <Modal visible={showChapterEditor} animationType="slide" transparent onRequestClose={() => setShowChapterEditor(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editingChapter ? 'Edit Bab' : 'Bab Baru'}</Text>
            <Text style={styles.inputLabel}>Judul Bab</Text>
            <TextInput
              style={styles.input}
              value={chTitle}
              onChangeText={setChTitle}
              placeholder="Contoh: Bab 1 — Awal Mula"
              placeholderTextColor={Colors.neutral[300]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowChapterEditor(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <PrimaryButton label={chSaving ? 'Menyimpan...' : 'Simpan'} onPress={saveChapter} disabled={chSaving} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Chapter / Unassigned Context Menu */}
      <Modal visible={menuChapterId !== null} animationType="fade" transparent onRequestClose={() => setMenuChapterId(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuChapterId(null)}>
          <View style={styles.menuSheet}>
            {(() => {
              if (!menuChapterId) return null;
              if (menuChapterId === UNASSIGNED) {
                return (
                  <>
                    <Text style={styles.menuTitle}>Tanpa Bab</Text>
                    {unassignedPassages.length > 0 && (
                      <Pressable
                        style={[styles.menuItem, styles.menuItemDanger]}
                        onPress={handleDeleteAllUnassigned}>
                        <Trash2 size={18} color={Colors.error[600]} strokeWidth={2} />
                        <Text style={styles.menuItemTextDanger}>Hapus Semua Bagian</Text>
                      </Pressable>
                    )}
                  </>
                );
              }
              const ch = chapters.find((x) => x.id === menuChapterId);
              if (!ch) return null;
              return (
                <>
                  <Text style={styles.menuTitle} numberOfLines={1}>{ch.title}</Text>
                  <Pressable style={styles.menuItem} onPress={() => openEditChapter(ch)}>
                    <Pencil size={18} color={Colors.neutral[700]} strokeWidth={2} />
                    <Text style={styles.menuItemText}>Ganti Nama Bab</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.menuItem, styles.menuItemDanger]}
                    onPress={() => handleDeleteChapter(ch)}>
                    <Trash2 size={18} color={Colors.error[600]} strokeWidth={2} />
                    <Text style={styles.menuItemTextDanger}>Hapus Bab</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>

      {/* Move/Copy Passage Modal */}
      <Modal visible={movePassage !== null} animationType="slide" transparent onRequestClose={() => setMovePassage(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Pindah / Salin Bagian</Text>
            <Text style={styles.moveSubtitle} numberOfLines={1}>{movePassage?.title}</Text>
            <Text style={styles.inputLabel}>Pilih bab tujuan:</Text>
            <ScrollView style={styles.moveList}>
              {(() => {
                const currentCh = movePassage?.chapter_id ?? UNASSIGNED;
                if (currentCh !== UNASSIGNED) {
                  return (
                    <Pressable
                      style={[styles.targetItem, moveTarget === UNASSIGNED && styles.targetItemSelected]}
                      onPress={() => setMoveTarget(UNASSIGNED)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.targetItemText}>Tanpa Bab</Text>
                      </View>
                      {moveTarget === UNASSIGNED && <View style={styles.targetCheck} />}
                    </Pressable>
                  );
                }
                return null;
              })()}
              {chapters
                .filter((ch) => ch.id !== (movePassage?.chapter_id ?? ''))
                .map((ch) => (
                  <Pressable
                    key={ch.id}
                    style={[styles.targetItem, moveTarget === ch.id && styles.targetItemSelected]}
                    onPress={() => setMoveTarget(ch.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.targetItemText} numberOfLines={1}>{ch.title}</Text>
                    </View>
                    {moveTarget === ch.id && <View style={styles.targetCheck} />}
                  </Pressable>
                ))}
            </ScrollView>
            <View style={styles.moveActions}>
              <Pressable style={styles.modalCancel} onPress={() => setMovePassage(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <SecondaryButton label="Salin ke Bab" onPress={handleCopyPassage} />
              <PrimaryButton label="Pindahkan" onPress={handleMovePassage} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Choice Editor Modal */}
      <Modal visible={choicesFor !== null} animationType="slide" transparent onRequestClose={() => setChoicesFor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.choiceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Pilihan Cerita</Text>
                <Text style={styles.choiceSubtitle} numberOfLines={1}>Dari: {choicesFor?.title}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setChoicesFor(null)}>
                <Text style={styles.closeBtnText}>Tutup</Text>
              </Pressable>
            </View>

            {showChoiceForm ? (
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
                  {allPassages
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
                    onPress={() => { setEditingChoice(null); setCText(''); setCTarget(null); setShowChoiceForm(false); }}>
                    <Text style={styles.modalCancelText}>Kembali</Text>
                  </Pressable>
                  <PrimaryButton label="Simpan Pilihan" onPress={saveChoice} />
                </View>
              </View>
            ) : (
              <View style={{ maxHeight: 400 }}>
                <ScrollView>
                  {choices.length === 0 ? (
                    <View style={styles.choiceEmpty}>
                      <Text style={styles.choiceEmptyText}>Belum ada pilihan di bagian ini.</Text>
                    </View>
                  ) : (
                    choices.map((item) => {
                      const target = allPassages.find((p) => p.id === item.to_passage_id);
                      return (
                        <View key={item.id} style={styles.choiceItem}>
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
                    })
                  )}
                </ScrollView>
                <View style={{ marginTop: 16 }}>
                  <SecondaryButton label="Tambah Pilihan" onPress={openNewChoice} />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirm Dialog */}
      <Modal visible={confirmDialog !== null} animationType="fade" transparent onRequestClose={() => setConfirmDialog(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setConfirmDialog(null)}>
          <View style={styles.confirmSheet}>
            {confirmDialog && <Text style={styles.confirmTitle}>{confirmDialog.title}</Text>}
            {confirmDialog && confirmDialog.message ? (
              <Text style={styles.confirmMessage}>{confirmDialog.message}</Text>
            ) : null}
            <View style={styles.confirmActions}>
              <Pressable style={styles.modalCancel} onPress={() => setConfirmDialog(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  const fn = confirmDialog?.onConfirm;
                  setConfirmDialog(null);
                  if (fn) fn();
                }}>
                <Text style={styles.confirmBtnText}>Hapus</Text>
              </Pressable>
            </View>
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
    paddingBottom: 80,
  },
  // Accordion
  accordionSection: {
    marginBottom: 10,
    backgroundColor: Colors.neutral[0],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accordionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevronWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  accordionTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[800],
    flex: 1,
  },
  accordionCount: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  accordionCountText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[500],
  },
  accordionMenuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 2,
  },
  accordionEmpty: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[300],
    fontStyle: 'italic',
    paddingVertical: 16,
    textAlign: 'center',
  },
  // Passage card (inside accordion)
  passageCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
    overflow: 'hidden',
  },
  passageMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
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
    fontSize: 15,
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
    gap: 5,
    paddingVertical: 10,
  },
  passageActionText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
  },
  passageActionTextMuted: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[400],
  },
  passageActionTextDanger: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.error[500],
  },
  passageActionDanger: {
    borderLeftColor: Colors.neutral[100],
    borderLeftWidth: 1,
  },
  addPassageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary[100],
    borderStyle: 'dashed',
    backgroundColor: Colors.neutral[50],
    marginTop: 4,
  },
  addPassageText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
  },
  addChapterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addChapterText: {
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
  // Move/copy
  moveSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    marginTop: 2,
  },
  moveList: {
    maxHeight: 200,
    marginTop: 8,
  },
  moveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    flexWrap: 'wrap',
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
  // Confirm dialog
  confirmSheet: {
    backgroundColor: Colors.neutral[0],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  confirmTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  confirmBtn: {
    backgroundColor: Colors.error[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: Colors.neutral[0],
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});
