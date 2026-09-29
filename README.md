# pi-plugin

Bundle plugin Pi Coding Agent buatan ricki. Satu instalasi mengaktifkan semua extension:

```bash
pi install git:github.com/rickicode/pi-plugin
```

Update:

```bash
pi update
```

## Isi bundle

| Plugin | Tipe | Fungsi |
| --- | --- | --- |
| [`pi-omp-graft`](./pi-omp-graft) | extension + skill | Graft context graph: call-graph, blast radius, symbol jump, auto context discovery (AST analysis via `graft`) |
| [`pi-honcho`](./pi-honcho) | extension | Memory Honcho self-hosted: `honcho_remember`, `honcho_search`, `honcho_chat`, `honcho_context` (baca kredensial dari `.env`) |
| [`herdr-agent-state`](./herdr-agent-state) | reference | File ekstensi state reporting Herdr (`idle`/`working`/`blocked`/`done` via RPC socket). **TIDAK dimuat oleh bundle ini** — sudah diinstall & di-manage otomatis oleh `herdr integration install pi` ke `~/.pi/agent/extensions/`. |

Catatan dual-agent: `pi-omp-graft` dan `pi-honcho` keduanya punya manifest `omp` juga, jadi bisa dipakai OMP dengan `omp plugin link` ke folder plugin masing-masing.

## Konfigurasi (opsional)

### pi-honcho

Baca kredensial dari file `.env` (urutan prioritas: `./.env` → `~/.pi/agent/.env` → `~/.omp/agent/.env` → `~/.honcho/.env`):

```ini
HONCHO_BASE_URL=http://127.0.0.1:8000
HONCHO_API_KEY=<your-honcho-api-key>
HONCHO_WORKSPACE_ID=pi-memory
HONCHO_USER_PEER=user
HONCHO_AI_PEER=pi
```

Tanpa konfigurasi, tool tetap terdaftar dan memakai default localhost.

### pi-omp-graft

Butuh binary [`graft`](https://github.com/search?q=graft+context+graph) di `PATH`. Skill `graft` ikut ter-load dari bundle.

## Instalasi individual (tanpa bundle)

```bash
pi install git:github.com/rickicode/pi-plugin#pi-honcho   # tidak didukung Pi — pakai bundle
pi install ./pi-honcho        # dari clone lokal
```

Pi tidak mendukung sub-path git, jadi untuk plugin tunggal clone repo lalu install path lokalnya.

## Lisensi

MIT. `pi-honcho` adalah tweak fork dari [`giuseppecrj/pi-honcho`](https://github.com/giuseppecrj/pi-honcho) (lihat `pi-honcho/THIRD_PARTY_NOTICES.md`).
