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
  Layers,
  ArrowRight,
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
  fetchAllSubChapters,
  createSubChapter,
  updateSubChapter,
  deleteSubChapter,
  fetchChapterLinks,
  createChapterLink,
  deleteChapterLink,
} from '@/lib/db';
import type { Passage, Choice, Chapter, SubChapter, ChapterLink } from '@/lib/types';
import { useStory } from '@/lib/story-context';

const UNASSIGNED = '__none__';

export default function EditorScreen() {
  const { activeStory } = useStory();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allPassages, setAllPassages] = useState<Passage[]>([]);
  const [subChapters, setSubChapters] = useState<SubChapter[]>([]);
  const [chapterLinks, setChapterLinks] = useState<ChapterLink[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [showPassageEditor, setShowPassageEditor] = useState(false);
  const [showChapterEditor, setShowChapterEditor] = useState(false);
  const [showSubChapterEditor, setShowSubChapterEditor] = useState(false);
  const [menuChapterId, setMenuChapterId] = useState<string | null>(null);
  const [menuSubChapterId, setMenuSubChapterId] = useState<string | null>(null);
  const [choicesFor, setChoicesFor] = useState<Passage | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [movePassage, setMovePassage] = useState<Passage | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>(UNASSIGNED);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [linkFromChapter, setLinkFromChapter] = useState<string | null>(null);
  const [linkToChapter, setLinkToChapter] = useState<string | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const initialized = useRef(false);
  const creatingInChapter = useRef<string>(UNASSIGNED);
  const creatingInSubChapter = useRef<string | null>(null);

  const [pTitle, setPTitle] = useState('');
  const [pContent, setPContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chTitle, setChTitle] = useState('');
  const [chSaving, setChSaving] = useState(false);

  const [editingSubChapter, setEditingSubChapter] = useState<SubChapter | null>(null);
  const [subChTitle, setSubChTitle] = useState('');
  const [subChSaving, setSubChSaving] = useState(false);

  const [editingChoice, setEditingChoice] = useState<Choice | null>(null);
  const [showChoiceForm, setShowChoiceForm] = useState(false);
  const [cText, setCText] = useState('');
  const [cTarget, setCTarget] = useState<string | null>(null);

  const unassignedPassages = allPassages.filter((p) => p.chapter_id === null);
  const getChapterPassages = (chId: string) =>
    allPassages.filter((p) => p.chapter_id === chId && !p.subchapter_id);
  const getSubChapterPassages = (subChId: string) =>
    allPassages.filter((p) => p.subchapter_id === subChId);
  const getChapterSubChapters = (chId: string) =>
    subChapters.filter((sc) => sc.chapter_id === chId);
  const getLinksFrom = (chId: string) => chapterLinks.filter((l) => l.from_chapter_id === chId);

  const toggleChapter = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    if (!activeStory) return;
    try {
      setError(null);
      const [chData, paData, subData, linkData] = await Promise.all([
        fetchChapters(activeStory.id),
        fetchPassages(activeStory.id),
        fetchAllSubChapters(activeStory.id),
        fetchChapterLinks(activeStory.id),
      ]);
      setChapters(chData);
      setAllPassages(paData);
      setSubChapters(subData);
      setChapterLinks(linkData);
      if (!initialized.current) {
        const initExpanded = new Set<string>([UNASSIGNED]);
        chData.forEach((ch) => initExpanded.add(ch.id));
        setExpanded(initExpanded);
        initialized.current = true;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStory]);

  useEffect(() => {
    if (activeStory) {
      setLoading(true);
      loadData();
    } else {
      setChapters([]);
      setAllPassages([]);
      setSubChapters([]);
      setChapterLinks([]);
      setLoading(false);
      initialized.current = false;
    }
  }, [activeStory, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
          prev.map((ch) => (ch.id === editingChapter.id ? { ...ch, title: chTitle.trim() } : ch)),
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
          setSubChapters((prev) => prev.filter((sc) => sc.chapter_id !== ch.id));
          setAllPassages((prev) =>
            prev.map((p) => (p.chapter_id === ch.id ? { ...p, chapter_id: null, subchapter_id: null } : p)),
          );
          setChapterLinks((prev) =>
            prev.filter((l) => l.from_chapter_id !== ch.id && l.to_chapter_id !== ch.id),
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

  // --- SubChapter operations ---

  const openNewSubChapter = (chapterId: string) => {
    setEditingSubChapter(null);
    setSubChTitle('');
    creatingInChapter.current = chapterId;
    setShowSubChapterEditor(true);
    setMenuChapterId(null);
  };

  const openEditSubChapter = (sc: SubChapter) => {
    setEditingSubChapter(sc);
    setSubChTitle(sc.title);
    setShowSubChapterEditor(true);
    setMenuSubChapterId(null);
  };

  const saveSubChapter = async () => {
    if (!subChTitle.trim()) {
      setError('Judul sub-bab wajib diisi');
      return;
    }
    setSubChSaving(true);
    try {
      if (editingSubChapter) {
        await updateSubChapter(editingSubChapter.id, { title: subChTitle.trim() });
        setSubChapters((prev) =>
          prev.map((sc) => (sc.id === editingSubChapter.id ? { ...sc, title: subChTitle.trim() } : sc)),
        );
      } else {
        const chSubs = getChapterSubChapters(creatingInChapter.current);
        const created = await createSubChapter(creatingInChapter.current, subChTitle.trim(), chSubs.length);
        setSubChapters((prev) => [...prev, created]);
      }
      setShowSubChapterEditor(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan sub-bab');
    } finally {
      setSubChSaving(false);
    }
  };

  const handleDeleteSubChapter = (sc: SubChapter) => {
    setConfirmDialog({
      title: 'Hapus sub-bab?',
      message: `"${sc.title}" akan dihapus. Bagian di dalamnya kembali ke bab utama.`,
      onConfirm: async () => {
        try {
          await deleteSubChapter(sc.id);
          setSubChapters((prev) => prev.filter((x) => x.id !== sc.id));
          setAllPassages((prev) =>
            prev.map((p) => (p.subchapter_id === sc.id ? { ...p, subchapter_id: null } : p)),
          );
          setMenuSubChapterId(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Gagal menghapus');
        }
      },
    });
  };

  // --- Chapter Link operations ---

  const openNewLink = (fromChapterId: string) => {
    setLinkFromChapter(fromChapterId);
    setLinkToChapter(null);
    setLinkLabel('');
    setShowLinkEditor(true);
    setMenuChapterId(null);
  };

  const saveLink = async () => {
    if (!activeStory || !linkFromChapter || !linkToChapter) {
      setError('Pilih bab tujuan');
      return;
    }
    if (linkFromChapter === linkToChapter) {
      setError('Tidak bisa menghubungkan ke bab yang sama');
      return;
    }
    try {
      const created = await createChapterLink(activeStory.id, linkFromChapter, linkToChapter, linkLabel.trim());
      setChapterLinks((prev) => [...prev, created]);
      setShowLinkEditor(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat tautan');
    }
  };

  const handleDeleteLink = (link: ChapterLink) => {
    setConfirmDialog({
      title: 'Hapus tautan?',
      message: 'Tautan antar bab ini akan dihapus.',
      onConfirm: async () => {
        try {
          await deleteChapterLink(link.id);
          setChapterLinks((prev) => prev.filter((x) => x.id !== link.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Gagal menghapus');
        }
      },
    });
  };

  // --- Passage operations ---

  const openNewPassage = (chapterId: string, subChapterId: string | null = null) => {
    creatingInChapter.current = chapterId;
    creatingInSubChapter.current = subChapterId;
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
      const subChapterId = creatingInSubChapter.current;
      if (editingPassage) {
        await updatePassage(editingPassage.id, { title: pTitle.trim(), content: pContent });
        setAllPassages((prev) =>
          prev.map((p) => (p.id === editingPassage.id ? { ...p, title: pTitle.trim(), content: pContent } : p)),
        );
      } else {
        const existing = subChapterId ? getSubChapterPassages(subChapterId) : chapterId === null ? unassignedPassages : getChapterPassages(chapterId);
        const offset = existing.length * 60;
        const created = await createPassage(activeStory.id, pTitle.trim(), pContent, offset, offset, chapterId);
        if (subChapterId) {
          await updatePassage(created.id, { subchapter_id: subChapterId });
        }
        setAllPassages((prev) => [...prev, subChapterId ? { ...created, subchapter_id: subChapterId } : created]);
        if (allPassages.length === 0) {
          await setStartPassage(activeStory.id, created.id);
          setAllPassages((prev) => prev.map((p) => (p.id === created.id ? { ...p, is_start: true } : p)));
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
      await updatePassage(movePassage.id, { chapter_id: newChapterId, subchapter_id: null });
      setAllPassages((prev) =>
        prev.map((p) => (p.id === movePassage.id ? { ...p, chapter_id: newChapterId, subchapter_id: null } : p)),
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
      const existing = newChapterId === null ? unassignedPassages : getChapterPassages(newChapterId);
      const offset = (existing.length + 1) * 60;
      const created = await createPassage(activeStory.id, movePassage.title, movePassage.content, offset, offset, newChapterId);
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
          prev.map((c) => (c.id === editingChoice.id ? { ...c, text: cText.trim(), to_passage_id: cTarget } : c)),
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
        <Pressable style={[styles.passageActionBtn, styles.passageActionDanger]} onPress={() => handleDeletePassage(p)}>
          <Trash2 size={14} color={Colors.error[500]} strokeWidth={2} />
          <Text style={styles.passageActionTextDanger}>Hapus</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderAddPassageBtn = (label: string, onPress: () => void) => (
    <Pressable
      style={({ pressed }) => [styles.addPassageBtn, pressed && { opacity: 0.7 }]}
      onPress={onPress}>
      <Plus size={16} color={Colors.primary[600]} strokeWidth={2.5} />
      <Text style={styles.addPassageText}>{label}</Text>
    </Pressable>
  );

  const renderSubChapterSection = (sc: SubChapter) => {
    const isExpanded = expanded.has(sc.id);
    const scPassages = getSubChapterPassages(sc.id);
    return (
      <View key={sc.id} style={styles.subChSection}>
        <View style={styles.subChHeader}>
          <Pressable style={styles.subChHeaderLeft} onPress={() => toggleChapter(sc.id)}>
            <View style={[styles.chevronWrap, isExpanded && styles.chevronExpanded]}>
              <ChevronRight size={14} color={Colors.neutral[500]} strokeWidth={2.5} />
            </View>
            <Layers size={14} color={Colors.primary[500]} strokeWidth={2} />
            <Text style={styles.subChTitle} numberOfLines={1}>{sc.title}</Text>
            <View style={styles.subChCount}>
              <Text style={styles.subChCountText}>{scPassages.length}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.subChMenuBtn} onPress={() => setMenuSubChapterId(sc.id)} hitSlop={8}>
            <MoreHorizontal size={16} color={Colors.neutral[400]} strokeWidth={2} />
          </Pressable>
        </View>
        {isExpanded && (
          <View style={styles.subChBody}>
            {scPassages.length > 0 ? (
              scPassages.map(renderPassageCard)
            ) : (
              <Text style={styles.subChEmpty}>Belum ada bagian.</Text>
            )}
            {renderAddPassageBtn('Tambah Bagian', () => {
              const ch = chapters.find((c) => c.id === sc.chapter_id);
              openNewPassage(ch?.id ?? UNASSIGNED, sc.id);
            })}
          </View>
        )}
      </View>
    );
  };

  const renderLinkRow = (link: ChapterLink) => {
    const toCh = chapters.find((c) => c.id === link.to_chapter_id);
    return (
      <View key={link.id} style={styles.linkRow}>
        <ArrowRight size={14} color={Colors.primary[500]} strokeWidth={2} />
        <Text style={styles.linkText} numberOfLines={1}>
          {link.label ? link.label : toCh?.title ?? '?'}
        </Text>
        <Pressable hitSlop={8} onPress={() => handleDeleteLink(link)}>
          <Trash2 size={13} color={Colors.error[500]} strokeWidth={2} />
        </Pressable>
      </View>
    );
  };

  const renderAccordion = (id: string, title: string, count: number) => {
    const isExpanded = expanded.has(id);
    const chPassages = id === UNASSIGNED ? unassignedPassages : getChapterPassages(id);
    const chSubs = id === UNASSIGNED ? [] : getChapterSubChapters(id);
    const chLinks = id === UNASSIGNED ? [] : getLinksFrom(id);
    const isRealChapter = id !== UNASSIGNED;

    return (
      <View key={id} style={styles.accordionSection}>
        <View style={styles.accordionHeader}>
          <Pressable style={styles.accordionHeaderLeft} onPress={() => toggleChapter(id)}>
            <View style={[styles.chevronWrap, isExpanded && styles.chevronExpanded]}>
              <ChevronRight size={16} color={Colors.neutral[500]} strokeWidth={2.5} />
            </View>
            <Text style={styles.accordionTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.accordionCount}>
              <Text style={styles.accordionCountText}>{count}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.accordionMenuBtn} onPress={() => setMenuChapterId(id)} hitSlop={8}>
            <MoreHorizontal size={18} color={Colors.neutral[400]} strokeWidth={2} />
          </Pressable>
        </View>
        {isExpanded && (
          <View style={styles.accordionBody}>
            {/* Direct passages */}
            {chPassages.length > 0 && chPassages.map(renderPassageCard)}

            {/* Sub-chapters */}
            {chSubs.map(renderSubChapterSection)}

            {/* Chapter links */}
            {chLinks.length > 0 && (
              <View style={styles.linkSection}>
                <Text style={styles.linkSectionLabel}>Tautan ke bab lain:</Text>
                {chLinks.map(renderLinkRow)}
              </View>
            )}

            {/* Empty state */}
            {chPassages.length === 0 && chSubs.length === 0 && chLinks.length === 0 && (
              <Text style={styles.accordionEmpty}>Belum ada bagian di sini.</Text>
            )}

            {/* Action buttons */}
            {renderAddPassageBtn('Tambah Bagian', () => openNewPassage(id, null))}
            {isRealChapter && (
              <View style={styles.accordionActions}>
                <Pressable style={styles.subActionBtn} onPress={() => openNewSubChapter(id)}>
                  <Layers size={14} color={Colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.subActionText}>Sub-Bab</Text>
                </Pressable>
                <Pressable style={styles.subActionBtn} onPress={() => openNewLink(id)}>
                  <Link2 size={14} color={Colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.subActionText}>Taut Bab</Text>
                </Pressable>
              </View>
            )}
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
            {chapters.map((ch) => renderAccordion(ch.id, ch.title, getChapterPassages(ch.id).length))}
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
            <TextInput style={styles.input} value={pTitle} onChangeText={setPTitle} placeholder="Contoh: Di Depan Pintu" placeholderTextColor={Colors.neutral[300]} />
            <Text style={styles.inputLabel}>Isi Cerita</Text>
            <TextInput style={[styles.input, styles.textArea]} value={pContent} onChangeText={setPContent} placeholder="Tulis cerita di bagian ini..." placeholderTextColor={Colors.neutral[300]} multiline textAlignVertical="top" />
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
            <TextInput style={styles.input} value={chTitle} onChangeText={setChTitle} placeholder="Contoh: Bab 1 — Awal Mula" placeholderTextColor={Colors.neutral[300]} autoFocus />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowChapterEditor(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <PrimaryButton label={chSaving ? 'Menyimpan...' : 'Simpan'} onPress={saveChapter} disabled={chSaving} />
            </View>
          </View>
        </View>
      </Modal>

      {/* SubChapter Editor Modal */}
      <Modal visible={showSubChapterEditor} animationType="slide" transparent onRequestClose={() => setShowSubChapterEditor(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editingSubChapter ? 'Edit Sub-Bab' : 'Sub-Bab Baru'}</Text>
            <Text style={styles.inputLabel}>Judul Sub-Bab</Text>
            <TextInput style={styles.input} value={subChTitle} onChangeText={setSubChTitle} placeholder="Contoh: Bagian A — Kedatangan" placeholderTextColor={Colors.neutral[300]} autoFocus />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowSubChapterEditor(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <PrimaryButton label={subChSaving ? 'Menyimpan...' : 'Simpan'} onPress={saveSubChapter} disabled={subChSaving} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Chapter Link Editor Modal */}
      <Modal visible={showLinkEditor} animationType="slide" transparent onRequestClose={() => setShowLinkEditor(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Tautkan ke Bab Lain</Text>
            <Text style={styles.inputLabel}>Label (opsional)</Text>
            <TextInput style={styles.input} value={linkLabel} onChangeText={setLinkLabel} placeholder="Contoh: Lanjut ke bab berikutnya" placeholderTextColor={Colors.neutral[300]} />
            <Text style={styles.inputLabel}>Pilih bab tujuan:</Text>
            <ScrollView style={styles.moveList}>
              {chapters
                .filter((ch) => ch.id !== linkFromChapter)
                .map((ch) => (
                  <Pressable
                    key={ch.id}
                    style={[styles.targetItem, linkToChapter === ch.id && styles.targetItemSelected]}
                    onPress={() => setLinkToChapter(ch.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.targetItemText} numberOfLines={1}>{ch.title}</Text>
                    </View>
                    {linkToChapter === ch.id && <View style={styles.targetCheck} />}
                  </Pressable>
                ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowLinkEditor(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <PrimaryButton label="Tautkan" onPress={saveLink} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Chapter Context Menu */}
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
                      <Pressable style={[styles.menuItem, styles.menuItemDanger]} onPress={handleDeleteAllUnassigned}>
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
                  <Pressable style={styles.menuItem} onPress={() => openNewSubChapter(ch.id)}>
                    <Layers size={18} color={Colors.neutral[700]} strokeWidth={2} />
                    <Text style={styles.menuItemText}>Tambah Sub-Bab</Text>
                  </Pressable>
                  <Pressable style={styles.menuItem} onPress={() => openNewLink(ch.id)}>
                    <Link2 size={18} color={Colors.neutral[700]} strokeWidth={2} />
                    <Text style={styles.menuItemText}>Tautkan ke Bab Lain</Text>
                  </Pressable>
                  <Pressable style={[styles.menuItem, styles.menuItemDanger]} onPress={() => handleDeleteChapter(ch)}>
                    <Trash2 size={18} color={Colors.error[600]} strokeWidth={2} />
                    <Text style={styles.menuItemTextDanger}>Hapus Bab</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>

      {/* SubChapter Context Menu */}
      <Modal visible={menuSubChapterId !== null} animationType="fade" transparent onRequestClose={() => setMenuSubChapterId(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuSubChapterId(null)}>
          <View style={styles.menuSheet}>
            {(() => {
              if (!menuSubChapterId) return null;
              const sc = subChapters.find((x) => x.id === menuSubChapterId);
              if (!sc) return null;
              return (
                <>
                  <Text style={styles.menuTitle} numberOfLines={1}>{sc.title}</Text>
                  <Pressable style={styles.menuItem} onPress={() => openEditSubChapter(sc)}>
                    <Pencil size={18} color={Colors.neutral[700]} strokeWidth={2} />
                    <Text style={styles.menuItemText}>Ganti Nama Sub-Bab</Text>
                  </Pressable>
                  <Pressable style={[styles.menuItem, styles.menuItemDanger]} onPress={() => handleDeleteSubChapter(sc)}>
                    <Trash2 size={18} color={Colors.error[600]} strokeWidth={2} />
                    <Text style={styles.menuItemTextDanger}>Hapus Sub-Bab</Text>
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
                <TextInput style={styles.input} value={cText} onChangeText={setCText} placeholder="Contoh: Buka pintu itu" placeholderTextColor={Colors.neutral[300]} />
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
                  <Pressable style={styles.modalCancel} onPress={() => { setEditingChoice(null); setCText(''); setCTarget(null); setShowChoiceForm(false); }}>
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
                          <Pressable style={{ flex: 1 }} onPress={() => openEditChoice(item)}>
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
            {confirmDialog && confirmDialog.message ? <Text style={styles.confirmMessage}>{confirmDialog.message}</Text> : null}
            <View style={styles.confirmActions}>
              <Pressable style={styles.modalCancel} onPress={() => setConfirmDialog(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}
                onPress={() => { const fn = confirmDialog?.onConfirm; setConfirmDialog(null); if (fn) fn(); }}>
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
  screen: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    backgroundColor: Colors.neutral[0],
    borderBottomColor: Colors.neutral[100], borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter-Bold', color: Colors.neutral[900] },
  headerSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.neutral[400], marginTop: 4 },
  list: { padding: 16, paddingBottom: 80 },
  // Accordion
  accordionSection: {
    marginBottom: 10, backgroundColor: Colors.neutral[0], borderRadius: 14,
    borderWidth: 1, borderColor: Colors.neutral[100], overflow: 'hidden',
  },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  accordionHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevronWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },
  accordionTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.neutral[800], flex: 1 },
  accordionCount: {
    backgroundColor: Colors.neutral[100], borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center',
  },
  accordionCountText: { fontSize: 11, fontFamily: 'Inter-Bold', color: Colors.neutral[500] },
  accordionMenuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  accordionBody: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 },
  accordionEmpty: {
    fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.neutral[300],
    fontStyle: 'italic', paddingVertical: 16, textAlign: 'center',
  },
  accordionActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  subActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: Colors.primary[50], flex: 1, justifyContent: 'center',
  },
  subActionText: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.primary[600] },
  // Sub-chapter
  subChSection: {
    backgroundColor: Colors.neutral[50], borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  subChHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  subChHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  subChTitle: { fontSize: 13, fontFamily: 'Inter-Bold', color: Colors.neutral[700], flex: 1 },
  subChCount: {
    backgroundColor: Colors.neutral[200], borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center',
  },
  subChCountText: { fontSize: 10, fontFamily: 'Inter-Bold', color: Colors.neutral[600] },
  subChMenuBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  subChBody: { paddingHorizontal: 8, paddingBottom: 8 },
  subChEmpty: {
    fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.neutral[300],
    fontStyle: 'italic', paddingVertical: 10, textAlign: 'center',
  },
  // Links
  linkSection: {
    backgroundColor: Colors.primary[50], borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6,
  },
  linkSectionLabel: { fontSize: 11, fontFamily: 'Inter-Bold', color: Colors.primary[600], marginBottom: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  linkText: { flex: 1, fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.neutral[700] },
  // Passage card
  passageCard: {
    backgroundColor: Colors.neutral[50], borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.neutral[100], overflow: 'hidden',
  },
  passageMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  passageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  startBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accent[50], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  startBadgeText: { fontSize: 10, fontFamily: 'Inter-Bold', color: Colors.accent[600] },
  passageTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: Colors.neutral[900], flexShrink: 1 },
  passageContent: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.neutral[500], lineHeight: 18 },
  passageEmpty: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.neutral[300], fontStyle: 'italic' },
  passageActions: { flexDirection: 'row', borderTopColor: Colors.neutral[100], borderTopWidth: 1 },
  passageActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
  },
  passageActionText: { fontSize: 11, fontFamily: 'Inter-Medium', color: Colors.primary[600] },
  passageActionTextMuted: { fontSize: 11, fontFamily: 'Inter-Medium', color: Colors.neutral[400] },
  passageActionTextDanger: { fontSize: 11, fontFamily: 'Inter-Medium', color: Colors.error[500] },
  passageActionDanger: { borderLeftColor: Colors.neutral[100], borderLeftWidth: 1 },
  addPassageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.primary[100], borderStyle: 'dashed',
    backgroundColor: Colors.neutral[50], marginTop: 4,
  },
  addPassageText: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.primary[600] },
  addChapterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.neutral[200], borderStyle: 'dashed', marginTop: 4,
  },
  addChapterText: { fontSize: 14, fontFamily: 'Inter-Medium', color: Colors.primary[600] },
  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.neutral[0], borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36, maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: Colors.neutral[900] },
  inputLabel: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.neutral[600], marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    fontFamily: 'Inter-Regular', color: Colors.neutral[900], backgroundColor: Colors.neutral[50],
  },
  textArea: { minHeight: 160 },
  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  modalCancel: { paddingVertical: 14, paddingHorizontal: 20 },
  modalCancelText: { fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.neutral[500] },
  // Context menu
  menuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  menuSheet: {
    backgroundColor: Colors.neutral[0], borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  menuTitle: {
    fontSize: 16, fontFamily: 'Inter-Bold', color: Colors.neutral[900],
    marginBottom: 16, paddingBottom: 16, borderBottomColor: Colors.neutral[100], borderBottomWidth: 1,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  menuItemText: { fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.neutral[700] },
  menuItemDanger: { borderTopColor: Colors.neutral[100], borderTopWidth: 1, marginTop: 4 },
  menuItemTextDanger: { fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.error[600] },
  // Move/copy
  moveSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.neutral[400], marginTop: 2 },
  moveList: { maxHeight: 200, marginTop: 8 },
  moveActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  // Choice editor
  choiceHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  choiceSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.neutral[400], marginTop: 2 },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Colors.neutral[100] },
  closeBtnText: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.neutral[600] },
  choiceEditForm: {},
  targetItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[200],
    marginBottom: 8, backgroundColor: Colors.neutral[50],
  },
  targetItemSelected: { borderColor: Colors.primary[500], backgroundColor: Colors.primary[50] },
  targetItemText: { fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.neutral[800] },
  targetCheck: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[500] },
  choiceItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomColor: Colors.neutral[100], borderBottomWidth: 1, gap: 12,
  },
  choiceText: { fontSize: 15, fontFamily: 'Inter-Medium', color: Colors.neutral[800] },
  choiceTarget: { fontSize: 12, fontFamily: 'Inter-Regular', color: Colors.neutral[400], marginTop: 4 },
  choiceDelete: { padding: 6 },
  choiceEmpty: { paddingVertical: 24, alignItems: 'center' },
  choiceEmptyText: { fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.neutral[400] },
  // Confirm dialog
  confirmSheet: {
    backgroundColor: Colors.neutral[0], borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  confirmTitle: { fontSize: 17, fontFamily: 'Inter-Bold', color: Colors.neutral[900], marginBottom: 8 },
  confirmMessage: { fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.neutral[500], lineHeight: 20 },
  confirmActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  confirmBtn: { backgroundColor: Colors.error[500], paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  confirmBtnText: { color: Colors.neutral[0], fontSize: 15, fontFamily: 'Inter-Bold' },
});
