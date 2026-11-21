/* Trang quản lý – "Lịch & việc của tôi" (#/lich-viec/<hom-nay|lich|viec>): lịch hẹn – nhắc việc (lặp lại, nhắc trước), sổ việc quan trọng (ưu tiên, hạn, trạng thái, nhật ký tiến độ kèm tệp).
   Mỗi tài khoản chỉ thấy của mình; admin chọn thành viên (hoặc tất cả) để xem, giao việc – người được giao chỉ đổi trạng thái, ghi tiến độ.
   Nhắc trong web: số đếm trên menu, khung ở trang Hôm nay, thẻ nhắc + thông báo trình duyệt đúng giờ khi trang đang mở. Nhắc tự động: thiết bị cho mượn quá hạn trả.
   Xuất Excel nhật ký công việc theo tuần / tháng / khoảng ngày. Máy chủ: apps-script/25_LichViec.gs. */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { S, $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, homNay, laAdmin, dieuHuong, docB64, napXlsx } = Q;
  const LAP = [['', 'Không lặp'], ['ngay', 'Hằng ngày'], ['tuan', 'Hằng tuần'], ['thang', 'Hằng tháng'], ['nam', 'Hằng năm']];
  const NHAC = [['', 'Không nhắc'], ['0', 'Đúng giờ'], ['15', 'Trước 15 phút'], ['60', 'Trước 1 giờ'], ['1440', 'Trước 1 ngày'], ['4320', 'Trước 3 ngày']];
  const UT = { gap: ['Gấp', 't-bad'], quan_trong: ['Quan trọng', 't-warn'], thuong: ['Thường', 't-gray'] };
  const TT = ['Chưa làm', 'Đang làm', 'Xong', 'Hoãn'], TT_MAU = { 'Chưa làm': 't-info', 'Đang làm': 't-warn', 'Xong': 't-ok', 'Hoãn': 't-gray' };
  const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const tagUT = (u) => '<span class="tag ' + (UT[u] || UT.thuong)[1] + '">' + (UT[u] || UT.thuong)[0] + '</span>';
  const tagTT = (t) => '<span class="tag ' + (TT_MAU[t] || 't-gray') + '">' + esc(t) + '</span>';
  const toi = () => S.toi.nguoi.email;
  const mo = (x) => x.loai === 'viec' && x.trang_thai !== 'Xong' && x.trang_thai !== 'Hoãn';
  const suaDuoc = (x) => laAdmin() || (x.chu === toi() && !x.giao_boi);
  const moiGiao = (x) => x.chu === toi() && x.giao_boi && x.da_xem !== 'Có';

  // ---- ngày (chuỗi yyyy-mm-dd theo giờ máy) ----
  const dStr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dPar = (s) => { const m = String(s).split('-'); return new Date(+m[0], +m[1] - 1, +m[2]); };
  const cong = (s, n) => { const d = dPar(s); d.setDate(d.getDate() + n); return dStr(d); };
  const thangCong = (s, k) => { const d = dPar(s), ngay = d.getDate(), x = new Date(d.getFullYear(), d.getMonth() + k, 1), cuoi = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(ngay, cuoi)); return dStr(x); };
  // các ngày diễn ra của lịch hẹn trong [tu, den] (lặp lại: ngày / tuần / tháng / năm, tới lap_den)
  function lan(x, tu, den) {
    if (x.loai !== 'lich' || !x.ngay) return [];
    if (!x.lap) return x.ngay >= tu && x.ngay <= den ? [x.ngay] : [];
    const het = x.lap_den && x.lap_den < den ? x.lap_den : den, out = [];
    let d = x.ngay, k = 0;
    if ((x.lap === 'ngay' || x.lap === 'tuan') && d < tu) { const b = x.lap === 'ngay' ? 1 : 7, n = Math.floor((dPar(tu) - dPar(d)) / 864e5 / b); d = cong(d, n * b); k = n; }
    for (let i = 0; i < 5000 && d <= het; i++) {
      if (d >= tu) out.push(d);
      k++; d = x.lap === 'ngay' ? cong(x.ngay, k) : x.lap === 'tuan' ? cong(x.ngay, k * 7) : thangCong(x.ngay, x.lap === 'thang' ? k : k * 12);
    }
    return out;
  }
  const gioCua = (x) => x.gio ? x.gio + (x.gio_ket ? '–' + x.gio_ket : '') : 'Cả ngày';
  // mốc nhắc (ms) của một lần diễn ra: giờ bắt đầu (trống = 7:00 lịch, 8:00 việc) trừ số phút nhắc trước
  const mocBatDau = (x, ngay) => { const d = dPar(ngay), g = (x.gio || (x.loai === 'viec' ? '08:00' : '07:00')).split(':'); d.setHours(+g[0], +g[1], 0, 0); return d.getTime(); };

  // ---- tổng hợp "hôm nay" từ danh sách ----
  function tomTat(d, chiCuaToi) {
    const hn = d.hom_nay || homNay(), ds = d.ds.filter(x => !chiCuaToi || x.chu === toi());
    const lichHn = []; ds.forEach(x => lan(x, hn, hn).forEach(n => lichHn.push({ x, ngay: n })));
    lichHn.sort((a, b) => (a.x.gio || '') < (b.x.gio || '') ? -1 : 1);
    const sap = []; ds.forEach(x => lan(x, cong(hn, 1), cong(hn, 7)).forEach(n => sap.push({ x, ngay: n })));
    ds.filter(x => mo(x) && x.ngay > hn && x.ngay <= cong(hn, 7)).forEach(x => sap.push({ x, ngay: x.ngay }));
    sap.sort((a, b) => (a.ngay + (a.x.gio || '')) < (b.ngay + (b.x.gio || '')) ? -1 : 1);
    return { hn, lichHn, sap, quaHan: ds.filter(x => mo(x) && x.ngay && x.ngay < hn).sort((a, b) => a.ngay < b.ngay ? -1 : 1),
      viecHn: ds.filter(x => mo(x) && x.ngay === hn), moi: ds.filter(moiGiao), tuDong: d.tu_dong || [] };
  }
  const soNhac = (t) => t.quaHan.length + t.viecHn.length + t.lichHn.length + t.moi.filter(x => t.quaHan.indexOf(x) < 0 && t.viecHn.indexOf(x) < 0).length + t.tuDong.length;

  // ---------------- Nhắc trong web (chạy nền khi trang quản lý đang mở) ----------------
  const N = { d: null, t: 0 };
  const khoaNhac = () => 'lv_nhac|' + location.pathname + '|' + toi();
  function daNhac() { try { return JSON.parse(localStorage.getItem(khoaNhac()) || '{}'); } catch (e) { return {}; } }
  function luuNhac(o) { try { const h = Date.now() - 7 * 864e5; Object.keys(o).forEach(k => { if (o[k] < h) delete o[k]; }); localStorage.setItem(khoaNhac(), JSON.stringify(o)); } catch (e) { /* trình duyệt chặn lưu */ } }
  async function taiNen() { try { N.d = await api('lv_ds'); N.t = Date.now(); demSo(); kiemNhac(); } catch (e) { /* mất mạng / hết phiên: lần sau */ } }
  function demSo() {
    const a = document.querySelector('#nav a[data-m="lich-viec"]'); if (!a || !N.d) return;
    const n = soNhac(tomTat(N.d, true));
    let h = a.querySelector('.huy-hieu'); if (!h) { h = document.createElement('span'); h.className = 'huy-hieu'; a.appendChild(h); }
    h.textContent = n; h.hidden = !n;
  }
  function kiemNhac() {
    if (!N.d) return;
    const bay = Date.now(), hn = homNay(), da = daNhac(), moi = [];
    N.d.ds.filter(x => x.chu === toi() && x.nhac !== '' && x.nhac != null).forEach(x => {
      const ngays = x.loai === 'lich' ? lan(x, cong(hn, -1), cong(hn, 3)) : mo(x) && x.ngay ? [x.ngay] : [];
      ngays.forEach(n => {
        const bd = mocBatDau(x, n), k = x.id + '|' + n;
        if (!da[k] && bay >= bd - (+x.nhac) * 60000 && bay < bd + (x.loai === 'lich' ? 3600e3 : 864e5)) { da[k] = bay; moi.push({ x, ngay: n }); }
      });
    });
    N.d.ds.filter(x => moiGiao(x) && !da['giao|' + x.id]).forEach(x => { da['giao|' + x.id] = bay; moi.push({ x, giao: 1 }); });
    if (!moi.length) return;
    luuNhac(da); moi.slice(0, 5).forEach(baoNhac);
  }
  function baoNhac(m) {
    const x = m.x, tieu = m.giao ? '📌 Việc mới được giao' : x.loai === 'lich' ? '⏰ Lịch hẹn ' + (m.ngay === homNay() ? 'hôm nay' : ngayVN(m.ngay)) : '⏰ Việc tới hạn ' + ngayVN(x.ngay);
    const than = x.tieu_de + (x.loai === 'lich' ? ' · ' + gioCua(x) + (x.dia_diem ? ' · ' + x.dia_diem : '') : '') + (m.giao && x.ten_giao ? ' · ' + x.ten_giao + ' giao' : '');
    const href = '#/lich-viec/' + (x.loai === 'lich' ? 'lich' : 'viec') + '/' + encodeURIComponent(x.id);
    Q.tbNoi({ id: 'lv|' + x.id + '|' + (m.giao ? 'giao' : m.ngay || ''), tieu, than, href, lv: 1 }); // thông báo nổi dùng chung (chỉ 1 thẻ, xếp hàng)
    if ('Notification' in window && Notification.permission === 'granted') {
      try { const n = new Notification(tieu, { body: than, icon: '../icon-192.png', tag: 'lv-' + x.id + (m.ngay || '') }); n.onclick = () => { window.focus(); location.hash = href; n.close(); }; } catch (e) { /* máy không hỗ trợ */ }
    }
  }
  function batNhac() {
    clearInterval(S.lvTd); N.d = null;
    if (!S.tk || !$('nav')) return;
    taiNen();
    S.lvTd = setInterval(() => { if (document.hidden || !S.tk) return; if (Date.now() - N.t > 300000) taiNen(); else kiemNhac(); }, 30000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.tk && S.lvTd && Date.now() - N.t > 60000) taiNen(); });

  // ---------------- Khung ở trang Hôm nay ----------------
  async function khungHomNay(nd) {
    let d; try { d = await api('lv_ds'); } catch (e) { return; }
    N.d = d; N.t = Date.now(); demSo();
    const t = tomTat(d, true), dong = [];
    t.quaHan.forEach(x => dong.push('<div class="chu-y nang">⚠ ' + linkX(x) + ' – quá hạn ' + ngayVN(x.ngay) + ' ' + tagUT(x.uu_tien) + '</div>'));
    t.lichHn.forEach(l => dong.push('<div class="chu-y">⏰ <b>' + esc(gioCua(l.x)) + '</b> ' + linkX(l.x) + (l.x.dia_diem ? ' · ' + esc(l.x.dia_diem) : '') + '</div>'));
    t.viecHn.forEach(x => dong.push('<div class="chu-y">☑ ' + linkX(x) + ' – hạn hôm nay ' + tagUT(x.uu_tien) + '</div>'));
    t.moi.forEach(x => dong.push('<div class="chu-y">📌 ' + linkX(x) + ' – ' + esc(x.ten_giao) + ' mới giao</div>'));
    t.tuDong.forEach(a => dong.push('<div class="chu-y nang">⚠ <a href="' + esc(a.lien_ket) + '">' + esc(a.tieu_de) + '</a> – ' + esc(a.nguoi) + ' quá hạn trả ' + ngayVN(a.han) + '</div>'));
    const c = document.createElement('div'); c.className = 'card'; c.id = 'hn-lich-viec';
    c.innerHTML = '<h2>Lịch & việc của tôi hôm nay (' + dong.length + ')</h2>' + (dong.length ? dong.join('') : '<div class="note">Hôm nay không có lịch hẹn, việc tới hạn.</div>') +
      '<p class="note">' + (t.sap.length ? t.sap.length + ' lịch / việc trong 7 ngày tới · ' : '') + '<a href="#/lich-viec">Mở Lịch & việc ›</a></p>';
    if (!nd.isConnected) return;
    const cu = $('hn-lich-viec'); if (cu) cu.remove();
    nd.insertBefore(c, nd.firstChild);
  }
  const linkX = (x) => '<a href="#/lich-viec/' + (x.loai === 'lich' ? 'lich' : 'viec') + '/' + encodeURIComponent(x.id) + '">' + esc(x.tieu_de) + '</a>';

  // ---------------- Trang Lịch & việc ----------------
  let D = null;
  async function manLichViec(p) {
    const tab = ['lich', 'viec'].indexOf(p[1]) >= 0 ? p[1] : 'hom-nay', moId = p[2] ? decodeURIComponent(p[2]) : '';
    const chu = laAdmin() ? S.lvChu || '' : '';
    D = await api('lv_ds', chu ? { chu } : {});
    if (!chu) { N.d = D; N.t = Date.now(); demSo(); }
    const tenXem = chu === '*' ? 'tất cả thành viên' : chu ? ((D.thanh_vien || []).find(t => t.email === chu) || {}).ten || chu : '';
    const nd = trang('Lịch & việc' + (tenXem ? ' – ' + esc(tenXem) : ' của tôi'), '<button class="btn sm" id="lv-them-lich">+ Lịch hẹn</button><button class="btn sm" id="lv-them-viec">+ Việc</button>' +
      '<button class="btn o sm" id="lv-xuat">⇩ Xuất Excel</button>');
    let h = '';
    if (laAdmin()) {
      h += '<div class="card"><div class="tools" style="margin:0 0 8px"><label>Xem của <select id="lv-chu"><option value="">Tôi</option><option value="*"' + (chu === '*' ? ' selected' : '') + '>Tất cả thành viên</option>' +
        (D.thanh_vien || []).filter(t => t.email !== toi()).map(t => '<option value="' + esc(t.email) + '"' + (chu === t.email ? ' selected' : '') + '>' + esc(t.ten) + '</option>').join('') + '</select></label></div>' +
        '<details class="lv-tv"' + (S.lvTvMo ? ' open' : '') + '><summary>Thống kê từng thành viên (' + (D.thanh_vien || []).length + ') · ' + (D.thanh_vien || []).reduce((a, t) => a + t.chua_xong, 0) + ' việc chưa xong · ' +
        '<b' + ((D.thanh_vien || []).some(t => t.qua_han) ? ' style="color:var(--bad)"' : '') + '>' + (D.thanh_vien || []).reduce((a, t) => a + t.qua_han, 0) + ' quá hạn</b></summary>' +
        '<div class="tbl-wrap"><table><thead><tr><th>Thành viên</th><th class="num">Việc chưa xong</th><th class="num">Quá hạn</th><th class="num">Xong trong tháng</th><th class="num">Lịch hẹn</th></tr></thead><tbody>' +
        (D.thanh_vien || []).map(t => '<tr class="click" data-tv="' + esc(t.email === toi() ? '' : t.email) + '"' + ((chu || toi()) === t.email ? ' style="background:var(--mn-nhat,#EEF4FF)"' : '') + '><td><b>' + esc(t.ten) + '</b><div class="note">' + esc(t.vai_tro) + '</div></td><td class="num">' + t.chua_xong + '</td>' +
          '<td class="num">' + (t.qua_han ? '<span class="tag t-bad">' + t.qua_han + '</span>' : '0') + '</td><td class="num">' + t.xong_thang + '</td><td class="num">' + t.lich + '</td></tr>').join('') + '</tbody></table></div></details></div>';
    }
    if ('Notification' in window && Notification.permission === 'default') h += '<p><button class="btn o sm" id="lv-bat-tb">🔔 Bật thông báo nhắc lịch trên máy này</button> <span class="note">Nhắc chỉ hiện khi trang quản lý đang mở (kể cả ở thẻ khác).</span></p>';
    h += '<div class="lv-tab">' + [['hom-nay', 'Hôm nay'], ['lich', 'Lịch tháng'], ['viec', 'Sổ việc']].map(([k, t]) => '<a href="#/lich-viec/' + k + '"' + (k === tab ? ' class="on"' : '') + '>' + t + '</a>').join('') + '</div><div id="lv-nd"></div>';
    nd.innerHTML = h;
    const tvMo = nd.querySelector('.lv-tv'); if (tvMo) tvMo.ontoggle = () => { S.lvTvMo = tvMo.open; };
    if ($('lv-chu')) $('lv-chu').onchange = (e) => { S.lvChu = e.target.value; dieuHuong(); };
    nd.querySelectorAll('[data-tv]').forEach(tr => { tr.onclick = () => { S.lvChu = tr.dataset.tv; dieuHuong(); }; });
    if ($('lv-bat-tb')) $('lv-bat-tb').onclick = (e) => Notification.requestPermission().then(q => { e.target.parentNode.remove(); toast(q === 'granted' ? 'Đã bật thông báo trên máy này' : 'Trình duyệt chưa cho phép thông báo', q !== 'granted'); });
    $('lv-them-lich').onclick = () => hopSua({ loai: 'lich' });
    $('lv-them-viec').onclick = () => hopSua({ loai: 'viec' });
    $('lv-xuat').onclick = hopXuat;
    (tab === 'lich' ? veLich : tab === 'viec' ? veViec : veHomNay)();
    if (moId) { // mở từ thẻ nhắc / liên kết: bỏ mã khỏi địa chỉ để lần vẽ lại sau không tự mở lại
      history.replaceState(null, '', '#/lich-viec/' + tab); const x = D.ds.find(y => y.id === moId); if (x) (x.loai === 'viec' ? hopViec : hopLich)(x); }
  }
  const nguoiCua = (x) => S.lvChu === '*' ? '<span class="note"> · ' + esc(x.ten_chu) + '</span>' : '';
  const dongX = (x, phu) => '<div class="lv-dong" data-x="' + esc(x.id) + '">' + (x.loai === 'lich' ? '⏰ ' : '☑ ') + '<b>' + esc(x.tieu_de) + '</b>' + nguoiCua(x) + (phu ? ' <span class="note">' + phu + '</span>' : '') +
    (x.loai === 'viec' ? ' ' + tagUT(x.uu_tien) + ' ' + tagTT(x.trang_thai) : '') + (x.giao_boi ? ' <span class="tag t-info">' + (moiGiao(x) ? 'Mới giao' : 'Giao') + ' bởi ' + esc(x.ten_giao) + '</span>' : '') + '</div>';
  const ganMo = (root) => root.querySelectorAll('[data-x]').forEach(el => { el.onclick = () => { const x = D.ds.find(y => y.id === el.dataset.x); if (x) (x.loai === 'viec' ? hopViec : hopLich)(x); }; });

  function veHomNay() {
    const t = tomTat(D, false), muc = (ten, ds, rong) => '<div class="card"><h2>' + ten + ' (' + ds.length + ')</h2>' + (ds.length ? ds.join('') : '<div class="note">' + rong + '</div>') + '</div>';
    $('lv-nd').innerHTML = '<div class="grid g2">' +
      muc('Hôm nay ' + ngayVN(t.hn), t.lichHn.map(l => dongX(l.x, gioCua(l.x) + (l.x.dia_diem ? ' · ' + esc(l.x.dia_diem) : ''))).concat(t.viecHn.map(x => dongX(x, 'hạn hôm nay'))), 'Không có lịch hẹn, việc tới hạn.') +
      muc('Quá hạn', t.quaHan.map(x => dongX(x, 'hạn ' + ngayVN(x.ngay))), 'Không có việc quá hạn.') +
      muc('7 ngày tới', t.sap.map(l => dongX(l.x, ngayVN(l.ngay) + (l.x.loai === 'lich' ? ' · ' + gioCua(l.x) : ' · hạn'))), 'Chưa có lịch / việc nào.') +
      muc('Việc đang làm', D.ds.filter(x => x.loai === 'viec' && x.trang_thai === 'Đang làm').map(x => dongX(x, x.ngay ? 'hạn ' + ngayVN(x.ngay) : '')), 'Không có.') + '</div>' +
      (t.tuDong.length ? '<div class="card"><h2>Nhắc tự động – thiết bị cho mượn quá hạn trả (' + t.tuDong.length + ')</h2>' + t.tuDong.map(a => '<div class="chu-y nang">⚠ <a href="' + esc(a.lien_ket) + '">' + esc(a.tieu_de) + '</a> – ' + esc(a.nguoi) + ' · hạn trả ' + ngayVN(a.han) + '</div>').join('') + '</div>' : '');
    ganMo($('lv-nd'));
  }

  function veLich() {
    const th = S.lvThang || homNay().slice(0, 7), dau = th + '-01', d0 = dPar(dau), lui = (d0.getDay() + 6) % 7, bd = cong(dau, -lui);
    const soNgay = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate(), so = Math.ceil((lui + soNgay) / 7) * 7, kt = cong(bd, so - 1), hn = homNay();
    const theo = {}; D.ds.forEach(x => { lan(x, bd, kt).forEach(n => (theo[n] = theo[n] || []).push(x)); if (x.loai === 'viec' && x.ngay >= bd && x.ngay <= kt) (theo[x.ngay] = theo[x.ngay] || []).push(x); });
    Object.keys(theo).forEach(k => theo[k].sort((a, b) => (a.loai === b.loai ? (a.gio || '99') < (b.gio || '99') : a.loai === 'lich') ? -1 : 1));
    let o2 = '<div class="lv-thang"><button class="btn o sm" data-th="-1">‹</button><b>Tháng ' + (d0.getMonth() + 1) + '/' + d0.getFullYear() + '</b><button class="btn o sm" data-th="1">›</button><button class="btn o sm" data-th="0">Tháng này</button></div>' +
      '<div class="lv-luoi">' + THU.map(t => '<div class="lv-thu">' + t + '</div>').join('');
    for (let i = 0; i < so; i++) {
      const n = cong(bd, i), ds = theo[n] || [];
      o2 += '<div class="lv-o' + (n.slice(0, 7) !== th ? ' ngoai' : '') + (n === hn ? ' nay' : '') + '" data-ngay="' + n + '"><div class="lv-so">' + (+n.slice(8)) + '</div>' +
        ds.slice(0, 4).map(x => '<div class="lv-muc ' + (x.loai === 'lich' ? 'l' : mo(x) && x.ngay < hn ? 'qh' : x.trang_thai === 'Xong' ? 'xong' : 'v') + '" data-x="' + esc(x.id) + '" title="' + esc(x.tieu_de) + '">' +
          (x.loai === 'lich' ? (x.gio ? x.gio + ' ' : '') : '☑ ') + esc(x.tieu_de) + '</div>').join('') + (ds.length > 4 ? '<div class="note">+' + (ds.length - 4) + ' nữa</div>' : '') + '</div>';
    }
    o2 += '</div><p class="note">Bấm vào ô ngày trống để thêm lịch hẹn ngày đó. Xanh: lịch hẹn · vàng: hạn việc · đỏ: việc quá hạn · xám: việc đã xong.</p>';
    $('lv-nd').innerHTML = o2;
    $('lv-nd').querySelectorAll('[data-th]').forEach(b => { b.onclick = () => { S.lvThang = +b.dataset.th ? thangCong(dau, +b.dataset.th).slice(0, 7) : homNay().slice(0, 7); veLich(); }; });
    $('lv-nd').querySelectorAll('[data-x]').forEach(el => { el.onclick = (e) => { e.stopPropagation(); const x = D.ds.find(y => y.id === el.dataset.x); if (x) (x.loai === 'viec' ? hopViec : hopLich)(x); }; });
    $('lv-nd').querySelectorAll('[data-ngay]').forEach(el => { el.onclick = () => hopSua({ loai: 'lich', ngay: el.dataset.ngay }); });
  }

  function veViec() {
    const f = S.lvLoc || { tt: 'mo', ut: '', q: '' };
    $('lv-nd').innerHTML = '<div class="tools"><input type="search" id="lv-q" placeholder="Tìm việc, nội dung, tiến độ…" value="' + esc(f.q) + '">' +
      '<select id="lv-tt">' + [['mo', 'Đang mở (chưa làm, đang làm)'], ['', 'Tất cả']].concat(TT.map(t => [t, t])).map(([v, t]) => '<option value="' + v + '"' + (v === f.tt ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>' +
      '<select id="lv-ut"><option value="">Mọi mức ưu tiên</option>' + Object.keys(UT).map(k => '<option value="' + k + '"' + (k === f.ut ? ' selected' : '') + '>' + UT[k][0] + '</option>').join('') + '</select></div><div id="lv-bang"></div>';
    const ve = () => {
      f.q = $('lv-q').value.trim(); f.tt = $('lv-tt').value; f.ut = $('lv-ut').value; S.lvLoc = f;
      const q = Q.boDau(f.q), hn = homNay(), thu = { gap: 0, quan_trong: 1, thuong: 2 };
      const l = D.ds.filter(x => x.loai === 'viec' && (!f.tt || (f.tt === 'mo' ? mo(x) : x.trang_thai === f.tt)) && (!f.ut || x.uu_tien === f.ut) &&
        (!q || Q.boDau([x.tieu_de, x.noi_dung, x.ten_chu, x.ten_giao].concat(x.nk.map(n => n.noi_dung)).join(' ')).indexOf(q) >= 0))
        .sort((a, b) => { const qa = mo(a) && a.ngay && a.ngay < hn ? 1 : 0, qb = mo(b) && b.ngay && b.ngay < hn ? 1 : 0; // quá hạn → đang mở → ưu tiên → hạn sớm
          return qb - qa || mo(b) - mo(a) || (thu[a.uu_tien] || 2) - (thu[b.uu_tien] || 2) || ((a.ngay || '9') < (b.ngay || '9') ? -1 : (a.ngay || '9') > (b.ngay || '9') ? 1 : 0); });
      $('lv-bang').innerHTML = !l.length ? '<div class="card empty">Không có việc nào.</div>' : '<div class="tbl-wrap"><table><thead><tr><th>Việc</th>' + (S.lvChu === '*' ? '<th>Thành viên</th>' : '') +
        '<th>Ưu tiên</th><th>Hạn</th><th>Trạng thái</th><th>Tiến độ gần nhất</th></tr></thead><tbody>' + l.map(x => {
          const qh = mo(x) && x.ngay && x.ngay < hn, nk = x.nk[0];
          return '<tr class="click' + (qh ? ' lv-qh' : '') + '" data-x="' + esc(x.id) + '"><td><b>' + esc(x.tieu_de) + '</b>' + (x.giao_boi ? ' <span class="tag t-info">' + (moiGiao(x) ? 'Mới giao' : 'Giao') + ' bởi ' + esc(x.ten_giao) + '</span>' : '') +
            (x.noi_dung ? '<div class="note">' + esc(x.noi_dung.slice(0, 120)) + '</div>' : '') + '</td>' + (S.lvChu === '*' ? '<td>' + esc(x.ten_chu) + '</td>' : '') + '<td>' + tagUT(x.uu_tien) + '</td>' +
            '<td style="white-space:nowrap">' + (x.ngay ? ngayVN(x.ngay) + (qh ? ' <span class="tag t-bad">quá hạn</span>' : x.ngay === hn ? ' <span class="tag t-warn">hôm nay</span>' : '') : '—') + '</td><td>' + tagTT(x.trang_thai) +
            (x.xong_luc ? '<div class="note">' + ngayVN(x.xong_luc) + '</div>' : '') + '</td><td class="note">' + (nk ? ngayVN(nk.tg) + ' – ' + esc(String(nk.noi_dung || nk.ten_tep).slice(0, 90)) + ' (' + x.nk.length + ')' : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      ganMo($('lv-bang'));
    };
    $('lv-q').oninput = ve; $('lv-tt').onchange = ve; $('lv-ut').onchange = ve; ve();
  }

  // ---------------- Hộp thêm / sửa ----------------
  function hopSua(x) {
    const lich = x.loai === 'lich', sua = !!x.id;
    const giao = laAdmin() && D.thanh_vien ? o('chu', lich ? 'Lịch của' : 'Giao cho', { v: x.chu || (S.lvChu && S.lvChu !== '*' ? S.lvChu : toi()), select: D.thanh_vien.map(t => [t.email, t.ten + (t.email === toi() ? ' (tôi)' : '')]) }) : '';
    moHop('<h2>' + (sua ? 'Sửa ' : 'Thêm ') + (lich ? 'lịch hẹn' : 'việc') + '</h2><form id="lv-f"><div class="form-grid">' +
      o('tieu_de', lich ? 'Tiêu đề lịch hẹn' : 'Việc cần làm', { v: x.tieu_de, req: 1, full: 1, ph: lich ? 'VD: Họp bộ môn, kiểm kê kho cuối tháng' : 'VD: Lập báo cáo kiểm kê thiết bị năm 2026' }) +
      (lich ? o('ngay', 'Ngày', { type: 'date', v: x.ngay || homNay(), req: 1 }) + o('gio', 'Giờ bắt đầu (trống = cả ngày)', { type: 'time', v: x.gio }) + o('gio_ket', 'Giờ kết thúc', { type: 'time', v: x.gio_ket }) +
          o('dia_diem', 'Địa điểm', { v: x.dia_diem, ph: 'VD: Phòng D11.03' }) + o('lap', 'Lặp lại', { v: x.lap || '', select: LAP }) + o('lap_den', 'Lặp đến ngày (trống = không hết)', { type: 'date', v: x.lap_den })
        : o('ngay', 'Hạn hoàn thành', { type: 'date', v: x.ngay }) + o('gio', 'Giờ (để nhắc, trống = 8:00)', { type: 'time', v: x.gio }) + o('uu_tien', 'Ưu tiên', { v: x.uu_tien || 'thuong', select: Object.keys(UT).map(k => [k, UT[k][0]]) })) +
      o('nhac', 'Nhắc trong web', { v: x.nhac != null ? x.nhac : lich ? '15' : '1440', select: NHAC }) + giao +
      o('noi_dung', 'Nội dung – ghi chú', { v: x.noi_dung, area: 1, full: 1 }) + '</div>' +
      '<div class="modal-foot">' + (sua ? '<button type="button" class="btn red o" id="lv-xoa" style="margin-right:auto">Xóa</button>' : '') + '<button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (m) => {
      const f = m.querySelector('#lv-f');
      f.onsubmit = async (e) => {
        e.preventDefault(); const v = giaTri(f);
        await chay(e.submitter, () => api('lv_luu', { x: Object.assign({ id: x.id, loai: x.loai }, v) }));
        dongHop(); toast(v.chu && v.chu !== toi() && !lich && !sua ? 'Đã giao việc' : 'Đã lưu'); xong();
      };
      if (m.querySelector('#lv-xoa')) m.querySelector('#lv-xoa').onclick = (e) => xoa(x, e.target);
    });
  }
  async function xoa(x, nut) {
    if (!confirm('Xóa ' + (x.loai === 'lich' ? 'lịch hẹn' + (x.lap ? ' (mọi lần lặp)' : '') : 'việc và toàn bộ nhật ký tiến độ') + ' "' + x.tieu_de + '"?')) return;
    await chay(nut, () => api('lv_xoa', { id: x.id })); dongHop(); toast('Đã xóa'); xong();
  }
  // tải lại sau khi ghi: số đếm + vẽ lại trang Lịch & việc
  async function xong() { taiNen(); if (/^#\/lich-viec/.test(location.hash)) await dieuHuong(); }

  function hopLich(x) {
    moHop('<h2>⏰ ' + esc(x.tieu_de) + '</h2><p>' + (x.lap ? '<b>' + esc((LAP.find(l => l[0] === x.lap) || [])[1]) + '</b> từ ' + ngayVN(x.ngay) + (x.lap_den ? ' đến ' + ngayVN(x.lap_den) : '') : ngayVN(x.ngay)) + ' · ' + esc(gioCua(x)) +
      (x.dia_diem ? ' · ' + esc(x.dia_diem) : '') + '</p><p class="note">Nhắc: ' + esc((NHAC.find(n => n[0] === String(x.nhac || '')) || NHAC[0])[1]) + (S.lvChu === '*' || x.chu !== toi() ? ' · Lịch của ' + esc(x.ten_chu) : '') + (x.giao_boi ? ' · ' + esc(x.ten_giao) + ' tạo' : '') + '</p>' +
      (x.noi_dung ? '<div class="card" style="white-space:pre-wrap">' + esc(x.noi_dung) + '</div>' : '') +
      '<div class="modal-foot">' + (suaDuoc(x) ? '<button type="button" class="btn red o" id="lv-xoa" style="margin-right:auto">Xóa</button><button type="button" class="btn o" id="lv-sua">Sửa</button>' : '') + '<button type="button" class="btn o" data-dong>Đóng</button></div>', (m) => {
      if (m.querySelector('#lv-sua')) m.querySelector('#lv-sua').onclick = () => hopSua(x);
      if (m.querySelector('#lv-xoa')) m.querySelector('#lv-xoa').onclick = (e) => xoa(x, e.target);
    });
  }

  // chi tiết việc: trạng thái, nhật ký tiến độ (ghi thêm, đính kèm tệp), sửa / xóa
  function hopViec(x) {
    if (moiGiao(x)) { api('lv_da_xem', { id: x.id }).then(() => { x.da_xem = 'Có'; taiNen(); }).catch(() => { /* lần sau */ }); }
    const hn = homNay(), qh = mo(x) && x.ngay && x.ngay < hn;
    moHop('<h2>☑ ' + esc(x.tieu_de) + '</h2><p>' + tagUT(x.uu_tien) + ' ' + tagTT(x.trang_thai) + ' · Hạn: <b>' + (x.ngay ? ngayVN(x.ngay) + (x.gio ? ' ' + x.gio : '') : 'không đặt') + '</b>' + (qh ? ' <span class="tag t-bad">quá hạn</span>' : '') +
      (x.xong_luc ? ' · xong ' + ngayVN(x.xong_luc) : '') + '</p><p class="note">' + (x.chu !== toi() ? 'Việc của <b>' + esc(x.ten_chu) + '</b> · ' : '') + (x.giao_boi ? esc(x.ten_giao) + ' giao' + (x.chu === toi() && !laAdmin() ? ' – bạn đổi trạng thái và ghi tiến độ; sửa nội dung, hạn: liên hệ admin' : '') + ' · ' : '') + 'tạo ' + ngayVN(x.tao) + '</p>' +
      (x.noi_dung ? '<div class="card" style="white-space:pre-wrap">' + esc(x.noi_dung) + '</div>' : '') +
      '<div class="lv-tt-nut"><span class="note">Trạng thái:</span> ' + TT.map(t => '<button type="button" class="btn sm' + (t === x.trang_thai ? '' : ' o') + '" data-tt="' + t + '"' + (t === x.trang_thai ? ' disabled' : '') + '>' + t + '</button>').join(' ') + '</div>' +
      '<h3 style="margin:14px 0 6px">Nhật ký tiến độ (' + x.nk.length + ')</h3><form id="lv-nk" class="lv-nk-f"><textarea name="noi_dung" placeholder="Hôm nay đã làm gì, kết quả, vướng mắc…"></textarea>' +
      '<div class="lv-nk-hang"><input type="file" name="tep"><button class="btn sm">Ghi tiến độ</button></div></form>' +
      (x.nk.length ? '<div class="lv-tl">' + x.nk.map(n => '<div class="lv-tl-dong"><div class="note">' + ngayVN(n.tg) + ' · ' + esc(n.nguoi) + (laAdmin() || n.email === toi() ? ' <button type="button" class="lv-x" data-xnk="' + esc(n.id) + '" title="Xóa dòng này">×</button>' : '') + '</div>' +
        (n.noi_dung ? '<div style="white-space:pre-wrap">' + esc(n.noi_dung) + '</div>' : '') + (n.tep ? '<div>📎 <a href="#" data-tep="' + esc(n.tep) + '">' + esc(n.ten_tep || 'Tệp đính kèm') + '</a></div>' : '') + '</div>').join('') + '</div>' : '<p class="note">Chưa ghi tiến độ.</p>') +
      '<div class="modal-foot">' + (suaDuoc(x) ? '<button type="button" class="btn red o" id="lv-xoa" style="margin-right:auto">Xóa việc</button><button type="button" class="btn o" id="lv-sua">Sửa</button>' : '') + '<button type="button" class="btn o" data-dong>Đóng</button></div>', (m) => {
      const moLai = async (tb) => { toast(tb); await taiNen(); const d = await api('lv_ds', laAdmin() && S.lvChu ? { chu: S.lvChu } : {}); D = d; const y = D.ds.find(z => z.id === x.id); if (y) hopViec(y); veTab(); };
      m.querySelectorAll('[data-tt]').forEach(b => { b.onclick = async (e) => {
        const tt = b.dataset.tt, gc = tt === 'Hoãn' ? prompt('Lý do hoãn (có thể để trống):') : '';
        if (gc === null) return;
        await chay(e.target, () => api('lv_tt', { id: x.id, trang_thai: tt, ghi_chu: gc })); await moLai('Đã chuyển "' + tt + '"');
      }; });
      const f = m.querySelector('#lv-nk');
      f.onsubmit = async (e) => {
        e.preventDefault(); const nd = f.noi_dung.value.trim(), tep = f.tep.files[0];
        if (!nd && !tep) { toast('Nhập nội dung tiến độ hoặc chọn tệp', true); return; }
        if (tep && tep.size > 15 * 1024 * 1024) { toast('Tệp lớn hơn 15 MB', true); return; }
        await chay(e.submitter, async () => api('lv_nk', { viec: x.id, noi_dung: nd, tep: tep ? { ten: tep.name, mime: tep.type || 'application/octet-stream', b64: await docB64(tep) } : null }));
        await moLai('Đã ghi tiến độ');
      };
      m.querySelectorAll('[data-xnk]').forEach(b => { b.onclick = async () => { if (!confirm('Xóa dòng nhật ký này?')) return; await chay(null, () => api('lv_nk_xoa', { id: b.dataset.xnk })); await moLai('Đã xóa dòng nhật ký'); }; });
      m.querySelectorAll('[data-tep]').forEach(a => { a.onclick = async (e) => { e.preventDefault(); const t = await chay(null, () => api('lv_tep_tai', { id: a.dataset.tep })); taiB64(t); }; });
      if (m.querySelector('#lv-sua')) m.querySelector('#lv-sua').onclick = () => hopSua(x);
      if (m.querySelector('#lv-xoa')) m.querySelector('#lv-xoa').onclick = (e) => xoa(x, e.target);
    });
  }
  function veTab() { if (!$('lv-nd')) return; const t = (location.hash.split('/')[2] || ''); (t === 'lich' ? veLich : t === 'viec' ? veViec : veHomNay)(); }
  function taiB64(f) {
    const bin = atob(f.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: f.mime })); a.download = f.ten; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }

  // ---------------- Xuất Excel nhật ký công việc ----------------
  function hopXuat() {
    const hn = homNay(), d = dPar(hn), t2 = cong(hn, -((d.getDay() + 6) % 7)), dauT = hn.slice(0, 8) + '01', truoc = thangCong(dauT, -1);
    const KY = [['tuan', 'Tuần này (' + ngayVN(t2) + ' – ' + ngayVN(cong(t2, 6)) + ')', t2, cong(t2, 6)], ['tuan_truoc', 'Tuần trước', cong(t2, -7), cong(t2, -1)],
      ['thang', 'Tháng này', dauT, cong(thangCong(dauT, 1), -1)], ['thang_truoc', 'Tháng trước', truoc, cong(dauT, -1)], ['tuy', 'Tùy chọn từ – đến', '', '']];
    moHop('<h2>⇩ Xuất Excel nhật ký công việc</h2><p class="note">Phạm vi: ' + (S.lvChu === '*' ? 'tất cả thành viên' : S.lvChu ? esc(((D.thanh_vien || []).find(t => t.email === S.lvChu) || {}).ten || S.lvChu) : 'của tôi') +
      (laAdmin() ? ' (đổi ở ô "Xem của")' : '') + '. File gồm 3 trang tính: Việc (việc có hạn, có tiến độ hoặc xong trong kỳ; việc còn mở), Nhật ký tiến độ, Lịch hẹn.</p>' +
      '<form id="lv-x" class="form-grid">' + o('ky', 'Kỳ', { v: 'tuan', select: KY.map(k => [k[0], k[1]]) }) + o('tu', 'Từ ngày', { type: 'date', v: t2 }) + o('den', 'Đến ngày', { type: 'date', v: cong(t2, 6) }) +
      '<div class="modal-foot full"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tải Excel</button></div></form>', (m) => {
      const f = m.querySelector('#lv-x');
      f.ky.onchange = () => { const k = KY.find(y => y[0] === f.ky.value); if (k[2]) { f.tu.value = k[2]; f.den.value = k[3]; } };
      f.onsubmit = async (e) => { e.preventDefault(); if (!f.tu.value || !f.den.value || f.den.value < f.tu.value) { toast('Chọn khoảng ngày hợp lệ', true); return; } await chay(e.submitter, () => xuatExcel(f.tu.value, f.den.value)); dongHop(); };
    });
  }
  async function xuatExcel(tu, den) {
    const X = await napXlsx(), ds = D.ds, trong = (s) => s && s.slice(0, 10) >= tu && s.slice(0, 10) <= den, nguoi = S.lvChu === '*' ? 'Tất cả thành viên' : ds[0] ? ds[0].ten_chu : S.toi.nguoi.ten;
    const dau = (ten) => [[ten + ' – ' + nguoi], ['Từ ' + ngayVN(tu) + ' đến ' + ngayVN(den) + ' · xuất lúc ' + ngayVN(homNay())], []];
    const viec = ds.filter(x => x.loai === 'viec' && (trong(x.ngay) || trong(x.xong_luc) || x.nk.some(n => trong(n.tg)) || (mo(x) && String(x.tao).slice(0, 10) <= den)));
    const a1 = dau('SỔ VIỆC').concat([['STT', 'Thành viên', 'Việc', 'Ưu tiên', 'Hạn', 'Trạng thái', 'Xong lúc', 'Giao bởi', 'Số dòng tiến độ trong kỳ', 'Tiến độ gần nhất', 'Nội dung']])
      .concat(viec.map((x, i) => { const nk = x.nk.filter(n => trong(n.tg)); return [i + 1, x.ten_chu, x.tieu_de, (UT[x.uu_tien] || UT.thuong)[0], x.ngay ? ngayVN(x.ngay) : '', x.trang_thai + (mo(x) && x.ngay && x.ngay < homNay() ? ' (quá hạn)' : ''),
        x.xong_luc ? ngayVN(x.xong_luc) : '', x.ten_giao || '', nk.length, nk[0] ? ngayVN(nk[0].tg) + ' – ' + (nk[0].noi_dung || nk[0].ten_tep) : '', x.noi_dung || '']; }));
    const nk = []; ds.forEach(x => x.nk.filter(n => trong(n.tg)).forEach(n => nk.push([n.tg, x.ten_chu, x.tieu_de, n.noi_dung + (n.ten_tep ? (n.noi_dung ? ' ' : '') + '[tệp: ' + n.ten_tep + ']' : ''), n.nguoi])));
    nk.sort((a, b) => a[0] < b[0] ? -1 : 1);
    const a2 = dau('NHẬT KÝ TIẾN ĐỘ').concat([['STT', 'Thời gian', 'Thành viên', 'Việc', 'Nội dung', 'Người ghi']]).concat(nk.map((r, i) => [i + 1, ngayVN(r[0])].concat(r.slice(1))));
    const li = []; ds.forEach(x => lan(x, tu, den).forEach(n => li.push([n, x])));
    li.sort((a, b) => (a[0] + (a[1].gio || '')) < (b[0] + (b[1].gio || '')) ? -1 : 1);
    const a3 = dau('LỊCH HẸN').concat([['STT', 'Ngày', 'Giờ', 'Thành viên', 'Lịch hẹn', 'Địa điểm', 'Lặp lại', 'Ghi chú']])
      .concat(li.map(([n, x], i) => [i + 1, ngayVN(n), gioCua(x), x.ten_chu, x.tieu_de, x.dia_diem || '', (LAP.find(l => l[0] === x.lap) || LAP[0])[1], x.noi_dung || '']));
    const wb = X.utils.book_new(), them = (a, ten, rong) => { const ws = X.utils.aoa_to_sheet(a); ws['!cols'] = rong.map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, ten); };
    them(a1, 'Viec', [5, 20, 40, 11, 11, 18, 16, 18, 10, 50, 40]); them(a2, 'Nhat ky tien do', [5, 17, 20, 40, 70, 20]); them(a3, 'Lich hen', [5, 11, 12, 20, 40, 20, 12, 40]);
    X.writeFile(wb, 'NHAT KY CONG VIEC ' + tu + ' den ' + den + '.xlsx');
    toast('Đã xuất ' + viec.length + ' việc, ' + nk.length + ' dòng tiến độ, ' + li.length + ' lịch hẹn');
  }

  Q.TUYEN['lich-viec'] = manLichViec;
  window.PTN_LICH_VIEC = { batNhac, khungHomNay, lan };
  if (S.tk && $('nav')) batNhac(); // trang đã dựng khung trước khi tệp này nạp
})();
