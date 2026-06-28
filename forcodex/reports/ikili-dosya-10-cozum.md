# Codex “İkili Dosyalar Desteklenmez” Kök Çözüm Raporu

## Teknik kaynak analizi

Codex/GitHub diff arayüzündeki “ikili dosyalar desteklenmez” uyarısı çoğunlukla metin diff olarak gösterilemeyen `.webm`, `.png`, `.jpg`, `.zip`, `.pdf` gibi dosyalardan veya metin uzantılı olsa bile null byte/bozuk encoding içeren dosyalardan kaynaklanır. Son 3 talimatta riskli alanlar şunlardır:

- Playwright video dosyaları: `.webm` binary dosyadır.
- Screenshot dosyaları: `.png` binary dosyadır.
- Arşiv/medya dosyaları: `.zip`, `.mp4`, `.mov`, `.webp` binary dosyadır.
- Metin görünümlü ama bozuk dosyalar: UTF-8 dışı encoding, CRLF karmaşası veya null byte içerebilir.
- Gizli token/script dosyaları: `kurulum.sh` gibi dosyalar token içerebileceği için commit edilmemelidir.

Mevcut kontrol sonucu: `git diff --numstat HEAD~3..HEAD` çıktısında `-\t-\t...` formatında binary diff görünen tracked dosya yoktu; binary üretim riski local `forcodex/videos/*.webm`, `forcodex/screenshots/*.png`, eski root `verification/*.webm` ve `browser_outputs/**/*.webm` alanlarından geliyordu. Bu nedenle `.gitignore` ve `.gitattributes` ile kalıcı ayrım yapılmıştır.

## 1. Binary dosyaları tespit edip metinlerden ayırma

**Ne zaman kullanılır:** Diff ekranında “ikili dosyalar desteklenmez” görünürse ilk uygulanacak kontroldür.

**Komutlar:**

```bash
git diff --numstat HEAD~3..HEAD
find . -path ./.git -prune -o -type f -print0 | xargs -0 file
```

**Kontrol:** `git diff --numstat` çıktısında ekleme/silme yerine `- - dosya` görünüyorsa Git dosyayı binary saymıştır.

## 2. Encoding sorunlarını UTF-8’e dönüştürme

**Ne zaman kullanılır:** `.txt`, `.md`, `.py`, `.liquid`, `.json` gibi dosyalar binary gibi davranıyorsa.

**Komutlar:**

```bash
file -bi path/to/file
iconv -f WINDOWS-1254 -t UTF-8 path/to/file -o /tmp/clean && mv /tmp/clean path/to/file
python3 - <<'PY'
from pathlib import Path
for p in Path('.').rglob('*'):
    if p.is_file() and '.git' not in p.parts:
        try:
            p.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            print('UTF-8 değil:', p)
PY
```

**Kontrol:** Dosya `charset=utf-8` dönmeli ve Python UTF-8 okuma testi hata vermemelidir.

## 3. Null byte veya gizli binary karakter temizleme

**Ne zaman kullanılır:** Dosya metin uzantılıdır ama Git/Codex binary algılar.

**Komutlar:**

```bash
python3 - <<'PY'
from pathlib import Path
for p in Path('.').rglob('*'):
    if p.is_file() and '.git' not in p.parts:
        data = p.read_bytes()
        if b'\x00' in data:
            print('NULL BYTE:', p)
PY
```

**Uygulama:** Null byte içeren metin dosyasını yeniden üret, kopyala-yapıştır yerine temiz UTF-8 yaz.

## 4. Yanlış eklenen medya/zip/görsel/arşiv dosyalarını ayırma

**Ne zaman kullanılır:** Playwright çıktıları veya arşivler yanlışlıkla staged olmuşsa.

**Komutlar:**

```bash
git status --short
git restore --staged '*.webm' '*.png' '*.zip' '*.mp4' 2>/dev/null || true
git rm --cached path/to/binary-file
```

**Kontrol:** `git status --short` çıktısında binary dosyalar staged görünmemelidir.

## 5. `.gitattributes` ile dosya türlerini tanımlama

**Ne zaman kullanılır:** Git’in metin/binary sınıflandırmasını kalıcı yapmak için.

**Uygulama:**

```gitattributes
* text=auto eol=lf
*.liquid text eol=lf
*.json text eol=lf
*.py text eol=lf
*.md text eol=lf
*.txt text eol=lf
*.webm binary
*.png binary
*.zip binary
*.mp4 binary
```

**Kontrol:**

