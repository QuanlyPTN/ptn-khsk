/* Trang quản lý – "Lịch sử tải file" (nhóm Hệ thống): mọi lần tải file lên (thời khóa biểu, định mức, mã VT, dự trù, được cấp, nhập kho, thiết bị)
   và các lần xóa hàng loạt (thời khóa biểu học kỳ, lô kho). Xem chi tiết thay đổi → Thu hồi (trả dữ liệu về như trước) → Xóa dòng lịch sử.
   Máy chủ: apps-script/16_LichSuTai.gs (chỉ thu hồi khi dữ liệu chưa bị dùng / sửa tiếp; người có quyền xử lý mục tương ứng). */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, esc, toast, ngayVN, boDau, dieuHuong } = Q;
  const MAU = { 'Đã tải': 't-info', 'Đã thu hồi': 't-gray' };
  const tag = (t) => '<span class="tag ' + (MAU[t] || 't-gray') + '">' + esc(t) + '</span>';
  const pham = (x) => [x.hk, x.dot && 'đợt ' + x.dot].filter(Boolean).join(' · ');

  async function manLichSuTai(p) {
    const nd = trang('Lịch sử tải file');
    const ds = await api('lt_ds'), loai = [...new Set(ds.map(x => x.loai))];
    nd.innerHTML = '<p class="note">Mỗi lần tải file lên (thời khóa biểu, định mức, mã vật tư, dự trù, danh sách được cấp, nhập kho, thiết bị) và mỗi lần xóa thời khóa biểu học kỳ / xóa lô kho đều được ghi lại. ' +
      'Tải nhầm (sai học kỳ, sai file): mở dòng đó → <b>Thu hồi</b> để trả dữ liệu về như trước lần tải. Chỉ thu hồi được khi dữ liệu của lần đó chưa được dùng tiếp (cấp phát, xuất kho, sửa tay, lần tải sau…) – hệ thống báo rõ lý do nếu chưa được.</p>' +
      '<div class="tools"><input type="search" id="q" placeholder="Tìm loại, file, học kỳ, người tải…"><select id="f-loai"><option value="">Mọi loại (' + ds.length + ')</option>' + loai.map(l => '<option>' + esc(l) + '</option>').join('') +
      '</select><select id="f-tt"><option value="">Mọi trạng thái</option><option>Đã tải</option><option>Đã thu hồi</option></select><button class="btn red o sm" id="b-xoa-chon" disabled>🗑 Xóa đã chọn</button></div><div id="kq"></div>';
    let hien = [];
    const ve = () => {
      const q = boDau($('q').value), l = $('f-loai').value, tt = $('f-tt').value;
      hien = ds.filter(x => (!l || x.loai === l) && (!tt || x.trang_thai === tt) && (!q || boDau([x.id, x.loai, x.tep, x.hk, x.dot, x.nguoi, x.tom_tat].join(' ')).indexOf(q) >= 0));
      $('kq').innerHTML = !hien.length ? '<div class="card empty">Chưa có lần tải file nào.</div>' : '<div class="tbl-wrap"><table><thead><tr><th style="width:28px"><input type="checkbox" id="chon-het-lt" title="Chọn tất cả dòng đang hiện"></th><th>Thời gian</th><th>Dữ liệu</th><th>Học kỳ / đợt</th><th>File</th><th>Người tải</th><th>Thay đổi</th><th>Trạng thái</th></tr></thead><tbody>' +
        hien.map(x => '<tr class="click" data-id="' + esc(x.id) + '"><td><input type="checkbox" data-chon-lt="' + esc(x.id) + '"></td><td style="white-space:nowrap">' + ngayVN(x.tg) + '<div class="note mono">' + esc(x.id) + '</div></td><td><b>' + esc(x.loai) + '</b></td><td>' + esc(pham(x)) + '</td><td><div class="btns" style="flex-wrap:nowrap;justify-content:space-between"><span>' + esc(x.tep || '—') + '</span><button class="btn red o sm" data-xoa-lt="' + esc(x.id) + '" title="Xóa dòng lịch sử này">🗑</button></div></td>' +
          '<td>' + esc(x.nguoi) + '</td><td class="note">' + esc(x.tom_tat) + '</td><td>' + tag(x.trang_thai) + (x.thu_hoi_tg ? '<div class="note">' + ngayVN(x.thu_hoi_tg) + ' · ' + esc(x.thu_hoi_nguoi) + '</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
      $('kq').querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = (e) => { if (e.target.closest('button,input')) return; hop(tr.dataset.id); }; });
      const capNhat = () => { const n = $('kq').querySelectorAll('[data-chon-lt]:checked').length; $('b-xoa-chon').disabled = !n; $('b-xoa-chon').textContent = '🗑 Xóa đã chọn' + (n ? ' (' + n + ')' : ''); };
      $('kq').querySelectorAll('[data-chon-lt]').forEach(c => { c.onchange = capNhat; });
      if ($('chon-het-lt')) $('chon-het-lt').onchange = (e) => { $('kq').querySelectorAll('[data-chon-lt]').forEach(c => { c.checked = e.target.checked; }); capNhat(); };
      capNhat();
      $('kq').querySelectorAll('[data-xoa-lt]').forEach(b => { b.onclick = (e) => xoa([b.dataset.xoaLt], e.target); });
    };
    // xóa dòng lịch sử (dữ liệu đã tải giữ nguyên; sau khi xóa không thu hồi lần tải đó được nữa)
    const xoa = async (ids, nut) => {
      if (!confirm('Xóa ' + ids.length + ' dòng lịch sử: ' + ids.join(', ') + '?\nChỉ xóa lịch sử, dữ liệu đã tải giữ nguyên; sau đó KHÔNG thu hồi các lần tải này được nữa.')) return;
      const r = await chay(nut, () => api('lt_xoa', { ids })); toast('Đã xóa ' + r.xoa + ' dòng lịch sử'); dieuHuong(); };
    $('b-xoa-chon').onclick = (e) => xoa([...$('kq').querySelectorAll('[data-chon-lt]:checked')].map(c => c.dataset.chonLt), e.target);
    ['q', 'f-loai', 'f-tt'].forEach(id => { $(id).oninput = ve; $(id).onchange = ve; });
    ve();
    if (p[1]) hop(decodeURIComponent(p[1]));
  }

  async function hop(id) {
    const x = await api('lt_ct', { id });
    const mau = (l) => l.length ? '<div class="note">' + l.map(esc).join(' · ') + '</div>' : '';
    let h = '<h2>' + esc(x.loai) + ' ' + tag(x.trang_thai) + '</h2><dl class="kv">' + [['Mã lần tải', x.id], ['Thời gian', ngayVN(x.tg)], ['Người tải', x.nguoi + ' – ' + x.email], ['Học kỳ / đợt', pham(x)], ['File', x.tep],
      ['Thu hồi', x.thu_hoi_tg ? ngayVN(x.thu_hoi_tg) + ' · ' + x.thu_hoi_nguoi : '']].filter(r => r[1]).map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl>';
    if (x.bang.length) h += '<h2 style="margin-top:12px">Dữ liệu đã thay đổi</h2><div class="tbl-wrap"><table><thead><tr><th>Bảng</th><th class="num">Thêm</th><th class="num">Sửa</th><th class="num">Xóa</th><th>Ví dụ</th></tr></thead><tbody>' +
      x.bang.map(b => '<tr><td><b>' + esc(b.ten) + '</b></td><td class="num">' + b.them + '</td><td class="num">' + b.sua + '</td><td class="num">' + b.xoa + '</td><td>' +
        (b.mau_them.length ? '<div class="note"><b>Thêm:</b></div>' + mau(b.mau_them) : '') + (b.mau_sua.length ? '<div class="note"><b>Sửa (giá trị cũ):</b></div>' + mau(b.mau_sua) : '') + (b.mau_xoa.length ? '<div class="note"><b>Xóa:</b></div>' + mau(b.mau_xoa) : '') + '</td></tr>').join('') + '</tbody></table></div>';
    if (x.trang_thai === 'Đã tải') h += x.chan.length ? '<div class="err" style="margin-top:10px">⚠ Chưa thu hồi được:<ul style="margin:4px 0 0 18px;padding:0">' + x.chan.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' +
      '<div class="note">Nếu có lần tải / thao tác sau trên cùng dữ liệu, thu hồi lần sau trước; dữ liệu đã cấp phát / xuất kho thì sửa tay.</div></div>'
      : '<p class="note" style="color:var(--ok)">✓ Thu hồi được: dữ liệu sẽ trở về như trước lần tải này.</p>';
    h += '<div class="modal-foot">' + (x.thu_hoi_duoc ? '<button class="btn" id="b-thu-hoi">↺ Thu hồi lần tải này</button>' : '') +
      '<button class="btn red o" id="b-xoa-lt">Xóa lịch sử</button><button class="btn o" data-dong>Đóng</button></div>';
    moHop(h);
    if ($('b-thu-hoi')) $('b-thu-hoi').onclick = async (e) => {
      if (!confirm('Thu hồi lần tải ' + x.id + ' (' + x.loai + (x.tep ? ' – ' + x.tep : '') + ')?\nDữ liệu sẽ trở về như trước lần tải.')) return;
      await chay(e.target, () => api('lt_thu_hoi', { id: x.id })); toast('Đã thu hồi ' + x.id); dongHop(); dieuHuong();
    };
    $('b-xoa-lt').onclick = async (e) => {
      if (!confirm('Xóa dòng lịch sử ' + x.id + '?\nChỉ xóa lịch sử, dữ liệu đã tải giữ nguyên; sau đó KHÔNG thu hồi lần tải này được nữa.')) return;
      await chay(e.target, () => api('lt_xoa', { id: x.id })); toast('Đã xóa lịch sử ' + x.id); dongHop(); location.hash = '#/lich-su-tai';
    };
  }

  Object.assign(Q.TUYEN, { 'lich-su-tai': manLichSuTai });
})();
