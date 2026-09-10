# FLUXMOD License Server

Endpoint:
- GET  /health
- POST /activate
- POST /check
- POST /reset
- POST /admin/create
- POST /revoke

Durasi yang tersedia: 1, 3, 7, 30 hari.

## Deploy Railway

1. Upload semua file ke GitHub.
2. Buat project Railway dari repository.
3. Railway akan menjalankan `npm start`.
4. Tambahkan environment variable:
   - `FEEDBACK_API_KEY` = API key rahasia kamu.
5. Setelah deploy, tes:
   - `https://DOMAIN-RAILWAY/health`

## Contoh membuat key

POST /admin/create
Header:
x-api-key: API_KEY_KAMU

JSON:
{"days":7}

## Contoh aktivasi

POST /activate

JSON:
{"key":"FLUX-XXXX-XXXX-XXXX"}

## Contoh cek

POST /check

JSON:
{"key":"FLUX-XXXX-XXXX-XXXX"}

Catatan:
Versi ini memakai file JSON lokal. Pada hosting yang filesystem-nya ephemeral, data lisensi dapat hilang saat instance dibuat ulang/deploy. Untuk produksi, pindahkan penyimpanan lisensi ke database persisten (mis. PostgreSQL).
