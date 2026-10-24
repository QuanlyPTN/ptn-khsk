/* Đơn / phiếu điền sẵn cho các mã QR1 – QR6, QR8 (QR7 dùng đơn Phụ lục 1A – 3 trong don-phu-luc.js).
   Cùng khuôn với đơn Phụ lục: đầu trang Trường – Khoa | Quốc hiệu, mã QR đơn bên phải tiêu đề, lề hai bên đều, ngày theo ngày duyệt,
   xem trước A4 trên trang + In + file Word .docx. QR2 bám mẫu "Đơn đề nghị mượn thiết bị dài ngày (GV) – Mẫu QR2". Dùng chung trang công khai và trang quản lý. */
(function () {
  'use strict';
  const D = window.PTN_DON, { R, GT, P, TRONG, bang, ky, dsSo, ngay } = D;
  const gio = (s) => String(s || '').slice(11, 16), soVN = (n) => n === '' || n == null ? '' : (Math.round(+n * 1000) / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  const buoc = (d, re) => (d.xu_ly || []).filter(x => re.test(x.hd)).pop(); // bước xử lý gần nhất khớp tên
  // ngày ghi cuối đơn: ngày duyệt; đơn không qua bước duyệt (QR5, giao thẳng) → ngày giao / ngày sử dụng; chưa xử lý → để chấm
  function ngayKy(d) {
    const b = buoc(d, /^Duyệt$/) || buoc(d, /^(Đã giao|Đã cấp|Giao chìa)/) || (d.qr === 'QR5' ? { tg: d.tu_ngay } : null), m = b && /^(\d{4})-(\d{2})-(\d{2})/.exec(b.tg || '');
    return 'TP. Hồ Chí Minh, ngày ' + (m ? m[3] + ' tháng ' + m[2] + ' năm ' + m[1] : '…… tháng …… năm 20……');
  }
  const gv = (d) => d.doi_tuong === 'Giảng viên';
  const dau = (ma, tieuDe, phu) => [P(R('Mẫu ' + ma, { b: 1, i: 1 }), { al: 'right' }), { hd: 1 }, P('', { al: 'both', qr: 1 }),
    P(R(tieuDe, { b: 1, sz: 28 }), { al: 'center' })].concat(phu ? [P(R(phu, { b: 1 }), { al: 'center' })] : []);
  const kinhGui = (ds) => [P([R('Kính gửi:  ', { i: 1 }), ds[0]], { ind: { left: 1134 } })].concat(ds.slice(1).map(x => P(x, { ind: { left: 2268 } })));
  // thông tin người đăng ký (SV: MSSV, lớp, GVHD; GV: mã viên chức, bộ môn)
  const nguoi = (d) => [P(['Tôi tên: ', GT(d.ho_ten, 22), (gv(d) ? '   Mã viên chức: ' : '   MSSV: '), GT(d.ma_so, 8)]),
    P([gv(d) ? 'Bộ môn: ' : 'Lớp: ', GT(gv(d) ? d.bo_mon : d.lop, 16), '   Điện thoại: ', GT(d.sdt, 8)]), P(['Email: ', GT(d.email, 30)])]
    .concat(!gv(d) && d.nd.gvhd ? [P(['Giảng viên hướng dẫn: ', GT(d.nd.gvhd, 26)])] : []);
  const thoiGian = (a, b) => [ngay(a), gio(a) && gio(a) + ' giờ', '→', ngay(b), gio(b) && gio(b)].filter(Boolean).join(' ');
  const ghiChuTra = (d) => { const t = buoc(d, /^(Nhận trả|Nhận lại chìa khóa|Trả tủ|Kết thúc sử dụng)/); return t ? [P([R('Xác nhận trả: ', { b: 1 }), R(ngay(t.tg) + ' ' + gio(t.tg) + (t.nd ? ' – ' + t.nd : '') + ' (cán bộ ' + t.nguoi + ')')])] : []; };
  const cuoi = (d, dsKy, trong) => [P(R(ngayKy(d), { i: 1 }), { al: 'right' }), ky(dsKy, trong == null ? 3 : trong)];
  // bảng thiết bị của đơn: tb_ct (chi tiết) hoặc ten_tb
  // tủ của đơn QR6: "tủ số 05 (phòng D11.02), tủ số 07 (phòng D11.03)"
  const tuDon = (d) => { const ps = String(d.phong || '').split(/\s*,\s*/); return String(d.tu || '').split(/\s*,\s*/).filter(Boolean).map((so, i) => 'tủ số ' + so + ' (phòng ' + (ps[i] || ps[0]) + ')').join(', ') || 'tủ số ……… tại phòng ………'; };
  // thiết bị gõ tay ngoài danh sách (QR2) đã nằm cuối ten_tb; tb_ct chỉ có thiết bị trong danh mục
  const dsTB = (d) => (d.tb_ct && d.tb_ct.length ? d.tb_ct.concat((d.ten_tb || []).slice(d.tb_ct.length).map(t => ({ ten: t }))) : (d.ten_tb || []).map(t => ({ ten: t })));

  const MAU = {
    QR1: (d) => dau('QR1', 'ĐƠN ĐỀ NGHỊ MƯỢN PHÒNG, THIẾT BỊ – DỤNG CỤ', '(SỬ DỤNG TRONG NGÀY)').concat(
      kinhGui(['Bộ phận quản lý Phòng thí nghiệm Khoa Khoa học Sức khỏe.']), nguoi(d),
      [P(['Tôi làm đơn này kính đề nghị bộ phận quản lý PTN cho phép mượn phòng ', GT(d.phong, 6), ' và các thiết bị, dụng cụ dưới đây.'], { al: 'both' }),
        P(['Mục đích: ', GT(d.nd.muc_dich || d.nd.noi_dung, 34)], { al: 'both' }),
        P(['Thời gian sử dụng: ngày ', R(ngay(d.tu_ngay), { b: 1 }), ', từ ', R(gio(d.tu_ngay) || '……', { b: 1 }), ' đến ', R(gio(d.den_ngay) || '……', { b: 1 })]),
        bang([700, 3600, 1500, 1636, 1635], ['STT', 'Tên thiết bị', 'Mã tài sản', 'Tình trạng khi nhận', 'Tình trạng khi trả'], dsTB(d).map((t, i) => [i + 1, t.ten + (t.model ? ' – ' + t.model : ''), t.ma_ts || '', '', '']), 3),
        P(['Dụng cụ mượn kèm: ', GT(d.nd.dung_cu, 36)], { al: 'both' }), TRONG,
        P(R('Tôi cam kết:', { b: 1 }))], dsSo(['Sử dụng đúng mục đích, đúng phòng và thời gian đã đăng ký; quét mã QR5 trước khi sử dụng thiết bị.',
        'Vận hành thiết bị theo hướng dẫn; báo ngay cho PTN khi có sự cố.', 'Trả đúng giờ, đầy đủ và đúng tình trạng như khi nhận; vệ sinh phòng, tắt điện, khóa nước trước khi ra về.',
        'Bồi thường những hư hỏng, mất mát do lỗi chủ quan gây ra.']), ghiChuTra(d),
      cuoi(d, [['NGƯỜI MƯỢN', d.ho_ten], gv(d) ? 'QUẢN LÝ PHÒNG' : ['GIẢNG VIÊN HƯỚNG DẪN', d.nd.gvhd], 'QUẢN LÝ PTN'])),

    // bám "Mẫu QR2"
    QR2: (d) => dau('QR2', 'ĐƠN ĐỀ NGHỊ MƯỢN THIẾT BỊ DÀI NGÀY', '(DÀNH CHO GIẢNG VIÊN – TỪ 02 NGÀY TRỞ LÊN)').concat(
      kinhGui(['- Ban lãnh đạo Khoa Khoa học Sức khỏe;', '- Bộ phận quản lý Phòng thí nghiệm Khoa.']),
      [P(['Tôi tên: ', GT(d.ho_ten, 22), '  Mã viên chức: ', GT(d.ma_so, 8)]), P(['Bộ môn: ', GT(d.bo_mon, 22), '  Điện thoại: ', GT(d.sdt, 8)]), P(['Email: ', GT(d.email, 34)]),
        P('Tôi làm đơn này kính đề nghị BLĐ Khoa và bộ phận quản lý PTN cho phép mượn các thiết bị dưới đây.', { al: 'both' }), P(R('Mục đích mượn:', { b: 1 })),
        P([(d.lop_hp || d.nd.dung_cho === 'lop' ? '☒' : '☐') + '  Phục vụ lớp thực hành – Học phần / mã LHP: ', GT(d.lop_hp ? (d.nd.ten_mon ? d.nd.ten_mon + ' / ' : '') + String(d.lop_hp).slice(0, 10) : d.nd.dung_cho === 'lop' ? d.nd.ten_mon || '' : '', 16)], { ind: { left: 360 } }),
        P([(d.hs ? '☒' : '☐') + '  Phục vụ đồ án, KLTN, NCKH của SV – Đề tài / nhóm SV: ', GT(d.hs ? d.hs + (d.nd.ten_hs ? ' – ' + d.nd.ten_hs : '') : '', 10)], { ind: { left: 360 } }),
        P([(!d.lop_hp && !d.hs && d.nd.dung_cho !== 'lop' ? '☒' : '☐') + '  Khác: ', GT(!d.lop_hp && !d.hs && d.nd.dung_cho !== 'lop' ? d.nd.muc_dich : '', 30)], { ind: { left: 360 } })]
        .concat(d.nd.muc_dich && (d.lop_hp || d.hs) ? [P(['Nội dung sử dụng: ', R(d.nd.muc_dich, { b: 1 })], { ind: { left: 360 } })] : []),
      [P(['Thời gian mượn: từ ngày ', R(ngay(d.tu_ngay), { b: 1 }), ' đến ngày ', R(ngay(d.den_ngay), { b: 1 })]),
        P(['Nơi sử dụng (phòng): ', GT(d.nd.noi_su_dung || d.phong, 22)]),
        bang([594, 1294, 2686, 559, 1197, 1395, 1345], ['STT', 'Mã tài sản', 'Tên thiết bị (model, số serial)', 'SL', 'Phòng hiện tại', 'Tình trạng khi nhận', 'Tình trạng khi trả'],
          dsTB(d).map((t, i) => [i + 1, t.ma_ts || '', [t.ten, t.model, t.serial && 'S/N ' + t.serial].filter(Boolean).join(' – '), 1, t.phong || '', '', '']), 3),
        P(R('Tôi cam kết:', { b: 1 }))],
      ['Sử dụng thiết bị đúng mục đích, đúng nơi đã đăng ký; không cho người khác mượn lại.', 'Bảo quản, vận hành theo hướng dẫn sử dụng; báo ngay cho PTN khi có sự cố (theo Biểu mẫu báo hỏng thiết bị).',
        'Trả đúng hạn, đầy đủ phụ kiện và đúng tình trạng như khi nhận; muốn gia hạn phải đăng ký lại.', 'Bồi thường những hư hỏng, mất mát do lỗi chủ quan gây ra.']
        .map((x, i) => P((i + 1) + '. ' + x, { al: 'both', ind: { left: 567 } })),
      [P([R('Ghi chú: ', { i: 1 }), 'Giảng viên đăng ký trực tuyến qua mã QR2 trước khi nộp đơn. Việc bồi thường (nếu có) được xử lý theo Điều 24 Quy định quản lý, sử dụng tài sản nội bộ tại Khoa. Đơn lập thành 02 bản: PTN giữ 01 bản, giảng viên giữ 01 bản.'], { al: 'both' })],
      ghiChuTra(d), cuoi(d, [['GIẢNG VIÊN MƯỢN', d.ho_ten], 'QUẢN LÝ PTN', 'BAN LÃNH ĐẠO KHOA'])),

    QR3: (d) => { const cap = d.trang_thai === 'Đã cấp phát';
      return dau('QR3', 'PHIẾU ĐỀ NGHỊ CẤP BỔ SUNG HÓA CHẤT – VẬT TƯ', '(NGOÀI SỐ LƯỢNG ĐÃ BÀN GIAO THEO BIÊN BẢN)').concat(
        kinhGui(['Bộ phận quản lý Phòng thí nghiệm Khoa Khoa học Sức khỏe.']), nguoi(d),
        [P(['Môn thực hành: ', GT(d.nd.ten_mon || d.ten_bb, 24), '   Phòng: ', GT(d.phong, 6)]),
          P(['Giảng viên phụ trách: ', GT(d.nd.gvhd, 26)])].concat(d.nd.bai ? [P(['Bài thực hành: ', R(d.nd.bai, { b: 1 })])] : [], d.nd.ly_do ? [P(['Lý do cấp bổ sung: ', R(d.nd.ly_do, { b: 1 })], { al: 'both' })] : [], [
          P(['Ngày cần: ', d.den_ngay ? R(ngay(d.den_ngay), { b: 1 }) : '……/……/20……']),
          bang([700, 3400, 900, 900, 1100, 1100, 971], ['STT', 'Tên hóa chất – vật tư', 'Mã VT', 'ĐVT', 'SL đề nghị', 'SL thực cấp', 'Ghi chú'],
            (d.nd.dong || []).map((x, i) => [i + 1, x.ten + (x.dong ? '' : ' (*)'), x.ma_vt || '', x.dvt || '', soVN(x.sl_dk != null ? x.sl_dk : x.sl), cap ? soVN(x.sl) : '', x.ghi_chu || '']), 3),
          P([R('Ghi chú: ', { i: 1 }), '(*) ngoài danh mục biên bản. Số lượng thực cấp được cộng vào cột "Bổ sung" của biên bản bàn giao hóa chất' + (d.bb ? ' số ' + d.bb : '') + '.' + (d.nd.dang_ky_thay ? ' ' + d.nd.dang_ky_thay + '.' : '')], { al: 'both' })]),
          cuoi(d, [['NGƯỜI ĐỀ NGHỊ', d.ho_ten], ['GIẢNG VIÊN PHỤ TRÁCH', gv(d) ? d.ho_ten : d.nd.gvhd], 'CÁN BỘ PTN CẤP'])); },

    QR4: (d) => dau('QR4', 'PHIẾU MƯỢN CHÌA KHÓA PHÒNG THỰC HÀNH', '(GIẢNG VIÊN MƯỢN TẠI PHÒNG BẢO VỆ)').concat(
      kinhGui(['- Bộ phận Bảo vệ;', '- Bộ phận quản lý Phòng thí nghiệm Khoa Khoa học Sức khỏe.']),
      [P(['Tôi tên: ', GT(d.ho_ten, 22), '  Mã viên chức: ', GT(d.ma_so, 8)]), P(['Bộ môn: ', GT(d.bo_mon, 22), '  Điện thoại: ', GT(d.sdt, 8)]),
        P(['Đề nghị mượn chìa khóa ' + (String(d.phong).indexOf(',') > 0 ? 'các phòng ' : 'phòng '), GT(d.phong, 6), ' để: ', GT(d.nd.muc_dich || d.nd.hoc_phan, 24)], { al: 'both' }),
        P(['Học phần / nội dung: ', GT(d.nd.hoc_phan, 30)]),
        bang([700, 1800, 2000, 2000, 2571], ['STT', 'Phòng', 'Nhận chìa (ngày, giờ)', 'Trả chìa dự kiến', 'Ghi chú'], String(d.phong || '').split(/\s*,\s*/).map((p, i) => [i + 1, p, ngay(d.tu_ngay) + ' ' + gio(d.tu_ngay), gio(d.den_ngay), i ? '' : d.nd.ghi_chu || '']), 1),
        P(R('Tôi cam kết:', { b: 1 }))], dsSo(['Giữ chìa khóa cẩn thận, không giao cho người khác.', 'Khóa cửa, tắt điện, khóa nước khi rời phòng.', 'Trả chìa khóa cho Bộ phận Bảo vệ đúng giờ đã đăng ký.']),
      ghiChuTra(d), cuoi(d, [['GIẢNG VIÊN MƯỢN', d.ho_ten], 'BẢO VỆ GIAO CHÌA', 'BẢO VỆ NHẬN LẠI'])),

    QR5: (d) => { const kt = d.trang_thai !== 'Đang dùng' && d.den_ngay, phut = kt ? Math.round((new Date(d.den_ngay.replace(' ', 'T')) - new Date(d.tu_ngay.replace(' ', 'T'))) / 60000) : 0;
      return dau('QR5', 'PHIẾU GHI NHẬN SỬ DỤNG PHÒNG – THIẾT BỊ', '(NHẬT KÝ SỬ DỤNG – MÃ QR5)').concat(nguoi(d),
        [P(['Phòng: ', GT(d.phong, 6), '   Số người sử dụng: ', GT(d.nd.so_nguoi, 3)]), P(['Mục đích: ', GT(d.nd.muc_dich, 34)], { al: 'both' }),
          P(['Bắt đầu: ', R(ngay(d.tu_ngay) + ' ' + gio(d.tu_ngay), { b: 1 }), '   Kết thúc: ', kt ? R(ngay(d.den_ngay) + ' ' + gio(d.den_ngay), { b: 1 }) : '…… giờ ……', kt && phut > 0 ? '   (' + Math.floor(phut / 60) + ' giờ ' + (phut % 60) + ' phút)' : '']),
          bang([700, 3900, 1500, 1500, 1471], ['STT', 'Thiết bị sử dụng', 'Mã tài sản', 'Tình trạng trước', 'Tình trạng sau'],
            dsTB(d).map((t, i) => [i + 1, t.ten, t.ma_ts || '', d.nd.tinh_trang_truoc || '', d.nd.tinh_trang_sau || '']), 2)],
        cuoi(d, [['NGƯỜI SỬ DỤNG', d.ho_ten], gv(d) ? '' : ['GIẢNG VIÊN HƯỚNG DẪN', d.nd.gvhd], 'CÁN BỘ PTN'].filter(Boolean))); },

    QR6: (d) => dau('QR6', 'ĐƠN ĐĂNG KÝ SỬ DỤNG TỦ', '(CẤT GIỮ ĐỒ DÙNG, MẪU THÍ NGHIỆM TẠI PTN)').concat(
      kinhGui(['Bộ phận quản lý Phòng thí nghiệm Khoa Khoa học Sức khỏe.']), nguoi(d),
      [P(['Tôi làm đơn này kính đề nghị được sử dụng ', R(tuDon(d), { b: 1 }), '.'], { al: 'both' }),
        P(['Thời gian sử dụng: từ ngày ', R(ngay(d.tu_ngay), { b: 1 }), ' đến ngày ', R(ngay(d.den_ngay), { b: 1 })]),
        P(['Mục đích: ', GT(d.nd.muc_dich, 34)], { al: 'both' }), P(['Đồ dùng cất giữ: ', GT(d.nd.do_dung, 32)], { al: 'both' }), TRONG, P(R('Tôi cam kết:', { b: 1 }))],
      dsSo(['Chỉ cất giữ đồ dùng, mẫu phục vụ học tập, nghiên cứu; không cất hóa chất độc, dễ cháy nổ khi chưa được PTN cho phép.', 'Giữ tủ sạch sẽ; không làm hư hỏng tủ, ổ khóa.',
        'Trả tủ và chìa khóa đúng hạn; quá hạn PTN được quyền mở tủ, thu dọn đồ dùng.', 'Tự chịu trách nhiệm về tài sản cá nhân cất trong tủ; bồi thường nếu làm hư hỏng, mất chìa khóa.']),
      ghiChuTra(d), cuoi(d, [['NGƯỜI ĐĂNG KÝ', d.ho_ten], gv(d) ? '' : ['GIẢNG VIÊN HƯỚNG DẪN', d.nd.gvhd], 'QUẢN LÝ PTN'].filter(Boolean))),

    QR8: (d) => { const hs = d.nd.nhanh === 'Đồ án – KLTN – NCKH', giao = /Đang mượn|Đã trả/.test(d.trang_thai);
      return dau('QR8', 'PHIẾU ĐỀ NGHỊ MƯỢN THÊM DỤNG CỤ', hs ? '(ĐỒ ÁN – KHÓA LUẬN – NGHIÊN CỨU KHOA HỌC)' : '(LỚP THỰC HÀNH)').concat(
        kinhGui(['Bộ phận quản lý Phòng thí nghiệm Khoa Khoa học Sức khỏe.']), nguoi(d),
        [hs ? P(['Đề tài: ', GT((d.hs ? d.hs + ' – ' : '') + (d.nd.ten_hs || ''), 30)], { al: 'both' }) : P(['Lớp học phần: ', GT(d.lop_hp, 12), d.nd.ten_mon ? ' – ' + d.nd.ten_mon : '']),
          P(['Phòng: ', GT(d.phong, 6), '   Hạn trả: ', d.den_ngay ? R(ngay(d.den_ngay), { b: 1 }) : '……/……/20……']),
          P('Tôi làm đơn này kính đề nghị PTN cho mượn thêm các dụng cụ dưới đây (ngoài số lượng đã bàn giao theo biên bản):', { al: 'both' }),
          bang([700, 3600, 900, 1200, 1200, 1471], ['STT', 'Tên dụng cụ – quy cách', 'ĐVT', 'SL đề nghị', 'SL mượn thêm', 'Ghi chú'],
            (d.nd.dong || []).map((x, i) => [i + 1, x.ten + (x.quy_cach ? ' – ' + x.quy_cach : ''), x.dvt || '', soVN(x.sl_dk != null ? x.sl_dk : x.sl), giao ? soVN(x.sl) : '', x.ghi_chu || '']), 3),
          P([R('Ghi chú: ', { i: 1 }), 'Số lượng mượn thêm được ghi vào cột "Mượn thêm" của biên bản bàn giao dụng cụ' + (d.bb ? ' số ' + d.bb : '') + '; khi trả, PTN ghi vào cột "Trả".'], { al: 'both' }),
          P(R('Tôi cam kết:', { b: 1 }))], dsSo(['Trả đúng hạn, đủ số lượng và đúng tình trạng như khi nhận; vệ sinh, sấy khô dụng cụ trước khi trả.', 'Bồi thường dụng cụ nứt, mẻ, gãy, vỡ hoặc mất trong thời gian mượn.']),
        ghiChuTra(d), cuoi(d, [['NGƯỜI MƯỢN', d.ho_ten], ['GIẢNG VIÊN HƯỚNG DẪN', gv(d) ? d.ho_ten : d.nd.gvhd], 'CÁN BỘ PTN'])); }
  };
  const TEN = { QR1: 'Đơn mượn phòng, TB – DC trong ngày', QR2: 'Đơn mượn thiết bị dài ngày', QR3: 'Phiếu đề nghị cấp bổ sung hóa chất', QR4: 'Phiếu mượn chìa khóa',
    QR5: 'Phiếu ghi nhận sử dụng', QR6: 'Đơn đăng ký sử dụng tủ', QR8: 'Phiếu đề nghị mượn thêm dụng cụ' };
  const coMau = (qr) => !!MAU[qr];
  // d: đơn (xemDon_ / ctDon), qr: ảnh mã QR (dataURL) dẫn tới đơn trên trang quản lý
  // mã đơn in ở góc phải dưới "Mẫu QRx" (trên đầu trang, tách khỏi mã QR)
  const khoi = (d) => { const k = MAU[d.qr](d); k.splice(1, 0, P([R('Mã đơn: ', { i: 1 }), R(d.id || '……………', { b: 1 })], { al: 'right' })); return k; };
  const taiLieu = (d, qr) => ({ ten: d.qr + ' · ' + TEN[d.qr] + ' · ' + d.id, tep: d.qr + '_' + d.id, trang: [khoi(d)], qr });
  window.PTN_DON_QR = { coMau, TEN, khoi, html: (d, qr) => D.htmlTL(taiLieu(d, qr)), docx: (d, qr) => D.docxTL(taiLieu(d, qr)),
    xemTruoc: (d, qr) => D.xemTruocTL(taiLieu(d, qr)), taiWord: (d, qr) => D.taiWordTL(taiLieu(d, qr)) };
})();
