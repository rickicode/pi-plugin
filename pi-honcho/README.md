# pi-honcho (Self-Hosted / Local Honcho Edition)

Tweak fork dari `pi-honcho` yang didesain khusus untuk server Honcho **self-hosted** (Dewacloud, VPS, atau Docker local `127.0.0.1:8000`).
Mendukung penuh baik **Pi** (`pi`) maupun **OMP** (`omp`).

## Keunggulan Versi Tweak Ini

1. **Zero "Unconfigured" Lockout**:
   - Membuang validasi OAuth cloud dan sistem registry `honcho-memory.json` yang sering menyebabkan status `unconfigured`.
   - Tool (`honcho_search`, `honcho_remember`, `honcho_chat`, `honcho_context`) selalu terdaftar dan langsung siap dipakai.
2. **Pure `.env` File Configuration**:
   - Kredensial dan endpoint dibaca langsung dari file `.env`.
   - Tidak memerlukan `export` di shell (`bash` / `fish` / `zsh`).
3. **Dual Agent Support**:
   - Manifest ganda (`pi` dan `omp`) dalam satu package.

---

## File Konfigurasi `.env`

File dibaca otomatis dengan urutan prioritas:
1. `.env` di folder kerja saat ini (`./.env`)
2. `~/.pi/agent/.env`
3. `~/.omp/agent/.env`
4. `~/.honcho/.env`

Isi file `.env`:
```ini
HONCHO_BASE_URL=http://127.0.0.1:8000
HONCHO_API_KEY=<your-honcho-api-key>
HONCHO_WORKSPACE_ID=pi-memory
HONCHO_USER_PEER=user
HONCHO_AI_PEER=pi
```

---

## Daftar Tool yang Disediakan

| Tool | Fungsi |
|---|---|
| `honcho_remember` | Menyimpan preferensi, keputusan arsitektur, atau koreksi permanen ke Honcho. |
| `honcho_search` | Melakukan pencarian semantik terhadap kesimpulan (*conclusions*) dan percakapan. |
| `honcho_chat` | Bertanya langsung ke dialektika AI synthesizer Honcho mengenai konteks lampau. |
| `honcho_context` | Mengambil profil kartu pengguna (*user card*) dan *insights* aktif. |

---

## Slash Commands

- `/honcho-status`: Menampilkan ringkasan koneksi dan status server Honcho.
- `/honcho-remember <teks>`: Menyimpan kesimpulan langsung dari prompt.

---

## Instalasi

```bash
# Untuk Pi
pi install /workspaces/pi-honcho

# Untuk OMP
omp plugin link /workspaces/pi-honcho
```
