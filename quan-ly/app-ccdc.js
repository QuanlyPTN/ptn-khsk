/* Trang quản lý – "Công cụ dụng cụ" (#/ccdc[/năm[/lọc]]): sổ công cụ dụng cụ theo năm, theo mẫu "SỔ CÔNG CỤ DỤNG CỤ" của Trường.
   Lọc theo vị trí / phòng, tìm; thêm – sửa – xóa; tải file sổ (.xls / .xlsx đúng mẫu, ghi Lịch sử tải file); kiểm kê (SL thực tế, ghi chú);
   xuất Excel đúng mẫu (cả sổ hoặc theo bộ lọc) + xem trước in; file mẫu trống; tạo sổ năm mới (trống / chép năm trước).
   Trang phòng hiện CCDC của phòng (PTN_QL.ccdcPhong). Máy chủ: apps-script/27_CongCuDungCu.gs. */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, coQuyen, fmt, boDau, napXlsx } = Q;
  let D = null, KK = false; // KK: đang ở chế độ kiểm kê
  const xl = () => coQuyen('tai-san', 'xu_ly');
  const lech = (x) => x.kk_sl != null && x.kk_sl !== x.sl;
  const kkChu = (x) => x.kk_ngay ? (lech(x) ? 'Thực tế ' + fmt(x.kk_sl) : 'Đủ') + ' (' + ngayVN(x.kk_ngay) + ')' : '';
  const COT = ['STT', 'MÃ CCDC', 'MÃ KT', 'MÃ VỊ TRÍ', 'TÊN CCDC', 'THÔNG SỐ KT', 'NƯỚC SX', 'ĐVT', 'SỐ LƯỢNG', 'GHI CHÚ', 'ĐÃ KIỂM TRA'];
  // bộ lọc vị trí: "p:<phòng>" (mọi mã vị trí của phòng) hoặc "v:<mã vị trí>" (vị trí chưa khớp phòng nào)
  const hopLoc = (x, loc) => !loc || (loc.indexOf('p:') === 0 ? x.phong === loc.slice(2) : x.vi_tri === loc.slice(2));
  const tenLoc = (loc) => !loc ? '' : loc.indexOf('p:') === 0 ? 'phòng ' + loc.slice(2) : 'vị trí ' + loc.slice(2);

  async function manCCDC(p) {
    const nam = /^\d{4}$/.test(p[1] || '') ? p[1] : '', loc0 = decodeURIComponent(p[2] || '');
    const nd = trang('Sổ công cụ dụng cụ', '', '<a href="#/tai-san">Tài sản</a> ›');
    D = await api('ccdc_ds', nam ? { nam } : {}); KK = false;
    $('main').querySelector('h1').innerHTML = 'Sổ công cụ dụng cụ năm <select id="cc-nam" class="sm" style="font-size:inherit;font-weight:700">' +
      D.cac_nam.map(n => '<option' + (n === D.nam ? ' selected' : '') + '>' + n + '</option>').join('') + (xl() ? '<option value="+">+ Tạo sổ năm…</option>' : '') + '</select>';
    $('cc-nam').onchange = (e) => { if (e.target.value === '+') { e.target.value = D.nam; return hopTaoNam(); } location.hash = '#/ccdc/' + e.target.value; };
    const P = {}, V = {}; D.ds.forEach(x => { if (x.phong) P[x.phong] = (P[x.phong] || 0) + 1; else if (x.vi_tri) V[x.vi_tri] = (V[x.vi_tri] || 0) + 1; });
    nd.innerHTML = '<p class="note">Sổ theo mẫu <b>"SỔ CÔNG CỤ DỤNG CỤ"</b> của Trường. Mã vị trí giữ như sổ (VD 1F04.02); cột Phòng là phòng trên web tương ứng. ' +
      'Kiểm kê: chọn vị trí → bấm <b>✓ Kiểm kê</b> → sửa SL thực tế nếu khác sổ → <b>Lưu kiểm kê</b>.</p>' +
      '<div class="btns" style="margin:10px 0">' + (xl() ? '<button class="btn sm" id="cc-them">+ Thêm dòng</button><label class="btn o sm">⇪ Tải file sổ lên<input type="file" id="x-file" accept=".xls,.xlsx" hidden></label><button class="btn o sm" id="cc-kk">✓ Kiểm kê</button>' : '') +
      '<button class="btn o sm" id="cc-xuat">⇩ Xuất sổ Excel theo mẫu</button><button class="btn o sm" id="cc-mau">⇩ File mẫu trống</button></div>' +
      '<div class="tools"><input type="search" id="cc-q" placeholder="Tìm tên, mã CCDC, mã KT, thông số…"><select id="cc-loc"><option value="">Mọi vị trí</option>' +
      Object.keys(P).sort().map(k => '<option value="p:' + esc(k) + '">Phòng ' + esc(k) + ' (' + P[k] + ')</option>').join('') +
      Object.keys(V).sort().map(k => '<option value="v:' + esc(k) + '">' + esc(k) + ' (' + V[k] + ')</option>').join('') + '</select>' +
      '<select id="cc-tt"><option value="">Mọi tình trạng kiểm kê</option><option value="chua">Chưa kiểm</option><option value="da">Đã kiểm</option><option value="lech">Thực tế khác sổ</option></select></div>' +
      '<div id="cc-kk-thanh"></div><div id="cc-tong" class="note" style="margin:6px 0"></div><div id="cc-ds"></div>';
    if (loc0) $('cc-loc').value = loc0;
    $('cc-q').oninput = veDS; $('cc-loc').onchange = veDS; $('cc-tt').onchange = veDS;
    const nx = $('b-xuat-trang'); if (nx) { nx.textContent = '⇩ Xuất sổ Excel theo mẫu'; nx.onclick = hopXuat; } // nút chung chỉ chép bảng (không theo mẫu sổ)
    $('cc-xuat').onclick = hopXuat; $('cc-mau').onclick = () => chay(null, () => xuat([], 'trong'));
    if (xl()) {
      $('cc-them').onclick = () => hopSua(null);
      $('x-file').onchange = (e) => { const f = e.target.files[0]; if (f) hopNhap(f); };
      $('cc-kk').onclick = () => { KK = !KK; veDS(); };
    }
    veDS();
  }
  async function taiLai() { const y = window.scrollY, q = $('cc-q').value, l = $('cc-loc').value, t = $('cc-tt').value; D = await api('ccdc_ds', { nam: D.nam }); $('cc-q').value = q; $('cc-loc').value = l; $('cc-tt').value = t; veDS(); window.scrollTo(0, y); }
  function dangLoc() {
    const q = boDau($('cc-q').value.trim()), loc = $('cc-loc').value, tt = $('cc-tt').value;
    return D.ds.filter(x => hopLoc(x, loc) && (!q || boDau([x.ten, x.ma, x.ma_kt, x.thong_so, x.vi_tri, x.phong, x.ghi_chu].join(' ')).indexOf(q) >= 0) &&
      (!tt || (tt === 'chua' ? !x.kk_ngay : tt === 'da' ? !!x.kk_ngay : lech(x))));
  }
  function veDS() {
    const l = dangLoc(), tat = D.ds, da = tat.filter(x => x.kk_ngay).length, sl = l.reduce((a, x) => a + x.sl, 0);
    $('cc-tong').innerHTML = '<b>' + l.length + '</b> / ' + tat.length + ' mục · tổng số lượng <b>' + fmt(sl) + '</b> · đã kiểm kê <b>' + da + '/' + tat.length + '</b>' +
      (tat.some(lech) ? ' · <b style="color:#B42318">' + tat.filter(lech).length + ' mục thực tế khác sổ</b>' : '');
    const k = $('cc-kk-thanh');
    k.innerHTML = KK ? '<div class="card" style="border-color:#2E7D5B;background:#F1FAF5"><b>Chế độ kiểm kê</b> – ' + l.length + ' dòng đang hiện' + ($('cc-loc').value ? ' (' + esc(tenLoc($('cc-loc').value)) + ')' : ' – nên chọn vị trí trước') +
      '. Ô "Thực tế" điền sẵn số trên sổ; sửa dòng thiếu / thừa rồi bấm Lưu. <div class="btns" style="margin-top:8px"><button class="btn sm" id="cc-kk-luu">Lưu kiểm kê ' + l.length + ' dòng</button>' +
      '<button class="btn o sm" id="cc-kk-thoat">Thoát kiểm kê</button><button class="btn red o sm" id="cc-kk-bo" style="margin-left:auto">Bỏ kết quả kiểm kê năm ' + esc(D.nam) + '</button></div></div>' : '';
    if (KK) {
      $('cc-kk-thoat').onclick = () => { KK = false; veDS(); };
      $('cc-kk-luu').onclick = (e) => { const kk = [...document.querySelectorAll('#cc-ds tr[data-id]')].map(tr => ({ id: tr.dataset.id, sl: tr.querySelector('[data-kk-sl]').value, gc: tr.querySelector('[data-kk-gc]').value }));
        if (!kk.length) return toast('Không có dòng nào đang hiện', true);
        chay(e.target, async () => { const r = await api('ccdc_kk', { kk }); toast('Đã ghi kiểm kê ' + r.n + ' dòng'); await taiLai(); }); };
      $('cc-kk-bo').onclick = (e) => { if (!confirm('Bỏ toàn bộ kết quả kiểm kê của sổ năm ' + D.nam + ' để bắt đầu đợt kiểm kê mới?')) return;
        chay(e.target, async () => { const r = await api('ccdc_kk', { nam: D.nam, bo: 1 }); toast('Đã bỏ kiểm kê ' + r.n + ' dòng'); await taiLai(); }); };
    }
    if (!tat.length) { $('cc-ds').innerHTML = '<div class="card empty">Sổ năm ' + esc(D.nam) + ' chưa có dòng nào.' + (xl() ? ' Bấm "⇪ Tải file sổ lên" (file sổ CCDC của Trường) hoặc "+ Thêm dòng".' : '') + '</div>'; return; }
    $('cc-ds').innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>STT</th><th>Mã CCDC</th><th>Mã KT</th><th>Vị trí</th><th>Tên CCDC</th><th>Nước SX</th><th>ĐVT</th><th class="num">SL</th>' +
      (KK ? '<th class="num">Thực tế</th><th>Ghi chú kiểm kê</th>' : '<th>Ghi chú</th><th>Kiểm kê</th>' + (xl() ? '<th></th>' : '')) + '</tr></thead><tbody>' +
      l.map(x => '<tr data-id="' + esc(x.id) + '"' + (lech(x) ? ' style="background:#FEF3F2"' : '') + '><td>' + (tat.indexOf(x) + 1) + '</td><td class="mono">' + esc(x.ma) + '</td><td class="mono">' + esc(x.ma_kt) + '</td>' +
        '<td>' + esc(x.vi_tri) + (x.phong ? '<div class="note"><a href="#/phong/' + encodeURIComponent(x.phong) + '">' + esc(x.phong) + '</a></div>' : '') + '</td>' +
        '<td style="min-width:220px"><b>' + esc(x.ten) + '</b>' + (x.thong_so && x.thong_so !== x.ten ? '<div class="note">' + esc(x.thong_so) + '</div>' : '') + '</td><td>' + esc(x.nuoc_sx) + '</td><td>' + esc(x.dvt) + '</td><td class="num">' + fmt(x.sl) + '</td>' +
        (KK ? '<td class="num"><input type="number" min="0" step="any" data-kk-sl value="' + (x.kk_sl != null ? x.kk_sl : x.sl) + '" style="width:80px"></td><td><input data-kk-gc value="' + esc(x.kk_gc || '') + '" placeholder="VD: hỏng 2, thiếu…" style="min-width:160px"></td>'
          : '<td class="note">' + esc([x.ghi_chu, x.da_kt].filter(Boolean).join(' · ')) + '</td><td>' + (x.kk_ngay ? (lech(x) ? '<b style="color:#B42318">Thực tế ' + fmt(x.kk_sl) + '</b>' : '✓ Đủ') +
            '<div class="note">' + ngayVN(x.kk_ngay) + ' · ' + esc(x.kk_nguoi) + (x.kk_gc ? ' · ' + esc(x.kk_gc) : '') + '</div>' : '<span class="note">chưa kiểm</span>') + '</td>' +
            (xl() ? '<td style="white-space:nowrap"><button class="btn o sm" data-sua="' + esc(x.id) + '" title="Sửa">✎</button><button class="btn red o sm" data-xoa="' + esc(x.id) + '" title="Xóa">✕</button></td>' : '')) + '</tr>').join('') + '</tbody></table></div>';
    document.querySelectorAll('#cc-ds [data-sua]').forEach(b => { b.onclick = () => hopSua(D.ds.find(x => x.id === b.dataset.sua)); });
    document.querySelectorAll('#cc-ds [data-xoa]').forEach(b => { b.onclick = (e) => { const x = D.ds.find(y => y.id === b.dataset.xoa); if (!confirm('Xóa "' + x.ten + '" (' + (x.ma || 'không mã') + ') khỏi sổ năm ' + D.nam + '?')) return;
      chay(e.target, async () => { await api('ccdc_xoa', { ids: [x.id] }); toast('Đã xóa'); await taiLai(); }); }; });
  }
  function hopSua(x) {
    x = x || { dvt: 'cái', sl: 1 };
    moHop('<h2>' + (x.id ? 'Sửa công cụ dụng cụ' : 'Thêm vào sổ CCDC năm ' + esc(D.nam)) + '</h2><form id="cc-f" class="form-grid">' +
      o('ma', 'Mã CCDC', { v: x.ma }) + o('ma_kt', 'Mã KT', { v: x.ma_kt }) + o('vi_tri', 'Mã vị trí (VD 1F04.02)', { v: x.vi_tri }) + o('dvt', 'ĐVT', { v: x.dvt }) +
      o('ten', 'Tên CCDC', { v: x.ten, req: 1, full: 1 }) + o('thong_so', 'Thông số kỹ thuật', { v: x.thong_so, area: 1, full: 1 }) + o('nuoc_sx', 'Nước SX', { v: x.nuoc_sx }) +
      o('sl', 'Số lượng', { type: 'number', v: x.sl, extra: ' min="0" step="any"' }) + o('ghi_chu', 'Ghi chú', { v: x.ghi_chu }) + o('da_kt', 'Đã kiểm tra (ghi như sổ, VD "BTH-2026")', { v: x.da_kt }) +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (m) => {
      m.querySelector('#cc-f').onsubmit = async (e) => { e.preventDefault(); await chay(e.submitter, () => api('ccdc_luu', { nam: D.nam, d: Object.assign(giaTri(e.target), { id: x.id || '' }) })); dongHop(); toast('Đã lưu'); await taiLai(); };
    });
  }
  function hopTaoNam() {
    const goi = String(Math.max.apply(null, D.cac_nam.map(Number)) + 1);
    moHop('<h2>Tạo sổ công cụ dụng cụ năm mới</h2><form id="cc-f" class="form-grid">' + o('nam', 'Năm', { type: 'number', v: goi, req: 1, extra: ' min="2000" max="2100"' }) +
      o('tu', 'Dữ liệu ban đầu', { select: [['', 'Sổ trống (tải file sổ lên sau)']].concat(D.cac_nam.slice().reverse().map(n => [n, 'Chép toàn bộ sổ năm ' + n + ' (bỏ kết quả kiểm kê)'])), v: D.ds.length ? D.nam : '', full: 1 }) +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tạo sổ</button></div></form>', (m) => {
      m.querySelector('#cc-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); const r = await chay(e.submitter, () => api('ccdc_tao_nam', { nam: v.nam, tu: v.tu }));
        dongHop(); toast(r.n ? 'Đã tạo sổ năm ' + r.nam + ' – ' + r.n + ' dòng' : 'Đã tạo sổ năm ' + r.nam); location.hash = '#/ccdc/' + r.nam; };
    });
  }
  // ---------- tải file sổ (.xls / .xlsx theo mẫu: dòng tiêu đề có "MÃ CCDC", "TÊN CCDC") ----------
  function docSo(XLSX, wb) {
    for (const ten of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[ten], { header: 1, raw: true, defval: '' }), b = (v) => boDau(String(v == null ? '' : v)).trim();
      const hd = rows.findIndex(r => r.some(v => /ma ccdc/.test(b(v))) && r.some(v => /^ten/.test(b(v))));
      if (hd < 0) continue;
      const h = rows[hd].map(b), cot = (re) => h.findIndex(x => re.test(x));
      const c = { ma: cot(/ma ccdc/), ma_kt: cot(/^ma kt/), vi_tri: cot(/vi tri/), ten: cot(/^ten/), thong_so: cot(/thong so/), nuoc_sx: cot(/nuoc/), dvt: cot(/^dvt|don vi/), sl: cot(/so luong/), ghi_chu: cot(/ghi chu/), da_kt: cot(/kiem tra/) };
      const nam = (rows.slice(0, hd).map(r => r.join(' ')).join(' ').match(/N[ĂA]M\s+(20\d\d)/i) || [])[1] || '', dong = [];
      for (let i = hd + 1; i < rows.length; i++) {
        const r = rows[i], g = (k) => c[k] >= 0 ? String(r[c[k]] == null ? '' : r[c[k]]).replace(/\s+$/g, '').trim() : '';
        if (/^ngay\b|nguoi lap/.test(b(r[0]))) break;
        if (!g('ten')) continue;
        dong.push({ ma: g('ma'), ma_kt: g('ma_kt'), vi_tri: g('vi_tri'), ten: g('ten'), thong_so: g('thong_so'), nuoc_sx: g('nuoc_sx'), dvt: g('dvt'), sl: +String(g('sl')).replace(',', '.') || 0, ghi_chu: g('ghi_chu'), da_kt: g('da_kt') });
      }
      return { ten, nam, dong };
    }
    throw new Error('Không thấy dòng tiêu đề "MÃ CCDC – TÊN CCDC" của sổ công cụ dụng cụ');
  }
  async function hopNhap(f) {
    try {
      const XLSX = await napXlsx(), r = docSo(XLSX, XLSX.read(await f.arrayBuffer(), { type: 'array' }));
      if (!r.dong.length) throw new Error('Không đọc được dòng công cụ dụng cụ nào');
      const nam = r.nam || D.nam, co = D.cac_nam.indexOf(nam) >= 0 && nam === D.nam ? D.ds.length : null;
      moHop('<h2>Tải sổ công cụ dụng cụ</h2><p class="note">' + esc(f.name) + ' · trang tính <b>' + esc(r.ten) + '</b> · <b>' + r.dong.length + '</b> dòng · tổng số lượng <b>' + fmt(r.dong.reduce((a, x) => a + x.sl, 0)) + '</b>' + (r.nam ? ' · sổ năm <b>' + r.nam + '</b>' : '') + '</p>' +
        '<form id="cc-f" class="form-grid">' + o('nam', 'Nhập vào sổ năm', { type: 'number', v: nam, req: 1, extra: ' min="2000" max="2100"' }) +
        o('cach', 'Cách nhập', { select: [['them', 'Cập nhật theo mã CCDC (trùng mã thì sửa, giữ kết quả kiểm kê; mã mới thêm cuối sổ)'], ['thay', 'Thay toàn bộ sổ của năm (xóa dòng cũ)']], v: co ? 'them' : 'thay', full: 1 }) +
        '<p class="note full">Lần tải ghi vào <b>Lịch sử tải file</b> (thu hồi được, lưu file gốc).</p><div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Nhập ' + r.dong.length + ' dòng</button></div></form>', (m) => {
        m.querySelector('#cc-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target);
          if (v.cach === 'thay' && !confirm('Xóa toàn bộ sổ năm ' + v.nam + ' rồi nhập lại từ file?')) return;
          const k = await chay(e.submitter, () => api('ccdc_nhap', { nam: v.nam, thay: v.cach === 'thay' ? 1 : 0, dong: r.dong, tep: f.name }));
          dongHop(); toast('Sổ năm ' + k.nam + ': thêm ' + k.them + ', cập nhật ' + k.sua + ' dòng'); location.hash = '#/ccdc/' + k.nam; Q.dieuHuong(); };
      });
    } catch (err) { toast(err.message, true); }
    const x = $('x-file'); if (x) x.value = '';
  }
  // ---------- xuất Excel theo mẫu sổ (PTN_IN: Excel + xem trước in) ----------
  function hopXuat() {
    const loc = $('cc-loc').value, l = dangLoc();
    moHop('<h2>Xuất sổ công cụ dụng cụ năm ' + esc(D.nam) + '</h2><form id="cc-f" class="form-grid">' +
      o('pv', 'Dòng đưa vào sổ', { select: [['tat', 'Cả sổ (' + D.ds.length + ' mục)']].concat(l.length !== D.ds.length ? [['loc', 'Theo bộ lọc đang chọn' + (loc ? ' – ' + tenLoc(loc) : '') + ' (' + l.length + ' mục)']] : []), full: 1 }) +
      '<p class="note full">Theo mẫu "SỔ CÔNG CỤ DỤNG CỤ": 11 cột như sổ của Trường; cột "Đã kiểm tra" ghi kết quả kiểm kê trên web (Đủ / Thực tế …, ngày); cuối sổ: ngày, Người lập biểu, Nhóm kiểm kê, Phòng quản trị, Trưởng đơn vị sử dụng.</p>' +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button type="button" class="btn o" id="cc-xem">Xem trước – in</button><button class="btn">⇩ Tải file Excel</button></div></form>', (m) => {
      const ds = () => m.querySelector('[name=pv]').value === 'loc' ? l : D.ds, tl = () => m.querySelector('[name=pv]').value === 'loc' ? loc : '';
      m.querySelector('#cc-xem').onclick = () => { dongHop(); window.PTN_IN.xemTruoc(soMau(ds(), tl())); };
      m.querySelector('#cc-f').onsubmit = async (e) => { e.preventDefault(); const a = ds(), b = tl(); await chay(e.submitter, () => xuat(a, b)); dongHop(); };
    });
  }
  async function xuat(ds, loc) { await window.PTN_IN.taiExcel(soMau(ds, loc)); toast(loc === 'trong' ? 'Đã tải file mẫu trống' : 'Đã tạo sổ: ' + ds.length + ' mục'); }
  function soMau(ds, loc) {
    const trong = loc === 'trong', nam = trong ? String(new Date().getFullYear()) : D.nam, d = new Date();
    const v = (x, b) => ({ v: x, cs: 11, can: 'c', b: b ? 1 : 0, co: 11 });
    const hang = [{ o: [{ v: 'TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH', cs: 11, b: 1, co: 10 }] }, { o: [{ v: 'Địa chỉ: 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh', cs: 11, co: 10 }] }, { o: [{ v: '', cs: 11 }] },
      { cao: 24, o: [{ v: 'SỔ CÔNG CỤ DỤNG CỤ', cs: 11, can: 'c', b: 1, co: 15 }] }, { o: [v(String(D.don_vi || '').toUpperCase(), 1)] }, { o: [v('NĂM ' + nam + (loc && !trong ? ' – ' + tenLoc(loc).toUpperCase() : ''), 1)] }, { o: [{ v: '', cs: 11 }] },
      { cao: 30, o: COT.map(c => ({ v: c, b: 1, can: 'c', vien: 1, nen: '#D9E2F3', co: 10 })) }];
    const dong = trong ? Array.from({ length: 25 }, () => null) : ds;
    dong.forEach((x, i) => { hang.push({ o: x ? [{ v: i + 1, can: 'c' }, { v: x.ma }, { v: x.ma_kt }, { v: x.vi_tri, can: 'c' }, { v: x.ten }, { v: x.thong_so }, { v: x.nuoc_sx }, { v: x.dvt, can: 'c' }, { v: x.sl, can: 'r' },
      { v: x.ghi_chu }, { v: [x.da_kt, kkChu(x)].filter(Boolean).join('; ') }].map(c => Object.assign(c, { vien: 1, co: 10 })) : COT.map(() => ({ v: '', vien: 1, co: 10 })) }); });
    if (!trong) hang.push({ o: [{ v: 'Cộng: ' + ds.length + ' mục', cs: 8, b: 1, can: 'r', vien: 1, co: 10 }, { v: ds.reduce((a, x) => a + x.sl, 0), b: 1, can: 'r', vien: 1, co: 10 }, { v: '', cs: 2, vien: 1 }] });
    hang.push({ o: [{ v: '', cs: 11 }] }, { o: [{ v: trong ? 'Ngày …… tháng …… năm ……' : 'Ngày ' + String(d.getDate()).padStart(2, '0') + ' tháng ' + String(d.getMonth() + 1).padStart(2, '0') + ' năm ' + d.getFullYear(), cs: 11, can: 'r', i: 1, co: 10 }] },
      { o: [['Người lập biểu', 3], ['Nhóm kiểm kê', 2], ['Phòng quản trị', 3], ['Trưởng đơn vị sử dụng', 3]].map(([t, n]) => ({ v: t, cs: n, can: 'c', b: 1, co: 10 })) },
      { o: [3, 2, 3, 3].map(n => ({ v: '(Ký, ghi rõ họ tên)', cs: n, can: 'c', i: 1, co: 9 })) }, { cao: 60, o: [{ v: '', cs: 11 }] });
    return { ten: trong ? 'MAU SO CONG CU DUNG CU' : 'SO CONG CU DUNG CU ' + nam + (loc ? ' - ' + boDau(tenLoc(loc)).toUpperCase() : ''),
      trang: [{ ten: 'CCDC', huong: 'ngang', cot: [6, 15, 11, 10, 34, 22, 12, 7, 9, 10, 18], hang, lapLai: [8, 8] }] };
  }
  // ---------- trang phòng: CCDC của phòng (sổ năm mới nhất) ----------
  async function ccdcPhong(ma, el) {
    if (!el) return;
    let r; try { r = await api('ccdc_ds', { phong: ma }); } catch (e) { return; }
    if (!r.ds.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="card"><div class="btns" style="justify-content:space-between"><h2 style="margin:0">Công cụ dụng cụ (' + r.ds.length + ' mục · ' + fmt(r.ds.reduce((a, x) => a + x.sl, 0)) + ' cái/bộ · sổ năm ' + esc(r.nam) + ')</h2>' +
      '<a class="btn o sm" href="#/ccdc/' + esc(r.nam) + '/' + encodeURIComponent('p:' + ma) + '">Mở sổ CCDC của phòng</a></div><div class="tbl-wrap" style="max-height:420px"><table><thead><tr><th>Mã CCDC</th><th>Tên CCDC</th><th>ĐVT</th><th class="num">SL</th><th>Kiểm kê</th></tr></thead><tbody>' +
      r.ds.map(x => '<tr><td class="mono">' + esc(x.ma) + '</td><td>' + esc(x.ten) + '</td><td>' + esc(x.dvt) + '</td><td class="num">' + fmt(x.sl) + '</td><td>' + (x.kk_ngay ? (lech(x) ? '<b style="color:#B42318">Thực tế ' + fmt(x.kk_sl) + '</b>' : '✓ Đủ') + ' <span class="note">' + ngayVN(x.kk_ngay) + '</span>' : '<span class="note">chưa kiểm</span>') + '</td></tr>').join('') +
      '</tbody></table></div></div>';
  }
  Object.assign(Q.TUYEN, { ccdc: manCCDC });
  Q.ccdcPhong = ccdcPhong;
})();
