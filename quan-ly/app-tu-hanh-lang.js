/* Trang quản lý – "Tủ sắt hành lang" (#/tu-hl[/mã khu]): khu (HL F4 – F7, HL T3…) → tủ sắt (Tủ 1, Tủ 2…) → ô (01, 02…, mỗi tủ đánh lại từ 01).
   Sơ đồ ô từng tủ, thêm khu / tủ sắt / ô, ghi chú tủ, giao – trả – báo hỏng ô (hộp tủ dùng chung với trang phòng), ô có đơn QR6 chờ duyệt,
   giới hạn đăng ký (admin). Máy chủ: apps-script/26_TuHanhLang.gs; mỗi ô là một dòng bảng TU (phong = mã tủ sắt HL-F4-1). */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, laAdmin, coQuyen, dieuHuong } = Q;
  const tenNgan = (ma) => String(ma).replace(/^HL-/, 'HL ');
  const tenTu = (ma) => String(ma).replace(/^HL-(.+)-(\d+)$/, 'HL $1 – Tủ $2');
  // khu đang bung (nhớ trên máy này): mặc định thu gọn hết, mở theo liên kết #/tu-hl/<mã khu>
  const KHOA_MO = 'hl_mo|' + location.pathname;
  const dsMo = () => { try { return JSON.parse(localStorage.getItem(KHOA_MO) || '[]'); } catch (e) { return []; } };
  const luuMo = (l) => { try { localStorage.setItem(KHOA_MO, JSON.stringify(l)); } catch (e) { /* trình duyệt chặn lưu */ } };

  async function manTuHL(p) {
    const xl = coQuyen('phong', 'xu_ly');
    const nd = trang('Tủ sắt hành lang', (xl ? '<button class="btn sm" id="hl-them">+ Thêm khu tủ</button>' : '') + (laAdmin() ? '<button class="btn o sm" id="hl-gh">Giới hạn đăng ký</button>' : ''), '<a href="#/phong">Phòng thí nghiệm</a> ›');
    const r = await api('khu_tu_ds'), hn = r.hom_nay, cd = r.cho_duyet || [];
    const oCua = (k) => [].concat(...k.tu_sat.map(t => t.o)), dem = (ds, f) => ds.filter(f).length;
    const oHtml = (t) => { const g = cd.find(x => x.phong === t.phong && x.so === t.so);
      return '<div class="locker ' + (t.trang_thai === 'Đang dùng' ? 'dung' : t.trang_thai === 'Hỏng' ? 'hong' : g ? 'giu' : '') + (t.trang_thai === 'Đang dùng' && t.han && t.han < hn ? ' qh' : '') + '" data-tu="' + esc(t.phong) + '" data-so="' + esc(t.so) + '" title="' +
        esc(t.trang_thai + (t.nguoi ? ' – ' + t.nguoi : '') + (t.han ? ' – hạn ' + ngayVN(t.han) : '') + (g && t.trang_thai === 'Trống' ? ' – đơn ' + g.don + ' chờ duyệt' + (g.hs ? ' (hồ sơ ' + g.hs + ')' : '') : '') + (t.hs ? ' – hồ sơ ' + t.hs : '')) + '"><b>' + esc(t.so) + '</b><small>' +
        esc(t.trang_thai === 'Đang dùng' ? t.nguoi : g && t.trang_thai === 'Trống' ? 'Chờ duyệt ' + g.don : t.trang_thai) + '</small></div>'; };
    const oTu = (t) => { const lon = t.o.reduce((a, x) => Math.max(a, parseInt(x.so, 10) || 0), 0), h = [];
      for (let i = 1; i <= lon; i++) { const so = String(i).padStart(2, '0'), x = t.o.find(y => y.so === so);
        h.push(x ? oHtml(x) : xl ? '<div class="locker mat" data-them-lai="' + esc(t.ma) + '|' + so + '" title="Ô ' + so + ' đã xóa – bấm để thêm lại"><b>＋' + so + '</b><small>Đã xóa</small></div>' : ''); }
      return h.join(''); };
    const mo = p[1] ? [...new Set(dsMo().concat([p[1]]))] : dsMo();
    nd.innerHTML = '<p class="note">Mỗi khu có nhiều tủ sắt, mỗi tủ chia ô (đánh số lại từ 01). Sinh viên, giảng viên mượn từng ô qua <b>QR6</b> – sinh viên phải gắn hồ sơ đề tài <b>QR7</b> đang thực hiện (gia hạn đề tài thì hạn ô theo; đóng hồ sơ phải thu ô trước). ' +
      'Giới hạn: <b>' + (r.gioi_han.nguoi || 'không giới hạn') + '</b> ô / người, <b>' + (r.gioi_han.nhom || 'không giới hạn') + '</b> ô / nhóm đề tài.</p>' +
      '<div class="btns" style="margin:0 0 8px"><button class="btn o sm" id="hl-bung">▾ Bung tất cả</button><button class="btn o sm" id="hl-gon">▸ Thu gọn tất cả</button></div>' +
      '<div class="hl-chon">' + r.khu.map(k => '<a href="#/tu-hl/' + esc(k.ma) + '" class="btn o sm' + (p[1] === k.ma ? ' on' : '') + '" title="Bung và đi tới khu này">' + esc(tenNgan(k.ma)) + ' <span class="note">' + k.tu_sat.length + ' tủ · ' + dem(oCua(k), t => t.trang_thai === 'Trống') + '/' + oCua(k).length + ' ô trống</span></a>').join('') + '</div>' +
      (r.khu.length ? '' : '<div class="card empty">Chưa có khu tủ nào.</div>') +
      r.khu.map(k => {
        const ds = oCua(k), qh = dem(ds, t => t.trang_thai === 'Đang dùng' && t.han && t.han < hn);
        return '<details class="card hl-khu" id="khu-' + esc(k.ma) + '" data-khu="' + esc(k.ma) + '"' + (mo.indexOf(k.ma) >= 0 ? ' open' : '') + '><summary><h2 style="margin:0">' + esc(k.ten) + ' <span class="note">(' + esc(tenNgan(k.ma)) + ')</span></h2>' +
          '<div class="note">' + esc([k.vi_tri, k.ghi_chu].filter(Boolean).join(' · ')) + '</div><div class="note">' + k.tu_sat.length + ' tủ sắt · ' + ds.length + ' ô · ' + dem(ds, t => t.trang_thai === 'Trống') + ' trống · ' + dem(ds, t => t.trang_thai === 'Đang dùng') + ' đang dùng' +
          (dem(ds, t => t.trang_thai === 'Hỏng') ? ' · ' + dem(ds, t => t.trang_thai === 'Hỏng') + ' hỏng' : '') + (qh ? ' · <b style="color:var(--bad)">' + qh + ' quá hạn trả</b>' : '') + '</div></summary>' +
          '<div class="btns" style="margin-top:8px">' + (xl ? '<button class="btn o sm" data-them-tu-sat="' + esc(k.ma) + '">+ Thêm tủ sắt</button><button class="btn o sm" data-sua-khu="' + esc(k.ma) + '">Sửa khu</button>' : '') + '<button class="btn o sm" data-ls-khu="' + esc(k.ma) + '">🕘 Lịch sử mượn cả khu</button></div>' +
          (k.tu_sat.length ? k.tu_sat.map(t => '<div class="hl-tu"><div class="btns" style="justify-content:space-between"><b>Tủ ' + t.so + '</b>' + (t.ghi_chu ? ' <span class="hl-gc">' + esc(t.ghi_chu) + '</span>' : '') + ' <span class="note">' + t.o.length + ' ô · ' + dem(t.o, x => x.trang_thai === 'Trống') + ' trống</span>' +
            '<span class="btns" style="margin-left:auto"><button class="btn o sm" data-ls-tu="' + esc(t.ma) + '">🕘 Lịch sử</button></span>' + (xl ? '<span class="btns"><button class="btn o sm" data-gc-tu="' + esc(t.ma) + '">✎ Ghi chú</button><button class="btn o sm" data-them-o="' + esc(t.ma) + '">+ Thêm ô</button><button class="btn o sm red" data-xoa-tu="' + esc(t.ma) + '">Xóa tủ</button></span>' : '') + '</div>' +
            '<div class="lockers">' + oTu(t) + '</div></div>').join('')
            : '<div class="note" style="margin-top:8px">Khu chưa có tủ sắt' + (xl ? ' – bấm "+ Thêm tủ sắt".' : '.') + '</div>') + '</details>';
      }).join('') +
      '<div class="legend"><span><i></i>Trống</span><span><i style="background:var(--warn-bg,#FFF4D6)"></i>Có đơn QR6 chờ duyệt</span><span><i style="background:var(--info-bg)"></i>Đang dùng</span><span><i style="background:var(--bad-bg)"></i>Hỏng</span>' +
      '<span><i style="outline:2px solid var(--warn)"></i>Quá hạn trả</span><span>Bấm vào ô để giao / trả / báo hỏng</span></div>';
    const khu = (ma) => r.khu.find(k => k.ma === ma), tuSat = (ma) => [].concat(...r.khu.map(k => k.tu_sat)).find(t => t.ma === ma);
    nd.querySelectorAll('.locker[data-tu]').forEach(el => { el.onclick = () => Q.hopTu(tuSat(el.dataset.tu).o.find(t => t.so === el.dataset.so)); });
    nd.querySelectorAll('[data-ls-tu]').forEach(b => { b.onclick = () => Q.hopLsTu({ phong: b.dataset.lsTu }, tenTu(b.dataset.lsTu)); });
    nd.querySelectorAll('[data-ls-khu]').forEach(b => { b.onclick = () => Q.hopLsTu({ khu: b.dataset.lsKhu }, 'tủ – ' + khu(b.dataset.lsKhu).ten); });
    nd.querySelectorAll('[data-them-lai]').forEach(el => { el.onclick = async () => { const [ma, so] = el.dataset.themLai.split('|');
      if (!confirm('Thêm lại ô ' + so + ' vào ' + tenTu(ma) + '?')) return;
      await chay(null, () => api('tu_them', { phong: ma, so_cu: so })); toast('Đã thêm lại ô ' + so + ' – ' + tenTu(ma)); dieuHuong(); }; });
    nd.querySelectorAll('[data-gc-tu]').forEach(b => { b.onclick = async (e) => { const t = tuSat(b.dataset.gcTu);
      const g = prompt('Ghi chú cho ' + tenTu(t.ma) + ' (VD: Nguyên liệu thực phẩm; để trống = xóa ghi chú):', t.ghi_chu || ''); if (g === null) return;
      await chay(e.target, () => api('khu_tu_ghi_chu', { ma: t.ma, ghi_chu: g })); toast(g.trim() ? 'Đã lưu ghi chú ' + tenTu(t.ma) : 'Đã xóa ghi chú'); dieuHuong(); }; });
    nd.querySelectorAll('details.hl-khu').forEach(d => { d.ontoggle = () => { const l = dsMo().filter(x => x !== d.dataset.khu); if (d.open) l.push(d.dataset.khu); luuMo(l); }; });
    $('hl-bung').onclick = () => { luuMo(r.khu.map(k => k.ma)); nd.querySelectorAll('details.hl-khu').forEach(d => { d.open = true; }); };
    $('hl-gon').onclick = () => { luuMo([]); nd.querySelectorAll('details.hl-khu').forEach(d => { d.open = false; }); };
    nd.querySelectorAll('[data-them-tu-sat]').forEach(b => { b.onclick = async (e) => { const k = khu(b.dataset.themTuSat);
      const n = prompt('Thêm tủ sắt mới (Tủ ' + (k.tu_sat.reduce((a, t) => Math.max(a, t.so), 0) + 1) + ') cho ' + k.ten + ' – tủ có bao nhiêu ô?', '12'); if (!n) return;
      const x = await chay(e.target, () => api('khu_tu_them_tu', { khu: k.ma, so_o: n })); toast('Đã thêm ' + tenTu(x.ma) + ' – ' + x.so_o + ' ô'); dieuHuong(); }; });
    nd.querySelectorAll('[data-them-o]').forEach(b => { b.onclick = async (e) => { const t = tuSat(b.dataset.themO);
      const n = prompt('Thêm bao nhiêu ô cho ' + tenTu(t.ma) + '? (đang có ' + t.o.length + ' ô; ô mới đánh số tiếp theo)', '1'); if (!n) return;
      const x = await chay(e.target, () => api('tu_them', { phong: t.ma, so_luong: n })); toast('Đã thêm ô ' + x.them.join(', ') + ' – ' + tenTu(t.ma) + ' có ' + x.tong + ' ô'); dieuHuong(); }; });
    nd.querySelectorAll('[data-xoa-tu]').forEach(b => { b.onclick = async (e) => { const t = tuSat(b.dataset.xoaTu);
      if (!confirm('Xóa ' + tenTu(t.ma) + ' cùng ' + t.o.length + ' ô? (chỉ xóa được khi mọi ô đang trống)')) return;
      await chay(e.target, () => api('khu_tu_xoa_tu', { ma: t.ma })); toast('Đã xóa ' + tenTu(t.ma)); dieuHuong(); }; });
    nd.querySelectorAll('[data-sua-khu]').forEach(b => { b.onclick = () => hopKhu(khu(b.dataset.suaKhu)); });
    if ($('hl-them')) $('hl-them').onclick = () => hopKhu(null);
    if ($('hl-gh')) $('hl-gh').onclick = () => {
      moHop('<h2>Giới hạn đăng ký tủ sắt hành lang</h2><form id="f" class="form-grid">' + o('nguoi', 'Số ô tối đa / người (0 = không giới hạn)', { type: 'number', v: r.gioi_han.nguoi }) +
        o('nhom', 'Số ô tối đa / nhóm đề tài (0 = không giới hạn)', { type: 'number', v: r.gioi_han.nhom }) +
        '<p class="note full">Tính cả ô đang dùng và đơn QR6 đang chờ / đã duyệt; nhóm tính theo hồ sơ đề tài gắn với đơn. Chỉ áp dụng cho tủ sắt hành lang (tủ trong phòng giữ như cũ).</p>' +
        '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); await chay(e.submitter, () => api('khu_tu_gh', giaTri(e.target))); dongHop(); toast('Đã lưu giới hạn'); dieuHuong(); };
    };
    if (p[1] && $('khu-' + p[1])) { $('khu-' + p[1]).open = true; $('khu-' + p[1]).scrollIntoView({ block: 'start' }); }
  }

  function hopKhu(k) {
    const moi = !k; k = k || {};
    moHop('<h2>' + (moi ? 'Thêm khu tủ sắt hành lang' : 'Sửa ' + esc(k.ten)) + '</h2><form id="f"><div class="form-grid">' +
      o('ma', 'Mã khu (tòa + tầng)', { v: moi ? '' : tenNgan(k.ma), req: 1, ph: 'VD: HL F8', help: moi ? 'Ghi "HL" + tòa + tầng, VD HL F8, HL T4' : 'Đổi mã: tủ sắt, ô, đơn QR6, ghi chú tủ chuyển theo mã mới' }) +
      (moi ? o('so_tu', 'Số tủ sắt', { type: 'number', v: 2, help: 'Tủ 1, Tủ 2, …; thêm sau được' }) + o('so_o', 'Số ô mỗi tủ', { type: 'number', v: 12, help: 'Ô 01, 02, … (mỗi tủ đánh lại từ 01)' }) : '') +
      o('ten', 'Tên khu', { v: k.ten, full: 1, ph: 'Trống = "Tủ sắt hành lang <mã>"' }) + o('vi_tri', 'Vị trí', { v: k.vi_tri, full: 1, ph: 'VD: Hành lang tầng 4 – nhà F, cạnh thang máy' }) +
      o('ghi_chu', 'Ghi chú', { v: k.ghi_chu, full: 1 }) + '</div>' +
      '<div class="modal-foot">' + (!moi && laAdmin() ? '<button type="button" class="btn red o" id="b-xoa-khu" style="margin-right:auto">Xóa khu</button>' : '') +
      '<button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(e.target), maMoi = v.ma; if (!moi) v.ma = k.ma;
      if (!moi && maMoi.replace(/\W/g, '').toUpperCase() !== k.ma.replace(/\W/g, '') && !confirm('Đổi mã khu ' + tenNgan(k.ma) + ' thành "' + maMoi + '"? Tủ sắt, ô, đơn QR6 của khu chuyển theo mã mới.')) return;
      const x = await chay(e.submitter, () => api('khu_tu_luu', { moi, khu: v, ma_moi: moi ? '' : maMoi, so_tu: v.so_tu, so_o: v.so_o }));
      dongHop(); toast('Đã lưu ' + x.ten); location.hash = '#/tu-hl/' + x.ma; dieuHuong();
    };
    if ($('b-xoa-khu')) $('b-xoa-khu').onclick = async (e) => {
      if (!confirm('Xóa ' + k.ten + ' cùng ' + k.tu_sat.length + ' tủ sắt? (chỉ xóa được khi mọi ô đang trống)')) return;
      await chay(e.target, () => api('khu_tu_xoa', { ma: k.ma })); dongHop(); toast('Đã xóa khu ' + k.ma); location.hash = '#/tu-hl';
    };
  }

  Q.TUYEN['tu-hl'] = manTuHL;
})();
