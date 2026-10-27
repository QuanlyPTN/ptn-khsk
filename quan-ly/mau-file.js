/* File Excel mẫu chuẩn cho các chỗ tải file lên ở trang quản lý (nút "Tải file mẫu" trong hộp tải lên).
   Mỗi mẫu 2 trang tính: (1) trang nhập dữ liệu – đúng tiêu đề cột mà hệ thống đọc, để trống cho cán bộ điền; (2) "Huong dan" – quy tắc + ví dụ.
   Trang nhập luôn là trang đầu (hệ thống đọc trang đầu / trang có tên gợi ý). Kho hóa chất, kho dược liệu: mẫu riêng trong app-mo-rong.js (taiMauKho). */
(function () {
  'use strict';
  // mã → { ten (tên hiển thị), tep (tên file), trang (tên trang nhập), tieuDe, cot: [[tiêu đề cột, độ rộng]], truoc: [các dòng phía trên tiêu đề], hd: [quy tắc], vd: [dòng ví dụ] }
  const DS = {
    tkb: { ten: 'Thời khóa biểu thực hành', tep: '01 Mau thoi khoa bieu thuc hanh', trang: 'TH & Phòng học', tieuDe: 'THỜI KHÓA BIỂU THỰC HÀNH – HỌC KỲ …………',
      cot: [['STT', 5], ['NGÀNH', 12], ['MÃ LHP', 15], ['TÊN MÔN HỌC', 28], ['LỚP HỌC', 12], ['LỚP DỰ KIẾN', 12], ['THỨ', 6], ['TỪ TIẾT', 7], ['ĐẾN TIẾT', 7], ['NHÓM', 7], ['SĨ SỐ', 7],
        ['BẮT ĐẦU', 12], ['KẾT THÚC', 12], ['PHÒNG HỌC', 11], ['GIẢNG VIÊN', 22]],
      hd: ['Mỗi dòng là một ca thực hành (một nhóm của một lớp học phần).', 'MÃ LHP: mã lớp học phần (ít nhất 6 chữ số, nên ghi dạng chữ để không mất số 0 đầu).',
        'BẮT ĐẦU, KẾT THÚC: ngày dạng dd/mm/yyyy. PHÒNG HỌC: mã phòng như D11.02.', 'Nhập lại thời khóa biểu sẽ thay toàn bộ thời khóa biểu cũ của học kỳ đang chọn.'],
      vd: [[1, 'Dược', '420301632901', 'TH dược khoa', 'DHDH21A', 'DHDH21A', 2, 1, 5, 1, 25, '03/08/2026', '19/10/2026', 'D11.02', 'ThS. Nguyễn Văn A'],
        [2, 'Dược', '420301632902', 'TH dược khoa', 'DHDH21B', 'DHDH21B', 4, 7, 11, 2, 24, '05/08/2026', '21/10/2026', 'D11.03', 'ThS. Trần Thị B']] },
    ma_vt: { ten: 'Danh mục mã vật tư', tep: '02 Mau danh muc ma vat tu', trang: 'Ma vat tu', tieuDe: 'BẢNG MÃ VẬT TƯ CỦA TRƯỜNG', // tiêu đề không chứa cả "mã vật tư" lẫn "danh mục" (kẻo bị nhận là dòng tiêu đề cột)
      cot: [['MÃ VẬT TƯ', 12], ['DANH MỤC VẬT TƯ', 36], ['LOẠI', 8], ['NSX', 10], ['ĐVỊ', 9], ['MÃ EFFECT', 12], ['NHÓM', 9]],
      hd: ['MÃ VẬT TƯ: chỉ gồm chữ số (mã của Trường). Dòng có mã không phải số sẽ bị bỏ qua.', 'Mã đã có trên hệ thống được cập nhật tên, ĐVT…; đánh dấu "kiểm soát" giữ nguyên.'],
      vd: [['803', 'Acid ascorbic', 'VT', 'TQ', 'Gam', 'HO-0001', 'HO'], ['1053', 'Cồn 96 độ', 'VT', 'VN', 'Lít', 'HO-0052', 'HO']] },
    dinh_muc_hc: { ten: 'Định mức hóa chất (kế hoạch vật tư)', tep: '03 Mau dinh muc hoa chat (ke hoach vat tu)', trang: 'KH vat tu', tieuDe: 'KẾ HOẠCH VẬT TƯ – ĐỊNH MỨC HÓA CHẤT THỰC HÀNH',
      cot: [['TÊN BÀI TẬP', 24], ['MÃ BT', 6], ['MÃ SỐ LỚP', 11], ['MÃ HỌC PHẦN', 15], ['SĨ SỐ', 6], ['STT', 5], ['QUI CÁCH VẬT TƯ', 30], ['MÃ VT', 8], ['NSX', 8], ['ĐVỊ', 7], ['SLG/1HS', 9], ['SLG', 9], ['GHI CHÚ', 16]],
      hd: ['Mỗi môn bắt đầu bằng một dòng ghi "1. TH <tên môn>", "2. TH <tên môn>"… ở cột TÊN BÀI TẬP (cùng dòng với hóa chất đầu tiên).',
        'Các dòng hóa chất của môn: có STT (1, 2, 3…), QUI CÁCH VẬT TƯ, MÃ VT (nếu có), ĐVỊ và SLG/1HS = định mức cho 1 sinh viên.',
        'Lớp học của môn: ghi MÃ SỐ LỚP, MÃ HỌC PHẦN, SĨ SỐ ở các dòng đầu của môn (mỗi lớp một dòng) – không bắt buộc.',
        'Nhóm (Hóa chất / Dược liệu / Vật tư tiêu hao): khi sang nhóm mới, đánh lại STT từ 1 và ghi tên nhóm ở cột TÊN BÀI TẬP của dòng đó (không ghi thì là Hóa chất).',
        'File có thể chỉ gồm một vài môn; định mức của các môn có trong file được thay, biên bản hóa chất của học kỳ tự cập nhật. Không ghi gì dưới dòng "Người lập" / "Trưởng khoa".'],
      vd: [['1. TH dược khoa', '', 'DHDH21A', '420301632901', 20, 1, 'Acid ascorbic', '803', 'TQ', 'Gam', 0.4, '', ''],
        ['', '', 'DHDH21B', '420301632902', 22, 2, 'Cồn 96 độ', '1053', 'TQ', 'Lít', 0.065, '', ''],
        ['DƯỢC LIỆU KHÔ', '', '', '', '', 1, 'Rễ mạch môn', '', 'VN', 'Gam', 2, '', ''],
        ['2. TH bào chế 1', '', 'DHDH20A', '420301634001', 25, 1, 'Vaselin', '1790', 'VN', 'Gam', 5, '', '']] },
    dung_cu: { ten: 'Dụng cụ của một môn', tep: '04 Mau dung cu cua mot mon', trang: 'Dung cu', tieuDe: 'DANH SÁCH DỤNG CỤ THỰC HÀNH CỦA MÔN',
      truoc: [['MÔN:', '']], cot: [['STT', 6], ['Tên dụng cụ', 36], ['NSX', 12], ['ĐVT', 8], ['Số lượng / 1 bộ', 16], ['Ghi chú', 24]],
      hd: ['Ghi tên môn ở ô cạnh chữ "MÔN:" (VD: TH Dược lâm sàng) – hệ thống tự gợi ý môn; không ghi thì chọn môn khi tải lên.',
        'Số lượng là 1 bộ dụng cụ giao cho 1 lớp thực hành (gồm các nhóm của lớp). Mỗi môn chỉ tải 1 file; lớp nhận thêm bộ 2, 3 thì xuất biên bản bộ 2, 3 ở trang biên bản dụng cụ (nút "Xuất bộ 2, 3…"), không tải thêm file.',
        'Mỗi file một môn. Dòng thiếu tên hoặc số lượng bị bỏ qua.'],
      vd: [[1, 'Máy đo huyết áp điện tử', 'Omron', 'Cái', 1, ''], [2, 'Cốc có mỏ 100 mL', 'Duran', 'Cái', 4, '']] },
    du_tru_mon: { ten: 'Dự trù hóa chất của môn (kế hoạch vật tư)', tep: '05 Mau du tru hoa chat cua mon', trang: 'KH vat tu', tieuDe: 'KẾ HOẠCH VẬT TƯ – DỰ TRÙ HÓA CHẤT CỦA MÔN',
      cot: [['TÊN BÀI TẬP', 24], ['MÃ BT', 6], ['MÃ SỐ LỚP', 11], ['MÃ HỌC PHẦN', 15], ['SĨ SỐ', 6], ['STT', 5], ['QUI CÁCH VẬT TƯ', 30], ['MÃ VT', 8], ['NSX', 8], ['ĐVỊ', 7], ['SLG/1HS', 9], ['SLG', 9], ['GHI CHÚ', 16]],
      hd: ['Cùng cách ghi với mẫu định mức hóa chất: mỗi môn bắt đầu bằng dòng "1. TH <tên môn>" (hoặc chỉ tên môn) ở cột TÊN BÀI TẬP.',
        'SLG: tổng số lượng dự trù. Dòng để trống SLG được tính = SLG/1HS × tổng sĩ số các lớp của môn trong file.',
        'Có thể tải lên Phiếu dự trù do hệ thống in ra (mỗi trang tính một môn) thay cho mẫu này.'],
      vd: [['1. TH dược khoa', '', 'DHDH21A', '420301632901', 20, 1, 'Acid ascorbic', '803', 'TQ', 'Gam', 0.4, 49.2, ''],
        ['', '', 'DHDH21B', '420301632902', 22, 2, 'Cồn 96 độ', '1053', 'TQ', 'Lít', 0.065, '', '']] },
    cap_dot: { ten: 'Danh sách vật tư – hóa chất được cấp (theo đợt)', tep: '06 Mau danh sach duoc cap theo dot', trang: 'Duoc cap', tieuDe: 'DANH SÁCH VẬT TƯ – HÓA CHẤT ĐƯỢC CẤP – ĐỢT THÁNG ……',
      cot: [['STT', 6], ['MÃ VT', 10], ['TÊN – QUY CÁCH', 36], ['ĐVT', 8], ['SỐ LƯỢNG ĐƯỢC CẤP', 14], ['GHI CHÚ', 22]],
      hd: ['Danh sách vật tư – hóa chất Phòng Quản trị cấp (dự kiến hoặc thực tế) cho một đợt; số này được trừ vào dự trù các đợt sau.', 'Nên ghi MÃ VT để khớp chính xác; không có mã thì ghi đúng tên – quy cách.'],
      vd: [[1, '803', 'Acid ascorbic', 'Gam', 50, ''], [2, '1053', 'Cồn 96 độ', 'Lít', 8, '']] },
    thiet_bi: { ten: 'Danh mục thiết bị (tài sản)', tep: '07 Mau danh muc thiet bi', trang: 'Thiet bi', tieuDe: 'DANH MỤC THIẾT BỊ – KHOA KHOA HỌC SỨC KHỎE',
      cot: [['MÃ TÀI SẢN', 14], ['TÊN THIẾT BỊ', 30], ['MÃ PHÒNG', 9], ['LOẠI', 12], ['HÃNG', 12], ['MODEL', 12], ['SERIAL', 14], ['XUẤT XỨ', 10], ['NGUỒN VỐN', 12], ['NĂM SẢN XUẤT', 9],
        ['NGÀY ĐƯA VÀO SỬ DỤNG', 13], ['NGUYÊN GIÁ', 14], ['KIỂM ĐỊNH GẦN NHẤT', 13], ['CHU KỲ KIỂM ĐỊNH (THÁNG)', 11], ['KIỂM ĐỊNH KẾ TIẾP', 13], ['THÔNG SỐ', 24], ['GHI CHÚ', 20]],
      hd: ['TÊN THIẾT BỊ bắt buộc; dòng trùng MÃ TÀI SẢN đã có trên hệ thống sẽ bị bỏ qua.', 'MÃ PHÒNG: dạng D11.02. Ngày dạng dd/mm/yyyy. NGUYÊN GIÁ: chỉ ghi số.',
        'Để trống KIỂM ĐỊNH KẾ TIẾP thì hệ thống tự tính từ ngày gần nhất + chu kỳ.'],
      vd: [['TS-2026-001', 'Máy quang phổ UV-Vis', 'D11.02', 'Phân tích', 'Shimadzu', 'UV-1900i', 'A1234567', 'Nhật', 'Ngân sách', 2024, '15/03/2025', 450000000, '01/03/2026', 12, '', 'Bước sóng 190–1100 nm', '']] }
  };
  // trang nhập: tiêu đề, (dòng phía trên), hàng tiêu đề cột, 40 dòng trống kẻ ô
  const NEN_TD = '#D9E2F3', NEN_O = '#FFF8D6';
  function trangNhap(m) {
    const n = m.cot.length, hang = [{ cao: 24, o: [{ v: m.tieuDe, cs: n, b: 1, co: 13, can: 'l' }] }];
    (m.truoc || []).forEach(r => hang.push({ cao: 20, o: r.map((v, i) => ({ v, b: i === 0, nen: i ? NEN_O : undefined, vien: i ? 1 : 0 })) }));
    hang.push({ cao: 36, o: m.cot.map(c => ({ v: c[0], b: 1, can: 'c', vien: 1, nen: NEN_TD })) });
    for (let i = 0; i < 40; i++) hang.push({ cao: 18, o: m.cot.map(() => ({ v: '', vien: 1 })) });
    return { ten: m.trang, huong: 'ngang', cot: m.cot.map(c => c[1]), dongBang: hang.length - 40, hang };
  }
  // trang hướng dẫn: quy tắc + bảng ví dụ cùng cột với trang nhập
  function trangHuongDan(m) {
    const n = m.cot.length, dong = (v, x) => ({ cao: 20, o: [Object.assign({ v, cs: n, can: 'l' }, x)] }), hang = [dong('HƯỚNG DẪN ĐIỀN – ' + m.ten.toUpperCase(), { b: 1, co: 13, cao: 24 })];
    hang.push(dong('Điền dữ liệu ở trang tính "' + m.trang + '" (trang đầu), giữ nguyên dòng tiêu đề cột; không đổi tên, không xóa cột. Có thể thêm dòng.', { i: 1 }));
    m.hd.forEach((t, i) => hang.push(dong((i + 1) + '. ' + t)));
    hang.push(dong(''), dong('Ví dụ:', { b: 1 }));
    (m.truoc || []).forEach(r => hang.push({ cao: 20, o: r.map((v, i) => ({ v: i ? 'TH Dược lâm sàng' : v, b: i === 0 })) }));
    hang.push({ cao: 36, o: m.cot.map(c => ({ v: c[0], b: 1, can: 'c', vien: 1, nen: NEN_TD })) });
    m.vd.forEach(r => hang.push({ cao: 18, o: r.map(v => ({ v, vien: 1, i: 1 })) }));
    return { ten: 'Huong dan', huong: 'ngang', cot: m.cot.map(c => c[1]), hang };
  }
  const moTa = (ma) => { const m = DS[ma]; return { ten: m.tep, trang: [trangNhap(m), trangHuongDan(m)] }; };
  const tai = (ma) => window.PTN_IN.taiExcel(moTa(ma));
  // liên kết chèn vào lời dẫn của hộp tải file; gắn sự kiện bằng ganLink sau khi hộp mở
  const link = (ma) => ' <a href="#" data-mau-file="' + ma + '">⬇ Tải file mẫu</a>';
  function ganLink(root) {
    (root || document).querySelectorAll('[data-mau-file]').forEach(a => { a.onclick = async (e) => { e.preventDefault(); const t = a.textContent; a.textContent = 'Đang tạo…';
      try { await tai(a.dataset.mauFile); } catch (err) { alert(err.message); } a.textContent = t; }; });
  }
  window.PTN_MAU_FILE = { DS, moTa, tai, link, ganLink };
})();
