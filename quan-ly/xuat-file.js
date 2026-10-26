/* Xuất file có định dạng theo mẫu: một bản mô tả trang → file Excel (ExcelJS, khổ A4, sẵn sàng in) và bản xem trước in trên web.
   Mô tả: { ten: 'tên tệp', trang: [{ ten, huong: 'doc'|'ngang', tyLe, le: [trên, phải, dưới, trái] (inch), cot: [độ rộng ký tự],
     lapLai: [hàng đầu, hàng cuối] (lặp tiêu đề khi sang trang), dongBang: số hàng cố định khi cuộn, loc: true (bộ lọc ở hàng 1), anh: [{ dataUrl, cot, hang, rong, cao }],
     hang: [{ cao (pt), o: [{ v, f (công thức Excel), cs, rs, b, i, co (cỡ chữ), can: l|c|r, doc: t|m|b, vien (1 = đủ 4 cạnh | 'tlbr' = từng cạnh), nen, dd (định dạng số), gach }] }] }] } */
(function () {
  'use strict';
  const EXCELJS = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  const FONT = 'Times New Roman';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function nap() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise((ok, loi) => { const s = document.createElement('script'); s.src = EXCELJS; s.onload = () => ok(window.ExcelJS); s.onerror = () => loi(new Error('Không tải được thư viện Excel (cần mạng)')); document.head.appendChild(s); });
  }
  // đặt các ô vào lưới (tính cột thật khi có ô gộp hàng phía trên)
  function luoi(t) {
    const chiem = {}, out = [];
    t.hang.forEach((h, r) => {
      let c = 0;
      (h.o || []).forEach(o => {
        while (chiem[r + ':' + c]) c++;
        const cs = o.cs || 1, rs = o.rs || 1;
        for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) chiem[(r + i) + ':' + (c + j)] = 1;
        out.push({ r, c, cs, rs, o });
        c += cs;
      });
    });
    return out;
  }
  const LE_MAC_DINH = [0.5, 0.45, 0.5, 0.45]; // lề trái = lề phải để trang in cân hai bên
  // Trang tính chỉ dư một chút so với 1 trang A4 (≤ 10% chiều cao, sau khi co vừa ngang) → co thêm cho vừa đúng 1 trang,
  // tránh trang 2 trắng chỉ có dòng tiêu đề lặp lại. tyLeNgang: tỷ lệ co vừa ngang. Trả hệ số co thêm theo chiều cao (1 = không co).
  function coMotTrang(t, tyLeNgang) {
    const le = t.le || LE_MAC_DINH, caoTrang = ((t.huong === 'ngang' ? 210 : 297) / 25.4 - le[0] - le[2]) * 72 - 4; // pt, chừa dòng "Trang x / y"
    const cao = t.hang.reduce((a, h) => a + (h.cao || 15), 0) * tyLeNgang;
    return cao > caoTrang && cao <= caoTrang * 1.1 ? caoTrang / cao * 0.97 : 1;
  }
  const canh = (v) => !v ? '' : v === true || v === 1 ? 'tlbr' : String(v); // các cạnh có viền
  const soHien = (v, dd) => {
    if (typeof v !== 'number') return v == null ? '' : String(v);
    if (dd === '0') return Math.round(v).toLocaleString('vi-VN');
    return (Math.round(v * 1000) / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  };

  // ---------- Excel ----------
  async function taiExcel(tl) {
    const X = await nap(), wb = new X.Workbook();
    wb.creator = 'Hệ thống quản lý PTN – Khoa KHSK'; wb.created = new Date();
    for (const t of tl.trang) {
      const ws = wb.addWorksheet(String(t.ten).slice(0, 31).replace(/[\\/?*[\]:]/g, '-'), {
        pageSetup: { paperSize: 9, orientation: t.huong === 'ngang' ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: coMotTrang(t, tyLeNgang_(t)) < 1 ? 1 : 0, horizontalCentered: true,
          margins: (function (m) { return { top: m[0], right: m[1], bottom: m[2], left: m[3], header: 0.2, footer: 0.25 }; })(t.le || LE_MAC_DINH) },
        headerFooter: { oddFooter: '&C&"Times New Roman"&9Trang &P / &N' }, views: [t.dongBang ? { state: 'frozen', ySplit: t.dongBang, showGridLines: true } : { showGridLines: false }] });
      if (t.lapLai) ws.pageSetup.printTitlesRow = t.lapLai[0] + ':' + t.lapLai[1];
      // vùng in đủ mọi cột (kể cả cột chỉ có ảnh mã QR)
      const chuCot = (n) => { let x = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) x = String.fromCharCode(65 + (n - 1) % 26) + x; return x; };
      ws.pageSetup.printArea = 'A1:' + chuCot(t.cot.length) + t.hang.length;
      ws.columns = t.cot.map(w => ({ width: w }));
      t.hang.forEach((h, r) => { if (h.cao) ws.getRow(r + 1).height = h.cao; });
      luoi(t).forEach(({ r, c, cs, rs, o }) => {
        const cell = ws.getCell(r + 1, c + 1);
        cell.value = o.f ? { formula: o.f.replace(/^=/, ''), result: typeof o.v === 'number' ? o.v : undefined } : (o.v === undefined ? null : o.v);
        const font = { name: FONT, size: o.co || 11, bold: !!o.b, italic: !!o.i, underline: !!o.gach };
        const al = { horizontal: o.can === 'c' ? 'center' : o.can === 'r' ? 'right' : 'left', vertical: o.doc === 't' ? 'top' : o.doc === 'b' ? 'bottom' : 'middle', wrapText: o.xuong !== false };
        // gộp không chép kiểu (mergeCells dùng chung một kiểu cho cả vùng → không kẻ được viền riêng từng cạnh)
        if (cs > 1 || rs > 1) ws.mergeCellsWithoutStyle(r + 1, c + 1, r + rs, c + cs);
        const cv = canh(o.vien), mong = { style: 'thin' };
        for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) {
          const x = ws.getCell(r + 1 + i, c + 1 + j);
          x.font = font; x.alignment = al;
          if (cv) { // ô gộp: chỉ kẻ cạnh ngoài của vùng gộp
            const bd = {}; if (i === 0 && cv.includes('t')) bd.top = mong; if (i === rs - 1 && cv.includes('b')) bd.bottom = mong;
            if (j === 0 && cv.includes('l')) bd.left = mong; if (j === cs - 1 && cv.includes('r')) bd.right = mong; x.border = bd;
          }
          if (o.nen) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + o.nen.replace('#', '').toUpperCase() } };
          if (o.dd) x.numFmt = o.dd === '0' ? '#,##0' : '#,##0.###';
          else if (typeof o.v === 'number' || o.f) x.numFmt = Number.isInteger(o.v) ? '#,##0' : '#,##0.###'; // số nguyên không hiện dấu thập phân thừa ("12.")
        }
      });
      if (t.loc && t.hang.length > 1) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: t.hang.length, column: t.cot.length } };
      (t.anh || []).forEach(a => {
        const id = wb.addImage({ base64: a.dataUrl, extension: (/^data:image\/(\w+)/.exec(a.dataUrl) || [0, 'png'])[1] });
        ws.addImage(id, { tl: { col: a.cot, row: a.hang }, ext: { width: a.rong, height: a.cao } });
      });
    }
    const buf = await wb.xlsx.writeBuffer(), url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = tl.ten.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ---------- Xem trước khi in (HTML khổ A4) ----------
  // Giống Excel khi in "vừa chiều ngang trang": cột theo đúng độ rộng Excel (w ký tự ≈ 7w + 5 px), cả trang thu nhỏ cùng tỷ lệ; lề theo từng trang tính.
  const MM = 96 / 25.4;
  // tỷ lệ co để bảng vừa ngang trang (giống Excel "vừa 1 trang ngang")
  function tyLeNgang_(t) { const le = t.le || LE_MAC_DINH, tuNhien = t.cot.reduce((a, w) => a + w * 7 + 5, 0); return Math.min(1, ((t.huong === 'ngang' ? 297 : 210) - (le[1] + le[3]) * 25.4) * MM / tuNhien); }
  function html(tl) {
    const kieuTrang = [];
    const trang = tl.trang.map((t, k) => {
      const g = luoi(t), leIn = t.le || LE_MAC_DINH, le = leIn.map(x => (x * 25.4).toFixed(1) + 'mm'), ngang = t.huong === 'ngang';
      const px = t.cot.map(w => w * 7 + 5), tuNhien = px.reduce((a, w) => a + w, 0), tyLe = tyLeNgang_(t) * coMotTrang(t, tyLeNgang_(t));
      kieuTrang.push('@page p' + k + '{size:A4 ' + (ngang ? 'landscape' : 'portrait') + ';margin:' + le.join(' ') + '}');
      const hangHtml = t.hang.map((h, r) => '<tr style="height:' + (h.cao || 15) + 'pt">' + g.filter(x => x.r === r).map(({ cs, rs, o }) =>
        '<td' + (cs > 1 ? ' colspan="' + cs + '"' : '') + (rs > 1 ? ' rowspan="' + rs + '"' : '') + ' style="' + [canh(o.vien).split('').map(k => 'border-' + { t: 'top', l: 'left', b: 'bottom', r: 'right' }[k] + ':.6pt solid #000').join(';'), o.b ? 'font-weight:bold' : '', o.i ? 'font-style:italic' : '',
          o.gach ? 'text-decoration:underline' : '', 'font-size:' + (o.co || 11) + 'pt', 'text-align:' + (o.can === 'c' ? 'center' : o.can === 'r' ? 'right' : 'left'),
          'vertical-align:' + (o.doc === 't' ? 'top' : o.doc === 'b' ? 'bottom' : 'middle'), o.nen ? 'background:' + o.nen : '', o.xuong === false ? 'white-space:nowrap' : 'white-space:pre-wrap'].filter(Boolean).join(';') + '">' +
          esc(soHien(o.v, o.dd)) + '</td>').join('') + '</tr>');
      const dau = t.lapLai ? hangHtml.slice(t.lapLai[0] - 1, t.lapLai[1]) : [], than = t.lapLai ? hangHtml.slice(0, t.lapLai[0] - 1).concat(hangHtml.slice(t.lapLai[1])) : hangHtml;
      // các hàng trước tiêu đề bảng in ở trang đầu; tiêu đề cột lặp lại ở mỗi trang
      const truoc = t.lapLai ? hangHtml.slice(0, t.lapLai[0] - 1) : [], sau = t.lapLai ? hangHtml.slice(t.lapLai[1]) : than;
      const cg = '<colgroup>' + px.map(w => '<col style="width:' + w + 'px">').join('') + '</colgroup>';
      return '<section class="to ' + (ngang ? 'ngang' : 'doc') + '" style="page:p' + k + ';padding:' + le.join(' ') + '"><div class="noi" style="width:' + tuNhien + 'px;zoom:' + tyLe.toFixed(4) + '">' +
        (truoc.length ? '<table>' + cg + '<tbody>' + truoc.join('') + '</tbody></table>' : '') +
        '<table>' + cg + (dau.length ? '<thead>' + dau.join('') + '</thead>' : '') + '<tbody>' + sau.join('') + '</tbody></table>' +
        (t.anh || []).map(a => '<img src="' + a.dataUrl + '" style="position:absolute;width:' + a.rong * 0.75 + 'pt;height:' + a.cao * 0.75 + 'pt;' + (a.vi_tri || 'top:0;right:0') + '">').join('') + '</div></section>';
    });
    return '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>' + esc(tl.ten) + '</title><style>' +
      kieuTrang.join('') +
      // không để trình duyệt tự in tiêu đề / ngày giờ / đường dẫn ở đầu – chân trang; tự in "Trang x / y" như file Excel
      '@page{@top-left{content:""}@top-center{content:""}@top-right{content:""}@bottom-left{content:""}@bottom-right{content:""}' +
      '@bottom-center{content:"Trang " counter(page) " / " counter(pages);font:9pt "Times New Roman",serif}}' +
      'body{margin:0;background:#E9ECF2;font-family:"Times New Roman",serif;color:#000}.to{position:relative;background:#fff;margin:14px auto;box-shadow:0 2px 10px rgba(0,0,0,.18);box-sizing:border-box;min-height:297mm}.to.ngang{min-height:210mm}' +
      '.noi{position:relative;margin:0 auto}.to.doc{width:210mm}.to.ngang{width:297mm}table{width:100%;border-collapse:collapse;table-layout:fixed}td{padding:1px 2px;overflow-wrap:anywhere;line-height:1.2}' +
      '@media print{body{background:#fff}.to{margin:0;padding:0!important;box-shadow:none;width:auto!important;min-height:0;break-after:page}.to:last-child{break-after:auto}thead{display:table-header-group}tr{break-inside:avoid}}' +
      '</style></head><body>' + trang.join('') + '</body></html>';
  }
  // Hộp xem trước: In / Tải Excel / Đóng
  function xemTruoc(tl) {
    const cu = document.getElementById('xem-in'); if (cu) cu.remove();
    const d = document.createElement('div'); d.id = 'xem-in';
    d.innerHTML = '<div class="xem-in-thanh"><b>Xem trước khi in – ' + esc(tl.ten) + '</b><span class="note">' + tl.trang.length + ' trang tính · khổ A4</span><span style="flex:1"></span>' +
      '<button class="btn sm" data-x="in">🖨 In</button><button class="btn o sm" data-x="excel">Tải Excel</button><button class="btn o sm" data-x="dong">Đóng</button></div><iframe title="Xem trước khi in"></iframe>';
    document.body.appendChild(d);
    const f = d.querySelector('iframe'); f.srcdoc = html(tl);
    d.querySelector('[data-x=in]').onclick = () => f.contentWindow.print();
    d.querySelector('[data-x=excel]').onclick = async (e) => { const b = e.target, t = b.textContent; b.disabled = true; b.textContent = 'Đang tạo…'; try { await taiExcel(tl); } catch (err) { alert(err.message); } b.disabled = false; b.textContent = t; };
    d.querySelector('[data-x=dong]').onclick = () => d.remove();
    document.addEventListener('keydown', function f2(e) { if (e.key === 'Escape') { d.remove(); document.removeEventListener('keydown', f2); } });
    return d;
  }

  // ---------- Khuôn dùng chung ----------
  // Đầu trang hai bên (Trường – Khoa | Quốc hiệu) trên n cột
  // rong: độ rộng các cột (nếu có) → chia hai khối theo độ rộng thật, để quốc hiệu không bị xuống dòng
  function dauTrang(n, trai, phai, rong) {
    let a = Math.max(2, Math.floor(n / 2));
    if (rong && n > 1) { // điểm chia có tổng độ rộng bên trái gần một nửa nhất
      const tong = rong.reduce((x, y) => x + y, 0); let c = 0, tot = Infinity;
      for (let i = 1; i < n; i++) { c += rong[i - 1]; const lech = Math.abs(c - tong / 2); if (lech < tot) { tot = lech; a = i; } }
    }
    const b = n - a;
    return [{ cao: 16, o: [{ v: trai[0], cs: a, can: 'c', co: 11 }, { v: phai[0], cs: b, can: 'c', b: 1, co: 11 }] },
      { cao: 16, o: [{ v: trai[1], cs: a, can: 'c', b: 1, co: 11 }, { v: phai[1], cs: b, can: 'c', b: 1, co: 11 }] },
      { cao: 16, o: [{ v: trai[2] || '', cs: a, can: 'c', co: 11 }, { v: phai[2] || '', cs: b, can: 'c', i: 1, co: 11 }] }];
  }
  // Khối chữ ký: ds = [[chức danh, mô tả, họ tên]], chia đều n cột
  // họ tên in dưới chữ ký: lấy theo chức danh khi chưa ghi sẵn (PTN_KY do trang quản lý / công khai nạp từ Cài đặt)
  function tenKy(chuc) {
    const k = window.PTN_KY || {};
    return /HIỆU TRƯỞNG/.test(chuc) && !/PHÓ/.test(chuc) ? k.hieu_truong : /^TRƯỞNG KHOA/.test(chuc) ? k.truong_khoa : /^NGƯỜI LẬP/.test(chuc) ? k.nguoi : '';
  }
  function chuKy(n, ds, cach, chia) { // chia: số cột của từng ô ký (mặc định chia đều)
    ds = ds.map(x => x[2] === undefined ? [x[0], x[1], tenKy(x[0]) || ''] : x);
    const k = ds.length, rong = chia || ds.map((_, i) => Math.floor(n * (i + 1) / k) - Math.floor(n * i / k));
    const h = [{ cao: 18, o: ds.map((x, i) => ({ v: x[0], cs: rong[i], can: 'c', b: 1 })) }, { cao: 15, o: ds.map((x, i) => ({ v: x[1] || '', cs: rong[i], can: 'c', i: 1, co: 10 })) }];
    for (let j = 0; j < (cach || 4); j++) h.push({ cao: 15, o: [{ v: '', cs: n }] });
    h.push({ cao: 16, o: ds.map((x, i) => ({ v: x[2] || '', cs: rong[i], can: 'c', b: !/^Họ tên/.test(x[2] || ''), xuong: false })) });
    return h;
  }
  // Bảng đơn giản theo mẫu hành chính: cot = [{ten, rong, can, dd}], dong = [[...]] (phần tử {nhom: 'tiêu đề'} = dòng nhóm)
  function bang(o) {
    const n = o.cot.length, hang = dauTrang(n, ['TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH', 'KHOA KHOA HỌC SỨC KHỎE', '———'], ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập – Tự do – Hạnh phúc', o.ngay || ''], o.cot.map(c => c.rong));
    hang.push({ cao: 8, o: [{ v: '', cs: n }] }, { cao: 24, o: [{ v: o.tieuDe, cs: n, can: 'c', b: 1, co: 14 }] });
    (o.phuDe ? [].concat(o.phuDe) : []).forEach(p => hang.push({ cao: 16, o: [{ v: p, cs: n, can: 'c', i: 1 }] }));
    hang.push({ cao: 8, o: [{ v: '', cs: n }] });
    const dauBang = hang.length + 1;
    hang.push({ cao: Math.max(32, ...o.cot.map(c => Math.ceil(c.ten.length / Math.max(1, c.rong * 0.95)) * 13.5 + 4)), o: o.cot.map(c => ({ v: c.ten, b: 1, can: 'c', vien: 1, nen: '#D9E2F3', co: 10.5 })) });
    o.dong.forEach(r => {
      if (r && r.nhom !== undefined) hang.push({ cao: 18, o: [{ v: r.nhom, cs: n, b: 1, vien: 1, nen: '#F2F2F2' }] });
      // chiều cao dòng đủ cho chữ xuống dòng trong ô hẹp
      else hang.push({ cao: r.cao || Math.max(17, ...r.map((v, j) => { const x = v !== null && typeof v === 'object' ? v.v : v; return Math.ceil(String(x == null ? '' : x).length / Math.max(1, o.cot[j].rong * 1.15)) * 13.5 + 3; })), o: r.map((v, j) => { const ob = v !== null && typeof v === 'object', x = ob ? v.v : v;
        return { v: x, f: ob ? v.f : undefined, vien: 1, co: 10.5, can: o.cot[j].can || (typeof x === 'number' ? 'r' : 'l'), dd: o.cot[j].dd, b: ob && v.b }; }) });
    });
    if (o.tong) hang.push({ cao: 18, o: o.tong.map((v, j) => ({ v, b: 1, vien: 1, co: 10.5, can: typeof v === 'number' ? 'r' : 'l' })) });
    (o.ghiChu ? [].concat(o.ghiChu) : []).forEach(g => hang.push({ cao: 30, o: [{ v: g, cs: n, i: 1, co: 10, doc: 't' }] }));
    if (o.ky) { hang.push({ cao: 10, o: [{ v: '', cs: n }] }); chuKy(n, o.ky).forEach(h => hang.push(h)); }
    return { ten: o.ten || o.tieuDe.slice(0, 31), huong: o.huong || 'doc', cot: o.cot.map(c => c.rong), lapLai: [dauBang, dauBang], hang, le: o.le };
  }
  // Biểu mẫu chuẩn từ một bảng dữ liệu (đầu trang Trường – Khoa | Quốc hiệu, tiêu đề, bảng kẻ ô, ngày lập, chữ ký) – dùng cho mọi nút tải dữ liệu.
  // cot = ['tên'] hoặc [{ten, so}], dong = [[...]] (phần tử {nhom} = dòng nhóm); độ rộng cột và hướng giấy tự chọn theo nội dung.
  function bieuMau(o) {
    const cot = o.cot.map(c => typeof c === 'string' ? { ten: c } : c), doc = (x) => String(x == null ? '' : x).length;
    const tho = cot.map((c, j) => { const ds = o.dong.slice(0, 400).filter(r => r && r.nhom === undefined).map(r => doc(r[j])); return Math.max(5, Math.min(c.so ? 14 : 36, Math.max(Math.ceil(doc(c.ten) * 0.7), ...ds) + 2)); });
    const stt = /^stt$/i.test(cot[0].ten), them = stt ? 0 : 1, rong = (stt ? [] : [5]).concat(tho), tong = rong.reduce((a, b) => a + b, 0), ngang = o.huong ? o.huong === 'ngang' : tong > 95;
    const toiDa = ngang ? 150 : 104, k = tong < toiDa ? toiDa / tong : 1; // giãn cho kín bề ngang khổ giấy khi bảng hẹp (đầu trang, tiêu đề không bị xuống dòng)
    const d = new Date(), nd = 'TP. HCM, ngày ' + String(d.getDate()).padStart(2, '0') + ' tháng ' + String(d.getMonth() + 1).padStart(2, '0') + ' năm ' + d.getFullYear();
    return bang({ ten: o.ten, tieuDe: o.tieuDe, phuDe: o.phuDe, ngay: nd, huong: ngang ? 'ngang' : 'doc', ghiChu: o.ghiChu, tong: o.tong,
      cot: (stt ? [] : [{ ten: 'STT', can: 'c' }]).concat(cot.map((c, j) => ({ ten: c.ten.toUpperCase(), can: stt && j === 0 ? 'c' : c.so ? 'r' : undefined, dd: c.dd }))).map((c, j) => Object.assign(c, { rong: Math.round(rong[j] * k * 10) / 10 })),
      dong: (() => { let n = 0; return o.dong.map(r => r && r.nhom !== undefined ? r : (stt ? [] : [++n]).concat(cot.map((c, j) => { const v = r[j]; return c.so && v !== '' && v != null && isFinite(+v) ? +v : (v == null ? '' : v); }))); })(),
      ky: o.ky || [['NGƯỜI LẬP BIỂU', '(Ký, ghi rõ họ tên)', o.nguoiLap || ''], ['TRƯỞNG KHOA', '(Ký, ghi rõ họ tên)']] });
  }
  // Trang tính dữ liệu thô (để lọc, tính toán): hàng 1 tiêu đề cột, bộ lọc, cố định hàng tiêu đề; cot = [{ten, so}] hoặc ['tên'], dong = [[...]]
  function duLieu(ten, cot, dong) {
    cot = cot.map(c => typeof c === 'string' ? { ten: c } : c);
    const doc = (x) => String(x == null ? '' : x).length, rong = cot.map((c, j) => Math.min(60, Math.max(8, doc(c.ten) + 2, ...dong.slice(0, 500).map(r => doc(r[j]) + 2))));
    const hang = [{ cao: 30, o: cot.map(c => ({ v: c.ten, b: 1, can: 'c', vien: 1, nen: '#D9E2F3', co: 10.5 })) }].concat(dong.map(r => ({ o: cot.map((c, j) => {
      let v = r[j]; if (c.so && v !== '' && v != null && isFinite(+v)) v = +v;
      return { v: v === undefined ? '' : v, vien: 1, co: 10.5, xuong: false, can: typeof v === 'number' ? 'r' : 'l', dd: c.dd }; }) })));
    return { ten, huong: 'ngang', cot: rong, hang, dongBang: 1, loc: true, lapLai: [1, 1] };
  }
  // Đọc một bảng HTML trên trang (bỏ cột ô chọn, lấy giá trị ô nhập, số kiểu "1.234,5" → số)
  // Đọc một bảng HTML trên trang để in: bỏ nút thao tác (Sửa, Xóa, Cấp lại mật khẩu, Phân quyền…), ô chọn và các cột chỉ có nút; lấy giá trị ô nhập; số kiểu "1.234,5" → số
  function tuBangHtml(tb) {
    const hang = [...tb.rows].filter(tr => !tr.closest('.hide')), bo = [];
    const dau = tb.tHead && tb.tHead.rows[0] ? [...tb.tHead.rows[0].cells] : [], than = hang.filter(tr => !tb.tHead || tr.parentNode !== tb.tHead);
    const chu = (td) => {
      const i = td.querySelector('input:not([type=checkbox]),select,textarea'); if (i) return String(i.value).trim();
      // tạm ẩn nút / ô chọn rồi đọc chữ hiển thị (giữ ngắt dòng giữa các khối)
      const an = [...td.querySelectorAll('button, .btn, input, label.check')].map(x => { const cu = x.style.display; x.style.display = 'none'; return [x, cu]; });
      const t = td.innerText; an.forEach(([x, cu]) => { x.style.display = cu; });
      return t.replace(/\s*\n\s*/g, ' · ').replace(/[ \t]+/g, ' ').replace(/^ · | · $/g, '').trim();
    };
    const coThaoTac = (td) => !!td.querySelector('button, .btn, input[type=checkbox]');
    dau.forEach((th, j) => {
      const o = than.map(tr => tr.cells.length > 1 ? tr.cells[j] : null).filter(Boolean);
      if (!th.textContent.trim() && o.every(td => !chu(td) || coThaoTac(td) && !chu(td))) bo.push(j);   // cột không tiêu đề chỉ chứa nút / ô chọn
      else if (th.querySelector('input[type=checkbox]') && !th.textContent.trim()) bo.push(j);
    });
    const soVN = (s) => /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(s) ? +s.replace(/\./g, '').replace(',', '.') : s;
    const cot = dau.filter((_, j) => bo.indexOf(j) < 0).map(th => th.textContent.replace(/\s+/g, ' ').trim()); // textContent: giữ chữ gốc, không theo kiểu in hoa của CSS
    const dong = than.map(tr => { const c = [...tr.cells];
      if (c.length === 1 && c[0].colSpan > 1) return [chu(c[0])];
      return c.filter((_, j) => bo.indexOf(j) < 0).map(td => { const v = chu(td); return td.classList.contains('num') || td.querySelector('input[type=number]') ? soVN(v) : v; }); });
    return { cot: cot.length ? cot : (dong[0] || []).map((_, j) => 'Cột ' + (j + 1)), dong };
  }

  window.PTN_IN = { taiExcel, xemTruoc, html, dauTrang, chuKy, bang, bieuMau, luoi, duLieu, tuBangHtml };
})();
