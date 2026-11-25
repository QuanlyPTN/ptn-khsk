/* Trang quản lý – hộp "🔎 Dò mã VT – NSX" (Hóa chất › Môn & định mức): dòng định mức hóa chất thiếu mã VT / NSX / ĐVT.
   Dòng đã có mã → tự điền NSX, ĐVT theo "Tra cứu mã vật tư"; dòng "Chưa MVT" → gợi ý mã theo tên gần đúng (bỏ dấu, bỏ quy cách đóng gói,
   tên gọi khác: Cồn = Ethanol, Iod = Iodine…) để xác nhận; gán một lần cho mọi môn cùng tên; xuất Excel danh sách chưa có mã.
   So tên chạy ở máy khách (máy chủ chỉ trả danh sách và ghi): dm_thieu_vt, dm_gan_vt (apps-script/06_HoaChat.gs). */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { api, chay, moHop, dongHop, esc, toast, boDau, homNay, dieuHuong } = Q;
  // tên gọi khác → một dạng chung
  const DONG = { ethanol: 'con', etanol: 'con', ethylic: 'con', alcohol: 'con', alcol: 'con', ruou: 'con', iodine: 'iod', iodin: 'iod', iot: 'iod',
    chloride: 'clorid', chlorid: 'clorid', clorua: 'clorid', hydroxide: 'hydroxid', hydroxyd: 'hydroxid', sodium: 'natri', potassium: 'kali',
    calcium: 'calci', canxi: 'calci', magnesium: 'magnesi', acid: 'axit', acide: 'axit', sulfate: 'sulfat', sunfat: 'sulfat', sulphate: 'sulfat',
    nitrate: 'nitrat', carbonate: 'carbonat', cacbonat: 'carbonat', glycerin: 'glycerol', glycerine: 'glycerol', dextrose: 'glucose', sulfur: 'luuhuynh' };
  // chữ chỉ quy cách đóng gói / độ tinh khiết – không giúp phân biệt hóa chất
  const BO = new Set(['pa', 'ar', 'tinh', 'khiet', 'loai', 'chai', 'lo', 'hop', 'goi', 'tui', 'thung', 'ong', 'bich', 'ml', 'l', 'g', 'kg', 'mg', 'xuat', 'xu']);
  const tu = (s) => boDau(s).replace(/luu huynh/g, 'luuhuynh').replace(/(\d)\s*(?:do|%)(?![a-z])/g, '$1').replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .filter(w => w && !BO.has(w) && !/^\d+([.,]\d+)?(ml|l|g|kg|mg|mm|cm)$/.test(w)).map(w => DONG[w] || w);
  const so = (a) => a.filter(w => /^\d+$/.test(w)).join(' ');
  // chữ dạng công thức (cuso4, c12h22o11…) trong tên mã VT không tính vào độ dài nếu tên định mức không có – "Saccharose" = "C12H22O11 (saccharose)"
  const laCT = (w) => /[a-z]/.test(w) && /\d/.test(w);
  // mức giống 0..1: tỷ lệ chữ chung (Dice); mọi chữ của tên định mức có trong tên mã VT → ≥ 0,5 + 0,4 × phần chung của tên mã VT
  // (tên mã VT dài hơn nhiều – "Gạo" / "Cám gạo" – không lên cao); cùng ĐVT +0,05; khác số (Cồn 96 / Cồn 70) ×0,6
  function diem(a, b) {
    let chung = 0, ct = 0; a.w.forEach(w => { if (b.w.has(w)) chung++; });
    if (!chung) return 0;
    b.w.forEach(w => { if (laCT(w) && !a.w.has(w)) ct++; });
    const nb = Math.max(1, b.w.size - ct);
    let d = 2 * chung / (a.w.size + nb);
    if (chung === a.w.size) d = Math.max(d, 0.5 + 0.4 * chung / nb + (chung === nb ? 0.1 : 0));
    if (a.so && b.so && a.so !== b.so) d *= 0.6;
    if (a.dvt && a.dvt === b.dvt) d += 0.05;
    return Math.min(1, d);
  }
  const dv = (s) => boDau(s).trim();

  async function hopDoMaVT() {
    moHop('<h2>🔎 Dò mã VT – NSX cho định mức hóa chất</h2><div class="loading"><div class="spin"></div></div>');
    const [dong, vt] = await Promise.all([api('dm_thieu_vt'), api('vt_ds')]);
    const V = vt.map(v => { const a = tu(v.ten); return { v, w: new Set(a), so: so(a), dvt: dv(v.dvt) }; }), chiMuc = {};
    V.forEach((x, i) => x.w.forEach(w => { (chiMuc[w] = chiMuc[w] || []).push(i); }));
    const coMa = vt.reduce((m, v) => (m[v.ma_vt] = v, m), {});
    const dien = dong.filter(d => d.ma_vt && coMa[d.ma_vt] && ((!d.nsx && coMa[d.ma_vt].nsx) || (!d.dvt && coMa[d.ma_vt].dvt)));
    // nhóm dòng chưa có mã theo tên (đã chuẩn hóa) + ĐVT → mỗi nhóm một lần chọn
    const N = {};
    dong.filter(d => !d.ma_vt).forEach(d => { const a = tu(d.ten), k = a.join(' ') + '|' + dv(d.dvt);
      const g = N[k] = N[k] || { ten: d.ten, dvt: d.dvt, w: new Set(a), so: so(a), id: [], mon: [] }; g.id.push(d.id); if (g.mon.indexOf(d.ten_mon) < 0) g.mon.push(d.ten_mon); });
    const nhom = Object.keys(N).map(k => N[k]).map(g => {
      const ung = {}; g.w.forEach(w => (chiMuc[w] || []).forEach(i => { ung[i] = 1; }));
      g.dvt2 = dv(g.dvt);
      g.goi_y = Object.keys(ung).map(i => ({ x: V[i].v, d: diem({ w: g.w, so: g.so, dvt: g.dvt2 }, V[i]) })).filter(x => x.d >= 0.35).sort((a, b) => b.d - a.d).slice(0, 3);
      return g;
    }).sort((a, b) => ((b.goi_y[0] || {}).d || 0) - ((a.goi_y[0] || {}).d || 0) || a.ten.localeCompare(b.ten, 'vi'));
    const coGoiY = nhom.filter(g => g.goi_y.length).length, chonSan = (g) => g.goi_y[0] && g.goi_y[0].d >= 0.9 && (!g.goi_y[1] || g.goi_y[1].d <= g.goi_y[0].d - 0.1) ? g.goi_y[0].x.ma_vt : '';
    const nhan = (x) => x.x.ma_vt + ' · ' + x.x.ten + (x.x.nsx ? ' · ' + x.x.nsx : '') + (x.x.dvt ? ' · ' + x.x.dvt : '') + ' (' + Math.round(x.d * 100) + '%)';
    moHop('<h2>🔎 Dò mã VT – NSX cho định mức hóa chất</h2>' +
      '<p class="note">So với <b>' + vt.length + '</b> mã trong <a href="#/hoa-chat/vat-tu">Tra cứu mã vật tư</a>. Gán mã cho tên nào thì mọi môn có cùng tên được gán theo; dự trù, biên bản cùng tên cũng tự nhận mã. Thu hồi được ở Lịch sử tải file.</p>' +
      '<p><b>' + dien.length + '</b> dòng đã có mã VT nhưng thiếu NSX / ĐVT → bấm <b>Áp dụng</b> sẽ tự điền theo Tra cứu mã vật tư.</p>' +
      '<p><b>' + nhom.length + '</b> tên hóa chất chưa có mã VT (' + nhom.reduce((a, g) => a + g.id.length, 0) + ' dòng ở các môn), <b>' + coGoiY + '</b> tên có gợi ý. Gợi ý ≥ 90% được chọn sẵn – kiểm lại rồi bấm Áp dụng; biết mã thì gõ vào ô "Mã khác".</p>' +
      (nhom.length ? '<div class="tbl-wrap" style="max-height:52vh"><table><thead><tr><th>Tên trong định mức</th><th>Mã VT gợi ý</th><th>Mã khác</th></tr></thead><tbody>' +
        nhom.map((g, i) => '<tr><td style="min-width:180px"><b>' + esc(g.ten) + '</b>' + (g.dvt ? ' <span class="note">(' + esc(g.dvt) + ')</span>' : '') +
          '<div class="note">' + g.id.length + ' dòng · ' + esc(g.mon.slice(0, 3).join(', ') + (g.mon.length > 3 ? ' và ' + (g.mon.length - 3) + ' môn khác' : '')) + '</div></td>' +
          '<td>' + (g.goi_y.length ? '<select data-g="' + i + '" style="max-width:420px"><option value="">— Không gán —</option>' +
            g.goi_y.map(x => '<option value="' + esc(x.x.ma_vt) + '"' + (x.x.ma_vt === chonSan(g) ? ' selected' : '') + '>' + esc(nhan(x)) + '</option>').join('') + '</select>' : '<span class="note">Không có tên gần giống</span>') + '</td>' +
          '<td><input data-m="' + i + '" inputmode="numeric" placeholder="Mã VT" style="width:90px"></td></tr>').join('') + '</tbody></table></div>' : '') +
      '<div class="modal-foot"><button type="button" class="btn o" id="dv-xuat"' + (nhom.length ? '' : ' disabled') + '>⇩ Excel danh sách chưa có mã</button><button type="button" class="btn o" data-dong>Hủy</button><button type="button" class="btn" id="dv-ap">Áp dụng</button></div>', (m) => {
      m.parentNode.style.maxWidth = 'min(1100px, 96vw)';
      m.querySelector('#dv-xuat').onclick = () => { const IN = window.PTN_IN;
        IN.taiExcel({ ten: 'Dinh muc chua co ma VT ' + homNay(), trang: [IN.duLieu('Chua co ma VT', ['TÊN TRONG ĐỊNH MỨC', 'ĐVT', 'SỐ DÒNG', 'CÁC MÔN', 'GỢI Ý GẦN NHẤT'],
          nhom.map(g => [g.ten, g.dvt, g.id.length, g.mon.join(', '), g.goi_y[0] ? nhan(g.goi_y[0]) : '']))] }); };
      m.querySelector('#dv-ap').onclick = (e) => {
        const ds = [];
        nhom.forEach((g, i) => { const tay = (m.querySelector('[data-m="' + i + '"]').value || '').trim(), s = m.querySelector('[data-g="' + i + '"]'), ma = tay || (s ? s.value : '');
          if (ma) g.id.forEach(id => ds.push({ id, ma_vt: ma })); });
        const sai = ds.filter(x => !coMa[x.ma_vt]).map(x => x.ma_vt);
        if (sai.length) return toast('Không có mã VT ' + Array.from(new Set(sai)).join(', ') + ' trong Tra cứu mã vật tư');
        if (!ds.length && !dien.length) return toast('Chưa chọn mã nào');
        chay(e.target, async () => { const r = await api('dm_gan_vt', { ds, tu_dien: 1 }); dongHop();
          toast('Đã gán mã VT ' + r.gan + ' dòng, điền NSX / ĐVT ' + r.dien + ' dòng định mức' + (r.khac ? '; dự trù, biên bản tự nhận mã thêm ' + r.khac + ' dòng' : '')); dieuHuong(); });
      };
    });
  }
  Object.assign(Q, { hopDoMaVT, tuDoMaVT: tu });
})();
