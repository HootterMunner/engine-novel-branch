# 🗺️ ROAD.md - Peta Project Ravonel

**Apa ini?** Aplikasi mobile untuk bikin dan main cerita interaktif (kayak visual novel).

---

## 📱 Apa yang Bisa Dilakukan App Ini?

1. **Bikin cerita** - Tulis cerita dengan pilihan berbeda (kayak game pilihan)
2. **Edit cerita** - Atur chapter, passage (bagian cerita), dan pilihan
3. **Main cerita** - Baca cerita yang udah dibuat, pilih opsi berbeda
4. **Lihat peta** - Visualisasi alur cerita (passage mana nyambung ke mana)
5. **Ekspor/Impor** - Simpan cerita jadi file JSON, bisa share ke orang lain

---

## 📂 Struktur Folder (Yang Penting Aja)

```
project/
├── app/                    ← Semua halaman/screen
│   └── (tabs)/            ← 4 tab utama
│       ├── index.tsx      → Tab 1: PUSTAKA (daftar cerita)
│       ├── editor.tsx     → Tab 2: EDITOR (edit cerita)
│       ├── play.tsx       → Tab 3: MAIN (baca cerita)
│       └── map.tsx        → Tab 4: PETA (visualisasi alur)
│
├── components/            ← Komponen UI yang bisa dipakai ulang
│   └── ui.tsx            → Button, Loading, Error view, dll
│
├── lib/                   ← Logic & fungsi penting
│   ├── db.ts             → Fungsi database (simpan/ambil data)
│   ├── types.ts          → Definisi tipe data (Story, Chapter, dll)
│   ├── theme.ts          → Warna & style
│   ├── supabase.ts       → Koneksi ke database Supabase
│   └── story-context.tsx → State global (cerita yang lagi aktif)
│
├── supabase/              ← Database setup
│   └── migrations/       → Script bikin tabel database
│
└── assets/                ← Gambar, icon, dll
```

---

## 🎯 Konsep Dasar

### 1. **Story** (Cerita)
- Satu project cerita lengkap
- Punya: judul, deskripsi, penulis

### 2. **Chapter** (Bab)
- Cerita dibagi jadi beberapa chapter
- Contoh: Chapter 1: Prolog, Chapter 2: Petualangan Dimulai

### 3. **SubChapter** (Sub-bab)
- Chapter bisa punya sub-chapter (opsional)
- Buat organisasi yang lebih detail

### 4. **Passage** (Bagian Cerita)
- Satu layar cerita
- Isinya: judul + teks cerita + koordinat (buat di peta)
- Passage pertama ditandai `is_start: true`

### 5. **Choice** (Pilihan)
- Tombol pilihan di akhir passage
- Setiap pilihan nyambung ke passage lain
- Contoh: "Masuk ke gua" → nyambung ke Passage #5

---

## 🔄 Alur Kerja User

```
PUSTAKA → pilih cerita → EDITOR → tulis passage & pilihan
                          ↓
                       PETA → liat alur cerita
                          ↓
                       MAIN → baca & pilih opsi
```

---

## 🛠️ Tech Stack (Teknologi yang Dipakai)

- **React Native + Expo** → Framework buat bikin app mobile
- **TypeScript** → JavaScript yang lebih strict
- **Supabase** → Database cloud (kayak Firebase)
- **Expo Router** → Sistem navigasi antar halaman
- **Lucide Icons** → Icon library

---

## 🗃️ Database (Tabel di Supabase)

1. **stories** → Data cerita (judul, deskripsi, penulis)
2. **chapters** → Daftar chapter di cerita
3. **subchapters** → Sub-chapter (opsional)
4. **passages** → Konten cerita (text, posisi di peta)
5. **choices** → Pilihan yang muncul di passage
6. **chapter_links** → Link antar chapter (buat visualisasi)

---

## 🎨 Fitur Setiap Tab

### 📚 Tab 1: PUSTAKA (index.tsx)
**Fungsi:** Lihat semua cerita yang udah dibuat

- Bikin cerita baru
- Hapus cerita
- Ekspor cerita jadi JSON
- Impor cerita dari JSON
- Pilih cerita → otomatis pindah ke Editor

### ✏️ Tab 2: EDITOR (editor.tsx)
**Fungsi:** Edit isi cerita

