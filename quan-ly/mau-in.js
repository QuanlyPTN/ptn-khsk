/* Khuôn in theo file mẫu của PTN: kế hoạch vật tư (dự trù) và biên bản bàn giao. Dùng PTN_IN (xuat-file.js). */
(function () {
  'use strict';
  const IN = window.PTN_IN;
  const r3 = (n) => Math.round((+n || 0) * 1000) / 1000;
  const rong = (n) => ({ cao: 8, o: [{ v: '', cs: n }] });
  const hk2 = (hk) => { const m = /^HK(\S*)\s+(\d{4}-\d{4})/.exec(hk || '') || []; return { ky: (m[1] || '').replace(/^H$/, 'hè'), nam: m[2] || '' }; };
  const tg = (s) => String(s || '').replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2/$1');
  const LE_TRAI = 0.79; // lề trái 2 cm (inch) cho các bản dự trù
  const ngayChu = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? 'ngày ' + m[3] + ' tháng ' + m[2] + ' năm ' + m[1] : 'ngày …… tháng …… năm 20……'; };

  // ---------------- Kế hoạch vật tư (dự trù): sheet tổng hợp + sheet kế hoạch theo môn ----------------
  function duTru(r) {
    const caHK = r.dot === 'HK', h = hk2(r.hk);
    const ky = (caHK ? '' : 'ĐỢT ' + r.dot + ' - ') + 'HỌC KỲ ' + h.ky + ' NĂM HỌC ' + h.nam;
    const tenSheet = caHK ? 'KSK. ' + r.hk : 'KSK. Dot ' + r.dot + ' ' + r.hk;
    const dsDot = (a) => a.length > 1 ? a.slice(0, -1).join(', ') + ' và ' + a[a.length - 1] : a.join('');
    const ghiChu = caHK ? '' : [r.ngay_nop ? 'Nộp Phòng Kế hoạch – Đầu tư ngày ' + r.ngay_nop.split('-').reverse().join('/') : '',
      r.dot === '1' ? 'Đợt 1: tối thiểu ' + (r.ty_le || 70) + '% nhu cầu cả học kỳ' : 'Nhu cầu cả học kỳ trừ số đã nhận đợt ' + dsDot(Array.from({ length: +r.dot - 1 }, (_, i) => i + 1)),
      (r.tam_tinh || []).length ? 'đợt ' + dsDot(r.tam_tinh) + ' chưa có danh sách nhận hàng – tạm trừ số đã dự trù' : ''].filter(Boolean).join(' · ');
    const ngayLap = ngayChu(r.ngay_nop || new Date().toISOString().slice(0, 10)), sl = (x) => x.tru > 0 ? { v: r3(x.sl), f: '=' + r3(x.can) + '-' + r3(x.tru) } : r3(x.sl);

    // Sheet 1 – Tổng hợp (mẫu "Tổng hợp HC T10 2026", khổ dọc)
    const n1 = 7, t1 = [{ cao: 16, o: [{ v: 'TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP THÀNH PHỐ HỒ CHÍ MINH', cs: n1, b: 1 }] }, { cao: 16, o: [{ v: 'ĐƠN VỊ: KHOA KHOA HỌC SỨC KHỎE', cs: n1, b: 1 }] }, rong(n1),
      { cao: 36, o: [{ v: 'BẢNG TỔNG HỢP HÓA CHẤT - VẬT TƯ - DƯỢC LIỆU DỰ TRÙ ' + ky, cs: n1, can: 'c', b: 1, co: 14 }] },
      { cao: 16, o: [{ v: ghiChu, cs: n1, can: 'c', i: 1, co: 10 }] },
      { cao: 32, o: ['STT', 'MÃ VT', 'TÊN VẬT TƯ - HÓA CHẤT', 'CÔNG THỨC HÓA HỌC', 'NSX', 'ĐVỊ', 'TỔNG SLG'].map(v => ({ v, b: 1, can: 'c', vien: 1, nen: '#D9E2F3' })) }];
    let nhom = '', stt = 0;
    r.tong.forEach(x => {
      if (x.nhom_in !== nhom) { nhom = x.nhom_in; t1.push({ cao: 18, o: [{ v: '', vien: 1 }, { v: '', vien: 1 }, { v: ' ' + nhom, b: 1, vien: 1 }, { v: '', vien: 1 }, { v: '', vien: 1 }, { v: '', vien: 1 }, { v: '', vien: 1 }] }); }
      t1.push({ cao: 18, o: [{ v: ++stt, can: 'c', vien: 1 }, { v: x.ma_vt || 'Chưa MVT', can: 'c', vien: 1 }, { v: x.ten, vien: 1 }, { v: '', vien: 1 }, { v: x.nsx, can: 'c', vien: 1 }, { v: x.dvt, can: 'c', vien: 1 },
        Object.assign({ can: 'r', vien: 1, b: 1 }, typeof sl(x) === 'object' ? sl(x) : { v: sl(x) })] });
    });
    t1.push(rong(n1), { cao: 16, o: [{ v: '', cs: 4 }, { v: 'TP. HCM, ' + ngayLap, cs: 3, can: 'c', i: 1 }] });
    IN.chuKy(n1, [['TRƯỞNG KHOA', '', r.ky.truong_khoa], ['NGƯỜI LẬP BIỂU', '', r.ky.nguoi_lap]], 4).forEach(x => t1.push(x));
    const s1 = { ten: caHK ? 'Tong hop ' + r.hk : 'Tong hop dot ' + r.dot, huong: 'doc', cot: [6, 14.2, 46.4, 31.2, 9.2, 8, 15], lapLai: [6, 6], hang: t1, le: [0.6, 0.55, 0.6, LE_TRAI] };

    // Sheet 2 – Kế hoạch theo môn (mẫu "KSK. 10 2026", khổ ngang, tỷ lệ 75%)
    const n2 = 13, t2 = [rong(n2),
      { cao: 18, o: [{ v: 'TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP THÀNH PHỐ HỒ CHÍ MINH', cs: 6, b: 1 }, { v: 'KẾ HOẠCH VẬT TƯ ' + ky, cs: 6, can: 'c', b: 1, co: 14 }, { v: '' }] },
      { cao: 16, o: [{ v: 'ĐƠN VỊ: KHOA KHOA HỌC SỨC KHỎE', cs: 5, b: 1 }, { v: '', cs: 8 }] },
      { cao: 16, o: [{ v: '', cs: 7 }, { v: 'TP. HCM ' + ngayLap, cs: 6, can: 'c', i: 1 }] },
      { cao: 38, o: ['TÊN BÀI TẬP', 'MÃ\nBT', 'MÃ SỐ\nLỚP', 'MÃ HỌC PHẦN', 'SỈ SỐ', 'STT', 'QUI CÁCH VẬT TƯ', 'MÃ\nVT', 'NSX', 'ĐVỊ', 'SLG/\n1HS', 'SLG', 'GHI CHÚ'].map(v => ({ v, b: 1, can: 'c', vien: 1, nen: '#D9E2F3' })) }];
    let so = 0;
    r.khoi.forEach(b => {
      so++; t2.push({ cao: 6, o: [{ v: '', cs: n2 }] });
      const dong = b.dong.length ? b.dong : [{ ten: '(chưa có định mức)', dm: '', sl: '' }], nHang = Math.max(dong.length, b.lop.length + 1);
      for (let i = 0; i < nHang; i++) {
        const l = b.lop[i], x = dong[i], o = [];
        o.push({ v: i === 0 ? so + '. ' + b.ten_mon + (b.moi ? '\n(môn chưa dự trù ở đợt trước)' : '') : '', b: i === 0, vien: 1, doc: 't' }, { v: '', vien: 1 });
        if (l) o.push({ v: l.lop, can: 'c', vien: 1 }, { v: l.ma_lhp, can: 'c', vien: 1 }, { v: l.si_so, can: 'c', vien: 1 });
        else if (i === b.lop.length) o.push({ v: '', vien: 1 }, { v: '', vien: 1 }, { v: b.si_so, f: '=SUM(E' + (t2.length + 1 - b.lop.length) + ':E' + t2.length + ')', can: 'c', b: 1, vien: 1 });
        else o.push({ v: '', vien: 1 }, { v: '', vien: 1 }, { v: '', vien: 1 });
        if (x) {
          const s2 = typeof sl(x) === 'object' ? sl(x) : { v: sl(x) };
          o.push({ v: i + 1, can: 'c', vien: 1 }, { v: x.ten, vien: 1 }, { v: x.ma_vt || (x.dm !== '' ? 'Chưa MVT' : ''), can: 'c', vien: 1 }, { v: x.nsx || '', can: 'c', vien: 1 }, { v: x.dvt || '', can: 'c', vien: 1 },
            { v: x.dm === '' ? '' : r3(x.dm), can: 'r', vien: 1 }, Object.assign({ can: 'r', vien: 1 }, x.sl === '' ? { v: '' } : s2), { v: x.gc || (x.tru > 0 ? 'Đã trừ ' + r3(x.tru) + ' đã nhận' : ''), vien: 1, co: 9, i: 1 });
        } else for (let j = 0; j < 8; j++) o.push({ v: '', vien: 1 });
        t2.push({ cao: 19, o });
      }
    });
    t2.push(rong(n2), { cao: 18, o: [{ v: 'HIỆU TRƯỞNG', cs: 3, can: 'c', b: 1 }, { v: '', cs: 3 }, { v: 'TRƯỞNG KHOA', can: 'c', b: 1 }, { v: '', cs: 2 }, { v: 'NGƯỜI LẬP BIỂU', cs: 4, can: 'c', b: 1 }] });
    for (let i = 0; i < 5; i++) t2.push({ cao: 15, o: [{ v: '', cs: n2 }] });
    t2.push({ cao: 16, o: [{ v: r.ky.hieu_truong || '', cs: 3, can: 'c', b: 1 }, { v: '', cs: 3 }, { v: r.ky.truong_khoa || '', can: 'c', b: 1 }, { v: '', cs: 2 }, { v: r.ky.nguoi_lap || '', cs: 4, can: 'c', b: 1 }] });
    const s2 = { ten: tenSheet, huong: 'ngang', cot: [26.6, 7.6, 16.4, 21.2, 7.6, 7.8, 37.4, 16.8, 7.6, 11.8, 14.2, 10.2, 18], lapLai: [5, 5], hang: t2, le: [0.4, 0.17, 0.4, LE_TRAI] };
    return { ten: (caHK ? 'KH vat tu ' + r.hk : 'KH vat tu dot ' + r.dot + ' ' + r.hk), trang: [s1, s2], s1, s2 };
  }
  // File dự trù một đợt – 3 sheet: (1) tổng dự trù cả học kỳ theo lớp thực hành, (2) dự trù đợt theo môn – lớp, (3) tổng hợp hóa chất – vật tư – dược liệu của đợt
  function duTruThang(rHK, rDot) {
    const hk = duTru(rHK), th = duTru(rDot), t = 'đợt ' + rDot.dot;
    return { ten: 'Du tru dot ' + rDot.dot + ' (' + rHK.hk + ')',
      trang: [Object.assign({}, hk.s2, { ten: 'Tổng dự trù ' + rHK.hk }), Object.assign({}, th.s2, { ten: 'Dự trù ' + t }), Object.assign({}, th.s1, { ten: 'Tổng hợp ' + t })] };
  }

  // ---------------- Biên bản bàn giao (bám theo 03 BIEN BAN BAN GIAO / BBBG hoa chat - form chuan, BBBG dung cu - form chuan) ----------------
  // r = bb_ct; qr = {dataUrl} (mã QR số biên bản – để tự nhận bản ký); hs = hồ sơ đề tài (nhánh KLTN – NCKH)
  // Vị trí mã QR: biên bản có quốc hiệu → bên phải, ngang dòng tiêu đề "BIÊN BẢN BÀN GIAO…" (thấp hơn quốc hiệu); biên bản không có quốc hiệu → trong khung Người soạn / Tủ soạn.
  const QR_PX = 68; // ≈ 18 mm khi in
  const pxCot = (w) => w * 7 + 5, ptTren = (hang, n) => hang.slice(0, n).reduce((a, h) => a + (h.cao || 15), 0);
  // chiều cao hàng đủ cho chữ xuống dòng: w = độ rộng ô (ký tự Excel), co = cỡ chữ
  const caoChu = (s, w, co, toiThieu) => Math.max(toiThieu, Math.ceil(String(s || '').length / Math.max(1, w * 1.25 * 11 / co)) * co * 1.32 + 3);
  function bienBanHC(r, qr) {
    const b = r.bb, h = hk2(b.hk), n = 10, cot = [6, 34, 9, 8, 8, 9, 11, 11, 11, 16];
    const nhan = (k) => ({ v: k, cs: 2, b: 1 }), gt = (v, cs) => ({ v, cs, vien: 'b' });
    const ttin = (a, va, c, vc) => ({ cao: Math.max(caoChu(va, 25, 11, 19.5), caoChu(vc, 38, 11, 19.5)), o: [nhan(a), gt(va, 3), nhan(c), gt(vc, 3)] });
    const hang = [{ cao: 15, o: [{ v: 'ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH', cs: 5, can: 'c', b: 1 }, { v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', cs: 5, can: 'c', b: 1 }] },
      { cao: 15, o: [{ v: 'KHOA KHOA HỌC SỨC KHỎE', cs: 5, can: 'c', b: 1 }, { v: 'Độc lập - Tự do - Hạnh phúc', cs: 5, can: 'c', b: 1 }] },
      { cao: 15, o: [{ v: 'Số: ' + b.id + '/BBBG-KHSK', cs: 5, can: 'c', i: 1, co: 10 }, { v: 'Tp. HCM, ngày ...... tháng ...... năm 20......', cs: 5, can: 'c', i: 1, co: 10 }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 24, o: [{ v: 'BIÊN BẢN BÀN GIAO VẬT TƯ - HÓA CHẤT THỰC HÀNH', cs: n, can: 'c', b: 1, co: 14 }] },
      { cao: 16, o: [{ v: 'Học kỳ ' + (h.ky || '......') + ' - Năm học ' + (h.nam || '......'), cs: n, can: 'c', i: 1, co: 12 }] },
      { cao: 15, o: [{ v: 'I. THÔNG TIN HỌC PHẦN', cs: n, b: 1, co: 12 }] },
      ttin('Tên môn thực hành:', b.ten_mon, 'Thời gian:', tg(b.thoi_gian)),
      ttin('GV hướng dẫn:', b.gv, 'Phòng thực hành:', b.phong),
      ttin('Tổng sinh viên TH:', (+b.si_so || '') + (b.so_nhom ? ' SV / ' + b.so_nhom + ' ca' : ''), 'Lớp:', b.lop),
      { cao: 16, o: [{ v: 'II. DANH MỤC VẬT TƯ - HÓA CHẤT BÀN GIAO', cs: n, b: 1, co: 12 }] },
      { cao: 46, o: ['STT', 'TÊN NGUYÊN LIỆU', 'CÔNG THỨC', 'MÃ\nVT', 'ĐVT', 'ĐM 1SV', 'SL\nDỰ TRÙ', 'THỰC\nNHẬN', 'SL\nHOÀN TRẢ', 'GHI CHÚ'].map((v, j) => ({ v, rs: 2, b: 1, can: 'c', vien: 1, co: j < 6 ? 12 : 11 })) },
      { cao: 18, o: [] }];
    const dau = hang.length - 1;
    let nhom = '';
    r.dong.forEach((d, i) => {
      if (d.nhom && d.nhom !== nhom && r.dong.some(x => x.nhom !== d.nhom)) { nhom = d.nhom; hang.push({ cao: 18, o: [{ v: '', vien: 1 }, { v: d.nhom, cs: 9, b: 1, i: 1, vien: 1 }] }); }
      const sl = (+d.ban_giao || 0) + (+d.bo_sung || 0), ten = d.ten + (d.canh_bao ? ' (*)' : ''), gc = [d.ghi_chu, d.bo_sung > 0 ? 'Bổ sung ' + r3(d.bo_sung) : ''].filter(Boolean).join('; ');
      const so = (v, b2) => ({ v, can: 'c', vien: 1, b: b2 });
      hang.push({ cao: Math.max(caoChu(ten, 34, 11, 18), caoChu(gc, 16, 10, 18)), o: [so(i + 1), { v: ten, vien: 1 }, so(''), { v: d.ma_vt || '', can: 'c', vien: 1, co: 10 }, so(d.dvt),
        so(d.dm === '' ? '' : r3(d.dm)), so(d.ke_hoach === '' ? '' : r3(d.ke_hoach)), so(sl ? r3(sl) : '', 1), so(+d.tra ? r3(d.tra) : ''), { v: gc, vien: 1, co: 10 }] });
    });
    hang.push({ cao: 15, o: [{ v: 'Tổng số khoản:', cs: 2, b: 1 }, { v: r.dong.length, can: 'c', b: 1 }, { v: r.dong.some(d => d.canh_bao) ? '(*) Ngoài định mức – cấp bổ sung theo đề nghị (QR3) hoặc thêm khi bàn giao.' : '', cs: 7, i: 1, co: 10 }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 33.75, o: [{ v: 'Hai bên đã cùng kiểm tra số lượng, chất lượng vật tư - hóa chất nêu trên và thống nhất bàn giao. Hóa chất còn dư sau thực hành được hoàn trả PTN và ghi vào cột SL HOÀN TRẢ. Biên bản lập thành 02 bản, mỗi bên giữ 01 bản.', cs: n, i: 1 }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 25.25, o: [{ v: 'BÊN NHẬN', cs: 3, can: 'c', b: 1 }, { v: 'GIẢNG VIÊN HƯỚNG DẪN', cs: 3, can: 'c', b: 1 }, { v: 'BÊN GIAO', cs: 4, can: 'c', b: 1 }] },
      { cao: 15, o: [{ v: '(Đại diện lớp - ký, ghi rõ họ tên, MSSV)', cs: 3, can: 'c', i: 1, co: 10 }, { v: '(Ký, ghi rõ họ tên)', cs: 3, can: 'c', i: 1, co: 10 }, { v: '(Cán bộ PTN - ký, ghi rõ họ tên)', cs: 4, can: 'c', i: 1, co: 10 }] });
    for (let i = 0; i < 4; i++) hang.push({ cao: 15, o: [{ v: '', cs: n }] });
    hang.push({ cao: 15, o: [{ v: '', cs: n }] }); // chỗ ký (không in dòng "Họ tên: ……")
    // QR ở cột J, từ dòng tiêu đề (dòng 5) xuống – tiêu đề căn giữa nên không chạm chữ
    const tren = ptTren(hang, 4) + 1;
    return { ten: b.id, huong: 'doc', cot, lapLai: [dau, dau + 1], hang, le: [0.6, 0.5, 0.6, 0.5],
      anh: qr ? [{ dataUrl: qr.dataUrl, cot: 9 + (pxCot(cot[9]) - QR_PX - 2) / pxCot(cot[9]), hang: 4 + 1 / 32, rong: QR_PX, cao: QR_PX, vi_tri: 'top:' + tren + 'pt;right:2px' }] : [] };
  }
  function bienBanDC(r, qr, hs) {
    const b = r.bb, h = hk2(b.hk), n = 8, kltn = b.nhanh === 'KLTN – NCKH';
    const cot = [5.3, 29.3, 8.7, 8.3, 12.5, 8.7, 9, 16];
    const no = (d) => r3((+d.ban_giao || 0) + (+d.bo_sung || 0) - (+d.tra || 0)), tongNo = r.dong.reduce((a, d) => a + Math.max(0, no(d)), 0);
    const trai = (v, k) => ({ cao: Math.max(15, caoChu(v, 63.8, 12, 15), caoChu(k, 33.7, 12, 15)), o: [{ v, cs: 5, b: 1, co: 12 }, { v: k, cs: 3, b: 1, co: 12, vien: 'tb' }] });
    // khung Người soạn / Tủ soạn (E–H) – mã QR nằm trong khung, ô H1:H3
    const hang = [{ cao: 18, o: [{ v: 'ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH', cs: 4, co: 11 }, { v: 'Người soạn:', cs: 3, co: 12, gach: 1, vien: 'tl' }, { v: '', rs: 3, vien: 'trb' }] },
      { cao: 18, o: [{ v: 'KHOA KHOA HỌC SỨC KHỎE', cs: 4, b: 1, co: 11 }, { v: 'Tủ soạn:', co: 12, gach: 1, vien: 'l' }, { v: 'Tủ bàn giao:', cs: 2, co: 12, gach: 1 }] },
      { cao: 18, o: [{ v: 'Số: ' + b.id, cs: 4, i: 1, co: 10 }, { v: 'Thời gian trả:', co: 12, gach: 1, vien: 'lb' }, { v: 'Còn nợ: ' + (r.dong.some(d => +d.tra) ? tongNo : ''), cs: 2, co: 12, gach: 1, vien: 'b' }] },
      { cao: 22, o: [{ v: kltn ? 'BIÊN BẢN BÀN GIAO DỤNG CỤ ĐỒ ÁN – KLTN – NCKH' : 'BIÊN BẢN BÀN GIAO DỤNG CỤ HỆ ĐẠI HỌC', cs: n, can: 'c', b: 1, co: 16 }] },
      { cao: 20, o: [{ v: 'HỌC KỲ ' + (h.ky || '......').toUpperCase() + ' NĂM HỌC ' + (h.nam || '......'), cs: n, can: 'c', b: 1, co: 14 }] }];
    if (kltn) {
      const tn = ((hs && hs.nhom) || [])[0] || {};
      hang.push(trai('ĐỀ TÀI: ' + b.ten_mon, 'Mã hồ sơ: ' + b.lop), trai('TRƯỞNG NHÓM: ' + [tn.ho_ten, tn.ma_so, tn.sdt].filter(Boolean).join(' – '), 'Phòng: ' + b.phong),
        trai('GVHD: ' + b.gv, 'Thời gian: ' + tg(b.thoi_gian)));
    } else hang.push(trai('MÔN: ' + b.ten_mon, 'Thời gian: ' + tg(b.thoi_gian)), trai('TỔNG SỐ SV THỰC HÀNH: ' + (b.si_so || ''), 'Phòng: ' + b.phong), trai('GVHD: ' + b.gv, 'Lớp: ' + b.lop));
    hang.push({ cao: 112, o: [{ v: 'Lưu ý:\n- Khi bàn giao sinh viên kiểm tra kỹ dụng cụ có bị nứt, mẻ, gãy, vỡ,…. hay có bất cứ vấn đề gì thì báo cho phòng thí nghiệm để xác nhận tình trạng.\n- Sau khi bàn giao phòng thí nghiệm sẽ không chịu trách nhiệm về các vấn đề xảy ra trong quá trình sử dụng. Kết thúc đợt học, sinh viên vệ sinh sạch sẽ và sấy khô trước khi trả lại cho phòng thí nghiệm.\n- Phòng thí nghiệm sẽ không nhận dụng cụ trả lại khác với tình trạng lúc bàn giao cho sinh viên.\n- Trước khi nhận và trả phải báo trước phòng thí nghiệm 1 ngày để PTN bố trí người và thời gian nhận.', cs: n, co: 12, doc: 't' }] },
      { cao: 10, o: [{ v: '', cs: n }] },
      { cao: 16, o: ['STT', 'TÊN DỤNG CỤ', 'NSX', 'ĐVT'].map(v => ({ v, rs: 2, b: 1, can: 'c', vien: 1 })).concat([{ v: 'SỐ LƯỢNG', cs: 3, b: 1, can: 'c', vien: 1 }, { v: 'GHI CHÚ', rs: 2, b: 1, can: 'c', vien: 1 }]) },
      { cao: 16, o: ['MƯỢN', 'TRẢ', 'NỢ'].map(v => ({ v, b: 1, can: 'c', vien: 1 })) });
    const dau = hang.length - 1;
    r.dong.forEach((d, i) => {
      const muon = (+d.ban_giao || 0) + (+d.bo_sung || 0), ten = d.ten + (d.canh_bao ? ' (*)' : ''), gc = [d.ghi_chu, +d.bo_sung ? 'Mượn thêm ' + r3(d.bo_sung) : ''].filter(Boolean).join('; ');
      const so = (v, b2) => ({ v, can: 'c', vien: 1, b: b2, co: 12 });
      hang.push({ cao: Math.max(caoChu(ten, 29.3, 12, 18), caoChu(d.nsx, 8.7, 11, 18), caoChu(gc, 16, 10, 18)), o: [so(i + 1), { v: ten, vien: 1, co: 12 }, { v: d.nsx || '', can: 'c', vien: 1, co: 11 }, so(d.dvt || ''),
        so(muon ? r3(muon) : (d.ke_hoach ? r3(d.ke_hoach) : ''), 1), so(+d.tra ? r3(d.tra) : ''), so(muon && no(d) > 0 ? no(d) : ''), { v: gc, vien: 1, co: 10 }] });
    });
    hang.push({ cao: 10, o: [{ v: '', cs: n }] }, { cao: 17, o: [{ v: '2. Thiết bị cần mượn sử dụng', cs: n, b: 1, co: 13, vien: 1 }] },
      { cao: 16, o: [{ v: 'STT', rs: 2, b: 1, can: 'c', vien: 1 }, { v: 'TÊN THIẾT BỊ', rs: 2, b: 1, can: 'c', vien: 1 }, { v: 'NSX', rs: 2, b: 1, can: 'c', vien: 1 }, { v: '', rs: 2, vien: 1 }, { v: 'SỐ LƯỢNG', cs: 3, b: 1, can: 'c', vien: 1 }, { v: 'GHI CHÚ', rs: 2, b: 1, can: 'c', vien: 1 }] },
      { cao: 16, o: ['MƯỢN', 'NHẬN', 'TRẢ'].map(v => ({ v, b: 1, can: 'c', vien: 1 })) });
    const tb = ((hs && hs.ten_tb) || []);
    for (let i = 0; i < Math.max(5, tb.length); i++) hang.push({ cao: Math.max(18, caoChu(tb[i], 29.3, 12, 18)), o: [{ v: i + 1, can: 'c', vien: 1, co: 12 }, { v: tb[i] || '', vien: 1, co: 12 }].concat([0, 1, 2, 3, 4, 5].map(() => ({ v: '', vien: 1 }))) });
    hang.push({ cao: 17, o: [{ v: '', cs: 4 }, { v: 'Ngày …….. Tháng …… năm 20……', cs: 4, can: 'c', i: 1, co: 12 }] },
      { cao: 25.25, o: [{ v: 'BÊN NHẬN', cs: 2, can: 'c', b: 1 }, { v: 'GIẢNG VIÊN HƯỚNG DẪN', cs: 3, can: 'c', b: 1 }, { v: 'BÊN GIAO', cs: 3, can: 'c', b: 1 }] },
      { cao: 30, o: [{ v: kltn ? '(Trưởng nhóm - ký, ghi rõ họ tên, MSSV, SĐT)' : '(Đại diện lớp - ký, ghi rõ họ tên, MSSV, SĐT)', cs: 2, can: 'c', i: 1, co: 10 }, { v: '(Ký, ghi rõ họ tên)', cs: 3, can: 'c', i: 1, co: 10 }, { v: '(Cán bộ PTN - ký, ghi rõ họ tên)', cs: 3, can: 'c', i: 1, co: 10 }] });
    for (let i = 0; i < 3; i++) hang.push({ cao: 15, o: [{ v: '', cs: n }] }); // chỗ ký bàn giao (cùng dòng dưới: 4 dòng ~ 2 cm)
    hang.push({ cao: 15, o: [{ v: '', cs: n }] }, // chỗ ký (không in dòng "Họ tên: ……")
      { cao: 15, o: [{ v: '', cs: n }] }, { cao: 15, o: [{ v: 'IV. XÁC NHẬN HOÀN TRẢ', cs: n, b: 1, co: 12 }] },
      { cao: 16, o: [{ v: 'Ngày trả: ........./........./20.......     Tổng SL nợ: ' + (r.dong.some(d => +d.tra) ? tongNo : '........') + '     Hướng xử lý: ..................................................', cs: n }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 15, o: [{ v: kltn ? 'ĐẠI DIỆN NHÓM TRẢ' : 'ĐẠI DIỆN LỚP TRẢ', cs: 2, can: 'c', b: 1 }, { v: '', cs: 3 }, { v: 'ĐẠI DIỆN PTN NHẬN LẠI', cs: 3, can: 'c', b: 1 }] },
      { cao: 15, o: [{ v: '(Ký, ghi rõ họ tên)', cs: 2, can: 'c', i: 1, co: 10 }, { v: '', cs: 3 }, { v: '(Ký, ghi rõ họ tên)', cs: 3, can: 'c', i: 1, co: 10 }] });
    for (let i = 0; i < 3; i++) hang.push({ cao: 15, o: [{ v: '', cs: n }] }); // chỗ ký hoàn trả (3 dòng: vừa một trang A4, không dư trang trắng)
    const q = 64, caoKhung = 54 * 4 / 3; // px
    return { ten: b.id, huong: 'doc', cot, lapLai: [dau, dau + 1], hang, le: [0.33, 0.17, 0.3, 0.17],
      anh: qr ? [{ dataUrl: qr.dataUrl, cot: 7 + (pxCot(cot[7]) - q - 6) / pxCot(cot[7]), hang: (caoKhung - q) / 2 / 24, rong: q, cao: q, vi_tri: 'top:' + (caoKhung - q) / 2 * 0.75 + 'pt;right:6px' }] : [] };
  }
  // ---------------- Phiếu dự trù hóa chất – vật tư của một môn (bám bố cục biên bản bàn giao hóa chất để đối chiếu) ----------------
  // o = { hk, mon: {ma, ten, ma_hp, bo_mon}, si_so (tổng SV dự kiến), dm: [{nhom, nhom_vt, stt, ten, ma_vt, nsx, dvt, dm, ghi_chu}], ky, them (dòng trống cuối mỗi nhóm) }
  // Định mức tính cho 01 sinh viên trong cả học phần; SL dự trù = ĐM 1 SV × tổng SV (công thức Excel, tự cập nhật khi sửa tổng SV / định mức).
  // Thứ tự nhóm: 1. Hóa chất · 2. Dược liệu · 3. Vật tư tiêu hao.
  const NHOM_DT = ['1. HÓA CHẤT', '2. DƯỢC LIỆU', '3. VẬT TƯ TIÊU HAO'];
  const VT_TIEU_HAO = /^(bông|gạc|băng|giấy|găng|bao tay|khẩu trang|lame|lamelle|lam kính|đầu côn|đầu típ|tip|ống nghiệm|ống ly tâm|ống đong|túi|bao|màng|que|kim|bơm tiêm|xi lanh|chổi|khăn|nhãn|đĩa petri|hộp|lọ|chai|nút|parafilm|cốc|phễu|pipet|tăm bông|nhiệt kế|viết|bút)/i;
  const LUON_HOA_CHAT = /vaselin|paraf+in/i;
  function nhomDuTru(d) {
    if (/^[123]$/.test(String(d.nhom_dt || ''))) return +d.nhom_dt - 1; // nhóm đã chỉ định (phiếu, sửa trên web)
    const ten = String(d.ten || '').trim(), n = String(d.nhom || ''), v = String(d.nhom_vt || '');
    if (v === 'DL' || /dược liệu/i.test(n)) return 1;
    if (LUON_HOA_CHAT.test(ten)) return 0; // anh Phú chốt 24/10/2026: Vaseline, dầu parafin vào nhóm Hóa chất (danh mục Trường xếp YT)
    if (/vật tư|tiêu hao|dụng cụ/i.test(n) || VT_TIEU_HAO.test(ten) || (v && v !== 'HO')) return 2;
    return 0;
  }
  function duTruMon(o) {
    const h = hk2(o.hk), n = 10, cot = [6, 33, 8, 10.5, 7, 7.5, 8, 8, 11, 15], them = o.them == null ? 2 : o.them;
    const nhan = (k, cs) => ({ v: k, cs: cs || 2, b: 1 }), gt = (v, cs) => ({ v, cs, vien: 'b' });
    const hang = [{ cao: 15, o: [{ v: 'ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH', cs: 5, can: 'c', b: 1 }, { v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', cs: 5, can: 'c', b: 1 }] },
      { cao: 15, o: [{ v: 'KHOA KHOA HỌC SỨC KHỎE', cs: 5, can: 'c', b: 1 }, { v: 'Độc lập - Tự do - Hạnh phúc', cs: 5, can: 'c', b: 1 }] },
      { cao: 15, o: [{ v: 'Bộ môn: ' + (o.mon.bo_mon || '................................'), cs: 5, can: 'c', i: 1, co: 10 }, { v: 'Tp. HCM, ngày ...... tháng ...... năm 20......', cs: 5, can: 'c', i: 1, co: 10 }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 24, o: [{ v: 'PHIẾU DỰ TRÙ HÓA CHẤT - VẬT TƯ THỰC HÀNH', cs: n, can: 'c', b: 1, co: 14 }] },
      { cao: 16, o: [{ v: 'Học kỳ ' + (h.ky || '......') + ' - Năm học ' + (h.nam || '......'), cs: n, can: 'c', i: 1, co: 12 }] },
      { cao: 15, o: [{ v: 'I. THÔNG TIN HỌC PHẦN', cs: n, b: 1, co: 12 }] },
      { cao: 19.5, o: [nhan('Tên môn thực hành:'), Object.assign(gt(o.mon.ten, 3), { b: 1 }), nhan('Mã môn / mã HP:'), gt([o.mon.ma, o.mon.ma_hp].filter(Boolean).join(' · '), 3)] },
      { cao: 19.5, o: [nhan('GV phụ trách môn:'), gt('', 3), nhan('Điện thoại:'), gt('', 3)] }];
    const hTong = hang.length + 1; // ô tổng số sinh viên (cột C) – dùng trong công thức SL dự trù
    hang.push({ cao: 19.5, o: [nhan('Tổng số sinh viên:'), { v: +o.si_so || 0, b: 1, can: 'c', vien: 'b', nen: '#FFF2CC' }, { v: '', cs: 2 }, { v: '(dự kiến cả học kỳ; sửa ô này nếu sĩ số thay đổi – SL dự trù tự tính lại)', cs: 5, i: 1, co: 9.5 }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 15, o: [{ v: 'II. DANH MỤC HÓA CHẤT - VẬT TƯ DỰ TRÙ (định mức tính cho 01 sinh viên)', cs: n, b: 1, co: 12 }] },
      { cao: 40, o: ['STT', 'TÊN NGUYÊN LIỆU – QUY CÁCH', 'CÔNG\nTHỨC', 'MÃ\nVT', 'NSX', 'ĐVT', 'ĐM\n1 SV', 'TỔNG\nSV', 'SL\nDỰ TRÙ', 'GHI CHÚ'].map((v, j) => ({ v, b: 1, can: 'c', vien: 1, co: 11, nen: j === 6 || j === 8 ? '#FFF2CC' : undefined })) });
    const dauDM = hang.length;
    let stt = 0, soKhoan = 0;
    const dongDM = (d) => { stt++; const r = hang.length + 1, dm = d.dm === '' || d.dm == null ? '' : r3(d.dm);
      hang.push({ cao: Math.max(18, Math.ceil(String(d.ten || '').length / 40) * 15 + 3), o: [{ v: stt, can: 'c', vien: 1 }, { v: d.ten || '', vien: 1 }, { v: d.cong_thuc || '', can: 'c', vien: 1, co: 10 },
        { v: d.ma_vt || (d.ten ? 'Chưa MVT' : ''), can: 'c', vien: 1, co: 10 }, { v: d.nsx || '', can: 'c', vien: 1, co: 10 }, { v: d.dvt || '', can: 'c', vien: 1 },
        { v: dm, can: 'c', vien: 1, b: 1 }, { v: +o.si_so || 0, f: '$C$' + hTong, can: 'c', vien: 1 },
        { v: dm === '' ? '' : r3(dm * (+o.si_so || 0)), f: 'IF(G' + r + '="","",ROUND(G' + r + '*H' + r + ',3))', can: 'c', vien: 1, b: 1 }, { v: d.ghi_chu || '', vien: 1, co: 10 }] }); };
    const theoNhom = [[], [], []]; (o.dm || []).forEach(d => theoNhom[nhomDuTru(d)].push(d));
    theoNhom.forEach((ds, k) => {
      hang.push({ cao: 18, o: [{ v: '', vien: 1 }, { v: NHOM_DT[k], cs: 9, b: 1, vien: 1, nen: '#F2F2F2' }] });
      ds.forEach(d => { dongDM(d); soKhoan++; });
      for (let i = 0; i < them; i++) dongDM({}); // dòng trống để môn bổ sung
    });
    hang.push({ cao: 15, o: [{ v: 'Tổng số khoản:', cs: 2, b: 1 }, { v: soKhoan, can: 'c', b: 1 }, { v: '(' + theoNhom.map((x, k) => NHOM_DT[k].slice(3).toLowerCase() + ': ' + x.length).join(' · ') + ')', cs: 7, i: 1, co: 10 }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 62, o: [{ v: 'Ghi chú:\n- ĐM 1 SV: lượng dùng cho 01 sinh viên trong cả học phần (đủ các bài thực hành). SL dự trù = ĐM 1 SV × tổng số sinh viên (tự tính).\n' +
        '- Tên, mã VT, ĐVT ghi theo danh mục vật tư của Trường (chưa có mã ghi "Chưa MVT") để đối chiếu với biên bản bàn giao hóa chất.\n- Hóa chất, vật tư cần thêm ghi vào dòng trống cuối mỗi nhóm; hóa chất kiểm soát đặc biệt ghi rõ ở cột Ghi chú.', cs: n, i: 1, co: 10, doc: 't' }] },
      { cao: 15, o: [{ v: '', cs: n }] },
      { cao: 25.25, o: [{ v: 'GV PHỤ TRÁCH MÔN', cs: 3, can: 'c', b: 1 }, { v: 'TRƯỞNG BỘ MÔN', cs: 3, can: 'c', b: 1 }, { v: 'TRƯỞNG KHOA', cs: 4, can: 'c', b: 1 }] },
      { cao: 15, o: [{ v: '(Ký, ghi rõ họ tên)', cs: 3, can: 'c', i: 1, co: 10 }, { v: '(Ký, ghi rõ họ tên)', cs: 3, can: 'c', i: 1, co: 10 }, { v: '(Ký, ghi rõ họ tên)', cs: 4, can: 'c', i: 1, co: 10 }] });
    for (let i = 0; i < 4; i++) hang.push({ cao: 15, o: [{ v: '', cs: n }] });
    hang.push({ cao: 16, o: [{ v: '', cs: 3 }, { v: '', cs: 3 }, { v: (o.ky || {}).truong_khoa || '', cs: 4, can: 'c', b: 1 }] });
    return { ten: 'Phieu du tru ' + o.mon.ten + ' ' + o.hk, trang: [{ ten: ('Dự trù ' + o.mon.ten).slice(0, 31), huong: 'doc', cot, lapLai: [dauDM, dauDM], hang, le: [0.6, 0.5, 0.6, LE_TRAI] }] };
  }
  // Nhiều môn trong một file: mỗi môn một trang tính (tên trang tính không trùng)
  function duTruMonNhieu(ds, ky, hk) {
    const dung = {}, trang = ds.map(x => { const t = duTruMon(Object.assign({ ky }, x)).trang[0]; let ten = t.ten.slice(0, 28), k = ten, i = 1; while (dung[k]) k = ten.slice(0, 25) + ' ' + (++i); dung[k] = 1; t.ten = k; return t; });
    return { ten: ds.length === 1 ? 'Phieu du tru ' + ds[0].mon.ten + ' ' + hk : 'Phieu du tru cac mon ' + hk, trang };
  }
  function bienBan(r, qr, hs) { return { ten: 'BBBG ' + (r.bb.loai === 'DC' ? 'dung cu ' : 'hoa chat ') + r.bb.id, trang: [r.bb.loai === 'DC' ? bienBanDC(r, qr, hs) : bienBanHC(r, qr)] }; }
  window.PTN_MAU = { duTru, duTruThang, duTruMon, duTruMonNhieu, nhomDuTru, NHOM_DT, bienBan, bienBanHC, bienBanDC };
})();
