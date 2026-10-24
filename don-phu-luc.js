/* Đơn Phụ lục 1A – 3 (Quy định quản lý, sử dụng PTN Khoa KHSK 2026, Điều 15) điền sẵn từ hồ sơ đề tài QR7.
   Bám theo file mẫu 02 MAU DON - PHIEU DE NGHI / 2.1 DON KLTN - NCKH (lề, cỡ chữ, bảng, khối ký); mã QR hồ sơ ở góc phải trên.
   Một bản mô tả → (1) xem trước khổ A4 trên web để in, (2) file Word .docx thật. Dùng chung trang công khai và trang quản lý. */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ngay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : '……/……/20……'; };

  const TEN = {
    '1A': ['ĐƠN ĐỀ NGHỊ MƯỢN DỤNG CỤ', 1], '1B': ['ĐƠN ĐỀ NGHỊ MƯỢN PHÒNG THÍ NGHIỆM', 1], '1C': ['ĐƠN ĐỀ NGHỊ MƯỢN THIẾT BỊ', 1],
    '2A': ['ĐƠN ĐỀ NGHỊ MƯỢN DỤNG CỤ', 2], '2B': ['ĐƠN ĐỀ NGHỊ MƯỢN PHÒNG THÍ NGHIỆM', 2], '2C': ['ĐƠN ĐỀ NGHỊ MƯỢN THIẾT BỊ', 2],
    '3': ['ĐƠN ĐĂNG KÝ SỬ DỤNG PHÒNG THÍ NGHIỆM', 3]
  };
  const MO_TA = { A: 'Đơn đề nghị mượn dụng cụ', B: 'Đơn đề nghị mượn phòng thí nghiệm', C: 'Đơn đề nghị mượn thiết bị' };
  // các đơn cần in cho một hồ sơ: PB → B, TB → C, DC → A
  function danhSach(hs) {
    if (hs.pl === 3) return [{ ma: '3', ten: 'Phụ lục 3 – Đơn đăng ký sử dụng PTN (SV ngoài đơn vị)' }];
    const don = String(hs.don || '').split(','), out = [];
    [['PB', 'B'], ['TB', 'C'], ['DC', 'A']].forEach(([k, c]) => { if (don.indexOf(k) >= 0) out.push({ ma: hs.pl + c, ten: 'Phụ lục ' + hs.pl + c + ' – ' + MO_TA[c] }); });
    return out;
  }

  // ---------- Bản mô tả đơn: khối đoạn văn / bảng (đơn vị như Word: cỡ chữ nửa điểm, khoảng cách twip) ----------
  const R = (t, o) => Object.assign({ t: String(t == null ? '' : t) }, o);   // một đoạn chữ: {t, b, i, sz}
  const GT = (v, n) => v ? R(v, { b: 1 }) : R('…'.repeat(n || 15));          // giá trị điền sẵn (đậm) hoặc dấu chấm để viết tay
  const P = (chu, o) => Object.assign({ p: [].concat(chu).map(x => typeof x === 'string' ? R(x) : x) }, o); // o: {al: left|center|right|both, ind: {left, firstLine}, sau}
  const TRONG = P('', { al: 'both' });
  const CAM_KET_SD = ['Đọc kỹ hướng dẫn sử dụng máy, thiết bị và quy định về an toàn, phòng cháy chữa cháy; ký xác nhận vào nhật ký sử dụng thiết bị.',
    'Vệ sinh máy – thiết bị và cân sau khi sử dụng.', 'Trước khi ra về: rút điện tất cả máy, thiết bị không sử dụng; khóa gas; tắt đèn, quạt; khóa nước (van tổng).',
    'Vệ sinh phòng; đóng cửa sổ và khóa cửa cẩn thận trước khi ra về.'];
  const CAM_KET_SAU = ['Trả đúng và đầy đủ những dụng cụ, thiết bị mà PTN đã cho mượn.', 'Tổng vệ sinh phòng thực hành, vệ sinh bên trong và bên ngoài máy, thiết bị đã sử dụng.',
    'Bồi thường những hư hỏng trong quá trình sử dụng máy, thiết bị và dụng cụ.', 'Trả chìa khóa tủ cho giảng viên quản lý phòng.'];
  const GHI_CHU_BT = ' Việc bồi thường (nếu có) được xử lý theo Điều 24 Quy định quản lý, sử dụng tài sản nội bộ tại Khoa, độc lập với việc công nhận kết quả học tập. Chúng tôi chân thành cảm ơn.';
  const dsSo = (ds) => ds.map((x, i) => P((i + 1) + '. ' + x, { al: 'both', ind: { firstLine: 567 } }));
  // bảng có viền: grid (twip), dau = tiêu đề cột, dong = các dòng (thêm dòng trống cho đủ toiThieu, cột 1 là STT)
  const bang = (grid, dau, dong, toiThieu) => {
    const them = Array.from({ length: Math.max(0, toiThieu - dong.length) }, (_, i) => [dong.length + i + 1].concat(dau.slice(1).map(() => '')));
    return { bang: { grid, dau, dong: dong.concat(them) } };
  };
  // khối ký: cot = chức danh hoặc [chức danh, họ tên in dưới chữ ký]
  const ky = (cot, trong) => ({ ky: { cot: cot.map(c => [].concat(c)), trong } });
  // ngày ghi trên đơn: tự điền theo ngày duyệt hồ sơ (chưa duyệt → để chấm viết tay)
  function ngayDon(hs) {
    const l = (hs.xu_ly || []).filter(x => x.hd === 'Duyệt'), m = l.length && /^(\d{4})-(\d{2})-(\d{2})/.exec(l[l.length - 1].tg || '');
    return 'TP. Hồ Chí Minh, ngày ' + (m ? m[3] + ' tháng ' + m[2] + ' năm ' + m[1] : '…… tháng …… năm 20……');
  }

  function khoi(ma, hs) {
    const t = TEN[ma], tn = (hs.nhom || [])[0] || {}, kltn = t[1] === 1, doAn = hs.loai === 'do_an';
    const viec = doAn ? 'đồ án' : kltn ? 'khóa luận tốt nghiệp/luận văn' : 'nghiên cứu khoa học';
    // qr: 1 → mã QR đặt bên phải, bắt đầu từ đoạn này (dưới quốc hiệu, ngang tiêu đề đơn)
    // mã hồ sơ in rõ ở góc phải (trên đầu trang, tách khỏi mã QR) – SV dùng mã này khi đăng ký mượn thêm dụng cụ (QR8)
    const k = [P(R('Phụ lục ' + ma, { b: 1, i: 1 }), { al: 'right' }), P([R('Mã hồ sơ: ', { i: 1 }), R(hs.id || '……………', { b: 1 })], { al: 'right' }), { hd: 1 }, ma === '3' ? TRONG : P('', { al: 'both', qr: 1 })];
    if (ma === '3') {
      k.push(P(R(ngayDon(hs), { i: 1 }), { al: 'right' }), P(R(t[0], { b: 1, sz: 28 }), { al: 'center', qr: 1 }),
        P(R('(Dành cho sinh viên NCKH không thuộc đơn vị quản lý)', { i: 1 }), { al: 'center' }),
        P('Kính gửi: Ban lãnh đạo Khoa Khoa học Sức khỏe', { al: 'both', ind: { left: 1134 } }),
        P(['Họ và tên sinh viên: ', GT(tn.ho_ten, 40)], { al: 'both' }), P(['MSSV: ', GT(tn.ma_so, 40)], { al: 'both' }),
        P(['Lớp: ', GT(tn.lop, 20), ' Khoa: ', GT(hs.bo_mon, 22)], { al: 'both' }), P(['Điện thoại: ', GT(tn.sdt, 14), ' Email: ', GT(tn.email, 24)], { al: 'both' }),
        P(['Hiện nay tôi đang thực hiện: ', GT(hs.ten, 32)], { al: 'both' }), P(['Giảng viên hướng dẫn: ', GT(hs.gvhd, 34)], { al: 'both' }),
        P(['Kính đề nghị Ban lãnh đạo Khoa Khoa học Sức khỏe cho phép tôi được sử dụng phòng với mục đích làm thí nghiệm – nghiên cứu: ', GT(hs.muc_dich, 46)], { al: 'both' }),
        P(['Tại phòng ', GT(hs.phong, 8), ' thuộc Khoa Khoa học Sức khỏe.'], { al: 'both' }),
        P(['Bắt đầu từ ngày: ', hs.tu_ngay ? R(ngay(hs.tu_ngay), { b: 1 }) : '……………………', ' Đến hết ngày: ', hs.den_ngay ? R(ngay(hs.den_ngay), { b: 1 }) : '……………………'], { al: 'both' }),
        P(['Lệ phí (nếu có): ', GT(hs.le_phi, 40)], { al: 'both' }),
        P('Tôi cam kết thực hiện đúng nội quy, quy định, phí sử dụng phòng thí nghiệm và hoàn toàn chịu trách nhiệm về những hư hỏng hoặc mất mát tài sản trong quá trình làm việc tại phòng thí nghiệm.', { al: 'both' }),
        TRONG, ky(['XÁC NHẬN CỦA GVHD', 'SINH VIÊN ĐĂNG KÝ'], 4), TRONG, ky([['TRƯỞNG KHOA', (window.PTN_KY || {}).truong_khoa], 'BỘ PHẬN THU PHÍ'], 4));
      return k;
    }
    k.push(P(R(t[0], { b: 1, sz: 28 }), { al: 'center' }), P(R('THỰC HIỆN ' + (doAn ? 'ĐỒ ÁN' : kltn ? 'KHÓA LUẬN TỐT NGHIỆP / LUẬN VĂN' : 'NGHIÊN CỨU KHOA HỌC'), { b: 1, sz: 28 }), { al: 'center' }),
      P('Kính gửi:  - Ban lãnh đạo Khoa Khoa học Sức khỏe;', { al: 'both', ind: { left: 1134 } }), P('- Bộ phận quản lý Phòng thí nghiệm Khoa.', { al: 'both', ind: { left: 2268 } }),
      P(['Tôi tên: ', GT(tn.ho_ten, 14), ' (đại diện nhóm)   MSSV: ', GT(tn.ma_so, 5)]), P(['Lớp: ', GT(tn.lop, 6), '  Điện thoại: ', GT(tn.sdt, 5), '  Email: ', GT(tn.email, 8)]),
      P(['Bộ môn/Khoa: ', GT(hs.bo_mon, 27)]), P(R('Danh sách nhóm thực hiện:', { b: 1 }), { al: 'both' }),
      bang([700, 3000, 1600, 1600, 2171], ['STT', 'Họ và tên', 'MSSV', 'Điện thoại', 'Email'], (hs.nhom || []).map((m, i) => [i + 1, m.ho_ten, m.ma_so, m.sdt, m.email]), 3), TRONG);
    const deTai = [P(['Đề tài: ', GT(hs.ten, 30)]), P(['GVHD: ', GT(hs.gvhd, 31)])];
    const loiMo = 'Chúng tôi rất mong được sự đồng ý của thầy/cô để có thể tiến hành thực hiện đề tài trong thời gian sớm nhất và ';
    const camOn = kltn ? P([R('Ghi chú:', { i: 1 }), GHI_CHU_BT], { al: 'both' }) : P('Chúng tôi chân thành cảm ơn.', { al: 'both' });
    if (ma[1] === 'A') {
      k.push(P('Tôi làm đơn này kính đề nghị BLĐ Khoa và bộ phận quản lý PTN cho phép mượn các dụng cụ sau để thực hiện ' + (kltn ? viec : 'đề tài nghiên cứu khoa học') + ':', { al: 'both' }), ...deTai,
        bang([700, 2700, 2771, 1000, 1000, 900], ['STT', 'Tên dụng cụ', 'Quy cách (đặc điểm, thông số chính, nhà sản xuất)', 'SL mượn', 'SL trả', 'Ghi chú'],
          (hs.dung_cu || []).map((d, i) => [i + 1, d.ten, d.quy_cach || '', (d.sl || '') + (d.dvt ? ' ' + d.dvt : ''), '', d.ghi_chu || '']), 4),
        P([R('Lưu ý: ', { i: 1 }), 'Khi cần mượn thêm dụng cụ, quét mã QR8 → chọn "Đồ án – KLTN – NCKH" → nhập mã hồ sơ ', R(hs.id || '……………', { b: 1 }), '.'], { al: 'both' }), TRONG,
        P(loiMo + 'đồng ý thực hiện đầy đủ các cam kết sau:', { al: 'both' }),
        ...dsSo(['Trả đúng và đầy đủ các dụng cụ đã mượn của phòng thí nghiệm.', 'Tổng vệ sinh phòng thực hành, vệ sinh bên trong và bên ngoài máy, thiết bị đã sử dụng.',
          kltn ? 'Bồi thường những hư hỏng trong quá trình thực hiện ' + viec + '.' : 'Bồi thường những hư hỏng trong quá trình sử dụng.']), camOn);
    } else {
      if (ma[1] === 'B') k.push(P(['Tôi làm đơn này kính đề nghị BLĐ Khoa và bộ phận quản lý PTN cho phép mượn phòng ', GT(hs.phong, 5), ' để thực hiện ' + viec + '.'], { al: 'both' }),
        P(['Thời gian sử dụng: từ ngày ', hs.tu_ngay ? R(ngay(hs.tu_ngay), { b: 1 }) : '……/……/20……', ' đến ngày ', hs.den_ngay ? R(ngay(hs.den_ngay), { b: 1 }) : '……/……/20……', hs.ngoai_gio === 'Có' ? ' (có làm ngoài giờ hành chính)' : '']), ...deTai);
      else k.push(P('Tôi làm đơn này kính đề nghị BLĐ Khoa và bộ phận quản lý PTN cho phép sử dụng các thiết bị sau để thực hiện ' + (kltn ? viec : 'đề tài nghiên cứu khoa học') + ':', { al: 'both' }), ...deTai,
        bang([700, 3171, 1700, 2000, 1500], ['STT', 'Tên thiết bị', 'Phòng', 'Xác nhận GV QLP', 'Ghi chú'], (hs.ten_tb || []).map((t2, i) => [i + 1, t2, hs.phong || '', '', '']), 3), TRONG);
      k.push(P(loiMo + 'cam kết thực hiện đầy đủ, đúng nội quy phòng thí nghiệm như sau:', { al: 'both' }), ...dsSo(CAM_KET_SD),
        P(R('Sau khi hoàn thành ' + (kltn ? viec : 'đề tài') + ', chúng tôi cam kết:', { b: 1 }), { al: 'both' }), ...dsSo(CAM_KET_SAU), camOn);
    }
    k.push(P(R(ngayDon(hs), { i: 1 }), { al: 'right' }),
      ky(['ĐẠI DIỆN BÊN MƯỢN', 'GIẢNG VIÊN HƯỚNG DẪN', { A: 'QUẢN LÝ PTN', B: 'GV QUẢN LÝ PHÒNG', C: 'QUẢN LÝ PTN MƯỢN TB' }[ma[1]]], 3));
    return k;
  }
  // đầu đơn: Trường – Khoa | Quốc hiệu (như mẫu)
  const HD_GRID = [4500, 4571];
  const HD = [[R('ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH', { sz: 20 }), R('KHOA KHOA HỌC SỨC KHỎE', { b: 1, sz: 24 }), R('–––––––––––', { sz: 22 })],
    [R('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { b: 1, sz: 20 }), R('Độc lập – Tự do – Hạnh phúc', { b: 1 }), R('–––––––––––––––––––', { sz: 22 })]];
  // trang in cân hai bên: lề trái = lề phải 2,5 cm → vùng chữ 16 cm (= 9071 twip, đúng độ rộng bảng của mẫu)
  const LE = { tren: 20, duoi: 20, ben: 25 }, QR_MM = 15, QR_LO = 3; // mã QR 15 mm, lấn ra lề phải 3 mm để không chạm tiêu đề

  // ---------- Xem trước khổ A4 (HTML) ----------
  const pt = (sz) => (sz || 26) / 2 + 'pt';
  const runHtml = (r) => '<span style="font-size:' + pt(r.sz || 24) + (r.b ? ';font-weight:bold' : '') + (r.i ? ';font-style:italic' : '') + '">' + esc(r.t) + '</span>';
  const pHtml = (p, anh) => '<p style="text-align:' + ({ both: 'justify', center: 'center', right: 'right' }[p.al] || 'left') + (p.ind && p.ind.left ? ';margin-left:' + p.ind.left / 20 + 'pt' : '') +
    (p.ind && p.ind.firstLine ? ';text-indent:' + p.ind.firstLine / 20 + 'pt' : '') + (anh ? ';position:relative' : '') + '">' + (anh || '') + (p.p.map(runHtml).join('') || '&nbsp;') + '</p>';
  // k: các khối của một trang (đoạn văn / đầu trang / bảng / khối ký)
  function htmlKhoi(k, qr) {
    return k.map(b => {
      if (b.p) return pHtml(b, b.qr && qr ? '<img class="qr" src="' + qr + '" alt="Mã QR">' : '');
      if (b.hd) return '<table class="hd"><colgroup>' + HD_GRID.map(w => '<col style="width:' + w / 20 + 'pt">').join('') + '</colgroup><tr>' +
        HD.map(c => '<td>' + c.map(r => '<div>' + runHtml(r) + '</div>').join('') + '</td>').join('') + '</tr></table>';
      if (b.bang) return '<table class="ds"><colgroup>' + b.bang.grid.map(w => '<col style="width:' + w / 20 + 'pt">').join('') + '</colgroup><tr>' +
        b.bang.dau.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>' + b.bang.dong.map(r => '<tr>' + r.map((c, j) => '<td' + (j === 0 ? ' class="c"' : '') + '>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</table>';
      if (b.ky) return '<table class="ky"><tr>' + b.ky.cot.map(c => '<td><b>' + esc(c[0]) + '</b><br><i>(Ký và ghi rõ họ tên)</i>' + '<br>'.repeat(b.ky.trong) + (c[1] ? '<br><b>' + esc(c[1]) + '</b>' : '') + '</td>').join('') + '</tr></table>';
      return '';
    }).join('');
  }
  const CSS = '@page{size:A4;margin:' + LE.tren + 'mm ' + LE.ben + 'mm ' + LE.duoi + 'mm}body{margin:0;background:#E9ECF2;font-family:"Times New Roman",Times,serif;color:#000}' +
    '.trang{width:210mm;min-height:297mm;box-sizing:border-box;padding:' + LE.tren + 'mm ' + LE.ben + 'mm ' + LE.duoi + 'mm;margin:14px auto;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.18)}' +
    'img.qr{position:absolute;top:0;right:-' + QR_LO + 'mm;width:' + QR_MM + 'mm;height:' + QR_MM + 'mm;text-indent:0}' +
    'p{margin:0 0 1.5pt;line-height:1.2;white-space:pre-wrap}table{border-collapse:collapse;table-layout:fixed;width:453.55pt}td,th{padding:1pt 2pt;vertical-align:top;font-size:12pt;line-height:1.2;overflow-wrap:anywhere}' +
    'table.hd td{text-align:center}' +
    'table.ds th,table.ds td{border:.5pt solid #000}table.ds th{text-align:center;font-weight:bold}table.ds td{height:16pt}.c{text-align:center}' +
    'table.ky td{text-align:center;font-size:11pt}' +
    '@media print{body{background:#fff}.trang{margin:0;padding:0;box-shadow:none;width:auto;min-height:0;break-after:page}.trang:last-child{break-after:auto}}' +
    '@media screen and (max-width:820px){.trang{zoom:var(--k,1)}}';
  // tl = { ten, tep (tên file Word), trang: [khối của từng trang], qr (ảnh dataURL) }
  function htmlTL(tl) {
    return '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(tl.ten) + '</title><style>' + CSS + '</style></head><body>' +
      tl.trang.map(k => '<div class="trang">' + htmlKhoi(k, tl.qr) + '</div>').join('') +
      '<script>function k(){if(innerWidth>0)document.documentElement.style.setProperty("--k",Math.min(1,(innerWidth-8)/794))}k();addEventListener("resize",k);addEventListener("load",k)<\/script></body></html>';
  }

  // ---------- File Word .docx (OOXML, đóng gói bằng JSZip) ----------
  const JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const napZip = () => window.JSZip ? Promise.resolve(window.JSZip) : new Promise((ok, loi) => {
    const s = document.createElement('script'); s.src = JSZIP; s.onload = () => ok(window.JSZip); s.onerror = () => loi(new Error('Không tải được thư viện tạo file Word (cần mạng)')); document.head.appendChild(s);
  });
  const x = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DONG = '<w:spacing w:after="30" w:line="250" w:lineRule="auto"/>';
  const rX = (r) => '<w:r><w:rPr>' + (r.b ? '<w:b/>' : '') + (r.i ? '<w:i/>' : '') + '<w:sz w:val="' + (r.sz || 24) + '"/><w:szCs w:val="' + (r.sz || 24) + '"/></w:rPr><w:t xml:space="preserve">' + x(r.t) + '</w:t></w:r>';
  const pX = (p, them) => '<w:p><w:pPr>' + DONG + (p.ind ? '<w:ind' + (p.ind.left ? ' w:left="' + p.ind.left + '"' : '') + (p.ind.firstLine ? ' w:firstLine="' + p.ind.firstLine + '"' : '') + '/>' : '') +
    (p.al ? '<w:jc w:val="' + p.al + '"/>' : '') + '</w:pPr>' + (them || '') + p.p.map(rX).join('') + '</w:p>';
  const VIEN = (co) => '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => co ? '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="auto"/>' : '<w:' + k + ' w:val="none" w:sz="0" w:space="0" w:color="auto"/>').join('') + '</w:tblBorders>';
  const tblX = (grid, rows, coVien) => '<w:tbl><w:tblPr><w:tblW w:w="' + grid.reduce((a, b) => a + b, 0) + '" w:type="dxa"/>' + VIEN(coVien) +
    '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="57" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + grid.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' +
    rows.map(r => '<w:tr>' + r.map((c, j) => '<w:tc><w:tcPr><w:tcW w:w="' + grid[j] + '" w:type="dxa"/></w:tcPr>' + c + '</w:tc>').join('') + '</w:tr>').join('') + '</w:tbl>';
  // mã QR nổi, neo vào đoạn có cờ qr (dưới quốc hiệu, ngang tiêu đề đơn), sát lề phải; không chiếm chỗ chữ
  const EMU_MM = 36000, QR_EMU = QR_MM * EMU_MM;
  const anhX = (rid, id) => '<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="' + (251659264 + id) + '" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">' +
    '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:posOffset>' + (210 - 2 * LE.ben + QR_LO - QR_MM) * EMU_MM + '</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>' +
    '<wp:extent cx="' + QR_EMU + '" cy="' + QR_EMU + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="' + id + '" name="QR ' + id + '"/><wp:cNvGraphicFramePr/>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:nvPicPr><pic:cNvPr id="' + id + '" name="qr"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + QR_EMU + '" cy="' + QR_EMU + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>';
  function docxKhoi(k, coQR, so) {
    return k.map(b => {
      if (b.p) return pX(b, b.qr && coQR ? anhX('rIdQR', so) : '');
      if (b.hd) return tblX(HD_GRID, [HD.map(c => c.map(r => pX({ p: [r], al: 'center' })).join(''))], false);
      if (b.bang) return tblX(b.bang.grid, [b.bang.dau.map(h => pX({ p: [R(h, { b: 1 })], al: 'center' }))].concat(b.bang.dong.map(r => r.map((c, j) => pX({ p: [R(c)], al: j === 0 ? 'center' : '' })))), true);
      if (b.ky) { const w = Math.floor(9071 / b.ky.cot.length), g = b.ky.cot.map((_, i) => i < b.ky.cot.length - 1 ? w : 9071 - w * (b.ky.cot.length - 1));
        return tblX(g, [b.ky.cot.map(c => pX({ p: [R(c[0], { b: 1, sz: 22 })], al: 'center' }) + pX({ p: [R('(Ký và ghi rõ họ tên)', { i: 1, sz: 22 })], al: 'center' }) + pX({ p: [] }).repeat(b.ky.trong) +
          (c[1] ? pX({ p: [R(c[1], { b: 1 })], al: 'center' }) : ''))], false); }
      return '';
    }).join('');
  }
  async function docxTL(tl) {
    const qr = tl.qr, Z = await napZip(), z = new Z(), m = qr && /^data:image\/(png|gif|jpeg);base64,(.+)$/.exec(qr), duoi = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : '';
    const than = tl.trang.map((k, i) => docxKhoi(k, !!m, i + 1) + (i < tl.trang.length - 1 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : '')).join('');
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      (m ? '<Default Extension="' + duoi + '" ContentType="image/' + m[1] + '"/>' : '') + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      (m ? '<Relationship Id="rIdQR" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/qr.' + duoi + '"/>' : '') + '</Relationships>');
    z.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>');
    if (m) z.file('word/media/qr.' + duoi, m[2], { base64: true });
    z.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>' +
      than + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="' + Math.round(LE.tren * 56.7) + '" w:right="' + Math.round(LE.ben * 56.7) + '" w:bottom="' + Math.round(LE.duoi * 56.7) + '" w:left="' + Math.round(LE.ben * 56.7) + '" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
    return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  async function taiWordTL(tl) {
    const url = URL.createObjectURL(await docxTL(tl));
    const a = document.createElement('a'); a.href = url; a.download = String(tl.tep || tl.ten).replace(/[\\/:*?"<>|]/g, '-') + (/\.docx$/.test(tl.tep || '') ? '' : '.docx'); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ---------- Hộp xem trước trên trang: In / Tải Word / Đóng ----------
  function xemTruocTL(tl) {
    const cu = document.getElementById('xem-don'); if (cu) cu.remove();
    const d = document.createElement('div'); d.id = 'xem-don';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#E9ECF2;display:flex;flex-direction:column;font-family:"Times New Roman",Times,serif';
    const nut = 'padding:8px 14px;border-radius:8px;border:1px solid #1E4FC2;font:inherit;font-size:15px;cursor:pointer;';
    d.innerHTML = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12)"><b style="font-size:16px">Xem trước – ' + esc(tl.ten) + '</b>' +
      '<span style="flex:1"></span><button data-x="in" style="' + nut + 'background:#1E4FC2;color:#fff">🖨 In</button><button data-x="word" style="' + nut + 'background:#fff;color:#1E4FC2">Tải Word (.docx)</button>' +
      '<button data-x="dong" style="' + nut + 'background:#fff;color:#333;border-color:#bbb">Đóng</button></div><iframe title="Xem trước đơn" style="flex:1;border:0;width:100%"></iframe>';
    document.body.appendChild(d);
    const f = d.querySelector('iframe'); f.srcdoc = htmlTL(tl);
    const dong = () => { d.remove(); document.removeEventListener('keydown', esc2); };
    const esc2 = (e) => { if (e.key === 'Escape') dong(); };
    d.querySelector('[data-x=in]').onclick = () => f.contentWindow.print();
    d.querySelector('[data-x=word]').onclick = async (e) => { const b = e.target, t = b.textContent; b.disabled = true; b.textContent = 'Đang tạo…'; try { await taiWordTL(tl); } catch (err) { alert(err.message); } b.disabled = false; b.textContent = t; };
    d.querySelector('[data-x=dong]').onclick = dong;
    document.addEventListener('keydown', esc2);
    return d;
  }
  // Đơn Phụ lục của hồ sơ đề tài (QR7)
  const tlPhuLuc = (dsMa, hs, qr) => { dsMa = [].concat(dsMa); return { ten: (dsMa.length === 1 ? 'Phụ lục ' + dsMa[0] : dsMa.length + ' đơn') + ' · ' + hs.id,
    tep: (dsMa.length === 1 ? 'PL' + dsMa[0] : 'Don PL ' + dsMa.join('-')) + '_' + hs.id, trang: dsMa.map(ma => khoi(ma, hs)), qr }; };
  const html = (dsMa, hs, qr) => htmlTL(tlPhuLuc(dsMa, hs, qr)), docx = (dsMa, hs, qr) => docxTL(tlPhuLuc(dsMa, hs, qr));
  const taiWord = (dsMa, hs, qr) => taiWordTL(tlPhuLuc(dsMa, hs, qr)), xemTruoc = (dsMa, hs, qr) => xemTruocTL(tlPhuLuc(dsMa, hs, qr));
  window.PTN_PHU_LUC = { danhSach, khoi, html, docx, taiWord, xemTruoc };
  // khuôn dùng chung cho các đơn QR khác (don-qr.js): khối văn bản + dựng xem trước / Word
  window.PTN_DON = { R, GT, P, TRONG, bang, ky, dsSo, ngayDon, ngay, htmlTL, docxTL, taiWordTL, xemTruocTL };
})();
