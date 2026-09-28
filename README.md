# Resume Builder

Aplikasi web statis berbahasa Indonesia untuk menyusun resume dengan editor bertahap, pratinjau langsung berukuran A4, dan ekspor melalui dialog cetak browser.

## Fitur

- Editor resume bertahap dengan navigasi antarbagian.
- Informasi pribadi, pengalaman profesional, pendidikan, organisasi, dan informasi lainnya.
- Entri berulang, poin pencapaian, tautan dengan alias, serta section opsional Sertifikat, Skill, dan Project.
- Pengubahan judul dan urutan section; “Lainnya” dan “Tinjau” tetap berada di akhir.
- Pratinjau yang diperbarui langsung saat data berubah.
- Pengaturan font, ukuran teks, jarak baris, warna aksen, dan perataan teks.
- Layout responsif untuk layar kecil.
- Ekspor resume melalui fitur cetak browser ke PDF.

## Menjalankan

Tidak perlu instalasi dependency atau proses build.

1. Buka [`index.html`](./index.html) di browser.
2. Isi resume melalui panel editor.
3. Tinjau hasilnya di panel pratinjau.
4. Pilih **Ekspor PDF** atau **Unduh PDF**, kemudian pilih **Simpan sebagai PDF** pada dialog cetak.

Website juga dapat dijalankan dari server statis lokal. Pastikan `index.html`, `styles.css`, dan `app.js` berada pada lokasi yang sama.

## Struktur proyek

```text
.
├── index.html                 # Kerangka antarmuka dan elemen aplikasi
├── styles.css                 # Tema, layout, responsivitas, dan CSS cetak
├── app.js                     # Data, formulir, navigasi, preview, dan ekspor
├── DOKUMENTASI.md             # Dokumentasi teknis terperinci
├── requirements/              # Dokumen kebutuhan dan rancangan awal
└── archive-formatted/         # Arsip referensi; bukan bagian runtime aplikasi
```

## Catatan penting

- Aplikasi berjalan di browser dan tidak mengirim data ke server.
- Data hanya tersimpan di memori selama halaman terbuka. Memuat ulang atau menutup tab akan menghapus data yang belum disalin atau diekspor.
- Ekspor PDF menggunakan `window.print()`; hasil akhir bergantung pada browser dan pengaturan dialog cetak.
- Aplikasi menyediakan format resume yang ditujukan untuk ATS, tetapi tidak menjalankan pengujian terhadap ATS tertentu dan tidak menjamin hasil diterima oleh setiap sistem.

