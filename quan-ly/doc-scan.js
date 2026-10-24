/* Đọc bản giấy biên bản bàn giao (ảnh chụp / PDF scan) → đề xuất số cho các cột Bàn giao (thực nhận / mượn) và Trả.
   Ô mờ, không chắc chắn hoặc không đọc được được đánh dấu để cán bộ nhập tay. Số trên web (cán bộ xác nhận) luôn là số chính thức. */
(function () {
  'use strict';
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFW = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const TIN_CAY = 75; // dưới mức này coi là số mờ, cần kiểm tra
  const boDau = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const gon = (s) => boDau(s).replace(/[^a-z0-9]/g, '');
  function nap(url, ten) {
    if (window[ten]) return Promise.resolve(window[ten]);
    return new Promise((ok, loi) => { const s = document.createElement('script'); s.src = url; s.onload = () => ok(window[ten]); s.onerror = () => loi(new Error('Không tải được bộ đọc (cần mạng)')); document.head.appendChild(s); });
  }

  // ---------- Ảnh: PDF → các trang; ảnh → canvas; làm rõ (xám, kéo giãn tương phản) ----------
  async function thanhCanvas(blob) {
    const ds = [];
    if (/pdf/i.test(blob.type) || /\.pdf$/i.test(blob.name || '')) {
      const L = await nap(PDFJS, 'pdfjsLib'); L.GlobalWorkerOptions.workerSrc = PDFW;
      const pdf = await L.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      for (let i = 1; i <= Math.min(pdf.numPages, 6); i++) {
        const pg = await pdf.getPage(i), v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 2400 / v0.width });
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; ds.push(c);
      }
    } else {
      const img = await createImageBitmap(blob), k = Math.min(2.5, 2400 / img.width);
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height); ds.push(c);
    }
    return ds.map(lamRo);
  }
  function lamRo(c) {
    const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Array(256).fill(0);
    for (let i = 0; i < p.length; i += 4) { const y = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]); p[i] = y; hist[y]++; }
    const n = p.length / 4; let a = 0, lo = 0, hi = 255;
    for (let v = 0; v < 256; v++) { a += hist[v]; if (a > n * 0.01) { lo = v; break; } }
    a = 0; for (let v = 255; v >= 0; v--) { a += hist[v]; if (a > n * 0.01) { hi = v; break; } }
    const k = 255 / Math.max(30, hi - lo);
    for (let i = 0; i < p.length; i += 4) { const y = Math.max(0, Math.min(255, (p[i] - lo) * k)); p[i] = p[i + 1] = p[i + 2] = y; }
    xoaDuongKe(p, c.width, c.height);
    g.putImageData(d, 0, 0); return c;
  }
  // Xóa đường kẻ bảng (vệt tối ngang / dọc dài hơn nhiều so với nét chữ) để bộ đọc không nhầm thành chữ
  function xoaDuongKe(p, W, H) {
    const toi = (x, y) => p[(y * W + x) * 4] < 140, xoa = [];
    const ngang = Math.max(80, W * 0.12), doc = Math.max(90, H * 0.02);
    for (let y = 0; y < H; y++) { let bd = -1; for (let x = 0; x <= W; x++) { const t = x < W && toi(x, y); if (t && bd < 0) bd = x; if (!t && bd >= 0) { if (x - bd > ngang) xoa.push([bd, y, x - bd, 1]); bd = -1; } } }
    for (let x = 0; x < W; x++) { let bd = -1; for (let y = 0; y <= H; y++) { const t = y < H && toi(x, y); if (t && bd < 0) bd = y; if (!t && bd >= 0) { if (y - bd > doc) xoa.push([x, bd, 1, y - bd]); bd = -1; } } }
    xoa.forEach(([x0, y0, w, h]) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * W + x) * 4; p[i] = p[i + 1] = p[i + 2] = 255; } });
  }

  // ---------- Số kiểu Việt Nam: 1.360 / 6,995 / 246 ----------
  // so số theo dãy chữ số (bộ đọc hay làm rơi dấu phẩy thập phân: 49,2 → 492)
  const chuSo = (v) => String(v == null ? '' : v).replace(/\D/g, '');
  const dangVN = (v) => (Math.round(+v * 1000) / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  const khopSo = (x, v) => !!x && v !== '' && v != null && +v > 0 && (Math.abs(x.v - v) < 0.011 || (x.dg && (x.dg === chuSo(dangVN(v)) || x.dg === chuSo(String(+v)))));
  // số đọc được không có dấu phân cách: nếu cùng dãy chữ số với số tham chiếu → chính là số đó; nếu lớn bất thường → đặt lại dấu phẩy
  function chinhSo(x, ref) {
    if (!x || x.sep) return x;
    for (const r of ref) if (+r > 0 && x.dg === chuSo(dangVN(r))) return Object.assign({}, x, { v: +r });
    const m = Math.max(...ref.map(r => +r || 0));
    if (m > 0 && x.v > m * 5) for (let k = 1; k <= 3; k++) { const c = x.v / Math.pow(10, k); if (c <= m * 2) return Object.assign({}, x, { v: Math.round(c * 1000) / 1000, phay: 1 }); }
    return x;
  }
  function docSo(t) {
    let s = String(t || '').trim();
    if (/^[\d.,]*[$SBOolI|][\d.,]*$/.test(s) && s.length <= 6) s = s.replace(/\$|B/g, '8').replace(/S/g, '5'); // nhầm ký tự – số hay gặp
    if (!/\d/.test(s)) return null;
    s = s.replace(/[Oo]/g, '0').replace(/[lI|]/g, '1');
    if (/[^0-9.,]/.test(s.replace(/^[^0-9]+|[^0-9]+$/g, ''))) return null; // lẫn chữ ở giữa → không phải số
    s = s.replace(/^[^0-9]+|[^0-9]+$/g, '');
    let v;
    if (s.indexOf('.') >= 0 && s.indexOf(',') >= 0) v = +s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') >= 0) v = +s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) v = +s.replace(/\./g, '');
    else v = +s;
    return isNaN(v) ? null : { v, dg: chuSo(s), sep: /[.,]/.test(s) };
  }

  // ---------- Nhận chữ ----------
  async function nhanChu(canvases, tienDo) {
    const T = await nap(TESS, 'Tesseract');
    const w = await T.createWorker('vie', 1, { logger: (m) => { if (tienDo && m.status) tienDo(m.status, m.progress || 0); } });
    await w.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '6' });
    const tu = []; let dy = 0;
    for (const c of canvases) {
      const { data } = await w.recognize(c);
      (data.words || []).forEach(x => tu.push({ t: x.text, c: x.confidence, x0: x.bbox.x0, x1: x.bbox.x1, y0: x.bbox.y0 + dy, y1: x.bbox.y1 + dy }));
      dy += c.height + 40;
    }
    await w.terminate();
    return tu;
  }
  const giua = (w) => (w.y0 + w.y1) / 2, giuaX = (w) => (w.x0 + w.x1) / 2;
  function trungVi(a) { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 20; }
  // gom chữ thành các dòng theo tọa độ y
  function thanhDong(tu) {
    const h = trungVi(tu.map(w => w.y1 - w.y0)), ds = [];
    tu.slice().sort((a, b) => giua(a) - giua(b)).forEach(w => {
      const d = ds.find(l => Math.abs(l.y - giua(w)) < h * 0.55);
      if (d) { d.tu.push(w); d.y = (d.y * (d.tu.length - 1) + giua(w)) / d.tu.length; } else ds.push({ y: giua(w), tu: [w] });
    });
    ds.forEach(l => l.tu.sort((a, b) => a.x0 - b.x0));
    return { dong: ds, h };
  }
  // vị trí ngang của các cột số, dò theo chữ trong dòng tiêu đề bảng
  function timCot(dong, dc, h) {
    // dòng tiêu đề bảng: quanh chữ "STT" (tiêu đề cột có thể xuống 2 dòng)
    const iStt = dong.findIndex(l => l.tu.some(w => /^stt$/.test(gon(w.t))) || /tennguyenlieu|tendungcu|ghichu/.test(l.tu.map(w => gon(w.t)).join('')));
    if (iStt < 0) return null; // không thấy dòng tiêu đề → đọc theo số in sẵn
    dong = dong.filter(l => l.y >= dong[iStt].y - h * 2.5 && l.y <= dong[iStt].y + h * 2.5);
    const tim = (re, sau) => { for (const l of dong) { const w = l.tu.find(x => re.test(gon(x.t)) && (!sau || x.x0 > sau)); if (w) return { x: giuaX(w), y: l.y }; } return null; };
    if (dc) { const m = tim(/^muon$/); if (!m) return null; const tra = (dong.find(l => Math.abs(l.y - m.y) < 60) || { tu: [] }).tu.find(x => /^tra$/.test(gon(x.t)) && x.x0 > m.x);
      const no = (dong.find(l => Math.abs(l.y - m.y) < 60) || { tu: [] }).tu.find(x => /^no$/.test(gon(x.t)) && x.x0 > m.x);
      return { muon: m.x, tra: tra ? giuaX(tra) : null, no: no ? giuaX(no) : null, y: m.y }; }
    const nhan = tim(/^nhan$/), hoan = tim(/^hoan$/), du = tim(/^du$/) || tim(/^dutru$/), dm = tim(/^1sv$/) || tim(/^dm$/);
    if (!nhan) return null;
    return { du_tru: du ? du.x : null, nhan: nhan.x, hoan: hoan ? hoan.x : null, dm: dm ? dm.x : null, y: nhan.y };
  }

  // r = bb_ct (biên bản + dòng); trả về đề xuất cho từng ô
  async function doc(blob, r, tienDo) {
    const dc = r.bb.loai === 'DC';
    if (tienDo) tienDo('Đang chuẩn bị ảnh', 0);
    const canvases = await thanhCanvas(blob), tu = await nhanChu(canvases, tienDo);
    const { dong, h } = thanhDong(tu), cot = timCot(dong, dc, h), daDung = new Set();
    const kq = { de_xuat: [], khong_thay: [], khop: 0, cot_tim_thay: !!cot, so_chu: tu.length };
    if (window.PTN_SCAN.goLoi) kq._dong = dong.map(l => Math.round(l.y) + ': ' + l.tu.map(w => w.t + '(' + Math.round(w.c) + ')').join(' ')), kq._cot = cot, kq._h = h;
    const bangTu = cot ? dong.filter(l => l.y > cot.y + h * 0.8) : dong;
    r.dong.forEach(d => {
      // so tên theo chuỗi liền của cả dòng (bộ đọc hay dính chữ: "Râubắp"); trùng cả tên được ưu tiên
      const khoa = boDau(d.ten).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1).slice(0, 4).map(gon), ca = gon(d.ten);
      let tot = null, diem = 0;
      bangTu.forEach((l, i) => {
        if (daDung.has(i) || !khoa.length) return;
        const chuoi = l.tu.map(w => gon(w.t)).join(''), n = (ca.length > 3 && chuoi.indexOf(ca) >= 0 ? 10 : 0) + khoa.filter(k => chuoi.indexOf(k) >= 0).length;
        if (n > diem) { diem = n; tot = i; }
      });
      if (tot === null || diem < Math.min(2, khoa.length)) { kq.khong_thay.push({ dong: d.id, ten: d.ten }); return; }
      daDung.add(tot);
      const l = bangTu[tot], tuTen = l.tu.filter(w => { const g2 = gon(w.t); return g2.length > 1 && (ca.indexOf(g2) >= 0 || khoa.some(k => g2.indexOf(k) >= 0)); }), tenHet = tuTen.length ? Math.max(...tuTen.map(w => w.x1)) : l.tu[0].x1;
      // số dính nhau qua dấu gạch ("024-2952") → tách, chia đều tọa độ
      const so = [].concat(...l.tu.filter(w => w.x0 > tenHet + 4).map(w => { const ph = /\d[-–—_]+\d/.test(w.t) ? w.t.split(/[-–—_]+/) : [w.t], b = (w.x1 - w.x0) / ph.length;
        return ph.map((t, i) => { const n = docSo(t); return n && { v: n.v, dg: n.dg, sep: n.sep, c: w.c, x: w.x0 + b * (i + 0.5), t }; }); })).filter(Boolean);
      const theoCot = (x) => { if (x == null) return null; const s = so.filter(s2 => Math.abs(s2.x - x) < h * 3.2).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]; return s || null; };
      // không dò được tiêu đề cột: lấy số in sẵn làm mốc (HC: … ĐM, DỰ TRÙ, THỰC NHẬN, HOÀN TRẢ; DC: MƯỢN, TRẢ, NỢ)
      const moc = {};
      if (!dc) { const iDm = so.findIndex(x => khopSo(x, d.dm)), iKh = so.findIndex((x, i) => i > iDm && khopSo(x, d.ke_hoach));
        if (iKh >= 0) { moc.du = so[iKh]; moc.nhan = so[iKh + 1] || null; moc.hoan = so[iKh + 2] || null; } }
      if (!cot && dc) { moc.muon = so[0] || null; moc.tra = so[1] || null; moc.no = so[2] || null; }
      const ghi = (k, s, can, lyDo) => kq.de_xuat.push(Object.assign({ dong: d.id, ten: d.ten, k, v: s ? s.v : null, tin: s ? Math.round(s.c) : 0, nghi: lyDo.length ? 1 : 0, ly_do: lyDo, can },
        window.PTN_SCAN.goLoi ? { _so: so.map(x => x.t + '=' + x.v), _kh: d.ke_hoach, _dm: d.dm, _dong: l.tu.map(w => w.t).join(' ') } : {}));
      const bs = +d.bo_sung || 0, kh = +d.ke_hoach || 0, nhanCu = (+d.ban_giao || 0) + bs;
      if (!dc) {
        const dungCot = cot && khopSo(theoCot(cot.du_tru), kh) || (cot && !moc.du);
        const sDu = dungCot ? theoCot(cot.du_tru) : moc.du, lech = sDu && kh && !khopSo(sDu, kh);
        const sNhan = chinhSo(dungCot ? theoCot(cot.nhan) : moc.nhan, [nhanCu, kh]), sHoan = chinhSo(dungCot ? theoCot(cot.hoan) : moc.hoan, [d.tra, kh]);
        // thực nhận = bàn giao + bổ sung → bàn giao đề xuất = thực nhận − bổ sung
        const lyDo = [];
        const docRoMoc = !!sDu && !lech; // dòng đọc rõ (số dự trù in sẵn khớp) → ô trống là trống thật
        if (!sNhan) { if (docRoMoc) { if (nhanCu > 0) lyDo.push('Trên giấy để trống, web đang ghi ' + nhanCu + ' – kiểm tra'); else { kq.khop++; } } else if (kh > 0) lyDo.push('Không đọc được số thực nhận – nhập tay'); }
        else { if (sNhan.c < TIN_CAY) lyDo.push('Số mờ (độ tin cậy ' + Math.round(sNhan.c) + '%) – kiểm tra'); if (sNhan.phay) lyDo.push('Không rõ dấu phẩy thập phân (đọc được "' + sNhan.t + '") – kiểm tra'); if (kh && sNhan.v > kh * 4) lyDo.push('Lớn bất thường so với dự trù ' + kh); if (sNhan.v - bs < 0) lyDo.push('Nhỏ hơn số bổ sung đã ghi (' + bs + ')'); }
        if (lech) lyDo.push('Số dự trù trên giấy ("' + sDu.t + '") khác web (' + dangVN(kh) + ') – có thể đọc lệch dòng');
        if (sNhan || lyDo.length) { if (sNhan && !lyDo.length && Math.abs(sNhan.v - nhanCu) < 0.011) kq.khop++; else ghi('ban_giao', sNhan ? { v: Math.max(0, Math.round((sNhan.v - bs) * 1000) / 1000), c: sNhan.c } : null, sNhan ? sNhan.v : null, lyDo); }
        if (sHoan) { const ly = sHoan.c < TIN_CAY || sHoan.phay ? ['Số hoàn trả mờ / không rõ dấu phẩy ("' + sHoan.t + '") – kiểm tra'] : [];
          if (!ly.length && Math.abs(sHoan.v - (+d.tra || 0)) < 0.011) kq.khop++; else ghi('tra', sHoan, sHoan.v, ly); }
      } else {
        const sM = chinhSo(cot ? theoCot(cot.muon) : moc.muon, [nhanCu, kh]), sT = chinhSo(cot ? theoCot(cot.tra) : moc.tra, [d.tra, nhanCu]), sN = chinhSo(cot ? theoCot(cot.no) : moc.no, [nhanCu]);
        const lyM = [];
        const dongRo = l.tu.filter(w => w.x1 <= tenHet).every(w => w.c >= TIN_CAY - 10); // tên dụng cụ đọc rõ → ô trống là trống thật
        if (!sM) { if (dongRo && !nhanCu) kq.khop++; else if (dongRo) lyM.push('Trên giấy để trống, web đang ghi ' + nhanCu + ' – kiểm tra'); else if (kh > 0 || nhanCu > 0) lyM.push('Không đọc được số mượn – nhập tay'); }
        else { if (sM.c < TIN_CAY) lyM.push('Số mờ (độ tin cậy ' + Math.round(sM.c) + '%) – kiểm tra'); if (sM.phay) lyM.push('Không rõ dấu phẩy thập phân – kiểm tra'); if (kh && sM.v > kh * 4) lyM.push('Lớn bất thường so với kế hoạch ' + kh); }
        if (sM && sT && sN && Math.abs(sM.v - sT.v - sN.v) > 0.011) lyM.push('Mượn − trả ≠ nợ trên giấy (' + sM.v + ' − ' + sT.v + ' ≠ ' + sN.v + ')');
        if (sM || lyM.length) { if (sM && !lyM.length && Math.abs(sM.v - nhanCu) < 0.011) kq.khop++; else ghi('ban_giao', sM ? { v: Math.max(0, Math.round((sM.v - bs) * 1000) / 1000), c: sM.c } : null, sM ? sM.v : null, lyM); }
        if (sT) { const ly = sT.c < TIN_CAY ? ['Số trả mờ (' + Math.round(sT.c) + '%) – kiểm tra'] : [];
          if (!ly.length && Math.abs(sT.v - (+d.tra || 0)) < 0.011) kq.khop++; else ghi('tra', sT, sT.v, ly); }
      }
    });
    return kq;
  }
  window.PTN_SCAN = { doc, docSo, thanhCanvas };
})();
