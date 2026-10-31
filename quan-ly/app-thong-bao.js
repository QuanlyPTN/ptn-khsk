/* Trang quản lý – "Thông báo" (nhóm Vận hành): soạn thông báo tới trang dùng chung – tất cả, theo đối tượng, lớp, hồ sơ đề tài hoặc từng người;
   mức Quan trọng hiện nổi khi người dùng mở trang; theo dõi ai đã đọc; tùy chọn gửi kèm email. Tin tự động (đơn / hồ sơ được duyệt, từ chối) cũng hiện ở đây.
   Máy chủ: apps-script/19_ThongBao.gs. Lối tắt "Nhắn người này" ở hộp chi tiết đơn và danh sách Người dùng: Q.soanThongBao({ nguoi: [ma_so] }). */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { $, api, chay, trang, moHop, dongHop, o, esc, toast, ngayVN, homNay, boDau, coQuyen, dieuHuong } = Q;
  const LOAI = [['tat_ca', 'Tất cả người dùng'], ['doi_tuong', 'Theo đối tượng'], ['lop', 'Theo lớp'], ['ho_so', 'Theo hồ sơ đề tài (cả nhóm)'], ['nguoi', 'Từng người']];
  const DOI_TUONG = ['Sinh viên', 'Học viên', 'Giảng viên', 'Khác'];
  const tagMuc = (m) => m === 'quan_trong' ? '<span class="tag t-bad">Quan trọng</span>' : '<span class="tag t-gray">Thường</span>';
  const tagTT = (x) => x.trang_thai === 'Đã gỡ' ? '<span class="tag t-gray">Đã gỡ</span>' : x.dang_hien ? '<span class="tag t-ok">Đang hiện</span>' : '<span class="tag t-info">Chưa đến / hết hạn</span>';
  const duocGui = () => coQuyen('thong-bao', 'xu_ly');

  async function manThongBao() {
    const nd = trang('Thông báo tới trang dùng chung', duocGui() ? '<button class="btn sm" id="b-soan">+ Soạn thông báo</button>' : '');
    const ds = await api('thbao_ds');
    nd.innerHTML = '<p class="note">Thông báo hiện ở biểu tượng 🔔 trên trang dùng chung của đúng người nhận (theo thông tin đã đăng ký – mỗi người một máy). ' +
      'Mức <b>Quan trọng</b> hiện thành khung nổi ngay khi người nhận mở trang, phải bấm "Đã đọc". Tin <b>tự động</b>: đơn, hồ sơ đề tài được duyệt / không duyệt; nhắc sắp – quá hạn trả hiện thẳng trên trang dùng chung (không liệt kê ở đây).</p>' +
      '<div class="tools"><input type="search" id="q" placeholder="Tìm tiêu đề, nội dung, người nhận…"><select id="f-loc"><option value="hien">Đang hiện</option><option value="soan">Do cán bộ soạn</option>' +
      '<option value="tu_dong">Tin tự động</option><option value="go">Đã gỡ</option><option value="">Tất cả (' + ds.length + ')</option></select></div><div id="kq"></div>';
    const ve = () => {
      const q = boDau($('q').value), loc = $('f-loc').value;
      const l = ds.filter(x => (!loc || (loc === 'hien' ? x.dang_hien && x.trang_thai !== 'Đã gỡ' : loc === 'soan' ? !x.tu_dong : loc === 'tu_dong' ? x.tu_dong : x.trang_thai === 'Đã gỡ')) &&
        (!q || boDau([x.id, x.tieu_de, x.noi_dung, x.mo_ta_nhan, x.nguoi].join(' ')).indexOf(q) >= 0));
      $('kq').innerHTML = !l.length ? '<div class="card empty">Không có thông báo nào.</div>' : '<div class="tbl-wrap"><table><thead><tr><th>Gửi lúc</th><th>Tiêu đề – nội dung</th><th>Gửi tới</th><th>Mức</th><th class="num">Đã đọc</th><th>Trạng thái</th></tr></thead><tbody>' +
        l.slice(0, 300).map(x => '<tr class="click" data-id="' + esc(x.id) + '"><td style="white-space:nowrap">' + ngayVN(x.tg) + '<div class="note">' + esc(x.nguoi) + (x.tu_dong ? ' · tự động' : '') + '</div></td>' +
          '<td><b>' + esc(x.tieu_de) + '</b><div class="note">' + esc(String(x.noi_dung || '').slice(0, 140)) + '</div></td><td class="note">' + esc(x.mo_ta_nhan) + '</td><td>' + tagMuc(x.muc) +
          (x.email ? '<div class="note">✉ ' + esc(x.email) + ' email</div>' : '') + '</td><td class="num">' + x.da_doc + ' / ' + x.so_nhan + '</td><td>' + tagTT(x) +
          '<div class="note">' + ngayVN(x.tu_ngay) + (x.den_ngay ? ' → ' + ngayVN(x.den_ngay) : '') + '</div></td></tr>').join('') + '</tbody></table></div>';
      $('kq').querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = () => hopCT(tr.dataset.id); });
    };
    $('q').oninput = ve; $('f-loc').onchange = ve; ve();
    if ($('b-soan')) $('b-soan').onclick = () => soan();
  }

  async function hopCT(id) {
    const x = await api('thbao_ct', { id }), doc = x.nguoi_nhan.filter(n => n.doc_luc);
    moHop('<h2>' + esc(x.tieu_de) + '</h2><p class="note">' + esc(x.id) + ' · ' + ngayVN(x.tg) + ' · ' + esc(x.nguoi) + ' · ' + tagMuc(x.muc) + ' · hiện ' + ngayVN(x.tu_ngay) + (x.den_ngay ? ' → ' + ngayVN(x.den_ngay) : ' (không hết hạn)') + '</p>' +
      '<div class="card" style="white-space:pre-wrap">' + esc(x.noi_dung || '—') + (x.lien_ket ? '\n\n🔗 ' + esc(x.lien_ket) : '') + '</div>' +
      '<p><b>Gửi tới:</b> ' + esc(x.mo_ta_nhan) + ' · <b>' + doc.length + ' / ' + x.nguoi_nhan.length + '</b> người đã đọc' + (x.email ? ' · đã gửi ' + esc(x.email) + ' email' : '') + '</p>' +
      (x.nguoi_nhan.length ? '<div class="tbl-wrap" style="max-height:320px;overflow:auto"><table><thead><tr><th>Họ tên</th><th>MSSV / mã</th><th>Đối tượng – lớp</th><th>Đã đọc</th></tr></thead><tbody>' +
        x.nguoi_nhan.sort((a, b) => (a.doc_luc ? 1 : 0) - (b.doc_luc ? 1 : 0)).map(n => '<tr><td>' + esc(n.ho_ten) + '</td><td class="mono">' + esc(n.ma_so) + '</td><td>' + esc([n.doi_tuong, n.lop].filter(Boolean).join(' · ')) + '</td><td>' +
          (n.doc_luc ? '<span class="tag t-ok">' + ngayVN(n.doc_luc) + '</span>' : '<span class="tag t-gray">Chưa đọc</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="note">Chưa có người dùng nào khớp người nhận.</p>') +
      '<div class="modal-foot">' + (duocGui() && x.trang_thai !== 'Đã gỡ' ? '<button class="btn red o" id="b-go" style="margin-right:auto">Gỡ thông báo</button><button class="btn o" id="b-sua">Sửa</button>' : '') +
      '<button class="btn o" data-dong>Đóng</button></div>');
    if ($('b-go')) $('b-go').onclick = async (e) => { if (!confirm('Gỡ thông báo này khỏi trang dùng chung?')) return; await chay(e.target, () => api('thbao_go', { id })); toast('Đã gỡ'); dongHop(); dieuHuong(); };
    if ($('b-sua')) $('b-sua').onclick = () => soan(x);
  }

  // soạn / sửa. truoc: thông báo cũ (sửa) hoặc { nguoi: [ma_so…], tieu_de } (lối tắt "Nhắn người này")
  async function soan(truoc) {
    truoc = truoc || {};
    const sua = !!truoc.id, nh = truoc.nhan || (truoc.nguoi ? { loai: 'nguoi', ds: truoc.nguoi } : { loai: 'tat_ca', ds: [] });
    let nguoi = [], hs = [];
    try { nguoi = (await api('nd_ds')).nguoi || []; } catch (e) { /* không có quyền xem Người dùng: nhập mã tay */ }
    try { hs = await api('hs_ds'); } catch (e) { /* không có quyền xem hồ sơ đề tài */ }
    const lop = [...new Set(nguoi.map(n => String(n.lop || '').toUpperCase()).filter(Boolean))].sort();
    moHop('<h2>' + (sua ? 'Sửa thông báo ' + esc(truoc.id) : 'Soạn thông báo') + '</h2><form id="f-tb"><div class="form-grid">' +
      o('tieu_de', 'Tiêu đề', { v: truoc.tieu_de, req: 1, full: 1, ph: 'VD: PTN nghỉ ngày 02/9' }) + o('noi_dung', 'Nội dung', { v: truoc.noi_dung, area: 1, full: 1 }) +
      o('muc', 'Mức', { v: truoc.muc || 'thuong', select: [['thuong', 'Thường – vào hộp thông báo 🔔'], ['quan_trong', 'Quan trọng – hiện nổi khi mở trang']] }) +
      o('loai', 'Gửi tới', { v: nh.loai, select: LOAI }) + '<div class="full" id="chon-nhan"></div>' +
      o('tu_ngay', 'Hiện từ ngày', { type: 'date', v: truoc.tu_ngay || homNay() }) + o('den_ngay', 'Đến ngày (trống: không hết hạn)', { type: 'date', v: truoc.den_ngay }) +
      o('lien_ket', 'Liên kết (nếu có)', { v: truoc.lien_ket, full: 1, ph: 'VD: https://… hoặc #/bieu-mau' }) +
      '</div><p class="note" id="dem-nhan"></p><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">' + (sua ? 'Lưu' : 'Gửi thông báo') + '</button></div></form>');
    const f = $('f-tb'), daChon = new Set((nh.ds || []).map(String));
    const dsTheoLoai = (l) => l === 'doi_tuong' ? DOI_TUONG.map(x => [x, x]) : l === 'lop' ? lop.map(x => [x, x]) :
      l === 'ho_so' ? hs.filter(h => ['Đã đóng', 'Từ chối'].indexOf(h.trang_thai) < 0).map(h => [h.id, h.id + ' – ' + h.ten]) : l === 'nguoi' ? nguoi.map(n => [n.ma_so, n.ho_ten + ' – ' + n.ma_so + (n.lop ? ' · ' + n.lop : '') + ' · ' + n.doi_tuong]) : [];
    const veNhan = () => {
      const l = f.loai.value, ds = dsTheoLoai(l), hop = $('chon-nhan');
      if (l === 'tat_ca') { hop.innerHTML = ''; return demNhan(); }
      hop.innerHTML = (ds.length > 8 ? '<input type="search" id="tim-nhan" placeholder="Tìm…" style="margin-bottom:6px">' : '') +
        '<div id="ds-nhan" style="max-height:220px;overflow:auto;border:1px solid var(--line,#ddd);border-radius:8px;padding:6px 10px">' +
        (ds.length ? ds.map(x => '<label class="check" style="display:block;margin:3px 0"><input type="checkbox" data-nhan="' + esc(x[0]) + '"' + (daChon.has(String(x[0])) ? ' checked' : '') + '> ' + esc(x[1]) + '</label>').join('') : '<span class="note">Không có dữ liệu để chọn – nhập mã ở ô dưới.</span>') + '</div>' +
        (l === 'lop' || l === 'nguoi' || l === 'ho_so' ? '<input id="nhap-nhan" placeholder="Hoặc nhập ' + ({ lop: 'lớp', nguoi: 'MSSV / mã viên chức', ho_so: 'mã hồ sơ' }[l]) + ', cách nhau dấu phẩy" style="margin-top:6px;width:100%">' : '');
      hop.querySelectorAll('[data-nhan]').forEach(c => { c.onchange = () => { if (c.checked) daChon.add(c.dataset.nhan); else daChon.delete(c.dataset.nhan); demNhan(); }; });
      if ($('tim-nhan')) $('tim-nhan').oninput = () => { const q = boDau($('tim-nhan').value); hop.querySelectorAll('#ds-nhan label').forEach(lb => { lb.style.display = !q || boDau(lb.textContent).indexOf(q) >= 0 ? 'block' : 'none'; }); };
      if ($('nhap-nhan')) $('nhap-nhan').oninput = demNhan;
      demNhan();
    };
    const layDs = () => { const l = f.loai.value; if (l === 'tat_ca') return [];
      const tay = $('nhap-nhan') ? $('nhap-nhan').value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean) : [];
      const hopLe = dsTheoLoai(l).map(x => String(x[0]));
      return [...new Set([...daChon].filter(v => hopLe.indexOf(v) >= 0).concat(tay))]; };
    const demNhan = () => { const l = f.loai.value, ds = layDs();
      const n = l === 'tat_ca' ? nguoi.length : l === 'doi_tuong' ? nguoi.filter(x => ds.indexOf(x.doi_tuong) >= 0).length : l === 'lop' ? nguoi.filter(x => ds.map(s => s.toUpperCase()).indexOf(String(x.lop).toUpperCase()) >= 0).length : l === 'nguoi' ? ds.length : null;
      $('dem-nhan').textContent = n == null ? 'Đã chọn ' + ds.length + ' hồ sơ – gửi tới mọi thành viên nhóm đã đăng ký.' : nguoi.length ? 'Khoảng ' + n + ' người nhận.' : ''; };
    f.loai.onchange = () => { daChon.clear(); veNhan(); };
    veNhan();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const tb = { id: truoc.id, tieu_de: f.tieu_de.value.trim(), noi_dung: f.noi_dung.value, muc: f.muc.value, nhan: { loai: f.loai.value, ds: layDs() },
        tu_ngay: f.tu_ngay.value, den_ngay: f.den_ngay.value, lien_ket: f.lien_ket.value.trim() }; // gửi email: tạm chưa dùng (máy chủ vẫn hỗ trợ gui_email)
      const r = await chay(e.submitter, () => api('thbao_luu', { tb }));
      toast((sua ? 'Đã lưu thông báo' : 'Đã gửi thông báo') + (r.email_gui ? ' · ' + r.email_gui.so + ' email' + (r.email_gui.khong_email ? ' (' + r.email_gui.khong_email + ' người không có email)' : '') : ''));
      dongHop(); if (/^#\/thong-bao/.test(location.hash)) dieuHuong();
    };
  }

  Q.soanThongBao = (truoc) => soan(truoc);
  Object.assign(Q.TUYEN, { 'thong-bao': manThongBao });
})();