- Bikin passage baru (bagian cerita + pilihan)
- Edit passage yang udah ada
- Atur chapter & subchapter
- Link passage pakai choice
- Hapus passage/chapter

### 🎮 Tab 3: MAIN (play.tsx)
**Fungsi:** Baca cerita kayak main game

- Mulai dari passage pertama
- Baca text cerita
- Pilih opsi yang muncul
- Lanjut ke passage berikutnya sesuai pilihan
- Tracking progress (udah baca passage mana aja)

### 🗺️ Tab 4: PETA (map.tsx)
**Fungsi:** Liat alur cerita secara visual

- Node = passage
- Garis = choice yang nyambungin passage
- Drag & drop buat atur posisi
- Zoom in/out
- Klik node → edit passage

---

## 🚀 Cara Jalanin Project

1. **Install dependencies:**
   ```bash
   cd project
   npm install
   ```

2. **Setup Supabase:**
   - Bikin project di [supabase.com](https://supabase.com)
   - Copy URL & API key
   - Paste di file `.env`

3. **Run app:**
   ```bash
   npm run dev
   ```

4. **Pilih platform:**
   - Press `i` → iOS simulator (Mac only)
   - Press `a` → Android emulator
   - Press `w` → Web browser
   - Scan QR → Test di HP langsung (pakai Expo Go app)

---

## 📝 File Penting & Fungsinya

| File | Fungsi |
|------|--------|
| `lib/db.ts` | Semua fungsi database (create, read, update, delete) |
| `lib/types.ts` | Definisi struktur data (interface) |
| `lib/theme.ts` | Warna & style app |
| `lib/supabase.ts` | Koneksi ke database Supabase |
| `components/ui.tsx` | Komponen button, loading, error view |
| `app/(tabs)/index.tsx` | Screen pustaka (daftar cerita) |
| `app/(tabs)/editor.tsx` | Screen editor (bikin/edit cerita) |
| `app/(tabs)/play.tsx` | Screen main cerita |
| `app/(tabs)/map.tsx` | Screen peta alur cerita |

---

## 🐛 Hal Yang Perlu Dirapiin (TODO)

### ❌ Masalah Sekarang:
1. **Kode terlalu panjang** - File `index.tsx` 563 baris (terlalu banyak)
2. **Logic campur UI** - Business logic ada di component, harusnya dipisah
3. **Duplikasi style** - Banyak style yang mirip, bisa bikin shared style
4. **Error handling kurang** - Belum handle semua edge case
5. **Belum ada unit test** - Rawan bug kalau nambah fitur baru

### ✅ Yang Harus Dilakukan:
1. **Refactor:** Pisahin logic ke custom hooks
2. **Shared components:** Extract modal, card, dll jadi component terpisah
3. **Constants:** Bikin file `constants.ts` buat text & config
4. **Testing:** Tambahin unit test buat fungsi database
5. **TypeScript strict:** Aktifin strict mode, fix semua `any` type
6. **Performance:** Optimasi rendering (memo, callback)

---

## 💡 Cara Nambah Fitur Baru

**Contoh: Mau nambah fitur "Favorit Cerita"**

1. **Update database** → Tambah kolom `is_favorite` di tabel `stories`
2. **Update type** → Tambah `is_favorite: boolean` di interface `Story` (lib/types.ts)
3. **Bikin fungsi** → Tambah `toggleFavorite()` di `lib/db.ts`
4. **Update UI** → Tambah icon bintang di card cerita (index.tsx)
5. **Test** → Coba favorit/unfavorit cerita

---

## 🎯 Roadmap (Fitur Masa Depan)

- [ ] Sistem save/load progress otomatis
- [ ] Multi-ending tracking (liat ending mana aja yang udah dicapai)
- [ ] Gambar custom buat setiap passage
- [ ] Background music & sound effect
- [ ] Achievement system
- [ ] Share cerita online (publish ke community)
- [ ] Collaborative editing (edit bareng temen)

---

## 📞 Butuh Bantuan?

Kalo stuck, tanya aja di chat. Aku bisa:
- Jelasin kode yang bikin bingung
- Bikin fitur baru
- Fix bug
- Refactor kode yang berantakan
- Tambahin comment di kode

---

**Last Updated:** 2026-11-01  
**Version:** 1.0.0  
**Status:** 🟢 Development Active
