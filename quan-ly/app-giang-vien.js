/* Trang quản lý – mục "Giảng viên" (nhóm Hệ thống): phiếu báo hỏng, đề nghị sửa chữa / bổ sung thiết bị, biên bản bàn giao thiết bị cho GV,
   giấy báo mang tài sản vào / ra cơ quan (TCHC – mẫu số 28). Giảng viên gửi từ trang công khai hoặc cán bộ lập thay; tiếp nhận – xử lý, in / Word, xuất Excel.
   Khung nhập liệu và mẫu in dùng chung với trang công khai: ../phieu-gv.js. */
(function () {
  'use strict';
  const Q = window.PTN_QL, G = window.PTN_PHIEU_GV;
  const { S, $, api, chay, trang, moHop, dongHop, esc, toast, ngayVN, homNay, boDau, fmt, coQuyen, dieuHuong, napQR, lienKet } = Q;
  const MAU = { 'Chờ duyệt': 't-info', 'Đang xử lý': 't-warn', 'Hoàn tất': 't-ok', 'Từ chối': 't-gray' };
  const tagTT = (t) => '<span class="tag ' + (MAU[t] || 't-gray') + '">' + esc(t) + '</span>';
  const xong = (d) => d.trang_thai === 'Hoàn tất' || d.trang_thai === 'Từ chối';
  const HUONG = ['Sửa chữa', 'Thay thế', 'Thanh lý', 'Khác'];
  // danh mục phòng + thiết bị cho ô "chọn nhanh" (API công khai – cán bộ không cần quyền mục Tài sản)
  async function danhMuc() { if (!S.gvDm) S.gvDm = await api('ck_danh_muc'); window.PTN_KY = window.PTN_KY || S.gvDm.ky || {}; return S.gvDm; }
  async function anhQR(d) { try { const QR = await napQR(), q = QR(0, 'M'); q.addData(lienKet('don/' + d.qr + '/' + d.id)); q.make(); return q.createDataURL(4, 1); } catch (e) { return ''; } }
  const ngayTT = (d) => [d.tu_ngay && ngayVN(d.tu_ngay), d.den_ngay && '→ ' + ngayVN(d.den_ngay)].filter(Boolean).join(' ');

  // ---------------- Danh sách phiếu ----------------
  async function manGiangVien(p) {
    if (p[1] === 'lap') return manLap(p[2]);
    const xl = coQuyen('giang-vien', 'xu_ly');
    const nd = trang('Giảng viên – phiếu thiết bị', (xl ? '<a class="btn sm" href="#/giang-vien/lap">+ Lập phiếu thay giảng viên</a>' : '') + '<button class="btn o sm" id="b-xuat">Xuất Excel</button>');
    const ds = await api('gv_ds'), dem = (f) => ds.filter(f).length;
    nd.innerHTML = '<p class="note">Giảng viên điền ở trang công khai (mục "Giảng viên – thiết bị") hoặc cán bộ PTN lập thay. Mỗi phiếu có mã, mã QR ở chân trang; in / tải Word đúng biểu mẫu.</p>' +
      '<div class="tools"><input type="search" id="q" placeholder="Tìm tên, mã phiếu, phòng, thiết bị…"><select id="f-loai"><option value="">Mọi loại phiếu (' + ds.length + ')</option>' +
      Object.keys(G.LOAI).map(k => '<option value="' + k + '">' + esc(G.LOAI[k].ten) + ' (' + dem(d => d.qr === k) + ')</option>').join('') + '</select><select id="f-tt">' +
      [['chua', 'Chưa xong (' + dem(d => !xong(d)) + ')'], ['Chờ duyệt', 'Chờ duyệt (' + dem(d => d.trang_thai === 'Chờ duyệt') + ')'], ['Đang xử lý', 'Đang xử lý (' + dem(d => d.trang_thai === 'Đang xử lý') + ')'],
        ['Hoàn tất', 'Hoàn tất (' + dem(d => d.trang_thai === 'Hoàn tất') + ')'], ['Từ chối', 'Từ chối (' + dem(d => d.trang_thai === 'Từ chối') + ')'], ['', 'Tất cả (' + ds.length + ')']]
        .map(x => '<option value="' + x[0] + '">' + x[1] + '</option>').join('') + '</select></div><div id="kq"></div>' +
      '<div class="card" style="margin-top:14px"><h2>Biểu mẫu trống (Word)</h2>' + Object.keys(G.LOAI).filter(k => !G.LOAI[k].ngung).map(k => [G.LOAI[k].ten, G.LOAI[k].mau]).concat([['Phiếu đề nghị giải quyết công việc (tờ trình BGH) – kèm giấy báo mang tài sản ra', G.LOAI['GV-TS'].to_trinh]]).map(([ten, mau]) => '<div class="dong-tep" style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line,#E3E7EF)"><span>📄 ' + esc(ten) + '</span><a class="btn o sm" href="../bieu-mau/' + esc(mau) + '" download>Tải về (.docx)</a></div>').join('') + '</div>';
    let hien = [];
    const ve = () => {
      const q = boDau($('q').value), loai = $('f-loai').value, tt = $('f-tt').value;
      hien = ds.filter(d => (!loai || d.qr === loai) && (tt === '' || (tt === 'chua' ? !xong(d) : d.trang_thai === tt)) && (!q || boDau([d.id, d.ho_ten, d.ma_so, d.bo_mon, G.tomTat(d)].join(' ')).indexOf(q) >= 0));
      $('kq').innerHTML = !hien.length ? '<div class="card empty">Không có phiếu nào.</div>' : '<div class="tbl-wrap"><table><thead><tr><th>Mã phiếu</th><th>Loại</th><th>Gửi lúc</th><th>Giảng viên</th><th>Nội dung</th><th>Ngày</th><th>Trạng thái</th></tr></thead><tbody>' +
        hien.slice(0, 500).map(d => '<tr class="click" data-id="' + esc(d.id) + '"><td class="mono">' + esc(d.id) + '</td><td><b>' + esc(d.qr) + '</b><div class="note">' + esc(G.LOAI[d.qr].ten) + '</div></td><td style="white-space:nowrap">' + ngayVN(d.tg) + '</td>' +
          '<td><b>' + esc(d.ho_ten) + '</b><div class="note">' + esc([d.ma_so, d.bo_mon].filter(Boolean).join(' · ')) + (d.ma_may === 'QL' ? ' · cán bộ lập' : '') + '</div></td><td>' + esc(G.tomTat(d)).slice(0, 220) + '</td>' +
          '<td style="white-space:nowrap">' + ngayTT(d) + '</td><td>' + tagTT(d.trang_thai) + '</td></tr>').join('') + '</tbody></table></div>' + (hien.length > 500 ? '<p class="note">Hiện 500 / ' + hien.length + ' phiếu – lọc thêm để xem.</p>' : '');
      $('kq').querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = () => hop(tr.dataset.id, hien.map(d => d.id)); });
    };
    ['q', 'f-loai', 'f-tt'].forEach(id => { $(id).oninput = ve; $(id).onchange = ve; });
    ve();
    $('b-xuat').onclick = () => window.PTN_IN.xemTruoc({ ten: 'Phieu giang vien ' + homNay(), trang: [window.PTN_IN.bang({ ten: 'Phieu GV', huong: 'ngang', tieuDe: 'DANH SÁCH PHIẾU GIẢNG VIÊN – THIẾT BỊ',
      phuDe: 'Xuất ngày ' + ngayVN(homNay()) + ' · ' + hien.length + ' phiếu', cot: [{ ten: 'STT', rong: 5, can: 'c' }, { ten: 'MÃ PHIẾU', rong: 10 }, { ten: 'LOẠI PHIẾU', rong: 24 }, { ten: 'GỬI LÚC', rong: 15 },
        { ten: 'GIẢNG VIÊN', rong: 20 }, { ten: 'BỘ MÔN', rong: 14 }, { ten: 'ĐIỆN THOẠI', rong: 12 }, { ten: 'PHÒNG', rong: 9 }, { ten: 'THIẾT BỊ – TÀI SẢN', rong: 40 }, { ten: 'NGÀY', rong: 18 }, { ten: 'TRẠNG THÁI', rong: 13 }, { ten: 'NGƯỜI XỬ LÝ', rong: 15 }],
      dong: hien.map((d, i) => [i + 1, d.id, G.LOAI[d.qr].ten + (d.nd.chieu ? (d.nd.chieu === 'vao' ? ' (vào)' : ' (ra)') : ''), ngayVN(d.tg), d.ho_ten, d.bo_mon, d.sdt, d.phong,
        (d.nd.tb || []).map(x => x.ten + ' – SL ' + fmt(x.sl)).join('\n'), ngayTT(d), d.trang_thai, d.nguoi_xu_ly]) })] });
    if (p[1]) hop(decodeURIComponent(p[1]), hien.map(d => d.id));
  }

  // ---------------- Chi tiết – xử lý ----------------
  async function hop(id, dsId) {
    const d = await api('gv_ct', { id }), n = d.nd, xl = coQuyen('giang-vien', 'xu_ly'), bh = d.qr === 'GV-BH', bg = d.qr === 'GV-BG', vt = (dsId || []).indexOf(id);
    const kv = [['Giảng viên', [d.ho_ten, d.ma_so].filter(Boolean).join(' – ')], ['Bộ môn', d.bo_mon], ['Liên hệ', [d.sdt, d.email].filter(Boolean).join(' · ')],
      ['Loại giấy báo', n.chieu ? (n.chieu === 'vao' ? 'Mang tài sản VÀO cơ quan' : 'Mang tài sản RA KHỎI cơ quan') : ''], ['Phòng', d.phong],
      [bh ? 'Ngày phát hiện sự cố' : d.qr === 'GV-TS' ? 'Ngày mang tài sản' : 'Từ ngày', ngayVN(d.tu_ngay)], ['Đến ngày', ngayVN(d.den_ngay)],
      ['Lý do / nội dung', n.ly_do], ['Giấy báo mang vào đã lập', n.ma_vao], ['Diễn biến sự cố', n.dien_bien], ['Đề xuất hướng xử lý', n.de_xuat], ['Ý kiến PTN', n.y_kien], ['Kết quả', n.ket_qua],
      ['Hướng xử lý', n.huong_xu_ly ? n.huong_xu_ly + (n.huong_khac ? ' – ' + n.huong_khac : '') : ''], ['Người sửa chữa', n.nguoi_sua],
      ['Tiếp nhận / duyệt', n.tiep_nhan ? n.tiep_nhan.nguoi + ' · ' + ngayVN(n.tiep_nhan.tg) : ''], [bg ? 'Bàn giao' : 'Hoàn tất', n.hoan_tat ? n.hoan_tat.nguoi + ' · ' + ngayVN(n.hoan_tat.tg) : '']].filter(x => x[1]);
    const cot = { ten: 'Tên', ma: 'Mã / ID', dvt: 'ĐVT', sl: 'SL', tinh_trang: 'Tình trạng', ghi_chu: 'Ghi chú', nguoi_giao: 'Người giao', nguoi_nhan: 'Người nhận' }, coCot = Object.keys(cot).filter(k => (n.tb || []).some(x => x[k]));
    let h = (vt >= 0 && dsId.length > 1 ? '<div class="nav-ds" style="float:right"><button class="btn o sm" data-nav="' + esc(dsId[vt - 1] || '') + '"' + (vt ? '' : ' disabled') + '>‹ Trước</button><span class="note">' + (vt + 1) + ' / ' + dsId.length + '</span><button class="btn o sm" data-nav="' + esc(dsId[vt + 1] || '') + '"' + (vt < dsId.length - 1 ? '' : ' disabled') + '>Tiếp ›</button></div>' : '') +
      '<h2>' + esc(d.qr) + ' · ' + esc(d.id) + ' ' + tagTT(d.trang_thai) + '</h2><p class="note">' + esc(G.LOAI[d.qr].ten) + ' · gửi ' + ngayVN(d.tg) + (d.ma_may === 'QL' ? ' · cán bộ lập thay' : ' · mã máy ' + esc(d.ma_may)) + '</p>' +
      '<div class="btns" style="margin-bottom:8px"><button class="btn o sm" id="b-in-gv">🖨 ' + esc(window.PTN_DON_QR.TEN[d.qr]) + ' – xem trước, in / Word</button></div>' +
      (d.ly_do ? '<p class="err">Lý do từ chối: ' + esc(d.ly_do) + '</p>' : '') +
      '<dl class="kv">' + kv.map(x => '<dt>' + esc(x[0]) + '</dt><dd style="white-space:pre-line">' + esc(x[1]) + '</dd>').join('') + '</dl>' +
      '<h2 style="margin-top:12px">' + (d.qr === 'GV-TS' ? 'Danh mục tài sản' : 'Thiết bị') + '</h2><div class="tbl-wrap"><table><thead><tr><th>STT</th>' + coCot.map(k => '<th>' + cot[k] + '</th>').join('') + '</tr></thead><tbody>' +
      (n.tb || []).map((x, i) => '<tr><td>' + (i + 1) + '</td>' + coCot.map(k => '<td' + (k === 'sl' ? ' class="num"' : '') + '>' + (k === 'ten' && x.tb ? '<a href="#/tai-san/' + esc(x.tb) + '">' + esc(x.ten) + '</a>' : esc(k === 'sl' ? fmt(x.sl) : x[k] || '')) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    if (xl && !xong(d)) {
      const choDuyet = d.trang_thai === 'Chờ duyệt';
      h += '<h2 style="margin-top:12px">Xử lý</h2><div id="xl">' + (bh ? '<div class="form-grid">' + Q.o('ket_qua', 'Kết quả kiểm tra', { v: n.ket_qua || '', full: 1 }) +
          Q.o('huong_xu_ly', 'Hướng xử lý', { select: [['', '— Chưa chọn —']].concat(HUONG.map(x => [x, x])), v: n.huong_xu_ly || '' }) + Q.o('huong_khac', 'Hướng khác (ghi rõ)', { v: n.huong_khac || '' }) +
          Q.o('nguoi_sua', 'Người sửa chữa', { v: n.nguoi_sua || '' }) + '</div>'
        : '<div class="form-grid">' + Q.o(choDuyet ? 'y_kien' : 'ket_qua', choDuyet ? 'Ý kiến của PTN (in trên phiếu)' : 'Kết quả xử lý', { v: (choDuyet ? n.y_kien : n.ket_qua) || '', full: 1 }) + '</div>') +
        '<div class="btns">' + (choDuyet && !bg ? '<button class="btn" data-hd="duyet">' + (bh ? 'Tiếp nhận' : 'Duyệt') + '</button>' : '') +
        (bg ? '<button class="btn" data-hd="hoan_tat">Xác nhận đã bàn giao thiết bị</button>' : !choDuyet ? '<button class="btn" data-hd="hoan_tat">' + (bh ? 'Hoàn tất xử lý' : 'Hoàn tất') + '</button>' + (bh ? '<button class="btn o" data-hd="cap_nhat">Lưu kết quả</button>' : '') : '') + '</div>' +
        '<div class="form-grid" style="margin-top:8px">' + Q.o('ly_do', 'Lý do từ chối', { full: 1 }) + '</div><button class="btn red sm" data-hd="tu_choi">Từ chối</button></div>';
    }
    if (xl) h += '<div class="btns" style="margin-top:10px"><input type="text" id="gc" placeholder="Thêm ghi chú…" style="flex:1"><button class="btn o sm" data-hd="ghi_chu">Ghi chú</button></div>';
    h += '<h2 style="margin-top:12px">Lịch sử xử lý</h2><ul class="timeline">' + d.xu_ly.slice().reverse().map(x => '<li><div class="when">' + ngayVN(x.tg) + ' · ' + esc(x.nguoi) + '</div><div class="what">' + esc(x.hd) + '</div>' + (x.nd ? '<div class="note">' + esc(x.nd) + '</div>' : '') + '</li>').join('') + '</ul>' +
      (d.lich_su.length ? '<p class="note">Đơn / phiếu khác của giảng viên này: ' + d.lich_su.map(x => x.qr + ' ' + x.id + ' (' + x.trang_thai + ')').join(' · ') + '</p>' : '') +
      '<div class="modal-foot"><button class="btn o" data-dong>Đóng</button></div>';
    moHop(h);
    const body = $('modal-body');
    body.querySelectorAll('[data-nav]').forEach(b => { b.onclick = () => { if (b.dataset.nav) hop(b.dataset.nav, dsId); }; });
    $('b-in-gv').onclick = (e) => chay(e.target, async () => { await danhMuc().catch(() => null); window.PTN_DON_QR.xemTruoc(d, await anhQR(d)); });
    body.querySelectorAll('[data-hd]').forEach(b => { b.onclick = async (e) => {
      const hd = b.dataset.hd, x = { id, hd }, gt = (k) => { const el = body.querySelector('[name=' + k + ']'); return el ? el.value.trim() : undefined; };
      ['y_kien', 'ket_qua', 'huong_xu_ly', 'huong_khac', 'nguoi_sua'].forEach(k => { const v = gt(k); if (v !== undefined) x[k] = v; });
      if (hd === 'tu_choi') { x.ly_do = gt('ly_do'); if (!x.ly_do) return toast('Nhập lý do từ chối', true); }
      if (hd === 'ghi_chu') { x.ghi_chu = $('gc').value.trim(); if (!x.ghi_chu) return toast('Nhập ghi chú', true); }
      if (hd === 'hoan_tat' && !confirm(bg ? 'Xác nhận đã bàn giao thiết bị cho giảng viên ' + d.ho_ten + '?' : 'Đánh dấu phiếu ' + id + ' đã hoàn tất?')) return;
      await chay(e.target, () => api('gv_xu_ly', x)); toast('Đã ghi: ' + b.textContent);
      if (hd === 'ghi_chu' || hd === 'cap_nhat') hop(id, dsId); else { dongHop(); dieuHuong(); }
    }; });
  }

  // ---------------- Cán bộ lập phiếu thay giảng viên ----------------
  async function manLap(qr) {
    qr = G.LOAI[qr] && !G.LOAI[qr].ngung ? qr : 'GV-BH';
    const tabs = Object.keys(G.LOAI).filter(k => !G.LOAI[k].ngung).map(k => '<a class="btn sm ' + (k === qr ? 'chon' : 'o') + '" href="#/giang-vien/lap/' + k + '" title="' + esc(G.LOAI[k].ten) + '">' + k + '</a>').join('');
    const nd = trang('Lập phiếu – ' + esc(G.LOAI[qr].ten), '<a class="btn o sm" href="#/giang-vien">‹ Danh sách phiếu</a>', '<span class="btns">' + tabs + '</span>');
    const dm = await danhMuc();
    nd.innerHTML = '<div class="card"><p class="note">' + esc(G.LOAI[qr].mo_ta) + '. Cán bộ lập thay giảng viên: nhập thông tin giảng viên, nội dung và thiết bị → Lưu → in / tải Word.</p><div id="pg"></div>' +
      '<div class="err" id="err"></div><div class="btns"><button class="btn" id="b-luu">Lưu phiếu</button><a class="btn o" href="#/giang-vien">Hủy</a></div></div>';
    G.ve($('pg'), qr, { dm, nguoi: 1, thuMuc: '../bieu-mau/' });
    $('b-luu').onclick = async (e) => {
      const x = G.doc($('pg'), qr, { nguoi: 1 });
      if (x.loi) { $('err').textContent = x.loi; return; }
      $('err').textContent = '';
      const r = await chay(e.target, () => api('gv_tao', { qr, ng: x.ng, d: x.d }));
      if (!r) return;
      toast('Đã lưu phiếu ' + r.id); location.hash = '#/giang-vien/' + encodeURIComponent(r.id);
    };
  }

  Object.assign(Q.TUYEN, { 'giang-vien': manGiangVien });
})();
