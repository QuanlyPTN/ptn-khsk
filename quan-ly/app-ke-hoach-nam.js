/* Kế hoạch năm – dự trù thiết bị: danh sách thiết bị dự trù năm theo mẫu "KẾ HOẠCH MUA SẮM NĂM" của P.KHĐT.
   Thêm / sửa / xóa dòng, dòng con (43.1…), đổi thứ tự, duyệt – đã mua – không duyệt; phiếu GV-BS giảng viên gửi tự vào danh sách ("Chờ duyệt", trùng thì gộp).
   Nhập từ file Excel đúng mẫu; xuất Excel dựng từ file mẫu mau/ke-hoach-mua-sam-nam.xlsx (giữ định dạng, viết lại công thức D=SUM(E:H), J=I*…, tổng mục, tổng cuối).
   Máy chủ: apps-script/24_KeHoachNam.gs. Trang: #/ke-hoach-nam, #/ke-hoach-nam/<năm>. Số tiền: nghìn đồng như file mẫu. */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, boDau, fmt, coQuyen, napXlsx } = Q;
  const MAU_TT = { 'Chờ duyệt': 't-info', 'Đã duyệt': 't-ok', 'Đã mua': 't-warn', 'Không duyệt': 't-gray' };
  const tagTT = (t) => '<span class="tag ' + (MAU_TT[t] || 't-gray') + '">' + esc(t) + '</span>';
  const xl = () => coQuyen('ke-hoach-nam', 'xu_ly');
  const NC = ['bo_sung', 'thay_moi', 'sua_chua', 'nang_cap'];
  const so = (v) => { if (typeof v === 'number') return v; const s = String(v == null ? '' : v).trim(); if (!s) return 0;
    const n = parseFloat(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.')); return isNaN(n) ? 0 : n; };
  const tien = (v) => v ? fmt(Math.round(v * 1000) / 1000) : '';
  let D = null; // dữ liệu năm đang xem

  async function manKHN(p) {
    const nam = /^\d{4}$/.test(p[1] || '') ? p[1] : '';
    const nd = trang('Danh sách thiết bị dự trù năm', '', '<a href="#/tai-san">Tài sản</a> ›');
    D = await api('khn_ds', nam ? { nam } : {});
    D.leaf = D.muc.filter(m => m[4]);
    $('main').querySelector('h1').innerHTML = 'Danh sách thiết bị dự trù năm <select id="k-nam" class="sm" style="font-size:inherit;font-weight:700">' +
      D.cac_nam.concat([String(+D.cac_nam[D.cac_nam.length - 1] + 1)]).filter((x, i, a) => a.indexOf(x) === i).map(n => '<option' + (n === D.nam ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>';
    $('k-nam').onchange = (e) => { location.hash = '#/ke-hoach-nam/' + e.target.value; };
    const c = D.cau_hinh, mo = D.nam === D.nam_mo;
    nd.innerHTML = '<div class="card note" style="border-color:#E8C77A;background:#FFFBEF">Năm <b>' + esc(D.nam) + '</b>: ' +
      (mo ? 'đang nhận đề xuất từ giảng viên (phiếu <b>GV-BS – Kế hoạch năm – dự trù thiết bị</b> ở trang dùng chung tự vào danh sách, trạng thái "Chờ duyệt")' + (c.han ? ' · hạn nộp <b>' + ngayVN(c.han) + '</b>' + (c.han < Q.homNay() ? ' <span class="tag t-gray">đã hết hạn</span>' : '') : ' · chưa đặt hạn nộp') :
        'không phải năm đang nhận đề xuất (năm nhận đề xuất: ' + esc(D.nam_mo) + ')') + '. Số tiền tính theo <b>nghìn đồng</b> như file của Trường.</div>' +
      '<div class="btns" style="margin:10px 0">' + (xl() ? '<button class="btn sm" id="k-them">+ Thêm dòng</button><label class="btn o sm">⇪ Nhập từ file Excel<input type="file" id="x-file" accept=".xlsx,.xls" hidden></label>' : '') +
      '<button class="btn o sm" id="k-xuat">⇩ Xuất file Excel theo mẫu</button>' + (xl() ? '<button class="btn o sm" id="k-chep">⎘ Chép dòng chưa mua từ năm khác</button><button class="btn o sm" id="k-ch">⚙ Hạn nộp – kinh phí khoán</button>' : '') + '</div>' +
      '<div id="k-tong"></div><div class="tools"><input type="search" id="k-q" placeholder="Tìm tên, yêu cầu kỹ thuật, bộ môn, người đề xuất…"><select id="k-tt"><option value="">Mọi trạng thái</option>' +
      D.trang_thai.map(t => '<option>' + t + '</option>').join('') + '</select><select id="k-muc" style="max-width:340px"><option value="">Mọi mục</option>' + D.leaf.map(m => '<option value="' + m[0] + '">' + esc(m[0] + ' – ' + m[3]) + '</option>').join('') + '</select>' +
      '<select id="k-bm"><option value="">Mọi bộ môn</option>' + [...new Set(D.dong.map(d => d.bo_mon).filter(Boolean))].sort().map(b => '<option>' + esc(b) + '</option>').join('') + '</select></div>' +
      (xl() ? '<div class="btns" id="k-chon" style="margin:6px 0" hidden><span class="note" id="k-dem"></span>' + D.trang_thai.map(t => '<button class="btn o sm" data-tt="' + t + '">→ ' + t + '</button>').join('') + '<button class="btn red o sm" id="k-xoa">Xóa dòng đã chọn</button></div>' : '') +
      '<div id="k-ds"></div>';
    $('k-q').oninput = veDS; ['k-tt', 'k-muc', 'k-bm'].forEach(id => { $(id).onchange = veDS; });
    $('k-xuat').onclick = hopXuat;
    const nx = $('b-xuat-trang'); if (nx) { nx.textContent = '⇩ Xuất file Excel theo mẫu'; nx.onclick = hopXuat; } // nút chung chỉ chép bảng (không công thức)
    if (xl()) {
      $('k-them').onclick = () => hopSua(null);
      $('x-file').onchange = (e) => { const f = e.target.files[0]; if (f) hopNhap(f); };
      $('k-chep').onclick = hopChep; $('k-ch').onclick = hopCauHinh;
      $('k-chon').querySelectorAll('[data-tt]').forEach(b => { b.onclick = (e) => chay(e.target, async () => { const r = await api('khn_tt', { ids: dangChon(), trang_thai: b.dataset.tt }); toast('Đã chuyển ' + r.n + ' dòng sang "' + b.dataset.tt + '"'); await taiLai(); }); });
      $('k-xoa').onclick = (e) => { const ids = dangChon(); if (!confirm('Xóa ' + ids.length + ' dòng đã chọn (kèm dòng con)?')) return; chay(e.target, async () => { const r = await api('khn_xoa', { ids }); toast('Đã xóa ' + r.n + ' dòng'); await taiLai(); }); };
    }
    veTong(); veDS();
  }
  async function taiLai() { const y = window.scrollY; const p = (location.hash.split('/')[2] || ''); D = Object.assign(await api('khn_ds', { nam: D.nam }), {}); D.leaf = D.muc.filter(m => m[4]); veTong(); veDS(); window.scrollTo(0, y); return p; }
  const dangChon = () => [...document.querySelectorAll('#k-ds [data-chon]:checked')].map(x => x.dataset.chon);
  const conCua = (id) => D.dong.filter(d => d.cha === id);
  // kinh phí của dòng cha có dòng con = tổng dòng con (file mẫu: dòng cha không ghi số lượng, kinh phí)
  const kp = (d) => d.cha ? d.kinh_phi : (conCua(d.id).length ? conCua(d.id).reduce((a, x) => a + x.kinh_phi, 0) : d.kinh_phi);
  const tinhTong = (l) => l.filter(d => !d.cha).reduce((a, d) => a + kp(d), 0);

  function veTong() {
    const dem = {}; D.trang_thai.forEach(t => { dem[t] = D.dong.filter(d => !d.cha && d.trang_thai === t); });
    const conLai = D.dong.filter(d => d.trang_thai !== 'Không duyệt'), theoMuc = D.leaf.map(m => {
      const l = conLai.filter(d => d.muc === m[0]), k = D.cau_hinh.kp_muc[m[0]] || 0; return [m, l.filter(d => !d.cha).length, l.length ? tinhTong(l) : k, !l.length && k]; }).filter(x => x[1] || x[2]);
    const bm = {}; conLai.filter(d => !d.cha).forEach(d => { const k = d.bo_mon || '(chưa ghi bộ môn)'; bm[k] = bm[k] || [0, 0]; bm[k][0]++; bm[k][1] += kp(d); });
    const tong = theoMuc.reduce((a, x) => a + x[2], 0);
    $('k-tong').innerHTML = '<div class="grid g2"><div class="card"><h2>Tổng theo mục (trừ dòng không duyệt)</h2><div class="btns" style="margin-bottom:8px">' +
      D.trang_thai.map(t => tagTT(t) + ' <b>' + dem[t].length + '</b>').join(' &nbsp; ') + '</div><div class="tbl-wrap"><table><thead><tr><th>Mục</th><th class="num">Số dòng</th><th class="num">Kinh phí (nghìn đ)</th></tr></thead><tbody>' +
      theoMuc.map(x => '<tr><td><b>' + esc(x[0][0]) + '</b> ' + esc(x[0][3]) + '</td><td class="num">' + (x[1] || '—') + '</td><td class="num">' + tien(x[2]) + (x[3] ? ' <span class="note">khoán</span>' : '') + '</td></tr>').join('') +
      '<tr><td><b>Tổng cộng</b></td><td></td><td class="num"><b>' + tien(tong) + '</b></td></tr></tbody></table></div></div>' +
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
      '<th>TT</th><th>Danh mục – yêu cầu kỹ thuật</th><th>ĐVT</th><th>Nhu cầu</th><th class="num">SL</th><th class="num">Định mức</th><th class="num">Kinh phí</th><th>Đơn vị sử dụng – lý do</th><th>Thời điểm</th><th>Hiện có</th><th>Trạng thái</th><th>Đề xuất của GV</th>' + (xl() ? '<th></th>' : '') + '</tr></thead><tbody>';
    D.leaf.forEach(m => {
      const lm = l.filter(d => d.muc === m[0]); if (!lm.length) return;
      h += '<tr style="background:#F3F6FC"><td colspan="' + (xl() ? 14 : 12) + '"><b>' + esc(m[0]) + '</b> – ' + esc(m[3]) + ' · <span class="note">' + lm.filter(d => !d.cha).length + ' dòng · ' + tien(tinhTong(lm.filter(d => d.trang_thai !== 'Không duyệt'))) + ' nghìn đ</span></td></tr>';
      let stt = 0, con = 0;
      lm.forEach(d => {
        if (d.cha) con++; else { stt++; con = 0; }
        const ht = d.hien_trang || { co: 0, hong: 0 }, laCha = !d.cha && conCua(d.id).length;
        h += '<tr' + (d.trang_thai === 'Không duyệt' ? ' style="opacity:.55"' : '') + '>' + (xl() ? '<td><input type="checkbox" data-chon="' + esc(d.id) + '"></td>' : '') +
          '<td>' + (d.cha ? stt + '.' + con : stt) + '</td><td style="max-width:340px' + (d.cha ? ';padding-left:22px' : '') + '"><b>' + esc(d.ten) + '</b>' + (d.yckt ? '<div class="note" style="white-space:pre-line;max-height:5.6em;overflow:hidden" title="' + esc(d.yckt) + '">' + esc(d.yckt) + '</div>' : '') + '</td>' +
          '<td>' + esc(d.dvt) + '</td><td>' + NC.filter(k => d[k]).map(k => esc(D.nhu_cau[k])).join(', ') + '</td><td class="num">' + (laCha ? '' : fmt(d.sl)) + '</td><td class="num">' + (laCha ? '' : tien(d.dinh_muc)) + '</td>' +
          '<td class="num"><b>' + tien(kp(d)) + '</b></td><td style="max-width:220px;white-space:pre-line">' + esc([d.bo_mon, d.ly_do].filter(Boolean).join('\n')) + '</td><td>' + esc(d.thoi_diem) + '</td>' +
          '<td>' + (ht.co ? '<span title="Thiết bị cùng tên trong Tài sản">' + ht.co + ' cái</span>' + (ht.hong ? ' · <b style="color:#B42318">' + ht.hong + ' hỏng</b>' : '') : '<span class="note">—</span>') + '</td>' +
          '<td>' + tagTT(d.trang_thai) + (d.tb_moi.length ? '<div class="note">Đã tạo ' + d.tb_moi.length + ' TB</div>' : '') + '</td>' +
          '<td class="note">' + d.nguon.map(n => '<a href="#/giang-vien/' + esc(n.don) + '">' + esc(n.don) + '</a> ' + esc(n.gv) + ' · ' + fmt(n.sl)).join('<br>') + '</td>' +
          (xl() ? '<td style="white-space:nowrap"><button class="btn o sm" data-sua="' + esc(d.id) + '" title="Sửa">✎</button><button class="btn o sm" data-len="' + esc(d.id) + '" title="Lên">↑</button><button class="btn o sm" data-xuong="' + esc(d.id) + '" title="Xuống">↓</button>' +
            (d.cha ? '' : '<button class="btn o sm" data-con="' + esc(d.id) + '" title="Thêm dòng con (hạng mục của thiết bị đồng bộ)">+ con</button>') +
            (d.trang_thai === 'Đã mua' && !laCha ? '<button class="btn o sm" data-tb="' + esc(d.id) + '" title="Tạo hồ sơ thiết bị trong Tài sản">→ Tài sản</button>' : '') + '</td>' : '') + '</tr>';
      });
    });
    $('k-ds').innerHTML = h + '</tbody></table></div>';
    if (!xl()) return;
    const ds = $('k-ds'), capNhatChon = () => { const n = dangChon().length; $('k-chon').hidden = !n; $('k-dem').textContent = 'Đã chọn ' + n + ' dòng:'; };
    ds.querySelectorAll('[data-chon]').forEach(x => { x.onchange = capNhatChon; });
    $('k-all').onchange = (e) => { ds.querySelectorAll('[data-chon]').forEach(x => { x.checked = e.target.checked; }); capNhatChon(); };
    ds.querySelectorAll('[data-sua]').forEach(b => { b.onclick = () => hopSua(D.dong.find(d => d.id === b.dataset.sua)); });
    ds.querySelectorAll('[data-con]').forEach(b => { b.onclick = () => hopSua(null, b.dataset.con); });
    ds.querySelectorAll('[data-len],[data-xuong]').forEach(b => { b.onclick = (e) => chay(e.target, async () => { await api('khn_doi_cho', { id: b.dataset.len || b.dataset.xuong, huong: b.dataset.len ? -1 : 1 }); await taiLai(); }); });
    ds.querySelectorAll('[data-tb]').forEach(b => { b.onclick = () => hopTaoTB(D.dong.find(d => d.id === b.dataset.tb)); });
  }

  // ---------- thêm / sửa một dòng ----------
  function hopSua(d, cha) {
    const c = cha ? D.dong.find(x => x.id === cha) : null, x = d || { muc: c ? c.muc : '', trang_thai: 'Đã duyệt', dvt: 'Cái', thoi_diem: 'Năm ' + D.nam };
    moHop('<h2>' + (d ? 'Sửa dòng' : c ? 'Thêm dòng con của "' + esc(c.ten) + '"' : 'Thêm thiết bị dự trù năm ' + esc(D.nam)) + '</h2><form id="k-f" class="form-grid">' +
      (c || (d && d.cha) ? '' : o('muc', 'Mục trong file kế hoạch', { select: [['', '— Tự gợi ý theo đơn giá / nhu cầu —']].concat(D.leaf.map(m => [m[0], m[0] + ' – ' + m[3]])), v: x.muc, full: 1 })) +
      o('ten', 'Danh mục (tên thiết bị)', { v: x.ten, req: 1, full: 1 }) + o('dvt', 'Đơn vị', { v: x.dvt }) + o('trang_thai', 'Trạng thái', { select: D.trang_thai, v: x.trang_thai }) +
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
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (m) => {
      m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target), kpm = {}; D.leaf.forEach(x => { if (so(v['kp_' + x[0]])) kpm[x[0]] = so(v['kp_' + x[0]]); });
        await chay(e.submitter, () => api('khn_cau_hinh', { nam: D.nam, han: v.han, kp_muc: kpm, nam_mo: v.nam_mo ? 1 : 0 })); dongHop(); toast('Đã lưu'); Q.dieuHuong(); };
    });
  }
  function hopChep() {
    const khac = D.cac_nam.filter(n => n !== D.nam);
    if (!khac.length) return toast('Chưa có năm nào khác để chép', true);
    moHop('<h2>Chép dòng chưa mua sang năm ' + esc(D.nam) + '</h2><form id="k-f" class="form-grid">' + o('tu', 'Chép từ năm', { select: khac.slice().reverse(), full: 1 }) +
      '<p class="note full">Chép các dòng chưa mua (bỏ dòng "Đã mua", "Không duyệt"), kèm dòng con; trạng thái về "Chờ duyệt". Dòng đã có cùng tên trong năm ' + esc(D.nam) + ' thì bỏ qua.</p>' +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Chép</button></div></form>', (m) => {
      m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const r = await chay(e.submitter, () => api('khn_chep', { tu: giaTri(e.target).tu, den: D.nam })); dongHop(); toast('Đã chép ' + r.n + ' dòng'); await taiLai(); };
    });
  }
  function hopTaoTB(d) {
    moHop('<h2>Đưa "' + esc(d.ten) + '" vào Tài sản</h2><form id="k-f" class="form-grid">' + o('phong', 'Phòng đặt thiết bị', { select: [['', '— Chưa xếp phòng (kho PTN) —']].concat(D.phong.map(p => [p.ma, p.ma + ' – ' + p.ten])) }) +
      o('so', 'Số hồ sơ thiết bị tạo (mỗi cái một hồ sơ, tối đa 50)', { type: 'number', v: Math.min(50, d.sl || 1), extra: ' min="1" max="50"' }) +
      '<p class="note full">Mỗi hồ sơ: tên (kèm #1, #2… nếu nhiều cái), nguồn vốn "Mua sắm năm ' + esc(d.nam) + '", nguyên giá theo định mức, thông số theo yêu cầu kỹ thuật. Sửa thêm mã tài sản, serial trong mục Tài sản.' +
      (d.tb_moi.length ? ' <b>Dòng này đã tạo ' + d.tb_moi.length + ' hồ sơ.</b>' : '') + '</p><div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tạo thiết bị</button></div></form>', (m) => {
      m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); const r = await chay(e.submitter, () => api('khn_tao_tb', { id: d.id, phong: v.phong, so: v.so }));
        dongHop(); toast('Đã tạo ' + r.ids.length + ' thiết bị: ' + r.ids.join(', ')); await taiLai(); };
    });
  }

  // ---------- nhập từ file Excel đúng mẫu ----------
  const LA_MA = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/;
  function docFileKHN(XLSX, wb) {
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
    return { ten, dong, kp, loi };
  }
  async function hopNhap(f) {
    try {
      const XLSX = await napXlsx(), wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }), r = docFileKHN(XLSX, wb);
      if (!r.dong.length) throw new Error('Không đọc được dòng thiết bị nào trong file');
      const theoMuc = {}; r.dong.forEach(d => { theoMuc[d.muc] = theoMuc[d.muc] || [0, 0]; theoMuc[d.muc][0]++; theoMuc[d.muc][1] += (d.bo_sung + d.thay_moi + d.sua_chua + d.nang_cap) * d.dinh_muc; });
      const daCo = D.dong.length;
      moHop('<h2>Nhập kế hoạch năm từ file</h2><p class="note">' + esc(f.name) + ' · trang tính <b>' + esc(r.ten) + '</b> · <b>' + r.dong.length + '</b> dòng (' + r.dong.filter(d => d.la_con).length + ' dòng con)' +
        (Object.keys(r.kp).length ? ' · kinh phí khoán: ' + Object.keys(r.kp).map(k => k + ' ' + tien(r.kp[k])).join(', ') : '') + (r.loi ? ' · <b>' + r.loi + ' mục lạ</b> xếp vào mục gần nhất' : '') + '</p>' +
        '<div class="tbl-wrap"><table><thead><tr><th>Mục</th><th class="num">Số dòng</th><th class="num">Kinh phí (nghìn đ)</th></tr></thead><tbody>' +
        Object.keys(theoMuc).map(k => '<tr><td><b>' + esc(k) + '</b> ' + esc((D.muc.find(m => m[0] === k) || [])[3] || '') + '</td><td class="num">' + theoMuc[k][0] + '</td><td class="num">' + tien(theoMuc[k][1]) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<form id="k-f" class="form-grid">' + o('nam', 'Nhập vào năm', { select: D.cac_nam.concat([String(+D.cac_nam[D.cac_nam.length - 1] + 1)]).filter((x, i, a) => a.indexOf(x) === i), v: (/(20\d\d)/.exec(f.name) || [])[1] && D.cac_nam.indexOf(/(20\d\d)/.exec(f.name)[1]) >= 0 ? /(20\d\d)/.exec(f.name)[1] : D.nam }) +
        o('cach', 'Cách nhập', { select: [['them', 'Thêm vào danh sách đang có'], ['thay', 'Thay toàn bộ danh sách của năm (xóa dòng cũ)']], v: daCo ? 'them' : 'thay' }) +
        '<p class="note full">Dòng nhập từ file có trạng thái "Đã duyệt" (cột N ghi "đã mua" → "Đã mua"). "Đơn vị sử dụng: …" ở cột lý do được tách thành bộ môn. Lần nhập ghi vào <b>Lịch sử tải file</b> (thu hồi được, lưu file gốc).</p>' +
        '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Nhập ' + r.dong.length + ' dòng</button></div></form>', (m) => {
        m.querySelector('#k-f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target);
          if (v.cach === 'thay' && !confirm('Xóa toàn bộ danh sách năm ' + v.nam + ' rồi nhập lại từ file?')) return;
          const k = await chay(e.submitter, () => api('khn_nhap', { nam: v.nam, thay: v.cach === 'thay' ? 1 : 0, dong: r.dong, kp_muc: r.kp, tep: f.name }));
          dongHop(); toast('Đã nhập ' + k.n + ' dòng' + (k.xoa ? ', thay ' + k.xoa + ' dòng cũ' : '')); location.hash = '#/ke-hoach-nam/' + k.nam; Q.dieuHuong(); };
      });
    } catch (err) { toast(err.message, true); }
    const x = $('x-file'); if (x) x.value = '';
  }

  // ---------- xuất Excel từ file mẫu ----------
  const EXCELJS = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  const napExcelJS = () => window.ExcelJS ? Promise.resolve(window.ExcelJS) : new Promise((ok, loi) => { const s = document.createElement('script'); s.src = EXCELJS; s.onload = () => ok(window.ExcelJS); s.onerror = () => loi(new Error('Không tải được thư viện Excel (cần mạng)')); document.head.appendChild(s); });
  function hopXuat() {
    moHop('<h2>Xuất kế hoạch năm ' + esc(D.nam) + ' theo file mẫu</h2><form id="k-f" class="form-grid">' +
      o('pham_vi', 'Dòng đưa vào file', { select: [['duyet', 'Đã duyệt + Đã mua (gửi P.KHĐT)'], ['tat_ca', 'Tất cả trừ "Không duyệt" (bản nháp tổng hợp)'], ['trong', 'Không dòng nào (file mẫu trống để điền tay)']], full: 1 }) +
      '<p class="note full">File dựng từ mẫu "KẾ HOẠCH MUA SẮM NĂM" của Trường: giữ khung, định dạng, chữ ký, trang tính Xây dựng và Tool; công thức <b>D = SUM(E:H)</b>, <b>J = I × số lượng</b>, tổng từng mục và <b>Tổng cộng (A+B+C+D+E)</b> viết lại theo số dòng thực tế; mục chưa có thiết bị giữ nguyên các dòng ví dụ ("1 – Chương trình, kế hoạch…", "…") như file mẫu.</p>' +
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
    const tt = phamVi === 'trong' ? [] : phamVi === 'tat_ca' ? ['Chờ duyệt', 'Đã duyệt', 'Đã mua'] : ['Đã duyệt', 'Đã mua'];
    const lay = D.dong.filter(d => tt.indexOf(d.trang_thai) >= 0), coCha = {}; lay.forEach(d => { if (!d.cha) coCha[d.id] = 1; });
    const ds = lay.filter(d => !d.cha || coCha[d.cha]);
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
        const v = { 1: so1, 2: d.ten, 3: d.dvt, 11: d.yckt, 12: ly, 13: d.thoi_diem, 14: d.trang_thai === 'Đã mua' ? 'đã mua' : '' };
        if (!laCha) {
          const co = NC.map((k, i) => [k, 5 + i]).filter(x => d[x[0]]), cot = co.length === 1 ? 'EFGH'[co[0][1] - 5] : co.length ? 'D' : 'E';
          NC.forEach((k, i) => { v[5 + i] = d[k] || ''; });
          v[4] = F('SUM(E' + r + ':H' + r + ')', d.sl); v[9] = d.dinh_muc || ''; v[10] = F('I' + r + '*' + cot + r, d.kinh_phi); tong += d.kinh_phi;
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
    wb.calcProperties = Object.assign({}, wb.calcProperties, { fullCalcOnLoad: true });
    const buf = await wb.xlsx.writeBuffer(), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = 'KE HOACH MUA SAM NAM ' + nam + (phamVi === 'trong' ? ' (mau trong)' : phamVi === 'tat_ca' ? ' (tong hop)' : '') + '.xlsx';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Đã tạo file: ' + ds.length + ' dòng');
  }

  Object.assign(Q.TUYEN, { 'ke-hoach-nam': manKHN });
  window.PTN_KHN = { docFileKHN: (XLSX, wb, d) => { D = d; return docFileKHN(XLSX, wb); } }; // kiểm thử
})();
