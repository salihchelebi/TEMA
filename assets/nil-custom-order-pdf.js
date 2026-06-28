(() => {
  'use strict';

  const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
  const WHATSAPP_NUMBER = '905334619373';

  const LABELS_TR = {
    form_source: 'Form Kaynağı', selected_dress: 'Seçilen Gelinlik', selected_dress_handle: 'Seçilen Gelinlik Kodu', selected_dress_url: 'Seçilen Gelinlik Linki',
    selected_dress_image: 'Seçilen Gelinlik Görseli', silhouette: 'Siluet', neckline: 'Yaka Tipi', sleeve_style: 'Kol Tipi', dress_length: 'Elbise Boyu',
    back_style: 'Sırt Modeli', train_length: 'Kuyruk Uzunluğu', fabrics: 'Kumaşlar', embellishments: 'Süsleme Detayları', color_tone: 'Renk Tonu',
    measurement_unit: 'Ölçü Birimi', bust: 'Göğüs', waist: 'Bel', hips: 'Basen', height_without_shoes: 'Ayakkabısız Boy', heel_height: 'Topuk Yüksekliği',
    hollow_to_floor: 'Boyun Çukuru - Yer Ölçüsü', shoulder_width: 'Omuz Genişliği', arm_length: 'Kol Uzunluğu', name: 'Ad Soyad', email: 'E-posta',
    phone_code: 'Telefon Kodu', phone: 'Telefon / WhatsApp', wedding_date: 'Düğün Tarihi', delivery_country: 'Teslimat Ülkesi',
    reference_image_link: 'Referans Görsel Linki', body: 'Özel İstekler / Notlar'
  };

  const VALUES_TR = {
    'A-Line': 'A Kesim', 'Mermaid / Trumpet': 'Balık / Trompet', 'Ball Gown': 'Prenses / Balo Tipi', 'Sheath': 'Düz Kesim', Straight: 'Düz', 'High-Low': 'Ön Kısa Arka Uzun', Jumpsuit: 'Tulum', Separates: 'Ayrı Parçalar', Jacket: 'Ceket',
    Sweetheart: 'Kalp Yaka', 'V-Neck': 'V Yaka', Square: 'Kare Yaka', 'High Neck': 'Dik Yaka', 'Boat Neck': 'Kayık Yaka', 'Off-the-Shoulder': 'Düşük Omuz', 'One Shoulder': 'Tek Omuz', Halter: 'Halter Yaka', Strapless: 'Straplez', Scoop: 'Yuvarlak Yaka', Cowl: 'Degaje Yaka', Illusion: 'İllüzyon Yaka', Asymmetrical: 'Asimetrik', Capelet: 'Pelerin Yaka', Tank: 'Kalın Askılı', 'Spaghetti Straps': 'İnce Askılı', Sculpted: 'Heykelsi Yaka',
    Sleeveless: 'Kolsuz', 'Cap Sleeves': 'Mini Kol', 'Short Sleeves': 'Kısa Kol', 'Elbow Sleeves': 'Dirsek Kol', '3/4 Sleeves': '3/4 Kol', 'Long Sleeves': 'Uzun Kol',
    Short: 'Kısa', 'Tea Length': 'Çay Boyu', Midi: 'Midi', 'Ankle Length': 'Bilek Boyu', Long: 'Uzun',
    'Open Back': 'Açık Sırt', 'Lace-up Corset': 'Bağcıklı Korse', Zipper: 'Fermuar', Buttons: 'Düğme', 'Illusion Back': 'İllüzyon Sırt', 'Closed Back': 'Kapalı Sırt',
    'No Train': 'Kuyruksuz', Sweep: 'Kısa Kuyruk', Chapel: 'Şapel Kuyruk', Cathedral: 'Katedral Kuyruk', Royal: 'Royal Kuyruk', 'Detachable Train': 'Çıkarılabilir Kuyruk',
    Tulle: 'Tül', Lace: 'Dantel', Satin: 'Saten', Chiffon: 'Şifon', Organza: 'Organze', Mikado: 'Mikado', Crepe: 'Krep', Silk: 'İpek',
    Beading: 'Boncuk İşleme', Embroidery: 'Nakış', Sequins: 'Payet', 'Floral Appliqué': 'Çiçek Aplike', Crystals: 'Kristal', Pearls: 'İnci', Plain: 'Sade',
    Ivory: 'Ivory', White: 'Beyaz', 'Soft Ivory': 'Soft Ivory', Champagne: 'Şampanya', 'Nude Ivory': 'Nude Ivory', 'Pearl White': 'İnci Beyazı',
    'United States': 'Amerika Birleşik Devletleri', Canada: 'Kanada', 'United Kingdom': 'Birleşik Krallık', Germany: 'Almanya', France: 'Fransa', Italy: 'İtalya', Spain: 'İspanya', Netherlands: 'Hollanda', Sweden: 'İsveç', Norway: 'Norveç', Denmark: 'Danimarka', Finland: 'Finlandiya', Turkey: 'Türkiye', UAE: 'BAE', 'Saudi Arabia': 'Suudi Arabistan', Kuwait: 'Kuveyt', Qatar: 'Katar', Australia: 'Avustralya', Japan: 'Japonya', 'South Korea': 'Güney Kore', Other: 'Diğer'
  };

  const UI_TR = {
    'NIL Bride • Remote Custom Couture': 'NIL Bride • Uzaktan Özel Dikim',
    'Custom Wedding Dress Request': 'Özel Gelinlik Talep Formu',
    'Choose your silhouette, neckline, fabric, color and measurements. Our bridal team will review your request and continue with you on WhatsApp.': 'Siluet, yaka tipi, kumaş, renk ve ölçülerinizi seçin. Gelinlik ekibimiz talebinizi inceleyip WhatsApp üzerinden sizinle devam eder.',
    'Made-to-order': 'Kişiye özel üretim', 'Remote measurements': 'Uzaktan ölçü alma', '6–8 weeks production': '6–8 hafta üretim', 'Worldwide shipping': 'Dünya geneli teslimat',
    'Step 1': 'Adım 1', 'Step 2': 'Adım 2', 'Step 3': 'Adım 3', 'Step 4': 'Adım 4', 'Step 5': 'Adım 5', 'Step 6': 'Adım 6', 'Step 7': 'Adım 7',
    'Step 1 of 7': '7 adımın 1. adımı',
    'Silhouette': 'Siluet', 'Select the overall shape of your dress.': 'Gelinliğinizin genel formunu seçin.',
    'Neckline': 'Yaka Tipi', 'Choose the neckline closest to your dream dress.': 'Hayalinizdeki gelinliğe en yakın yaka tipini seçin.',
    'Sleeve Style': 'Kol Tipi', 'Long sleeve selections will ask for arm length too.': 'Uzun kol seçerseniz kol uzunluğu ölçüsü de istenir.',
    'Dress Length': 'Elbise Boyu', 'Pick the base length. Train length is selected separately.': 'Ana elbise boyunu seçin. Kuyruk uzunluğu ayrı seçilir.',
    'Style Details': 'Model Detayları', 'Use quick selections for the bridal team to understand your style.': 'Gelinlik ekibinin tarzınızı anlaması için hızlı seçimleri doldurun.',
    'Back Style': 'Sırt Modeli', 'Train Length': 'Kuyruk Uzunluğu', 'Fabric': 'Kumaş', 'Embellishments': 'Süsleme Detayları', 'Color Tone': 'Renk Tonu',
    'Measurements': 'Ölçüler', 'US and Canada customers can use inches; other countries can use cm.': 'ABD ve Kanada müşterileri inch, diğer ülkeler cm kullanabilir.',
    'Bust': 'Göğüs', 'Waist': 'Bel', 'Hips': 'Basen', 'Height without shoes': 'Ayakkabısız Boy', 'Heel Height': 'Topuk Yüksekliği', 'Hollow to Floor': 'Boyun Çukuru - Yer Ölçüsü', 'Shoulder Width': 'Omuz Genişliği', 'Arm Length': 'Kol Uzunluğu',
    'Contact & Wedding Details': 'İletişim ve Düğün Bilgileri', 'We will contact you within 24 hours to confirm the design and production details.': 'Tasarım ve üretim detaylarını netleştirmek için 24 saat içinde sizinle iletişime geçeriz.',
    'Full Name *': 'Ad Soyad *', 'Email *': 'E-posta *', 'Phone / WhatsApp *': 'Telefon / WhatsApp *', 'Wedding Date': 'Düğün Tarihi', 'Delivery Country': 'Teslimat Ülkesi', 'Reference image link': 'Referans Görsel Linki', 'Special Requests / Notes': 'Özel İstekler / Notlar',
    'Send My Custom Request': 'Özel Talebimi Gönder', 'Continue on WhatsApp': 'WhatsApp ile Devam Et',
    'Thank you — your custom request was received.': 'Teşekkürler — özel gelinlik talebiniz alındı.', 'Continue on WhatsApp to send inspiration photos or confirm urgent details.': 'İlham görsellerinizi göndermek veya acil detayları netleştirmek için WhatsApp üzerinden devam edin.',
    'Native Shopify contact forms can send your request by email, but a real Draft Order and direct file upload require an app/Admin API or external upload service. This theme-only form includes a reference link field and a WhatsApp follow-up for photos.': 'Shopify tema içindeki standart form talebi e-posta olarak iletebilir; ancak gerçek taslak sipariş, PDF ekli otomatik e-posta ve doğrudan dosya yükleme için uygulama, Admin API veya harici yükleme servisi gerekir. Bu formda referans link alanı ve görseller için WhatsApp devam seçeneği vardır.'
  };

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }

  function injectStyles() {
    if (document.getElementById('nil-custom-order-pdf-styles')) return;
    const style = document.createElement('style');
    style.id = 'nil-custom-order-pdf-styles';
    style.textContent = `
      .nil-cof-pdf-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:24px 0 0;padding:18px;border:1px solid rgba(201,169,110,.32);border-radius:22px;background:rgba(255,255,255,.68);box-shadow:0 14px 34px rgba(45,33,20,.06)}
      .nil-cof-pdf-btn{border:1px solid rgba(17,17,17,.14);border-radius:999px;background:#fff;color:#111;padding:14px 18px;cursor:pointer;font-size:12px;letter-spacing:.12em;text-transform:uppercase;transition:transform .18s ease,background .18s ease,border-color .18s ease}
      .nil-cof-pdf-btn:hover{transform:translateY(-1px);border-color:rgba(201,169,110,.78);background:#fffaf2}
      .nil-cof-pdf-btn--whatsapp{background:#111;color:#fff}.nil-cof-pdf-btn--whatsapp:hover{background:#25D366;color:#111}
      .nil-cof-pdf-status{grid-column:1/-1;margin:2px 0 0;font-size:13px;line-height:1.55;color:rgba(26,26,26,.66)}
      .nil-cof-pdf-status.is-error{color:#9f2d2d}.nil-cof-pdf-status.is-success{color:#237245}
      @media screen and (max-width:640px){.nil-cof-pdf-tools{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function translateText(value) { return VALUES_TR[value] || UI_TR[value] || value; }

  function translatePage(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.nodeValue.trim();
        return text && (UI_TR[text] || VALUES_TR[text]) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), translateText(node.nodeValue.trim())); });

    root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      const p = el.getAttribute('placeholder');
      const map = {
        'Your full name': 'Adınız ve soyadınız', 'your@email.com': 'eposta@ornek.com', '555 123 4567': '555 123 4567',
        'Paste Pinterest / Instagram / Drive image link if available': 'Varsa Pinterest / Instagram / Drive görsel linkinizi yapıştırın',
        'Tell us details such as modesty preference, detachable sleeves, extra train length, rush production, or inspiration notes.': 'Tesettür tercihi, çıkarılabilir kol, ekstra kuyruk uzunluğu, acil üretim veya ilham notlarınızı yazın.'
      };
      if (map[p]) el.setAttribute('placeholder', map[p]);
    });
    const countryFirst = root.querySelector('#nilCofCountry option[value=""]');
    if (countryFirst) countryFirst.textContent = 'Ülkenizi seçin';
  }

  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-nil-jspdf]');
      if (existing) { existing.addEventListener('load', () => resolve(window.jspdf.jsPDF), { once: true }); existing.addEventListener('error', reject, { once: true }); return; }
      const script = document.createElement('script');
      script.src = JSPDF_URL; script.async = true; script.dataset.nilJspdf = 'true';
      script.onload = () => resolve(window.jspdf.jsPDF);
      script.onerror = () => reject(new Error('PDF kütüphanesi yüklenemedi.'));
      document.head.appendChild(script);
    });
  }

  function normalizeKey(key) { return key.replace(/^contact\[/, '').replace(/\](\[\])?$/, ''); }
  function niceLabel(key) { return LABELS_TR[key] || key.replaceAll('_', ' '); }
  function translateValue(value) { return String(value || '').split(', ').map(v => translateText(v)).join(', '); }

  function getFormRows(form) {
    const fd = new FormData(form);
    const rowsMap = new Map();
    for (const [rawKey, rawValue] of fd.entries()) {
      if (!rawKey.startsWith('contact[')) continue;
      const key = normalizeKey(rawKey);
      const value = String(rawValue || '').trim();
      if (!value || key === 'shopify_draft_order_note') continue;
      if (!rowsMap.has(key)) rowsMap.set(key, []);
      rowsMap.get(key).push(translateText(value));
    }
    return Array.from(rowsMap.entries()).map(([key, values]) => ({ key, label: niceLabel(key), value: values.join(', ') }));
  }

  function getValue(form, name) { const value = new FormData(form).get(name); return value ? String(value).trim() : ''; }
  function hasChecked(form, name) { return !!form.querySelector(`[name="${name}"]:checked`); }
  function setStatus(status, message, type) { status.textContent = message || ''; status.classList.toggle('is-error', type === 'error'); status.classList.toggle('is-success', type === 'success'); }

  function validateForPdf(form, status) {
    const missing = [];
    [['contact[silhouette]','Siluet'],['contact[neckline]','Yaka tipi'],['contact[sleeve_style]','Kol tipi'],['contact[dress_length]','Elbise boyu'],['contact[back_style]','Sırt modeli'],['contact[train_length]','Kuyruk uzunluğu'],['contact[color_tone]','Renk tonu']].forEach(([name,label]) => { if (!hasChecked(form, name)) missing.push(label); });
    if (!hasChecked(form, 'contact[fabrics][]')) missing.push('Kumaş');
    if (!hasChecked(form, 'contact[embellishments][]')) missing.push('Süsleme detayı');
    [['contact[bust]','Göğüs'],['contact[waist]','Bel'],['contact[hips]','Basen'],['contact[height_without_shoes]','Ayakkabısız boy'],['contact[heel_height]','Topuk yüksekliği'],['contact[hollow_to_floor]','Boyun çukuru - yer ölçüsü'],['contact[shoulder_width]','Omuz genişliği'],['contact[name]','Ad soyad'],['contact[email]','E-posta'],['contact[phone]','Telefon / WhatsApp'],['contact[wedding_date]','Düğün tarihi'],['contact[delivery_country]','Teslimat ülkesi']].forEach(([name,label]) => { if (!getValue(form, name)) missing.push(label); });
    if (getValue(form, 'contact[sleeve_style]') === 'Long Sleeves' && !getValue(form, 'contact[arm_length]')) missing.push('Kol uzunluğu');
    if (!form.reportValidity()) { setStatus(status, 'Lütfen zorunlu ad, e-posta ve telefon alanlarını kontrol edin.', 'error'); return false; }
    if (missing.length) { setStatus(status, `PDF oluşturmadan önce eksik alanları doldurun: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ve ' + (missing.length - 8) + ' alan daha' : ''}.`, 'error'); return false; }
    return true;
  }

  function getSelectedVisuals(form) {
    const visuals = [];
    form.querySelectorAll('input:checked').forEach(input => {
      const key = normalizeKey(input.name || '');
      const label = niceLabel(key);
      const value = translateText(input.value);
      const option = input.closest('.nil-cof-option');
      const img = option ? option.querySelector('img') : null;
      if (img && img.currentSrc) visuals.push({ label, value, src: img.currentSrc });
      const color = input.closest('.nil-cof-color');
      const dot = color ? color.querySelector('.nil-cof-color-dot') : null;
      if (dot) visuals.push({ label, value, color: getComputedStyle(dot).backgroundColor });
    });
    const dressImg = getValue(form, 'contact[selected_dress_image]');
    const dressName = getValue(form, 'contact[selected_dress]');
    if (dressImg) visuals.unshift({ label: 'Seçilen Gelinlik', value: dressName || 'Gelinlik görseli', src: dressImg });
    return visuals.slice(0, 14);
  }

  function imageToDataUrl(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, img.naturalWidth || 160);
          canvas.height = Math.max(1, img.naturalHeight || 160);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function createPdf(form) {
    const jsPDF = await loadJsPdf();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const rows = getFormRows(form);
    const visuals = getSelectedVisuals(form);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;
    const maxWidth = pageWidth - margin * 2;
    let y = 48;
    const addPageIfNeeded = (needed = 28) => { if (y + needed > pageHeight - margin) { doc.addPage(); y = 48; } };

    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('NIL Bride Özel Gelinlik Talebi', margin, y); y += 20;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`, margin, y); y += 24;
    doc.setDrawColor(201, 169, 110); doc.line(margin, y, pageWidth - margin, y); y += 22;

    if (visuals.length) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Müşterinin Seçtiği Görsel Seçenekler', margin, y); y += 14;
      const boxW = 115, boxH = 104, gap = 12;
      let x = margin;
      for (const item of visuals) {
        addPageIfNeeded(boxH + 18);
        if (x + boxW > pageWidth - margin + 1) { x = margin; y += boxH + 18; addPageIfNeeded(boxH + 18); }
        doc.setDrawColor(230, 211, 173); doc.roundedRect(x, y, boxW, boxH, 10, 10);
        if (item.src) {
          const dataUrl = await imageToDataUrl(item.src);
          if (dataUrl) doc.addImage(dataUrl, 'PNG', x + 26, y + 10, 64, 64);
        } else if (item.color) {
          doc.setFillColor(item.color); doc.circle(x + 58, y + 42, 24, 'F');
        }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize(item.label, boxW - 14), x + 7, y + 82);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(doc.splitTextToSize(item.value, boxW - 14), x + 7, y + 94);
        x += boxW + gap;
      }
      y += boxH + 30;
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Talep Detayları', margin, y); y += 18;
    rows.forEach(row => {
      addPageIfNeeded(42);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(row.label + ':', margin, y); y += 14;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      doc.splitTextToSize(row.value, maxWidth).forEach(line => { addPageIfNeeded(18); doc.text(line, margin, y); y += 14; });
      y += 8;
    });

    addPageIfNeeded(48); doc.setDrawColor(230, 211, 173); doc.line(margin, y, pageWidth - margin, y); y += 18;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.text('gelinlik21.com.tr/pages/custom-order üzerinden oluşturuldu.', margin, y);
    return doc;
  }

  function getFileName(form) {
    const name = getValue(form, 'contact[name]') || 'ozel-gelinlik-talebi';
    const safeName = name.toLowerCase().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ozel-gelinlik-talebi';
    return `NIL-Bride-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  function buildWhatsappText(form) {
    const rows = getFormRows(form);
    const summary = rows.map(row => `${row.label}: ${row.value}`).join('\n');
    return `Merhaba NIL Bride, özel gelinlik talep formumu doldurdum. PDF dosyamı paylaşıyorum.\n\n${summary.slice(0, 1700)}`;
  }

  async function sharePdfViaWhatsapp(form, status) {
    const doc = await createPdf(form);
    const fileName = getFileName(form);
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const text = buildWhatsappText(form);

    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'NIL Bride Özel Gelinlik Talebi', text });
      setStatus(status, 'PDF paylaşım ekranı açıldı. WhatsApp’ı seçerek PDF dosyasını gönderebilirsiniz.', 'success');
      return;
    }

    doc.save(fileName);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text + '\n\nPDF dosyası indirildi. Lütfen bu PDF dosyasını WhatsApp mesajına ekleyin.')}`, '_blank', 'noopener');
    setStatus(status, 'PDF indirildi ve WhatsApp açıldı. Cihazınız dosya paylaşımını desteklemiyorsa indirilen PDF’yi WhatsApp mesajına manuel ekleyin.', 'success');
  }

  function installPdfTools() {
    injectStyles();
    const form = document.getElementById('nil-cof-form');
    if (!form) return;
    translatePage(document.querySelector('.nil-custom-order') || form);
    const progressText = document.getElementById('nilCofProgressText');
    if (progressText) {
      const observer = new MutationObserver(() => {
        const m = progressText.textContent.match(/Step (\d+) of (\d+)/);
        if (m) progressText.textContent = `${m[2]} adımın ${m[1]}. adımı`;
      });
      observer.observe(progressText, { childList: true, characterData: true, subtree: true });
    }
    if (document.getElementById('nilCofPdfTools')) return;
    const submitRow = form.querySelector('.nil-cof-submit-row');
    if (!submitRow) return;

    const tools = document.createElement('div');
    tools.id = 'nilCofPdfTools';
    tools.className = 'nil-cof-pdf-tools';
    tools.innerHTML = `
      <button type="button" class="nil-cof-pdf-btn" id="nilCofPdfDownload">PDF Olarak İndir</button>
      <button type="button" class="nil-cof-pdf-btn nil-cof-pdf-btn--whatsapp" id="nilCofPdfWhatsapp">PDF'yi WhatsApp ile Gönder</button>
      <p class="nil-cof-pdf-status" id="nilCofPdfStatus" role="status" aria-live="polite"></p>
    `;
    submitRow.parentNode.insertBefore(tools, submitRow);

    const status = tools.querySelector('#nilCofPdfStatus');
    tools.querySelector('#nilCofPdfDownload').addEventListener('click', async () => {
      try {
        if (!validateForPdf(form, status)) return;
        setStatus(status, 'PDF hazırlanıyor...', '');
        const doc = await createPdf(form);
        doc.save(getFileName(form));
        setStatus(status, 'PDF indirildi. Dosyayı cihazınızda kontrol edebilirsiniz.', 'success');
      } catch (error) {
        setStatus(status, 'PDF oluşturulamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.', 'error');
        console.error('[NIL Custom Order PDF]', error);
      }
    });
    tools.querySelector('#nilCofPdfWhatsapp').addEventListener('click', async () => {
      try {
        if (!validateForPdf(form, status)) return;
        setStatus(status, 'PDF hazırlanıyor ve WhatsApp paylaşımı açılıyor...', '');
        await sharePdfViaWhatsapp(form, status);
      } catch (error) {
        setStatus(status, 'WhatsApp paylaşımı tamamlanamadı. PDF’yi indirip manuel gönderebilirsiniz.', 'error');
        console.error('[NIL Custom Order WhatsApp PDF]', error);
      }
    });
  }

  ready(installPdfTools);
  document.addEventListener('shopify:section:load', installPdfTools);
})();