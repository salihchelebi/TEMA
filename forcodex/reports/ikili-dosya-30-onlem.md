# İkili Dosya Hatasını Tekrar Yaşamamak İçin 30 Önlem

1. Generated video dosyalarını Git'e ekleme: `forcodex/videos/*.webm` ignore.
2. Generated screenshot dosyalarını Git'e ekleme: `forcodex/screenshots/*.png` ignore.
3. Root `screenshots/*.png` çıktısını ignore et.
4. Root `verification/*.webm` çıktısını ignore et.
5. Token içeren `kurulum.sh` dosyasını ignore et.
6. `.codex-auth/` klasörünü ignore et.
7. `.gitattributes` ile `*.webm binary` tanımla.
8. `.gitattributes` ile `*.png binary` tanımla.
9. `.gitattributes` ile arşivleri binary tanımla: `*.zip`, `*.gz`.
10. Metin dosyalarında LF kullan: `* text=auto eol=lf`.
11. `.liquid`, `.json`, `.py`, `.md`, `.txt` dosyalarını text olarak tanımla.
12. Branch diff'inde binary marker kontrolü yap: `git diff --numstat BASE..HEAD`.
13. Branch diff'inde medya uzantısı kontrolü yap.
14. Staged dosyalarda medya uzantısı kontrolü yap.
15. Untracked generated medya varsa sil.
16. Generated klasörlerde sadece `.gitkeep` commit et.
17. Raporları `.md` veya `.txt` olarak yaz.
18. JSON rapor gerekiyorsa sadece küçük text JSON commit et.
19. Video yolunu raporda yaz, video dosyasını commit etme.
20. Screenshot yolunu raporda yaz, screenshot dosyasını commit etme.
21. Null byte taraması yap.
22. UTF-8 decode kontrolü yap.
23. Token pattern taraması yap: GitHub token prefixleri ve bootstrap atama kalıpları.
24. Commit öncesi `python forcodex/scripts/g21_binary_guard.py` çalıştır.
25. `git diff --check` ile whitespace hatasını engelle.
26. Binary eklendiyse `git rm --cached path` ile index'ten çıkar.
27. Hatalı geçmiş oluştuysa squash clean commit oluştur.
28. Remote eskiyse `git push --force-with-lease origin main` ile temiz geçmişi gönder.
29. Token geçersizse önce tokenı yenile; push başarısı olmadan UI düzelmez.
30. PR'a sadece text diff bırak; medya çıktıları local artifact olarak kalsın.

Önerilen zorunlu kontrol:

```bash
python forcodex/scripts/g21_binary_guard.py
git diff --check 2281807..HEAD
git diff --numstat 2281807..HEAD | awk '$1=="-" || $2=="-" {print}'
git diff --name-only 2281807..HEAD | rg '\.(webm|png|jpg|jpeg|gif|zip|mp4|mov|pdf)$'
```
