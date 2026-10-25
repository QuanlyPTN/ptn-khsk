/* Mục "Giảng viên": 5 phiếu – biên bản thiết bị điền trực tuyến. Dùng chung trang công khai (GV tự điền) và trang quản lý (cán bộ lập thay).
   (1) Khung nhập liệu: ve(hop, qr, {dm, nguoi}) → doc(hop, qr, {nguoi}) = {d, ng, loi}.
   (2) Mẫu in A4 + Word đăng ký vào PTN_DON_QR, bám file mẫu: báo hỏng TB, đề nghị sửa chữa TB, đề nghị bổ sung TB, biên bản bàn giao TB cho GV
       (02 MAU DON / 2.2 PHIEU DE NGHI - THIET BI) và giấy báo mang tài sản vào / ra cơ quan (mẫu của Trường, TCHC – mẫu số 28). */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const homNay = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const soVN = (n) => n === '' || n == null ? '' : (Math.round(+n * 1000) / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

  const LOAI = {
    'GV-BH': { ten: 'Báo hỏng thiết bị', mo_ta: 'Báo thiết bị hư hỏng, sự cố về Phòng thí nghiệm', mau: 'Bieu-mau-bao-hong-thiet-bi.docx' },
    'GV-SC': { ten: 'Phiếu đề nghị sửa chữa thiết bị', mo_ta: 'Đề nghị BLĐ Khoa, TBM, PTN kiểm tra – sửa chữa', mau: 'Phieu-de-nghi-sua-chua-thiet-bi.docx' },
    'GV-BS': { ten: 'Phiếu đề nghị bổ sung thiết bị', mo_ta: 'Bổ sung thiết bị phục vụ giảng dạy thực hành', mau: 'Phieu-de-nghi-bo-sung-thiet-bi.docx' },
    'GV-BG': { ten: 'Biên bản bàn giao thiết bị cho giảng viên', mo_ta: 'PTN bàn giao thiết bị cho giảng viên sử dụng', mau: 'Bien-ban-ban-giao-thiet-bi-PTN-cho-giang-vien.docx', ngung: 1 }, // ngừng lập mới (anh Phú bỏ 25/10/2026) – giữ để xem / in phiếu cũ
    'GV-TS': { ten: 'Giấy báo mang tài sản vào / ra cơ quan', mo_ta: 'Mẫu của Trường – TCHC mẫu số 28', mau: 'Giay-bao-mang-tai-san-vao-ra-co-quan_TCHC-mau-28.docx',
      to_trinh: 'Phieu-de-nghi-giai-quyet-cong-viec_mang-tai-san-ra.docx' } // mang tài sản ra: kèm phiếu đề nghị giải quyết công việc (tờ trình BGH)
  };
  // cột bảng thiết bị của từng phiếu: [khóa, chữ gợi ý]; ten và sl bắt buộc
  const COT = {
    'GV-BH': [['ten', 'Tên thiết bị *'], ['ma', 'Mã số / số serial'], ['sl', 'Số lượng *'], ['tinh_trang', 'Mô tả tình trạng hư hỏng / sự cố']],
    'GV-SC': [['ten', 'Tên thiết bị *'], ['sl', 'Số lượng *'], ['tinh_trang', 'Tình trạng hỏng'], ['ghi_chu', 'Ghi chú']],
    'GV-BS': [['ten', 'Tên thiết bị *'], ['sl', 'Số lượng *'], ['tinh_trang', 'Tình trạng bàn giao'], ['ghi_chu', 'Ghi chú']],
    'GV-BG': [['ten', 'Tên thiết bị *'], ['ma', 'Mã số / số serial'], ['dvt', 'ĐVT'], ['sl', 'Số lượng *'], ['tinh_trang', 'Tình trạng lúc bàn giao'], ['ghi_chu', 'Ghi chú']],
    'GV-TS': [['ten', 'Danh mục (tên tài sản) *'], ['ma', 'ID (mã tài sản)'], ['sl', 'Số lượng *']] // vào: người nhận = người lập phiếu (in sẵn), người giao viết tay; ra: người giao = người lập phiếu, người nhận viết tay
  };
  // phiếu theo một phòng: danh mục chọn nhanh chỉ hiện thiết bị của phòng đã chọn
  const THEO_PHONG = { 'GV-BH': 1, 'GV-SC': 1 };

  // ---------------- (1) Khung nhập liệu ----------------
  const CSS = '.pg-f{margin-bottom:12px}.pg-t{display:block;font-weight:600;margin-bottom:5px}.pg-t i{color:#B42318;font-style:normal}.pg-h{color:#5B6478;font-size:12.5px;margin:-2px 0 6px}' +
    '.pg-hai{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}.pg input[type=text],.pg input[type=number],.pg input[type=date],.pg select,.pg textarea{width:100%;box-sizing:border-box;margin:0}' +
    '.pg-sec{font-weight:700;margin:18px 0 8px;font-size:13.5px;text-transform:uppercase;letter-spacing:.5px;color:#2E333D}' +
    '.pg-dong{position:relative;border:1px solid #E3E7EF;border-radius:12px;padding:10px 34px 2px 10px;margin-bottom:8px;background:#FAFBFE;display:grid;grid-template-columns:1fr 1fr;gap:0 8px}' +
    '.pg-dong>input{margin:0 0 8px}.pg-dong>[data-k=ten],.pg-dong>[data-k=tinh_trang]{grid-column:1/-1}@media(min-width:760px){.pg-dong{grid-template-columns:repeat(4,1fr)}.pg-dong>[data-k=tinh_trang]{grid-column:span 2}}.pg-x{position:absolute;top:6px;right:6px;border:0;background:none;font-size:20px;line-height:1;color:#B42318;cursor:pointer}' +
    '.pg-chon{display:flex;gap:8px;align-items:center}.pg-chon select{flex:1;min-width:0}.pg-nut{background:none;border:0;color:#1E4FC2;text-decoration:underline;cursor:pointer;padding:6px 0;font:inherit;font-size:14.5px;white-space:nowrap}' +
    '.pg-r{display:flex;gap:10px;flex-wrap:wrap}.pg-r label{display:flex;gap:8px;align-items:center;border:1px solid #D3D9E5;border-radius:10px;padding:9px 12px;cursor:pointer;font-weight:400;background:#fff}' +
    '.pg-r input{width:18px;height:18px;margin:0}.pg-ghi{border:1px solid #F2D58A;background:#FFF8E1;color:#5C4300;border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:14px;line-height:1.45}.pg-ghi a{color:#1E4FC2}@media(max-width:600px){.pg-hai{grid-template-columns:1fr}}';
  function damBaoCSS() { if (document.getElementById('pg-css')) return; const s = document.createElement('style'); s.id = 'pg-css'; s.textContent = CSS; document.head.appendChild(s); }
  const truong = (nhan, trong, bb, goiY) => '<div class="pg-f"><label class="pg-t">' + nhan + (bb ? ' <i>*</i>' : '') + '</label>' + (goiY ? '<div class="pg-h">' + goiY + '</div>' : '') + trong + '</div>';
  const o = (name, nhan, bb, x) => { x = x || {};
    return truong(nhan, x.area ? '<textarea name="' + name + '" rows="3" placeholder="' + esc(x.ph || '') + '">' + esc(x.v || '') + '</textarea>'
      : '<input type="' + (x.type || 'text') + '" name="' + name + '" value="' + esc(x.v || '') + '" placeholder="' + esc(x.ph || '') + '" autocomplete="off">', bb, x.h); };
  const hai = (a, b) => '<div class="pg-hai">' + a + b + '</div>';
  const sec = (t) => '<div class="pg-sec">' + t + '</div>';

  // hop: phần tử chứa khung; o.dm = {phong: [{ma, ten}], thiet_bi: [{id, ten, ma_ts, phong}]}; o.nguoi = 1 (trang quản lý: nhập thông tin giảng viên)
  function ve(hop, qr, opt) {
    opt = opt || {}; damBaoCSS();
    const dm = opt.dm || {}, dsPhong = dm.phong || [], dsTB = dm.thiet_bi || [];
    const chonPhong = (nhan) => truong(nhan, '<select name="phong"><option value="">– Chọn phòng –</option>' + dsPhong.map(p => '<option value="' + esc(p.ma) + '">' + esc(p.ma + ' – ' + p.ten) + '</option>').join('') + '</select>', 1);
    let h = '<div class="pg" data-qr="' + esc(qr) + '">';
    if (opt.nguoi) h += sec('Giảng viên đề nghị') + hai(o('ho_ten', 'Họ và tên giảng viên', 1), o('ma_so', 'Mã viên chức')) + hai(o('bo_mon', 'Bộ môn'), o('sdt', 'Điện thoại')) + o('email', 'Email');
    h += sec(qr === 'GV-TS' ? 'Thông tin giấy báo' : 'Nội dung');
    if (qr === 'GV-BH') h += hai(chonPhong('Phòng thực hành'), o('ngay', 'Ngày phát hiện sự cố', 1, { type: 'date', v: homNay() }));
    if (qr === 'GV-SC') h += chonPhong('Phòng có thiết bị hỏng') + o('ly_do', 'Tóm tắt nội dung đề nghị (nếu cần)', 0, { area: 1 });
    if (qr === 'GV-BS') h += chonPhong('Phòng cần bổ sung thiết bị') + o('ly_do', 'Lý do / nội dung cần bổ sung (nếu cần)', 0, { area: 1 });
    if (qr === 'GV-BG') h += chonPhong('Phòng sử dụng') + hai(o('tu_ngay', 'Sử dụng từ ngày', 1, { type: 'date', v: homNay() }), o('den_ngay', 'Đến ngày (dự kiến)', 0, { type: 'date' }));
    if (qr === 'GV-TS') h += truong('Loại giấy báo', '<div class="pg-r"><label><input type="radio" name="chieu" value="vao"> Mang tài sản <b>VÀO</b> cơ quan</label><label><input type="radio" name="chieu" value="ra"> Mang tài sản <b>RA KHỎI</b> cơ quan</label></div>', 1) +
      o('ngay', 'Ngày mang tài sản', 1, { type: 'date', v: homNay() }) + o('ly_do', 'Lý do', 1, { area: 1 }) +
      '<div data-pg="ra" hidden><div class="pg-ghi"><b>Mang tài sản RA KHỎI cơ quan</b> phải kèm <b>Phiếu đề nghị giải quyết công việc (tờ trình)</b> được Ban Giám hiệu phê duyệt. ' +
      'Hệ thống in sẵn tờ trình (trang 1) cùng giấy báo (trang 2): in, ký, trình Trưởng khoa ký rồi nộp Phòng Tổ chức – Hành chính trình BGH. ' +
      'Khi nộp tờ trình phải <b>kèm Giấy báo mang tài sản VÀO cơ quan đã lập trước đó</b>. <a href="' + (opt.thuMuc || 'bieu-mau/') + LOAI['GV-TS'].to_trinh + '" download>Tải tờ trình trống (Word)</a></div>' +
      o('ma_vao', 'Giấy báo mang tài sản VÀO đã lập trước đó', 1, { h: 'Ghi mã phiếu (VD: D000123) hoặc ngày trên giấy báo vào – in vào tờ trình' }) + '</div>' +
      '<div class="pg-h">Giấy báo vào: cột Người nhận in sẵn họ tên, điện thoại người lập phiếu; Người giao viết tay, ký sau khi in. Giấy báo ra: cột Người giao in sẵn người lập phiếu; Người nhận viết tay.</div>';
    h += sec(qr === 'GV-TS' ? 'Danh mục tài sản' : 'Thiết bị') +
      (dsTB.length ? truong('Chọn nhanh từ danh mục thiết bị của PTN (nếu có)', '<div class="pg-chon"><select data-pg="chon"></select><button type="button" class="pg-nut" data-pg="them-dm">+ Thêm</button></div>') : '') +
      '<div class="pg-h">Mỗi thiết bị một khung; thiết bị không có trong danh mục thì gõ tay. Có tên thì phải nhập số lượng.</div><div data-pg="ds"></div><button type="button" class="pg-nut" data-pg="them">+ Thêm dòng nhập tay</button>';
    if (qr === 'GV-BH') h += sec('Mô tả – đề xuất') + o('dien_bien', 'Mô tả chi tiết diễn biến sự cố (nếu có)', 0, { area: 1 }) + o('de_xuat', 'Đề xuất hướng xử lý (nếu có)', 0, { area: 1 });
    hop.innerHTML = h + '</div>';
    const ds = hop.querySelector('[data-pg=ds]'), chon = hop.querySelector('[data-pg=chon]'), phong = hop.querySelector('[name=phong]');
    const themDong = (x) => {
      x = x || {}; const r = document.createElement('div'); r.className = 'pg-dong'; if (x.tb) r.dataset.tb = x.tb;
      r.innerHTML = COT[qr].map(([k, ph]) => '<input type="' + (k === 'sl' ? 'number' : 'text') + '" data-k="' + k + '"' + (k === 'sl' ? ' min="0" step="any" inputmode="decimal"' : '') +
        ' placeholder="' + esc(ph) + '" value="' + esc(x[k] == null ? '' : x[k]) + '" autocomplete="off">').join('') + '<button type="button" class="pg-x" title="Bỏ dòng này">×</button>';
      r.querySelector('.pg-x').onclick = () => { r.remove(); if (!ds.children.length) themDong(); };
      // dòng trống đầu tiên đang chờ nhập → dùng luôn cho thiết bị chọn từ danh mục
      const trong = ds.children.length === 1 && ![...ds.children[0].querySelectorAll('input')].some(i => i.value.trim()) ? ds.children[0] : null;
      if (x.ten && trong) trong.replaceWith(r); else ds.appendChild(r);
      return r;
    };
    const veChon = () => { if (!chon) return; const p = THEO_PHONG[qr] && phong && phong.value;
      const l = dsTB.filter(t => !p || t.phong === p);
      chon.innerHTML = '<option value="">' + (l.length ? '– Chọn thiết bị' + (p ? ' phòng ' + esc(p) : '') + ' –' : 'Phòng này chưa có thiết bị trong danh mục') + '</option>' +
        l.map(t => '<option value="' + esc(t.id) + '">' + esc(t.ten + (t.ma_ts ? ' (' + t.ma_ts + ')' : '') + (p ? '' : ' · ' + (t.phong || '—'))) + '</option>').join(''); };
    if (chon) { veChon(); if (phong) phong.addEventListener('change', veChon);
      hop.querySelector('[data-pg=them-dm]').onclick = () => { const t = dsTB.find(x => x.id === chon.value); if (!t) return;
        themDong({ tb: t.id, ten: t.ten, ma: t.ma_ts || '', sl: 1, dvt: qr === 'GV-BG' ? 'Cái' : '' }); chon.value = ''; }; }
    hop.querySelector('[data-pg=them]').onclick = () => themDong();
    themDong();
    // giấy báo ra: hiện ghi chú tờ trình BGH + ô giấy báo vào đã lập
    if (qr === 'GV-TS') hop.addEventListener('change', (e) => { if (e.target.name === 'chieu') hop.querySelector('[data-pg=ra]').hidden = e.target.value !== 'ra'; });
  }
  // đọc khung: {d: nội dung gửi máy chủ, ng: thông tin giảng viên (trang quản lý), loi: chuỗi báo lỗi đầu tiên}
  function doc(hop, qr, opt) {
    opt = opt || {};
    const v = {}; hop.querySelectorAll('.pg [name]').forEach(el => { if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; } else v[el.name] = el.value.trim(); });
    const tb = [...hop.querySelectorAll('.pg-dong')].map(r => { const x = {}; r.querySelectorAll('[data-k]').forEach(i => { x[i.dataset.k] = i.value.trim(); }); if (r.dataset.tb) x.tb = r.dataset.tb; return x; }).filter(x => x.ten);
    const ng = opt.nguoi ? { ho_ten: v.ho_ten, ma_so: v.ma_so, bo_mon: v.bo_mon, sdt: v.sdt, email: v.email } : null;
    ['ho_ten', 'ma_so', 'bo_mon', 'sdt', 'email'].forEach(k => { delete v[k]; });
    if (v.chieu !== 'ra') delete v.ma_vao;
    const d = Object.assign(v, { tb });
    const thieuSL = tb.find(x => !(+x.sl > 0));
    const loi = ng && !ng.ho_ten ? 'Nhập họ tên giảng viên' : qr !== 'GV-TS' && !v.phong ? 'Chọn phòng' : qr === 'GV-TS' && !v.chieu ? 'Chọn loại giấy báo: mang tài sản vào hay ra khỏi cơ quan' :
      (qr === 'GV-BH' || qr === 'GV-TS') && !v.ngay ? 'Chọn ngày' : qr === 'GV-BG' && !v.tu_ngay ? 'Chọn ngày bắt đầu sử dụng' : qr === 'GV-TS' && !v.ly_do ? 'Nhập lý do' : v.chieu === 'ra' && !v.ma_vao ? 'Ghi giấy báo mang tài sản VÀO đã lập trước đó (mã phiếu hoặc ngày)' :
      !tb.length ? 'Nhập ít nhất một thiết bị (tên và số lượng)' : thieuSL ? 'Nhập số lượng cho "' + thieuSL.ten + '"' : '';
    return { d, ng, loi };
  }
  // tóm tắt một dòng (danh sách phiếu)
  const tomTat = (d) => [d.nd.chieu ? (d.nd.chieu === 'vao' ? 'Mang VÀO cơ quan' : 'Mang RA khỏi cơ quan') : '', d.phong && 'Phòng ' + d.phong,
    (d.nd.tb || []).map(x => x.ten + ' – SL ' + soVN(x.sl)).join('; '), d.nd.ly_do].filter(Boolean).join(' · ');

  // ---------------- (2) Mẫu in A4 + Word ----------------
  const D = window.PTN_DON;
  if (D && window.PTN_DON_QR && window.PTN_DON_QR.them) {
    const { R, GT, P, bang, ky, ngay } = D;
    const KHOANG = P(R('\u00a0')); // dòng trống có chiều cao cả trên bản xem trước (đoạn rỗng hiện cao 0)
    const dongNgay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return 'TP. Hồ Chí Minh, ngày ' + (m ? m[3] + ' tháng ' + m[2] + ' năm ' + m[1] : '…… tháng …… năm 20……'); };
    const muc = (t) => P(R(t, { b: 1 }));
    const vanBan = (s) => s ? P(R(s), { al: 'both' }) : P(R('…'.repeat(42)));
    const tieuDe = (t, phu) => [P(R(t, { b: 1, sz: 28 }), { al: 'center' })].concat(phu ? [P(R(phu, { i: 1 }), { al: 'center' })] : [], [KHOANG]);
    const xong = (d) => d.trang_thai === 'Hoàn tất' && d.nd.hoan_tat;

    // bám "Biểu mẫu báo hỏng thiết bị" – phần V do PTN ghi khi tiếp nhận / xử lý
    const BH = (d) => { const n = d.nd, tn = n.tiep_nhan, ht = xong(d), hx = n.huong_xu_ly, o2 = (t) => (hx === t ? '☒ ' : '☐ ') + t;
      return [{ hd: 1 }, P(R(dongNgay(d.tg), { i: 1 }), { al: 'right' }), KHOANG].concat(tieuDe('BIỂU MẪU BÁO HỎNG THIẾT BỊ', '(Giảng viên báo về Phòng thí nghiệm)'), [
        muc('I. THÔNG TIN NGƯỜI BÁO CÁO'),
        P(['Họ và tên (Giảng viên): ', GT(d.ho_ten, 22), '   Bộ môn: ', GT(d.bo_mon, 14)]),
        P(['Phòng thực hành: ', GT(d.phong, 12), '   Ngày phát hiện sự cố: ', d.tu_ngay ? R(ngay(d.tu_ngay), { b: 1 }) : '……/……/20……']),
        muc('II. THIẾT BỊ BÁO HỎNG'),
        bang([600, 2700, 1700, 700, 3371], ['STT', 'Tên thiết bị', 'Mã số/ Số serial', 'SL', 'Mô tả tình trạng hư hỏng/sự cố'], (n.tb || []).map((x, i) => [i + 1, x.ten, x.ma || '', soVN(x.sl), x.tinh_trang || '']), 3),
        muc('III. MÔ TẢ CHI TIẾT DIỄN BIẾN SỰ CỐ (nếu có)'), vanBan(n.dien_bien),
        muc('IV. ĐỀ XUẤT HƯỚNG XỬ LÝ (nếu có)'), vanBan(n.de_xuat),
        muc('V. PHẦN TIẾP NHẬN VÀ XỬ LÝ CỦA THỢ'),
        P(['Người tiếp nhận: ', GT(tn && tn.nguoi, 14), '   Ngày nhận: ', tn ? R(ngay(tn.tg), { b: 1 }) : '……/……/20……']),
        P(['Kết quả kiểm tra: ', GT(n.ket_qua, 26)]),
        P(['Hướng xử lý:   ', o2('Sửa chữa'), '     ', o2('Thay thế'), '     ', o2('Thanh lý'), '     ', o2('Khác'), ': ', GT(n.huong_khac, 5)]),
        P(['Ngày hoàn thành xử lý: ', ht ? R(ngay(ht.tg), { b: 1 }) : '……/……/20……']),
        ky([['NGƯỜI BÁO CÁO (GV)', d.ho_ten], ['NGƯỜI SỬA CHỮA', n.nguoi_sua], ['NGƯỜI TIẾP NHẬN (PTN)', tn && tn.nguoi]], 3)]); };

    // bám "Phiếu đề nghị sửa chữa thiết bị" / "Phiếu đề nghị bổ sung thiết bị"
    const deNghi = (ten, cauMo, cotTT, trinh, kyPTN) => (d) => { const n = d.nd, tn = n.tiep_nhan;
      return [{ hd: 1 }, P(R(dongNgay(d.tg), { i: 1 }), { al: 'right' }), KHOANG].concat(tieuDe(ten), [
        P([R('Kính gửi: ', { i: 1 }), 'Ban lãnh đạo Khoa Khoa học Sức khỏe;'], { ind: { left: 1134 } }), P('Trưởng bộ môn, Phòng Thí nghiệm.', { ind: { left: 2268 } }), KHOANG,
        muc('1. Tóm tắt nội dung và đề nghị:'), P(cauMo(d), { al: 'both', ind: { firstLine: 567 } })],
        n.ly_do ? [P(['Nội dung: ', R(n.ly_do, { b: 1 })], { al: 'both', ind: { firstLine: 567 } })] : [], [
        bang([700, 3600, 800, 2171, 1800], ['TT', 'Tên thiết bị', 'SL', cotTT, 'Ghi chú'], (n.tb || []).map((x, i) => [i + 1, x.ten, soVN(x.sl), x.tinh_trang || '', x.ghi_chu || '']), 4),
        P(trinh, { al: 'both', ind: { firstLine: 567 } }), P('Trân trọng cảm ơn./.', { al: 'both', ind: { firstLine: 567 } }),
        muc('2. Họ tên và chữ ký:'), ky([['GV ĐỀ NGHỊ', d.ho_ten], 'TRƯỞNG BỘ MÔN'], 3), KHOANG],
        n.y_kien ? [P([R('Ý kiến phụ trách PTN: ', { i: 1 }), R(n.y_kien, { b: 1 })], { al: 'both' })] : [], [
        ky([[kyPTN, tn && tn.nguoi], 'BLĐ KHOA'], 3),
        P([R('Ghi chú: ', { i: 1 }), 'Văn bản gửi trực tiếp đến: ', R('Bộ phận quản lý Phòng thí nghiệm (gửi trực tuyến)', { b: 1 }), ' ngày ', R(ngay(d.tg), { b: 1 }), '.'], { al: 'both' })]); };
    const SC = deNghi('PHIẾU ĐỀ NGHỊ SỬA THIẾT BỊ', (d) => ['Hiện nay, thiết bị tại phòng ', GT(d.phong, 8), ' bị hỏng không hoạt động được, giảng viên quản lý phòng kính đề nghị BLĐ Khoa, TBM và PTN cho kiểm tra và sửa chữa theo danh mục dưới đây.'],
      'Tình trạng hỏng', 'Kính trình BLĐ, TBM và PTN xem xét và giải quyết.', 'Ý KIẾN PHỤ TRÁCH PTN');
    const BS = deNghi('PHIẾU ĐỀ NGHỊ BỔ SUNG THIẾT BỊ', (d) => ['Hiện nay, phòng ', GT(d.phong, 8), ' cần bổ sung thiết bị phục vụ cho việc giảng dạy thực hành theo danh sách sau:'],
      'Tình trạng bàn giao', 'Kính trình BLĐ, phụ trách PTN xem xét và giải quyết.', 'PHỤ TRÁCH PTN');

    // bám "Biên bản bàn giao thiết bị PTN cho giảng viên" – ngày, bên giao điền khi PTN xác nhận bàn giao
    const LUU_Y = ['Bên nhận có trách nhiệm kiểm tra tình trạng thiết bị ngay khi nhận bàn giao; nếu phát hiện hư hỏng, thiếu phụ kiện phải báo ngay cho Phòng thí nghiệm để xác nhận trước khi ký biên bản.',
      'Trong quá trình sử dụng, nếu thiết bị xảy ra sự cố, hư hỏng, Bên nhận báo ngay cho Phòng thí nghiệm theo Biểu mẫu báo hỏng thiết bị.',
      'Khi hoàn trả, thiết bị phải đảm bảo tình trạng hoạt động và số lượng phụ kiện tương ứng như lúc bàn giao; Phòng thí nghiệm có quyền từ chối nhận lại nếu tình trạng không phù hợp.',
      'Biên bản được lập thành 02 bản, Bên giao và Bên nhận mỗi bên giữ 01 bản.'];
    const BG = (d) => { const n = d.nd, ht = xong(d), tg = [d.tu_ngay && 'từ ' + ngay(d.tu_ngay), d.den_ngay && 'đến ' + ngay(d.den_ngay)].filter(Boolean).join(' ');
      return [{ hd: 1 }, P(R(dongNgay(ht && ht.tg), { i: 1 }), { al: 'right' }), KHOANG].concat(tieuDe('BIÊN BẢN BÀN GIAO THIẾT BỊ', '(Phòng thí nghiệm bàn giao thiết bị cho Giảng viên sử dụng)'), [
        P(['Hôm nay, ngày ', ht ? R(ngay(ht.tg), { b: 1 }) : '….. tháng ….. năm 20…..', ', tại Phòng thí nghiệm Khoa Khoa học Sức khỏe – Đại học Công nghiệp TP. Hồ Chí Minh, chúng tôi gồm:'], { al: 'both' }),
        muc('I. BÊN GIAO (Phòng thí nghiệm)'), P(['Họ và tên: ', GT(ht && ht.nguoi, 22), '     Chức vụ/Vai trò: Quản lý PTN']),
        muc('II. BÊN NHẬN (Giảng viên)'), P(['Họ và tên: ', GT(d.ho_ten, 22), '     Bộ môn: ', GT(d.bo_mon, 12)]),
        P(['Phòng sử dụng: ', GT(d.phong, 8), '     Thời gian sử dụng dự kiến: ', GT(tg, 18)]),
        muc('III. DANH MỤC THIẾT BỊ BÀN GIAO'),
        bang([560, 2400, 1500, 700, 600, 1911, 1400], ['STT', 'Tên thiết bị', 'Mã số/ Số serial', 'ĐVT', 'SL', 'Tình trạng thiết bị lúc bàn giao', 'Ghi chú'],
          (n.tb || []).map((x, i) => [i + 1, x.ten, x.ma || '', x.dvt || '', soVN(x.sl), x.tinh_trang || '', x.ghi_chu || '']), 4),
        muc('IV. LƯU Ý')], LUU_Y.map(x => P('-  ' + x, { al: 'both' })), [
        ky([['BÊN NHẬN', d.ho_ten], ['BÊN GIAO', ht && ht.nguoi]], 3), KHOANG, ky(['TRƯỞNG BM', ['TRƯỞNG KHOA', (window.PTN_KY || {}).truong_khoa]], 3)]); };

    // mẫu của Trường "Giấy báo mang tài sản ra khỏi / vào cơ quan" (TCHC – mẫu số 28): đại diện lãnh đạo Khoa ký bên giao (ra) / bên nhận (vào)
    // người lập phiếu ở cột Người nhận (vào) / Người giao (ra): họ tên, điện thoại, chừa chỗ ký; cột còn lại viết tay
    const nguoiKy = (d) => [d.ho_ten, d.sdt && 'ĐT: ' + d.sdt, '\u00a0', '\u00a0'].filter(Boolean).join('\n');
    const GIAY = (d) => { const n = d.nd, ra = n.chieu !== 'vao', tk = (window.PTN_KY || {}).truong_khoa, nk = nguoiKy(d);
      return [P(R('TCHC – mẫu số 28', { b: 1 }), { al: 'right' }), { hd: 'truong' }, P(R(dongNgay(d.tu_ngay), { i: 1 }), { al: 'right' }), KHOANG,
        P(R(ra ? 'GIẤY BÁO MANG TÀI SẢN RA KHỎI CƠ QUAN' : 'GIẤY BÁO MANG TÀI SẢN VÀO CƠ QUAN', { b: 1, sz: 28 }), { al: 'center' }), KHOANG,
        P('Kính gửi:', { ind: { left: 1134 } })].concat((ra ? ['- Ban Giám hiệu;', '- Phòng Tổ chức – Hành chính;', '- Phòng QLKTX.'] : ['- Phòng Tổ chức – Hành chính;', '- Phòng QLKTX.']).map(x => P(x, { ind: { left: 1134 } })), [KHOANG,
        P(['Lý do: ', GT(n.ly_do, 38)], { al: 'both' }), KHOANG,
        bang([600, 2700, 1300, 1000, 1735, 1736], ['TT', 'Danh mục', 'ID', 'Số lượng', 'Người giao (Họ tên và chữ ký)', 'Người nhận (Họ tên và chữ ký)'],
          (n.tb || []).map((x, i) => [i + 1, x.ten, x.ma || '', soVN(x.sl), ra ? nk : '', ra ? '' : nk]), 4), KHOANG],
        ra ? [ky(['Xác nhận của bảo vệ', 'Phòng Tổ chức – Hành chính', 'Ban Giám hiệu'], 4), ky([['Đại diện lãnh đạo bên giao', tk]], 3)]
          : [ky(['Xác nhận của bảo vệ', 'Phòng Tổ chức – Hành chính', ['Đại diện lãnh đạo bên nhận', tk]], 4)]); };
    // tờ trình kèm giấy báo mang tài sản ra (bám "Phiếu đề nghị giải quyết công việc" – MAU CUA TRUONG / To trinh giai quyet cong viec.docx)
    const TO_TRINH = (d) => { const n = d.nd, K = window.PTN_KY || {}, gt = { al: 'both', ind: { firstLine: 567 } };
      return [{ hd: 'truong' }, P(R(dongNgay(d.tg), { i: 1 }), { al: 'right' }), KHOANG, P(R('PHIẾU ĐỀ NGHỊ GIẢI QUYẾT CÔNG VIỆC', { b: 1, sz: 28 }), { al: 'center' }), KHOANG,
        P('Kính gửi:   - Ban Giám hiệu;', { ind: { left: 1134 } }), P('- Phòng Tổ chức – Hành chính;', { ind: { left: 2268 } }), P('- Phòng QLKTX.', { ind: { left: 2268 } }), KHOANG,
        P('•  Đơn vị đề nghị: Khoa Khoa học Sức khỏe'),
        P(['•  Các văn bản kèm theo: Giấy báo mang tài sản vào cơ quan ', GT(n.ma_vao, 10), '; Giấy báo mang tài sản ra khỏi cơ quan (mã phiếu ', R(d.id || '……', { b: 1 }), ').'], { al: 'both' }),
        P('•  Nội dung: Đem tài sản ra khỏi cơ quan'), KHOANG,
        muc('1. Tóm tắt nội dung và đề nghị:'),
        P(['Khoa Khoa học Sức khỏe nhận được đề nghị của giảng viên ', GT(d.ho_ten, 12), ', Bộ môn ', GT(d.bo_mon, 10), ', số điện thoại ', GT(d.sdt, 8), ', về việc mang tài sản ra khỏi cơ quan, cụ thể như sau:'], gt),
        P(['•  Tên tài sản: ', GT((n.tb || []).map(x => x.ten + (x.ma ? ' (ID: ' + x.ma + ')' : '') + ' – số lượng ' + soVN(x.sl)).join('; '), 30)], { al: 'both', ind: { left: 567 } }),
        P(['•  Lý do đem ra: ', GT(n.ly_do, 30)], { al: 'both', ind: { left: 567 } }),
        P(['Các tài sản trên do giảng viên mang vào cơ quan theo Giấy báo mang tài sản vào cơ quan ', n.ma_vao ? R(n.ma_vao, { b: 1 }) : 'ngày ……/……/20……', ' (đính kèm) để phục vụ nghiên cứu khoa học và không thuộc tài sản của Trường.'], gt),
        P('Khoa Khoa học Sức khỏe kính trình Ban Giám hiệu xem xét, phê duyệt để giảng viên hoàn tất thủ tục theo Giấy báo mang tài sản ra khỏi cơ quan (mẫu số 28).', gt), P('Trân trọng cảm ơn!', gt), KHOANG,
        muc('2. Họ tên và chữ ký:'), ky([['Người đề nghị', K.nguoi_lap], ['Trưởng đơn vị', K.truong_khoa], 'Phòng Tổ chức – Hành chính'], 3), KHOANG,
        ky(['3. Ý kiến của Phó Hiệu trưởng', ['4. Phê duyệt của Hiệu trưởng', K.hieu_truong]], 3), KHOANG,
        P([R('Ghi chú: ', { i: 1 }), R('- Văn bản gửi trực tiếp đến: ……………………… ngày …… tháng …… năm 20……', { i: 1 })]),
        P(R('- Văn bản gửi qua văn thư: ……………………… ngày …… tháng …… năm 20……', { i: 1 }), { ind: { left: 850 } })]; };
    // giấy báo vào: một trang; giấy báo ra: tờ trình (trang 1) + giấy báo (trang 2)
    const TS = (d) => d.nd.chieu === 'ra' ? { trang: [TO_TRINH(d), GIAY(d)] } : GIAY(d);

    const Q = window.PTN_DON_QR;
    Q.them('GV-BH', 'Biểu mẫu báo hỏng thiết bị', BH); Q.them('GV-SC', 'Phiếu đề nghị sửa chữa thiết bị', SC); Q.them('GV-BS', 'Phiếu đề nghị bổ sung thiết bị', BS);
    Q.them('GV-BG', 'Biên bản bàn giao thiết bị cho giảng viên', BG); Q.them('GV-TS', 'Giấy báo mang tài sản vào / ra cơ quan', TS);
  }
  window.PTN_PHIEU_GV = { LOAI, ve, doc, tomTat };
})();
