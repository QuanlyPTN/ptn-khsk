/* Trang quản lý – "Kiểm kê phòng" (#/kiem-ke-phong[/<mã phiếu>]): phiếu kiểm kê GV quản lý phòng gửi từ điện thoại (trang dùng chung › Đơn của tôi),
   PTN xem từng máy (Có, tốt / Hỏng / Không thấy + ghi chú), cập nhật tình trạng máy, "✓ Đã xử lý" (GV nhận tin), in phiếu có kết quả.
   Đợt kiểm kê (admin): mở – hạn nộp – đóng; báo mọi GV quản lý phòng đã đăng ký; theo dõi phòng đã / chưa nộp.
   Trang phòng: thẻ "Kiểm kê thiết bị" (PTN_QL.kkPhong) – in phiếu trống, các phiếu của phòng. Máy chủ: apps-script/22_BanGiaoTB.gs. */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, homNay, coQuyen, laAdmin, dieuHuong } = Q;
  const xl = () => coQuyen('tai-san', 'xu_ly');
  const KQ = { co: ['✓ Có, tốt', 't-ok'], hong: ['⚠ Hỏng', 't-warn'], khong: ['✕ Không thấy', 't-bad'] };
  const tagTT = (t) => '<span class="tag ' + (t === 'Đã xử lý' ? 't-ok' : 't-warn') + '">' + esc(t) + '</span>';
  const tomTat = (r) => r.so_tb + ' máy' + (+r.so_hong ? ' · <b style="color:#9A6200">' + r.so_hong + ' hỏng</b>' : '') + (+r.so_khong ? ' · <b style="color:#B42318">' + r.so_khong + ' không thấy</b>' : '');
  // in phiếu: trống (p = phòng + thiết bị) hoặc điền kết quả phiếu GV đã gửi
  const inPhieu = (p, kq) => window.PTN_IN.xemTruoc({ ten: 'Phieu kiem ke phong ' + p.ma + (kq ? ' ' + kq.id : ''), trang: [window.PTN_MAU.phieuKiemKePhong(p, kq)] });
  async function inPhieuPhong(ma, kq) {
    const r = await api('phong_ct', { ma });
    inPhieu({ ma, ten: r.phong.ten, phu_trach: r.phong.phu_trach, tb: r.thiet_bi.filter(t => t.tinh_trang !== 'Đã thanh lý') }, kq);
  }

  async function manKKPhong(p) {
    const nd = trang('Kiểm kê thiết bị phòng', '', '<a href="#/tai-san">Tài sản</a> ›');
    const D = await api('kkp_ds', {}), d = D.dot_mo, cho = D.ds.filter(r => r.trang_thai !== 'Đã xử lý');
    const nop = d ? D.phong.filter(x => x.nop).length : 0, canNop = d ? D.phong.filter(x => x.gv.some(g => g.ma_so) || x.so_tb).length : 0;
    nd.innerHTML = '<p class="note">GV quản lý phòng kiểm kê trên điện thoại (trang dùng chung › Đơn của tôi › Bàn giao TB › "Kiểm kê trên điện thoại") hoặc in phiếu ghi tay. ' +
      'Phiếu gửi về đây – PTN xem, cập nhật tình trạng máy, bấm <b>✓ Đã xử lý</b> (GV nhận tin).</p>' +
      '<div class="card"><div class="btns" style="justify-content:space-between;align-items:center"><h2 style="margin:0">' + (d ? 'Đợt đang mở: ' + esc(d.ten) + (d.han ? ' <span class="note">– hạn ' + ngayVN(d.han) + '</span>' : '') : 'Chưa mở đợt kiểm kê') + '</h2>' +
      (laAdmin() ? (d ? '<button class="btn o sm" id="kk-dong">Đóng đợt</button>' : '<button class="btn sm" id="kk-mo">+ Mở đợt kiểm kê</button>') : '') + '</div>' +
      (d ? '<p class="note">Đã nộp <b>' + nop + '</b> phòng. GV có dấu ⚠ chưa đăng ký trang dùng chung – không nhận thông báo, cần in phiếu giấy.</p><div class="tbl-wrap" style="max-height:50vh"><table><thead><tr><th>Phòng</th><th>GV quản lý phòng</th><th class="num">Số TB</th><th>Kết quả đợt này</th><th></th></tr></thead><tbody>' +
        D.phong.map(x => '<tr><td><b>' + esc(x.ma) + '</b><div class="note">' + esc(x.ten) + '</div></td><td>' + (x.gv.length ? x.gv.map(g => (g.ma_so ? '✓ ' : '⚠ ') + esc(g.ten)).join('<br>') : '<span class="note">Chưa ghi GV</span>') + '</td><td class="num">' + x.so_tb + '</td>' +
          '<td>' + (x.nop ? '<a href="#/kiem-ke-phong/' + esc(x.nop.id) + '">' + esc(x.nop.id) + '</a> ' + tagTT(x.nop.trang_thai) + (x.nop.so_hong || x.nop.so_khong ? '<div class="note">' + x.nop.so_hong + ' hỏng · ' + x.nop.so_khong + ' không thấy</div>' : '') : '<span class="tag t-gray">Chưa nộp</span>') + '</td>' +
          '<td><button class="btn o sm" data-in-trong="' + esc(x.ma) + '" title="In phiếu kiểm kê trống của phòng">🖨 Phiếu</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="note">Mở đợt (VD "Kiểm kê cuối năm 2026", có hạn nộp): mọi GV quản lý phòng đã đăng ký nhận thông báo; trang này theo dõi phòng đã / chưa nộp. GV vẫn gửi phiếu được khi không có đợt.</p>') + '</div>' +
      '<div class="card"><h2>Phiếu kiểm kê (' + D.ds.length + (cho.length ? ', <span style="color:#9A6200">' + cho.length + ' chờ xử lý</span>' : '') + ')</h2>' +
      (D.ds.length ? '<div class="tbl-wrap"><table><thead><tr><th>Phiếu</th><th>Phòng</th><th>GV kiểm kê</th><th>Gửi lúc</th><th>Kết quả</th><th>Trạng thái</th></tr></thead><tbody>' +
        D.ds.map(r => '<tr class="click" data-kk="' + esc(r.id) + '"><td class="mono"><b>' + esc(r.id) + '</b>' + (r.dot ? '<div class="note">' + esc((D.dot.find(x => x.id === r.dot) || {}).ten || r.dot) + '</div>' : '') + '</td><td>' + esc(r.phong) + '</td><td>' + esc(r.ho_ten) + '</td>' +
          '<td>' + ngayVN(r.tg) + '</td><td>' + tomTat(r) + (r.ngoai_ds ? '<div class="note">+ ngoài danh sách</div>' : '') + '</td><td>' + tagTT(r.trang_thai) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="note">Chưa có phiếu nào.</div>') + '</div>';
    nd.querySelectorAll('[data-kk]').forEach(tr => { tr.onclick = () => { location.hash = '#/kiem-ke-phong/' + tr.dataset.kk; }; });
    nd.querySelectorAll('[data-in-trong]').forEach(b => { b.onclick = (e) => chay(e.target, () => inPhieuPhong(b.dataset.inTrong)); });
    if ($('kk-mo')) $('kk-mo').onclick = () => {
      moHop('<h2>Mở đợt kiểm kê thiết bị phòng</h2><form id="f">' + o('ten', 'Tên đợt', { v: 'Kiểm kê thiết bị cuối năm ' + homNay().slice(0, 4), req: 1 }) + o('han', 'Hạn nộp', { type: 'date' }) +
        '<p class="note">Mọi GV quản lý phòng đã đăng ký trang dùng chung nhận thông báo kiểm kê. Phiếu GV gửi trong thời gian đợt mở được tính vào đợt.</p>' +
        '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Mở đợt</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); const r = await chay(e.submitter, () => api('kkp_dot_mo', giaTri(e.target))); dongHop(); toast('Đã mở đợt – báo ' + r.so_gv + ' GV quản lý phòng'); dieuHuong(); };
    };
    if ($('kk-dong')) $('kk-dong').onclick = (e) => { if (!confirm('Đóng đợt "' + d.ten + '"? Phiếu GV gửi sau đó không tính vào đợt này.')) return; chay(e.target, async () => { await api('kkp_dot_dong', { id: d.id }); toast('Đã đóng đợt'); dieuHuong(); }); };
    if (p[1]) { const r = D.ds.find(x => x.id === p[1]); if (r) hopKK(r, D.tinh_trang_tb); }
  }

  // xem / xử lý một phiếu: máy Hỏng / Không thấy gợi ý tình trạng mới (chọn "giữ nguyên" thì không đổi)
  function hopKK(r, ttTB) {
    const goiY = { hong: 'Hỏng – chờ sửa', khong: 'Ngưng sử dụng' }, mo = r.trang_thai !== 'Đã xử lý' && xl();
    moHop('<h2>Phiếu kiểm kê ' + esc(r.id) + ' – phòng ' + esc(r.phong) + ' ' + tagTT(r.trang_thai) + '</h2>' +
      '<p class="note">GV ' + esc(r.ho_ten) + ' gửi ' + ngayVN(r.tg) + ' · ' + tomTat(r) + (r.nguoi_xl ? ' · ' + esc(r.nguoi_xl) + ' xử lý ' + ngayVN(r.tg_xl) + (r.ghi_chu_xl ? ': ' + esc(r.ghi_chu_xl) : '') : '') + '</p>' +
      '<div class="tbl-wrap" style="max-height:52vh"><table><thead><tr><th>Thiết bị</th><th>Kết quả</th><th>Ghi chú GV</th><th>Tình trạng trên hệ thống</th>' + (mo ? '<th>Cập nhật tình trạng</th>' : '') + '</tr></thead><tbody>' +
      r.dong.map((x, i) => '<tr><td><a href="#/tai-san/' + esc(x.tb) + '">' + esc(x.ten) + '</a>' + (x.ma_ts ? '<div class="note">' + esc(x.ma_ts) + '</div>' : '') + '</td><td><span class="tag ' + KQ[x.kq][1] + '">' + KQ[x.kq][0] + '</span></td><td>' + esc(x.ghi_chu) + '</td><td>' + esc(x.tinh_trang) + '</td>' +
        (mo ? '<td><select data-cn="' + i + '"><option value="">— Giữ nguyên —</option>' + ttTB.filter(t => t !== x.tinh_trang).map(t => '<option' + (goiY[x.kq] === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></td>' : '') + '</tr>').join('') +
      '</tbody></table></div>' + (r.ngoai_ds ? '<p><b>Thiết bị có ở phòng ngoài danh sách:</b> ' + esc(r.ngoai_ds) + '</p>' : '') +
      (mo ? '<label class="f"><span>Ghi chú gửi GV (có thể để trống)</span><input id="kk-gc" placeholder="VD: đã ghi nhận máy hỏng, PTN sẽ liên hệ sửa"></label>' : '') +
      '<div class="modal-foot"><button type="button" class="btn o" id="kk-in">🖨 In phiếu (kết quả)</button><button type="button" class="btn o" data-dong>Đóng</button>' + (mo ? '<button type="button" class="btn" id="kk-xl">✓ Đã xử lý</button>' : '') + '</div>', (m) => {
      m.parentNode.style.maxWidth = 'min(1100px, 96vw)';
      m.querySelector('#kk-in').onclick = (e) => chay(e.target, () => inPhieuPhong(r.phong, r));
      if (m.querySelector('#kk-xl')) m.querySelector('#kk-xl').onclick = (e) => {
        const cap_nhat = [...m.querySelectorAll('[data-cn]')].filter(s => s.value).map(s => ({ tb: r.dong[+s.dataset.cn].tb, tinh_trang: s.value }));
        if (cap_nhat.length && !confirm('Cập nhật tình trạng ' + cap_nhat.length + ' thiết bị theo phiếu kiểm kê?')) return;
        chay(e.target, async () => { const x = await api('kkp_xl', { id: r.id, cap_nhat, ghi_chu: m.querySelector('#kk-gc').value }); dongHop();
          toast('Đã xử lý phiếu ' + r.id + (x.cap_nhat ? ' – cập nhật ' + x.cap_nhat + ' thiết bị' : '') + '; GV nhận thông báo'); location.hash = '#/kiem-ke-phong'; });
      };
    });
  }

  // trang phòng: thẻ "Kiểm kê thiết bị" – in phiếu trống, các phiếu GV đã gửi
  async function kkPhong(ma, el) {
    if (!el) return;
    let D; try { D = await api('kkp_ds', { phong: ma }); } catch (e) { return; }
    el.innerHTML = '<div class="card"><div class="btns" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Kiểm kê thiết bị (' + D.ds.length + ' phiếu)</h2>' +
      '<span class="btns" style="margin:0"><button class="btn o sm" id="kk-in-trong">🖨 In / Excel phiếu kiểm kê</button><a class="btn o sm" href="#/kiem-ke-phong">Kiểm kê phòng</a></span></div>' +
      (D.ds.length ? D.ds.slice(0, 5).map(r => '<div class="dong-don"><span><a href="#/kiem-ke-phong/' + esc(r.id) + '">' + esc(r.id) + '</a> · ' + ngayVN(r.tg) + ' · ' + esc(r.ho_ten) + ' · ' + tomTat(r) + '</span>' + tagTT(r.trang_thai) + '</div>').join('') :
        '<div class="note">Chưa có phiếu – GV quản lý phòng kiểm kê ở trang dùng chung (Đơn của tôi) hoặc in phiếu ghi tay.</div>') + '</div>';
    $('kk-in-trong').onclick = (e) => chay(e.target, () => inPhieuPhong(ma));
  }
  Object.assign(Q.TUYEN, { 'kiem-ke-phong': manKKPhong });
  Q.kkPhong = kkPhong;
})();