```bash
git check-attr -a -- path/to/file
```

## 6. `.gitignore` ile gereksiz binary dosyaları dışarıda bırakma

**Ne zaman kullanılır:** Üretilen video/screenshotların Git’e hiç girmemesi gerekiyorsa.

**Uygulama:**

```gitignore
forcodex/videos/*.webm
forcodex/screenshots/*.png
browser_outputs/**/*.webm
screenshots/*.png
verification/*.webm
kurulum.sh
.codex-auth/
```

**Kontrol:**

```bash
git check-ignore -v forcodex/videos/gelinlik21-3sn-video.webm
```

## 7. Son 3 talimatı temiz `.md`/`.txt` dosyalarına yeniden yazma

**Ne zaman kullanılır:** Talimat metni kopyalanırken bozuk karakter, null byte veya binary payload karıştıysa.

**Uygulama:**

```bash
mkdir -p forcodex/reports
cat > forcodex/reports/talimat-ozeti.md <<'EOF2'
# Talimat Özeti

Tüm yönergeler temiz UTF-8 markdown olarak yeniden yazıldı.
EOF2
```

**Kontrol:** `python3 -c "open('forcodex/reports/talimat-ozeti.md', encoding='utf-8').read()"` hata vermemelidir.

## 8. Git index temizliği ve yeniden stage etme

**Ne zaman kullanılır:** `.gitignore` eklenmesine rağmen eski staged binary dosyalar duruyorsa.

**Komutlar:**

```bash
git restore --staged .
git status --short
git add .gitattributes .gitignore forcodex/ ispatlar.txt
git status --short
```

**Kontrol:** Staged listesinde `.webm`, `.png`, `.zip`, token içeren `kurulum.sh` görünmemelidir.

## 9. Branch’i temizleyip yalnız gerekli talimat dosyalarıyla yeni commit oluşturma

**Ne zaman kullanılır:** Branch geçmişinde karışık binary/text denemeleri varsa ama aynı branch korunacaksa.

**Komutlar:**

```bash
git reset --soft HEAD~3
git restore --staged .
git add .gitattributes .gitignore forcodex/ ispatlar.txt
git commit -m "Clean Codex verification artifacts and binary handling"
```

**Kontrol:** Commit diff’i sadece metin dosyaları ve izinli silmeleri içermelidir.

## 10. ÖNERİLEN ANA YÖNTEM: Yeni temiz branch açıp yalnız temiz dosyaları taşıma

**Ne zaman kullanılır:** En güvenli, en az riskli yöntemdir; son 3 talimatı branch’e sorunsuz yüklemek ve main’e merge etmek için önerilir.

**Komutlar:**

```bash
git switch -c fix/clean-codex-binary-artifacts
mkdir -p forcodex/scripts forcodex/reports forcodex/logs forcodex/verification forcodex/videos forcodex/screenshots
git add .gitattributes .gitignore forcodex/ ispatlar.txt
git diff --cached --numstat
git commit -m "Move Codex verification tooling into forcodex"
git push -u origin fix/clean-codex-binary-artifacts
```

**Merge kontrolü:**

```bash
git fetch origin
git merge-base --is-ancestor main HEAD || true
git diff --check main...HEAD
git diff --numstat main...HEAD | awk '$1=="-" || $2=="-" {print}'
```

Binary satırı çıkmazsa PR/main merge için diff arayüzü metin olarak açılır.

## Son 3 talimatın yüklenememe nedeni için kontrol listesi

- `.webm` veya `.png` dosyaları staged mi?
- Token içeren `kurulum.sh` staged mi?
- `.gitignore` binary çıktıları dışlıyor mu?
- `.gitattributes` binary/text ayrımını yapıyor mu?
- `git diff --numstat` binary satır gösteriyor mu?
- Dosyalarda null byte var mı?
- Tüm talimat raporları UTF-8 `.md` veya `.txt` mi?
- Branch push için GitHub kimliği var mı?

## Branch’e yükleme doğrulama adımları

```bash
git status --short
git diff --check
git diff --cached --numstat
git check-ignore -v forcodex/videos/gelinlik21-3sn-video.webm
git commit -m "Resolve binary artifact handling"
git push -u origin HEAD
```

Bu kontroller geçerse Codex diff arayüzünde “ikili dosyalar desteklenmez” uyarısı yalnızca bilinçli olarak binary bırakılmış dosyalarda görülür; önerilen akışta binary çıktılar Git dışında kaldığı için uyarı tekrarlamaz.
