/* Trang quản lý – "Lịch phòng thực hành": từ thời khóa biểu đã tải, xem phòng nào đang / sẽ học thực hành, môn nào, lớp – nhóm, giảng viên, tiết (giờ).
   Theo ngày (sáng / chiều / tối, "đang học lúc này") và theo tuần (thứ 2 – CN). Dùng chung cho trang Hôm nay: PTN_LICH_TH.dangHoc().
   Máy chủ: lich_phong_th (06_HoaChat.gs), giờ các tiết sửa được (admin). */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { S, $, api, chay, trang, moHop, dongHop, o, esc, toast, ngayVN, homNay, boDau, laAdmin, dieuHuong } = Q;
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const ngayCua = (s) => { const a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); };
  const congNgay = (s, n) => { const d = ngayCua(s); d.setDate(d.getDate() + n); return iso(d); };
  const thuCua = (s) => { const g = ngayCua(s).getDay(); return g === 0 ? 8 : g + 1; }; // T2 = 2 … T7 = 7, CN = 8
  const TEN_THU = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };
  // "F6.03(Sinh học đại cương), F1.08" → ["F6.03", "F1.08"]; D09.01 ≡ D9.01
  const chuanPhong = (x) => String(x || '').replace(/\(.*?\)/g, '').trim().toUpperCase().replace(/^([A-Z]+)0+(\d)/, '$1$2');
  const dsPhong = (l) => String(l.phong || '').replace(/\(.*?\)/g, '').split(/[,;]/).map(chuanPhong).filter(Boolean);
  const thuLop = (l) => { const t = String(l.thu || '').trim(); return /^cn$/i.test(t) ? 8 : parseInt(t, 10) || 0; };
  const tietLop = (l) => { const m = /(\d+)\D+(\d+)/.exec(String(l.tiet || '')) || /(\d+)/.exec(String(l.tiet || '')); return m ? [+m[1], +(m[2] || m[1])] : [0, 0]; };
  const buoi = (a) => a <= 6 ? 'Sáng' : a <= 12 ? 'Chiều' : 'Tối';
  const gioTiet = (g, t) => String(g[t] || '').split('-');
  const gio = (g, l) => { const [a, b] = tietLop(l); return a ? [gioTiet(g, a)[0], gioTiet(g, b)[1]] : ['', '']; };
  // các buổi học của một ngày: [{l, phong, a, b, bd, kt}]
  function buoiTrongNgay(lop, ngay, g) {
    const th = thuCua(ngay), out = [];
    lop.filter(l => thuLop(l) === th && (!l.bat_dau || l.bat_dau <= ngay) && (!l.ket_thuc || l.ket_thuc >= ngay)).forEach(l => {
      const [a, b] = tietLop(l), [bd, kt] = gio(g, l);
      (dsPhong(l).length ? dsPhong(l) : ['(chưa có phòng)']).forEach(p => out.push({ l, phong: p, a, b, bd, kt }));
    });
    return out.sort((x, y) => x.phong.localeCompare(y.phong) || x.a - y.a);
  }
  const bayGioHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dangDien = (x, ngay) => ngay === homNay() && x.bd && x.kt && x.bd <= bayGioHM() && bayGioHM() < x.kt;
  const theBuoi = (x, ngay, ngan) => '<div class="lpt-buoi' + (dangDien(x, ngay) ? ' dang' : '') + '" data-lop="' + esc(x.l.id) + '" title="Bấm xem chi tiết">' +
    '<b>Tiết ' + x.a + (x.b !== x.a ? '–' + x.b : '') + '</b>' + (x.bd ? ' <span class="note">' + esc(x.bd + '–' + x.kt) + '</span>' : '') + (dangDien(x, ngay) ? ' <span class="tag t-ok">đang học</span>' : '') +
    '<div>' + esc(x.l.ten_mon) + '</div>' + (ngan ? '' : '<div class="note">' + esc([x.l.lop, x.l.nhom && 'nhóm ' + x.l.nhom].filter(Boolean).join(' · ')) + '</div>') +
    '<div class="note">' + esc(x.l.gv || '') + '</div></div>';

  async function manLichPhongTH(p) {
    const q = new URLSearchParams((location.hash.split('?')[1] || '')), ngay = /^\d{4}-\d{2}-\d{2}$/.test(q.get('ngay') || '') ? q.get('ngay') : homNay(), che = q.get('xem') === 'tuan' ? 'tuan' : 'ngay';
    const tu = che === 'tuan' ? congNgay(ngay, 2 - thuCua(ngay)) /* thứ 2 đầu tuần (CN = 8 → lùi 6 ngày) */ : ngay, den = che === 'tuan' ? congNgay(tu, 6) : ngay;
    const nd = trang('Lịch phòng thực hành', laAdmin() ? '<button class="btn o sm" id="b-gio-tiet">Giờ các tiết</button>' : '');
    const r = await api('lich_phong_th', { tu, den }), g = r.gio_tiet, khoa = r.phong.map(x => chuanPhong(x.ma)), tenKhoa = {}; r.phong.forEach(x => { tenKhoa[chuanPhong(x.ma)] = x.ten; });
    const dieuKhien = '<div class="tools"><input type="date" id="lpt-ngay" value="' + ngay + '"><button class="btn o sm" data-lui="-1">‹ ' + (che === 'tuan' ? 'Tuần trước' : 'Hôm trước') + '</button><button class="btn o sm" data-lui="0">Hôm nay</button><button class="btn o sm" data-lui="1">' + (che === 'tuan' ? 'Tuần sau' : 'Hôm sau') + ' ›</button>' +
      '<select id="lpt-xem"><option value="ngay"' + (che === 'ngay' ? ' selected' : '') + '>Theo ngày</option><option value="tuan"' + (che === 'tuan' ? ' selected' : '') + '>Theo tuần</option></select>' +
      '<select id="lpt-phong"><option value="">Mọi phòng có lịch</option><option value="khoa">Chỉ phòng thí nghiệm của Khoa</option></select><input type="search" id="lpt-q" placeholder="Tìm môn, GV, lớp, phòng…"></div><div id="lpt-kq"></div>' +
      '<p class="note">Theo các file thời khóa biểu đã tải (Hóa chất – vật tư › Học kỳ & thời khóa biểu). Giờ quy đổi theo bảng giờ các tiết' + (laAdmin() ? ' (sửa ở nút "Giờ các tiết")' : '') + '. Bấm vào buổi học để xem chi tiết.</p>';
    nd.innerHTML = dieuKhien;
    const ve = () => {
      const loc = $('lpt-phong').value, tk = boDau($('lpt-q').value);
      const hop = (x) => (!loc || khoa.indexOf(x.phong) >= 0) && (!tk || boDau([x.phong, x.l.ten_mon, x.l.gv, x.l.lop, x.l.ma_lhp].join(' ')).indexOf(tk) >= 0);
      if (che === 'ngay') {
        const b = buoiTrongNgay(r.lop, ngay, g).filter(hop), phong = [...new Set((loc === 'khoa' || !tk ? khoa : []).concat(b.map(x => x.phong)))].filter(x => !loc || khoa.indexOf(x) >= 0).sort();
        const dang = b.filter(x => dangDien(x, ngay));
        $('lpt-kq').innerHTML = '<h2>' + TEN_THU[thuCua(ngay)] + ', ' + ngayVN(ngay) + (ngay === homNay() ? ' · bây giờ ' + bayGioHM() : '') + '</h2>' +
          '<p class="note"><b>' + new Set(b.map(x => x.phong)).size + '</b> phòng có lịch · <b>' + b.length + '</b> buổi học' + (ngay === homNay() ? ' · <b style="color:var(--ok)">' + new Set(dang.map(x => x.phong)).size + '</b> phòng đang học lúc này' : '') + '</p>' +
          (!phong.length ? '<div class="card empty">Không có buổi thực hành nào.</div>' : '<div class="tbl-wrap"><table class="lpt"><thead><tr><th>Phòng</th><th>Lúc này</th><th>Sáng (tiết 1–6)</th><th>Chiều (tiết 7–12)</th><th>Tối (tiết 13–16)</th></tr></thead><tbody>' +
            phong.map(ph => { const c = b.filter(x => x.phong === ph), d = c.filter(x => dangDien(x, ngay));
              return '<tr><td><b>' + esc(ph) + '</b>' + (tenKhoa[ph] ? '<div class="note">' + esc(tenKhoa[ph]) + '</div><span class="tag t-info">PTN Khoa</span>' : '') + '</td><td>' +
                (ngay !== homNay() ? '<span class="note">—</span>' : d.length ? '<span class="tag t-ok">Đang học</span>' : '<span class="tag t-gray">Trống</span>') + '</td>' +
                ['Sáng', 'Chiều', 'Tối'].map(bu => '<td>' + c.filter(x => buoi(x.a) === bu).map(x => theBuoi(x, ngay)).join('') + '</td>').join('') + '</tr>'; }).join('') + '</tbody></table></div>');
      } else {
        const ngayTuan = Array.from({ length: 7 }, (_, i) => congNgay(tu, i)), theoNgay = {}; ngayTuan.forEach(n => { theoNgay[n] = buoiTrongNgay(r.lop, n, g).filter(hop); });
        const phong = [...new Set((loc === 'khoa' ? khoa : []).concat(...ngayTuan.map(n => theoNgay[n].map(x => x.phong))))].sort();
        $('lpt-kq').innerHTML = '<h2>Tuần ' + ngayVN(tu) + ' – ' + ngayVN(den) + '</h2>' + (!phong.length ? '<div class="card empty">Không có buổi thực hành nào trong tuần.</div>' :
          '<div class="tbl-wrap"><table class="lpt tuan"><thead><tr><th>Phòng</th>' + ngayTuan.map(n => '<th' + (n === homNay() ? ' class="hn"' : '') + '>' + TEN_THU[thuCua(n)] + '<div class="note">' + ngayVN(n).slice(0, 5) + '</div></th>').join('') + '</tr></thead><tbody>' +
          phong.map(ph => '<tr><td><b>' + esc(ph) + '</b>' + (tenKhoa[ph] ? '<div class="note">PTN Khoa</div>' : '') + '</td>' + ngayTuan.map(n => '<td' + (n === homNay() ? ' class="hn"' : '') + '>' + theoNgay[n].filter(x => x.phong === ph).map(x => theBuoi(x, n, 1)).join('') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
      }
      $('lpt-kq').querySelectorAll('[data-lop]').forEach(el => { el.onclick = () => chiTiet(r.lop.find(l => l.id === el.dataset.lop), g); });
    };
    const di = (n, x) => { location.hash = '#/lich-phong-th?ngay=' + n + '&xem=' + (x || che); };
    $('lpt-ngay').onchange = (e) => di(e.target.value);
    $('lpt-xem').onchange = (e) => di(ngay, e.target.value);
    nd.querySelectorAll('[data-lui]').forEach(bt => { bt.onclick = () => { const k = +bt.dataset.lui; di(k ? congNgay(ngay, k * (che === 'tuan' ? 7 : 1)) : homNay()); }; });
    ['lpt-phong', 'lpt-q'].forEach(id => { $(id).oninput = ve; $(id).onchange = ve; });
    if ($('b-gio-tiet')) $('b-gio-tiet').onclick = () => suaGioTiet(g);
    ve();
  }
  function chiTiet(l, g) {
    if (!l) return;
    const [a, b] = tietLop(l), [bd, kt] = gio(g, l);
    moHop('<h2>' + esc(l.ten_mon) + '</h2><dl class="kv">' + [['Môn định mức', l.ten_mon_dm], ['Mã LHP', l.ma_lhp], ['Lớp', l.lop], ['Nhóm', l.nhom], ['Sĩ số', l.si_so], ['Giảng viên', l.gv], ['Phòng', l.phong],
      ['Lịch', (TEN_THU[thuLop(l)] || '') + (a ? ', tiết ' + a + (b !== a ? '–' + b : '') + (bd ? ' (' + bd + '–' + kt + ')' : '') : '')], ['Thời gian học', [ngayVN(l.bat_dau), ngayVN(l.ket_thuc)].filter(Boolean).join(' → ')],
      ['Học kỳ', l.hk], ['File thời khóa biểu', l.tep]].filter(x => x[1]).map(x => '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>').join('') + '</dl>' +
      '<div class="modal-foot">' + (l.mon ? '<a class="btn o" href="#/hoa-chat/mon/' + esc(l.mon) + '" data-dong>Định mức của môn</a>' : '') + '<button class="btn o" data-dong>Đóng</button></div>');
  }
  function suaGioTiet(g) {
    moHop('<h2>Giờ các tiết</h2><p class="note">Dùng để đổi tiết trong thời khóa biểu ra giờ (và biết phòng "đang học lúc này"). Dạng 06:30-07:20.</p><form id="f"><div class="form-grid" style="grid-template-columns:repeat(4,1fr)">' +
      Array.from({ length: 16 }, (_, i) => o('t' + (i + 1), 'Tiết ' + (i + 1), { v: g[i + 1] || '' })).join('') + '</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => { e.preventDefault(); const gio = {}; for (let i = 1; i <= 16; i++) gio[i] = e.target.querySelector('[name=t' + i + ']').value.trim();
      await chay(e.submitter, () => api('gio_tiet_luu', { gio })); dongHop(); toast('Đã lưu giờ các tiết'); dieuHuong(); };
  }
  // trang Hôm nay: các phòng đang học thực hành lúc này / còn buổi trong ngày
  async function dangHoc() {
    const n = homNay(), r = await api('lich_phong_th', { tu: n, den: n }), b = buoiTrongNgay(r.lop, n, r.gio_tiet);
    return { tat: b, dang: b.filter(x => dangDien(x, n)), sap: b.filter(x => x.bd && x.bd > bayGioHM()) };
  }
  window.PTN_LICH_TH = { buoiTrongNgay, dangHoc, theBuoi: (x) => theBuoi(x, homNay()) };
  Object.assign(Q.TUYEN, { 'lich-phong-th': manLichPhongTH });
})();
