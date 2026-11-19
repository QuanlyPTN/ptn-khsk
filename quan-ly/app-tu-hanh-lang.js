/* Trang quản lý – "Tủ sắt hành lang" (#/tu-hl[/mã khu]): khu tủ ngoài phòng thí nghiệm (HL F4 – F7, HL T3…), sơ đồ tủ từng khu, thêm khu / thêm tủ,
   giao – trả – báo hỏng tủ (hộp tủ dùng chung với trang phòng), tủ nhóm đề tài đang giữ chỗ kèm hồ sơ QR7, in mã QR từng khu (quét → QR6 chọn sẵn khu),
   giới hạn đăng ký (admin). Máy chủ: apps-script/26_TuHanhLang.gs; tủ của khu nằm trong bảng TU (phong = mã khu). */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, laAdmin, coQuyen, dieuHuong, napQR, trangCongKhai } = Q;
  const tenNgan = (ma) => String(ma).replace(/^HL-/, 'HL ');

  async function manTuHL(p) {
    const xl = coQuyen('phong', 'xu_ly');
    const nd = trang('Tủ sắt hành lang', (xl ? '<button class="btn sm" id="hl-them">+ Thêm khu tủ</button>' : '') + '<button class="btn o sm" id="hl-qr">🖨 In mã QR các khu</button>' +
      (laAdmin() ? '<button class="btn o sm" id="hl-gh">Giới hạn đăng ký</button>' : ''), '<a href="#/phong">Phòng thí nghiệm</a> ›');
    const r = await api('khu_tu_ds'), hn = r.hom_nay, cd = r.cho_duyet || [];
    const dem = (k, f) => k.tu.filter(f).length;
    nd.innerHTML = '<p class="note">Sinh viên, giảng viên đăng ký tủ qua <b>QR6</b> (chọn khu tủ hành lang) – sinh viên phải gắn hồ sơ đề tài <b>QR7</b> đang thực hiện (gia hạn đề tài thì hạn tủ theo; đóng hồ sơ phải thu tủ trước). ' +
      'Giới hạn: <b>' + (r.gioi_han.nguoi || 'không giới hạn') + '</b> tủ / người, <b>' + (r.gioi_han.nhom || 'không giới hạn') + '</b> tủ / nhóm đề tài.</p>' +
      '<div class="hl-chon">' + r.khu.map(k => '<a href="#/tu-hl/' + esc(k.ma) + '" class="btn o sm' + (p[1] === k.ma ? ' on' : '') + '">' + esc(tenNgan(k.ma)) + ' <span class="note">' + dem(k, t => t.trang_thai === 'Trống') + '/' + k.tu.length + '</span></a>').join('') + '</div>' +
      (r.khu.length ? '' : '<div class="card empty">Chưa có khu tủ nào.</div>') +
      r.khu.filter(k => !p[1] || p[1] === k.ma).map(k => {
        const qh = dem(k, t => t.trang_thai === 'Đang dùng' && t.han && t.han < hn);
        return '<div class="card" id="khu-' + esc(k.ma) + '"><div class="btns" style="justify-content:space-between;align-items:flex-start"><div><h2 style="margin:0">' + esc(k.ten) + ' <span class="note">(' + esc(tenNgan(k.ma)) + ')</span></h2>' +
          '<div class="note">' + esc([k.vi_tri, k.ghi_chu].filter(Boolean).join(' · ')) + '</div><div class="note">' + k.tu.length + ' tủ · ' + dem(k, t => t.trang_thai === 'Trống') + ' trống · ' + dem(k, t => t.trang_thai === 'Đang dùng') + ' đang dùng' +
          (dem(k, t => t.trang_thai === 'Hỏng') ? ' · ' + dem(k, t => t.trang_thai === 'Hỏng') + ' hỏng' : '') + (qh ? ' · <b style="color:var(--bad)">' + qh + ' quá hạn trả</b>' : '') + '</div></div>' +
          '<div class="btns">' + (xl ? '<button class="btn o sm" data-them-tu="' + esc(k.ma) + '">+ Thêm tủ</button><button class="btn o sm" data-sua-khu="' + esc(k.ma) + '">Sửa khu</button>' : '') +
          '<button class="btn o sm" data-qr-khu="' + esc(k.ma) + '">QR</button></div></div>' +
          (k.tu.length ? '<div class="lockers">' + k.tu.map(t => { const g = cd.find(x => x.phong === t.phong && x.so === t.so);
            return '<div class="locker ' + (t.trang_thai === 'Đang dùng' ? 'dung' : t.trang_thai === 'Hỏng' ? 'hong' : g ? 'giu' : '') + (t.trang_thai === 'Đang dùng' && t.han && t.han < hn ? ' qh' : '') + '" data-khu="' + esc(k.ma) + '" data-so="' + esc(t.so) + '" title="' +
              esc(t.trang_thai + (t.nguoi ? ' – ' + t.nguoi : '') + (t.han ? ' – hạn ' + ngayVN(t.han) : '') + (g && t.trang_thai === 'Trống' ? ' – đơn ' + g.don + ' chờ duyệt' + (g.hs ? ' (hồ sơ ' + g.hs + ')' : '') : '') + (t.hs ? ' – hồ sơ ' + t.hs : '')) + '"><b>' + esc(t.so) + '</b><small>' +
              esc(t.trang_thai === 'Đang dùng' ? t.nguoi : g && t.trang_thai === 'Trống' ? 'Chờ duyệt ' + g.don : t.trang_thai) + '</small></div>'; }).join('') + '</div>'
            : '<div class="note" style="margin-top:8px">Khu chưa có tủ' + (xl ? ' – bấm "+ Thêm tủ".' : '.') + '</div>') + '</div>';
      }).join('') +
      '<div class="legend"><span><i></i>Trống</span><span><i style="background:var(--warn-bg,#FFF4D6)"></i>Có đơn QR6 chờ duyệt</span><span><i style="background:var(--info-bg)"></i>Đang dùng</span><span><i style="background:var(--bad-bg)"></i>Hỏng</span>' +
      '<span><i style="outline:2px solid var(--warn)"></i>Quá hạn trả</span><span>Bấm vào tủ để giao / trả / báo hỏng</span></div>';
    const khu = (ma) => r.khu.find(k => k.ma === ma);
    nd.querySelectorAll('.locker').forEach(el => { el.onclick = () => Q.hopTu(khu(el.dataset.khu).tu.find(t => t.so === el.dataset.so)); });
    nd.querySelectorAll('[data-them-tu]').forEach(b => { b.onclick = async (e) => { const k = khu(b.dataset.themTu);
      const n = prompt('Thêm bao nhiêu tủ cho ' + k.ten + '? (đang có ' + k.tu.length + ' tủ; tủ mới đánh số tiếp theo)', '1'); if (!n) return;
      const x = await chay(e.target, () => api('tu_them', { phong: k.ma, so_luong: n })); toast('Đã thêm tủ ' + x.them.join(', ') + ' – khu có ' + x.tong + ' tủ'); dieuHuong(); }; });
    nd.querySelectorAll('[data-sua-khu]').forEach(b => { b.onclick = () => hopKhu(khu(b.dataset.suaKhu)); });
    nd.querySelectorAll('[data-qr-khu]').forEach(b => { b.onclick = (e) => chay(e.target, () => inQR([khu(b.dataset.qrKhu)], r.gioi_han)); });
    if ($('hl-them')) $('hl-them').onclick = () => hopKhu(null);
    $('hl-qr').onclick = (e) => chay(e.target, () => inQR(r.khu, r.gioi_han));
    if ($('hl-gh')) $('hl-gh').onclick = () => {
      moHop('<h2>Giới hạn đăng ký tủ sắt hành lang</h2><form id="f" class="form-grid">' + o('nguoi', 'Số tủ tối đa / người (0 = không giới hạn)', { type: 'number', v: r.gioi_han.nguoi }) +
        o('nhom', 'Số tủ tối đa / nhóm đề tài (0 = không giới hạn)', { type: 'number', v: r.gioi_han.nhom }) +
        '<p class="note full">Tính cả tủ đang dùng, đơn QR6 đang chờ / đã duyệt và tủ nhóm đăng ký kèm hồ sơ QR7. Chỉ áp dụng cho tủ hành lang (tủ trong phòng giữ như cũ).</p>' +
        '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); await chay(e.submitter, () => api('khu_tu_gh', giaTri(e.target))); dongHop(); toast('Đã lưu giới hạn'); dieuHuong(); };
    };
    if (p[1] && $('khu-' + p[1])) $('khu-' + p[1]).scrollIntoView({ block: 'start' });
  }

  function hopKhu(k) {
    const moi = !k; k = k || {};
    moHop('<h2>' + (moi ? 'Thêm khu tủ sắt hành lang' : 'Sửa ' + esc(k.ten)) + '</h2><form id="f"><div class="form-grid">' +
      o('ma', 'Mã khu (tòa + tầng)', { v: moi ? '' : tenNgan(k.ma), req: 1, ph: 'VD: HL F8', extra: moi ? '' : ' readonly', help: moi ? 'Ghi "HL" + tòa + tầng, VD HL F8, HL T4' : '' }) +
      (moi ? o('so_tu', 'Số tủ ban đầu', { type: 'number', v: 10, help: 'Đánh số 01, 02, …; thêm sau được' }) : '') +
      o('ten', 'Tên khu', { v: k.ten, full: 1, ph: 'Trống = "Tủ sắt hành lang <mã>"' }) + o('vi_tri', 'Vị trí', { v: k.vi_tri, full: 1, ph: 'VD: Hành lang tầng 4 – nhà F, cạnh thang máy' }) +
      o('ghi_chu', 'Ghi chú', { v: k.ghi_chu, full: 1 }) + '</div>' +
      '<div class="modal-foot">' + (!moi && laAdmin() ? '<button type="button" class="btn red o" id="b-xoa-khu" style="margin-right:auto">Xóa khu</button>' : '') +
      '<button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(e.target); if (!moi) v.ma = k.ma;
      const x = await chay(e.submitter, () => api('khu_tu_luu', { moi, khu: v, so_tu: v.so_tu }));
      dongHop(); toast('Đã lưu ' + x.ten); location.hash = '#/tu-hl/' + x.ma; dieuHuong();
    };
    if ($('b-xoa-khu')) $('b-xoa-khu').onclick = async (e) => {
      if (!confirm('Xóa ' + k.ten + ' cùng ' + k.tu.length + ' tủ? (chỉ xóa được khi mọi tủ đang trống)')) return;
      await chay(e.target, () => api('khu_tu_xoa', { ma: k.ma })); dongHop(); toast('Đã xóa khu ' + k.ma); location.hash = '#/tu-hl';
    };
  }

  // mã QR từng khu: quét → trang dùng chung, QR6 chọn sẵn khu; in A4 mỗi khu một ô để dán ở hành lang
  async function inQR(ds, gh) {
    const QR = await napQR(), goc = trangCongKhai();
    const o2 = ds.map(k => { const q = QR(0, 'M'); q.addData(goc + '#/QR6/' + k.ma); q.make();
      return '<div class="o"><div class="t">TỦ SẮT HÀNH LANG ' + esc(k.ma.slice(3)) + '</div><div class="v">' + esc(k.vi_tri || '') + '</div>' + q.createSvgTag({ cellSize: 5, margin: 2 }) +
        '<div class="h">Quét mã để đăng ký sử dụng tủ (QR6)</div><div class="n">' + (gh && gh.nguoi ? 'Mỗi người tối đa ' + gh.nguoi + ' tủ · ' : '') + 'trả tủ, chìa khóa đúng hạn</div></div>'; }).join('');
    const w = window.open('', '_blank'); if (!w) { toast('Trình duyệt chặn cửa sổ in – cho phép cửa sổ bật lên', true); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Mã QR tủ sắt hành lang</title><style>@page{size:A4;margin:12mm}body{font-family:"Times New Roman",serif;margin:0}' +
      '.g{display:grid;grid-template-columns:1fr 1fr;gap:10mm}.o{border:1.5px solid #000;border-radius:4mm;padding:6mm;text-align:center;break-inside:avoid}.t{font-size:22px;font-weight:bold}.v{font-size:14px;margin-bottom:3mm}' +
      '.o svg{width:55mm;height:55mm}.h{font-size:16px;font-weight:bold;margin-top:2mm}.n{font-size:12.5px}</style><div class="g">' + o2 + '</div>');
    w.document.close(); setTimeout(() => w.print(), 500);
  }

  Q.TUYEN['tu-hl'] = manTuHL;
})();
