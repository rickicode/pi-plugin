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
HONCHO_SHARED_PEERS=hermes,coding   # opsional, default kosong
```

Catatan urutan file: `~/.honcho/.env` → `~/.pi/agent/.env` → `~/.omp/agent/.env` → `./.env`. File yang dimuat belakangan **menimpa** nilai sebelumnya, jadi bila `~/.omp/agent/.env` masih berisi workspace lama, konfigurasi itu yang menang.

---

## Daftar Tool yang Disediakan

| Tool | Fungsi |
|---|---|
| `honcho_remember` | Menyimpan preferensi, keputusan arsitektur, atau koreksi permanen ke Honcho. |
| `honcho_search` | Melakukan pencarian semantik terhadap kesimpulan (*conclusions*) dan percakapan. |
| `honcho_chat` | Bertanya langsung ke dialektika AI synthesizer Honcho mengenai konteks lampau. |
| `honcho_context` | Mengambil profil kartu pengguna (*user card*) dan *insights* aktif. |

## Berbagi Memori dengan Hermes

Satu workspace Honcho tidak punya query conclusion lintas-peer. Agar `pi` dan
Hermes memakai memori yang sama, `HONCHO_SHARED_PEERS` diisi nama AI peer lain di
workspace yang sama (contoh Hermes: `hermes,coding`).

- **Baca**: `honcho_search` menyatukan conclusion dari scope
  `aiPeer→userPeer`, `aiPeer→aiPeer`, dan untuk tiap peer bersama
  `peer→userPeer` serta `peer→peer`, lalu mencari pesan lewat endpoint
  workspace-wide `/peers/{userPeer|aiPeer}/search` — melihat semua session,
  bukan hanya session satu direktori.
- **Tulis**: `honcho_remember` menyimpan conclusion dengan
  `observer_id = HONCHO_AI_PEER`, `observed_id = HONCHO_USER_PEER` sehingga
  dibaca balik oleh agent lain dengan scope yang sama.
- Retry 4× dengan backoff eksponensial + jitter, dan konkurensi dibatasi (3
  untuk conclusion, 2 untuk pesan), karena endpoint self-hosted menolak
  connection churn saat request fan-out menumpuk.

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
