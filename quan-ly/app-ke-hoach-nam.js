/* Kế hoạch năm – dự trù thiết bị: danh sách thiết bị dự trù năm theo mẫu "KẾ HOẠCH MUA SẮM NĂM" của P.KHĐT.
   Thêm / sửa / xóa dòng, dòng con (43.1…), đổi thứ tự, duyệt – đã mua – không duyệt; phiếu GV-BS giảng viên gửi tự vào danh sách ("Chờ duyệt", trùng thì gộp).
   Nhập từ file Excel đúng mẫu; xuất Excel dựng từ file mẫu mau/ke-hoach-mua-sam-nam.xlsx (giữ định dạng, viết lại công thức D=SUM(E:H), J=I*…, tổng mục, tổng cuối).
   Máy chủ: apps-script/24_KeHoachNam.gs. Trang: #/ke-hoach-nam, #/ke-hoach-nam/<năm>. Số tiền: nghìn đồng như file mẫu. */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, boDau, fmt, coQuyen, napXlsx, laAdmin } = Q;
  const MAU_TT = { 'Chờ duyệt': 't-warn', 'Đã duyệt': 't-info', 'Mua một phần': 't-warn', 'Đã mua': 't-ok', 'Ngừng mua': 't-gray', 'Không duyệt': 't-gray' };
  const TT_TAY = ['Chờ duyệt', 'Đã duyệt', 'Đã mua', 'Không duyệt']; // chọn tay / hàng loạt; "Mua một phần", "Ngừng mua" ghi ở nút 🛒 Mua
  const tagTT = (t) => '<span class="tag ' + (MAU_TT[t] || 't-gray') + '">' + esc(t) + '</span>';
  const xl = () => coQuyen('ke-hoach-nam', 'xu_ly');
  const NC = ['bo_sung', 'thay_moi', 'sua_chua', 'nang_cap'];
  const so = (v) => { if (typeof v === 'number') return v; const s = String(v == null ? '' : v).trim(); if (!s) return 0;
    const n = parseFloat(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.')); return isNaN(n) ? 0 : n; };
  const tien = (v) => v ? fmt(Math.round(v * 1000) / 1000) : '';
  let D = null; // dữ liệu năm đang xem
  const tdN = (s, nam) => { s = String(s || '').trim(); return s ? s.replace(/20\d\d/g, nam) : 'Năm ' + nam; }; // thời điểm thực hiện theo năm kế hoạch

  async function manKHN(p) {
    const nam = /^\d{4}$/.test(p[1] || '') ? p[1] : '', tabXd = p[2] === 'xd';
    const nd = trang('Danh sách thiết bị dự trù năm', '', '<a href="#/tai-san">Tài sản</a> ›');
    D = await api('khn_ds', nam ? { nam } : {});
    if (!nam) history.replaceState(null, '', '#/ke-hoach-nam/' + D.nam + (tabXd ? '/xd' : '')); // địa chỉ luôn ghi năm: tải lại trang vẫn đúng năm đang xem
    D.leaf = D.muc.filter(m => m[4]);
    $('main').querySelector('h1').innerHTML = 'Danh sách thiết bị dự trù năm <select id="k-nam" class="sm" style="font-size:inherit;font-weight:700">' +
      D.cac_nam.concat([String(+D.cac_nam[D.cac_nam.length - 1] + 1)]).filter((x, i, a) => a.indexOf(x) === i).map(n => '<option' + (n === D.nam ? ' selected' : '') + '>' + n + '</option>').join('') +
      (xl() ? '<option value="+">+ Tạo năm…</option>' : '') + '</select>';
    // đổi năm phải xác nhận: ô năm đang chọn có thể bị đổi nhầm bằng phím mũi tên / cuộn → không tự chuyển trang
    $('k-nam').onchange = (e) => { const v = e.target.value; e.target.value = D.nam; e.target.blur();
      if (v === '+') return hopTaoNam();
      if (v !== D.nam && confirm('Chuyển từ danh sách năm ' + D.nam + ' sang danh sách năm ' + v + '?')) location.hash = '#/ke-hoach-nam/' + v; };
    const c = D.cau_hinh, mo = D.nam === D.nam_mo;
    nd.innerHTML = '<div class="card note" style="border-color:#E8C77A;background:#FFFBEF">Năm <b>' + esc(D.nam) + '</b>: ' +
      (mo ? 'đang nhận đề xuất từ giảng viên (phiếu <b>GV-BS – Kế hoạch năm – dự trù thiết bị</b> ở trang dùng chung tự vào danh sách, trạng thái "Chờ duyệt")' + (c.han ? ' · hạn nộp <b>' + ngayVN(c.han) + '</b>' + (c.han < Q.homNay() ? ' <span class="tag t-gray">đã hết hạn</span>' : '') : ' · chưa đặt hạn nộp') :
        'không phải năm đang nhận đề xuất (năm nhận đề xuất: ' + esc(D.nam_mo) + ')') + '. Số tiền tính theo <b>nghìn đồng</b> như file của Trường.' +
      (c.khoa ? '<br><b>🔒 Năm ' + esc(D.nam) + ' đã khóa</b>: chỉ xem, xuất file, ghi nhận mua; không thêm / sửa / xóa / duyệt / nhập / chuyển (mở khóa ở "⚙ Hạn nộp – kinh phí khoán").' : '') + '</div>' +
      '<div class="btns" style="margin:10px 0">' + (xl() ? '<button class="btn sm" id="k-them">+ Thêm dòng</button><label class="btn o sm">⇪ Nhập từ file Excel<input type="file" id="x-file" accept=".xlsx,.xls" hidden></label>' : '') +
      '<button class="btn o sm" id="k-xuat">⇩ Xuất file Excel theo mẫu</button><button class="btn o sm" id="k-bc">📊 Báo cáo thực hiện</button>' + (xl() ? '<button class="btn o sm" id="k-chep">⇄ Chuyển / cập nhật từ năm khác</button><button class="btn o sm" id="k-ch">⚙ Hạn nộp – kinh phí khoán</button>' : '') + '</div>' +
      (D.xd ? '<div class="btns" style="margin:0 0 10px"><a class="btn sm ' + (tabXd ? 'o' : 'chon') + '" href="#/ke-hoach-nam/' + D.nam + '">Mua sắm thiết bị (trang tính Muasam)</a>' +
        '<a class="btn sm ' + (tabXd ? 'chon' : 'o') + '" href="#/ke-hoach-nam/' + D.nam + '/xd">🔒 Xây dựng – sửa chữa công trình (trang tính Xaydung, chỉ admin)</a></div><div id="k-xd"' + (tabXd ? '' : ' hidden') + '></div>' : '') +
      '<div id="k-tb"' + (D.xd && tabXd ? ' hidden' : '') + '><div id="k-tong"></div><div class="tools"><input type="search" id="k-q" placeholder="Tìm tên, yêu cầu kỹ thuật, bộ môn, người đề xuất…"><select id="k-tt"><option value="">Mọi trạng thái</option>' +
      D.trang_thai.map(t => '<option>' + t + '</option>').join('') + '</select><select id="k-muc" style="max-width:340px"><option value="">Mọi mục</option>' + D.leaf.map(m => '<option value="' + m[0] + '">' + esc(m[0] + ' – ' + m[3]) + '</option>').join('') + '</select>' +
      '<select id="k-bm"><option value="">Mọi bộ môn</option>' + [...new Set(D.dong.map(d => d.bo_mon).filter(Boolean))].sort().map(b => '<option>' + esc(b) + '</option>').join('') + '</select></div>' +
      (xl() ? '<div class="btns" id="k-chon" style="margin:6px 0" hidden><span class="note" id="k-dem"></span>' + TT_TAY.map(t => '<button class="btn o sm" data-tt="' + t + '">→ ' + t + '</button>').join('') + '<button class="btn o sm" id="k-chuyen">⇄ Chuyển sang năm…</button><button class="btn red o sm" id="k-xoa">Xóa dòng đã chọn</button></div>' : '') +
      '<div id="k-ds"></div></div>';
    $('k-q').oninput = veDS; ['k-tt', 'k-muc', 'k-bm'].forEach(id => { $(id).onchange = veDS; });
    $('k-xuat').onclick = hopXuat; $('k-bc').onclick = hopBaoCao;
    const nx = $('b-xuat-trang'); if (nx) { nx.textContent = '⇩ Xuất file Excel theo mẫu'; nx.onclick = hopXuat; } // nút chung chỉ chép bảng (không công thức)
    if (xl()) {
      $('k-them').onclick = () => hopSua(null);
      $('x-file').onchange = (e) => { const f = e.target.files[0]; if (f) hopNhap(f); };
      $('k-chep').onclick = () => hopLienKet(); $('k-ch').onclick = hopCauHinh;
      $('k-chuyen').onclick = () => { const ids = dangChon(), den = prompt('Chuyển ' + ids.length + ' dòng đã chọn (phần còn phải mua) sang kế hoạch năm:', String(+D.nam + 1)); if (!den) return;
        if (!/^20\d\d$/.test(den.trim()) || den.trim() === D.nam) return toast('Năm không hợp lệ', true); hopLienKet(D.nam, ids, den.trim()); };
      $('k-chon').querySelectorAll('[data-tt]').forEach(b => { b.onclick = (e) => chay(e.target, async () => { const r = await api('khn_tt', { ids: dangChon(), trang_thai: b.dataset.tt }); toast('Đã chuyển ' + r.n + ' dòng sang "' + b.dataset.tt + '"'); await taiLai(); }); });
      $('k-xoa').onclick = (e) => { const ids = dangChon(); if (!confirm('Xóa ' + ids.length + ' dòng đã chọn (kèm dòng con)?')) return; chay(e.target, async () => { const r = await api('khn_xoa', { ids }); toast('Đã xóa ' + r.n + ' dòng'); await taiLai(); }); };
    }
    veTong(); veDS(); if (D.xd) veXD();
    if (moLK) { const t = moLK; moLK = null; hopLienKet(t); } // vừa tạo năm "lấy từ năm trước"
  }
  let moLK = null;
  async function taiLai() { const y = window.scrollY; D = await api('khn_ds', { nam: D.nam }); D.leaf = D.muc.filter(m => m[4]); veTong(); veDS(); if (D.xd) veXD(); window.scrollTo(0, y); }

  // ---------- trang tính Xây dựng: sửa chữa, cải tạo, xây dựng công trình (chỉ admin) ----------
  function veXD() {
    const l = D.xd.filter(x => !x.cha), tong = l.reduce((a, x) => a + x.kinh_phi, 0), ctCua = (id) => D.xd.filter(x => x.cha === id);
    let h = '<div class="card note">Trang tính <b>Xaydung</b> của file kế hoạch: danh mục sửa chữa, cải tạo, nâng cấp, mở rộng, xây dựng mới hạng mục công trình. Chỉ admin xem và sửa; giảng viên chỉ đề xuất thiết bị. ' +
      'Xuất file: mục chưa có hạng mục giữ nguyên dòng ví dụ của mẫu; cột Tổng kinh phí = Khối lượng × Đơn giá.</div>' +
      '<div class="btns" style="margin:10px 0"><button class="btn sm" id="x-them">+ Thêm hạng mục</button><span class="note">Tổng: <b>' + tien(tong) + '</b> nghìn đồng · ' + l.length + ' hạng mục' + (D.xd.length > l.length ? ' · ' + (D.xd.length - l.length) + ' dòng chi tiết (đơn giá 1 bộ của hạng mục = tổng thành tiền các dòng chi tiết)' : '') + '</span></div>';
    if (!l.length) h += '<div class="card empty">Chưa có hạng mục xây dựng – sửa chữa năm ' + esc(D.nam) + '. Bấm "+ Thêm hạng mục" hoặc nhập từ file Excel (trang tính Xaydung).</div>';
    else {
      h += '<div class="tbl-wrap"><table><thead><tr><th>TT</th><th>Danh mục</th><th>Tên công trình</th><th>Địa điểm</th><th>Mục tiêu</th><th>Sự cần thiết, lý do</th><th>Tiêu chuẩn, định mức</th><th>ĐVT</th><th class="num">Khối lượng</th><th class="num">Đơn giá</th><th class="num">Tổng kinh phí</th><th>Thời điểm</th><th></th></tr></thead><tbody>';
      D.muc_xd.forEach(m => { const lm = l.filter(x => x.muc === m[0]); if (!lm.length) return;
        h += '<tr style="background:#F3F6FC"><td colspan="13"><b>' + esc(m[0].replace('#2', '')) + '</b> – ' + esc(m[1]) + ' · <span class="note">' + tien(lm.reduce((a, x) => a + x.kinh_phi, 0)) + ' nghìn đ</span></td></tr>';
        lm.forEach((x, i) => { h += '<tr' + (x.xong ? ' style="opacity:.6"' : '') + '><td>' + (i + 1) + (x.xong ? '<div class="note" title="Đã thực hiện / P.KHĐT đã duyệt">✓</div>' : '') +
          (x.tu_nam ? '<div class="note" title="Chuyển từ năm ' + esc(x.tu_nam) + '">↳ ' + esc(x.tu_nam) + '</div>' : '') + (x.chuyen ? '<div class="note" title="Đã chuyển sang năm ' + esc(x.chuyen) + '">→ ' + esc(x.chuyen) + '</div>' : '') + '</td>' + ['ten', 'cong_trinh', 'dia_diem', 'muc_tieu', 'ly_do', 'tieu_chuan', 'dvt'].map(k => '<td style="white-space:pre-line;' + ({ ten: 'min-width:240px', muc_tieu: 'min-width:200px', ly_do: 'min-width:180px', tieu_chuan: 'min-width:160px', cong_trinh: 'min-width:140px', dia_diem: 'min-width:110px' }[k] || '') + '">' + esc(x[k]) + '</td>').join('') +
          '<td class="num">' + fmt(x.khoi_luong) + '</td><td class="num">' + tien(x.don_gia) + (x.so_ct ? '<div class="note" title="Đơn giá 1 bộ = tổng thành tiền các dòng chi tiết">= tổng chi tiết</div>' : '') + '</td><td class="num"><b>' + tien(x.kinh_phi) + '</b></td><td>' + esc(x.thoi_diem) + '</td>' +
          '<td style="white-space:nowrap"><button class="btn o sm" data-xs="' + esc(x.id) + '" title="Sửa">✎</button><button class="btn o sm" data-xl="' + esc(x.id) + '" title="Lên">↑</button><button class="btn o sm" data-xx="' + esc(x.id) + '" title="Xuống">↓</button><button class="btn red o sm" data-xd="' + esc(x.id) + '" title="Xóa">✕</button><button class="btn o sm" data-xc="' + esc(x.id) + '" title="Thêm dòng chi tiết (bàn, ghế, tủ… của hạng mục)">+ chi tiết</button></td></tr>';
          // dòng chi tiết 1.1, 1.2…: danh mục, ĐVT, khối lượng, đơn giá; thành tiền cộng vào đơn giá 1 bộ của hạng mục
          ctCua(x.id).forEach((c, j) => { h += '<tr style="background:#FBFCFE"><td class="note">' + (i + 1) + '.' + (j + 1) + '</td><td colspan="6" style="white-space:pre-line;padding-left:22px">' + esc(c.ten) + (c.ghi_chu ? '<div class="note">' + esc(c.ghi_chu) + '</div>' : '') + '</td><td>' + esc(c.dvt) + '</td>' +
            '<td class="num">' + fmt(c.khoi_luong) + '</td><td class="num">' + (c.don_gia ? tien(c.don_gia) : '<span class="note">—</span>') + '</td><td class="num">' + (c.kinh_phi ? tien(c.kinh_phi) : '') + '</td><td></td>' +
            '<td style="white-space:nowrap"><button class="btn o sm" data-xs="' + esc(c.id) + '" title="Sửa">✎</button><button class="btn o sm" data-xl="' + esc(c.id) + '" title="Lên">↑</button><button class="btn o sm" data-xx="' + esc(c.id) + '" title="Xuống">↓</button><button class="btn red o sm" data-xd="' + esc(c.id) + '" title="Xóa">✕</button></td></tr>'; }); }); });
      h += '</tbody></table></div>';
    }
    const k = $('k-xd'); k.innerHTML = h;
    $('x-them').onclick = () => hopXD(null);
    k.querySelectorAll('[data-xs]').forEach(b => { b.onclick = () => hopXD(D.xd.find(x => x.id === b.dataset.xs)); });
    k.querySelectorAll('[data-xc]').forEach(b => { b.onclick = () => hopXD({ cha: b.dataset.xc, dvt: 'Cái', khoi_luong: 1 }); });
    k.querySelectorAll('[data-xl],[data-xx]').forEach(b => { b.onclick = (e) => chay(e.target, async () => { await api('khn_xd_doi_cho', { id: b.dataset.xl || b.dataset.xx, huong: b.dataset.xl ? -1 : 1 }); await taiLai(); }); });
    k.querySelectorAll('[data-xd]').forEach(b => { b.onclick = (e) => { const n = ctCua(b.dataset.xd).length; if (!confirm(n ? 'Xóa hạng mục này và ' + n + ' dòng chi tiết?' : 'Xóa dòng này?')) return; chay(e.target, async () => { await api('khn_xd_xoa', { ids: [b.dataset.xd] }); toast('Đã xóa'); await taiLai(); }); }; });
  }
  function hopXD(x) {
    x = x || { muc: 'C.VI', dvt: 'Bộ', khoi_luong: 1, thoi_diem: 'Năm ' + D.nam };
    if (x.cha) { // dòng chi tiết của hạng mục: danh mục, ĐVT, khối lượng, đơn giá (thành tiền cộng vào đơn giá 1 bộ của hạng mục)
      const hm = D.xd.find(y => y.id === x.cha) || {};
      moHop('<h2>' + (x.id ? 'Sửa dòng chi tiết' : 'Thêm dòng chi tiết') + '</h2><p class="note">Hạng mục: <b>' + esc(String(hm.ten || '').split('\n')[0]) + '</b></p><form id="k-f" class="form-grid">' +
        o('ten', 'Danh mục (tên, kích thước, chất liệu…)', { area: 1, v: x.ten, req: 1, full: 1 }) + o('dvt', 'Đơn vị tính', { v: x.dvt }) + o('khoi_luong', 'Khối lượng', { type: 'number', v: x.khoi_luong || '', extra: ' min="0" step="any"' }) +
        o('don_gia', 'Đơn giá (nghìn đồng) – thành tiền cộng vào đơn giá 1 bộ của hạng mục', { type: 'number', v: x.don_gia || '', extra: ' min="0" step="any"' }) + o('ghi_chu', 'Ghi chú (không in vào file)', { v: x.ghi_chu }) +
        '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (m) => {
        const f = m.querySelector('#k-f'); m.querySelectorAll('textarea').forEach(t => { t.rows = 4; });
        f.onsubmit = async (e) => { e.preventDefault(); await chay(e.submitter, () => api('khn_xd_luu', { nam: D.nam, d: Object.assign(giaTri(f), { id: x.id || '', cha: x.cha, muc: hm.muc }) })); dongHop(); toast('Đã lưu'); await taiLai(); };
      });
      return;
    }
    moHop('<h2>' + (x.id ? 'Sửa hạng mục' : 'Thêm hạng mục xây dựng – sửa chữa năm ' + esc(D.nam)) + '</h2><form id="k-f" class="form-grid">' +
      o('muc', 'Mục trong trang tính Xaydung', { select: D.muc_xd.map(m => [m[0], m[0].replace('#2', ' (2)') + ' – ' + m[1]]), v: x.muc, full: 1 }) +
      o('ten', 'Danh mục sửa chữa, cải tạo, nâng cấp, mở rộng, xây dựng mới', { area: 1, v: x.ten, req: 1, full: 1 }) + o('cong_trinh', 'Tên công trình', { v: x.cong_trinh }) + o('dia_diem', 'Địa điểm', { v: x.dia_diem }) +
      o('muc_tieu', 'Mục tiêu', { area: 1, v: x.muc_tieu, full: 1 }) + o('ly_do', 'Sự cần thiết, lý do thực hiện', { area: 1, v: x.ly_do, full: 1 }) + o('tieu_chuan', 'Tiêu chuẩn, định mức', { area: 1, v: x.tieu_chuan, full: 1 }) +
      o('dvt', 'Đơn vị tính', { v: x.dvt }) + o('khoi_luong', 'Khối lượng', { type: 'number', v: x.khoi_luong || '', extra: ' min="0" step="any"' }) +
      (x.so_ct ? '<div class="f"><span>Đơn giá 1 bộ (nghìn đồng) = tổng thành tiền ' + x.so_ct + ' dòng chi tiết</span><b style="padding:8px 0">' + tien(x.don_gia) + '</b><input type="hidden" name="don_gia" value="' + (x.don_gia_goc || '') + '"></div>'
        : o('don_gia', 'Đơn giá (nghìn đồng)', { type: 'number', v: x.don_gia || '', extra: ' min="0" step="any"' })) + '<div class="f"><span>Tổng kinh phí (nghìn đồng)</span><b id="k-kp" style="padding:8px 0">—</b></div>' +
      o('thoi_diem', 'Thời điểm dự kiến thực hiện', { v: x.thoi_diem }) + o('ghi_chu', 'Ghi chú (không in vào file)', { v: x.ghi_chu }) +
      '<label class="f full"><span>Tình trạng</span><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="xong"' + (x.xong ? ' checked' : '') + '> Đã thực hiện / P.KHĐT đã duyệt – không chuyển sang năm sau (đã chuyển thì nút ⇄ ở năm sau đề xuất cắt)</label></label>' +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (m) => {
      const f = m.querySelector('#k-f'), ve = () => { const v = giaTri(f), dg = x.so_ct ? x.don_gia : so(v.don_gia); m.querySelector('#k-kp').textContent = so(v.khoi_luong) && dg ? tien(so(v.khoi_luong) * dg) : '—'; };
      f.oninput = ve; ve(); m.querySelectorAll('textarea').forEach(t => { t.rows = 3; });
      f.onsubmit = async (e) => { e.preventDefault(); const v = giaTri(f); v.xong = v.xong ? 1 : ''; await chay(e.submitter, () => api('khn_xd_luu', { nam: D.nam, d: Object.assign(v, { id: x.id || '' }) })); dongHop(); toast('Đã lưu'); await taiLai(); };
    });
  }
  const dangChon = () => [...document.querySelectorAll('#k-ds [data-chon]:checked')].map(x => x.dataset.chon);
  const conCua = (id) => D.dong.filter(d => d.cha === id);
  // kinh phí của dòng cha có dòng con = tổng dòng con (file mẫu: dòng cha không ghi số lượng, kinh phí)
  const kp = (d) => d.cha ? d.kinh_phi : (conCua(d.id).length ? conCua(d.id).reduce((a, x) => a + x.kinh_phi, 0) : d.kinh_phi);
  const tinhTong = (l) => l.filter(d => !d.cha).reduce((a, d) => a + kp(d), 0);

  function veTong() {
    const dem = {}; D.trang_thai.forEach(t => { dem[t] = D.dong.filter(d => !d.cha && d.trang_thai === t); });
    const conLai = D.dong.filter(d => d.trang_thai !== 'Không duyệt'), theoMuc = D.leaf.map(m => {
      const l = conLai.filter(d => d.muc === m[0]), k = D.cau_hinh.kp_muc[m[0]] || 0; return [m, l.filter(d => !d.cha).length, l.length ? tinhTong(l) : k, !l.length && k, l.reduce((a, d) => a + d.kp_mua, 0)]; }).filter(x => x[1] || x[2]);
    const bm = {}; conLai.filter(d => !d.cha).forEach(d => { const k = d.bo_mon || '(chưa ghi bộ môn)'; bm[k] = bm[k] || [0, 0]; bm[k][0]++; bm[k][1] += kp(d); });
    const tong = theoMuc.reduce((a, x) => a + x[2], 0);
    $('k-tong').innerHTML = '<div class="grid g2"><div class="card"><h2>Tổng theo mục (trừ dòng không duyệt)</h2><div class="btns" style="margin-bottom:8px">' +
      D.trang_thai.map(t => tagTT(t) + ' <b>' + dem[t].length + '</b>').join(' &nbsp; ') + '</div><div class="tbl-wrap"><table><thead><tr><th>Mục</th><th class="num">Số dòng</th><th class="num">Kinh phí (nghìn đ)</th><th class="num">Đã mua (thực tế)</th></tr></thead><tbody>' +
      theoMuc.map(x => '<tr><td><b>' + esc(x[0][0]) + '</b> ' + esc(x[0][3]) + '</td><td class="num">' + (x[1] || '—') + '</td><td class="num">' + tien(x[2]) + (x[3] ? ' <span class="note">khoán</span>' : '') + '</td><td class="num">' + tien(x[4]) + '</td></tr>').join('') +
      '<tr><td><b>Tổng cộng</b></td><td></td><td class="num"><b>' + tien(tong) + '</b></td><td class="num"><b>' + tien(theoMuc.reduce((a, x) => a + x[4], 0)) + '</b></td></tr></tbody></table></div></div>' +
      '<div class="card"><h2>Tổng theo bộ môn</h2><div class="tbl-wrap"><table><thead><tr><th>Đơn vị sử dụng</th><th class="num">Số dòng</th><th class="num">Kinh phí (nghìn đ)</th></tr></thead><tbody>' +
      Object.keys(bm).sort().map(k => '<tr><td>' + esc(k) + '</td><td class="num">' + bm[k][0] + '</td><td class="num">' + tien(bm[k][1]) + '</td></tr>').join('') + '</tbody></table></div></div></div>';
  }

  function veDS() {
    const q = boDau($('k-q').value), tt = $('k-tt').value, muc = $('k-muc').value, bm = $('k-bm').value;
    const hop = (d) => (!q || boDau([d.ten, d.yckt, d.bo_mon, d.ly_do, d.ghi_chu, d.nguon.map(n => n.gv + ' ' + n.don).join(' ')].join(' ')).indexOf(q) >= 0) &&
      (!tt || d.trang_thai === tt) && (!muc || d.muc === muc) && (!bm || d.bo_mon === bm);
    const chaHien = {}; D.dong.forEach(d => { if (hop(d)) chaHien[d.cha || d.id] = 1; });
    const l = D.dong.filter(d => chaHien[d.cha || d.id]);
    if (!l.length) { $('k-ds').innerHTML = '<div class="card empty">' + (D.dong.length ? 'Không có dòng phù hợp bộ lọc.' : 'Chưa có thiết bị dự trù năm ' + esc(D.nam) + '.' + (xl() ? ' Bấm "+ Thêm dòng", "Nhập từ file Excel" hoặc chờ giảng viên gửi phiếu GV-BS.' : '')) + '</div>'; return; }
    let h = '<div class="tbl-wrap"><table class="k-bang"><thead><tr>' + (xl() ? '<th><input type="checkbox" id="k-all" title="Chọn tất cả"></th>' : '') +
      '<th>TT</th><th>Danh mục – yêu cầu kỹ thuật</th><th class="num">SL</th><th class="num">Kinh phí (nghìn đ)</th><th>Đơn vị sử dụng – lý do – thời điểm</th><th>Trạng thái – hiện có – đề xuất GV</th>' + (xl() ? '<th></th>' : '') + '</tr></thead><tbody>';
    D.leaf.forEach(m => {
      const lm = l.filter(d => d.muc === m[0]); if (!lm.length) return;
      h += '<tr style="background:#F3F6FC"><td colspan="' + (xl() ? 8 : 6) + '"><b>' + esc(m[0]) + '</b> – ' + esc(m[3]) + ' · <span class="note">' + lm.filter(d => !d.cha).length + ' dòng · ' + tien(tinhTong(lm.filter(d => d.trang_thai !== 'Không duyệt'))) + ' nghìn đ</span></td></tr>';
      let stt = 0, con = 0;
      lm.forEach(d => {
        if (d.cha) con++; else { stt++; con = 0; }
        const ht = d.hien_trang || { co: 0, hong: 0 }, laCha = !d.cha && conCua(d.id).length;
        h += '<tr' + (d.trang_thai === 'Không duyệt' ? ' style="opacity:.55"' : '') + '>' + (xl() ? '<td><input type="checkbox" data-chon="' + esc(d.id) + '"></td>' : '') +
          '<td>' + (d.cha ? stt + '.' + con : stt) + '</td><td class="k-ten"' + (d.cha ? ' style="padding-left:22px"' : '') + '><b>' + esc(d.ten) + '</b>' + (d.yckt ? '<div class="note" style="white-space:pre-line;max-height:5.6em;overflow:hidden" title="' + esc(d.yckt) + '">' + esc(d.yckt) + '</div>' : '') + '</td>' +
          // gộp cột cho vừa khung: SL + ĐVT + nhu cầu · kinh phí + định mức · đơn vị + lý do + thời điểm · trạng thái + hiện có + đề xuất GV
          '<td class="num" style="white-space:nowrap">' + (laCha ? esc(d.dvt) : fmt(d.sl) + ' ' + esc(d.dvt)) + '<div class="note">' + NC.filter(k => d[k]).map(k => esc(D.nhu_cau[k])).join(', ') + '</div>' + (!laCha && d.sl_mua ? '<div class="note" title="Đã mua / kế hoạch">mua ' + fmt(d.sl_mua) + '/' + fmt(d.sl) + '</div>' : '') + '</td>' +
          '<td class="num" style="white-space:nowrap"><b>' + tien(kp(d)) + '</b>' + (laCha ? '' : '<div class="note" title="Định mức (nghìn đồng / đơn vị)">ĐM ' + tien(d.dinh_muc) + '</div>') + '</td>' +
          '<td class="k-ly-do"><div>' + esc(d.bo_mon) + '</div>' + (d.ly_do ? '<div class="note" title="' + esc(d.ly_do) + '">' + esc(d.ly_do) + '</div>' : '') + (d.thoi_diem ? '<div class="note">⏱ ' + esc(d.thoi_diem) + '</div>' : '') + '</td>' +
          '<td>' + tagTT(d.trang_thai) + (ht.co ? '<div class="note" title="Thiết bị cùng tên trong Tài sản">Hiện có ' + ht.co + ' cái' + (ht.hong ? ' · <b style="color:#B42318">' + ht.hong + ' hỏng</b>' : '') + '</div>' : '') + (d.ngung ? '<div class="note">' + esc(d.ngung) + '</div>' : '') + (d.khdt ? '<div class="note" style="color:#1E4FC2" title="' + esc(d.khdt.ghi_chu || '') + '">P.KHĐT duyệt ' + fmt(d.sl_khdt) + '/' + fmt(d.sl) + (d.khdt.ngay ? ' · ' + ngayVN(d.khdt.ngay) : '') + '</div>' : '') +
          (d.tu_nam ? '<div class="note" title="Liên kết với dòng năm ' + esc(d.tu_nam) + ' – cập nhật bằng nút ⇄">↳ từ năm ' + esc(d.tu_nam) + '</div>' : '') + (d.chuyen && d.chuyen.length ? '<div class="note">→ đã chuyển sang ' + d.chuyen.map(esc).join(', ') + '</div>' : '') + (d.tb_moi.length ? '<div class="note">Đã tạo ' + d.tb_moi.length + ' TB</div>' : '') + '</td>' +
          (d.nguon.length ? '<div class="note">' + d.nguon.map(n => '<a href="#/giang-vien/' + esc(n.don) + '">' + esc(n.don) + '</a> ' + esc(n.gv) + ' · ' + fmt(n.sl)).join('<br>') + '</div>' : '') + '</td>' +
          (xl() ? '<td class="k-nut"><div><button class="btn o sm" data-sua="' + esc(d.id) + '" title="Sửa">✎</button><button class="btn o sm" data-len="' + esc(d.id) + '" title="Lên">↑</button><button class="btn o sm" data-xuong="' + esc(d.id) + '" title="Xuống">↓</button>' +
            (d.cha ? '' : '<button class="btn o sm" data-con="' + esc(d.id) + '" title="Thêm dòng con (hạng mục của thiết bị đồng bộ)">+ con</button>') +
            (!laCha && ['Chờ duyệt', 'Không duyệt'].indexOf(d.trang_thai) < 0 ? '<button class="btn o sm" data-mua="' + esc(d.id) + '" title="Ghi nhận mua (từng lần: ngày, số lượng, đơn giá thực tế), ngừng mua phần còn thiếu">🛒 Mua</button>' : '') +
            (!laCha && Math.floor(d.sl_mua) > d.tb_moi.length ? '<button class="btn o sm" data-tb="' + esc(d.id) + '" title="Tạo hồ sơ thiết bị trong Tài sản cho số đã mua">→ Tài sản</button>' : '') + '</div></td>' : '') + '</tr>';
      });
    });
    $('k-ds').innerHTML = h + '</tbody></table></div>';
    if (!xl()) return;
    const ds = $('k-ds'), capNhatChon = () => { const n = dangChon().length; $('k-chon').hidden = !n; $('k-dem').textContent = 'Đã chọn ' + n + ' dòng:'; };
    ds.querySelectorAll('[data-chon]').forEach(x => { x.onchange = capNhatChon; });
    $('k-all').onchange = (e) => { ds.querySelectorAll('[data-chon]').forEach(x => { x.checked = e.target.checked; }); capNhatChon(); };
    ds.querySelectorAll('[data-sua]').forEach(b => { b.onclick = () => hopSua(D.dong.find(d => d.id === b.dataset.sua)); });
    ds.querySelectorAll('[data-con]').forEach(b => { b.onclick = () => hopSua(null, b.dataset.con); });
    ds.querySelectorAll('[data-xuong]').forEach(b => { b.onclick = (e) => chay(e.target, async () => { await api('khn_doi_cho', { id: b.dataset.xuong, huong: 1 }); await taiLai(); }); });
    ds.querySelectorAll('[data-len]').forEach(b => { b.onclick = () => hopLen(D.dong.find(x => x.id === b.dataset.len)); });
    ds.querySelectorAll('[data-tb]').forEach(b => { b.onclick = () => hopTaoTB(D.dong.find(d => d.id === b.dataset.tb)); });
    ds.querySelectorAll('[data-mua]').forEach(b => { b.onclick = () => hopMua(D.dong.find(d => d.id === b.dataset.mua)); });
  }

  // ---------- thêm / sửa một dòng ----------
  function hopSua(d, cha) {
    const c = cha ? D.dong.find(x => x.id === cha) : null, x = d || { muc: c ? c.muc : '', trang_thai: 'Đã duyệt', dvt: 'Cái', thoi_diem: 'Năm ' + D.nam };
    moHop('<h2>' + (d ? 'Sửa dòng' : c ? 'Thêm dòng con của "' + esc(c.ten) + '"' : 'Thêm thiết bị dự trù năm ' + esc(D.nam)) + '</h2><form id="k-f" class="form-grid">' +
      (c || (d && d.cha) ? '' : o('muc', 'Mục trong file kế hoạch', { select: [['', '— Tự gợi ý theo đơn giá / nhu cầu —']].concat(D.leaf.map(m => [m[0], m[0] + ' – ' + m[3]])), v: x.muc, full: 1 })) +
      o('ten', 'Danh mục (tên thiết bị)', { v: x.ten, req: 1, full: 1 }) + o('dvt', 'Đơn vị', { v: x.dvt }) + o('trang_thai', 'Trạng thái', { select: TT_TAY.concat(TT_TAY.indexOf(x.trang_thai) < 0 ? [x.trang_thai] : []), v: x.trang_thai }) +
      NC.map(k => o(k, 'SL ' + D.nhu_cau[k].toLowerCase(), { type: 'number', v: x[k] || '', extra: ' min="0" step="any"' })).join('') +
      o('dinh_muc', 'Định mức (nghìn đồng / đơn vị)', { type: 'number', v: x.dinh_muc || '', extra: ' min="0" step="any"', help: '40000 = 40 triệu đồng' }) + '<div class="f"><span>Kinh phí (nghìn đồng)</span><b id="k-kp" style="padding:8px 0">—</b></div>' +
      o('yckt', 'Yêu cầu kỹ thuật', { area: 1, v: x.yckt, full: 1 }) + o('bo_mon', 'Đơn vị sử dụng (bộ môn)', { v: x.bo_mon, ph: 'BM Dược, BM Dinh dưỡng' }) + o('thoi_diem', 'Thời điểm thực hiện dự kiến', { v: x.thoi_diem }) +
      o('ly_do', 'Sự cần thiết, lý do thực hiện', { area: 1, v: x.ly_do, full: 1 }) + o('ghi_chu', 'Ghi chú (không in vào file)', { v: x.ghi_chu, full: 1 }) +
      '<p class="note full" id="k-goi-y"></p><div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (m) => {
      const f = m.querySelector('#k-f'), ve = () => { const v = giaTri(f), sl = NC.reduce((a, k) => a + so(v[k]), 0), dm = so(v.dinh_muc);
        m.querySelector('#k-kp').textContent = sl && dm ? tien(sl * dm) : '—';
        if (f.muc && !f.muc.value) m.querySelector('#k-goi-y').textContent = 'Gợi ý mục: ' + (so(v.sua_chua) && !so(v.bo_sung) && !so(v.thay_moi) && !so(v.nang_cap) ? 'C.III.2 (sửa chữa)' : dm >= D.nguong ? 'C.III.1 (đơn giá từ 10 triệu đồng)' : 'D.II.1 (công cụ, dụng cụ)'); };
      f.oninput = ve; ve();
      m.querySelectorAll('textarea').forEach(t => { t.rows = 4; });
      f.onsubmit = async (e) => { e.preventDefault(); const v = giaTri(f);
        await chay(e.submitter, () => api('khn_luu', { nam: D.nam, d: Object.assign(v, { id: d ? d.id : '', cha: c ? c.id : '', muc: v.muc || (d && d.muc) || '', tb: d ? d.tb : '' }) }));
        dongHop(); toast('Đã lưu'); await taiLai(); };
    });
  }

  // ---------- cấu hình năm, chép năm, tạo thiết bị ----------
  function hopCauHinh() {
    const c = D.cau_hinh;
    moHop('<h2>Năm ' + esc(D.nam) + ': hạn nộp – kinh phí khoán</h2><form id="k-f" class="form-grid">' + o('han', 'Hạn GV nộp đề xuất (trống = không hạn)', { type: 'date', v: c.han }) +
      '<label class="f"><span>Năm đang nhận đề xuất</span><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="nam_mo"' + (D.nam === D.nam_mo ? ' checked disabled' : '') + '> Phiếu GV-BS ở trang dùng chung đưa vào năm ' + esc(D.nam) + '</label></label>' +
      '<p class="note full">Kinh phí khoán: mục không kê từng thiết bị (VD "B. Tài sản cố định đặc thù", "III.2 Sửa chữa máy móc") ghi một số tổng (nghìn đồng); mục đã có dòng thì tính theo dòng.</p>' +
      D.leaf.map(m => o('kp_' + m[0], m[0] + ' – ' + m[3], { type: 'number', v: c.kp_muc[m[0]] || '', extra: ' min="0" step="any"' })).join('') +
      '<p class="note full">Thời điểm thực hiện dự kiến: file xuất luôn ghi theo năm kế hoạch. <button type="button" class="btn o sm" id="k-td">Đổi thời điểm của mọi dòng đang lưu sang năm ' + esc(D.nam) + '</button></p>' +
      '<label class="f full"><span>Khóa năm</span><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="khoa"' + (c.khoa ? ' checked' : '') + '> 🔒 Khóa kế hoạch năm ' + esc(D.nam) + ' (năm đã xong: chỉ xem, xuất file, ghi nhận mua; không nhận phiếu GV-BS)</label></label>' +
      (laAdmin() ? '<p class="note full">Danh sách này thực chất là của năm khác? <button type="button" class="btn o sm" id="k-doi-nam">Đổi năm của danh sách này…</button> (chuyển cả dòng thiết bị, xây dựng, kinh phí khoán sang năm chưa có dữ liệu)</p>' : '') +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (m) => {
      m.querySelector('#k-td').onclick = (e) => chay(e.target, async () => { const r = await api('khn_td', { nam: D.nam }); toast('Đã đổi ' + r.n + ' dòng sang năm ' + D.nam); dongHop(); await taiLai(); });
      if (m.querySelector('#k-doi-nam')) m.querySelector('#k-doi-nam').onclick = (e) => { const den = (prompt('Đổi toàn bộ danh sách năm ' + D.nam + ' sang năm (năm chưa có dữ liệu):', String(+D.nam - 1)) || '').trim(); if (!den) return;
        if (!confirm('Chuyển toàn bộ dòng thiết bị, hạng mục xây dựng, kinh phí khoán của năm ' + D.nam + ' sang năm ' + den + '? Thời điểm thực hiện đổi theo năm ' + den + '.')) return;
        chay(e.target, async () => { const r = await api('khn_doi_nam', { tu: D.nam, den }); toast('Đã đổi sang năm ' + r.nam + ': ' + r.n + ' dòng thiết bị, ' + r.xd + ' hạng mục xây dựng'); dongHop(); location.hash = '#/ke-hoach-nam/' + r.nam; }); };
      m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target), kpm = {}; D.leaf.forEach(x => { if (so(v['kp_' + x[0]])) kpm[x[0]] = so(v['kp_' + x[0]]); });
        await chay(e.submitter, () => api('khn_cau_hinh', { nam: D.nam, han: v.han, kp_muc: kpm, nam_mo: v.nam_mo ? 1 : 0, khoa: v.khoa ? 1 : 0 })); dongHop(); toast('Đã lưu'); Q.dieuHuong(); };
    });
  }
  // tạo năm: trống hoặc lấy phần còn phải mua của năm khác (có liên kết từng dòng)
  function hopTaoNam() {
    const goi = String(Math.max.apply(null, D.cac_nam.map(Number)) + 1);
    moHop('<h2>Tạo năm kế hoạch</h2><form id="k-f" class="form-grid">' + o('nam', 'Năm', { type: 'number', v: goi, req: 1, extra: ' min="2020" max="2100"' }) +
      o('tu', 'Dữ liệu ban đầu', { select: [['', 'Trống (thêm dòng, nhập file sau)']].concat(D.cac_nam.slice().reverse().map(n => [n, 'Lấy phần còn phải mua từ năm ' + n])), v: D.nam, full: 1 }) +
      '<p class="note full">Lấy từ năm trước: mỗi dòng còn phải mua (kế hoạch − đã mua − P.KHĐT đã duyệt) được chuyển sang, trạng thái "Chờ duyệt", và <b>giữ liên kết</b> với dòng gốc. ' +
      'Xây dựng (admin): hạng mục chưa đánh dấu "Đã thực hiện / P.KHĐT đã duyệt" chuyển kèm dòng chi tiết. Dòng "Đã mua", "Ngừng mua", "Không duyệt", dòng mua / duyệt đủ không chuyển. Sau này năm trước mua thêm hoặc P.KHĐT duyệt thêm: bấm <b>"⇄ Chuyển / cập nhật từ năm khác"</b> để cắt / giảm theo. Trước khi chuyển có danh sách để bỏ chọn dòng không muốn.</p>' +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tạo năm</button></div></form>', (m) => {
      m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target);
        const r = await chay(e.submitter, () => api('khn_tao_nam', { nam: v.nam })); dongHop(); moLK = v.tu && v.tu !== r.nam ? v.tu : null;
        if (location.hash === '#/ke-hoach-nam/' + r.nam) Q.dieuHuong(); else location.hash = '#/ke-hoach-nam/' + r.nam; };
    });
  }
  // chuyển / cập nhật từ năm khác: xem trước các thay đổi (thêm dòng còn phải mua, đổi số lượng, cắt dòng đã mua / duyệt đủ) → tick chọn → áp dụng
  async function hopLienKet(tu, chi, den) {
    den = den || D.nam;
    const khac = D.cac_nam.filter(n => n !== den);
    tu = tu || khac.filter(n => n < den).pop() || khac[0];
    if (!tu) return toast('Chưa có năm nào khác', true);
    let r; try { r = await api('khn_lk', { tu, den, chi }); } catch (e) { return toast(e.message, true); }
    const NHAN = { them: ['Thêm', '#067647'], doi: ['Đổi số lượng', '#1E4FC2'], cat: ['Cắt', '#B42318'] }, dem = (l) => ['them', 'doi', 'cat'].map(k => [k, r.ds.filter(x => x.loai === k).length]).filter(x => x[1]);
    moHop('<h2>⇄ ' + (chi ? 'Chuyển ' + chi.length + ' dòng đã chọn' : 'Chuyển / cập nhật') + ' từ năm ' + esc(tu) + ' sang năm ' + esc(den) + '</h2>' +
      (chi ? '' : '<div class="btns" style="margin:0 0 8px"><label class="note">Năm nguồn <select id="k-lk-tu">' + D.cac_nam.filter(n => n !== den).map(n => '<option' + (n === tu ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div>') +
      '<p class="note">Số chuyển = kế hoạch năm ' + esc(tu) + ' − đã mua − P.KHĐT đã duyệt. <b>Thêm</b>: dòng còn phải mua chưa có ở năm ' + esc(den) + ' · <b>Đổi số lượng</b>: năm ' + esc(tu) + ' mua / duyệt thêm · <b>Cắt</b>: năm ' + esc(tu) + ' đã mua / duyệt đủ, ngừng mua hoặc không duyệt. ' +
      'Xây dựng: hạng mục năm ' + esc(tu) + ' đánh dấu "Đã thực hiện / P.KHĐT đã duyệt" → cắt. Dòng thêm tay ở năm ' + esc(den) + ' (không liên kết) và dòng năm ' + esc(den) + ' đã ghi nhận mua giữ nguyên. Dòng ⚠ đã sửa tay ở năm ' + esc(den) + ' không chọn sẵn.</p>' +
      (r.khoa ? '<p class="note" style="color:#B42318"><b>🔒 Năm ' + esc(den) + ' đã khóa</b> – mở khóa trước khi áp dụng.</p>' : '') +
      (!r.ds.length ? '<div class="card empty">Không có thay đổi nào – năm ' + esc(den) + ' đã khớp với phần còn phải mua của năm ' + esc(tu) + '.</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Đóng</button></div>' :
        '<p class="note">' + dem().map(x => NHAN[x[0]][0] + ' <b>' + x[1] + '</b>').join(' · ') + ' <button type="button" class="btn o sm" id="k-lk-het">Chọn hết</button><button type="button" class="btn o sm" id="k-lk-bo">Bỏ hết</button></p>' +
        '<div class="tbl-wrap" style="max-height:52vh"><table><thead><tr><th></th><th>Thay đổi</th><th>Mục</th><th>Thiết bị</th><th class="num">Năm ' + esc(den) + '</th><th>Năm ' + esc(tu) + '</th></tr></thead><tbody>' +
        r.ds.map(x => '<tr><td><input type="checkbox" data-lk="' + esc(x.k) + '"' + (x.mac_dinh ? ' checked' : '') + '></td><td><b style="color:' + NHAN[x.loai][1] + '">' + NHAN[x.loai][0] + '</b>' + (x.sua_tay ? '<div class="note" style="color:#B54708">⚠ đã sửa tay ở năm ' + esc(den) + '</div>' : '') + '</td>' +
          '<td>' + esc(x.muc) + '</td><td>' + (x.xd ? '<span class="note">🏗 Xây dựng · </span>' : '') + esc(x.ten) + '</td><td class="num">' + (x.loai === 'them' ? '<b>' + fmt(x.sl_moi) + '</b>' : fmt(x.sl_cu) + ' → <b>' + fmt(x.sl_moi) + '</b>') + ' ' + esc(x.dvt || '') + '</td>' +
          '<td class="note">kế hoạch ' + fmt(x.sl_goc) + ' · ' + esc(x.tt_goc) + (x.ly_do ? ' · ' + esc(x.ly_do) : '') + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button type="button" class="btn" id="k-lk-ap">Áp dụng</button></div>'), (m) => {
      const s = m.querySelector('#k-lk-tu'); if (s) s.onchange = () => { dongHop(); hopLienKet(s.value, null, den); };
      const hop = () => [...m.querySelectorAll('[data-lk]')], nut = m.querySelector('#k-lk-ap'), dem2 = () => { if (nut) nut.textContent = 'Áp dụng ' + hop().filter(x => x.checked).length + ' thay đổi'; };
      if (!nut) return; dem2(); hop().forEach(x => { x.onchange = dem2; });
      m.querySelector('#k-lk-het').onclick = () => { hop().forEach(x => { x.checked = true; }); dem2(); };
      m.querySelector('#k-lk-bo').onclick = () => { hop().forEach(x => { x.checked = false; }); dem2(); };
      nut.onclick = (e) => { const ap = hop().filter(x => x.checked).map(x => x.dataset.lk); if (!ap.length) return toast('Chưa chọn thay đổi nào', true);
        chay(e.target, async () => { const k = await api('khn_lk', { tu, den, chi, ap }); toast('Năm ' + den + ': thêm ' + k.them + ', đổi ' + k.doi + ', cắt ' + k.cat + ' dòng' + (k.xd_them || k.xd_cat ? '; xây dựng: thêm ' + k.xd_them + ', cắt ' + k.xd_cat + ' hạng mục' : '')); dongHop();
          if (den === D.nam) await taiLai(); else location.hash = '#/ke-hoach-nam/' + den; }); };
    });
  }
  // ↑ Lên: chọn vị trí phía trên trong cùng mục, cùng cấp (dòng con: trong cùng thiết bị đồng bộ) → chuyển vào đó, các dòng từ vị trí ấy dời xuống
  function hopLen(d) {
    const cung = D.dong.filter(x => x.muc === d.muc && (x.cha || '') === (d.cha || '')).sort((a, b) => a.thu_tu - b.thu_tu), i = cung.indexOf(d), tren = cung.slice(0, i);
    if (!tren.length) return toast('Dòng đã ở vị trí đầu ' + (d.cha ? 'của thiết bị đồng bộ' : 'mục ' + d.muc));
    const sttCha = d.cha ? D.dong.filter(x => x.muc === d.muc && !x.cha).sort((a, b) => a.thu_tu - b.thu_tu).findIndex(x => x.id === d.cha) + 1 + '.' : '';
    moHop('<h2>↑ Chuyển lên vị trí…</h2><p class="note"><b>' + esc(d.ten.split('\n')[0]) + '</b> đang ở vị trí <b>' + sttCha + (i + 1) + '</b> (mục ' + esc(d.muc) + '). Chọn vị trí mới: thiết bị vào đúng vị trí đó, các dòng từ vị trí ấy trở xuống dời xuống một bậc.</p>' +
      '<div class="tbl-wrap" style="max-height:60vh"><table><thead><tr><th>Vị trí</th><th>Đang là</th><th class="num">SL</th><th></th></tr></thead><tbody>' +
      tren.map((x, k) => '<tr><td><b>' + sttCha + (k + 1) + '</b></td><td>' + esc(x.ten.split('\n')[0]) + (x.bo_mon ? '<div class="note">' + esc(x.bo_mon) + '</div>' : '') + '</td><td class="num">' + fmt(x.sl) + '</td>' +
        '<td><button type="button" class="btn sm" data-truoc="' + esc(x.id) + '">Đặt vào vị trí ' + sttCha + (k + 1) + '</button></td></tr>').reverse().join('') + '</tbody></table></div>' +
      '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button></div>', (m) => {
      m.querySelectorAll('[data-truoc]').forEach(b => { b.onclick = (e) => chay(e.target, async () => { await api('khn_doi_cho', { id: d.id, truoc: b.dataset.truoc }); dongHop(); toast('Đã chuyển lên vị trí ' + b.textContent.replace('Đặt vào vị trí ', ''));
        await taiLai(); const n = document.querySelector('#k-ds [data-len="' + d.id + '"]'); if (n) n.closest('tr').classList.add('nhay'); }); }); // giữ chỗ đang xem; dòng vừa chuyển nháy màu
    });
  }
  // ghi nhận mua: lịch sử từng lần mua, thêm lần mua, ngừng mua phần còn thiếu
  function hopMua(d) {
    const ve = () => moHop('<h2>🛒 ' + esc(d.ten.split('\n')[0]) + '</h2><p>Kế hoạch <b>' + fmt(d.sl) + ' ' + esc(d.dvt) + '</b> × ' + tien(d.dinh_muc) + ' = ' + tien(d.kinh_phi) + ' nghìn đ · đã mua <b>' + fmt(d.sl_mua) + '</b> · còn <b>' + fmt(d.con_lai) + '</b> · ' + tagTT(d.trang_thai) +
      (d.ngung ? ' – ' + esc(d.ngung) : '') + '</p>' +
      (d.khdt ? '<p style="margin:0 0 10px;padding:8px 12px;border-radius:8px;background:#EEF3FC"><b>P.KHĐT đã duyệt mua ' + fmt(d.sl_khdt) + '/' + fmt(d.sl) + ' ' + esc(d.dvt) + '</b>' + (d.khdt.ngay ? ' · ' + ngayVN(d.khdt.ngay) : '') + (d.khdt.ghi_chu ? ' · ' + esc(d.khdt.ghi_chu) : '') +
        ' · còn phải mua (ngoài phần đã duyệt) <b>' + fmt(d.con_xuat) + '</b> <button type="button" class="btn o sm" id="k-khdt">Sửa số duyệt…</button> <button type="button" class="btn o sm" id="k-bo-khdt">Bỏ đánh dấu</button></p>' : '') +
      (d.mua.length ? '<div class="tbl-wrap"><table><thead><tr><th>Ngày</th><th class="num">SL</th><th class="num">Đơn giá thực tế</th><th class="num">Thành tiền</th><th>Ghi chú</th><th>Người ghi</th><th></th></tr></thead><tbody>' +
        d.mua.map(m => '<tr><td>' + (m.ngay ? ngayVN(m.ngay) : '—') + '</td><td class="num">' + fmt(m.sl) + '</td><td class="num">' + (m.don_gia ? tien(m.don_gia) : '<span class="note">theo định mức</span>') + '</td><td class="num">' + tien(m.sl * (m.don_gia || d.dinh_muc)) + '</td>' +
          '<td>' + esc(m.ghi_chu) + '</td><td>' + esc(m.nguoi) + '</td><td><button type="button" class="btn red o sm" data-xm="' + esc(m.id) + '" title="Xóa lần mua ghi nhầm">✕</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="note">Chưa ghi nhận lần mua nào.</p>') +
      (d.con_lai > 0 && d.trang_thai !== 'Ngừng mua' ? '<h3 style="margin:14px 0 6px">Ghi nhận lần mua</h3><form id="k-f" class="form-grid">' + o('sl', 'Số lượng mua lần này (còn ' + fmt(d.con_lai) + ')', { type: 'number', v: d.con_lai, extra: ' min="0" step="any" max="' + d.con_lai + '"', req: 1 }) +
        o('ngay', 'Ngày mua / nhận', { type: 'date', v: Q.homNay() }) + o('don_gia', 'Đơn giá thực tế (nghìn đồng, trống = theo định mức)', { type: 'number', v: '', extra: ' min="0" step="any"' }) + o('ghi_chu', 'Ghi chú (số hợp đồng, nhà cung cấp…)', { v: '' }) +
        '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Đóng</button><button class="btn">Ghi nhận mua</button></div></form>' : '') +
      (d.con_lai > 0 ? (d.trang_thai === 'Ngừng mua' ? '<p style="margin-top:12px"><button type="button" class="btn o sm" id="k-bo-ngung">Bỏ "Ngừng mua" (mua tiếp phần còn thiếu)</button></p>'
        : '<p class="note" style="margin-top:12px">Không mua phần còn thiếu nữa? <button type="button" class="btn o sm" id="k-ngung">Ngừng mua ' + fmt(d.con_lai) + ' còn lại…</button></p>') : '') +
      (d.con_lai > 0 && !d.khdt && ['Đã duyệt', 'Mua một phần'].indexOf(d.trang_thai) >= 0 ? '<p class="note" style="margin-top:8px">Phòng KHĐT đã duyệt mua nhưng chưa mua? <button type="button" class="btn o sm" id="k-khdt">P.KHĐT đã duyệt mua – chưa mua…</button> <span>(ghi số lượng được duyệt; xuất "Phần còn phải mua" chỉ còn phần chưa duyệt)</span></p>' : '') +
      (d.trang_thai === 'Đã mua' ? '<p class="note" style="margin-top:12px">Năm sau cần mua thêm? <button type="button" class="btn o sm" id="k-mua-them">Đề xuất mua thêm ở năm sau…</button> <span>(dòng mới lấy sẵn tên, yêu cầu kỹ thuật, định mức; không liên kết nên không bị cắt)</span></p>' : '') +
      (d.con_lai > 0 && d.trang_thai !== 'Ngừng mua' ? '' : '<div class="modal-foot"><button type="button" class="btn o" data-dong>Đóng</button></div>'), (m) => {
      const xong = async (r, tb) => { toast(tb); await taiLai(); d = D.dong.find(x => x.id === d.id) || Object.assign(d, r); ve(); };
      const f = m.querySelector('#k-f');
      if (f) f.onsubmit = async (e) => { e.preventDefault(); const v = giaTri(f); const r = await chay(e.submitter, () => api('khn_mua', { id: d.id, sl: v.sl, ngay: v.ngay, don_gia: v.don_gia, ghi_chu: v.ghi_chu })); await xong(r, 'Đã ghi nhận mua ' + v.sl); };
      m.querySelectorAll('[data-xm]').forEach(b => { b.onclick = (e) => { if (!confirm('Xóa lần mua này?')) return; chay(e.target, async () => xong(await api('khn_mua_xoa', { id: d.id, mua: b.dataset.xm }), 'Đã xóa lần mua')); }; });
      if (m.querySelector('#k-ngung')) m.querySelector('#k-ngung').onclick = (e) => { const ly = prompt('Lý do ngừng mua ' + fmt(d.con_lai) + ' ' + d.dvt + ' còn lại (VD: đã đủ dùng, hết kinh phí, chuyển sang năm sau):'); if (!ly) return;
        chay(e.target, async () => xong(await api('khn_ngung', { id: d.id, ly_do: ly }), 'Đã ngừng mua phần còn thiếu')); };
      if (m.querySelector('#k-khdt')) m.querySelector('#k-khdt').onclick = (e) => {
        const sl = prompt('Tổng số lượng P.KHĐT đã duyệt mua (kế hoạch ' + fmt(d.sl) + ' ' + d.dvt + (d.sl_mua ? ', đã mua ' + fmt(d.sl_mua) : '') + '; tính cả số đã mua):', d.khdt ? d.sl_khdt : d.sl); if (sl === null) return;
        const gc = prompt('Ghi chú (số văn bản, ngày P.KHĐT duyệt…) – có thể để trống:', d.khdt ? d.khdt.ghi_chu || '' : ''); if (gc === null) return;
        chay(e.target, async () => xong(await api('khn_khdt', { id: d.id, sl: String(sl).replace(',', '.'), ghi_chu: gc }), 'Đã ghi P.KHĐT duyệt mua ' + sl)); };
      if (m.querySelector('#k-bo-khdt')) m.querySelector('#k-bo-khdt').onclick = (e) => chay(e.target, async () => xong(await api('khn_khdt', { id: d.id, bo: 1 }), 'Đã bỏ đánh dấu P.KHĐT'));
      if (m.querySelector('#k-mua-them')) m.querySelector('#k-mua-them').onclick = (e) => {
        const den = (prompt('Đề xuất mua thêm "' + d.ten.split('\n')[0] + '" vào kế hoạch năm:', String(+d.nam + 1)) || '').trim(); if (!den) return;
        const sl = (prompt('Số lượng mua thêm (' + d.dvt + '):', '1') || '').trim(); if (!sl) return;
        chay(e.target, async () => { await api('khn_luu', { nam: den, d: { ten: d.ten, dvt: d.dvt, dinh_muc: d.dinh_muc, yckt: d.yckt, ly_do: d.ly_do, bo_mon: d.bo_mon, muc: d.muc, tb: d.tb, bo_sung: sl.replace(',', '.'),
          trang_thai: 'Chờ duyệt', thoi_diem: 'Năm ' + den, ghi_chu: 'Mua thêm – năm ' + d.nam + ' đã mua đủ ' + fmt(d.sl) } }); toast('Đã thêm vào kế hoạch năm ' + den + ' (Chờ duyệt)'); }); };
      if (m.querySelector('#k-bo-ngung')) m.querySelector('#k-bo-ngung').onclick = (e) => chay(e.target, async () => xong(await api('khn_ngung', { id: d.id, bo: 1 }), 'Đã bỏ ngừng mua'));
    });
    ve();
  }
  // báo cáo thực hiện cuối năm: kế hoạch – đã mua – còn thiếu – ngừng mua theo mục, bộ môn; dòng chưa mua đủ; tải Excel
  const TT_BC = ['Đã duyệt', 'Mua một phần', 'Đã mua', 'Ngừng mua'];
  function bangThucHien() {
    const l = D.dong.filter(d => !D.dong.some(x => x.cha === d.id) && TT_BC.indexOf(d.trang_thai) >= 0), bmOf = (d) => d.bo_mon || '(chưa ghi bộ môn)';
    const cong = (ds) => ds.reduce((a, d) => [a[0] + d.kinh_phi, a[1] + d.kp_mua, a[2] + (d.trang_thai === 'Ngừng mua' ? 0 : d.con_lai * d.dinh_muc), a[3] + (d.trang_thai === 'Ngừng mua' ? d.con_lai * d.dinh_muc : 0)], [0, 0, 0, 0]);
    const nhom = (ten, loc) => [ten, cong(l.filter(loc)), l.filter(loc).length];
    return { l, tong: cong(l), thieu: l.filter(d => d.con_lai > 0),
      muc: D.leaf.map(m => nhom(m[0] + ' – ' + m[3], d => d.muc === m[0])).filter(x => x[2]),
      bm: [...new Set(l.map(bmOf))].sort().map(b => nhom(b, d => bmOf(d) === b)) };
  }
  function hopBaoCao() {
    const b = bangThucHien(), dau = '<tr><th></th><th class="num">Số dòng</th><th class="num">Kế hoạch</th><th class="num">Đã mua (thực tế)</th><th class="num">Còn thiếu</th><th class="num">Ngừng mua</th></tr>';
    const hang = (x, dam) => '<tr><td>' + (dam ? '<b>' + esc(x[0]) + '</b>' : esc(x[0])) + '</td><td class="num">' + x[2] + '</td>' + x[1].map(v => '<td class="num">' + tien(v) + '</td>').join('') + '</tr>';
    moHop('<h2>📊 Báo cáo thực hiện kế hoạch năm ' + esc(D.nam) + '</h2><p class="note">Tính các dòng đã duyệt (Đã duyệt, Mua một phần, Đã mua, Ngừng mua). Kinh phí nghìn đồng; "Đã mua" theo đơn giá thực tế (không ghi thì theo định mức); "Còn thiếu", "Ngừng mua" theo định mức.</p>' +
      '<h3>Theo mục</h3><div class="tbl-wrap"><table><thead>' + dau + '</thead><tbody>' + b.muc.map(x => hang(x)).join('') + hang(['Tổng cộng', b.tong, b.l.length], 1) + '</tbody></table></div>' +
      '<h3 style="margin-top:12px">Theo bộ môn</h3><div class="tbl-wrap"><table><thead>' + dau + '</thead><tbody>' + b.bm.map(x => hang(x)).join('') + '</tbody></table></div>' +
      '<h3 style="margin-top:12px">Dòng chưa mua đủ (' + b.thieu.length + ')</h3><div class="tbl-wrap"><table><thead><tr><th>Mục</th><th>Danh mục</th><th class="num">Kế hoạch</th><th class="num">Đã mua</th><th class="num">Còn thiếu</th><th>Trạng thái</th></tr></thead><tbody>' +
      b.thieu.map(d => '<tr><td>' + esc(d.muc) + '</td><td>' + esc(d.ten.split('\n')[0]) + '</td><td class="num">' + fmt(d.sl) + '</td><td class="num">' + fmt(d.sl_mua) + '</td><td class="num">' + fmt(d.con_lai) + '</td><td>' + tagTT(d.trang_thai) + (d.ngung ? ' ' + esc(d.ngung) : '') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="modal-foot"><button type="button" class="btn o" data-dong>Đóng</button><button type="button" class="btn" id="k-bc-xls">⇩ Tải Excel báo cáo</button></div>', (m) => {
      m.querySelector('#k-bc-xls').onclick = (e) => chay(e.target, () => taiBaoCao(b));
    });
  }
  async function taiBaoCao(b) {
    const ExcelJS = await napExcelJS(), wb = new ExcelJS.Workbook(), dam = { bold: true }, rong = (ws, w) => w.forEach((x, i) => { ws.getColumn(i + 1).width = x; });
    const t1 = wb.addWorksheet('Tong hop'), dau = ['', 'Số dòng', 'Kế hoạch', 'Đã mua (thực tế)', 'Còn thiếu', 'Ngừng mua'];
    t1.addRow(['BÁO CÁO THỰC HIỆN KẾ HOẠCH MUA SẮM NĂM ' + D.nam + ' – ' + String(D.don_vi || '').toUpperCase()]).font = dam; t1.addRow(['Đơn vị tính: nghìn đồng']); t1.addRow([]);
    t1.addRow(['THEO MỤC']).font = dam; t1.addRow(dau).font = dam; b.muc.forEach(x => t1.addRow([x[0], x[2]].concat(x[1])));
    t1.addRow(['Tổng cộng', b.l.length].concat(b.tong)).font = dam; t1.addRow([]);
    t1.addRow(['THEO BỘ MÔN']).font = dam; t1.addRow(dau).font = dam; b.bm.forEach(x => t1.addRow([x[0], x[2]].concat(x[1])));
    rong(t1, [60, 10, 16, 18, 14, 14]); [3, 4, 5, 6].forEach(i => { t1.getColumn(i).numFmt = '#,##0'; });
    const t2 = wb.addWorksheet('Chi tiet');
    t2.addRow(['Mục', 'Danh mục', 'ĐVT', 'SL kế hoạch', 'SL đã mua', 'Còn thiếu', 'Định mức', 'Kinh phí kế hoạch', 'Kinh phí đã mua', 'Trạng thái', 'Lý do ngừng', 'Đơn vị sử dụng', 'Các lần mua (ngày – SL – đơn giá – ghi chú)']).font = dam;
    b.l.forEach(d => t2.addRow([d.muc, d.ten.split('\n')[0], d.dvt, d.sl, d.sl_mua, d.con_lai, d.dinh_muc, d.kinh_phi, d.kp_mua, d.trang_thai, d.ngung || '', d.bo_mon,
      d.mua.map(m => [m.ngay ? ngayVN(m.ngay) : '', m.sl, m.don_gia || 'định mức', m.ghi_chu].filter(x => x !== '').join(' – ')).join('\n')]));
    rong(t2, [9, 50, 7, 10, 10, 10, 12, 16, 16, 14, 24, 26, 50]); t2.getColumn(13).alignment = { wrapText: true, vertical: 'top' }; [7, 8, 9].forEach(i => { t2.getColumn(i).numFmt = '#,##0'; });
    const buf = await wb.xlsx.writeBuffer(), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = 'BAO CAO THUC HIEN KE HOACH NAM ' + D.nam + '.xlsx';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function hopTaoTB(d) {
    moHop('<h2>Đưa "' + esc(d.ten) + '" vào Tài sản</h2><form id="k-f" class="form-grid">' + o('phong', 'Phòng đặt thiết bị', { select: [['', '— Chưa xếp phòng (kho PTN) —']].concat(D.phong.map(p => [p.ma, p.ma + ' – ' + p.ten])) }) +
      o('so', 'Số hồ sơ thiết bị tạo (đã mua ' + fmt(d.sl_mua) + ', đã tạo ' + d.tb_moi.length + ')', { type: 'number', v: Math.min(50, Math.floor(d.sl_mua) - d.tb_moi.length), extra: ' min="1" max="' + Math.min(50, Math.floor(d.sl_mua) - d.tb_moi.length) + '"' }) +
      '<p class="note full">Mỗi hồ sơ: tên (kèm #1, #2… nếu nhiều cái), nguồn vốn "Mua sắm năm ' + esc(d.nam) + '", nguyên giá theo định mức, thông số theo yêu cầu kỹ thuật. Sửa thêm mã tài sản, serial trong mục Tài sản.' +
      (d.tb_moi.length ? ' <b>Dòng này đã tạo ' + d.tb_moi.length + ' hồ sơ.</b>' : '') + '</p><div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tạo thiết bị</button></div></form>', (m) => {
      m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); const r = await chay(e.submitter, () => api('khn_tao_tb', { id: d.id, phong: v.phong, so: v.so }));
        dongHop(); toast('Đã tạo ' + r.ids.length + ' thiết bị: ' + r.ids.join(', ')); await taiLai(); };
    });
  }

  // ---------- nhập từ file Excel đúng mẫu ----------
  const LA_MA = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/;
  function docFileKHN(XLSX, wb) {
    const laXd = (n) => /^xay\s*dung/i.test(boDau(n));
    // file chỉ có trang tính Xaydung (không có Muasam): chỉ đọc hạng mục xây dựng
    if (!wb.SheetNames.some(n => /^mua\s*sam/i.test(boDau(n))) && wb.SheetNames.some(laXd)) return { ten: '', dong: [], kp: {}, loi: 0, xd: docXaydung(XLSX, wb), chiXd: 1 };
    const ten = wb.SheetNames.find(n => /^mua\s*sam/i.test(boDau(n))) || wb.SheetNames[0], ws = wb.Sheets[ten];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const hd = rows.findIndex(r => String(r[0]).trim() === 'TT' && /danh muc/.test(boDau(r[1])));
    if (hd < 0) throw new Error('Không thấy dòng tiêu đề "TT – Danh mục" của file kế hoạch mua sắm (trang tính ' + ten + ')');
    const MA = {}; D.muc.forEach(m => { MA[m[0]] = m; });
    const leafDau = (ma) => (D.muc.find(m => m[4] && m[0].indexOf(ma + '.') === 0) || [])[0];
    let l0 = '', cur = '', loi = 0; const dong = [], kp = {};
    for (let i = hd + 1; i < rows.length; i++) {
      const r = rows[i], a = String(r[0]).trim(), b = String(r[1]).trim();
      if (/tong cong/.test(boDau(b))) break;
      if (/^\[A\]$/.test(a)) continue;
      let ma = '';
      if (/^[A-E]$/.test(a)) { l0 = a; ma = a; } else if (LA_MA.test(a) && l0) ma = l0 + '.' + a; else if (/^[IVX]+\.\d+$/.test(a) && l0) ma = l0 + '.' + a;
      if (ma) { // dòng mục: kinh phí ghi số (không phải công thức) → kinh phí khoán
        cur = MA[ma] ? (MA[ma][4] ? ma : leafDau(ma) || cur) : cur; if (!MA[ma]) loi++;
        const o2 = ws[XLSX.utils.encode_cell({ r: i, c: 9 })]; if (MA[ma] && MA[ma][4] && o2 && !o2.f && so(o2.v) > 0) kp[ma] = so(o2.v);
        continue;
      }
      const sTT = typeof r[0] === 'number' ? r[0] : (/^\d+(\.\d+)?$/.test(a) ? parseFloat(a) : NaN);
      if (isNaN(sTT) || !b || /^…+$/.test(b) || !cur) continue;
      const sl = { bo_sung: so(r[4]), thay_moi: so(r[5]), sua_chua: so(r[6]), nang_cap: so(r[7]) };
      if (/…$/.test(b) && !sl.bo_sung && !sl.thay_moi && !sl.sua_chua && !sl.nang_cap && !so(r[8])) continue; // dòng ví dụ của file mẫu
      if (!(sl.bo_sung || sl.thay_moi || sl.sua_chua || sl.nang_cap) && so(r[3])) sl.bo_sung = so(r[3]);
      const L = String(r[11] || '').split(/\n/), bm = L.filter(x => /^\s*đơn vị sử dụng\s*:/i.test(x)).map(x => x.replace(/^\s*đơn vị sử dụng\s*:\s*/i, '').trim()).join(', ');
      dong.push(Object.assign({ muc: cur, la_con: !Number.isInteger(sTT) ? 1 : 0, ten: b, dvt: String(r[2]).trim(), dinh_muc: so(r[8]), yckt: String(r[10] || '').trim(),
        bo_mon: bm, ly_do: L.filter(x => !/^\s*đơn vị sử dụng\s*:/i.test(x)).join('\n').trim(), thoi_diem: String(r[12] || '').trim(), trang_thai: /đã mua/i.test(String(r[13] || '')) ? 'Đã mua' : 'Đã duyệt' }, sl));
    }
    return { ten, dong, kp, loi, xd: docXaydung(XLSX, wb) };
  }
  // trang tính Xaydung: hạng mục có TT là số và danh mục không phải dòng ví dụ "…"; mục theo dòng A / B / C và số La Mã (XII thứ hai → C.XII#2)
  function docXaydung(XLSX, wb) {
    const ten = wb.SheetNames.find(n => /^xay\s*dung/i.test(boDau(n))); if (!ten) return [];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[ten], { header: 1, raw: true, defval: '' }), ds = [], gap = {};
    const hd = rows.findIndex(r => String(r[0]).trim() === 'TT'); if (hd < 0) return [];
    let l0 = '', cur = '';
    for (let i = hd + 1; i < rows.length; i++) {
      const r = rows[i], a = String(r[0]).trim(), b = String(r[1]).trim();
      if (/tong cong/.test(boDau(b))) break;
      let ma = ''; if (/^[A-E]$/.test(a)) { l0 = a; ma = a; } else if (/^[IVX]+$/.test(a) && l0) ma = l0 + '.' + a;
      if (ma) { gap[ma] = (gap[ma] || 0) + 1; cur = gap[ma] > 1 ? ma + '#' + gap[ma] : ma; continue; }
      if (!cur || !b || /…\s*$/.test(b)) continue;
      // TT số nguyên = hạng mục; TT dạng 1.1, 1.10 (chữ) hoặc số lẻ = dòng chi tiết của hạng mục trước đó
      const laCon = /^\d+\.\d+$/.test(a) && (typeof r[0] !== 'number' || !Number.isInteger(r[0]));
      if (!laCon && !(typeof r[0] === 'number' || /^\d+$/.test(a))) continue;
      if (laCon && !(ds.length && ds[ds.length - 1].muc === cur)) continue;
      ds.push({ muc: cur, la_con: laCon ? 1 : 0, ten: b, cong_trinh: String(r[2]).trim(), dia_diem: String(r[3]).trim(), muc_tieu: String(r[4]).trim(), ly_do: String(r[5]).trim(), tieu_chuan: String(r[6]).trim(),
        dvt: String(r[7]).trim(), khoi_luong: so(r[8]), don_gia: so(r[9]), thoi_diem: String(r[11]).trim() });
    }
    return ds;
  }
  const slXd = (xd) => xd.filter(x => !x.la_con).length + ' hạng mục xây dựng – sửa chữa' + (xd.some(x => x.la_con) ? ' (' + xd.filter(x => x.la_con).length + ' dòng chi tiết)' : '');
  async function hopNhap(f) {
    try {
      const XLSX = await napXlsx(), wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }), r = docFileKHN(XLSX, wb);
      if (r.chiXd && !laAdmin()) throw new Error('File chỉ có trang tính Xaydung – phần Xây dựng chỉ admin nhập');
      if (!laAdmin()) r.xd = []; // trang tính Xây dựng: chỉ admin
      if (r.chiXd && !r.xd.length) throw new Error('Không đọc được hạng mục xây dựng nào trong trang tính Xaydung');
      if (!r.dong.length && !r.xd.length) throw new Error('Không đọc được dòng thiết bị nào trong file');
      const theoMuc = {}; r.dong.forEach(d => { theoMuc[d.muc] = theoMuc[d.muc] || [0, 0]; theoMuc[d.muc][0]++; theoMuc[d.muc][1] += (d.bo_sung + d.thay_moi + d.sua_chua + d.nang_cap) * d.dinh_muc; });
      const daCo = D.dong.length;
      const ca = r.dong.length && r.xd.length; // file đủ hai trang tính: chọn nhập cả hai / chỉ một trang
      moHop('<h2>Nhập kế hoạch năm từ file</h2>' + (r.chiXd ? '<p class="note">' + esc(f.name) + ' · chỉ có trang tính <b>Xaydung</b>: <b>' + slXd(r.xd) + '</b>. Dòng thiết bị (trang tính Muasam) giữ nguyên.</p>' : '<p class="note">' + esc(f.name) + ' · trang tính <b>' + esc(r.ten) + '</b> · <b>' + r.dong.length + '</b> dòng (' + r.dong.filter(d => d.la_con).length + ' dòng con)' +
        (Object.keys(r.kp).length ? ' · kinh phí khoán: ' + Object.keys(r.kp).map(k => k + ' ' + tien(r.kp[k])).join(', ') : '') + (r.loi ? ' · <b>' + r.loi + ' mục lạ</b> xếp vào mục gần nhất' : '') + (r.xd.length ? ' · trang tính Xaydung: <b>' + slXd(r.xd) + '</b>' : '') + '</p>' +
        '<div class="tbl-wrap"><table><thead><tr><th>Mục</th><th class="num">Số dòng</th><th class="num">Kinh phí (nghìn đ)</th></tr></thead><tbody>' +
        Object.keys(theoMuc).map(k => '<tr><td><b>' + esc(k) + '</b> ' + esc((D.muc.find(m => m[0] === k) || [])[3] || '') + '</td><td class="num">' + theoMuc[k][0] + '</td><td class="num">' + tien(theoMuc[k][1]) + '</td></tr>').join('') + '</tbody></table></div>') +
        '<form id="k-f" class="form-grid">' + o('nam', 'Nhập vào năm', { select: D.cac_nam.concat([String(+D.cac_nam[D.cac_nam.length - 1] + 1), String(+D.nam + 1)], (/(20\d\d)/.exec(f.name) || []).slice(1)).filter((x, i, a) => a.indexOf(x) === i).sort(), v: (/(20\d\d)/.exec(f.name) || [])[1] && D.cac_nam.indexOf(/(20\d\d)/.exec(f.name)[1]) >= 0 ? /(20\d\d)/.exec(f.name)[1] : D.nam }) +
        (ca ? o('pham_vi', 'Trang tính nhập', { select: [['ca', 'Cả hai: Muasam (thiết bị) + Xaydung (xây dựng)'], ['tb', 'Chỉ Muasam – thiết bị (giữ nguyên hạng mục xây dựng)'], ['xd', 'Chỉ Xaydung – xây dựng (giữ nguyên dòng thiết bị)']], v: 'ca', full: 1 }) : '') +
        o('cach', 'Cách nhập', { select: [['them', 'Thêm vào danh sách đang có'], ['thay', r.chiXd ? 'Thay toàn bộ hạng mục xây dựng của năm (xóa hạng mục cũ)' : 'Thay toàn bộ danh sách của năm (xóa dòng cũ của phần được nhập)']], v: r.chiXd ? ((D.xd || []).length ? 'thay' : 'them') : daCo ? 'them' : 'thay' }) +
        '<p class="note full">Dòng nhập từ file có trạng thái "Đã duyệt" (cột N ghi "đã mua" → "Đã mua"). "Đơn vị sử dụng: …" ở cột lý do được tách thành bộ môn. Thời điểm thực hiện đổi theo năm nhập vào. Lần nhập ghi vào <b>Lịch sử tải file</b> (thu hồi được, lưu file gốc).</p>' +
        '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">' + (r.chiXd ? 'Nhập ' + r.xd.filter(x => !x.la_con).length + ' hạng mục xây dựng' : 'Nhập từ file') + '</button></div></form>', (m) => {
        m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target), pv = r.chiXd ? 'xd' : v.pham_vi || 'ca';
          const phan = pv === 'xd' ? 'hạng mục xây dựng' : pv === 'tb' ? 'dòng thiết bị' : 'dòng thiết bị' + (r.xd.length ? ' và hạng mục xây dựng' : '');
          if (v.cach === 'thay' && !confirm('Xóa toàn bộ ' + phan + ' năm ' + v.nam + ' rồi nhập lại từ file?')) return;
          const k = await chay(e.submitter, () => api('khn_nhap', { nam: v.nam, thay: v.cach === 'thay' ? 1 : 0, dong: pv === 'xd' ? [] : r.dong, xd: pv === 'tb' ? [] : r.xd, kp_muc: pv === 'xd' ? null : r.kp, tep: f.name }));
          dongHop(); toast(pv === 'xd' ? 'Đã nhập ' + k.xd + ' hạng mục xây dựng' + (k.xoa_xd ? ', thay ' + k.xoa_xd + ' hạng mục cũ' : '') + ' – dòng thiết bị giữ nguyên'
            : 'Đã nhập ' + k.n + ' dòng' + (k.xd ? ' + ' + k.xd + ' hạng mục xây dựng' : '') + (k.xoa ? ', thay ' + k.xoa + ' dòng cũ' : ''));
          location.hash = '#/ke-hoach-nam/' + k.nam + (pv === 'xd' ? '/xd' : ''); Q.dieuHuong(); };
      });
    } catch (err) { toast(err.message, true); }
    const x = $('x-file'); if (x) x.value = '';
  }

  // ---------- xuất Excel từ file mẫu ----------
  const EXCELJS = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  const napExcelJS = () => window.ExcelJS ? Promise.resolve(window.ExcelJS) : new Promise((ok, loi) => { const s = document.createElement('script'); s.src = EXCELJS; s.onload = () => ok(window.ExcelJS); s.onerror = () => loi(new Error('Không tải được thư viện Excel (cần mạng)')); document.head.appendChild(s); });
  function hopXuat() {
    moHop('<h2>Xuất kế hoạch năm ' + esc(D.nam) + ' theo file mẫu</h2><form id="k-f" class="form-grid">' +
      o('pham_vi', 'Dòng đưa vào file', { select: [['duyet', 'Đã duyệt (kể cả đã mua, mua một phần) – gửi P.KHĐT'], ['con_lai', 'Phần còn phải mua (trừ số đã mua và số P.KHĐT đã duyệt mua → số lượng còn lại)'], ['tat_ca', 'Tất cả trừ "Không duyệt" (bản nháp tổng hợp)'], ['trong', 'Không dòng nào (file mẫu trống để điền tay)']], full: 1 }) +
      '<p class="note full">File dựng từ mẫu "KẾ HOẠCH MUA SẮM NĂM" của Trường: giữ khung, định dạng, chữ ký, trang tính Xây dựng và Tool; công thức <b>D = SUM(E:H)</b>, <b>J = I × số lượng</b>, tổng từng mục và <b>Tổng cộng (A+B+C+D+E)</b> viết lại theo số dòng thực tế; mục chưa có thiết bị giữ nguyên các dòng ví dụ ("1 – Chương trình, kế hoạch…", "…") như file mẫu. <b>Phần còn phải mua</b>: lấy dòng Đã duyệt / Mua một phần còn thiếu, số lượng = kế hoạch − đã mua (trừ dần từ cột Bổ sung → Nâng cấp), kinh phí tính lại theo số còn lại; số <b>P.KHĐT đã duyệt mua – chưa mua</b> (nút 🛒 Mua) trừ như đã mua (đề xuất 3, duyệt 2 → xuất 1); dòng Đã mua, Ngừng mua, dòng không còn gì phải mua không đưa vào.</p>' +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">⇩ Tải file Excel</button></div></form>', (m) => {
      m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); await chay(e.submitter, () => xuatExcel(v.pham_vi)); dongHop(); };
    });
  }
  const sao = (x) => x == null ? x : JSON.parse(JSON.stringify(x));
  // chiều cao dòng theo số dòng chữ ở các cột chữ dài (B, K, L; Times New Roman 13)
  const caoDong = (cot) => Math.max(18.75, Math.min(409, cot.reduce((a, [s, rong]) => Math.max(a, String(s || '').split('\n').reduce((n, x) => n + Math.max(1, Math.ceil(x.length / (rong * 0.92))), 0)), 1) * 17 + 4));
  async function xuatExcel(phamVi) {
    const ExcelJS = await napExcelJS(), res = await fetch('mau/ke-hoach-mua-sam-nam.xlsx', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Không tải được file mẫu kế hoạch mua sắm');
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await res.arrayBuffer());
    const ws = wb.worksheets.find(w => /^muasam/i.test(boDau(w.name))) || wb.worksheets[0], nam = D.nam, ky = D.ky || {};
    const daiDien = String(D.don_vi || '').toUpperCase();
    // --- mẫu dòng trong file: mục cấp 0 / 1 / 2, dòng thiết bị, dòng con, dòng "…", tổng cộng, phần ký ---
    const A = (r) => ws.getRow(r).getCell(1).value, tim = (fn, tu) => { for (let r = tu || 9; r <= ws.rowCount; r++) if (fn(r)) return r; return 0; };
    const rTong = tim(r => /tong cong/.test(boDau(ws.getRow(r).getCell(2).value)));
    if (!rTong) throw new Error('File mẫu thiếu dòng "Tổng cộng"');
    const laSo = (v) => typeof v === 'number', mau = (r) => { const row = ws.getRow(r), st = {}; for (let c = 1; c <= 14; c++) st[c] = sao(row.getCell(c).style); return { st, h: row.height }; };
    const kieuF = (c) => { const v = ws.getRow(c[0]).getCell(c[1]).value; return v && v.formula; };
    const rL0 = tim(r => A(r) === 'C') || 9, rL1 = tim(r => A(r) === 'I') || rL0, rL2 = tim(r => /^[IVX]+\.\d+$/.test(String(A(r)))) || rL1;
    const rTB = tim(r => laSo(A(r)) && Number.isInteger(A(r)) && kieuF([r, 4]) && !(ws.getRow(r).getCell(2).fill && ws.getRow(r).getCell(2).fill.fgColor && /FFFF00$/i.test(ws.getRow(r).getCell(2).fill.fgColor.argb || ''))) || tim(r => laSo(A(r)) && kieuF([r, 4]));
    const rCon = tim(r => laSo(A(r)) && !Number.isInteger(A(r))) || rTB, rCha = rCon > 9 && laSo(A(rCon - 1)) ? rCon - 1 : rTB, rCham = tim(r => A(r) === '…') || rTB;
    const M = { l0: mau(rL0), l1: mau(rL1), l2: mau(rL2), tb: mau(rTB), con: mau(rCon), cha: mau(rCha), cham: mau(rCham), tong: mau(rTong) };
    // dòng ví dụ của file mẫu trong từng mục lá ("1 – Chương trình, kế hoạch…", "…"): mục chưa có thiết bị giữ nguyên; mục có thiết bị giữ dòng "…" cuối mục
    const MA = {}; D.muc.forEach(m => { MA[m[0]] = m; });
    const viDu = {}; { let l0 = '', cur = ''; for (let k = 9; k < rTong; k++) { const a = String(A(k) == null ? '' : A(k)).trim(), b = ws.getRow(k).getCell(2).value; let ma = '';
      if (/^[A-E]$/.test(a)) { l0 = a; ma = a; } else if ((LA_MA.test(a) || /^[IVX]+\.\d+$/.test(a)) && l0) ma = l0 + '.' + a;
      if (ma) { cur = MA[ma] && MA[ma][4] ? ma : ''; continue; }
      if (cur && typeof b === 'string' && /…\s*$/.test(b)) { const v = {}; for (let c = 1; c <= 14; c++) v[c] = sao(ws.getRow(k).getCell(c).value); (viDu[cur] = viDu[cur] || []).push({ m: mau(k), v, so: laSo(A(k)) }); } } }
    const chan = []; for (let r = rTong + 1; r <= ws.rowCount; r++) { const row = ws.getRow(r), v = {}; for (let c = 1; c <= 14; c++) v[c] = sao(row.getCell(c).value); chan.push({ m: mau(r), v }); }
    const gopChan = (ws.model.merges || []).filter(g => +/\d+/.exec(g)[0] > rTong).map(g => g.replace(/(\d+)/g, (s) => '#' + (+s - rTong)));
    (ws.model.merges || []).filter(g => +/\d+/.exec(g)[0] >= 9).forEach(g => ws.unMergeCells(g));
    const cuoiCu = ws.rowCount; // ghi đè từ dòng 9; dòng cũ còn thừa phía dưới xóa sạch sau khi ghi
    // --- dòng đưa vào file ---
    const tt = phamVi === 'trong' ? [] : phamVi === 'tat_ca' ? ['Chờ duyệt', 'Đã duyệt', 'Mua một phần', 'Đã mua', 'Ngừng mua'] : ['Đã duyệt', 'Mua một phần', 'Đã mua', 'Ngừng mua'];
    const lay = D.dong.filter(d => tt.indexOf(d.trang_thai) >= 0), coCha = {}; lay.forEach(d => { if (!d.cha) coCha[d.id] = 1; });
    let ds = lay.filter(d => !d.cha || coCha[d.cha]);
    // phần còn phải mua: chỉ dòng còn thiếu; dòng cha giữ lại khi còn dòng con
    const conLai = phamVi === 'con_lai', coCon = (d) => D.dong.some(x => x.cha === d.id);
    if (conLai) { ds = ds.filter(d => coCon(d) || (['Đã duyệt', 'Mua một phần'].indexOf(d.trang_thai) >= 0 && d.con_xuat > 0)); ds = ds.filter(d => !coCon(d) || ds.some(x => x.cha === d.id)); }
    let r = 9;
    const ghi = (m, v, h) => { const row = ws.getRow(r); for (let c = 1; c <= 14; c++) { const o2 = row.getCell(c); o2.style = sao(m.st[c]) || {}; o2.value = v[c] === undefined || v[c] === '' ? null : v[c]; } row.height = h || m.h; return r++; };
    const F = (f, kq2) => ({ formula: f, result: kq2 });
    // một mục lá: dòng mục + các dòng thiết bị (hoặc dòng "…" nếu chưa có) → trả [dòng mục, kinh phí]
    const mucLa = (m, kieu) => {
      const l = ds.filter(d => d.muc === m[0]), rm = ghi(kieu, { 1: m[2], 2: m[3] }), dau = r; let stt = 0, con = 0, tong = 0;
      l.forEach(d => {
        const laCha = !d.cha && ds.some(x => x.cha === d.id);
        if (d.cha) con++; else { stt++; con = 0; }
        const so1 = d.cha ? (con < 10 ? parseFloat(stt + '.' + con) : stt + '.' + con) : stt, ly = [d.ly_do, d.bo_mon && 'Đơn vị sử dụng: ' + d.bo_mon].filter(Boolean).join('\n');
        const v = { 1: so1, 2: d.ten, 3: d.dvt, 11: d.yckt, 12: ly, 13: tdN(d.thoi_diem, nam), 14: d.trang_thai === 'Đã mua' ? 'đã mua' : d.sl_mua ? 'đã mua ' + fmt(d.sl_mua) + '/' + fmt(d.sl) : '' }; // cột N (ngoài vùng in): theo dõi
        if (!laCha) {
          // phần còn phải mua: trừ số đã mua dần từ cột Bổ sung → Nâng cấp
          let tru = conLai ? d.sl - d.con_xuat : 0; /* đã mua hoặc P.KHĐT đã duyệt */ const sl = {}; NC.forEach(k => { const x = +d[k] || 0, b = Math.min(x, tru); tru -= b; sl[k] = Math.round((x - b) * 1000) / 1000; });
          const co = NC.map((k, i) => [k, 5 + i]).filter(x => sl[x[0]]), cot = co.length === 1 ? 'EFGH'[co[0][1] - 5] : co.length ? 'D' : 'E';
          const slx = conLai ? d.con_xuat : d.sl, kp = conLai ? Math.round(d.con_xuat * (+d.dinh_muc || 0) * 1000) / 1000 : d.kinh_phi;
          if (conLai && slx < d.sl) v[14] = 'còn ' + fmt(slx) + '/' + fmt(d.sl) + ' (' + [d.sl_mua && 'đã mua ' + fmt(d.sl_mua), d.khdt && 'P.KHĐT đã duyệt ' + fmt(d.sl_khdt)].filter(Boolean).join(', ') + ')';
          NC.forEach((k, i) => { v[5 + i] = sl[k] || ''; });
          v[4] = F('SUM(E' + r + ':H' + r + ')', slx); v[9] = d.dinh_muc || ''; v[10] = F('I' + r + '*' + cot + r, kp); tong += kp;
        }
        ghi(d.cha ? M.con : laCha ? M.cha : M.tb, v, caoDong([[d.ten, 26.7], [d.yckt, 27.5], [ly, 15.5]]));
      });
      const kpk = D.cau_hinh.kp_muc[m[0]];
      const vd = viDu[m[0]] || [];
      (l.length ? vd.filter(x => !x.so) : vd).forEach(x => ghi(x.m, x.v));
      // mục không có dòng nào trong mẫu (VD III.2 chỉ ghi kinh phí khoán): giữ nguyên, không thêm dòng
      ws.getRow(rm).getCell(10).value = !l.length && kpk ? kpk : r > dau ? F('SUM(J' + dau + ':J' + (r - 1) + ')', l.length ? tong : 0) : null;
      return [rm, !l.length && kpk ? kpk : tong];
    };
    // mục có mục con: dòng mục + đệ quy; J = tổng J các mục con
    const veMuc = (m) => {
      if (m[4]) return mucLa(m, [M.l0, M.l1, M.l2][m[1]]);
      const rm = ghi([M.l0, M.l1, M.l2][m[1]], { 1: m[2], 2: m[3] }), con = D.muc.filter(x => x[0].indexOf(m[0] + '.') === 0 && x[0].split('.').length === m[0].split('.').length + 1).map(veMuc);
      ws.getRow(rm).getCell(10).value = F(con.map(x => 'J' + x[0]).join('+'), con.reduce((a, x) => a + x[1], 0));
      return [rm, con.reduce((a, x) => a + x[1], 0)];
    };
    const goc = D.muc.filter(m => m[1] === 0).map(veMuc);
    const rT = ghi(M.tong, { 2: 'Tổng cộng (' + goc.map((x, i) => D.muc.filter(m => m[1] === 0)[i][2]).join('+') + ')' });
    ws.getRow(rT).getCell(10).value = F(goc.map(x => 'J' + x[0]).join('+'), goc.reduce((a, x) => a + x[1], 0));
    chan.forEach(c => { const row = ws.getRow(r); for (let k = 1; k <= 14; k++) { const o2 = row.getCell(k); o2.style = sao(c.m.st[k]) || {}; o2.value = c.v[k] == null ? null : c.v[k]; } row.height = c.m.h; r++; });
    gopChan.forEach(g => ws.mergeCells(g.replace(/#(\d+)/g, (s, n) => String(rT + +n))));
    const cuoi = r - 1;
    for (let k = r; k <= cuoiCu; k++) { const row = ws.getRow(k); for (let c = 1; c <= 14; c++) { const o2 = row.getCell(c); o2.value = null; o2.style = {}; } row.height = undefined; }
    const wx = wb.worksheets.find(w => /^xay\s*dung/i.test(boDau(w.name))); if (wx) dungXaydung(wx, nam);
    // tiêu đề, đơn vị, năm, người ký (cả trang tính xây dựng)
    wb.worksheets.forEach(w => {
      if (/^tool/i.test(w.name)) return;
      const a1 = w.getCell('A1'), a3 = w.getCell('A3');
      if (daiDien && typeof a1.value === 'string' && /^ĐƠN VỊ:/.test(a1.value)) a1.value = 'ĐƠN VỊ: ' + daiDien;
      if (typeof a3.value === 'string') a3.value = a3.value.replace(/NĂM\s+\d{4}/g, 'NĂM ' + nam);
      for (let k = w.rowCount; k > 8; k--) { /* dòng họ tên người ký: dòng có chữ thấp nhất */ const row = w.getRow(k), o2 = []; row.eachCell(c => { if (typeof c.value === 'string' && c.value.trim()) o2.push(c); });
        if (o2.length >= 2 && !/ĐẠI DIỆN|HIỆU TRƯỞNG|KẾ HOẠCH/.test(o2.map(c => c.value).join(' '))) { if (ky.truong_khoa) o2[0].value = ky.truong_khoa; if (ky.hieu_truong) o2[o2.length - 1].value = ky.hieu_truong; break; } }
      w.name = w.name.replace(/\d{4}$/, '') + nam;
    });
    ws.pageSetup.printArea = 'A1:M' + cuoi; // giữ nguyên như file mẫu: không thêm trang tính, không cố định / lặp dòng tiêu đề
    // ExcelJS ghi <pageSetUpPr> trước <outlinePr> trong <sheetPr> (sai thứ tự) → Excel báo "We found a problem…": bỏ outlinePr (không dùng nhóm dòng)
    wb.worksheets.forEach(w => { if (w.properties) delete w.properties.outlineProperties; });
    wb.calcProperties = Object.assign({}, wb.calcProperties, { fullCalcOnLoad: true });
    const buf = await wb.xlsx.writeBuffer(), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = 'KE HOACH MUA SAM NAM ' + nam + (phamVi === 'trong' ? ' (mau trong)' : phamVi === 'tat_ca' ? ' (tong hop)' : phamVi === 'con_lai' ? ' (phan con phai mua)' : '') + '.xlsx';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Đã tạo file: ' + ds.length + ' dòng');
  }

  // trang tính Xaydung: dựng lại theo khung mẫu (mục A, B, C – I … XIV); mục chưa có hạng mục giữ dòng ví dụ của mẫu; K = I × J; mục = SUM; C = tổng mục con; Tổng cộng = A + B + C
  function dungXaydung(ws, nam) {
    const A = (r) => ws.getRow(r).getCell(1).value, B = (r) => ws.getRow(r).getCell(2).value, N = 13;
    const mau = (r) => { const row = ws.getRow(r), st = {}; for (let c = 1; c <= N; c++) st[c] = sao(row.getCell(c).style); return { st, h: row.height }; };
    const giaTriDong = (r) => { const v = {}; for (let c = 1; c <= N; c++) v[c] = sao(ws.getRow(r).getCell(c).value); return v; };
    let rTong = 0; for (let r = 8; r <= ws.rowCount; r++) if (/tong cong/.test(boDau(B(r)))) { rTong = r; break; }
    if (!rTong) return;
    const muc = [], gap = {}; let l0 = '', cur = null, rMau = 0;
    for (let r = 8; r < rTong; r++) {
      const a = String(A(r) == null ? '' : A(r)).trim(), b = B(r); let ma = '';
      if (/^[A-E]$/.test(a)) { l0 = a; ma = a; } else if (/^[IVX]+$/.test(a) && l0) ma = l0 + '.' + a;
      if (ma) { gap[ma] = (gap[ma] || 0) + 1; cur = { ma: gap[ma] > 1 ? ma + '#' + gap[ma] : ma, m: mau(r), v: giaTriDong(r), vd: [] }; muc.push(cur); continue; }
      if (!cur) continue;
      if (typeof b === 'string' && /…\s*$/.test(b)) cur.vd.push({ r, m: mau(r), v: giaTriDong(r), so: typeof A(r) === 'number' });
      else if (typeof A(r) === 'number' && b && !rMau) rMau = r;
    }
    const goc = (ma) => ma.replace(/#\d+$/, ''), laCha = (m) => muc.some(x => goc(x.ma).indexOf(goc(m.ma) + '.') === 0);
    const mHM = rMau ? mau(rMau) : (muc.find(m => m.vd.some(x => x.so)) || { vd: [{ m: muc[0].m }] }).vd.find(x => x.so || 1).m, mTong = mau(rTong);
    const vTong = giaTriDong(rTong), chan = []; for (let r = rTong + 1; r <= ws.rowCount; r++) chan.push({ m: mau(r), v: giaTriDong(r) });
    const gopChan = (ws.model.merges || []).filter(g => +/\d+/.exec(g)[0] > rTong).map(g => g.replace(/(\d+)/g, (x) => '#' + (+x - rTong)));
    (ws.model.merges || []).filter(g => +/\d+/.exec(g)[0] >= 8).forEach(g => ws.unMergeCells(g));
    const cuoiCu = ws.rowCount, ds = D.xd || [], F = (f, kq) => ({ formula: f, result: kq });
    let r = 8;
    const ghi = (m, v, h) => { const row = ws.getRow(r); for (let c = 1; c <= N; c++) { const o2 = row.getCell(c); o2.style = sao(m.st[c]) || {}; o2.value = v[c] === undefined || v[c] === '' ? null : v[c]; } row.height = h || m.h; return r++; };
    // công thức của dòng ví dụ (VD =I10*J10) trỏ theo dòng mới
    const doiDong = (v, cu, moi) => { const o2 = {}; Object.keys(v).forEach(c => { const x = v[c]; o2[c] = x && x.formula ? { formula: x.formula.replace(new RegExp('([A-Z]+)' + cu + '(?!\\d)', 'g'), '$1' + moi) } : x; }); return o2; };
    const kq = {};
    muc.forEach(m => {
      const v = Object.assign({}, m.v); delete v[11]; const rm = ghi(m.m, v), dau = r, rHM = []; let tong = 0;
      if (!laCha(m)) {
        ds.filter(x => x.muc === m.ma && !x.cha).forEach((x, i) => {
          // hạng mục có dòng chi tiết: J (đơn giá 1 bộ) = SUM(K các dòng chi tiết); dòng chi tiết K = I × J
          const ct = ds.filter(c => c.cha === x.id), rh = r; rHM.push(rh);
          ghi(mHM, { 1: i + 1, 2: x.ten, 3: x.cong_trinh, 4: x.dia_diem, 5: x.muc_tieu, 6: x.ly_do, 7: x.tieu_chuan, 8: x.dvt, 9: x.khoi_luong || '', 10: ct.length ? F('SUM(K' + (rh + 1) + ':K' + (rh + ct.length) + ')', x.don_gia) : x.don_gia || '', 11: F('I' + r + '*J' + r, x.kinh_phi), 12: tdN(x.thoi_diem, nam) },
            caoDong([[x.ten, 20], [x.muc_tieu, 18.8], [x.ly_do, 15.8], [x.tieu_chuan, 11.7], [x.cong_trinh, 12.5]]));
          tong += x.kinh_phi;
          ct.forEach((c, j) => ghi(mHM, { 1: (i + 1) + '.' + (j + 1), 2: c.ten, 8: c.dvt, 9: c.khoi_luong || '', 10: c.don_gia || '', 11: F('I' + r + '*J' + r, c.kinh_phi) }, caoDong([[c.ten, 20]])));
        });
        (r > dau ? m.vd.filter(x => !x.so) : m.vd).forEach(x => ghi(x.m, doiDong(x.v, x.r, r)));
        // mục có dòng chi tiết: cộng K các hạng mục (không cộng K dòng chi tiết – đã nằm trong đơn giá 1 bộ)
        ws.getRow(rm).getCell(11).value = r > dau ? (ds.some(c => c.cha && c.muc === m.ma) ? F(rHM.map(k => 'K' + k).join('+'), tong) : F('SUM(K' + dau + ':K' + (r - 1) + ')', tong)) : null;
      }
      kq[m.ma] = { r: rm, t: tong };
    });
    muc.filter(laCha).forEach(m => { const con = muc.filter(x => goc(x.ma).indexOf(goc(m.ma) + '.') === 0), t = con.reduce((a, x) => a + kq[x.ma].t, 0);
      kq[m.ma].t = t; ws.getRow(kq[m.ma].r).getCell(11).value = F(con.map(x => 'K' + kq[x.ma].r).join('+'), t); });
    const dinh = muc.filter(m => m.ma.indexOf('.') < 0), vt = Object.assign({}, vTong); delete vt[11];
    const rT = ghi(mTong, vt); ws.getRow(rT).getCell(11).value = F(dinh.map(m => 'K' + kq[m.ma].r).join('+'), dinh.reduce((a, m) => a + kq[m.ma].t, 0));
    chan.forEach(c => ghi(c.m, c.v));
    gopChan.forEach(g => ws.mergeCells(g.replace(/#(\d+)/g, (x, n) => String(rT + +n))));
    const cuoi = r - 1;
    for (let k = r; k <= cuoiCu; k++) { const row = ws.getRow(k); for (let c = 1; c <= N; c++) { const o2 = row.getCell(c); o2.value = null; o2.style = {}; } row.height = undefined; }
    ws.pageSetup.printArea = 'A1:L' + cuoi;
  }

  Object.assign(Q.TUYEN, { 'ke-hoach-nam': manKHN });
  window.PTN_KHN = { docFileKHN: (XLSX, wb, d) => { D = d; return docFileKHN(XLSX, wb); } }; // kiểm thử
})();
