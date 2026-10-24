/* Trang quản lý – giai đoạn 2 – 6: Hôm nay, đơn QR1 – QR8, hồ sơ đề tài, lịch phòng, kho hóa chất, báo cáo, sổ theo dõi – in ấn, cài đặt. */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { S, $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, homNay, boDau, tien, fmt, tag, hanTag, laAdmin, coQuyen, dieuHuong, napXlsx, napQR, guiTep, taiVe, dsPhongChon, lienKet, trangCongKhai } = Q;
  const QR_TEN = { QR1: 'Mượn phòng, TB – DC trong ngày', QR2: 'GV mượn TB dài ngày', QR3: 'Cấp hóa chất bổ sung', QR4: 'Mượn chìa khóa (Bảo vệ)',
    QR5: 'Nhật ký sử dụng', QR6: 'Đăng ký tủ', QR7: 'Hồ sơ đề tài', QR8: 'Mượn thêm dụng cụ' };
  const MAU = { 'Chờ duyệt': 't-info', 'Đã duyệt': 't-info', 'Đang mượn': 't-warn', 'Đang dùng': 't-warn', 'Đã trả – hoàn tất': 't-ok', 'Đã cấp phát': 't-ok', 'Từ chối': 't-gray',
    'Chờ nộp bản ký': 't-info', 'Đã nhận đơn ký': 't-info', 'Đã duyệt – đang thực hiện': 't-warn', 'Gia hạn': 't-warn', 'Chờ trả đồ': 't-warn', 'Đã đóng': 't-ok' };
  const tagTT = (t, qh) => '<span class="tag ' + (qh ? 't-bad' : MAU[t] || 't-gray') + '">' + esc(qh ? t + ' · quá hạn' : t) + '</span>';
  const ganLink = (root) => root.querySelectorAll('[data-href]').forEach(el => { el.onclick = () => { location.hash = el.dataset.href; }; });
  const st = (n, l, cls, href) => '<div class="stat ' + (cls || '') + (href ? ' link" data-href="' + href : '') + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>';
  const xem = (html) => { const w = window.open('', '_blank'); if (!w) { toast('Trình duyệt chặn cửa sổ in – cho phép cửa sổ bật lên', true); return; } w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); };
  const CSS_IN = '@page{size:A4;margin:14mm}body{font:12.5px/1.4 "Times New Roman",serif;color:#000;margin:0}h1{text-align:center;font-size:16px;margin:10px 0 4px}.c{text-align:center}.r{text-align:right}' +
    'table.ds{width:100%;border-collapse:collapse;margin:6px 0}table.ds th,table.ds td{border:1px solid #000;padding:3px 5px}table.ds th{background:#eee}table.ky{width:100%;margin-top:16px;text-align:center}table.ky td{padding-bottom:64px;vertical-align:top}';
  const dauTrang = '<table style="width:100%"><tr><td class="c">ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH<br><b>KHOA KHOA HỌC SỨC KHỎE</b><br>———</td><td class="c"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b>Độc lập – Tự do – Hạnh phúc</b><br>———</td></tr></table>';
  // khối chữ ký trang in HTML: [chức danh, họ tên] – họ tên in đậm dưới khoảng ký
  const oKy = (ds) => '<table class="ky"><tr>' + ds.map(x => '<td><b>' + esc(x[0]) + '</b><br><i>(Ký, ghi rõ họ tên)</i><div style="margin-top:62px"><b>' + esc(x[1] || '') + '</b></div></td>').join('') + '</tr></table>';
  async function svgQR(text, cell) { try { const QR = await napQR(), q = QR(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell || 2, margin: 0 }); } catch (e) { return ''; } }
  function napScript(url, ten) {
    if (window[ten]) return Promise.resolve(window[ten]);
    return new Promise((ok, loi) => { const s = document.createElement('script'); s.src = url; s.onload = () => ok(window[ten]); s.onerror = () => loi(new Error('Không tải được thư viện (cần mạng)')); document.head.appendChild(s); });
  }
  function tomTat(d) {
    return [d.nd.nhanh && d.qr === 'QR8' && '[' + d.nd.nhanh + ']', d.phong && 'Phòng ' + d.phong, d.tu && 'Tủ ' + d.tu, d.qr !== 'QR1' && d.ten_tb && d.ten_tb.length && d.ten_tb.join(', '), d.qr === 'QR1' && dsMuonThem(d).join('; '), d.lop_hp && 'LHP ' + d.lop_hp, !d.lop_hp && d.nd.ten_mon, d.hs && 'Đề tài ' + d.hs,
      (d.nd.dong || []).length && d.nd.dong.map(x => x.ten + ' ' + fmt(x.sl) + (x.dvt ? ' ' + x.dvt : '')).join('; '), d.nd.noi_dung, d.nd.muc_dich].filter(Boolean).join(' · ');
  }
  const thoiGian = (d) => d.qr === 'QR5' ? ngayVN(d.tu_ngay) + (d.den_ngay ? ' → ' + d.den_ngay.slice(11) : ' → đang dùng') : [d.tu_ngay && ngayVN(d.tu_ngay), d.den_ngay && 'hạn ' + ngayVN(d.den_ngay)].filter(Boolean).join(' · ');

  // ---------------- Hôm nay ----------------
  async function manHomNay() {
    const nd = trang('Hôm nay · ' + ngayVN(homNay()), '<a class="btn o sm" href="#/ts-tong-quan">Tổng quan tài sản – phòng</a>');
    const [h, t] = await Promise.all([api('hom_nay'), api('tong_quan')]);
    const tt = t.theo_tinh_trang, cho = h.cho_xu_ly;
    let x = '<h2>Đơn chờ xử lý</h2><div class="grid g4" style="margin-bottom:14px">' + Object.keys(QR_TEN).map(q => st(cho[q] || 0, '<b>' + q + '</b> – ' + QR_TEN[q], cho[q] ? 'warn' : 'ok', q === 'QR7' ? '#/de-tai' : '#/don/' + q)).join('') + '</div>';
    const canh = [];
    h.qua_han.forEach(d => canh.push('⚠ <b>' + d.qr + '</b> <a href="#/don/' + d.qr + '/' + esc(d.id) + '">' + esc(d.id) + '</a> – ' + esc(d.ho_ten) + ' quá hạn ' + esc(ngayVN(d.den_ngay)) + ' – ' + esc(tomTat(d)).slice(0, 120)));
    h.hs_qua_han.forEach(x2 => canh.push('⚠ Hồ sơ <a href="#/de-tai/' + esc(x2.id) + '">' + esc(x2.id) + '</a> quá hạn ' + ngayVN(x2.den_ngay) + ' – ' + esc(x2.ten)));
    t.qua_han_tra.forEach(x2 => canh.push('⚠ <a href="#/tai-san/' + esc(x2.id) + '">' + esc(x2.ten) + '</a> – ' + esc(x2.nguoi_muon) + ' quá hạn trả ' + hanTag(x2.han_tra)));
    t.tu_qua_han.forEach(x2 => canh.push('⚠ Tủ <a href="#/phong/' + esc(x2.phong) + '">' + esc(x2.phong) + ' – ' + esc(x2.so) + '</a> – ' + esc(x2.nguoi) + ' quá hạn ' + hanTag(x2.han)));
    if (t.kiem_dinh.qua_han) canh.push('⚠ <a href="#/kiem-dinh">' + t.kiem_dinh.qua_han + ' thiết bị quá hạn kiểm định</a>');
    if (t.kiem_dinh.trong_30) canh.push('• <a href="#/kiem-dinh">' + t.kiem_dinh.trong_30 + ' thiết bị kiểm định trong 30 ngày</a>');
    const hong = (tt['Hỏng – chờ sửa'] || 0) + (tt['Đang sửa'] || 0); if (hong) canh.push('⚠ <a href="#/tai-san?tt=hong">' + hong + ' thiết bị hỏng / đang sửa</a>');
    [['HC', 'kho', 'Kho hóa chất'], ['DL', 'kho-dl', 'Kho dược liệu']].forEach(([m, d, t]) => { const k = h.kho[m]; if (k.het || k.sap_het) canh.push('⚗ <a href="#/' + d + '">' + t + ': ' + [k.het && k.het + ' hết hàng', k.sap_het && k.sap_het + ' sắp hết'].filter(Boolean).join(', ') + '</a>'); });
    if (h.ngoai_dm) canh.push('• ' + h.ngoai_dm + ' dòng hóa chất / dụng cụ ngoài định mức từ QR3, QR8 (xem trong <a href="#/bien-ban">biên bản</a>)');
    if (h.nghi) canh.push('⚠ <a href="#/bao-cao/khac">' + h.nghi + ' máy gửi đơn cho nhiều người – nghi đăng ký thay</a>');
    h.so.forEach(s => canh.push('⚠ <a href="#/so/' + s.loai + '">' + esc(s.ten) + ': ' + s.qua_han + ' mục quá hạn</a>'));
    if (h.hs_cho_nop || h.hs_da_nhan) canh.push('• Hồ sơ đề tài: <a href="#/de-tai">' + h.hs_cho_nop + ' chờ nộp bản ký, ' + h.hs_da_nhan + ' đã nhận đơn – chờ duyệt</a>');
    x += '<div class="card"><h2>Cần chú ý (' + canh.length + ')</h2>' + (canh.length ? canh.map(c => '<div class="chu-y ' + (/^⚠/.test(c) ? 'nang' : /^⚗/.test(c) ? 'kho' : '') + '">' + c.replace(/^(⚠|•|⚗)\s*/, '') + '</div>').join('') : '<div class="note">Không có việc quá hạn.</div>') + '</div>';
    if (h.qr1_chua_tra.length) x += '<div class="card" style="border-color:#E7B4B0"><h2 style="color:var(--bad)">QR1 – mượn trong ngày, đã qua ngày chưa báo trả (' + h.qr1_chua_tra.length + ')</h2><div class="tbl-wrap"><table><thead><tr><th>Đơn</th><th>Người mượn</th><th>Phòng / thiết bị</th><th>Ngày mượn</th><th>Đã đòi</th><th></th></tr></thead><tbody>' +
      h.qr1_chua_tra.map(d => '<tr><td class="mono"><a href="#/don/QR1/' + esc(d.id) + '">' + esc(d.id) + '</a></td><td><b>' + esc(d.ho_ten) + '</b><div class="note">' + esc(d.ma_so + ' · ' + d.sdt) + '</div></td><td>' + esc(tomTat(d)).slice(0, 140) + '</td><td>' + ngayVN(d.tu_ngay) + ' → ' + esc((d.den_ngay || '').slice(11)) + '</td>' +
        '<td>' + (d.nd.so_lan_doi ? d.nd.so_lan_doi + ' lần<div class="note">' + ngayVN(d.nd.doi_luc) + '</div>' : '—') + '</td><td class="btns"><button class="btn sm" data-q1="' + esc(d.id) + ':tra">Xác nhận đã trả</button><button class="btn o sm" data-q1="' + esc(d.id) + ':doi">Đã đòi</button></td></tr>').join('') + '</tbody></table></div></div>';
    x += '<div class="card"><h2>Đang sử dụng – đang mượn (' + h.dang_dung.length + ')</h2>' + (h.dang_dung.length ? '<div class="tbl-wrap"><table><thead><tr><th>Đơn</th><th>Người</th><th>Nội dung</th><th>Thời gian</th><th></th></tr></thead><tbody>' +
      h.dang_dung.map(d => '<tr><td><b>' + d.qr + '</b> <span class="mono">' + esc(d.id) + '</span></td><td>' + esc(d.ho_ten) + '<div class="note">' + esc(d.ma_so) + ' · ' + esc(d.sdt) + '</div></td><td>' + esc(tomTat(d)).slice(0, 160) + '</td><td>' + thoiGian(d) +
        (d.qua_han ? ' <span class="tag t-bad">quá hạn</span>' : '') + '</td><td><button class="btn o sm" data-mo="' + esc(d.id) + '">' + (d.qr === 'QR5' ? 'Kết thúc' : 'Nhận trả') + '</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="note">Không có.</div>') + '</div>';
    x += '<h2>Phòng thí nghiệm</h2><div class="grid g3">' + t.phong.map(p => '<div class="card room" data-href="#/phong/' + esc(p.ma) + '"><div class="code">' + esc(p.ma) + '</div><div>' + esc(p.ten) + '</div>' +
      '<div class="meta"><span>⚙ ' + p.tb + ' thiết bị</span><span>▣ Tủ: ' + p.tu_dung + ' đang dùng · ' + p.tu_trong + ' trống</span>' +
      '<span>' + h.dang_dung.filter(d => d.phong === p.ma && (d.qr === 'QR5' || d.qr === 'QR1')).length + ' đang sử dụng</span></div></div>').join('') + '</div>' +
      '<p class="note">Hôm nay có ' + h.hom_nay + ' đơn mới.</p>';
    nd.innerHTML = x; ganLink(nd);
    nd.querySelectorAll('[data-mo]').forEach(b => { b.onclick = () => hopDon(b.dataset.mo); });
    nd.querySelectorAll('[data-q1]').forEach(b => { b.onclick = async (e) => {
      const [id, hd] = b.dataset.q1.split(':');
      if (hd === 'tra' && !confirm('Xác nhận đã nhận lại phòng / thiết bị của đơn ' + id + '?')) return;
      await chay(e.target, () => api('don_xu_ly', { id, hd, tinh_trang: hd === 'tra' ? 'Bình thường' : undefined })); toast(hd === 'tra' ? 'Đã ghi nhận trả' : 'Đã ghi nhận đòi'); dieuHuong();
    }; });
  }

  // ---------------- Đơn QR1 – QR8 ----------------
  // QR1: tách Nội dung thành Phòng (mỗi phòng một dòng) và Thiết bị – dụng cụ MƯỢN THÊM (mỗi thứ một dòng);
  // thiết bị chọn trong phòng không hiện ở đây – khi giao đơn chúng vào nhật ký sử dụng QR5
  const dsPhongDon = (d) => String(d.phong || '').split(/\s*,\s*/).filter(Boolean);
  const dsMuonThem = (d) => (d.nd.dung_cu_ds || []).map(x => x.ten + ' – SL ' + fmt(x.sl) + (x.ghi_chu ? ' (' + x.ghi_chu + ')' : ''))
    .concat(!d.nd.dung_cu_ds && d.nd.dung_cu ? String(d.nd.dung_cu).split(/\s*;\s*/).filter(Boolean) : []);
  const mucDichQR1 = (d) => [d.nd.noi_dung, d.nd.muc_dich].filter(Boolean).join(' · ');
  async function manDon(p) {
    const qr = /^QR[1-8]$/.test(p[1] || '') ? p[1] : 'QR1';
    if (qr === 'QR7') { location.hash = '#/de-tai'; return; }
    const tabs = Object.keys(QR_TEN).map(k => '<a class="btn sm ' + (k === qr ? 'chon' : 'o') + '" href="' + (k === 'QR7' ? '#/de-tai' : '#/don/' + k) + '" title="' + esc(QR_TEN[k]) + '">' + k + '</a>').join('');
    const nd = trang('Đơn ' + qr + ' · ' + esc(QR_TEN[qr]), '<button class="btn o sm" id="b-xuat">Xuất Excel</button>', '<span class="btns">' + tabs + '</span>');
    const ds = await api('don_ds', { qr }); S.cache.don = ds;
    const dem = (f) => ds.filter(f).length, mo = (d) => ['Đã trả – hoàn tất', 'Đã cấp phát', 'Từ chối'].indexOf(d.trang_thai) < 0;
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm tên, MSSV, mã đơn, phòng, nội dung…"><select id="f-tt">' +
      [['chua', 'Chưa xong (' + dem(mo) + ')'], ['Chờ duyệt', 'Chờ duyệt (' + dem(d => d.trang_thai === 'Chờ duyệt') + ')'], ['Đã duyệt', 'Đã duyệt (' + dem(d => d.trang_thai === 'Đã duyệt') + ')'],
        ['dang', 'Đang mượn / đang dùng (' + dem(d => d.trang_thai === 'Đang mượn' || d.trang_thai === 'Đang dùng') + ')'], ['qh', 'Quá hạn (' + dem(d => d.qua_han) + ')'],
        qr === 'QR3' ? ['Đã cấp phát', 'Đã cấp phát (' + dem(d => d.trang_thai === 'Đã cấp phát') + ')'] : ['Đã trả – hoàn tất', 'Hoàn tất (' + dem(d => d.trang_thai === 'Đã trả – hoàn tất') + ')'], ['Từ chối', 'Từ chối (' + dem(d => d.trang_thai === 'Từ chối') + ')'], ['', 'Tất cả (' + ds.length + ')']]
        .map(x => '<option value="' + x[0] + '">' + x[1] + '</option>').join('') + '</select><label class="check" style="margin:0"><input type="checkbox" id="f-nghi"> Nghi đăng ký thay</label></div><div id="kq"></div>';
    const ve = () => {
      const q = boDau($('q').value), tt = $('f-tt').value, nghi = $('f-nghi').checked;
      const l = ds.filter(d => (!q || boDau([d.id, d.ho_ten, d.ma_so, d.sdt, tomTat(d)].join(' ')).indexOf(q) >= 0) && (!nghi || d.nghi) &&
        (tt === '' || (tt === 'chua' ? mo(d) : tt === 'dang' ? (d.trang_thai === 'Đang mượn' || d.trang_thai === 'Đang dùng') : tt === 'qh' ? d.qua_han : d.trang_thai === tt)));
      $('kq').innerHTML = !l.length ? '<div class="card empty">Không có đơn nào.</div>' : '<div class="tbl-wrap"><table><thead><tr><th>Mã đơn</th><th>Gửi lúc</th><th>Người đăng ký</th>' + (qr === 'QR1' ? '<th>Phòng</th><th>Thiết bị – dụng cụ mượn thêm</th>' : '<th>Nội dung</th>') + '<th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody>' +
        l.slice(0, 500).map(d => '<tr class="click" data-id="' + esc(d.id) + '"><td class="mono">' + esc(d.id) + '</td><td style="white-space:nowrap">' + ngayVN(d.tg) + '</td><td><b>' + esc(d.ho_ten) + '</b><div class="note">' + esc(d.ma_so + ' · ' + d.doi_tuong) + '</div>' +
          (d.nghi ? '<span class="tag t-bad" title="Một máy gửi cho nhiều người, hoặc một người gửi từ nhiều máy">⚠ nghi đăng ký thay</span>' : '') + (d.nd.dang_ky_thay ? ' <span class="tag t-gray">SV đăng ký thay GV</span>' : '') + '</td>' + (qr === 'QR1'
            ? '<td style="white-space:nowrap">' + dsPhongDon(d).map(x => '<div><b>' + esc(x) + '</b></div>').join('') + '</td><td>' +
              (dsMuonThem(d).length ? dsMuonThem(d).map(x => '<div>• ' + esc(x) + '</div>').join('') : '<div class="note">—</div>') +
              (mucDichQR1(d) ? '<div class="note" style="margin-top:4px">' + esc(mucDichQR1(d)) + '</div>' : '') + '</td>'
            : '<td>' + esc(tomTat(d)).slice(0, 200) + '</td>') + '<td>' + thoiGian(d) + '</td><td>' + tagTT(d.trang_thai, d.qua_han) + '</td><td class="btns">' + nutNhanh(d) + '</td></tr>').join('') +
        '</tbody></table></div>' + (l.length > 500 ? '<p class="note">Hiện 500 / ' + l.length + ' đơn – lọc thêm để xem.</p>' : '');
      S.cache.donIds = l.slice(0, 500).map(d => d.id);
      $('kq').querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = (e) => { if (e.target.closest('button')) return; hopDon(tr.dataset.id); }; });
      $('kq').querySelectorAll('[data-nhanh]').forEach(b => { b.onclick = async (e) => {
        const [id, hd] = b.dataset.nhanh.split(':'), d = ds.find(x => x.id === id);
        if (hd === 'mo') return hopDon(id);
        await chay(e.target, () => api('don_xu_ly', { id, hd })); toast(b.textContent + ': ' + id); dieuHuong();
      }; });
    };
    ['q', 'f-tt', 'f-nghi'].forEach(id => { $(id).oninput = ve; $(id).onchange = ve; });
    ve();
    $('b-xuat').onclick = () => window.PTN_IN.xemTruoc({ ten: 'Don ' + qr + ' ' + homNay(), trang: [window.PTN_IN.bang({ ten: 'Don ' + qr, huong: 'ngang', tieuDe: 'DANH SÁCH ĐƠN ' + qr + ' – ' + QR_TEN[qr].toUpperCase(),
      phuDe: 'Xuất ngày ' + ngayVN(homNay()) + ' · ' + ds.length + ' đơn', cot: [{ ten: 'STT', rong: 5, can: 'c' }, { ten: 'MÃ ĐƠN', rong: 10 }, { ten: 'GỬI LÚC', rong: 15 }, { ten: 'HỌ TÊN', rong: 20 }, { ten: 'MSSV / MÃ VC', rong: 12 }, { ten: 'ĐIỆN THOẠI', rong: 12 },
        ...(qr === 'QR1' ? [{ ten: 'PHÒNG', rong: 14 }, { ten: 'THIẾT BỊ – DỤNG CỤ MƯỢN THÊM', rong: 30 }, { ten: 'NỘI DUNG – MỤC ĐÍCH', rong: 20 }] : [{ ten: 'NỘI DUNG', rong: 42 }]),
        { ten: 'THỜI GIAN', rong: 22 }, { ten: 'TRẠNG THÁI', rong: 15 }, { ten: 'NGƯỜI XỬ LÝ', rong: 15 }],
      dong: ds.map((d, i) => [i + 1, d.id, ngayVN(d.tg), d.ho_ten, d.ma_so, d.sdt].concat(qr === 'QR1' ? [dsPhongDon(d).join('\n'), dsMuonThem(d).join('\n'), mucDichQR1(d)] : [tomTat(d)],
        [thoiGian(d), d.trang_thai + (d.qua_han ? ' (quá hạn)' : ''), d.nguoi_xu_ly])) })] });
    if (p[2]) hopDon(decodeURIComponent(p[2]));
  }
  function nutNhanh(d) {
    const b = (hd, t, cls) => '<button class="btn ' + (cls || 'o') + ' sm" data-nhanh="' + esc(d.id) + ':' + hd + '">' + t + '</button>';
    const coBang = d.qr === 'QR3' || d.qr === 'QR8';
    if (d.trang_thai === 'Chờ duyệt') return (coBang ? b('mo', 'Xem – cấp') : b('duyet', 'Duyệt') + b('giao', { QR4: 'Giao chìa', QR6: 'Giao tủ' }[d.qr] || 'Giao', ''));
    if (d.trang_thai === 'Đã duyệt') return coBang ? b('mo', 'Cấp / giao', '') : b('giao', { QR4: 'Giao chìa', QR6: 'Giao tủ' }[d.qr] || 'Giao', '');
    if (d.trang_thai === 'Đang mượn' || d.trang_thai === 'Đang dùng') return b('mo', d.qr === 'QR5' ? 'Kết thúc' : 'Nhận trả');
    return '';
  }
  const TINH_TRANG_TRA = { QR1: ['Bình thường', 'Hư hỏng', 'Thiếu'], QR2: ['Bình thường', 'Hỏng – chờ sửa', 'Thiếu phụ kiện'], QR4: ['Bình thường', 'Chưa vệ sinh', 'Hư hỏng'], QR5: ['Bình thường', 'Bất thường – hư hỏng'] };
  const ND_TEN = { noi_dung: 'Nội dung', muc_dich: 'Mục đích', gvhd: 'GVHD / GV dạy', dung_cu: 'Thiết bị, dụng cụ mượn thêm', so_nguoi: 'Số người', tinh_trang_truoc: 'Tình trạng trước', tinh_trang_sau: 'Tình trạng sau',
    ten_mon: 'Môn thực hành', khong_bb: 'Không ghi vào biên bản', de_tai: 'Đề tài', dung_cho: 'Dùng cho',
    ghi_chu_sau: 'Mô tả sau sử dụng', do_dung: 'Đồ dùng trong tủ', bai: 'Bài thực hành', ly_do: 'Lý do cấp bổ sung', noi_su_dung: 'Nơi sử dụng', hoc_phan: 'Học phần / lớp', ghi_chu: 'Ghi chú', dang_ky_thay: 'Lưu ý', so_lan_doi: 'Số lần đã đòi trả', nhanh: 'Mượn cho', ten_mon: 'Môn thực hành', ten_hs: 'Đề tài' };
  const DUNG_CHO = { lop: 'Lớp thực hành', hs: 'Đồ án / đề tài của sinh viên', ca_nhan: 'Đề tài cá nhân' }; // QR2
  async function hopDon(id) {
    const d = await api('don_ct', { id }), dsId = S.cache.donIds || [], vt = dsId.indexOf(id);
    const tt = d.trang_thai, dangMo = tt === 'Đang mượn' || tt === 'Đang dùng', coBang = d.qr === 'QR3' || d.qr === 'QR8', choGiao = tt === 'Chờ duyệt' || tt === 'Đã duyệt';
    const kv = [['Người đăng ký', d.ho_ten + ' – ' + d.ma_so + ' (' + d.doi_tuong + ')'], ['Lớp / bộ môn', [d.lop, d.bo_mon].filter(Boolean).join(' · ')], ['Liên hệ', [d.sdt, d.email].filter(Boolean).join(' · ')],
      ['Phòng', d.qr === 'QR1' ? dsPhongDon(d).join('\n') : d.phong], ['Tủ', d.tu], ['Thiết bị', d.qr === 'QR1' ? '' : d.ten_tb.join('; ')],
      ['Thiết bị, dụng cụ mượn thêm', d.qr === 'QR1' ? dsMuonThem(d).join('\n') : ''], ['Lớp học phần', d.lop_hp], ['Từ', ngayVN(d.tu_ngay)], ['Đến / hạn', ngayVN(d.den_ngay)]]
      .concat(Object.keys(ND_TEN).filter(k => d.nd[k] && !(d.qr === 'QR1' && k === 'dung_cu')).map(k => [ND_TEN[k], k === 'dung_cho' ? DUNG_CHO[d.nd[k]] || d.nd[k] : String(d.nd[k])])).filter(x => x[1]);
    let h = (vt >= 0 ? '<div class="nav-ds" style="float:right"><button class="btn o sm" data-nav="' + esc(dsId[vt - 1] || '') + '"' + (vt ? '' : ' disabled') + '>‹ Trước</button><span class="note">' + (vt + 1) + ' / ' + dsId.length + '</span><button class="btn o sm" data-nav="' + esc(dsId[vt + 1] || '') + '"' + (vt < dsId.length - 1 ? '' : ' disabled') + '>Tiếp ›</button></div>' : '') +
      '<h2>' + d.qr + ' · ' + esc(d.id) + ' ' + tagTT(tt, d.qua_han) + '</h2><p class="note">' + esc(QR_TEN[d.qr]) + ' · gửi ' + ngayVN(d.tg) + ' · mã máy ' + esc(d.ma_may) + '</p>' +
      (window.PTN_DON_QR && window.PTN_DON_QR.coMau(d.qr) ? '<div class="btns" style="margin-bottom:8px"><button class="btn o sm" id="b-in-don">🖨 ' + esc(window.PTN_DON_QR.TEN[d.qr]) + ' – xem trước, in / Word</button>' + (window.PTN_DON_QR.coBienBan(d) ? '<button class="btn o sm" id="b-in-bb8">🖨 Biên bản bàn giao dụng cụ</button>' : '') + '</div>' : '') +
      (d.cung_may.length ? '<p class="err">⚠ Máy này cũng gửi đơn cho: ' + esc(d.cung_may.join('; ')) + ' – kiểm tra thẻ SV / CCCD khi giao đồ.</p>' : '') +
      (d.ly_do ? '<p class="err">Lý do từ chối: ' + esc(d.ly_do) + '</p>' : '') +
      '<dl class="kv">' + kv.map(x => '<dt>' + esc(x[0]) + '</dt><dd style="white-space:pre-line">' + esc(x[1]) + '</dd>').join('') +
      (d.hs ? '<dt>Hồ sơ đề tài</dt><dd><a href="#/de-tai/' + esc(d.hs) + '">' + esc(d.hs) + '</a></dd>' : '') + (d.bb ? '<dt>Biên bản</dt><dd><a href="#/bien-ban/' + encodeURIComponent(d.bb) + '">' + esc(d.bb) + '</a> ' + esc(d.ten_bb || '') + '</dd>' : '') + '</dl>';
    if (coBang) h += '<h2 style="margin-top:12px">' + (d.qr === 'QR3' ? 'Hóa chất – vật tư đề nghị' : 'Dụng cụ mượn thêm') + '</h2><div class="tbl-wrap"><table><thead><tr><th>Tên</th><th>ĐVT</th><th class="num">Đề nghị</th>' + (choGiao ? '<th style="width:110px">Thực ' + (d.qr === 'QR3' ? 'cấp' : 'giao') + '</th>' : '') + '</tr></thead><tbody>' +
      d.nd.dong.map((x, i) => '<tr><td>' + esc(x.ten) + (x.dong ? '' : ' <span class="tag t-warn">ngoài biên bản</span>') + '</td><td>' + esc(x.dvt) + '</td><td class="num">' + fmt(x.sl) + '</td>' + (choGiao ? '<td><input type="number" step="any" min="0" data-i="' + i + '" value="' + esc(x.sl) + '"></td>' : '') + '</tr>').join('') + '</tbody></table></div>';
    if (choGiao && d.qr === 'QR3' && !d.bb) h += '<div id="chon-bb"></div>';
    h += '<h2 style="margin-top:12px">Xử lý</h2><div id="xl">';
    if (choGiao) h += '<div class="btns">' + (tt === 'Chờ duyệt' && !coBang ? '<button class="btn o" data-hd="duyet">Duyệt</button>' : '') + (tt === 'Chờ duyệt' && coBang ? '<button class="btn o" data-hd="duyet">Duyệt (chưa cấp)</button>' : '') +
      '<button class="btn" data-hd="giao">' + ({ QR3: 'Ghi đã cấp → cộng vào biên bản', QR4: 'Giao chìa khóa', QR6: 'Giao chìa tủ', QR8: 'Ghi đã giao → biên bản dụng cụ' }[d.qr] || 'Đã giao') + '</button></div>' +
      '<div class="form-grid" style="margin-top:8px">' + o('ly_do', 'Lý do từ chối', { full: 1 }) + '</div><button class="btn red sm" data-hd="tu_choi">Từ chối</button>';
    if (dangMo) h += '<div class="form-grid">' + (TINH_TRANG_TRA[d.qr] ? o('tinh_trang', 'Tình trạng khi trả', { select: TINH_TRANG_TRA[d.qr] }) : '') + o('ghi_chu_tra', 'Ghi chú', {}) + '</div>' +
      '<div class="btns"><button class="btn" data-hd="tra">' + (d.qr === 'QR5' ? 'Kết thúc sử dụng' : { QR4: 'Nhận lại chìa khóa', QR6: 'Trả tủ', QR8: 'Nhận trả dụng cụ' }[d.qr] || 'Nhận trả') + '</button>' +
      (tt === 'Đang mượn' && d.qua_han ? '<button class="btn o" data-hd="doi">Ghi nhận đã đòi / nhắc trả' + (d.nd.so_lan_doi ? ' (đã ' + d.nd.so_lan_doi + ' lần)' : '') + '</button>' : '') + '</div>';
    h += '<div class="btns" style="margin-top:10px"><input type="text" id="gc" placeholder="Thêm ghi chú…" style="flex:1"><button class="btn o sm" data-hd="ghi_chu">Ghi chú</button><label class="btn o sm">Đính kèm tệp<input type="file" id="tep-don" hidden></label></div></div>' +
      (d.tep.length ? '<ul class="files">' + d.tep.map(f => '<li><span>📄 ' + esc(f.ten) + '</span><button class="btn o sm" data-tai="' + esc(f.id) + '">Tải về</button></li>').join('') + '</ul>' : '') +
      '<h2 style="margin-top:12px">Lịch sử xử lý</h2><ul class="timeline">' + d.xu_ly.slice().reverse().map(x => '<li><div class="when">' + ngayVN(x.tg) + ' · ' + esc(x.nguoi) + '</div><div class="what">' + esc(x.hd) + '</div>' + (x.nd ? '<div class="note">' + esc(x.nd) + '</div>' : '') + '</li>').join('') + '</ul>' +
      (d.lich_su.length ? '<p class="note">Đơn khác của người này: ' + d.lich_su.map(x => x.qr + ' ' + x.id + ' (' + x.trang_thai + ')').join(' · ') + '</p>' : '') +
      '<div class="modal-foot"><button class="btn o" data-dong>Đóng</button></div>';
    moHop(h);
    const body = $('modal-body');
    body.querySelectorAll('[data-nav]').forEach(b => { b.onclick = () => { if (b.dataset.nav) hopDon(b.dataset.nav); }; });
    if ($('b-in-don')) $('b-in-don').onclick = (e) => chay(e.target, async () => window.PTN_DON_QR.xemTruoc(d, ((await anhQR(lienKet('don/' + d.qr + '/' + d.id))) || {}).dataUrl));
    if ($('b-in-bb8')) $('b-in-bb8').onclick = (e) => chay(e.target, async () => window.PTN_DON_QR.xemTruoc(d, ((await anhQR(lienKet('don/' + d.qr + '/' + d.id))) || {}).dataUrl, 1));
    if ($('chon-bb')) { const bb = (await api('bb_ds', { hk: (S.dm.hoc_ky || [])[0] })).filter(b => b.loai === 'HC'); $('chon-bb').innerHTML = o('bb', 'Ghi vào biên bản hóa chất', { select: [['', '— Chọn —']].concat(bb.map(b => [b.id, b.ten_mon + ' (' + b.id + ')']), [['khong', 'Không ghi vào biên bản (môn ngoài thời khóa biểu)']]), v: d.nd.mon_tu_nhap ? 'khong' : '' }); }
    body.querySelectorAll('[data-tai]').forEach(b => { b.onclick = (e) => chay(e.target, () => taiVe(b.dataset.tai)); });
    $('tep-don').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; await chay(null, () => guiTep(d.id, f, 'Đính kèm đơn ' + d.id)); toast('Đã tải lên'); hopDon(id); };
    body.querySelectorAll('[data-hd]').forEach(b => { b.onclick = async (e) => {
      const hd = b.dataset.hd, x = { id, hd };
      if (hd === 'tu_choi') { x.ly_do = body.querySelector('[name=ly_do]').value.trim(); if (!x.ly_do) return toast('Nhập lý do từ chối', true); }
      if (hd === 'ghi_chu') { x.ghi_chu = $('gc').value.trim(); if (!x.ghi_chu) return toast('Nhập ghi chú', true); }
      if (hd === 'tra') { const t2 = body.querySelector('[name=tinh_trang]'); x.tinh_trang = t2 ? t2.value : ''; x.ghi_chu = body.querySelector('[name=ghi_chu_tra]').value.trim(); }
      if (hd === 'giao' && coBang) { x.dong = [...body.querySelectorAll('[data-i]')].map(i => ({ i: +i.dataset.i, sl: +i.value || 0 })); const bb = body.querySelector('[name=bb]'); if (bb) x.bb = bb.value; }
      await chay(e.target, () => api('don_xu_ly', x)); toast('Đã ghi: ' + b.textContent); dongHop(); dieuHuong();
    }; });
  }

  // ---------------- Hồ sơ đề tài ----------------
  async function manDeTai(p) {
    if (p[1]) return manHoSo(decodeURIComponent(p[1]));
    const nd = trang('Hồ sơ đề tài KLTN – NCKH (QR7)');
    const ds = await api('hs_ds');
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm mã, tên đề tài, GVHD, MSSV…"><select id="f-tt"><option value="chua">Chưa đóng</option>' + S.dm.trang_thai_hs.map(t => '<option>' + esc(t) + '</option>').join('') + '<option value="">Tất cả</option></select></div><div id="kq"></div>' +
      '<p class="note">Sinh viên tạo hồ sơ ở QR7 trên trang công khai. Đơn giấy có mã QR ở góc – quét bằng điện thoại để mở đúng hồ sơ.</p>';
    const ve = () => {
      const q = boDau($('q').value), tt = $('f-tt').value;
      const l = ds.filter(x => (!q || boDau([x.id, x.ten, x.gvhd, x.nhom.map(m => m.ho_ten + ' ' + m.ma_so).join(' ')].join(' ')).indexOf(q) >= 0) && (tt === '' || (tt === 'chua' ? ['Đã đóng', 'Từ chối'].indexOf(x.trang_thai) < 0 : x.trang_thai === tt)));
      $('kq').innerHTML = !l.length ? '<div class="card empty">Không có hồ sơ.</div>' : '<div class="tbl-wrap"><table><thead><tr><th>Mã</th><th>Đề tài</th><th>Trưởng nhóm</th><th>GVHD</th><th>Phòng – thời gian</th><th>Trạng thái</th></tr></thead><tbody>' +
        l.map(x => '<tr class="click" data-href="#/de-tai/' + esc(x.id) + '"><td class="mono">' + esc(x.id) + '</td><td><b>' + esc(x.ten) + '</b><div class="note">' + esc(x.ten_loai + ' · ' + x.nhom.length + ' thành viên') + '</div></td><td>' + esc((x.nhom[0] || {}).ho_ten) + '<div class="note">' + esc((x.nhom[0] || {}).ma_so) + '</div></td><td>' + esc(x.gvhd) +
          '</td><td>' + esc(x.phong) + (x.den_ngay ? '<div class="note">' + ngayVN(x.tu_ngay) + ' → ' + ngayVN(x.den_ngay) + '</div>' : '') + '</td><td>' + tagTT(x.trang_thai) + '</td></tr>').join('') + '</tbody></table></div>';
      ganLink($('kq')); Q.ganDieuHuong(l.map(x => '#/de-tai/' + x.id), 'hồ sơ');
    };
    $('q').oninput = ve; $('f-tt').onchange = ve; ve();
  }
  async function manHoSo(id) {
    const nd = trang('Hồ sơ ' + esc(id), '', '<a href="#/de-tai">Hồ sơ đề tài</a> ›');
    const x = await api('hs_ct', { id }), tt = x.trang_thai, dang = ['Đã duyệt – đang thực hiện', 'Gia hạn', 'Chờ trả đồ'].indexOf(tt) >= 0;
    $('main').querySelector('h1').innerHTML = esc(x.id) + ' ' + tagTT(tt);
    const nut = (hd, t, cls) => '<button class="btn ' + (cls || 'o') + ' sm" data-hd="' + hd + '">' + t + '</button>';
    const dsDon = window.PTN_PHU_LUC.danhSach(x);
    let h = '<div class="btns" style="margin-bottom:12px"><button class="btn sm" data-in="' + dsDon.map(d => d.ma).join(',') + '">🖨 Xem trước – in / tải Word ' + (dsDon.length > 1 ? 'tất cả ' + dsDon.length + ' đơn' : 'đơn') + '</button>' +
      (dsDon.length > 1 ? dsDon.map(d => '<button class="btn o sm" data-in="' + d.ma + '" title="' + esc(d.ten) + '">' + esc(d.ten.split(' – ')[0]) + '</button>').join('') : '') +
      (x.bb ? '<button class="btn o sm" id="b-in-bb-hs">🖨 Biên bản dụng cụ</button>' : '') +
      (tt === 'Chờ nộp bản ký' ? nut('nhan_don', 'Đã nhận đơn ký', '') : '') + (tt === 'Chờ nộp bản ký' || tt === 'Đã nhận đơn ký' ? nut('duyet', 'Duyệt', '') + nut('tu_choi', 'Từ chối', 'red') : '') +
      (dang ? nut('gia_han', 'Gia hạn') + (tt !== 'Chờ trả đồ' ? nut('cho_tra', 'Chuyển chờ trả đồ') : '') : '') + (dang || tt === 'Đã nhận đơn ký' ? nut('dong', 'Đóng hồ sơ', '') : '') +
      (x.pl === 3 ? nut('thu_phi', 'Ghi đã thu phí') : '') + nut('ghi_chu', 'Ghi chú') + '<label class="btn o sm">Đính kèm (bản ký, minh chứng)<input type="file" id="tep-hs" hidden></label></div>';
    h += '<div class="grid g2"><div><div class="card"><h2>' + esc(x.ten) + '</h2><dl class="kv"><dt>Loại</dt><dd>' + esc(x.ten_loai) + '</dd><dt>GVHD</dt><dd>' + esc(x.gvhd) + '</dd>' + (x.bo_mon ? '<dt>Bộ môn – khoa</dt><dd>' + esc(x.bo_mon) + '</dd>' : '') +
      '<dt>Đơn</dt><dd>' + esc(window.PTN_PHU_LUC.danhSach(x).map(d => d.ten).join('; ')) + '</dd>' + (x.phong ? '<dt>Phòng</dt><dd>' + String(x.phong).split(/\s*,\s*/).map(p => '<a href="#/phong/' + esc(p) + '">' + esc(p) + '</a>').join(', ') + (x.ngoai_gio === 'Có' ? ' · có làm ngoài giờ' : '') + '</dd><dt>Thời gian</dt><dd>' + ngayVN(x.tu_ngay) + ' → ' + hanTag(x.den_ngay) + '</dd>' : '') +
      (x.muc_dich ? '<dt>Mục đích</dt><dd>' + esc(x.muc_dich) + '</dd>' : '') + (x.pl === 3 ? '<dt>Lệ phí</dt><dd>' + esc(x.le_phi || '—') + (x.thu_phi ? ' · <b>đã thu ' + tien(x.thu_phi.so_tien) + '</b> (' + ngayVN(x.thu_phi.ngay) + ', ' + esc(x.thu_phi.nguoi) + ')' : ' · <span class="tag t-warn">chưa thu</span>') + '</dd>' : '') +
      (x.ghi_chu ? '<dt>Ghi chú</dt><dd>' + esc(x.ghi_chu) + '</dd>' : '') + '<dt>Tạo lúc</dt><dd>' + ngayVN(x.tg) + ' · mã máy ' + esc(x.ma_may) + '</dd></dl></div>' +
      '<div class="card"><h2>Nhóm (' + x.nhom.length + ')</h2><div class="tbl-wrap"><table><thead><tr><th>Họ tên</th><th>MSSV</th><th>Lớp</th><th>Điện thoại</th><th>Email</th></tr></thead><tbody>' +
      x.nhom.map(m => '<tr><td>' + esc(m.ho_ten) + (m.truong_nhom ? ' <span class="tag t-info">trưởng nhóm</span>' : '') + '</td><td class="mono">' + esc(m.ma_so) + '</td><td>' + esc(m.lop) + '</td><td>' + esc(m.sdt) + '</td><td>' + esc(m.email) + '</td></tr>').join('') + '</tbody></table></div></div>' +
      (x.ten_tb.length ? '<div class="card"><h2>Thiết bị đăng ký</h2>' + x.thiet_bi.split(',').map((t, i) => '<div>• <a href="#/tai-san/' + esc(t) + '">' + esc(x.ten_tb[i]) + '</a></div>').join('') + '</div>' : '') + '</div><div>' +
      (x.con_no.length ? '<div class="card" style="border-color:#E7B4B0"><h2 style="color:var(--bad)">Còn nợ – chưa đóng được hồ sơ</h2>' + x.con_no.map(c => '<div>• ' + esc(c) + '</div>').join('') + '</div>' : (dang ? '<div class="card"><span class="tag t-ok">✓ Không còn nợ đồ – có thể đóng hồ sơ</span></div>' : '')) +
      (x.dung_cu.length || x.bb_ct ? '<div class="card" id="the-dc"></div>' : '') +
      '<div class="card"><h2>Tệp (' + x.tep.length + ')</h2>' + (x.tep.length ? '<ul class="files">' + x.tep.map(f => '<li><span>📄 ' + esc(f.ten) + '<br><span class="note">' + esc((f.mo_ta || '') + ' · ' + ngayVN(f.tao)) + '</span></span><button class="btn o sm" data-tai="' + esc(f.id) + '">Tải về</button></li>').join('') + '</ul>' : '<div class="note">Chưa có. Có thể đính kèm ảnh / scan đơn đã ký, minh chứng đề tài.</div>') + '</div>' +
      '<div class="card"><h2>Đơn liên quan của nhóm (' + x.don_lien_quan.length + ')</h2>' + (x.so_qr5 ? '<p class="note">' + x.so_qr5 + ' lượt nhật ký sử dụng QR5 của nhóm (xem ở Dashboard thiết bị).</p>' : '') + (x.don_lien_quan.length ? x.don_lien_quan.map(d => '<div><a href="#/don/' + d.qr + '/' + esc(d.id) + '">' + d.qr + ' ' + esc(d.id) + '</a> · ' + esc(d.ho_ten) + ' · ' + ngayVN(d.tg) + ' ' + tagTT(d.trang_thai) + '</div>').join('') : '<div class="note">Không có.</div>') + '</div>' +
      '<div class="card"><h2>Lịch sử</h2><ul class="timeline">' + x.xu_ly.slice().reverse().map(l => '<li><div class="when">' + ngayVN(l.tg) + ' · ' + esc(l.nguoi) + '</div><div class="what">' + esc(l.hd) + '</div>' + (l.nd ? '<div class="note">' + esc(l.nd) + '</div>' : '') + '</li>').join('') + '</ul></div></div></div>';
    nd.innerHTML = h;
    if ($('the-dc')) veDungCuHS(x, $('the-dc'), dang || tt === 'Chờ nộp bản ký' || tt === 'Đã nhận đơn ký');
    nd.querySelectorAll('[data-tai]').forEach(b => { b.onclick = (e) => chay(e.target, () => taiVe(b.dataset.tai)); });
    nd.querySelectorAll('[data-in]').forEach(b => { b.onclick = (e) => chay(e.target, async () => window.PTN_PHU_LUC.xemTruoc(b.dataset.in.split(','), x, ((await anhQR(lienKet('de-tai/' + x.id))) || {}).dataUrl)); });
    if ($('b-in-bb-hs')) $('b-in-bb-hs').onclick = (e) => chay(e.target, () => moInBB([x.bb]));
    $('tep-hs').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      await chay(null, () => guiTep(x.id, f, tt === 'Chờ nộp bản ký' ? 'Đơn đã ký' : 'Tệp hồ sơ'));
      if (tt === 'Chờ nộp bản ký' && confirm('Ghi nhận "Đã nhận đơn ký" cho hồ sơ này?')) await api('hs_xu_ly', { id: x.id, hd: 'nhan_don' });
      toast('Đã tải lên'); dieuHuong();
    };
    nd.querySelectorAll('[data-hd]').forEach(b => { b.onclick = async (e) => {
      const hd = b.dataset.hd, v = { id: x.id, hd };
      if (hd === 'tu_choi' || hd === 'ghi_chu') { v.ghi_chu = prompt(hd === 'tu_choi' ? 'Lý do từ chối:' : 'Ghi chú:'); if (!v.ghi_chu) return; }
      if (hd === 'gia_han') { v.den_ngay = prompt('Gia hạn đến ngày (yyyy-mm-dd):', x.den_ngay); if (!v.den_ngay) return; }
      if (hd === 'thu_phi') { v.so_tien = prompt('Số tiền đã thu (đ):'); if (!v.so_tien) return; v.ngay = homNay(); }
      if (hd === 'dong' && !confirm('Đóng hồ sơ ' + x.id + '? (Hệ thống kiểm tra đã trả đủ dụng cụ, thiết bị, tủ, chìa khóa.)')) return;
      await chay(e.target, () => api('hs_xu_ly', v)); toast('Đã ghi: ' + b.textContent); dieuHuong();
    }; });
  }

  // Dụng cụ của hồ sơ: sửa SL đăng ký / đã mượn / mượn thêm / đã trả ngay trên bảng (lưu vết người sửa, số cũ → mới)
  function veDungCuHS(x, box, choSua) {
    const so = (v) => v === '' || v == null ? '' : Math.round(+v * 1000) / 1000, bb = x.bb_ct;
    const o2 = (id, k, v) => choSua ? '<input class="o-sua" type="number" step="any" min="0" inputmode="decimal" data-d="' + esc(id) + '" data-k="' + k + '" value="' + esc(so(v)) + '" data-goc="' + esc(so(v)) + '" style="width:80px">' : fmt(v);
    const lichSu = bb ? bb.cap_phat.filter(c => /^sua_|^ban_giao|^bo_sung|^tra/.test(c.loai)) : x.xu_ly.filter(l => /SL đăng ký/.test(l.hd));
    box.innerHTML = '<div class="btns" style="justify-content:space-between"><h2 style="margin:0">Dụng cụ' + (x.bb ? ' – biên bản <a href="#/bien-ban/' + encodeURIComponent(x.bb) + '">' + esc(x.bb) + '</a>' : ' đăng ký') + '</h2>' +
      (choSua ? '<span class="note">Sửa trực tiếp rồi bấm Lưu – mọi thay đổi được lưu vết.</span>' : '') + '</div><div class="tbl-wrap"><table class="bb-sua"><thead><tr><th>Tên</th><th>SL đăng ký</th>' + (bb ? '<th>Đã mượn</th><th>Mượn thêm (QR8)</th><th>Đã trả</th><th class="num">Còn nợ</th>' : '') + '</tr></thead><tbody>' +
      (bb ? bb.dong.map(d => { const no = (+d.ban_giao || 0) + (+d.bo_sung || 0) - (+d.tra || 0);
        return '<tr><td>' + esc(d.ten) + (d.nsx ? ' <span class="note">' + esc(d.nsx) + '</span>' : '') + ' <span class="note">' + esc(d.dvt) + '</span></td><td>' + o2(d.id, 'ke_hoach', d.ke_hoach) + '</td><td>' + o2(d.id, 'ban_giao', d.ban_giao) + '</td><td>' + o2(d.id, 'bo_sung', d.bo_sung) + '</td><td>' + o2(d.id, 'tra', d.tra) + '</td><td class="num">' + (no > 0 ? '<b style="color:var(--bad)">' + fmt(no) + '</b>' : '') + '</td></tr>'; }).join('')
        : x.dung_cu.map((d, i) => '<tr><td>' + esc(d.ten) + (d.quy_cach ? ' <span class="note">' + esc(d.quy_cach) + '</span>' : '') + ' <span class="note">' + esc(d.dvt || '') + '</span></td><td>' + o2(i, 'sl', d.sl) + '</td></tr>').join('')) + '</tbody></table></div>' +
      (choSua ? '<div class="btns hide" id="luu-dc" style="margin-top:8px"><span class="note" id="so-dc"></span><input type="text" id="ly-dc" placeholder="Lý do (không bắt buộc)" style="flex:1"><button class="btn sm" id="b-luu-dc">Lưu thay đổi</button><button class="btn o sm" id="b-bo-dc">Bỏ</button></div>' : '') +
      '<h2 style="margin-top:12px">Lịch sử chỉnh sửa số lượng (' + lichSu.length + ')</h2>' + (lichSu.length ? '<div style="max-height:200px;overflow:auto">' + lichSu.map(c => bb
        ? '<div class="note" style="padding:2px 0"><b>' + esc(TEN_CP[c.loai] || c.loai) + '</b> · ' + esc((bb.dong.find(y => y.id === c.dong) || {}).ten || '') + ' · ' + esc(c.ghi_chu || fmt(c.sl)) + '<br>' + esc(ngayVN(c.tao) + ' · ' + c.nguoi + ' · ' + c.nguon) + '</div>'
        : '<div class="note" style="padding:2px 0"><b>' + esc(c.hd) + '</b> · ' + esc(c.nd) + '<br>' + esc(ngayVN(c.tg) + ' · ' + c.nguoi) + '</div>').join('') + '</div>' : '<div class="note">Chưa có chỉnh sửa.</div>');
    if (!choSua) return;
    const doi = () => [...box.querySelectorAll('.o-sua')].filter(i => i.value.trim() !== i.dataset.goc);
    box.addEventListener('input', () => { const n = doi().length; $('luu-dc').classList.toggle('hide', !n); $('so-dc').textContent = n + ' ô đã sửa'; box.querySelectorAll('.o-sua').forEach(i => i.classList.toggle('da-sua', i.value.trim() !== i.dataset.goc)); });
    $('b-bo-dc').onclick = () => dieuHuong();
    $('b-luu-dc').onclick = async (e) => {
      if (bb) { const g = {}; doi().forEach(i => { (g[i.dataset.d] = g[i.dataset.d] || { dong: i.dataset.d })[i.dataset.k] = i.value.trim(); });
        await chay(e.target, () => api('bb_sua_dong', { id: x.bb, ds: Object.keys(g).map(k => g[k]), ly_do: $('ly-dc').value.trim() })); }
      else await chay(e.target, () => api('hs_xu_ly', { id: x.id, hd: 'sua_dc', ds: doi().map(i => ({ i: +i.dataset.d, sl: i.value.trim() })), ghi_chu: $('ly-dc').value.trim() }));
      toast('Đã lưu và ghi lịch sử'); dieuHuong();
    };
  }

  // ---------------- Lịch phòng (gắn vào trang phòng) ----------------
  Q.lichPhong = async (ma, box) => {
    if (!box) return;
    const r = await api('phong_lich', { ma });
    box.innerHTML = '<div class="grid g2"><div class="card"><h2>Lịch thực hành ' + esc(r.hk) + ' (' + r.thuc_hanh.length + ' ca)</h2>' + (r.thuc_hanh.length ? '<div class="tbl-wrap" style="max-height:340px"><table><thead><tr><th>Thứ – tiết</th><th>Môn – lớp</th><th>Thời gian</th><th>GV</th></tr></thead><tbody>' +
      r.thuc_hanh.map(l => '<tr><td>T' + esc(l.thu) + ' · ' + esc(l.tiet) + '</td><td>' + esc(l.ten_mon) + '<div class="note">' + esc(l.lop + (l.nhom ? ' – nhóm ' + l.nhom : '')) + '</div></td><td style="white-space:nowrap">' + ngayVN(l.bat_dau) + ' → ' + ngayVN(l.ket_thuc) + '</td><td>' + esc(l.gv) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="note">Không có ca thực hành.</div>') +
      '<h2 style="margin-top:12px">Biên bản các lớp học tại phòng</h2>' + (r.bien_ban.length ? r.bien_ban.map(b => '<div><a href="#/bien-ban/' + encodeURIComponent(b.id) + '">' + esc(b.id) + '</a> · ' + esc(b.ten_mon) + ' <span class="tag t-gray">' + esc(b.trang_thai) + '</span></div>').join('') : '<div class="note">Không có.</div>') + '</div>' +
      '<div><div class="card"><h2>Nhóm đề tài đang làm tại phòng (' + r.de_tai.length + ')</h2>' + (r.de_tai.length ? r.de_tai.map(h => '<div style="padding:3px 0"><a href="#/de-tai/' + esc(h.id) + '">' + esc(h.id) + '</a> – ' + esc(h.ten) + '<div class="note">' + esc(h.gvhd + ' · ' + h.so_tv + ' SV · ' + ngayVN(h.tu_ngay) + ' → ' + ngayVN(h.den_ngay) + (h.ngoai_gio === 'Có' ? ' · ngoài giờ' : '')) + '</div></div>').join('') : '<div class="note">Không có.</div>') + '</div>' +
      '<div class="card"><h2>Sử dụng 60 ngày gần đây (' + r.su_dung.length + ')</h2>' + (r.su_dung.length ? '<div style="max-height:300px;overflow:auto">' + r.su_dung.map(d => '<div class="note"><b>' + d.qr + '</b> ' + ngayVN(d.tu_ngay || d.tg) + (d.den_ngay ? ' → ' + esc(d.den_ngay.slice(11) || ngayVN(d.den_ngay)) : '') + ' · ' + esc(d.ho_ten) + ' · ' + esc(d.trang_thai) + '</div>').join('') + '</div>' : '<div class="note">Chưa có lượt sử dụng.</div>') + '</div></div></div>';
  };

  // ---------------- Kho hóa chất D11.01 / Kho dược liệu D11 ----------------
  const KHO = { HC: { ten: 'Kho hóa chất D11.01', duong: 'kho', vat: 'hóa chất' }, DL: { ten: 'Kho dược liệu D11', duong: 'kho-dl', vat: 'dược liệu' } };
  const manKhoDL = (p) => manKho(p, 'DL');
  async function manKho(p, kho) {
    kho = kho === 'DL' ? 'DL' : 'HC'; const K = KHO[kho];
    if (p[1] === 'lo' && p[2]) return manLo(decodeURIComponent(p[2]));
    if (p[1] === 'so-ks' && kho === 'HC') return manSoKS();
    const nd = trang(K.ten, (kho === 'HC' ? '<a class="btn o sm" href="#/kho/so-ks">Sổ hóa chất kiểm soát</a>' : '') + '<button class="btn o sm" id="b-xuat-x">Xem trước – in / Excel</button><button class="btn o sm" id="b-xuat">Xuất / hủy</button><button class="btn o sm" id="b-nhap">+ Nhập tay</button><button class="btn sm" id="b-file">⇪ Tải file lên</button>');
    const ds = await api('kho_ds', { kho }); S.cache.kho = ds;
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm tên, ' + (kho === 'DL' ? 'tên khoa học' : 'mã VT') + ', số lô…"><select id="f-cb"><option value="">Tất cả (' + ds.length + ')</option><option value="cb">Hết / sắp hết (' + ds.filter(g => g.canh_bao.length).length + ')</option>' +
      (kho === 'HC' ? '<option value="ks">Kiểm soát đặc biệt</option>' : '') + '</select><select id="f-ke"><option value="">Mọi vị trí</option><option value="tu-mat">Trong tủ mát</option>' +
      [...new Set([].concat(...ds.map(g => g.lo.map(x => x.ke))).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true })).map(k => '<option value="ke:' + esc(k) + '">Kệ ' + esc(k) + '</option>').join('') + '</select></div><div id="kq"></div>' +
      '<p class="note">Tồn = nhập − xuất. Bấm số ở cột "Tối thiểu" để đặt mức cảnh báo sắp hết. ' + (kho === 'HC' ? 'Cấp phát theo biên bản hóa chất tự trừ kho (lô hạn dùng gần nhất trước); giảm số hoặc hoàn trả trên biên bản thì kho được cộng lại.' : 'Dược liệu có trong biên bản thực hành (cùng tên, ĐVT) cũng tự trừ khi cấp phát.') + '</p>';
    const ve = () => {
      const q = boDau($('q').value), f = $('f-cb').value, ke = $('f-ke').value;
      const coCho = (x) => !ke || (ke === 'tu-mat' ? !!x.tu_mat : 'ke:' + x.ke === ke);
      const l = ds.filter(g => (!q || boDau([g.ten, g.ma_vt, g.ten_kh, g.lo.map(x => x.so_lo + ' ' + x.cho).join(' ')].join(' ')).indexOf(q) >= 0) && (!f || (f === 'cb' ? g.canh_bao.length : g.kiem_soat)) && (!ke || g.lo.some(coCho)));
      $('kq').innerHTML = !l.length ? '<div class="card empty">Kho chưa có ' + K.vat + '. Bấm "+ Nhập kho".</div>' : '<div class="tbl-wrap"><table><thead><tr>' + (kho === 'HC' ? '<th>Mã VT</th>' : '') + '<th>Tên ' + K.vat + '</th><th>ĐVT</th><th class="num">Tồn</th><th class="num">Tối thiểu</th><th>Lô (số lô · hạn dùng · tồn)</th><th>Vị trí</th><th>Cảnh báo</th></tr></thead><tbody>' +
        l.map(g => '<tr>' + (kho === 'HC' ? '<td class="mono">' + esc(g.ma_vt || '—') + '</td>' : '') + '<td><b>' + esc(g.ten) + '</b>' + (g.ten_kh ? ' <i class="note">' + esc(g.ten_kh) + '</i>' : '') + (g.kiem_soat ? ' <span class="tag t-bad">kiểm soát</span>' : '') + '</td><td>' + esc(g.dvt) + '</td><td class="num"><b>' + (fmt(g.ton) || 0) + '</b></td>' +
          '<td class="num"><a href="#" data-ttt="' + esc(g.khoa) + '" title="Đặt mức tồn tối thiểu">' + (fmt(g.ton_toi_thieu) || 'đặt') + '</a></td><td>' +
          g.lo.map(x => '<a href="#/' + K.duong + '/lo/' + esc(x.id) + '">' + esc(x.so_lo || x.id) + '</a> · ' + (x.han_dung ? ngayVN(x.han_dung) : '—') + ' · ' + fmt(x.ton)).join('<br>') + '</td><td class="vi-tri">' +
          g.lo.map(x => x.cho ? '<span class="cho' + (x.tu_mat ? ' lanh' : '') + '">' + (x.tu_mat ? '❄ ' : '') + esc(x.cho) + '</span>' : '<span class="note">—</span>').join('<br>') + '</td><td>' + g.canh_bao.map(c => '<span class="tag ' + (c === 'Hết hàng' ? 't-bad' : 't-warn') + '">' + esc(c) + '</span>').join(' ') + '</td></tr>').join('') + '</tbody></table></div>';
      $('kq').querySelectorAll('[data-ttt]').forEach(a => { a.onclick = async (e) => { e.preventDefault(); const g = ds.find(x => x.khoa === a.dataset.ttt), v = prompt('Tồn tối thiểu của "' + g.ten + '" (' + g.dvt + '):', g.ton_toi_thieu || ''); if (v === null) return; await chay(null, () => api('kho_ttt', { khoa: g.khoa, gia_tri: v })); toast('Đã đặt mức tối thiểu'); dieuHuong(); }; });
      Q.ganDieuHuong([].concat(...l.map(g => g.lo.map(x => '#/' + K.duong + '/lo/' + x.id))), 'lô');
    };
    $('q').oninput = ve; $('f-cb').onchange = ve; $('f-ke').onchange = ve; ve();
    $('b-nhap').onclick = () => hopNhapKho(kho);
    $('b-file').onclick = () => hopNhapKhoFile(kho);
    $('b-xuat').onclick = () => hopXuatKho(null, ds);
    $('b-xuat-x').onclick = () => {
      const dong = []; ds.forEach((g, i) => (g.lo.length ? g.lo : [{}]).forEach((x, j) => dong.push([j ? '' : i + 1, j ? '' : (kho === 'HC' ? g.ma_vt || 'Chưa MVT' : g.ten_kh || ''), j ? '' : g.ten, j ? '' : g.dvt, x.so_lo || '', ngayVN(x.han_dung || ''), x.ton || 0, j ? '' : g.ton, x.cho || '', j ? '' : g.canh_bao.join(', ')])));
      window.PTN_IN.xemTruoc({ ten: (kho === 'HC' ? 'Ton kho hoa chat D11.01 ' : 'Ton kho duoc lieu D11 ') + homNay(), trang: [window.PTN_IN.bang({ ten: 'Ton kho', tieuDe: 'BẢNG TỒN KHO ' + K.ten.toUpperCase(), phuDe: 'Tính đến ngày ' + ngayVN(homNay()),
        cot: [{ ten: 'STT', rong: 5, can: 'c' }, { ten: kho === 'HC' ? 'MÃ VT' : 'TÊN KHOA HỌC', rong: kho === 'HC' ? 9 : 20 }, { ten: 'TÊN ' + K.vat.toUpperCase(), rong: 34 }, { ten: 'ĐVT', rong: 7, can: 'c' }, { ten: 'SỐ LÔ', rong: 11 }, { ten: 'HẠN DÙNG', rong: 11, can: 'c' },
          { ten: 'TỒN LÔ', rong: 10 }, { ten: 'TỔNG TỒN', rong: 10 }, { ten: 'VỊ TRÍ', rong: 18 }, { ten: 'CẢNH BÁO', rong: 11 }], dong, huong: 'ngang', ky: [['NGƯỜI LẬP', '(Ký, ghi rõ họ tên)'], ['TRƯỞNG KHOA', '(Ký, ghi rõ họ tên)']] })] });
    };
  }
  async function hopNhapKho(kho) {
    const dl = kho === 'DL';
    moHop('<h2>Nhập ' + KHO[kho].ten.toLowerCase() + ' (một lô)</h2><form id="f"><div class="form-grid">' + (dl ? '' : o('tim', 'Tìm trong danh mục vật tư (mã VT hoặc tên)', { full: 1, ph: 'Gõ ít nhất 2 ký tự…' }) + '<div id="goi-y" class="full"></div>' + o('ma_vt', 'Mã VT')) +
      o('ten', dl ? 'Tên dược liệu' : 'Tên – quy cách', { req: 1 }) + (dl ? o('ten_kh', 'Tên khoa học') + o('bo_phan', 'Bộ phận dùng', { ph: 'Lá, rễ, thân, hoa…' }) + o('xuat_xu', 'Xuất xứ – nguồn gốc') : o('nsx', 'NSX')) +
      o('dvt', 'ĐVT', { req: 1, ph: dl ? 'kg, g' : '' }) + o('so_lo', 'Số lô') + o('han_dung', 'Hạn dùng', { type: 'date' }) +
      o('sl', 'Số lượng nhập', { type: 'number', req: 1, extra: ' step="any" min="0"' }) + o('ngay_nhap', 'Ngày nhập', { type: 'date', v: homNay() }) + o('nguon', 'Nguồn / chứng từ', { ph: 'Phiếu xuất kho P.KHĐT số …', full: 1 }) +
      o('ke', 'Kệ số') + o('tang', 'Tầng') + o('tu_mat', 'Tủ mát', { ph: 'Để trống nếu không; ghi "Có" hoặc số tủ' }) + o('vi_tri', 'Vị trí khác') + o('ghi_chu', 'Ghi chú', { full: 1 }) + '</div><label class="f"><span>' + (dl ? 'Phiếu kiểm nghiệm / chứng từ' : 'COA / phiếu kiểm nghiệm') + ' (không bắt buộc)</span><input type="file" name="tep"></label>' +
      '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Nhập kho</button></div></form>');
    const f = $('f'), tim = f.querySelector('[name=tim]');
    if (tim) tim.oninput = async () => {
      const q = tim.value.trim(); if (q.length < 2) { $('goi-y').innerHTML = ''; return; }
      const l = await api('vt_goi_y', { q }); if (tim.value.trim() !== q) return;
      $('goi-y').innerHTML = l.map(v => '<div class="click goi-y" data-ma="' + esc(v.ma_vt) + '"><span class="mono">' + esc(v.ma_vt) + '</span> ' + esc(v.ten) + ' <span class="note">' + esc(v.dvt + (v.nsx ? ' · ' + v.nsx : '')) + '</span></div>').join('') || '<div class="note">Không thấy – nhập tay bên dưới.</div>';
      $('goi-y').querySelectorAll('[data-ma]').forEach(el => { el.onclick = () => { const v = l.find(x => x.ma_vt === el.dataset.ma); ['ma_vt', 'ten', 'nsx', 'dvt'].forEach(k => { f.querySelector('[name=' + k + ']').value = v[k] || ''; }); $('goi-y').innerHTML = ''; tim.value = ''; }; });
    };
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(f), file = f.querySelector('[name=tep]').files[0]; delete v.tep; delete v.tim; v.kho = kho;
      const r = await chay(e.submitter, () => api('kho_nhap', { lo: v }));
      if (file) await guiTep(r.id, file, 'Chứng từ lô ' + (v.so_lo || r.id));
      dongHop(); toast('Đã nhập lô ' + r.id); dieuHuong();
    };
  }
  // Nhập kho từ file Excel: tự nhận cột theo tiêu đề, cho chọn lại, xem trước, báo dòng lỗi
  const COT_KHO = {
    HC: [['ma_vt', 'Mã VT', /^ma\s*vt|ma vat tu/], ['ten', 'Tên hóa chất – quy cách *', /^ten(?! khoa)|qu[iy] cach|danh muc|hoa chat/], ['nsx', 'NSX', /^nsx|hang sx|nha san xuat/], ['dvt', 'ĐVT *', /^dv|don vi/],
      ['sl', 'Số lượng nhập *', /so luong|^slg?\b|ton kho|^ton$/], ['so_lo', 'Số lô', /so lo|^lot/], ['han_dung', 'Hạn dùng', /han (dung|su dung)|hsd|^exp/], ['ngay_nhap', 'Ngày nhập', /ngay nhap/],
      ['ke', 'Kệ số', /^ke\b|ke so/], ['tang', 'Tầng', /^tang/], ['tu_mat', 'Tủ mát', /tu mat|bao quan lanh|tu lanh/], ['vi_tri', 'Vị trí khác', /vi tri/], ['nguon', 'Nguồn / chứng từ', /nguon|chung tu|phieu/], ['ghi_chu', 'Ghi chú', /ghi chu/]],
    DL: [['ten', 'Tên dược liệu *', /^ten(?! khoa)|duoc lieu|ten vi thuoc/], ['ten_kh', 'Tên khoa học', /ten khoa hoc|ten latin|latin/], ['bo_phan', 'Bộ phận dùng', /bo phan/], ['xuat_xu', 'Xuất xứ', /xuat xu|nguon goc|noi thu hai/],
      ['dvt', 'ĐVT *', /^dv|don vi/], ['sl', 'Số lượng nhập *', /so luong|^slg?\b|ton kho|^ton$|khoi luong/], ['so_lo', 'Số lô', /so lo|^lot/], ['han_dung', 'Hạn dùng', /han (dung|su dung)|hsd|^exp/],
      ['ngay_nhap', 'Ngày nhập', /ngay nhap/], ['ke', 'Kệ số', /^ke\b|ke so/], ['tang', 'Tầng', /^tang/], ['tu_mat', 'Tủ mát', /tu mat|bao quan lanh|tu lanh/], ['vi_tri', 'Vị trí khác', /vi tri/], ['nguon', 'Nguồn / chứng từ', /nguon nhap|chung tu|phieu/], ['ghi_chu', 'Ghi chú', /ghi chu/]]
  };
  const ngayIso = (v) => {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
    const t = String(v).trim(); let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t); if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    m = /^(\d{1,2})[/.-](\d{4})$/.exec(t); if (m) return m[2] + '-' + m[1].padStart(2, '0') + '-01'; // chỉ ghi tháng/năm
    return t;
  };
  function taiMauKho(kho) {
    const C = COT_KHO[kho], vd = kho === 'DL' ? { ten: 'Lá trà xanh', ten_kh: 'Camellia sinensis', bo_phan: 'Lá', xuat_xu: 'Lâm Đồng', dvt: 'kg', sl: 2, so_lo: 'DL-01', han_dung: '31/12/2027', ke: '3', tang: '2' }
      : { ma_vt: '1053', ten: 'Cồn 96 độ', nsx: 'VN', dvt: 'Lít', sl: 20, so_lo: 'L2601', han_dung: '30/06/2028', ke: 'A1', tang: '1' };
    return window.PTN_IN.taiExcel({ ten: 'Mau nhap ' + (kho === 'DL' ? 'kho duoc lieu' : 'kho hoa chat'), trang: [{ ten: 'Nhap kho', cot: C.map(c => Math.max(10, c[1].length + 2)), lapLai: [1, 1],
      hang: [{ cao: 30, o: C.map(c => ({ v: c[1].replace(' *', ''), b: 1, can: 'c', vien: 1, nen: '#D9E2F3' })) }, { cao: 18, o: C.map(c => ({ v: vd[c[0]] === undefined ? '' : vd[c[0]], vien: 1 })) }] }] });
  }
  function hopNhapKhoFile(kho) {
    const C = COT_KHO[kho];
    moHop('<h2>Tải file lên – ' + esc(KHO[kho].ten) + '</h2><p class="note">Chọn file Excel danh mục ' + KHO[kho].vat + ' (mỗi dòng một lô). Hệ thống tự nhận cột theo tiêu đề – kiểm tra lại trước khi nhập. Dòng thiếu tên, ĐVT, số lượng hoặc sai ngày sẽ bị bỏ qua và báo lại. ' +
      '<a href="#" id="mau-kho">Tải file mẫu</a></p><label class="f"><span>File Excel (.xlsx, .xls, .csv)</span><input type="file" id="x-file" accept=".xlsx,.xls,.xlsm,.csv"></label><div id="x-kq"></div>');
    $('mau-kho').onclick = (e) => { e.preventDefault(); chay(null, () => taiMauKho(kho)); };
    $('x-file').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      $('x-kq').innerHTML = '<div class="loading"><div class="spin"></div></div>';
      try {
        const X = await napXlsx(), wb = X.read(await file.arrayBuffer(), { cellDates: true });
        const ve = (tenSheet) => {
          const rows = X.utils.sheet_to_json(wb.Sheets[tenSheet], { header: 1, raw: true, defval: '' }), bd = (v) => boDau(String(v).replace(/\s+/g, ' ').trim());
          let hd = rows.findIndex(r => r.filter(c => C.some(f => f[2].test(bd(c)))).length >= 2); if (hd < 0) hd = 0;
          const td = rows[hd].map(c => String(c).replace(/\s+/g, ' ').trim()), map = {};
          C.forEach(f => { const j = td.findIndex((c, j2) => c && f[2].test(bd(c)) && Object.values(map).indexOf(j2) < 0); if (j >= 0) map[f[0]] = j; });
          const du = rows.map((r, i) => ({ r, dong: i + 1 })).slice(hd + 1).filter(x => x.r.some(c => c !== '' && c != null));
          $('x-kq').innerHTML = (wb.SheetNames.length > 1 ? '<label class="f"><span>Trang tính</span><select id="x-sheet">' + wb.SheetNames.map(n => '<option' + (n === tenSheet ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label>' : '') +
            '<p><b>' + du.length + '</b> dòng dữ liệu (tiêu đề ở dòng ' + (hd + 1) + ').</p><div class="tbl-wrap" style="max-height:240px"><table class="import-map"><thead><tr><th>Trường</th><th>Lấy từ cột</th></tr></thead><tbody>' +
            C.map(f => '<tr><td>' + esc(f[1]) + '</td><td><select data-k="' + f[0] + '"><option value="">— không có —</option>' + td.map((t, j) => t ? '<option value="' + j + '"' + (map[f[0]] === j ? ' selected' : '') + '>' + esc(t) + '</option>' : '').join('') + '</select></td></tr>').join('') +
            '</tbody></table></div><div id="x-xem"></div><div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="x-ok">Nhập ' + du.length + ' dòng</button></div>';
          if ($('x-sheet')) $('x-sheet').onchange = (ev) => ve(ev.target.value);
          const docDs = () => {
            const m = {}; $('x-kq').querySelectorAll('[data-k]').forEach(s2 => { if (s2.value !== '') m[s2.dataset.k] = +s2.value; });
            return { m, ds: du.map(({ r, dong }) => { const x = { _dong: dong }; Object.keys(m).forEach(k => { const v = r[m[k]];
              x[k] = k === 'han_dung' || k === 'ngay_nhap' ? ngayIso(v) : k === 'sl' ? (+String(v).replace(/\s/g, '').replace(',', '.') || 0) : (v instanceof Date ? ngayIso(v) : String(v == null ? '' : v).trim()); }); return x; }) };
          };
          const xem = () => {
            const { ds } = docDs(), thieu = ds.filter(x => (!x.ten && !x.ma_vt) || !(x.sl > 0));
            $('x-xem').innerHTML = '<div class="tbl-wrap" style="max-height:200px;margin-top:8px"><table><thead><tr>' + C.slice(0, 7).map(f => '<th>' + esc(f[1].replace(' *', '')) + '</th>').join('') + '</tr></thead><tbody>' +
              ds.slice(0, 6).map(x => '<tr>' + C.slice(0, 7).map(f => '<td>' + esc(x[f[0]] === undefined ? '' : x[f[0]]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
              (thieu.length ? '<p class="err">⚠ ' + thieu.length + ' dòng thiếu tên hoặc số lượng sẽ bị bỏ qua (dòng ' + thieu.slice(0, 8).map(x => x._dong).join(', ') + (thieu.length > 8 ? '…' : '') + ').</p>' : '<p class="note">Xem trước 6 dòng đầu.</p>');
          };
          $('x-kq').querySelectorAll('[data-k]').forEach(s2 => { s2.onchange = xem; }); xem();
          $('x-ok').onclick = async (ev) => {
            const { m, ds } = docDs();
            if (m.sl === undefined || (m.ten === undefined && m.ma_vt === undefined)) return toast('Chọn cột số lượng và cột tên' + (kho === 'HC' ? ' hoặc mã VT' : ''), true);
            const r = await chay(ev.target, () => api('kho_nhap_ds', { kho, ds }));
            $('x-kq').innerHTML = '<div class="card"><b>Đã nhập ' + r.them + ' lô vào ' + esc(KHO[kho].ten) + '.</b>' + (r.bo_qua.length ? '<p>Bỏ qua ' + r.bo_qua.length + ' dòng:</p><ul class="note">' + r.bo_qua.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '') +
              '</div><div class="modal-foot"><button class="btn" data-dong>Đóng</button></div>';
            setTimeout(dieuHuong, 200);
          };
        };
        ve(wb.SheetNames[0]);
      } catch (err) { $('x-kq').innerHTML = '<p class="err">' + esc(err.message) + '</p>'; }
    };
  }
  function hopXuatKho(lo, ds) {
    const chonVT = lo ? '<p><b>Lô ' + esc(lo.lo.so_lo || lo.lo.id) + '</b> – ' + esc(lo.lo.ten) + ' · tồn ' + fmt(lo.ton) + ' ' + esc(lo.lo.dvt) + '</p>'
      : o('khoa', 'Vật tư', { select: [['', '— Chọn —']].concat(ds.filter(g => g.ton > 0).map(g => [g.khoa, g.ten + ' (tồn ' + fmt(g.ton) + ' ' + g.dvt + ')'])), req: 1 });
    moHop('<h2>' + (lo ? 'Xuất từ lô' : 'Xuất kho') + '</h2><form id="f">' + chonVT + '<div class="form-grid">' + o('loai', 'Loại', { select: [['xuat', 'Xuất sử dụng'], ['huy', 'Hủy']] }) + o('sl', 'Số lượng', { type: 'number', req: 1, extra: ' step="any" min="0"' }) +
      o('ngay', 'Ngày', { type: 'date', v: homNay() }) + o('nguoi_nhan', 'Người nhận') + o('ly_do', 'Lý do / chứng từ', { full: 1, ph: 'VD: NCKH đề tài KL-2627-015; TH Hóa dược lớp …' }) + '</div>' +
      (lo ? '' : '<p class="note">Xuất theo hạn dùng gần nhất trước. Cấp cho lớp thực hành nên ghi ở biên bản – kho tự trừ.</p>') + '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Ghi</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(e.target), gd = { loai: v.loai, sl: v.sl, ngay: v.ngay, nguoi_nhan: v.nguoi_nhan, ly_do: v.ly_do };
      if (lo) gd.lo = lo.lo.id; else { if (!v.khoa) return toast('Chọn vật tư', true); gd.khoa = v.khoa; }
      const r = await chay(e.submitter, () => api('kho_xuat', { gd }));
      dongHop(); toast('Đã ghi ' + (r.xuat || []).map(x => x.lo + ': ' + fmt(x.sl)).join(', ')); dieuHuong();
    };
  }
  async function manLo(id) {
    const r = await api('kho_lo', { id }), l = r.lo, K = KHO[l.kho];
    const nd = trang('Lô ' + esc(id), '', '<a href="#/' + K.duong + '">' + K.ten + '</a> ›');
    $('main').querySelector('h1').innerHTML = esc(l.ten) + ' <span class="tag t-info">tồn ' + fmt(r.ton) + ' ' + esc(l.dvt) + '</span>';
    nd.innerHTML = '<div class="btns" style="margin-bottom:12px"><button class="btn sm" id="b-x">Xuất từ lô</button><button class="btn o sm" id="b-kk">Kiểm kê (điều chỉnh tồn)</button><button class="btn o sm" id="b-sua">Sửa lô</button>' +
      '<label class="btn o sm">Đính kèm chứng từ<input type="file" id="tep-lo" hidden></label><button class="btn o sm" id="b-tem">In tem</button></div>' +
      '<div class="grid g2"><div class="card"><dl class="kv">' + [['Mã lô', l.id], ['Kho', K.ten], ['Mã VT', l.ma_vt], ['Tên khoa học', l.ten_kh], ['Bộ phận dùng', l.bo_phan], ['Xuất xứ', l.xuat_xu], ['NSX', l.nsx], ['Số lô', l.so_lo], ['Hạn dùng', ngayVN(l.han_dung)],
        ['Ngày nhập', ngayVN(l.ngay_nhap)], ['SL nhập', fmt(l.sl_nhap) + ' ' + l.dvt], ['Nguồn', l.nguon], ['Kệ số', l.ke], ['Tầng', l.tang], ['Tủ mát', l.tu_mat], ['Vị trí khác', l.vi_tri], ['Ghi chú', l.ghi_chu]]
        .filter(x => x[1]).map(x => '<dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd>').join('') + '</dl></div>' +
      '<div class="card"><h2>Tệp (' + r.tep.length + ')</h2>' + (r.tep.length ? '<ul class="files">' + r.tep.map(f => '<li><span>📄 ' + esc(f.ten) + '</span><button class="btn o sm" data-tai="' + esc(f.id) + '">Tải về</button></li>').join('') + '</ul>' : '<div class="note">Chưa có.</div>') + '</div></div>' +
      '<div class="card"><h2>Nhập – xuất (' + r.gd.length + ')</h2><div class="tbl-wrap"><table><thead><tr><th>Ngày</th><th>Loại</th><th class="num">Số lượng</th><th>Biên bản / lý do</th><th>Người nhận</th><th>Người ghi</th></tr></thead><tbody>' +
      r.gd.map(g => '<tr><td>' + ngayVN(g.ngay) + '</td><td>' + esc(g.ten_loai) + '</td><td class="num" style="color:' + (+g.sl < 0 ? 'var(--bad)' : 'var(--ok)') + '">' + (+g.sl > 0 ? '+' : '') + fmt(g.sl) + '</td><td>' + (g.bb ? '<a href="#/bien-ban/' + encodeURIComponent(g.bb) + '">' + esc(g.bb) + '</a> ' : '') + esc(g.ly_do) + '</td><td>' + esc(g.nguoi_nhan) + '</td><td>' + esc(g.nguoi) + '</td></tr>').join('') + '</tbody></table></div></div>';
    nd.querySelectorAll('[data-tai]').forEach(b => { b.onclick = (e) => chay(e.target, () => taiVe(b.dataset.tai)); });
    $('b-x').onclick = () => hopXuatKho(r);
    $('b-tem').onclick = () => Q.inTem([l], 'lo');
    $('tep-lo').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; await chay(null, () => guiTep(l.id, f, 'Chứng từ lô ' + (l.so_lo || l.id))); toast('Đã tải lên'); dieuHuong(); };
    $('b-kk').onclick = () => {
      moHop('<h2>Kiểm kê lô ' + esc(l.so_lo || l.id) + '</h2><form id="f"><p>Tồn trên hệ thống: <b>' + fmt(r.ton) + ' ' + esc(l.dvt) + '</b></p><div class="form-grid">' + o('ton_thuc', 'Tồn thực tế', { type: 'number', req: 1, extra: ' step="any" min="0"' }) +
        o('ngay', 'Ngày kiểm kê', { type: 'date', v: homNay() }) + o('ly_do', 'Lý do chênh lệch', { req: 1, full: 1 }) + '</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Ghi</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); const k = await chay(e.submitter, () => api('kho_xuat', { gd: { loai: 'dieu_chinh', lo: l.id, ton_thuc: v.ton_thuc, ngay: v.ngay, ly_do: v.ly_do } })); dongHop(); toast('Chênh lệch ' + (fmt(k.lech) || 0)); dieuHuong(); };
    };
    $('b-sua').onclick = () => {
      moHop('<h2>Sửa lô</h2><form id="f"><div class="form-grid">' + o('so_lo', 'Số lô', { v: l.so_lo }) + o('han_dung', 'Hạn dùng', { type: 'date', v: l.han_dung }) + o('ke', 'Kệ số', { v: l.ke }) + o('tang', 'Tầng', { v: l.tang }) +
        o('tu_mat', 'Tủ mát', { v: l.tu_mat, ph: 'Có / số tủ' }) + o('vi_tri', 'Vị trí khác', { v: l.vi_tri }) + o('nguon', 'Nguồn', { v: l.nguon }) +
        (l.kho === 'DL' ? o('ten_kh', 'Tên khoa học', { v: l.ten_kh }) + o('bo_phan', 'Bộ phận dùng', { v: l.bo_phan }) + o('xuat_xu', 'Xuất xứ', { v: l.xuat_xu }) : '') + o('ghi_chu', 'Ghi chú', { v: l.ghi_chu, full: 1 }) +
        '</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); v.id = l.id; await chay(e.submitter, () => api('kho_sua_lo', { lo: v })); dongHop(); toast('Đã lưu'); dieuHuong(); };
    };
  }
  async function manSoKS() {
    const q = new URLSearchParams((location.hash.split('?')[1]) || ''), tu = q.get('tu') || '', den = q.get('den') || '';
    const nd = trang('Sổ theo dõi hóa chất kiểm soát đặc biệt', '<button class="btn sm" id="b-in">Xem trước – in / Excel</button>', '<a href="#/kho">Kho hóa chất</a> ›');
    const r = await api('kho_so_ks', { tu, den });
    const bang = (s) => '<table><thead><tr><th>Ngày</th><th>Nội dung</th><th>Số lô</th><th class="num">Nhập</th><th class="num">Xuất</th><th class="num">Tồn</th><th>Chứng từ / biên bản</th><th>Người nhận</th><th>Người ghi</th></tr></thead><tbody>' +
      s.dong.map(d => '<tr><td>' + ngayVN(d.ngay) + '</td><td>' + esc(d.loai) + '</td><td>' + esc(d.so_lo) + '</td><td class="num">' + fmt(d.nhap) + '</td><td class="num">' + fmt(d.xuat) + '</td><td class="num"><b>' + fmt(d.ton) + '</b></td><td>' + esc(d.chung_tu) + '</td><td>' + esc(d.nguoi_nhan) + '</td><td>' + esc(d.nguoi) + '</td></tr>').join('') + '</tbody></table>';
    nd.innerHTML = '<div class="tools"><label>Từ <input type="date" id="tu" value="' + esc(tu) + '"></label><label>Đến <input type="date" id="den" value="' + esc(den) + '"></label><button class="btn o sm" id="b-loc">Xem</button></div>' +
      (r.chua_co_kho.length ? '<p class="err">⚠ Hóa chất kiểm soát đã cấp theo biên bản nhưng chưa có lô trong kho (sổ chưa đủ): ' + esc(r.chua_co_kho.join(', ')) + '</p>' : '') +
      (r.so.length ? r.so.map(s => '<div class="card"><h2>' + esc(s.ten) + ' <span class="note">(mã VT ' + esc(s.ma_vt) + ', ĐVT ' + esc(s.dvt) + ')</span></h2><div class="tbl-wrap">' + bang(s) + '</div></div>').join('') : '<div class="card empty">Chưa có nhập – xuất hóa chất kiểm soát. Đánh dấu "kiểm soát đặc biệt" ở Danh mục vật tư và nhập lô vào kho.</div>');
    $('b-loc').onclick = () => { location.hash = '#/kho/so-ks?tu=' + $('tu').value + '&den=' + $('den').value; };
    $('b-in').onclick = () => window.PTN_IN.xemTruoc({ ten: 'So hoa chat kiem soat ' + homNay(), trang: [window.PTN_IN.bang({ ten: 'So kiem soat', huong: 'ngang', tieuDe: 'SỔ THEO DÕI XUẤT – NHẬP HÓA CHẤT KIỂM SOÁT ĐẶC BIỆT',
      phuDe: 'Kho D11.01' + (tu || den ? ' · từ ' + ngayVN(tu) + ' đến ' + ngayVN(den) : ''), cot: [{ ten: 'NGÀY', rong: 11, can: 'c' }, { ten: 'NỘI DUNG', rong: 20 }, { ten: 'SỐ LÔ', rong: 11 }, { ten: 'NHẬP', rong: 10 }, { ten: 'XUẤT', rong: 10 }, { ten: 'TỒN', rong: 10 },
        { ten: 'CHỨNG TỪ / BIÊN BẢN', rong: 36 }, { ten: 'NGƯỜI NHẬN', rong: 18 }, { ten: 'NGƯỜI GHI', rong: 16 }],
      dong: [].concat(...r.so.map(s => [{ nhom: s.ten + ' (mã VT ' + s.ma_vt + ', ĐVT ' + s.dvt + ')' }].concat(s.dong.map(d => [ngayVN(d.ngay), d.loai, d.so_lo, d.nhap === '' ? '' : d.nhap, d.xuat === '' ? '' : d.xuat, { v: d.ton, b: 1 }, d.chung_tu, d.nguoi_nhan, d.nguoi])))),
      ky: [['NGƯỜI LẬP SỔ', '(Ký, ghi rõ họ tên)'], ['TRƯỞNG KHOA', '(Ký, ghi rõ họ tên)']] })] });
  }

  // ---------------- Báo cáo – thống kê ----------------
  function bieuDoCot(ds, khoa, nhan, donVi) { // một chuỗi số liệu: cột màu Khoa, rê chuột xem số
    const W = 640, H = 190, l = 36, b = 24, max = Math.max(1, ...ds.map(x => x[khoa])), bw = (W - l) / ds.length;
    const tron = (v) => Math.ceil(v / Math.pow(10, Math.floor(Math.log10(v)))) * Math.pow(10, Math.floor(Math.log10(v))), top = tron(max);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bieu-do" role="img" aria-label="' + esc(nhan) + '">' +
      [0, 0.5, 1].map(f => { const y = H - b - (H - b - 10) * f; return '<line x1="' + l + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="#E3E7EF"/><text x="' + (l - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#5B6475">' + fmt(top * f) + '</text>'; }).join('') +
      ds.map((x, i) => { const h = (H - b - 10) * x[khoa] / top, xx = l + i * bw + 4, w = Math.max(4, bw - 8), y = H - b - h;
        return '<g><title>' + esc(x.nhan) + ': ' + fmt(x[khoa]) + ' ' + donVi + '</title><rect x="' + (l + i * bw) + '" y="0" width="' + bw + '" height="' + H + '" fill="transparent"/>' +
          (h > 0 ? '<path d="M' + xx + ',' + (H - b) + 'V' + (y + Math.min(4, h)) + 'q0,-' + Math.min(4, h) + ' ' + Math.min(4, h) + ',-' + Math.min(4, h) + 'H' + (xx + w - Math.min(4, h)) + 'q' + Math.min(4, h) + ',0 ' + Math.min(4, h) + ',' + Math.min(4, h) + 'V' + (H - b) + 'Z" fill="#1E4FC2"/>' : '') +
          '<text x="' + (xx + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="#5B6475">' + esc(x.nhan_ngan) + '</text></g>'; }).join('') + '</svg>';
  }
  async function manBaoCao(p) {
    const tab = p[1] || 'thang';
    const TAB = [['thang', 'Báo cáo tháng'], ['tb', 'Dashboard thiết bị'], ['khac', 'Báo cáo học kỳ']];
    const nd = trang('Báo cáo – thống kê', '', '<span class="btns">' + TAB.map(t => '<a class="btn sm ' + (t[0] === tab ? 'chon' : 'o') + '" href="#/bao-cao/' + t[0] + '">' + t[1] + '</a>').join('') + '</span>');
    if (tab === 'tb') return bcThietBi(nd, p[2] ? decodeURIComponent(p[2]) : '');
    if (tab === 'khac') return bcKhac(nd);
    return bcThang(nd);
  }
  async function bcThietBi(nd, id) {
    const ds = S.cache.tb || (S.cache.tb = await api('tb_ds'));
    nd.innerHTML = '<div class="tools"><select id="f-tb"><option value="">— Chọn thiết bị —</option>' + ds.filter(x => x.tinh_trang !== 'Đã thanh lý').map(x => '<option value="' + esc(x.id) + '"' + (x.id === id ? ' selected' : '') + '>' + esc(x.ten + (x.ma_ts ? ' (' + x.ma_ts + ')' : '') + ' – ' + (x.phong || '')) + '</option>').join('') +
      '</select><label>Từ <input type="date" id="tu"></label><label>Đến <input type="date" id="den"></label></div><div id="kq">' + (id ? '<div class="loading"><div class="spin"></div></div>' : '<div class="card empty">Chọn thiết bị để xem số lần, số giờ sử dụng, người dùng nhiều, tỷ lệ khai thác.</div>') + '</div>';
    $('f-tb').onchange = (e) => { location.hash = '#/bao-cao/tb/' + e.target.value; };
    if (!id) return;
    const ve = async () => {
      const r = await api('bc_tb', { id, tu: $('tu').value, den: $('den').value }), t = r.tong;
      $('tu').value = r.tu; $('den').value = r.den;
      $('kq').innerHTML = '<h2><a href="#/tai-san/' + esc(id) + '">' + esc(r.tb.ten) + '</a> ' + tag(r.tb.tinh_trang) + '</h2><div class="grid g4" style="margin-bottom:14px">' +
        st(t.so_lan, 'Lượt sử dụng (QR5)') + st(fmt(t.so_gio) || 0, 'Giờ sử dụng') + st(t.ty_le + '%', 'Tỷ lệ khai thác') + st(t.so_muon, 'Lượt cho mượn') + st(t.hong + ' / ' + t.sua + ' / ' + t.kiem_dinh, 'Hỏng / sửa / kiểm định', t.hong ? 'warn' : '') + st(tien(t.chi_phi) || '0', 'Chi phí sửa, KĐ') + '</div>' +
        '<div class="card"><h2>Giờ sử dụng theo tháng</h2>' + bieuDoCot(r.thang.map(x => Object.assign({ nhan: 'Tháng ' + x.thang.slice(5) + '/' + x.thang.slice(0, 4), nhan_ngan: x.thang.slice(5) + '/' + x.thang.slice(2, 4) }, x)), 'so_gio', 'Giờ sử dụng theo tháng', 'giờ') +
        '<details><summary class="note">Bảng số liệu</summary><div class="tbl-wrap"><table><thead><tr><th>Tháng</th><th class="num">Lượt</th><th class="num">Giờ</th><th class="num">Khai thác %</th><th class="num">Cho mượn</th></tr></thead><tbody>' +
        r.thang.map(x => '<tr><td>' + x.thang + '</td><td class="num">' + x.so_lan + '</td><td class="num">' + fmt(x.so_gio) + '</td><td class="num">' + x.ty_le + '</td><td class="num">' + x.so_muon + '</td></tr>').join('') + '</tbody></table></div></details></div>' +
        '<div class="grid g2"><div class="card"><h2>Ai dùng nhiều</h2>' + (r.nguoi_dung.length ? '<table><thead><tr><th>Lớp / nhóm / người</th><th class="num">Lượt</th><th class="num">Giờ</th></tr></thead><tbody>' + r.nguoi_dung.map(x => '<tr><td>' + esc(x.ai) + '</td><td class="num">' + x.so_lan + '</td><td class="num">' + fmt(x.so_gio) + '</td></tr>').join('') + '</tbody></table>' : '<div class="note">Chưa có.</div>') + '</div>' +
        '<div class="card"><h2>Sự kiện (hỏng – sửa – kiểm định – mượn)</h2>' + (r.su_kien.length ? r.su_kien.map(s => '<div class="note"><b>' + ngayVN(s.ngay) + '</b> · ' + esc(s.loai) + (s.noi_dung ? ' – ' + esc(s.noi_dung).slice(0, 120) : '') + (s.chi_phi ? ' · ' + tien(s.chi_phi) : '') + '</div>').join('') : '<div class="note">Không có.</div>') + '</div></div>' +
        '<div class="card"><h2>Phiên sử dụng gần đây</h2>' + (r.gan_day.length ? '<div class="tbl-wrap"><table><thead><tr><th>Bắt đầu</th><th>Kết thúc</th><th class="num">Giờ</th><th>Người</th><th>Tình trạng sau</th></tr></thead><tbody>' + r.gan_day.map(x => '<tr><td>' + ngayVN(x.tu) + '</td><td>' + esc(x.den.slice(11)) + '</td><td class="num">' + fmt(x.gio) + '</td><td>' + esc(x.ho_ten) + ' <span class="note">' + esc(x.ai) + '</span></td><td>' + esc(x.sau) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="note">Chưa có lượt QR5.</div>') + '</div>';
    };
    $('tu').onchange = ve; $('den').onchange = ve; await ve();
  }
  async function bcThang(nd) {
    const truoc = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })();
    nd.innerHTML = '<div class="tools"><label>Tháng <input type="month" id="th" value="' + truoc + '"></label><button class="btn sm" id="b-xem">Xem</button><span id="nut"></span></div><div id="kq"></div><div class="card" id="da-luu"></div>';
    const daLuu = async () => { const l = await api('bc_da_luu'); $('da-luu').innerHTML = '<h2>Báo cáo đã lưu trong Drive (' + l.length + ')</h2>' + (l.length ? '<ul class="files">' + l.map(f => '<li><span>📄 ' + esc(f.ten) + '<br><span class="note">' + esc(ngayVN(f.tao) + ' · ' + f.nguoi) + '</span></span><button class="btn o sm" data-tai="' + esc(f.id) + '">Tải về</button></li>').join('') + '</ul>' : '<div class="note">Chưa có. Hệ thống tự tạo ngày 1 hằng tháng (cần chạy caiLichBaoCao() một lần trong Apps Script), hoặc bấm "Lưu vào Drive".</div>');
      $('da-luu').querySelectorAll('[data-tai]').forEach(b => { b.onclick = (e) => chay(e.target, () => taiVe(b.dataset.tai)); }); };
    const ve = async () => {
      const r = await api('bc_thang', { thang: $('th').value }), t = r.tong; S.cache.bc = r;
      $('nut').innerHTML = '<button class="btn o sm" id="b-x">Xem trước – in / Excel</button><button class="btn o sm" id="b-luu">Lưu vào Drive</button>';
      $('kq').innerHTML = '<div class="grid g4" style="margin-bottom:14px">' + st(t.co_dung + ' / ' + t.so_tb, 'Thiết bị có sử dụng') + st(t.so_lan, 'Lượt sử dụng') + st(fmt(t.so_gio) || 0, 'Giờ sử dụng') + st(t.so_muon, 'Lượt cho mượn') + st(t.hong + ' / ' + t.sua + ' / ' + t.kiem_dinh, 'Hỏng / sửa / KĐ') + st(r.ngay_lam_viec, 'Ngày làm việc') + '</div>' +
        '<div class="grid g2"><div class="card"><h2>Đơn trong tháng</h2><table><tbody>' + r.don.map(d => '<tr><td><b>' + d.qr + '</b> ' + esc(d.ten) + '</td><td class="num">' + d.so + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="card"><h2>Theo phòng</h2><table><thead><tr><th>Phòng</th><th class="num">Lượt (QR1, 4, 5)</th><th class="num">Giờ thiết bị</th></tr></thead><tbody>' + r.phong.map(p => '<tr><td>' + esc(p.ma) + '</td><td class="num">' + p.luot + '</td><td class="num">' + fmt(p.tb) + '</td></tr>').join('') + '</tbody></table></div></div>' +
        '<div class="card"><h2>Từng thiết bị</h2><div class="tbl-wrap"><table><thead><tr><th>Thiết bị</th><th>Phòng</th><th class="num">Lượt</th><th class="num">Giờ</th><th class="num">Khai thác %</th><th class="num">Mượn</th><th class="num">Hỏng / sửa / KĐ</th><th>Tình trạng</th></tr></thead><tbody>' +
        r.ds.map(x => '<tr class="click" data-href="#/bao-cao/tb/' + esc(x.id) + '"><td>' + esc(x.ten) + ' <span class="note">' + esc(x.ma_ts) + '</span></td><td>' + esc(x.phong) + '</td><td class="num">' + x.so_lan + '</td><td class="num">' + fmt(x.so_gio) + '</td><td class="num">' + x.ty_le + '</td><td class="num">' + x.so_muon + '</td><td class="num">' + [x.hong, x.sua, x.kiem_dinh].join(' / ') + '</td><td>' + tag(x.tinh_trang) + '</td></tr>').join('') + '</tbody></table></div></div>';
      ganLink($('kq'));
      $('b-x').onclick = () => { const IN = window.PTN_IN, th = r.thang.slice(5) + '/' + r.thang.slice(0, 4);
        IN.xemTruoc({ ten: 'Bao cao su dung thiet bi PTN thang ' + r.thang, trang: [
          IN.bang({ ten: 'Tong hop', tieuDe: 'BÁO CÁO TÌNH HÌNH SỬ DỤNG THIẾT BỊ PHÒNG THÍ NGHIỆM – THÁNG ' + th, phuDe: 'Số ngày làm việc: ' + r.ngay_lam_viec + ' · giờ sử dụng tính từ nhật ký QR5',
            cot: [{ ten: 'CHỈ TIÊU', rong: 46 }, { ten: 'SỐ LIỆU', rong: 18 }],
            dong: [['Số thiết bị quản lý', t.so_tb], ['Thiết bị có sử dụng trong tháng', t.co_dung], ['Lượt sử dụng (QR5)', t.so_lan], ['Tổng giờ sử dụng', t.so_gio], ['Lượt cho mượn', t.so_muon], ['Lần báo hỏng', t.hong], ['Lần sửa chữa', t.sua], ['Lần kiểm định', t.kiem_dinh], ['Chi phí sửa chữa, kiểm định (đ)', t.chi_phi]]
              .concat([{ nhom: 'Đơn đăng ký trong tháng' }]).concat(r.don.map(d => [d.qr + ' – ' + d.ten, d.so])).concat([{ nhom: 'Sử dụng theo phòng (lượt QR1, QR4, QR5 · giờ thiết bị)' }]).concat(r.phong.map(p => [p.ma + ' – ' + p.ten, p.luot + ' lượt · ' + (fmt(p.tb) || 0) + ' giờ'])),
            ky: [['NGƯỜI LẬP', '(Ký, ghi rõ họ tên)'], ['TRƯỞNG KHOA', '(Ký, ghi rõ họ tên)']] }),
          IN.bang({ ten: 'Tung thiet bi', huong: 'ngang', tieuDe: 'CHI TIẾT SỬ DỤNG TỪNG THIẾT BỊ – THÁNG ' + th,
            cot: [{ ten: 'STT', rong: 5, can: 'c' }, { ten: 'THIẾT BỊ', rong: 36 }, { ten: 'MÃ TS', rong: 13 }, { ten: 'PHÒNG', rong: 9, can: 'c' }, { ten: 'LƯỢT', rong: 8 }, { ten: 'GIỜ', rong: 9 }, { ten: 'KHAI THÁC %', rong: 11 },
              { ten: 'MƯỢN', rong: 8 }, { ten: 'HỎNG', rong: 8 }, { ten: 'SỬA', rong: 7 }, { ten: 'KĐ', rong: 6 }, { ten: 'CHI PHÍ (đ)', rong: 13, dd: '0' }, { ten: 'TÌNH TRẠNG', rong: 15 }],
            dong: r.ds.map((x, i) => [i + 1, x.ten, x.ma_ts, x.phong, x.so_lan, x.so_gio, x.ty_le, x.so_muon, x.hong, x.sua, x.kiem_dinh, x.chi_phi || '', x.tinh_trang]),
            tong: ['', 'Tổng', '', '', t.so_lan, t.so_gio, '', t.so_muon, t.hong, t.sua, t.kiem_dinh, t.chi_phi || '', ''] })] }); };
      $('b-luu').onclick = async (e) => { const l = await chay(e.target, () => api('bc_luu_thang', { thang: r.thang })); toast('Đã lưu ' + l.length + ' tệp vào Drive'); daLuu(); };
    };
    $('b-xem').onclick = (e) => chay(e.target, ve);
    await Promise.all([ve(), daLuu()]);
  }
  async function bcKhac(nd) {
    const hk = (S.dm.hoc_ky || [])[0] || '';
    nd.innerHTML = '<div class="tools"><b>Học kỳ</b> <select id="f-hk">' + (S.dm.hoc_ky || []).map(h => '<option>' + esc(h) + '</option>').join('') + '</select><button class="btn o sm" id="b-x">Xem trước – in / Excel</button></div><div id="kq"><div class="loading"><div class="spin"></div></div></div>';
    const ve = async () => {
      if (!$('f-hk').value) { $('kq').innerHTML = '<div class="card empty">Chưa có học kỳ.</div>'; return; }
      const r = await api('bc_khac', { hk: $('f-hk').value }); S.cache.bck = r;
      const v = r.vi_pham;
      $('kq').innerHTML = '<div class="grid g4" style="margin-bottom:14px">' + st(r.khcn_tong.gio, 'Giờ hoạt động thiết bị (KH&CN)') + st(r.khcn_tong.ty_le_tb + '%', 'Tỷ lệ khai thác trung bình') + st(r.khcn_tong.de_tai, 'Đề tài KLTN – NCKH') +
        st(v.mot_may_nhieu_nguoi.length + v.qua_han.length, 'Vi phạm / nghi vấn', v.mot_may_nhieu_nguoi.length + v.qua_han.length ? 'warn' : 'ok') + '</div>' +
        '<div class="card"><h2>Tần suất sử dụng phòng (' + esc(r.hk) + ')</h2><table><thead><tr><th>Phòng</th><th class="num">Buổi thực hành</th><th class="num">QR1 mượn phòng</th><th class="num">QR4 chìa khóa</th><th class="num">QR5 lượt dùng</th><th class="num">Đề tài</th></tr></thead><tbody>' +
        r.phong.map(p => '<tr><td>' + esc(p.ma) + ' – ' + esc(p.ten) + '</td><td class="num">' + p.ca_th + '</td><td class="num">' + p.qr1 + '</td><td class="num">' + p.qr4 + '</td><td class="num">' + p.qr5 + '</td><td class="num">' + p.de_tai + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="card"><h2>Dự trù – thực cấp hóa chất</h2><div class="tbl-wrap" style="max-height:420px"><table><thead><tr><th>Biên bản</th><th class="num">Dòng</th><th class="num">Dự trù</th><th class="num">Thực cấp</th><th class="num">Bổ sung</th><th class="num">Dòng vượt dự trù</th><th class="num">Ngoài định mức</th></tr></thead><tbody>' +
        r.du_tru.map(b => '<tr class="click" data-href="#/bien-ban/' + encodeURIComponent(b.id) + '"><td>' + esc(b.ten_mon) + ' <span class="note">' + esc(b.id) + '</span></td><td class="num">' + b.so_dong + '</td><td class="num">' + fmt(b.ke_hoach) + '</td><td class="num">' + fmt(b.thuc_cap) + '</td><td class="num">' + fmt(b.bo_sung) + '</td><td class="num">' + (b.vuot ? '<b style="color:var(--warn)">' + b.vuot + '</b>' : '') + '</td><td class="num">' + (b.ngoai_dm || '') + '</td></tr>').join('') + '</tbody></table></div></div>' +
        '<div class="card"><h2>Dụng cụ còn nợ (' + r.con_no.length + ' biên bản)</h2>' + (r.con_no.length ? r.con_no.map(b => '<div style="margin-bottom:6px"><a href="#/bien-ban/' + encodeURIComponent(b.id) + '">' + esc(b.id) + '</a> · ' + esc(b.nhanh) + ' · ' + esc(b.ten) + ' · ' + esc(b.lop) + '<div class="note">' + b.dong.map(d => esc(d.ten) + ': ' + fmt(d.no) + ' ' + esc(d.dvt)).join('; ') + '</div></div>').join('') : '<div class="note">Không còn nợ.</div>') + '</div>' +
        '<div class="card"><h2>Vi phạm – nghi vấn</h2>' + (v.mot_may_nhieu_nguoi.length ? '<b>Một máy gửi đơn cho nhiều người (nghi đăng ký thay)</b>' + v.mot_may_nhieu_nguoi.map(m => '<div class="note">' + esc(m.ma_may) + ': ' + esc(m.nguoi.join('; ')) + '</div>').join('') : '') +
        (v.mot_nguoi_nhieu_may.length ? '<b>Một người gửi từ nhiều máy</b>' + v.mot_nguoi_nhieu_may.map(m => '<div class="note">' + esc(m.ma_so) + ': ' + m.so_may + ' máy</div>').join('') : '') +
        (v.qua_han.length ? '<b>Đơn quá hạn chưa trả</b>' + v.qua_han.map(d => '<div class="note">' + d.qr + ' ' + esc(d.id) + ' · ' + esc(d.ho_ten) + ' (' + esc(d.ma_so) + ') · hạn ' + ngayVN(d.den_ngay) + '</div>').join('') : '') +
        (v.ghi_nhan.length ? '<b>Ghi nhận vi phạm trên hồ sơ thiết bị</b>' + v.ghi_nhan.map(s => '<div class="note">' + ngayVN(s.ngay) + ' · ' + esc(s.tb) + ' · ' + esc(s.noi_dung) + '</div>').join('') : '') +
        (!v.mot_may_nhieu_nguoi.length && !v.mot_nguoi_nhieu_may.length && !v.qua_han.length && !v.ghi_nhan.length ? '<div class="note">Không có.</div>' : '') +
        '<p class="note">Dùng máy không quét QR5: ghi sự kiện "Ghi chú" trên hồ sơ thiết bị có chữ "vi phạm" hoặc "không quét" để được liệt kê ở đây.</p></div>' +
        '<div class="card"><h2>Số liệu cho báo cáo KH&CN (P.QLKH)</h2><div class="tbl-wrap"><table><thead><tr><th>Thiết bị</th><th>Mã TS</th><th class="num">Lượt</th><th class="num">Giờ hoạt động</th><th class="num">Tỷ lệ khai thác %</th><th class="num">Hỏng / sửa / KĐ</th></tr></thead><tbody>' +
        r.khcn.map(x => '<tr><td>' + esc(x.ten) + '</td><td>' + esc(x.ma_ts) + '</td><td class="num">' + x.so_lan + '</td><td class="num">' + fmt(x.so_gio) + '</td><td class="num">' + x.ty_le + '</td><td class="num">' + [x.hong, x.sua, x.kiem_dinh].join(' / ') + '</td></tr>').join('') + '</tbody></table></div></div>';
      ganLink($('kq'));
    };
    $('f-hk').value = hk; $('f-hk').onchange = ve;
    $('b-x').onclick = () => {
      const r = S.cache.bck; if (!r) return; const IN = window.PTN_IN;
      IN.xemTruoc({ ten: 'Bao cao ' + r.hk, trang: [
        IN.bang({ ten: 'Phong', tieuDe: 'TẦN SUẤT SỬ DỤNG PHÒNG THÍ NGHIỆM – ' + r.hk.toUpperCase(), cot: [{ ten: 'PHÒNG', rong: 40 }, { ten: 'BUỔI TH', rong: 10 }, { ten: 'QR1', rong: 8 }, { ten: 'QR4', rong: 8 }, { ten: 'QR5', rong: 8 }, { ten: 'ĐỀ TÀI', rong: 9 }],
          dong: r.phong.map(p => [p.ma + ' – ' + p.ten, p.ca_th, p.qr1, p.qr4, p.qr5, p.de_tai]) }),
        IN.bang({ ten: 'Du tru - thuc cap', huong: 'ngang', tieuDe: 'DỰ TRÙ – THỰC CẤP HÓA CHẤT – ' + r.hk.toUpperCase(), cot: [{ ten: 'BIÊN BẢN', rong: 18 }, { ten: 'MÔN', rong: 40 }, { ten: 'SỐ DÒNG', rong: 9 }, { ten: 'DỰ TRÙ', rong: 12 }, { ten: 'THỰC CẤP', rong: 12 }, { ten: 'BỔ SUNG', rong: 11 }, { ten: 'DÒNG VƯỢT', rong: 10 }, { ten: 'NGOÀI ĐM', rong: 10 }],
          dong: r.du_tru.map(b => [b.id, b.ten_mon, b.so_dong, b.ke_hoach, b.thuc_cap, b.bo_sung, b.vuot, b.ngoai_dm]) }),
        IN.bang({ ten: 'Con no', tieuDe: 'DỤNG CỤ CÒN NỢ – ' + r.hk.toUpperCase(), cot: [{ ten: 'BIÊN BẢN', rong: 18 }, { ten: 'LỚP / NHÓM', rong: 22 }, { ten: 'DỤNG CỤ', rong: 32 }, { ten: 'CÒN NỢ', rong: 9 }, { ten: 'ĐVT', rong: 7 }],
          dong: [].concat(...r.con_no.map(b => [{ nhom: b.nhanh + ' · ' + b.ten }].concat(b.dong.map(d => [b.id, b.lop, d.ten, d.no, d.dvt])))) }),
        IN.bang({ ten: 'KHCN', huong: 'ngang', tieuDe: 'SỐ LIỆU THIẾT BỊ CHO BÁO CÁO KH&CN – ' + r.hk.toUpperCase(), cot: [{ ten: 'THIẾT BỊ', rong: 40 }, { ten: 'MÃ TS', rong: 14 }, { ten: 'LƯỢT', rong: 8 }, { ten: 'GIỜ HOẠT ĐỘNG', rong: 13 }, { ten: 'KHAI THÁC %', rong: 12 }, { ten: 'HỎNG / SỬA / KĐ', rong: 16, can: 'c' }],
          dong: r.khcn.map(x => [x.ten, x.ma_ts, x.so_lan, x.so_gio, x.ty_le, [x.hong, x.sua, x.kiem_dinh].join(' / ')]), tong: ['Tổng', '', '', r.khcn_tong.gio, r.khcn_tong.ty_le_tb + ' (TB)', ''],
          ky: [['NGƯỜI LẬP', '(Ký, ghi rõ họ tên)'], ['TRƯỞNG KHOA', '(Ký, ghi rõ họ tên)']] })] });
    };
    await ve();
  }

  // ---------------- Sổ theo dõi – in ấn ----------------
  const DU_LIEU_SO = {
    mua_sam: [['phong', 'Phòng đặt máy', 'phong'], ['hang', 'Hãng'], ['model', 'Model'], ['so_luong', 'Số lượng'], ['ma_ts', 'Mã tài sản (khi nhận)'], ['ly_do', 'Nhu cầu / lý do', 'area']],
    hc_de_tai: [['hs', 'Mã hồ sơ đề tài'], ['ds', 'Danh mục hóa chất (tên – số lượng)', 'area']],
    ung_tien: [['nguoi_ung', 'Người ứng'], ['da_chi', 'Đã chi (đ)'], ['hang_muc', 'Hạng mục mua', 'area']],
    muon_khoa: [['do_vat', 'Đồ vật / thiết bị', 'area'], ['nguoi_lien_he', 'Người liên hệ']],
    an_toan: [['hang_muc', 'Hạng mục (bình chữa cháy, tủ hút, tập huấn, sự cố…)'], ['vi_tri', 'Vị trí'], ['ket_qua', 'Kết quả / khắc phục', 'area']],
    bao_duong_he: [['thiet_bi', 'Thiết bị (tên hoặc ID, cách nhau dấu phẩy)', 'area'], ['vat_tu', 'Vật tư bảo dưỡng', 'area'], ['ket_qua', 'Kết quả', 'area']]
  };
  const IN_AN = [['tem', 'In tem nhãn'], ['chia-khoa', 'Bàn giao chìa khóa Bảo vệ'], ['thanh-ly', 'Đề nghị thanh lý'], ['bd-he', 'Danh sách bảo dưỡng hè']];
  async function manSo(p) {
    const loai = p[1] || 'mua_sam', L = S.dm.loai_so;
    const nd = trang('Sổ theo dõi – in ấn', '', '<span class="btns">' + Object.keys(L).map(k => '<a class="btn sm ' + (k === loai ? 'chon' : 'o') + '" href="#/so/' + k + '">' + esc(L[k].ten) + '</a>').join('') +
      IN_AN.map(x => '<a class="btn sm ' + (x[0] === loai ? 'chon' : 'o') + '" href="#/so/' + x[0] + '">⎙ ' + x[1] + '</a>').join('') + '</span>');
    if (loai === 'tem') return inAnTem(nd);
    if (loai === 'chia-khoa') return inChiaKhoa(nd);
    if (loai === 'thanh-ly') return inThanhLy(nd);
    if (loai === 'bd-he') return inBaoDuongHe(nd);
    if (!L[loai]) { nd.innerHTML = '<div class="card empty">Không có sổ này.</div>'; return; }
    const ds = await api('so_ds', { loai });
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm…"><select id="f-tt"><option value="">Tất cả trạng thái</option>' + L[loai].tt.map(t => '<option>' + esc(t) + '</option>').join('') + '</select><button class="btn sm" id="b-them">+ Thêm</button></div><div id="kq"></div>';
    const ve = () => {
      const q = boDau($('q').value), tt = $('f-tt').value, l = ds.filter(x => (!q || boDau([x.tieu_de, x.doi_tac, x.ghi_chu, JSON.stringify(x.du_lieu)].join(' ')).indexOf(q) >= 0) && (!tt || x.trang_thai === tt));
      $('kq').innerHTML = !l.length ? '<div class="card empty">Chưa có mục nào.</div>' : '<div class="tbl-wrap"><table><thead><tr><th>Nội dung</th><th>Trạng thái</th><th>Ngày</th><th>Hạn</th><th class="num">Số tiền</th><th>Liên quan</th><th>Tệp</th></tr></thead><tbody>' +
        l.map(x => '<tr class="click" data-id="' + esc(x.id) + '"><td><b>' + esc(x.tieu_de) + '</b><div class="note">' + esc(DU_LIEU_SO[loai].map(f => x.du_lieu[f[0]]).filter(Boolean).join(' · ')).slice(0, 160) + '</div></td><td><span class="tag t-info">' + esc(x.trang_thai) + '</span></td><td>' + ngayVN(x.ngay) + '</td><td>' + (x.han ? (x.qua_han ? '<span class="tag t-bad">' + ngayVN(x.han) + ' · quá hạn</span>' : ngayVN(x.han)) : '') + '</td><td class="num">' + tien(x.so_tien) + '</td><td>' + esc(x.doi_tac) +
          (x.lien_ket ? ' <a href="#/tai-san/' + esc(x.lien_ket) + '">' + esc(x.lien_ket) + '</a>' : '') + '</td><td>' + (x.so_tep || '') + '</td></tr>').join('') + '</tbody></table></div>';
      $('kq').querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = (e) => { if (e.target.closest('a')) return; hopSo(loai, ds.find(x => x.id === tr.dataset.id)); }; });
    };
    $('q').oninput = ve; $('f-tt').onchange = ve; ve();
    $('b-them').onclick = () => hopSo(loai, null);
  }
  function hopSo(loai, x) {
    const L = S.dm.loai_so[loai], du = (x && x.du_lieu) || {};
    moHop('<h2>' + esc(L.ten) + (x ? ' – ' + esc(x.id) : '') + '</h2><form id="f"><div class="form-grid">' + o('tieu_de', 'Nội dung', { v: x && x.tieu_de, req: 1, full: 1 }) + o('trang_thai', 'Trạng thái', { select: L.tt, v: x && x.trang_thai }) +
      o('ngay', 'Ngày', { type: 'date', v: (x && x.ngay) || homNay() }) + o('han', 'Hạn', { type: 'date', v: x && x.han }) + o('so_tien', 'Số tiền (đ)', { v: x && x.so_tien }) + o('doi_tac', 'Người / đơn vị liên quan', { v: x && x.doi_tac }) +
      DU_LIEU_SO[loai].map(f => f[2] === 'phong' ? o('du_' + f[0], f[1], { select: dsPhongChon('—'), v: du[f[0]] }) : o('du_' + f[0], f[1], { v: du[f[0]], area: f[2] === 'area', full: f[2] === 'area' })).join('') +
      o('ghi_chu', 'Ghi chú', { v: x && x.ghi_chu, full: 1 }) + '</div>' + (loai === 'mua_sam' ? '<p class="note">Chọn trạng thái "Đã nhận – tạo tài sản" → hệ thống tạo hồ sơ thiết bị (tên, phòng, hãng, nguyên giá) và gắn mã.</p>' : '') +
      '<label class="f"><span>Đính kèm tệp (không bắt buộc)</span><input type="file" name="tep"></label><div class="modal-foot">' + (x && laAdmin() ? '<button type="button" class="btn red" id="b-xoa">Xóa</button>' : '') + '<button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(e.target), file = e.target.querySelector('[name=tep]').files[0], so = { loai, du_lieu: {} };
      Object.keys(v).forEach(k => { if (k === 'tep') return; if (k.indexOf('du_') === 0) so.du_lieu[k.slice(3)] = v[k]; else so[k] = v[k]; });
      if (x) { so.id = x.id; so.lien_ket = x.lien_ket; }
      const r = await chay(e.submitter, () => api('so_luu', { so }));
      if (file) await guiTep(r.id, file, L.ten);
      dongHop(); toast('Đã lưu' + (r.lien_ket && !(x && x.lien_ket) && loai === 'mua_sam' ? ' – đã tạo thiết bị ' + r.lien_ket : '')); dieuHuong();
    };
    if ($('b-xoa')) $('b-xoa').onclick = async (e) => { if (!confirm('Xóa mục này?')) return; await chay(e.target, () => api('so_xoa', { id: x.id })); dongHop(); dieuHuong(); };
  }
  // tem nhãn 3 × 7 trên khổ A4 (giấy decal 63,5 × 38,1 mm): mã QR mở đúng hồ sơ khi quét
  Q.inTem = async (ds, kieu) => {
    const tem = [];
    for (const x of ds) {
      const duong = kieu === 'tb' ? 'tai-san/' + x.id : kieu === 'lo' ? 'kho/lo/' + x.id : kieu === 'hs' ? 'de-tai/' + x.id : 'phong/' + x.ma;
      const dong = kieu === 'tb' ? [x.ten, x.ma_ts ? 'Mã TS: ' + x.ma_ts : 'ID: ' + x.id, x.phong ? 'Phòng ' + x.phong : '']
        : kieu === 'lo' ? [x.ten, 'Lô ' + (x.so_lo || x.id) + (x.ma_vt ? ' · MVT ' + x.ma_vt : ''), x.han_dung ? 'HSD: ' + ngayVN(x.han_dung) : '', x.vi_tri ? 'Vị trí: ' + x.vi_tri : '']
        : kieu === 'hs' ? [x.id, x.ten, 'GVHD: ' + x.gvhd] : ['Phòng ' + x.ma, x.ten];
      tem.push('<div class="tem"><div class="q">' + await svgQR(lienKet(duong), 2) + '</div><div class="t"><small>PTN KHOA KHSK – IUH</small>' + dong.filter(Boolean).map((d, i) => i === 0 ? '<b>' + esc(d) + '</b>' : '<div>' + esc(d) + '</div>').join('') + '</div></div>');
    }
    xem('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Tem nhan</title><style>@page{size:A4;margin:12mm 7mm}body{margin:0;font:10px/1.25 Arial,sans-serif}.luoi{display:grid;grid-template-columns:repeat(3,63.5mm);grid-auto-rows:38.1mm;column-gap:2.5mm}' +
      '.tem{display:flex;gap:2mm;align-items:center;padding:2mm;border:1px dashed #bbb;overflow:hidden}.tem .q svg{width:22mm;height:22mm}.tem .t{flex:1;min-width:0}.tem small{font-size:7px;color:#555}.tem b{display:block;font-size:11px;margin:1px 0}</style></head><body><div class="luoi">' + tem.join('') + '</div></body></html>');
  };
  async function inAnTem(nd) {
    const [tb, kho, hs] = await Promise.all([api('tb_ds'), api('kho_ds'), api('hs_ds')]);
    const lo = [].concat(...kho.map(g => g.lo.map(l => Object.assign({ ten: g.ten, ma_vt: g.ma_vt }, l))));
    const nhom = { tb: tb.filter(x => x.tinh_trang !== 'Đã thanh lý').map(x => [x.id, x.ten + (x.ma_ts ? ' (' + x.ma_ts + ')' : '') + ' – ' + (x.phong || ''), x]),
      lo: lo.map(x => [x.id, x.ten + ' – lô ' + (x.so_lo || x.id) + (x.han_dung ? ' – HSD ' + ngayVN(x.han_dung) : ''), x]),
      hs: hs.map(x => [x.id, x.id + ' – ' + x.ten, x]), phong: (S.dm.phong || []).map(x => [x.ma, x.ma + ' – ' + x.ten, x]) };
    nd.innerHTML = '<div class="tools"><select id="k"><option value="tb">Thiết bị</option><option value="lo">Lô hóa chất (thùng, chai)</option><option value="hs">Gáy hồ sơ đề tài</option><option value="phong">Phòng</option></select><input type="search" id="q" placeholder="Lọc…">' +
      '<label class="check" style="margin:0"><input type="checkbox" id="tat-ca"> Chọn tất cả</label><button class="btn sm" id="b-in">In tem đã chọn</button></div><div class="card" id="ds" style="max-height:60vh;overflow:auto"></div><p class="note">Tem khổ 63,5 × 38,1 mm (21 tem / tờ A4). Quét mã QR trên tem bằng điện thoại của cán bộ để mở hồ sơ.</p>';
    const ve = () => { const q = boDau($('q').value); $('ds').innerHTML = nhom[$('k').value].filter(x => !q || boDau(x[1]).indexOf(q) >= 0).map(x => '<label class="check"><input type="checkbox" value="' + esc(x[0]) + '"> ' + esc(x[1]) + '</label>').join('') || '<div class="note">Không có.</div>'; };
    $('k').onchange = ve; $('q').oninput = ve; $('tat-ca').onchange = (e) => $('ds').querySelectorAll('input').forEach(i => { i.checked = e.target.checked; }); ve();
    $('b-in').onclick = () => { const k = $('k').value, chon = [...$('ds').querySelectorAll('input:checked')].map(i => nhom[k].find(x => x[0] === i.value)[2]); if (!chon.length) return toast('Chọn ít nhất một mục', true); Q.inTem(chon, k); };
  }
  function inChiaKhoa(nd) {
    nd.innerHTML = '<div class="card"><h2>Biên bản bàn giao chìa khóa phòng cho Bảo vệ</h2><div class="tbl-wrap"><table><thead><tr><th></th><th>Phòng</th><th style="width:110px">Số chìa</th><th>Ghi chú</th></tr></thead><tbody>' +
      (S.dm.phong || []).map(p => '<tr><td><input type="checkbox" checked data-p="' + esc(p.ma) + '"></td><td><b>' + esc(p.ma) + '</b> – ' + esc(p.ten) + '</td><td><input type="number" min="1" value="1" data-sl="' + esc(p.ma) + '"></td><td><input type="text" data-gc="' + esc(p.ma) + '"></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="form-grid" style="margin-top:10px">' + o('ben_giao', 'Bên giao (Khoa KHSK)', { v: S.toi.nguoi.ten }) + o('ben_nhan', 'Bên nhận (Bảo vệ)') + o('ngay', 'Ngày', { type: 'date', v: homNay() }) + '</div><button class="btn" id="b-in">In biên bản</button></div>';
    $('b-in').onclick = () => {
      const ds = [...nd.querySelectorAll('[data-p]:checked')].map(i => { const m = i.dataset.p, p = S.dm.phong.find(x => x.ma === m); return [m, p.ten, nd.querySelector('[data-sl="' + m + '"]').value, nd.querySelector('[data-gc="' + m + '"]').value]; });
      const g = (n) => nd.querySelector('[name=' + n + ']').value;
      xem('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Ban giao chia khoa</title><style>' + CSS_IN + '</style></head><body>' + dauTrang + '<h1>BIÊN BẢN BÀN GIAO CHÌA KHÓA PHÒNG THÍ NGHIỆM</h1><p class="c">Ngày ' + ngayVN(g('ngay')) + '</p>' +
        '<p>Bên giao: <b>' + esc(g('ben_giao')) + '</b> – Khoa Khoa học Sức khỏe.<br>Bên nhận: <b>' + esc(g('ben_nhan') || '……………………………') + '</b> – Tổ Bảo vệ.</p><p>Hai bên thống nhất bàn giao chìa khóa các phòng sau để Tổ Bảo vệ quản lý, giao cho giảng viên có đăng ký mượn chìa (QR4):</p>' +
        '<table class="ds"><tr><th>STT</th><th>Phòng</th><th>Tên phòng</th><th>Số chìa</th><th>Ghi chú</th></tr>' + ds.map((r, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td class="c">' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td></tr>').join('') + '</table>' +
        '<p>Biên bản lập thành 02 bản, mỗi bên giữ 01 bản.</p><table class="ky"><tr><td><b>BÊN NHẬN</b><br><i>(Ký, ghi rõ họ tên)</i></td><td><b>BÊN GIAO</b><br><i>(Ký, ghi rõ họ tên)</i></td></tr></table></body></html>');
    };
  }
  async function inThanhLy(nd) {
    const ds = (await api('tb_ds')).filter(x => x.tinh_trang !== 'Đã thanh lý');
    nd.innerHTML = '<div class="card"><h2>Đề nghị thanh lý tài sản</h2><p class="note">Chọn thiết bị và ghi lý do. Sau khi có quyết định, ghi sự kiện "Thanh lý" trên hồ sơ từng máy để chuyển trạng thái "Đã thanh lý".</p><div class="tbl-wrap" style="max-height:50vh"><table><thead><tr><th></th><th>Thiết bị</th><th>Mã TS</th><th>Tình trạng</th><th>Lý do thanh lý</th></tr></thead><tbody>' +
      ds.sort((a, b) => (/Hỏng|Ngưng/.test(b.tinh_trang) ? 1 : 0) - (/Hỏng|Ngưng/.test(a.tinh_trang) ? 1 : 0)).map(x => '<tr><td><input type="checkbox" data-id="' + esc(x.id) + '"></td><td>' + esc(x.ten) + '<div class="note">' + esc(x.phong) + '</div></td><td>' + esc(x.ma_ts) + '</td><td>' + tag(x.tinh_trang) + '</td><td><input type="text" data-ly="' + esc(x.id) + '" placeholder="Hư hỏng không sửa được…"></td></tr>').join('') +
      '</tbody></table></div><button class="btn" id="b-in" style="margin-top:10px">In đề nghị</button></div>';
    $('b-in').onclick = () => {
      const chon = [...nd.querySelectorAll('[data-id]:checked')].map(i => Object.assign({ ly: nd.querySelector('[data-ly="' + i.dataset.id + '"]').value }, ds.find(x => x.id === i.dataset.id)));
      if (!chon.length) return toast('Chọn thiết bị', true);
      xem('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>De nghi thanh ly</title><style>' + CSS_IN + '</style></head><body>' + dauTrang + '<p class="r"><i>TP. Hồ Chí Minh, ngày …… tháng …… năm 20……</i></p><h1>GIẤY ĐỀ NGHỊ THANH LÝ TÀI SẢN</h1>' +
        '<p>Kính gửi: Phòng Kế hoạch – Đầu tư; Ban Giám hiệu Trường Đại học Công nghiệp TP. Hồ Chí Minh.</p><p>Khoa Khoa học Sức khỏe đề nghị thanh lý các tài sản sau:</p>' +
        '<table class="ds"><tr><th>STT</th><th>Tên tài sản</th><th>Mã tài sản</th><th>Hãng – model</th><th>Năm đưa vào SD</th><th>Nguyên giá (đ)</th><th>Tình trạng</th><th>Lý do</th></tr>' +
        chon.map((x, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(x.ten) + '</td><td>' + esc(x.ma_ts) + '</td><td>' + esc([x.hang, x.model].filter(Boolean).join(' – ')) + '</td><td class="c">' + esc((x.ngay_nhan || '').slice(0, 4)) + '</td><td class="r">' + (x.nguyen_gia ? Number(x.nguyen_gia).toLocaleString('vi-VN') : '') + '</td><td>' + esc(x.tinh_trang) + '</td><td>' + esc(x.ly) + '</td></tr>').join('') + '</table>' +
        oKy([['NGƯỜI LẬP', Q.S.toi.nguoi.ten], ['TRƯỞNG KHOA', window.PTN_KY.truong_khoa]]) + '</body></html>');
    };
  }
  async function inBaoDuongHe(nd) {
    const ds = (await api('tb_ds')).filter(x => x.tinh_trang !== 'Đã thanh lý' && x.tinh_trang !== 'Ngưng sử dụng');
    const nam = new Date().getFullYear();
    nd.innerHTML = '<div class="card"><h2>Danh sách bảo dưỡng hè ' + nam + '</h2><p class="note">Đã chọn sẵn máy có chu kỳ bảo dưỡng hoặc đến hạn trước tháng 9. In danh sách để giao việc; ghi kết quả bằng sự kiện "Bảo dưỡng" trên từng máy hoặc ở sổ "Bảo dưỡng hè".</p><div class="tbl-wrap" style="max-height:50vh"><table><thead><tr><th></th><th>Thiết bị</th><th>Phòng</th><th>Bảo dưỡng gần nhất</th><th>Kế tiếp</th><th>Vật tư dự kiến</th></tr></thead><tbody>' +
      ds.map(x => '<tr><td><input type="checkbox" data-id="' + esc(x.id) + '"' + (x.bd_chu_ky || (x.bd_ke && x.bd_ke <= nam + '-09-30') ? ' checked' : '') + '></td><td>' + esc(x.ten) + ' <span class="note">' + esc(x.ma_ts) + '</span></td><td>' + esc(x.phong) + '</td><td>' + ngayVN(x.bd_gan) + '</td><td>' + hanTag(x.bd_ke) + '</td><td><input type="text" data-vt="' + esc(x.id) + '"></td></tr>').join('') +
      '</tbody></table></div><div class="btns" style="margin-top:10px"><button class="btn" id="b-in">In danh sách</button><button class="btn o" id="b-so">Lưu vào sổ "Bảo dưỡng hè"</button></div></div>';
    const chon = () => [...nd.querySelectorAll('[data-id]:checked')].map(i => Object.assign({ vt: nd.querySelector('[data-vt="' + i.dataset.id + '"]').value }, ds.find(x => x.id === i.dataset.id)));
    $('b-in').onclick = () => { const c = chon(); if (!c.length) return toast('Chọn thiết bị', true);
      xem('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Bao duong he</title><style>' + CSS_IN + '</style></head><body>' + dauTrang + '<h1>DANH SÁCH THIẾT BỊ BẢO DƯỠNG HÈ ' + nam + '</h1>' +
        '<table class="ds"><tr><th>STT</th><th>Thiết bị</th><th>Mã TS</th><th>Phòng</th><th>BD gần nhất</th><th>Vật tư bảo dưỡng</th><th>Người thực hiện</th><th>Kết quả</th></tr>' +
        c.map((x, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(x.ten) + '</td><td>' + esc(x.ma_ts) + '</td><td>' + esc(x.phong) + '</td><td>' + ngayVN(x.bd_gan) + '</td><td>' + esc(x.vt) + '</td><td></td><td></td></tr>').join('') + '</table>' +
        oKy([['NGƯỜI LẬP', Q.S.toi.nguoi.ten], ['TRƯỞNG KHOA', window.PTN_KY.truong_khoa]]) + '</body></html>'); };
    $('b-so').onclick = async (e) => { const c = chon(); if (!c.length) return toast('Chọn thiết bị', true);
      await chay(e.target, () => api('so_luu', { so: { loai: 'bao_duong_he', tieu_de: 'Bảo dưỡng hè ' + nam + ' (' + c.length + ' máy)', han: nam + '-08-31', du_lieu: { thiet_bi: c.map(x => x.ten + ' (' + x.id + ')').join(', '), vat_tu: c.filter(x => x.vt).map(x => x.ten + ': ' + x.vt).join('; ') } } }));
      toast('Đã lưu vào sổ'); location.hash = '#/so/bao_duong_he'; };
  }

  // ---------------- Bản ký: tự nhận qua mã QR, đọc thử số ----------------
  Q.hopTuNhanBanKy = () => {
    moHop('<h2>Tải bản ký – tự nhận qua mã QR</h2><p class="note">Chọn ảnh chụp biên bản / đơn đã ký (rõ mã QR ở góc). Hệ thống đọc mã QR để gắn tệp vào đúng biên bản hoặc hồ sơ đề tài. File PDF: mở biên bản rồi bấm "Đính kèm bản ký".</p>' +
      '<label class="f"><span>Ảnh (có thể chọn nhiều)</span><input type="file" id="anh" accept="image/*" multiple></label><div id="kq-qr"></div><div class="modal-foot"><button class="btn o" data-dong>Đóng</button></div>');
    $('anh').onchange = async (e) => {
      const files = [...e.target.files]; if (!files.length) return;
      $('kq-qr').innerHTML = '<div class="loading"><div class="spin"></div></div>';
      let jsQR; try { jsQR = await napScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js', 'jsQR'); } catch (err) { $('kq-qr').innerHTML = '<p class="err">' + esc(err.message) + '</p>'; return; }
      const out = [];
      for (const f of files) {
        let ma = '';
        try {
          const img = await createImageBitmap(f), k = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
          const r = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height); ma = r ? r.data : '';
        } catch (err) { ma = ''; }
        const m = /#\/(bien-ban|de-tai)\/([^?#/]+)/.exec(ma) || (/^(HC|DC)-[\w-]+$/.test(ma) ? [0, 'bien-ban', ma] : null);
        if (!m) { out.push('<div class="err">✗ ' + esc(f.name) + ': không đọc được mã QR – mở biên bản và đính kèm thủ công.</div>'); continue; }
        const id = decodeURIComponent(m[2]), loai = m[1];
        try {
          await guiTep(id, f, 'Bản ký (tự nhận qua mã QR)');
          if (loai === 'bien-ban') await api('bb_sua', { id, trang_thai: 'Đã ký' }).catch(() => null);
          else await api('hs_xu_ly', { id, hd: 'nhan_don' }).catch(() => null);
          out.push('<div>✓ ' + esc(f.name) + ' → <a href="#/' + loai + '/' + encodeURIComponent(id) + '" data-dong>' + esc(id) + '</a></div>');
        } catch (err) { out.push('<div class="err">✗ ' + esc(f.name) + ' (' + esc(id) + '): ' + esc(err.message) + '</div>'); }
      }
      $('kq-qr').innerHTML = out.join('');
    };
  };
  // Cập nhật số từ bản giấy (ảnh chụp / PDF scan): đọc số, điền vào bảng biên bản đang mở; ô không chắc → viền đỏ, nhập tay
  Q.docThuBanKy = (r, tepId) => Q.capNhatTuGiay(r, tepId);
  Q.capNhatTuGiay = (r, tepId) => {
    const dc = r.bb.loai === 'DC';
    moHop('<h2>Cập nhật từ bản giấy – ' + esc(r.bb.id) + '</h2><p class="note">Hệ thống đọc số ' + (dc ? 'mượn, trả' : 'thực nhận, hoàn trả') + ' trên bản đã ký và <b>điền sẵn vào bảng</b>. Ô viền đỏ là chỗ mờ / không chắc – cần nhập tay. ' +
      'Kiểm tra rồi bấm "Lưu thay đổi" (có lưu vết). Chụp thẳng, đủ sáng, rõ cả tiêu đề cột sẽ đọc chính xác hơn.</p>' +
      (tepId ? '<p>Đọc từ tệp đã đính kèm.</p>' : '<label class="f"><span>Ảnh chụp hoặc file PDF bản đã ký</span><input type="file" id="sc-file" accept="image/*,.pdf"></label><label class="check"><input type="checkbox" id="sc-luu" checked> Lưu tệp này làm bản ký của biên bản</label>') +
      '<div id="sc-kq"></div><div class="modal-foot"><button class="btn o" data-dong>Đóng</button><button class="btn" id="sc-doc">Đọc bản giấy</button></div>');
    $('sc-doc').onclick = async (e) => {
      let blob, ten;
      if (tepId) { const f = await api('tep_tai', { id: tepId }), bin = atob(f.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); blob = new Blob([u8], { type: f.mime }); blob.name = f.ten; ten = f.ten; }
      else { blob = $('sc-file').files[0]; if (!blob) return toast('Chọn ảnh hoặc file PDF', true); ten = blob.name; }
      e.target.disabled = true;
      const tb = (t, p) => { if ($('sc-kq')) $('sc-kq').innerHTML = '<div class="loading" style="padding:20px 0"><div class="spin"></div></div><p class="note" style="text-align:center">' + esc(t) + (p ? ' ' + Math.round(p * 100) + '%' : '') + '</p>'; };
      const TEN_BUOC = { 'loading tesseract core': 'Đang tải bộ đọc chữ…', 'initializing tesseract': 'Khởi động bộ đọc…', 'loading language traineddata': 'Đang tải dữ liệu tiếng Việt…', 'initializing api': 'Khởi động…', 'recognizing text': 'Đang đọc số trên bản giấy…' };
      try {
        tb('Đang chuẩn bị ảnh…');
        if (!tepId && $('sc-luu').checked) await guiTep(r.bb.id, blob, 'Bản ký (cập nhật từ bản giấy)');
        const kq = await window.PTN_SCAN.doc(blob, r, (st, p) => tb(TEN_BUOC[st] || st, p));
        const moi = kq.de_xuat.filter(x => x.v !== null && !x.nghi), nghi = kq.de_xuat.filter(x => x.nghi);
        $('sc-kq').innerHTML = '<div class="card" style="margin-top:10px"><p>' + (kq.so_chu < 20 ? '<b class="err">Ảnh quá mờ hoặc không phải biên bản – hầu như không đọc được chữ.</b><br>' : '') +
          '<b>' + kq.khop + '</b> ô khớp với số trên web · <b style="color:var(--ok)">' + moi.length + '</b> ô sẽ điền mới · <b style="color:var(--bad)">' + nghi.length + '</b> ô cần kiểm tra · <b>' + kq.khong_thay.length + '</b> dòng không tìm thấy trên bản giấy' +
          '</p>' +
          (nghi.length || kq.khong_thay.length ? '<div style="max-height:200px;overflow:auto">' + nghi.map(x => '<div class="note">⚠ <b>' + esc(x.ten) + '</b>: ' + esc(x.ly_do.join('; ')) + (x.v !== null ? ' (đọc được ' + fmt(x.can) + ')' : '') + '</div>').join('') +
            kq.khong_thay.map(x => '<div class="note">✗ <b>' + esc(x.ten) + '</b>: không tìm thấy trên bản giấy – nhập tay</div>').join('') + '</div>' : '') + '</div>' +
          '<div class="modal-foot"><button class="btn o" data-dong>Bỏ qua</button><button class="btn" id="sc-dien"' + (moi.length + nghi.length + kq.khong_thay.length ? '' : ' disabled') + '>Điền vào bảng để kiểm tra</button></div>';
        $('sc-dien').onclick = () => { dongHop(); dienTuGiay(kq, ten); };
      } catch (err) { $('sc-kq').innerHTML = '<p class="err">Không đọc được: ' + esc(err.message) + '</p>'; e.target.disabled = false; }
    };
  };
  function dienTuGiay(kq, ten) {
    const o = (dong, k) => document.querySelector('.o-sua[data-d="' + dong + '"][data-k="' + k + '"]');
    document.querySelectorAll('.o-sua.nghi').forEach(i => { i.classList.remove('nghi'); i.removeAttribute('title'); });
    kq.de_xuat.forEach(x => {
      const i = o(x.dong, x.k); if (!i) return;
      if (x.v !== null) i.value = x.v;
      if (x.nghi) { i.classList.add('nghi'); i.title = x.ly_do.join('; '); }
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    kq.khong_thay.forEach(x => { ['ban_giao', 'tra'].forEach(k => { const i = o(x.dong, k); if (i) { i.classList.add('nghi'); i.title = 'Không tìm thấy dòng trên bản giấy – nhập tay'; } }); });
    const n = document.querySelectorAll('.o-sua.nghi').length, ly = $('ly-do');
    if (ly) ly.value = 'Cập nhật từ bản giấy: ' + (ten || '');
    const bang = document.querySelector('.bb-sua'), tb = document.getElementById('scan-tb') || document.createElement('div');
    tb.id = 'scan-tb'; tb.className = 'scan-tb';
    tb.innerHTML = '📄 Đã điền số đọc từ bản giấy <b>' + esc(ten || '') + '</b>. ' + (n ? '<b style="color:var(--bad)">' + n + ' ô viền đỏ cần kiểm tra / nhập tay</b> (rê chuột vào ô để xem lý do). ' : 'Không có ô nghi ngờ. ') + 'Kiểm tra rồi bấm "Lưu thay đổi".';
    if (bang && !tb.parentNode) bang.closest('.card').insertBefore(tb, bang.closest('.tbl-wrap'));
    const dau = document.querySelector('.o-sua.nghi') || document.querySelector('.o-sua.da-sua'); if (dau) dau.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------------- Cài đặt – mã QR tổng (admin) ----------------
  async function manCaiDat() {
    if (!laAdmin()) { location.hash = '#/tong-quan'; return; }
    const nd = trang('Cài đặt – mã QR tổng');
    const cd = await api('cd_doc'), url = trangCongKhai(), qr = await svgQR(url, 4);
    nd.innerHTML = '<div class="grid g2"><div class="card"><h2>Trang chủ công khai</h2><form id="f">' +
      o('hk_qr', 'Học kỳ áp dụng cho mã QR (danh sách lớp thực hành trên trang công khai)', { select: [['', 'Tự động theo ngày (khuyên dùng)' + (cd.hk_tu_dong ? ' – hiện là ' + cd.hk_tu_dong : '')]].concat((S.dm.hoc_ky || []).map(h => [h, h])), v: cd.hk_qr }) +
      '<p class="note" id="hk-qr-note" style="margin-top:-6px">Trang công khai đang dùng thời khóa biểu <b>' + esc(cd.hk_qr_dang || '—') + '</b>. Tự động: học kỳ có ngày bắt đầu – kết thúc chứa hôm nay (giữa hai kỳ: kỳ bắt đầu gần nhất). Chọn hẳn một học kỳ khi muốn chuyển sớm sang thời khóa biểu mới; chọn lại "Tự động" khi xong.</p>' +
      o('thong_bao', 'Thông báo trang chủ (để trống nếu không có)', { v: cd.thong_bao, area: 1 }) +
      o('le_phi_ngoai', 'Lệ phí SV ngoài đơn vị (Phụ lục 3)', { v: cd.le_phi_ngoai, ph: 'VD: 200.000 đ / tháng' }) + o('kho_tu_tru', 'Cấp phát theo biên bản tự trừ kho hóa chất', { select: ['Có', 'Không'], v: cd.kho_tu_tru }) +
      '<h2 style="margin-top:12px">Người ký trên biểu mẫu (in họ tên dưới chữ ký)</h2>' + o('ky_hieu_truong', 'Hiệu trưởng', { v: cd.ky_hieu_truong }) + o('ky_truong_khoa', 'Trưởng khoa', { v: cd.ky_truong_khoa }) + o('ky_nguoi_lap', 'Người lập biểu', { v: cd.ky_nguoi_lap }) +
      '<button class="btn">Lưu</button></form></div><div class="card"><h2>Mã QR tổng</h2><div class="qr-to">' + qr + '</div><p class="mono" style="word-break:break-all">' + esc(url) + '</p>' +
      '<div class="btns"><button class="btn sm" id="b-poster">In poster QR tổng (A4)</button><button class="btn o sm" id="b-rieng">In mã QR riêng QR1 – QR8</button><a class="btn o sm" href="' + esc(url) + (Q.DEMO ? '?demo=1' : '') + '" target="_blank" rel="noopener">Mở trang công khai</a></div>' +
      '<p class="note">Dán poster tại các phòng. Mã QR riêng từng biểu mẫu tạo sẵn, chưa dùng (theo bản chốt).</p></div></div>' +
      '<div class="card"><h2>Xuất toàn bộ dữ liệu (sao lưu)</h2><p class="note">Một file Excel, mỗi bảng dữ liệu một trang tính: cán bộ, phòng, tủ, thiết bị, lịch sử thiết bị, học kỳ, vật tư, định mức, lớp TH, biên bản, dòng biên bản, cấp phát, đơn QR1 – QR8, hồ sơ đề tài, kho, dự trù, sổ theo dõi, nhật ký. Không gồm mật khẩu, khóa máy và phiên đăng nhập.</p>' +
      '<button class="btn sm" id="b-sao-luu">⇩ Tải toàn bộ dữ liệu (Excel)</button></div>' +
      '<div class="card"><h2>Làm mới dữ liệu</h2><p class="note">Hệ thống giữ tạm dữ liệu 10 phút để tải nhanh. Sau khi <b>sửa tay trực tiếp trong Google Sheet CSDL</b>, bấm nút này để mọi máy thấy ngay (thao tác trên web luôn cập nhật tức thì).</p><button class="btn o sm" id="b-lam-moi">↻ Làm mới dữ liệu</button></div>' +
      '<div class="card"><h2>Báo cáo tháng tự động</h2><p class="note">Trong trình soạn thảo Apps Script, chạy hàm <span class="mono">caiLichBaoCao</span> một lần (cần cấp quyền) → ngày 1 hằng tháng lúc 6 giờ hệ thống tự lưu báo cáo tháng trước (PDF + CSV mở bằng Excel) vào Drive: 05 HE THONG WEB PTN / BAO CAO THANG / NAM HOC ….</p></div>';
    $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); await chay(e.submitter, () => api('cd_luu', v)); toast('Đã lưu');
      Object.assign(window.PTN_KY, { hieu_truong: v.ky_hieu_truong, truong_khoa: v.ky_truong_khoa, nguoi_lap: v.ky_nguoi_lap });
      const cd2 = await api('cd_doc'); $('hk-qr-note').querySelector('b').textContent = cd2.hk_qr_dang || '—'; };
    const poster = async () => xem('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Poster QR tong</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;text-align:center;color:#1F3E8C}h1{font-size:30px;margin:8px 0}h2{font-size:20px;color:#000;font-weight:normal}' +
      '.qr svg{width:120mm;height:120mm}ol{text-align:left;font-size:15px;color:#000;max-width:150mm;margin:10px auto}</style></head><body><div style="font-size:14px">ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH<br><b>KHOA KHOA HỌC SỨC KHỎE</b></div>' +
      '<h1>PHÒNG THÍ NGHIỆM – QUÉT MÃ ĐỂ ĐĂNG KÝ</h1><h2>Mượn phòng, thiết bị, dụng cụ · Nhật ký sử dụng (QR5) · Tủ · Hóa chất bổ sung · Hồ sơ KLTN – NCKH</h2><div class="qr">' + await svgQR(url, 8) + '</div>' +
      '<ol><li>Quét mã bằng camera điện thoại, nhập thông tin cá nhân một lần.</li><li>Chọn biểu mẫu QR1 – QR8 cần đăng ký.</li><li><b>Bắt buộc quét QR5 trước khi sử dụng thiết bị</b>; dùng xong bấm "Kết thúc sử dụng".</li><li>Theo dõi trạng thái ở "Đơn của tôi".</li></ol><p style="font-size:12px;color:#555">' + esc(url) + '</p></body></html>');
    $('b-poster').onclick = poster;
    $('b-sao-luu').onclick = (e) => chay(e.target, xuatTatCa);
    $('b-lam-moi').onclick = async (e) => { await chay(e.target, () => api('cd_lam_moi')); toast('Đã làm mới – dữ liệu đọc lại từ Google Sheet'); };
    $('b-rieng').onclick = async () => {
      const ten = { QR1: 'Mượn phòng; TB – DC trong ngày', QR2: 'GV mượn thiết bị dài ngày', QR3: 'Cấp hóa chất – vật tư bổ sung', QR4: 'Mượn chìa khóa (Bảo vệ)', QR5: 'Nhật ký sử dụng phòng, thiết bị', QR6: 'Đăng ký sử dụng tủ', QR7: 'Hồ sơ đề tài KLTN – NCKH', QR8: 'Mượn thêm dụng cụ' };
      let h = ''; for (const q of Object.keys(ten)) h += '<div class="o"><div class="qr">' + await svgQR(url + '?qr=' + q, 4) + '</div><b>' + q + '</b><div>' + ten[q] + '</div></div>';
      xem('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Ma QR rieng</title><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif}.l{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.o{text-align:center;border:1px dashed #aaa;padding:5mm}.qr svg{width:55mm;height:55mm}b{font-size:20px;color:#1F3E8C}</style></head><body><div class="l">' + h + '</div></body></html>');
    };
  }

  // ---------------- Biên bản bàn giao: 3 mục riêng ----------------
  const NHOM_BB = {
    hc: { ten: 'BBBG Hóa chất – lớp thực hành', ngan: 'Hóa chất – lớp TH', loc: b => b.loai === 'HC' },
    dc: { ten: 'BBBG Dụng cụ – lớp thực hành', ngan: 'Dụng cụ – lớp TH', loc: b => b.loai === 'DC' && b.nhanh !== 'KLTN – NCKH' },
    kltn: { ten: 'BBBG Dụng cụ – Đồ án, KLTN, NCKH', ngan: 'Dụng cụ – Đồ án, KLTN, NCKH', loc: b => b.nhanh === 'KLTN – NCKH' }
  };
  const nhomCuaBB = (b) => b.nhanh === 'KLTN – NCKH' ? 'kltn' : b.loai === 'HC' ? 'hc' : 'dc';
  const MAU_BB = { 'Đã tạo': 't-gray', 'Đang soạn': 't-warn', 'Đã giao': 't-info', 'Đã ký': 't-ok', 'Đã quyết toán': 't-ok' };
  const TEN_CP = { ban_giao: 'Bàn giao', bo_sung: 'Bổ sung / mượn thêm', tra: 'Trả', sua_ke_hoach: 'Sửa SL dự trù / đăng ký', sua_ban_giao: 'Sửa bàn giao', sua_bo_sung: 'Sửa bổ sung', sua_tra: 'Sửa trả', sua_ghi_chu: 'Sửa ghi chú' };
  async function anhQR(text) { try { const QR = await napQR(), q = QR(0, 'M'); q.addData(text); q.make(); return { dataUrl: q.createDataURL(4, 1) }; } catch (e) { return null; } }
  async function moInBB(dsId) {
    const kq = await bbTheoMau({ ids: dsId }, { mau: true }, dsId.length === 1 ? 'BBBG ' + dsId[0] : 'BBBG ' + dsId.length + ' bien ban ' + homNay());
    window.PTN_IN.xemTruoc(kq);
  }
  // Biên bản theo mẫu (mỗi biên bản một trang tính, mã QR góc phải trên) và / hoặc các bảng số liệu: Tổng hợp · Chi tiết từng dòng · Tổng theo vật tư · Lịch sử cấp phát
  const LOAI_BB = (b) => NHOM_BB[nhomCuaBB(b)].ngan;
  async function bbTheoMau(loc, chon, tenTep) {
    const r = await api('bb_xuat', loc), IN = window.PTN_IN, r3 = (n) => Math.round((+n || 0) * 1000) / 1000;
    if (!r.bb.length) throw new Error('Không có biên bản để xuất');
    const bbTheoId = {}; r.bb.forEach(b => { bbTheoId[b.id] = b; });
    const dongTheoId = {}; r.dong.forEach(d => { dongTheoId[d.id] = d; });
    const thucDung = (d) => r3((+d.ban_giao || 0) + (+d.bo_sung || 0) - (+d.tra || 0));
    const bb = r.bb.slice().sort((a, b) => a.hk.localeCompare(b.hk) || LOAI_BB(a).localeCompare(LOAI_BB(b), 'vi') || a.ten_mon.localeCompare(b.ten_mon, 'vi') || a.id.localeCompare(b.id));
    const vungIn = loc.ids ? bb.length + ' biên bản đã chọn' : loc.hk ? 'học kỳ ' + loc.hk : 'mọi học kỳ', phu = 'Khoa Khoa học Sức khỏe – ' + vungIn + ', lập ngày ' + ngayVN(homNay()), lap = S.toi.nguoi.ten;
    const S1 = IN.bieuMau({ ten: 'Tổng hợp', tieuDe: 'TỔNG HỢP BIÊN BẢN BÀN GIAO VẬT TƯ – HÓA CHẤT – DỤNG CỤ', phuDe: phu, nguoiLap: lap,
      cot: ['STT', 'Số biên bản', 'Loại', 'Môn / đề tài', 'Lớp / mã hồ sơ', 'GVHD', 'Phòng', 'Thời gian', { ten: 'Sĩ số', so: 1 }, { ten: 'Số dòng', so: 1 }, { ten: 'Dòng bổ sung', so: 1 }, { ten: 'Dòng nợ', so: 1 }, 'Trạng thái'],
      dong: bb.map((b, i) => [i + 1, b.id, LOAI_BB(b), b.ten_mon, b.lop, b.gv, b.phong, (b.thoi_gian || '').split(' → ').map(ngayVN).join(' → '), b.si_so, b.so_dong, b.bo_sung, b.no, b.trang_thai]) });
    const thuTu = {}; bb.forEach((b, i) => { thuTu[b.id] = i; });
    const dong = r.dong.slice().sort((a, b) => thuTu[a.bb] - thuTu[b.bb] || (+a.stt || 0) - (+b.stt || 0));
    const dongCT = []; let bbTruoc = '';
    dong.forEach(d => { const b = bbTheoId[d.bb]; if (d.bb !== bbTruoc) { bbTruoc = d.bb; dongCT.push({ nhom: b.id + ' – ' + b.ten_mon + ' – ' + b.lop + ' (' + b.trang_thai + ')' }); }
      dongCT.push([d.stt, d.ten + (d.canh_bao ? ' (*)' : ''), d.ma_vt || d.nsx, d.dvt, d.ke_hoach, d.ban_giao, d.bo_sung, d.tra, thucDung(d), d.ghi_chu]); });
    const S2 = IN.bieuMau({ ten: 'Chi tiết từng dòng', tieuDe: 'CHI TIẾT VẬT TƯ – HÓA CHẤT – DỤNG CỤ THEO BIÊN BẢN', phuDe: phu, nguoiLap: lap, ghiChu: '(*) Ngoài định mức. Cột "Thực dùng / còn nợ" = bàn giao + bổ sung − trả (hóa chất: thực dùng; dụng cụ: còn nợ).',
      cot: ['STT', 'Tên – quy cách', 'Mã VT / NSX', 'ĐVT', { ten: 'Dự trù / đăng ký', so: 1 }, { ten: 'Bàn giao', so: 1 }, { ten: 'Bổ sung', so: 1 }, { ten: 'Trả', so: 1 }, { ten: 'Thực dùng / còn nợ', so: 1 }, 'Ghi chú'], dong: dongCT });
    const gop = {};
    dong.forEach(d => { const b = bbTheoId[d.bb], k = [b.loai, d.ma_vt || boDau(d.ten), d.dvt].join('|');
      const g = gop[k] = gop[k] || { loai: b.loai === 'HC' ? 'Hóa chất – vật tư' : 'Dụng cụ', ma_vt: d.ma_vt, ten: d.ten, nsx: d.nsx, dvt: d.dvt, bb: {}, kh: 0, bg: 0, bs: 0, tra: 0 };
      g.bb[b.id] = 1; g.kh += +d.ke_hoach || 0; g.bg += +d.ban_giao || 0; g.bs += +d.bo_sung || 0; g.tra += +d.tra || 0; });
    const dongVT = []; let loaiTruoc = '';
    Object.keys(gop).map(k => gop[k]).sort((a, b) => a.loai.localeCompare(b.loai, 'vi') || a.ten.localeCompare(b.ten, 'vi')).forEach(g => {
      if (g.loai !== loaiTruoc) { loaiTruoc = g.loai; dongVT.push({ nhom: g.loai }); }
      dongVT.push([g.ma_vt, g.ten, g.nsx, g.dvt, Object.keys(g.bb).length, r3(g.kh), r3(g.bg), r3(g.bs), r3(g.tra), r3(g.bg + g.bs - g.tra)]); });
    const S3 = IN.bieuMau({ ten: 'Tổng theo vật tư', tieuDe: 'TỔNG HỢP VẬT TƯ – HÓA CHẤT – DỤNG CỤ ĐÃ BÀN GIAO', phuDe: phu, nguoiLap: lap,
      cot: ['Mã VT', 'Tên – quy cách', 'NSX', 'ĐVT', { ten: 'Số biên bản', so: 1 }, { ten: 'Dự trù / đăng ký', so: 1 }, { ten: 'Bàn giao', so: 1 }, { ten: 'Bổ sung', so: 1 }, { ten: 'Trả', so: 1 }, { ten: 'Thực dùng / còn nợ', so: 1 }], dong: dongVT });
    const S4 = IN.bieuMau({ ten: 'Lịch sử cấp phát', tieuDe: 'SỔ THEO DÕI CẤP PHÁT – HOÀN TRẢ THEO BIÊN BẢN', phuDe: phu, nguoiLap: lap,
      cot: ['Ngày', 'Số biên bản', 'Môn / đề tài', 'Tên – quy cách', 'ĐVT', 'Nội dung', { ten: 'Số lượng', so: 1 }, 'Người nhận', 'Ghi chú', 'Người ghi'],
      dong: r.cap_phat.slice().sort((a, b) => String(a.tao).localeCompare(String(b.tao))).map(c => { const b = bbTheoId[c.bb] || {}, d = dongTheoId[c.dong] || {};
        return [ngayVN(c.ngay), c.bb, b.ten_mon, d.ten, d.dvt, TEN_CP[c.loai] || c.loai, c.sl, c.nguoi_nhan, c.ghi_chu, c.nguoi]; }) });
    const trangTinh = [];
    if (chon.mau) for (const b of bb) {
      const hs = b.nhanh === 'KLTN – NCKH' ? await api('hs_ct', { id: b.lop }).catch(() => null) : null;
      const t = window.PTN_MAU.bienBan({ bb: b, dong: dong.filter(d => d.bb === b.id), cap_phat: r.cap_phat.filter(c => c.bb === b.id), tep: r.tep.filter(f => f.lien_ket === b.id) }, await anhQR(lienKet('bien-ban/' + b.id)), hs).trang[0];
      t.ten = b.id.slice(0, 31); trangTinh.push(t);
    }
    if (chon.soLieu) trangTinh.push(S1, S2, S3, S4);
    return { ten: tenTep, trang: trangTinh, so_bb: bb.length };
  }
  function hopXuatBB(hk, dangHien, daChon) {
    const lc = [['chon', 'Các biên bản đã chọn (' + daChon.length + ')', daChon.length], ['hien', 'Các biên bản đang hiển thị (' + dangHien.length + ')', dangHien.length],
      ['hk', 'Toàn bộ biên bản học kỳ ' + hk + ' (cả 3 loại)', hk], ['tat_ca', 'Toàn bộ biên bản mọi học kỳ', 1]].filter(x => x[2]);
    moHop('<h2>In / tải biên bản bàn giao</h2><form id="f"><div class="f"><span>Phạm vi</span>' + lc.map((x, i) => '<label class="check"><input type="radio" name="pv" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(x[1]) + '</label>').join('') + '</div>' +
      '<div class="f"><span>Nội dung</span><label class="check"><input type="checkbox" name="mau" checked> Biên bản theo mẫu (mỗi biên bản một trang, mã QR góc phải trên)</label>' +
      '<label class="check"><input type="checkbox" name="so_lieu"> Bảng số liệu tổng hợp (Tổng hợp · Chi tiết từng dòng · Tổng theo vật tư · Lịch sử cấp phát)</label></div>' +
      '<p class="note">"Xem trước – in" mở bản khổ A4 để in thẳng từ web (hoặc chọn "Lưu thành PDF" trong hộp in); trong bản xem trước cũng có nút Tải Excel.</p>' +
      '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button type="button" class="btn o" id="b-x-excel">Tải Excel</button><button class="btn">Xem trước – in</button></div></form>');
    const lam = async (nut, xem) => {
      const f = $('f'), pv = f.querySelector('[name=pv]:checked').value, chon = { mau: f.querySelector('[name=mau]').checked, soLieu: f.querySelector('[name=so_lieu]').checked };
      if (!chon.mau && !chon.soLieu) return toast('Chọn ít nhất một nội dung', true);
      const loc = pv === 'chon' ? { ids: daChon } : pv === 'hien' ? { ids: dangHien } : pv === 'hk' ? { hk } : {};
      const ten = 'BBBG ' + (pv === 'hk' ? hk : pv === 'tat_ca' ? 'tat ca hoc ky' : (pv === 'chon' ? daChon : dangHien).length + ' bien ban') + ' ' + homNay();
      await chay(nut, async () => { const kq = await bbTheoMau(loc, chon, ten); dongHop(); if (xem) window.PTN_IN.xemTruoc(kq); else { await window.PTN_IN.taiExcel(kq); toast('Đã tải ' + kq.so_bb + ' biên bản'); } });
    };
    $('f').onsubmit = (e) => { e.preventDefault(); lam(e.submitter, true); };
    $('b-x-excel').onclick = (e) => lam(e.target, false);
  }
  const gvNgan = (gv) => { const l = String(gv || '').split(/\s*,\s*/).filter(Boolean); return esc(l[0] || '') + (l.length > 1 ? ' <span class="note">+' + (l.length - 1) + '</span>' : ''); };
  async function manBB(p) {
    if (p[1] && !NHOM_BB[p[1]]) return manBBct(decodeURIComponent(p[1]));
    const nhom = p[1] || 'hc', N = NHOM_BB[nhom], kltn = nhom === 'kltn';
    const nd = trang('Biên bản bàn giao', '<button class="btn o sm" id="b-tu-nhan">Tải bản ký (tự nhận qua mã QR)</button>' +
      (!kltn && coQuyen('hoa-chat', 'xu_ly') ? '<button class="btn o sm" id="b-file-dm">⇪ Tải file ' + (nhom === 'hc' ? 'định mức hóa chất' : 'dụng cụ') + ' của môn</button>' : '') + (kltn ? '' : '<button class="btn sm" id="b-tao">+ Tạo ' + esc(N.ten.replace('BBBG', 'biên bản').toLowerCase()) + '</button>'));
    $('b-xuat-trang').remove(); // biên bản in / tải theo mẫu bằng nút riêng
    const hk = Q.S.hk || (S.dm.hoc_ky || [])[0] || '';
    const tatCa = await api('bb_ds', { hk: '' }), cuaHK = tatCa.filter(b => kltn || b.hk === hk);
    const dem = (k) => tatCa.filter(b => NHOM_BB[k].loc(b) && (k === 'kltn' || b.hk === hk)).length;
    const ds = cuaHK.filter(N.loc).sort((a, b) => a.ten_mon.localeCompare(b.ten_mon, 'vi') || a.id.localeCompare(b.id));
    nd.innerHTML = '<div class="bb-nhom">' + Object.keys(NHOM_BB).map(k => '<a class="bb-the' + (k === nhom ? ' on' : '') + '" href="#/bien-ban/' + k + '"><span class="ico">' + Q.icon(k === 'hc' ? 'hoa-chat' : k === 'dc' ? 'kho' : 'de-tai') + '</span><b>' + esc(NHOM_BB[k].ten) + '</b><span class="note">' + dem(k) + ' biên bản' + (k === 'kltn' ? ' (mọi học kỳ)' : ' – ' + esc(hk)) + '</span></a>').join('') + '</div>' +
      '<div class="tools">' + (kltn ? '' : '<b>Học kỳ</b> <select id="f-hk">' + (S.dm.hoc_ky || []).map(h => '<option' + (h === hk ? ' selected' : '') + '>' + esc(h) + '</option>').join('') + '</select>') +
      '<input type="search" id="q" placeholder="Tìm ' + (kltn ? 'đề tài, mã hồ sơ, GVHD' : 'môn, lớp, GV, phòng') + '…"><select id="f-tt"><option value="">Mọi trạng thái</option>' + S.dm.trang_thai_bb.map(t => '<option>' + esc(t) + '</option>').join('') + '</select>' +
      '<label class="check" style="margin:0"><input type="checkbox" id="f-cb"> Có ⚠ / bổ sung / nợ</label><button class="btn sm" id="b-xuat-bb">🖨 In / tải biên bản</button></div><div id="kq"></div>';
    let dangHien = [];
    const ve = () => {
      const q = boDau($('q').value), tt = $('f-tt').value, cb = $('f-cb').checked;
      const l = ds.filter(b => (!q || boDau([b.id, b.ten_mon, b.lop, b.gv, b.phong].join(' ')).indexOf(q) >= 0) && (!tt || b.trang_thai === tt) && (!cb || b.canh_bao || b.bo_sung || b.no));
      dangHien = l.map(b => b.id);
      $('kq').innerHTML = !l.length ? '<div class="card empty">' + (ds.length ? 'Không có biên bản phù hợp.' : kltn ? 'Chưa có. Biên bản dụng cụ của đồ án, KLTN, NCKH được tạo khi duyệt hồ sơ đề tài (QR7).' : 'Học kỳ ' + esc(hk) + ' chưa có. Bấm "+ Tạo" – hệ thống tạo cho mọi môn có thời khóa biểu và định mức.') + '</div>'
        : '<div class="tbl-wrap"><table class="bb-bang"><thead><tr><th><input type="checkbox" id="chon-het" title="Chọn tất cả"></th><th>Số biên bản</th><th>' + (kltn ? 'Đề tài' : 'Môn thực hành') + '</th><th>' + (kltn ? 'Mã hồ sơ' : 'Lớp') + '</th><th>GVHD</th><th>Phòng</th><th>Thời gian</th>' +
          '<th class="num">' + (kltn ? 'SV' : 'SV / ca') + '</th><th class="num">Dòng</th><th>Theo dõi</th><th>Trạng thái</th><th>Bản ký</th></tr></thead><tbody>' +
          l.map(b => '<tr class="click" data-id="' + esc(b.id) + '"><td><input type="checkbox" data-chon="' + esc(b.id) + '"></td><td class="mono" style="white-space:nowrap">' + esc(b.id) + '</td><td><b>' + esc(b.ten_mon) + '</b></td><td>' + esc(b.lop) + '</td><td title="' + esc(b.gv) + '">' + gvNgan(b.gv) + '</td><td>' + esc(b.phong) + '</td>' +
            '<td style="white-space:nowrap">' + esc((b.thoi_gian || '').split(' → ').map(ngayVN).join(' → ')) + '</td><td class="num">' + esc(b.si_so) + (kltn ? '' : ' / ' + esc(b.so_nhom)) + '</td><td class="num">' + b.so_dong + '</td><td>' +
            [b.bo_sung ? '<span class="tag t-info">+' + b.bo_sung + ' bổ sung</span>' : '', b.no ? '<span class="tag t-bad">' + b.no + ' dòng nợ</span>' : '', b.canh_bao ? '<span class="tag t-warn">⚠ ' + b.canh_bao + '</span>' : ''].join(' ') +
            '</td><td><span class="tag ' + (MAU_BB[b.trang_thai] || 't-gray') + '">' + esc(b.trang_thai) + '</span></td><td>' + (b.ban_ky ? '📎 ' + b.ban_ky : '') + '</td></tr>').join('') + '</tbody></table></div><p class="note">' + l.length + ' / ' + ds.length + ' biên bản · bấm một dòng để mở và nhập trực tiếp số bàn giao, bổ sung, trả, ghi chú.</p>';
      Q.ganDieuHuong(l.map(b => '#/bien-ban/' + encodeURIComponent(b.id)), 'biên bản');
      $('kq').querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = (e) => { if (e.target.closest('input')) return; location.hash = '#/bien-ban/' + encodeURIComponent(tr.dataset.id); }; });
      const capNhat = () => { const n = $('kq').querySelectorAll('[data-chon]:checked').length; $('b-xuat-bb').textContent = '🖨 In / tải biên bản' + (n ? ' (' + n + ' đã chọn)' : ''); };
      $('kq').querySelectorAll('[data-chon]').forEach(c => { c.onchange = capNhat; });
      if ($('chon-het')) $('chon-het').onchange = (e) => { $('kq').querySelectorAll('[data-chon]').forEach(c => { c.checked = e.target.checked; }); capNhat(); };
    };
    ['q', 'f-tt', 'f-cb'].forEach(id => { $(id).oninput = ve; $(id).onchange = ve; }); ve();
    if ($('f-hk')) $('f-hk').onchange = (e) => { Q.S.hk = e.target.value; dieuHuong(); };
    $('b-tu-nhan').onclick = () => Q.hopTuNhanBanKy();
    if ($('b-file-dm')) $('b-file-dm').onclick = () => nhom === 'hc' ? Q.nhapFileHC() : Q.nhapFileDC();
    $('b-xuat-bb').onclick = () => hopXuatBB(hk, dangHien, [...$('kq').querySelectorAll('[data-chon]:checked')].map(c => c.dataset.chon));
    if ($('b-tao')) $('b-tao').onclick = async (e) => {
      const loai = nhom === 'hc' ? 'HC' : 'DC', r = await chay(e.target, () => api('bb_tao', { hk, loai }));
      moHop('<h2>Tạo ' + esc(N.ten) + ' – ' + esc(hk) + '</h2><p><b>Đã tạo ' + r.tao.length + ' biên bản.</b></p>' + (r.bo_qua.length ? '<p>Bỏ qua ' + r.bo_qua.length + ':</p><ul class="note">' + r.bo_qua.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') + '<div class="modal-foot"><button class="btn" data-dong>Đóng</button></div>');
      dieuHuong();
    };
  }
  async function manBBct(id) {
    const r = await api('bb_ct', { id }), b = r.bb, nhom = nhomCuaBB(b), N = NHOM_BB[nhom], dc = b.loai === 'DC', kltn = nhom === 'kltn';
    const nd = trang(esc(b.ten_mon), '', '<a href="#/bien-ban/' + nhom + '">' + esc(N.ten) + '</a> ›');
    $('b-xuat-trang').remove();
    $('main').querySelector('h1').innerHTML = esc(b.ten_mon) + ' <span class="tag ' + (MAU_BB[b.trang_thai] || 't-gray') + '">' + esc(b.trang_thai) + '</span>';
    const suaDK = kltn || coQuyen('hoa-chat', 'xu_ly'), so = (v) => v === '' || v == null ? '' : Math.round(+v * 1000) / 1000;
    const no = (d) => Math.round(((+d.ban_giao || 0) + (+d.bo_sung || 0) - (+d.tra || 0)) * 1000) / 1000;
    const o2 = (d, k, w) => '<input class="o-sua" type="' + (k === 'ghi_chu' ? 'text' : 'number') + '"' + (k === 'ghi_chu' ? '' : ' step="any" min="0" inputmode="decimal"') + ' data-d="' + esc(d.id) + '" data-k="' + k + '" value="' + esc(k === 'ghi_chu' ? d[k] : so(d[k])) + '" data-goc="' + esc(k === 'ghi_chu' ? d[k] : so(d[k])) + '" style="width:' + w + '">';
    let h = '<div class="btns" style="margin-bottom:12px"><button class="btn sm" id="b-in">🖨 Xem trước – in / tải Excel</button><button class="btn sm" id="b-giay">⇪ Cập nhật từ bản giấy</button><button class="btn o sm" id="b-ky">Đính kèm bản ký</button>' +
      '<button class="btn o sm" id="b-dien">Điền bàn giao = ' + (kltn ? 'SL đăng ký' : 'dự trù') + '</button><button class="btn o sm" id="b-them">+ Thêm dòng</button><button class="btn o sm" id="b-sua-bb">Sửa thông tin</button>' +
      '<select id="f-tt">' + S.dm.trang_thai_bb.map(t => '<option' + (t === b.trang_thai ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select><button class="btn o sm" id="b-tt">Đổi trạng thái</button>' +
      (laAdmin() ? '<button class="btn red sm" id="b-xoa">Xóa</button>' : '') + '</div>';
    h += '<div class="grid g2"><div class="card"><dl class="kv"><dt>Số biên bản</dt><dd class="mono">' + esc(b.id) + '</dd><dt>Loại</dt><dd>' + esc(N.ten) + '</dd><dt>Học kỳ</dt><dd>' + esc(b.hk) + '</dd>' +
      (kltn ? '<dt>Hồ sơ đề tài</dt><dd><a href="#/de-tai/' + esc(b.lop) + '">' + esc(b.lop) + '</a></dd>' : '<dt>Môn</dt><dd>' + (coQuyen('hoa-chat', 'xem') && b.mon ? '<a href="#/hoa-chat/mon/' + esc(b.mon) + '">' + esc(b.ten_mon) + '</a>' : esc(b.ten_mon)) + '</dd><dt>Lớp</dt><dd>' + esc(b.lop) + '</dd>') +
      '<dt>' + (kltn ? 'Số SV' : 'Tổng sĩ số') + '</dt><dd>' + esc(b.si_so) + (kltn ? '' : ' SV · ' + esc(b.so_nhom) + ' ca/nhóm') + '</dd><dt>GVHD</dt><dd>' + esc(b.gv) + '</dd><dt>Phòng</dt><dd>' + esc(b.phong) + '</dd><dt>Thời gian</dt><dd>' + esc((b.thoi_gian || '').split(' → ').map(ngayVN).join(' → ')) + '</dd>' +
      (b.ghi_chu ? '<dt>Ghi chú</dt><dd>' + esc(b.ghi_chu) + '</dd>' : '') + '</dl></div>' +
      '<div class="card"><h2>Bản ký & tệp (' + r.tep.length + ')</h2>' + (r.tep.length ? '<ul class="files">' + r.tep.map(f => '<li><span>📄 ' + esc(f.ten) + '<br><span class="note">' + esc(ngayVN(f.tao) + ' · ' + f.nguoi) + '</span></span><span class="btns">' + (/^image\/|pdf/.test(f.mime) ? '<button class="btn o sm" data-doc="' + esc(f.id) + '">Cập nhật số từ tệp này</button>' : '') + '<button class="btn o sm" data-tai="' + esc(f.id) + '">Tải về</button></span></li>').join('') + '</ul>' : '<div class="note">Chưa có. Sau khi ký, chụp/scan biên bản và bấm "Đính kèm bản ký".</div>') +
      '<h2 style="margin-top:14px">Lịch sử cấp phát – chỉnh sửa (' + r.cap_phat.length + ')</h2>' + (r.cap_phat.length ? '<div style="max-height:240px;overflow:auto">' + r.cap_phat.map(c => { const d = r.dong.find(x => x.id === c.dong) || {};
        return '<div class="note" style="padding:2px 0"><b>' + esc(TEN_CP[c.loai] || c.loai) + '</b> · ' + esc(d.ten || '') + (c.sl !== '' && !/^sua_/.test(c.loai) ? ' · ' + fmt(c.sl) : '') + (c.ghi_chu ? ' · ' + esc(c.ghi_chu) : '') + (c.nguoi_nhan ? ' · ' + esc(c.nguoi_nhan) : '') + '<br>' + esc(ngayVN(c.tao) + ' · ' + c.nguoi + ' · ' + c.nguon) + '</div>'; }).join('') + '</div>' : '<div class="note">Chưa có.</div>') + '</div></div>';
    h += '<div class="card"><div class="btns" style="justify-content:space-between"><h2 style="margin:0">Danh mục ' + (dc ? 'dụng cụ' : 'vật tư – hóa chất') + ' (' + r.dong.length + ')</h2><span class="note">Nhập trực tiếp vào ô trắng rồi bấm "Lưu thay đổi". Mọi thay đổi được lưu vết.</span></div>' +
      '<div class="tbl-wrap"><table class="bb-sua"><thead><tr><th>STT</th><th>' + (dc ? 'Tên dụng cụ' : 'Tên nguyên liệu – quy cách') + '</th><th>' + (dc ? 'NSX' : 'Mã VT') + '</th><th>ĐVT</th>' + (kltn ? '' : '<th class="num">' + (dc ? 'ĐM/nhóm' : 'ĐM 1SV') + '</th>') +
      '<th class="num">' + (kltn ? 'SL đăng ký' : 'Dự trù') + '</th><th>' + (dc ? 'Mượn (bàn giao)' : 'Bàn giao (thực nhận)') + '</th><th>' + (dc ? 'Mượn thêm' : 'Bổ sung') + '</th><th>' + (dc ? 'Trả' : 'Hoàn trả') + '</th>' + (dc ? '<th class="num">Còn nợ</th>' : '') + '<th>Ghi chú</th></tr></thead><tbody>';
    let nhomDong = '';
    r.dong.forEach(d => {
      if (d.nhom && d.nhom !== nhomDong && r.dong.some(x => x.nhom !== d.nhom)) { nhomDong = d.nhom; h += '<tr><td colspan="' + (kltn ? 10 : 11) + '" class="nhom-dong">' + esc(d.nhom) + '</td></tr>'; }
      h += '<tr data-dong-id="' + esc(d.id) + '"' + (d.canh_bao ? ' class="canh-bao"' : '') + '><td>' + esc(d.stt) + '</td><td>' + esc(d.ten) + (d.kiem_soat ? ' <span class="tag t-bad">kiểm soát</span>' : '') + (d.canh_bao ? '<div><span class="tag t-warn">⚠ ' + esc(d.canh_bao) + '</span> <span class="note">' + esc(d.nguon) + '</span></div>' : '') + '</td>' +
        '<td class="mono">' + esc(dc ? d.nsx : d.ma_vt || '') + '</td><td>' + esc(d.dvt) + '</td>' + (kltn ? '' : '<td class="num">' + fmt(d.dm) + '</td>') +
        '<td class="num">' + (suaDK ? o2(d, 'ke_hoach', '78px') : fmt(d.ke_hoach)) + '</td><td>' + o2(d, 'ban_giao', '88px') + '</td><td>' + o2(d, 'bo_sung', '80px') + '</td><td>' + o2(d, 'tra', '76px') + '</td>' +
        (dc ? '<td class="num">' + (no(d) > 0 ? '<b style="color:var(--bad)">' + fmt(no(d)) + '</b>' : '') + '</td>' : '') + '<td>' + o2(d, 'ghi_chu', '100%') + '</td></tr>';
    });
    h += '</tbody></table></div></div><div class="luu-thanh hide" id="luu-thanh"><span id="so-doi"></span><input type="text" id="ly-do" placeholder="Người nhận / lý do (không bắt buộc)"><button class="btn" id="b-luu">Lưu thay đổi</button><button class="btn o" id="b-huy">Bỏ</button></div>';
    nd.innerHTML = h;
    const doi = () => [...nd.querySelectorAll('.o-sua')].filter(i => i.value.trim() !== i.dataset.goc);
    const capNhat = () => { const n = doi().length; $('luu-thanh').classList.toggle('hide', !n); $('so-doi').textContent = n + ' ô đã sửa chưa lưu'; nd.querySelectorAll('.o-sua').forEach(i => i.classList.toggle('da-sua', i.value.trim() !== i.dataset.goc)); };
    nd.addEventListener('input', (e) => { if (e.target.classList.contains('o-sua')) capNhat(); });
    $('b-huy').onclick = () => { nd.querySelectorAll('.o-sua').forEach(i => { i.value = i.dataset.goc; }); capNhat(); };
    $('b-luu').onclick = async (e) => {
      const g = {}; doi().forEach(i => { (g[i.dataset.d] = g[i.dataset.d] || { dong: i.dataset.d })[i.dataset.k] = i.value.trim(); });
      const kq = await chay(e.target, () => api('bb_sua_dong', { id, ds: Object.keys(g).map(k => g[k]), ly_do: $('ly-do').value.trim() }));
      toast('Đã lưu ' + (kq.so_thay_doi || 0) + ' thay đổi' + (kq.kho ? (kq.kho.tru ? ' · đã trừ kho ' + kq.kho.tru + ' vật tư' : '') + (kq.kho.hoan ? ' · nhập lại kho ' + kq.kho.hoan + ' vật tư' : '') + (kq.kho.thieu.length ? ' · thiếu kho: ' + kq.kho.thieu.join('; ') : '') : ''), kq.kho && kq.kho.thieu.length);
      dieuHuong();
    };
    $('b-dien').onclick = () => { r.dong.forEach(d => { const i = nd.querySelector('.o-sua[data-d="' + d.id + '"][data-k="ban_giao"]'); if (i && !i.value && +d.ke_hoach) i.value = so(d.ke_hoach); }); capNhat(); };
    $('b-in').onclick = (e) => chay(e.target, () => moInBB([id]));
    $('b-giay').onclick = () => Q.capNhatTuGiay(r);
    $('b-ky').onclick = () => {
      moHop('<h2>Đính kèm bản ký – ' + esc(b.id) + '</h2><form id="f"><label class="f"><span>Ảnh chụp / file scan biên bản đã ký (PDF, ảnh – tối đa 15 MB) <em>*</em></span><input type="file" name="tep" accept=".pdf,image/*" required></label>' +
        o('mo_ta', 'Mô tả', { v: 'Bản ký – ' + b.ten_mon }) + '<p class="note">Bản ký lưu làm chứng từ trong Drive của Khoa. Số liệu chính thức là số đã ghi trên web.</p><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tải lên</button></div></form>');
      $('f').onsubmit = async (e) => {
        e.preventDefault(); const file = e.target.querySelector('[name=tep]').files[0]; if (!file) return;
        await chay(e.submitter, () => guiTep(b.id, file, e.target.querySelector('[name=mo_ta]').value.trim()));
        if (b.trang_thai !== 'Đã ký' && b.trang_thai !== 'Đã quyết toán' && confirm('Chuyển trạng thái biên bản sang "Đã ký"?')) await api('bb_sua', { id: b.id, trang_thai: 'Đã ký' });
        dongHop(); toast('Đã tải lên'); dieuHuong();
      };
    };
    $('b-them').onclick = () => {
      moHop('<h2>Thêm dòng ngoài định mức</h2><form id="f"><div class="form-grid">' + o('ten', 'Tên – quy cách', { req: 1, full: 1 }) + o('ma_vt', 'Mã VT') + o('dvt', 'ĐVT') + o('nsx', 'NSX') + o('ghi_chu', 'Ghi chú') +
        '</div><p class="note">Dòng thêm ngoài định mức được đánh dấu ⚠ để kiểm tra. Nhập số lượng trực tiếp trên bảng sau khi thêm.</p><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Thêm</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); await chay(e.submitter, () => api('bb_them_dong', { id, dong: giaTri(e.target) })); dongHop(); toast('Đã thêm dòng'); dieuHuong(); };
    };
    $('b-tt').onclick = async (e) => { await chay(e.target, () => api('bb_sua', { id, trang_thai: $('f-tt').value })); toast('Đã đổi trạng thái'); dieuHuong(); };
    $('b-sua-bb').onclick = () => {
      moHop('<h2>Sửa thông tin biên bản</h2><form id="f">' + o('gv', 'GVHD', { v: b.gv }) + o('phong', 'Phòng', { v: b.phong }) + (kltn ? '' : o('lop', 'Lớp', { v: b.lop })) + o('thoi_gian', 'Thời gian', { v: b.thoi_gian }) + o('ghi_chu', 'Ghi chú', { v: b.ghi_chu, area: 1 }) +
        '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); v.id = id; await chay(e.submitter, () => api('bb_sua', v)); dongHop(); toast('Đã lưu'); dieuHuong(); };
    };
    if ($('b-xoa')) $('b-xoa').onclick = async (e) => { if (!confirm('Xóa biên bản ' + id + ' cùng toàn bộ lịch sử cấp phát?')) return; await chay(e.target, () => api('bb_xoa', { id })); toast('Đã xóa'); location.hash = '#/bien-ban/' + nhom; };
    nd.querySelectorAll('[data-tai]').forEach(x => { x.onclick = (e) => chay(e.target, () => taiVe(x.dataset.tai)); });
    nd.querySelectorAll('[data-doc]').forEach(x => { x.onclick = () => Q.docThuBanKy(r, x.dataset.doc); });
  }

  // ---------------- Dự trù vật tư theo đợt (mục Hóa chất – vật tư, chỉ admin) ----------------
  const thangVN = (t) => t ? t.slice(5) + '/' + t.slice(0, 4) : '';
  Q.manDuTru = async (nd) => {
    if (!(S.dm.hoc_ky || []).length) { nd.innerHTML = '<div class="card empty">Chưa có học kỳ – tạo ở thẻ "Học kỳ & thời khóa biểu".</div>'; return; }
    const hk = Q.S.hk || S.dm.hoc_ky[0], [bd, cap] = await Promise.all([api('dt_dot', { hk }), api('dt_cap_ds', { hk })]);
    const capDot = {}; cap.forEach(c => { capDot[c.dot] = c; });
    const dotTruoc = (t) => bd.dots.map(d => d.dot).filter(d => d <= t);
    nd.innerHTML = '<div class="tools"><b>Học kỳ</b> <select id="f-hk">' + S.dm.hoc_ky.map(h => '<option' + (h === hk ? ' selected' : '') + '>' + esc(h) + '</option>').join('') + '</select></div>' +
      '<div class="grid g2"><div class="card"><h2>Xếp lớp thực hành vào đợt dự trù</h2><p class="note">Lớp bắt đầu học trong tháng nào thì dự trù ở đợt nào. Mặc định: 2 tháng đầu học kỳ → đợt đầu; các tháng sau → đợt thứ hai. Đợt tháng T nộp P.KHĐT ngày 15 tháng trước.</p>' +
      '<table><thead><tr><th>Tháng bắt đầu học</th><th class="num">Số ca TH</th><th>Dự trù ở đợt</th></tr></thead><tbody>' +
      Object.keys(bd.map).map(t => '<tr><td>Tháng ' + thangVN(t) + '</td><td class="num">' + bd.so_lop[t] + '</td><td><select data-thang="' + t + '">' +
        [bd.m0, bd.dots.map(d => d.dot)].flat().concat(Object.keys(bd.map)).filter((x, i, a) => a.indexOf(x) === i && x <= t).sort().map(d => '<option value="' + d + '"' + (bd.map[t] === d ? ' selected' : '') + '>Đợt tháng ' + thangVN(d) + '</option>').join('') + '</select></td></tr>').join('') +
      '</tbody></table><button class="btn o sm" id="b-luu-dot" style="margin-top:10px">Lưu cách xếp đợt</button></div>' +
      '<div class="card"><h2>Các đợt dự trù ' + esc(hk) + '</h2>' + bd.dots.map(d => { const c = capDot[d.dot];
        return '<div class="dot-dt"><div><b>Đợt tháng ' + thangVN(d.dot) + '</b> · nộp ngày ' + ngayVN(d.ngay_nop) + ' · ' + d.so_lop + ' ca TH<div class="note">' + (dotTruoc(d.dot).length > 1 ? 'Đã trừ danh sách được cấp của đợt ' + dotTruoc(d.dot).slice(0, -1).map(thangVN).join(', ') + '. ' : '') +
          'Danh sách được cấp của đợt này: ' + (c ? '<b>' + esc(c.loai) + '</b> ' + ngayVN(c.ngay) + ' · ' + c.so_dong + ' dòng' : 'chưa nhập') + '</div></div><div class="btns">' +
          '<button class="btn sm" data-xem="' + d.dot + '">Xem dự trù</button><button class="btn o sm" data-in="' + d.dot + '" title="3 sheet: tổng dự trù học kỳ theo lớp · dự trù tháng · tổng hợp HC – VT – DL tháng">Xem trước – in / Excel (3 sheet)</button><button class="btn o sm" data-cap="' + d.dot + '">' + (c ? 'Nhập lại' : 'Nhập') + ' DS được cấp</button>' +
          (c ? '<button class="btn red sm" data-xoa-cap="' + d.dot + '">Xóa DS cấp</button>' : '') + '</div></div>'; }).join('') +
      '<div class="dot-dt"><div><b>Cả học kỳ</b><div class="note">Tổng dự trù mọi lớp (chưa trừ được cấp).</div></div><div class="btns"><button class="btn sm" data-xem="HK">Xem</button><button class="btn o sm" data-in="HK">Xem trước – in / Excel</button></div></div></div></div>' +
      '<div id="kq"></div>';
    $('f-hk').onchange = (e) => { Q.S.hk = e.target.value; dieuHuong(); };
    $('b-luu-dot').onclick = async (e) => { const map = {}; nd.querySelectorAll('[data-thang]').forEach(s2 => { map[s2.dataset.thang] = s2.value; }); await chay(e.target, () => api('dt_luu_dot', { hk, map })); toast('Đã lưu cách xếp đợt'); dieuHuong(); };
    nd.querySelectorAll('[data-xem]').forEach(b => { b.onclick = (e) => chay(e.target, async () => veDuTru(await api('dt_tinh', { hk, dot: b.dataset.xem }))); });
    nd.querySelectorAll('[data-in]').forEach(b => { b.onclick = (e) => chay(e.target, async () => window.PTN_IN.xemTruoc(await fileDuTru(hk, b.dataset.in))); });
    nd.querySelectorAll('[data-xoa-cap]').forEach(b => { b.onclick = async (e) => { if (!confirm('Xóa danh sách được cấp của đợt ' + thangVN(b.dataset.xoaCap) + '?')) return; await chay(e.target, () => api('dt_xoa_cap', { hk, dot: b.dataset.xoaCap })); dieuHuong(); }; });
    nd.querySelectorAll('[data-cap]').forEach(b => { b.onclick = () => hopNhapCap(hk, b.dataset.cap); });
  };
  // đợt tháng → 3 sheet (tổng học kỳ theo lớp · dự trù tháng · tổng hợp tháng); cả học kỳ → tổng hợp + kế hoạch theo môn
  async function fileDuTru(hk, dot, rSan) {
    if (dot === 'HK') return window.PTN_MAU.duTru(rSan || await api('dt_tinh', { hk, dot }));
    const [rHK, rThang] = await Promise.all([api('dt_tinh', { hk, dot: 'HK' }), rSan || api('dt_tinh', { hk, dot })]);
    return window.PTN_MAU.duTruThang(rHK, rThang);
  }
  function veDuTru(r) {
    const caHK = r.dot === 'HK', tru = r.tong.reduce((a, t) => a + (t.tru > 0 ? 1 : 0), 0);
    $('kq').innerHTML = '<div class="card"><div class="btns" style="justify-content:space-between"><h2 style="margin:0">' + (caHK ? 'Tổng dự trù ' + esc(r.hk) : 'Dự trù đợt tháng ' + thangVN(r.dot) + ' · nộp ' + ngayVN(r.ngay_nop)) + '</h2><button class="btn o sm" id="b-in-kq">Xem trước – in / Excel</button></div>' +
      '<p class="note">' + r.khoi.length + ' khối môn' + (r.khoi.some(k => k.chuyen) ? ' (gồm ' + r.khoi.filter(k => k.chuyen).length + ' khối chuyển từ đợt trước vì chưa được cấp đủ)' : '') + ' · ' + r.tong.length + ' vật tư' + (tru ? ' · ' + tru + ' vật tư đã trừ phần được cấp' : '') + '</p>' +
      '<div class="tbl-wrap" style="max-height:460px"><table><thead><tr><th>Mã VT</th><th>Tên vật tư – hóa chất</th><th>ĐVT</th><th class="num">Nhu cầu</th><th class="num">Trừ được cấp</th><th class="num">Dự trù</th><th>Môn</th></tr></thead><tbody>' +
      r.tong.map((t, i) => (i === 0 || r.tong[i - 1].nhom_in !== t.nhom_in ? '<tr><td colspan="7" class="nhom-dong">' + esc(t.nhom_in) + '</td></tr>' : '') + '<tr><td class="mono">' + esc(t.ma_vt || 'Chưa MVT') + '</td><td>' + esc(t.ten) + '</td><td>' + esc(t.dvt) + '</td><td class="num">' + fmt(t.can) + '</td><td class="num">' + (fmt(t.tru) || '') + '</td><td class="num"><b>' + (fmt(t.sl) || 0) + '</b></td><td class="note">' + esc(t.mon.join(', ')) + '</td></tr>').join('') +
      '</tbody></table></div>' + (r.con_du.length ? '<p class="note">Còn ' + r.con_du.length + ' vật tư được cấp dư so với nhu cầu (chưa dùng hết).</p>' : '') + '</div>';
    $('b-in-kq').onclick = (e) => chay(e.target, async () => window.PTN_IN.xemTruoc(await fileDuTru(r.hk, r.dot, r)));
    $('kq').scrollIntoView({ behavior: 'smooth' });
  }
  // Nhập danh sách được cấp (Excel): tự nhận cột, cho chọn lại
  function hopNhapCap(hk, dot) {
    moHop('<h2>Danh sách được cấp – đợt tháng ' + thangVN(dot) + '</h2><p class="note">Chọn file Excel danh sách vật tư – hóa chất được cấp (dự kiến hoặc thực tế). Hệ thống trừ số này vào dự trù các đợt sau. Nhập lại sẽ thay danh sách cũ của đợt này.</p>' +
      '<div class="form-grid">' + o('loai', 'Loại danh sách', { select: [['du_kien', 'Dự kiến'], ['thuc_te', 'Thực tế (đã cấp)']] }) + o('ngay', 'Ngày', { type: 'date', v: homNay() }) + '</div><label class="f"><span>File Excel</span><input type="file" id="x-file" accept=".xlsx,.xls,.xlsm,.csv"></label><div id="x-kq"></div>');
    $('x-file').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      $('x-kq').innerHTML = '<div class="loading"><div class="spin"></div></div>';
      try {
        const X = await napXlsx(), wb = X.read(await file.arrayBuffer());
        const ve = (tenSheet) => {
          const rows = X.utils.sheet_to_json(wb.Sheets[tenSheet], { header: 1, raw: true, defval: '' }), bd2 = (v) => boDau(String(v).replace(/\s+/g, ' '));
          const MAU = { ma_vt: /ma\s*vt|ma vat tu/, ten: /ten|qu[iy] cach|danh muc/, dvt: /^dv|don vi/, sl: /so luong|slg|sl cap|duoc cap|tong sl|thuc cap/ };
          let hd = rows.findIndex(r => r.filter(c => Object.keys(MAU).some(k => MAU[k].test(bd2(c)))).length >= 2); if (hd < 0) hd = 0;
          const td = rows[hd].map(c => String(c).replace(/\s+/g, ' ').trim()), map = {};
          Object.keys(MAU).forEach(k => { const j = td.findIndex((c, j2) => MAU[k].test(bd2(c)) && Object.values(map).indexOf(j2) < 0); if (j >= 0) map[k] = j; });
          const chonCot = (k, nhan) => '<label class="f"><span>' + nhan + '</span><select data-k="' + k + '"><option value="">— không có —</option>' + td.map((t, j) => t ? '<option value="' + j + '"' + (map[k] === j ? ' selected' : '') + '>' + esc(t) + '</option>' : '').join('') + '</select></label>';
          const du = rows.slice(hd + 1).filter(r => r.some(c => c !== ''));
          $('x-kq').innerHTML = (wb.SheetNames.length > 1 ? '<label class="f"><span>Trang tính</span><select id="x-sheet">' + wb.SheetNames.map(n => '<option' + (n === tenSheet ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label>' : '') +
            '<p>' + du.length + ' dòng dữ liệu (tiêu đề ở dòng ' + (hd + 1) + '). Kiểm tra cột:</p><div class="form-grid">' + chonCot('ma_vt', 'Mã VT') + chonCot('ten', 'Tên – quy cách') + chonCot('dvt', 'ĐVT') + chonCot('sl', 'Số lượng được cấp *') + '</div>' +
            '<div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="x-ok">Nhập danh sách</button></div>';
          if ($('x-sheet')) $('x-sheet').onchange = (ev) => ve(ev.target.value);
          $('x-ok').onclick = async (ev) => {
            const m = {}; $('x-kq').querySelectorAll('[data-k]').forEach(s2 => { if (s2.value !== '') m[s2.dataset.k] = +s2.value; });
            if (m.sl === undefined || (m.ten === undefined && m.ma_vt === undefined)) return toast('Chọn cột số lượng và cột mã VT hoặc tên', true);
            const ds = du.map(r => ({ ma_vt: m.ma_vt !== undefined ? String(r[m.ma_vt]).trim() : '', ten: m.ten !== undefined ? String(r[m.ten]).trim() : '', dvt: m.dvt !== undefined ? String(r[m.dvt]).trim() : '', sl: +String(r[m.sl]).replace(',', '.') || 0 })).filter(x => x.sl > 0);
            const v = { loai: $('modal-body').querySelector('[name=loai]').value, ngay: $('modal-body').querySelector('[name=ngay]').value };
            const kq = await chay(ev.target, () => api('dt_nhap_cap', Object.assign({ hk, dot, ds }, v)));
            dongHop(); toast('Đã nhập ' + kq.so_dong + ' dòng được cấp' + (kq.khong_ma ? ' (' + kq.khong_ma + ' dòng không có mã VT – khớp theo tên)' : '')); dieuHuong();
          };
        };
        ve(wb.SheetNames[0]);
      } catch (err) { $('x-kq').innerHTML = '<p class="err">' + esc(err.message) + '</p>'; }
    };
  }

  const TEN_BANG = { CAN_BO: 'Cán bộ', PHONG: 'Phòng', TU: 'Tủ', THIET_BI: 'Thiết bị', SU_KIEN: 'Lịch sử thiết bị', TEP: 'Tệp đính kèm', NHAT_KY: 'Nhật ký',
    HOC_KY: 'Học kỳ', VAT_TU: 'Vật tư', MON_TH: 'Môn thực hành', DINH_MUC: 'Định mức', LOP_TH: 'Lớp TH (TKB)', BIEN_BAN: 'Biên bản', BB_DONG: 'Dòng biên bản', CAP_PHAT: 'Cấp phát biên bản',
    DON: 'Đơn QR1 – QR8', HO_SO: 'Hồ sơ đề tài', CAI_DAT: 'Cài đặt', KHO_LO: 'Kho – lô hàng', CAP_DU_TRU: 'Dự trù – được cấp', KHO_GD: 'Kho – giao dịch', SO_THEO_DOI: 'Sổ theo dõi' };
  const COT_SO = /^(sl|sl_nhap|dm|ke_hoach|ban_giao|bo_sung|tra|si_so|so_nhom|nguyen_gia|chi_phi|so_tien|ton_toi_thieu|kich_thuoc|stt|dien_tich|so_tu|kd_chu_ky|bd_chu_ky)$/;
  async function xuatTatCa() {
    const r = await api('xuat_tat_ca'), IN = window.PTN_IN;
    await IN.taiExcel({ ten: 'Sao luu du lieu PTN KHSK ' + homNay(), trang: r.map(t => IN.duLieu((TEN_BANG[t.bang] || t.bang).replace(/[\\/?*[\]:]/g, '-'), t.cot.map(c => ({ ten: c[1], so: COT_SO.test(c[0]) })), t.dong)) });
    toast('Đã tải ' + r.length + ' bảng · ' + r.reduce((a, t) => a + t.dong.length, 0) + ' dòng');
  }

  // ---------------- Dự trù vật tư – hóa chất của các môn học (thu thập theo học kỳ, đối chiếu với biên bản bàn giao hóa chất) ----------------
  const MAU_DG = { 'Khớp': 't-ok', 'Bàn giao vượt': 't-warn', 'Bàn giao thiếu': 't-bad', 'Chưa bàn giao': 't-gray', 'Ngoài dự trù': 't-info' };
  Q.manDuTruMon = async (nd) => {
    if (!(S.dm.hoc_ky || []).length) { nd.innerHTML = '<div class="card empty">Chưa có học kỳ – tạo ở thẻ "Học kỳ & thời khóa biểu".</div>'; return; }
    const hk = Q.S.hk || S.dm.hoc_ky[0], ds = await api('dtm_tong', { hk }), da = ds.filter(x => x.co_du_tru), chua = ds.filter(x => !x.co_du_tru && x.so_lop);
    nd.innerHTML = '<div class="tools"><b>Học kỳ</b> <select id="f-hk">' + S.dm.hoc_ky.map(h => '<option' + (h === hk ? ' selected' : '') + '>' + esc(h) + '</option>').join('') + '</select>' +
      '<button class="btn o sm" id="b-phieu-dtm">📄 Phiếu dự trù tất cả môn (điền sẵn)</button><button class="btn o sm" id="b-them-dtm">+ Thêm môn khác</button><button class="btn sm" id="b-nhap-dtm">⇪ Tải file dự trù của môn (một hay nhiều môn)</button><button class="btn o sm" id="b-in-dtm"' + (ds.length ? '' : ' disabled') + '>🖨 In / tải Excel (tổng hợp + đối chiếu)</button></div>' +
      '<p class="note"><b>Quy trình:</b> ① bấm "Phiếu dự trù" để tạo phiếu điền sẵn (định mức / 1 SV, tổng sinh viên theo TKB) gửi các môn; ② môn kiểm tra, sửa, bổ sung, ký; ③ tải file phiếu đã điền lên (một hay nhiều môn, mỗi môn một trang tính). ' +
      'Hệ thống cũng nhận file kế hoạch vật tư mẫu P.KHĐT. ' +
      'hệ thống đối chiếu từng dòng với <b>biên bản bàn giao hóa chất</b> của môn (thực nhận + bổ sung, hoàn trả).</p>' +
      '<div class="grid g4" style="margin-bottom:14px">' + st(ds.filter(x => x.so_lop).length, 'Môn có lớp thực hành') + st(da.length, 'Đã nộp dự trù', 'ok') + st(chua.length, 'Chưa nộp dự trù', chua.length ? 'bad' : 'ok') +
      st(da.filter(x => x.lech).length, 'Môn có dòng lệch với biên bản', da.some(x => x.lech) ? 'warn' : 'ok') + '</div>' +
      (!ds.length ? '<div class="card empty">Học kỳ ' + esc(hk) + ' chưa có lớp thực hành (tải thời khóa biểu ở thẻ "Học kỳ & thời khóa biểu").</div>' :
        '<div class="tbl-wrap"><table><thead><tr><th>Môn thực hành</th><th>Mã HP</th><th class="num">Lớp / sĩ số</th><th>Dự trù của môn</th><th>Biên bản hóa chất</th><th>Đối chiếu</th><th></th></tr></thead><tbody>' +
        ds.map(x => '<tr class="click" data-mon="' + esc(x.mon) + '"><td><b>' + esc(x.ten) + '</b></td><td class="mono">' + esc(x.ma_hp) + '</td><td class="num">' + x.so_lop + ' / ' + x.si_so + '</td><td>' +
          (x.co_du_tru ? '<span class="tag t-ok">Đã nộp · ' + x.so_dong + ' dòng</span><div class="note">' + esc(x.tep) + ' · ' + esc(ngayVN(x.ngay)) + '</div>' : '<span class="tag t-bad">Chưa nộp</span>') + '</td><td>' +
          (x.bien_ban.length ? x.bien_ban.map(b => '<a href="#/bien-ban/' + encodeURIComponent(b) + '">' + esc(b) + '</a>').join('<br>') : '<span class="note">Chưa có</span>') + '</td><td>' +
          (x.co_du_tru ? (x.lech ? '<span class="tag t-warn">' + x.lech + ' dòng lệch</span> ' : '') + '<span class="tag t-ok">' + x.khop + ' khớp</span>' : '') + '</td><td class="btns">' +
          '<button class="btn sm" data-sua-dtm="' + esc(x.mon) + '" title="Nhập / sửa dự trù của môn ngay trên web">Sửa trên web</button><button class="btn o sm" data-phieu="' + esc(x.mon) + '" title="Phiếu dự trù điền sẵn của môn">Phiếu dự trù</button>' +
          (x.co_du_tru ? '<button class="btn o sm" data-dc="' + esc(x.mon) + '">Đối chiếu</button><button class="btn red sm" data-xoa-dtm="' + esc(x.mon) + '">Xóa</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>') +
      '<div id="kq"></div>';
    $('f-hk').onchange = (e) => { Q.S.hk = e.target.value; dieuHuong(); };
    $('b-nhap-dtm').onclick = () => nhapFileDTM(hk);
    const moPhieu = (btn, mon) => chay(btn, async () => { const ds = await api('dtm_phieu', { hk, mon }); if (!ds.length) throw new Error('Chưa có môn nào có lớp thực hành trong ' + hk);
      window.PTN_IN.xemTruoc(window.PTN_MAU.duTruMonNhieu(ds, window.PTN_KY, hk)); });
    $('b-phieu-dtm').onclick = (e) => moPhieu(e.target, '');
    $('b-them-dtm').onclick = () => themMonDTM(hk, ds.map(x => x.mon));
    nd.querySelectorAll('[data-sua-dtm]').forEach(b => { b.onclick = (e) => chay(e.target, () => suaDuTruMon(hk, b.dataset.suaDtm)); });
    nd.querySelectorAll('[data-phieu]').forEach(b => { b.onclick = (e) => moPhieu(e.target, b.dataset.phieu); });
    $('b-in-dtm').onclick = (e) => chay(e.target, async () => window.PTN_IN.xemTruoc(fileDTM(await api('dtm_xuat', { hk }))));
    const moDC = (mon) => chay(null, async () => { veDoiChieuDTM(await api('dtm_doi_chieu', { hk, mon })); $('kq').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    nd.querySelectorAll('tr[data-mon]').forEach(tr => { tr.onclick = (e) => { if (e.target.closest('a, button')) return; if (ds.find(x => x.mon === tr.dataset.mon).co_du_tru) moDC(tr.dataset.mon); else chay(null, () => suaDuTruMon(hk, tr.dataset.mon)); }; });
    nd.querySelectorAll('[data-dc]').forEach(b => { b.onclick = () => moDC(b.dataset.dc); });
    nd.querySelectorAll('[data-xoa-dtm]').forEach(b => { b.onclick = async (e) => { if (!confirm('Xóa dự trù đã nộp của môn này?')) return; await chay(e.target, () => api('dtm_xoa', { hk, mon: b.dataset.xoaDtm })); toast('Đã xóa'); dieuHuong(); }; });
  };
  // Nhập / sửa dự trù của một môn ngay trên web. Môn chưa nộp: điền sẵn từ định mức (/1 SV) và tổng sĩ số theo TKB.
  async function suaDuTruMon(hk, mon) {
    const r = await api('dtm_ct', { hk, mon }), M = window.PTN_MAU, NH = ['Hóa chất', 'Dược liệu', 'Vật tư tiêu hao'], r3 = (n) => Math.round((+n || 0) * 1000) / 1000;
    let ds = r.dm.map(d => ({ nhom: M.nhomDuTru(d), ten: d.ten, cong_thuc: d.cong_thuc || '', ma_vt: /^\d+$/.test(d.ma_vt || '') ? d.ma_vt : '', nsx: d.nsx || '', dvt: d.dvt || '', dm: d.dm === '' || d.dm == null ? '' : +d.dm, sl: +d.sl || '', ghi_chu: d.ghi_chu || '' }));
    let ss = +r.si_so || 0, doi = false;
    const box = $('kq'), oN = (i, k, w, kieu) => '<input class="o-sua" data-i="' + i + '" data-k="' + k + '"' + (kieu === 'so' ? ' type="number" step="any" min="0" inputmode="decimal"' : ' type="text"') + (k === 'ten' ? ' list="dt-goi-y"' : '') +
      ' value="' + esc(ds[i][k] === '' || ds[i][k] == null ? '' : ds[i][k]) + '" style="width:' + w + '">';
    const slCua = (d) => d.dm === '' ? (+d.sl || '') : r3(d.dm * ss);
    const ve = () => {
      const thuTu = []; [0, 1, 2].forEach(k => ds.forEach((d, i) => { if (d.nhom === k) thuTu.push(i); }));
      let stt = 0;
      box.innerHTML = '<div class="card"><div class="btns" style="justify-content:space-between"><h2 style="margin:0">' + (r.nguon === 'du_tru' ? 'Sửa' : 'Nhập') + ' dự trù: ' + esc(r.mon.ten) + ' – ' + esc(hk) + '</h2>' +
        '<span class="btns"><button class="btn o sm" id="dt-phieu">🖨 Phiếu dự trù (số đang sửa)</button><button class="btn o sm" id="dt-bo">Đóng</button><button class="btn sm" id="dt-luu">Lưu dự trù</button></span></div>' +
        '<p class="note">' + (r.nguon === 'du_tru' ? 'Đang sửa dự trù đã lưu (' + esc(r.tep || '') + ' · ' + esc(ngayVN(r.ngay)) + ').' : 'Môn chưa nộp dự trù – đã điền sẵn từ định mức / 1 SV của môn' + (r.dm.length ? '' : ' (môn chưa có định mức – thêm dòng bên dưới)') + '.') +
          ' Gõ tên để chọn từ danh mục vật tư (tự điền mã VT, ĐVT, NSX). SL dự trù = ĐM 1 SV × tổng SV; dòng không ghi ĐM thì nhập thẳng SL.</p>' +
        '<label class="f" style="max-width:260px"><span>Tổng số sinh viên (cả học kỳ)</span><input type="number" min="0" id="dt-ss" value="' + ss + '"></label>' +
        '<datalist id="dt-goi-y"></datalist><div class="tbl-wrap"><table class="bb-sua dt-sua"><thead><tr><th>STT</th><th>Tên nguyên liệu – quy cách</th><th>Công thức</th><th>Mã VT</th><th>NSX</th><th>ĐVT</th><th>ĐM 1 SV</th><th class="num">SL dự trù</th><th>Ghi chú</th><th>Nhóm</th><th></th></tr></thead><tbody>' +
        [0, 1, 2].map(k => '<tr><td colspan="11" class="nhom-dong">' + (k + 1) + '. ' + NH[k].toUpperCase() + ' <button type="button" class="btn o sm" data-them="' + k + '" style="margin-left:10px">+ Thêm dòng</button></td></tr>' +
          thuTu.filter(i => ds[i].nhom === k).map(i => '<tr><td>' + (++stt) + '</td><td>' + oN(i, 'ten', '100%') + '</td><td>' + oN(i, 'cong_thuc', '76px') + '</td><td>' + oN(i, 'ma_vt', '62px') + '</td><td>' + oN(i, 'nsx', '48px') + '</td><td>' + oN(i, 'dvt', '54px') +
            '</td><td>' + oN(i, 'dm', '66px', 'so') + '</td><td class="num">' + (ds[i].dm === '' ? oN(i, 'sl', '76px', 'so') : '<b data-sl="' + i + '">' + fmt(slCua(ds[i])) + '</b>') + '</td><td>' + oN(i, 'ghi_chu', '110px') +
            '</td><td><select data-i="' + i + '" data-k="nhom">' + NH.map((n, j) => '<option value="' + j + '"' + (j === ds[i].nhom ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></td><td><button type="button" class="btn red sm" data-xoa="' + i + '" title="Xóa dòng">✕</button></td></tr>').join('')).join('') +
        '</tbody></table></div><p class="note">' + ds.filter(d => d.ten).length + ' dòng · ' + [0, 1, 2].map(k => NH[k].toLowerCase() + ': ' + ds.filter(d => d.nhom === k && d.ten).length).join(' · ') + '</p></div>';
      const bang = box.querySelector('table');
      bang.addEventListener('input', (e) => { const el = e.target, i = el.dataset.i, k = el.dataset.k; if (i === undefined || k === 'nhom') return; doi = true;
        ds[i][k] = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
        if (k === 'dm') { const b = box.querySelector('[data-sl="' + i + '"]'); if (b) b.textContent = fmt(slCua(ds[i])); else if (ds[i].dm !== '') ve(); }
        if (k === 'ten') goiY(el.value); });
      bang.addEventListener('change', (e) => { const el = e.target, i = el.dataset.i, k = el.dataset.k; if (i === undefined) return;
        if (k === 'nhom') { ds[i].nhom = +el.value; doi = true; ve(); }
        else if (k === 'ten') { const v = (goiY.ds || []).find(x => x.ten === el.value); if (v) { const d = ds[i]; d.ma_vt = d.ma_vt || v.ma_vt; d.dvt = d.dvt || v.dvt; d.nsx = d.nsx || v.nsx; ve(); } }
        else if (k === 'dm' && el.value === '') ve(); });
      box.querySelectorAll('[data-them]').forEach(b => { b.onclick = () => { ds.push({ nhom: +b.dataset.them, ten: '', cong_thuc: '', ma_vt: '', nsx: '', dvt: '', dm: '', sl: '', ghi_chu: '' }); doi = true; ve();
        const oTen = box.querySelector('input[data-k="ten"][data-i="' + (ds.length - 1) + '"]'); if (oTen) oTen.focus(); }; });
      box.querySelectorAll('[data-xoa]').forEach(b => { b.onclick = () => { ds.splice(+b.dataset.xoa, 1); doi = true; ve(); }; });
      $('dt-ss').oninput = (e) => { ss = +e.target.value || 0; doi = true; box.querySelectorAll('[data-sl]').forEach(b => { b.textContent = fmt(slCua(ds[+b.dataset.sl])); }); };
      $('dt-bo').onclick = () => { if (doi && !confirm('Bỏ các thay đổi chưa lưu?')) return; box.innerHTML = ''; };
      const dongIn = () => { const t = []; [0, 1, 2].forEach(k => ds.forEach(d => { if (d.nhom === k && String(d.ten).trim()) t.push(d); }));
        return t.map((d, i) => ({ stt: i + 1, nhom: NH[d.nhom], nhom_dt: String(d.nhom + 1), ten: String(d.ten).trim(), cong_thuc: d.cong_thuc, ma_vt: d.ma_vt, nsx: d.nsx, dvt: d.dvt, dm: d.dm, sl: slCua(d), ghi_chu: d.ghi_chu })); };
      $('dt-phieu').onclick = () => window.PTN_IN.xemTruoc(M.duTruMonNhieu([{ hk, mon: r.mon, si_so: ss, dm: dongIn() }], window.PTN_KY, hk));
      $('dt-luu').onclick = (e) => chay(e.target, async () => {
        const dm = dongIn();
        if (!dm.length) { if (r.nguon === 'du_tru' && confirm('Không còn dòng nào – xóa dự trù đã lưu của môn?')) { await api('dtm_xoa', { hk, mon }); toast('Đã xóa dự trù'); dieuHuong(); } else toast('Chưa có dòng dự trù nào', true); return; }
        const kq = await api('dtm_nhap', { hk, tep: 'Nhập / sửa trên web', ds: [{ mon, ten: r.mon.ten, ma_hp: [], lop: [{ lop: '', ma_lhp: '', si_so: ss }], dm }] });
        toast('Đã lưu dự trù ' + r.mon.ten + ' · ' + kq.so_dong + ' dòng'); doi = false; dieuHuong();
      });
    };
    // gợi ý tên từ danh mục vật tư (gõ ≥ 2 ký tự)
    const goiY = (q) => { clearTimeout(goiY.t); if (String(q).trim().length < 2) return; goiY.t = setTimeout(async () => { try { goiY.ds = await api('vt_goi_y', { q }); const dl = $('dt-goi-y'); if (dl) dl.innerHTML = goiY.ds.map(v => '<option value="' + esc(v.ten) + '">' + esc((v.ma_vt ? 'MVT ' + v.ma_vt + ' · ' : '') + (v.dvt || '') + (v.nsx ? ' · ' + v.nsx : '')) + '</option>').join(''); } catch (err) { /* bỏ qua gợi ý */ } }, 250); };
    ve(); box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // Thêm dự trù cho môn thực hành khác (môn chưa có lớp trong TKB học kỳ này, hoặc môn mới)
  async function themMonDTM(hk, daCo) {
    const mons = (await api('mon_ds')).filter(m => daCo.indexOf(m.ma) < 0).sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
    moHop('<h2>Thêm dự trù cho môn thực hành khác – ' + esc(hk) + '</h2><form id="f"><label class="f"><span>Môn thực hành</span><select name="mon" required><option value="">— Chọn môn —</option>' +
      mons.map(m => '<option value="' + esc(m.ma) + '">' + esc(m.ten) + (m.so_hc ? ' (có ' + m.so_hc + ' dòng định mức)' : '') + '</option>').join('') + '<option value="~moi">+ Môn mới (chưa có trên web)</option></select></label>' +
      '<div id="o-moi" class="hide">' + o('ten', 'Tên môn thực hành', { ph: 'VD: TH Hóa dược 2' }) + o('ma_hp', 'Mã học phần (nếu có)') + o('bo_mon', 'Bộ môn') + '</div>' +
      '<p class="note">Sau khi chọn, bảng dự trù của môn mở ngay bên dưới để nhập trên web (môn có định mức thì điền sẵn). Cũng có thể bấm "Phiếu dự trù" để gửi môn điền rồi tải file lên.</p>' +
      '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tiếp tục – nhập dự trù</button></div></form>');
    const f = $('f'); f.mon.onchange = () => $('o-moi').classList.toggle('hide', f.mon.value !== '~moi');
    f.onsubmit = async (e) => { e.preventDefault(); let ma = f.mon.value;
      if (ma === '~moi') { if (!f.ten.value.trim()) return toast('Nhập tên môn', true); ma = (await chay(e.submitter, () => api('mon_luu', { mon: { ten: f.ten.value.trim(), ma_hp: f.ma_hp.value.trim(), bo_mon: f.bo_mon.value.trim() } }))).ma; }
      dongHop(); await chay(null, () => suaDuTruMon(hk, ma)); };
  }
  async function nhapFileDTM(hk) {
    const mons = await api('mon_ds'), chuan = (t) => boDau(t).replace(/^th\s+/, '').replace(/\s+/g, ' ').trim();
    // đoán môn: trùng mã học phần, rồi trùng tên (bỏ "TH")
    const doan = (m) => (mons.find(x => m.mon && x.ma === m.mon) || mons.find(x => m.ma_hp.some(h => String(x.ma_hp || '').indexOf(h) >= 0)) || mons.find(x => chuan(x.ten) === chuan(m.ten)) || {}).ma || '';
    Q.hopFileExcel('Tải file dự trù của môn', 'Chọn file dự trù theo mẫu kế hoạch vật tư (khối môn "1. TH …" hoặc tên môn ở cột TÊN BÀI TẬP, cột QUI CÁCH VẬT TƯ, MÃ VT, ĐVỊ, SLG/1HS, SLG). File có thể gồm <b>một hay nhiều môn</b>; dự trù cũ của các môn trong file được thay. ' +
      'Dòng không ghi SLG tính bằng SLG/1HS × tổng sĩ số các lớp trong file.', (rows, ten, sheets, docSheet) => {
      // phiếu dự trù (mẫu mới): đọc mọi trang tính là phiếu – mỗi trang một môn; không thì đọc theo mẫu kế hoạch vật tư
      const laPhieu = Q.docPhieuDuTru(rows), kh = laPhieu ? sheets.map(n => n === ten ? laPhieu : Q.docPhieuDuTru(docSheet(n))).filter(p => p && p.dm.length) : Q.docKeHoachVatTu(rows, { monKhongSo: true }), tong = kh.reduce((a, m) => a + m.dm.length, 0);
      const chon = (m, i) => '<select data-i="' + i + '"><option value="">— Bỏ qua —</option>' + mons.map(x => '<option value="' + esc(x.ma) + '"' + (x.ma === doan(m) ? ' selected' : '') + '>' + esc(x.ten) + '</option>').join('') + '</select>';
      $('x-kq').innerHTML = (laPhieu ? '' : Q.hopFileExcel.chonSheet(ten)) + '<p>' + (laPhieu ? 'Phiếu dự trù – ' : 'Kế hoạch vật tư – ') + 'đọc được <b>' + kh.length + '</b> môn, <b>' + tong + '</b> dòng dự trù. Kiểm tra cột "Môn trên web" (đã đoán theo mã môn / mã học phần / tên môn).</p>' +
        '<div class="tbl-wrap" style="max-height:300px"><table><thead><tr><th>Môn trong file</th><th class="num">Lớp</th><th class="num">Sĩ số</th><th class="num">Dòng</th><th>Môn trên web</th></tr></thead><tbody>' +
        kh.map((m, i) => '<tr><td>' + esc(m.ten) + '<div class="note mono">' + esc(m.ma_hp.join(', ')) + '</div></td><td class="num">' + m.lop.length + '</td><td class="num">' + m.lop.reduce((a, l) => a + (+l.si_so || 0), 0) + '</td><td class="num">' + m.dm.length + '</td><td>' + chon(m, i) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="x-ok">Lưu dự trù ' + esc(hk) + '</button></div>';
      Q.hopFileExcel.ganSheet();
      $('x-ok').onclick = async (e) => {
        const ds = kh.map((m, i) => Object.assign({}, m, { mon: $('x-kq').querySelector('[data-i="' + i + '"]').value })).filter(m => m.mon);
        if (!ds.length) return toast('Chọn môn trên web cho ít nhất một môn trong file', true);
        const tep = (($('x-file').files || [])[0] || {}).name || '';
        const r = await chay(e.target, () => api('dtm_nhap', { hk, ds, tep }));
        dongHop(); toast('Đã lưu dự trù ' + r.mon.length + ' môn · ' + r.so_dong + ' dòng'); dieuHuong();
      };
    }, /du tru|DUOC|KH|HK/i);
  }
  const fmtO = (v) => v === '' || v == null ? '' : fmt(v);
  function veDoiChieuDTM(r) {
    const lech = r.dong.filter(x => x.danh_gia !== 'Khớp');
    $('kq').innerHTML = '<div class="card"><div class="btns" style="justify-content:space-between"><h2 style="margin:0">Đối chiếu dự trù – bàn giao: ' + esc(r.ten) + '</h2>' +
      '<span class="btns"><label class="check" style="margin:0"><input type="checkbox" id="chi-lech"> Chỉ dòng lệch (' + lech.length + ')</label><button class="btn o sm" id="b-in-dc">🖨 In / tải Excel</button></span></div>' +
      '<p class="note">Dự trù: ' + esc(r.tep || '') + ' · ' + esc(ngayVN(r.ngay)) + ' · lớp ' + esc(r.lop.map(l => l.lop + ' (' + l.si_so + ')').join(', ')) + '<br>Biên bản: ' +
        (r.bien_ban.length ? r.bien_ban.map(b => '<a href="#/bien-ban/' + encodeURIComponent(b.id) + '">' + esc(b.id) + '</a> (' + esc(b.trang_thai) + ')').join(', ') : 'chưa có biên bản hóa chất của môn trong học kỳ') + '</p>' +
      '<div class="tbl-wrap"><table id="bang-dc"><thead><tr><th>STT</th><th>Tên – quy cách</th><th>Mã VT</th><th>ĐVT</th><th class="num">Dự trù</th><th class="num">Đã bàn giao</th><th class="num">Hoàn trả</th><th class="num">Chênh lệch</th><th>Đánh giá</th></tr></thead><tbody>' +
      r.dong.map(x => '<tr data-dg="' + esc(x.danh_gia) + '"><td>' + esc(x.stt) + '</td><td>' + esc(x.ten) + '</td><td class="mono">' + esc(x.ma_vt) + '</td><td>' + esc(x.dvt) + '</td><td class="num">' + fmtO(x.du_tru) + '</td><td class="num">' + fmtO(x.ban_giao) +
        '</td><td class="num">' + fmtO(x.tra) + '</td><td class="num">' + (x.chenh ? '<b style="color:' + (x.chenh > 0 ? 'var(--warn,#B7791F)' : 'var(--bad)') + '">' + (x.chenh > 0 ? '+' : '') + fmt(x.chenh) + '</b>' : '') + '</td><td><span class="tag ' + (MAU_DG[x.danh_gia] || 't-gray') + '">' + esc(x.danh_gia) + '</span></td></tr>').join('') + '</tbody></table></div></div>';
    $('chi-lech').onchange = (e) => $('bang-dc').querySelectorAll('tr[data-dg]').forEach(tr => { tr.style.display = e.target.checked && tr.dataset.dg === 'Khớp' ? 'none' : ''; });
    $('b-in-dc').onclick = () => window.PTN_IN.xemTruoc({ ten: 'Doi chieu du tru ' + r.mon + ' ' + homNay(), trang: [trangDoiChieu(r)] });
  }
  // Biểu mẫu đối chiếu một môn
  function trangDoiChieu(r, ten) {
    return window.PTN_IN.bieuMau({ ten: ten || ('Đối chiếu ' + r.ten).slice(0, 28), tieuDe: 'BẢNG ĐỐI CHIẾU DỰ TRÙ – BÀN GIAO HÓA CHẤT, VẬT TƯ',
      phuDe: ['Môn: ' + r.ten + ' – ' + r.hk + (r.lop.length ? ' · Lớp: ' + r.lop.map(l => l.lop).join(', ') + ' (' + r.lop.reduce((a, l) => a + (+l.si_so || 0), 0) + ' SV)' : ''),
        'Biên bản: ' + (r.bien_ban.map(b => b.id).join(', ') || 'chưa có')], nguoiLap: S.toi.nguoi.ten, huong: 'ngang',
      ghiChu: 'Đã bàn giao = thực nhận + bổ sung trên biên bản bàn giao hóa chất. Chênh lệch = đã bàn giao − dự trù (âm: bàn giao thiếu; dương: bàn giao vượt).',
      cot: ['STT', 'Tên – quy cách', 'Mã VT', 'ĐVT', { ten: 'Dự trù', so: 1 }, { ten: 'Đã bàn giao', so: 1 }, { ten: 'Hoàn trả', so: 1 }, { ten: 'Chênh lệch', so: 1 }, 'Đánh giá', 'Ghi chú'],
      dong: r.dong.map((x, i) => [i + 1, x.ten, x.ma_vt, x.dvt, x.du_tru, x.ban_giao, x.tra, x.chenh || '', x.danh_gia, x.ghi_chu || '']) });
  }
  // File in / tải: (1) tình hình thu thập, (2) dự trù các môn đã thu (mẫu kế hoạch vật tư), (3) đối chiếu từng môn
  function fileDTM(x) {
    const IN = window.PTN_IN, dung = {};
    const t1 = IN.bieuMau({ ten: 'Tổng hợp thu thập', tieuDe: 'TÌNH HÌNH THU THẬP DỰ TRÙ HÓA CHẤT – VẬT TƯ CÁC MÔN THỰC HÀNH', phuDe: 'Khoa Khoa học Sức khỏe – ' + x.hk + ', lập ngày ' + ngayVN(homNay()), nguoiLap: S.toi.nguoi.ten, huong: 'ngang',
      cot: ['Môn thực hành', 'Mã học phần', { ten: 'Số lớp', so: 1 }, { ten: 'Sĩ số', so: 1 }, 'Dự trù', { ten: 'Số dòng', so: 1 }, 'Ngày nộp', 'Biên bản hóa chất', { ten: 'Dòng khớp', so: 1 }, { ten: 'Dòng lệch', so: 1 }],
      dong: x.tong.map(t => [t.ten, t.ma_hp, t.so_lop, t.si_so, t.co_du_tru ? 'Đã nộp' : 'Chưa nộp', t.so_dong || '', ngayVN((t.ngay || '').slice(0, 10)), t.bien_ban.join(', '), t.co_du_tru ? t.khop : '', t.co_du_tru ? t.lech : '']),
      tong: undefined });
    const trang = [t1];
    if (x.doi_chieu.length) {
      const kh = window.PTN_MAU.duTru({ hk: x.hk, dot: 'HK', ngay_nop: '', tong: [], da_cap: [], ky: x.ky,
        khoi: x.doi_chieu.map(r => ({ ten_mon: r.ten, si_so: r.lop.reduce((a, l) => a + (+l.si_so || 0), 0), lop: r.lop,
          dong: r.dong.filter(d => d.du_tru !== '').map(d => ({ ten: d.ten, ma_vt: d.ma_vt, nsx: d.nsx || '', dvt: d.dvt, dm: d.dm, sl: d.du_tru, tru: 0 })) })) });
      trang.push(Object.assign({}, kh.s2, { ten: 'Dự trù các môn ' + x.hk }));
      x.doi_chieu.forEach(r => { let ten = ('ĐC ' + r.ten).slice(0, 28), k = ten, i = 1; while (dung[k]) k = ten.slice(0, 25) + ' ' + (++i); dung[k] = 1; trang.push(trangDoiChieu(r, k)); });
    }
    return { ten: 'Du tru cac mon ' + x.hk + ' ' + homNay(), trang };
  }

  // ---------------- Đăng ký trang ----------------
  Object.assign(Q.TUYEN, {
    'tong-quan': manHomNay, 'don': manDon, 'de-tai': manDeTai, 'kho': (p) => manKho(p, 'HC'), 'kho-dl': manKhoDL, 'bao-cao': manBaoCao, 'so': manSo, 'cai-dat': manCaiDat, 'bien-ban': manBB
  });
})();
