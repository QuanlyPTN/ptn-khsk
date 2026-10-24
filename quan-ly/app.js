/* Trang quản lý PTN – Khoa Khoa học Sức khỏe. Khung trang + giai đoạn 1, 4; các trang giai đoạn 2 – 6 ở app-mo-rong.js. */
(function () {
  'use strict';
  const DEMO = typeof window.PTN_DEMO === 'function';
  const KHOA_TK = 'khsk_ql_tk';
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const S = { tk: null, toi: null, dm: null, cache: {} };
  const $ = (id) => document.getElementById(id);

  // ---------------- Tiện ích ----------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function homNay() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function congNgay(n) { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function ngayVN(s) { const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(s || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] + m[4] : (s || ''); }
  function tien(s) { const n = parseInt(String(s || '').replace(/\D/g, ''), 10); return n ? n.toLocaleString('vi-VN') + ' đ' : ''; }
  function boDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function toast(msg, bad) { const t = $('toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'toast hide'; }, bad ? 5000 : 2600); }
  function tenMay() {
    const u = navigator.userAgent;
    const os = /iPhone|iPad/.test(u) ? 'iPhone/iPad' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Máy khác';
    const br = /Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : /Firefox\//.test(u) ? 'Firefox' : 'Trình duyệt';
    return os + ' – ' + br;
  }
  function luuTk(tk, nho) {
    try { localStorage.removeItem(KHOA_TK); sessionStorage.removeItem(KHOA_TK); (nho ? localStorage : sessionStorage).setItem(KHOA_TK, tk); } catch (e) { /* trình duyệt chặn lưu trữ */ }
  }
  function docTk() { try { return localStorage.getItem(KHOA_TK) || sessionStorage.getItem(KHOA_TK); } catch (e) { return null; } }
  function xoaTk() { try { [localStorage, sessionStorage].forEach(k => { k.removeItem(KHOA_TK); k.removeItem(KHOA_TOI); }); } catch (e) { /* bỏ qua */ } }
  // Lưu thông tin "tôi" (tên, quyền, danh mục) cùng chỗ với phiên: lần mở sau hiện trang ngay, máy chủ trả lời thì cập nhật lại
  const KHOA_TOI = 'khsk_ql_toi';
  function luuToi(r) { try { const k = localStorage.getItem(KHOA_TK) === S.tk ? localStorage : sessionStorage; k.setItem(KHOA_TOI, JSON.stringify({ tk: String(S.tk).slice(-12), r })); } catch (e) { /* bỏ qua */ } }
  function docToi() { try { const o = JSON.parse(localStorage.getItem(KHOA_TOI) || sessionStorage.getItem(KHOA_TOI) || 'null'); return o && o.tk === String(S.tk).slice(-12) ? o.r : null; } catch (e) { return null; } }

  const MAU_TT = { 'Đang sử dụng': 't-ok', 'Đang cho mượn': 't-info', 'Hỏng – chờ sửa': 't-bad', 'Đang sửa': 't-warn', 'Ngưng sử dụng': 't-gray', 'Đã thanh lý': 't-gray' };
  const tag = (tt) => '<span class="tag ' + (MAU_TT[tt] || 't-gray') + '">' + esc(tt) + '</span>';
  function hanTag(ngay) {
    if (!ngay) return '<span class="note">—</span>';
    const hn = homNay();
    if (ngay < hn) return '<span class="tag t-bad">' + ngayVN(ngay) + ' · quá hạn</span>';
    if (ngay <= congNgay(30)) return '<span class="tag t-warn">' + ngayVN(ngay) + '</span>';
    if (ngay <= congNgay(60)) return '<span class="tag t-info">' + ngayVN(ngay) + '</span>';
    return ngayVN(ngay);
  }

  // ---------------- Gọi máy chủ ----------------
  async function api(act, data) {
    const body = Object.assign({ act, tk: S.tk }, data || {});
    let j;
    if (DEMO) j = window.PTN_DEMO(body);
    else {
      if (!window.PTN_API || window.PTN_API.indexOf('http') !== 0) throw new Error('Chưa cấu hình địa chỉ máy chủ (config.js)');
      let r;
      try { r = await fetch(window.PTN_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' }); }
      catch (e) { throw new Error(navigator.onLine === false ? 'Không có kết nối mạng' : 'Không kết nối được máy chủ'); }
      j = await r.json();
    }
    if (!j.ok) {
      if (j.code === 'AUTH' && act !== 'dang_nhap') { xoaTk(); S.tk = null; manDangNhap(j.err); }
      throw new Error(j.err || 'Lỗi máy chủ');
    }
    return j.r;
  }
  // chạy một thao tác có nút bấm: khóa nút, báo lỗi
  async function chay(btn, fn) {
    const cu = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý…'; }
    try { return await fn(); }
    catch (e) { toast(e.message, true); throw e; }
    finally { if (btn) { btn.disabled = false; btn.textContent = cu; } }
  }

  // ---------------- Hộp thoại ----------------
  function moHop(html, onOpen) {
    $('modal-body').innerHTML = html; $('modal').classList.remove('hide');
    if (document.body.classList.contains('chi-xem')) anNutGhi($('modal-body'));
    const f = $('modal-body').querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 50);
    if (onOpen) onOpen($('modal-body'));
  }
  function dongHop() { $('modal').classList.add('hide'); $('modal-body').innerHTML = ''; }
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.dataset.dong !== undefined) dongHop(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('modal').classList.contains('hide')) dongHop(); });
  function giaTri(root) {
    const o = {};
    root.querySelectorAll('[name]').forEach(el => { o[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
    return o;
  }
  function o(name, label, opts) {
    opts = opts || {};
    const req = opts.req ? ' <em>*</em>' : '';
    const v = esc(opts.v == null ? '' : opts.v);
    let input;
    if (opts.select) input = '<select name="' + name + '" style="width:100%">' + opts.select.map(x => { const val = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(val) + '"' + (String(val) === String(opts.v || '') ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>';
    else if (opts.area) input = '<textarea name="' + name + '" placeholder="' + esc(opts.ph || '') + '">' + v + '</textarea>';
    else input = '<input type="' + (opts.type || 'text') + '" name="' + name + '" value="' + v + '" placeholder="' + esc(opts.ph || '') + '"' + (opts.extra || '') + '>';
    return '<label class="f' + (opts.full ? ' full' : '') + '"><span>' + esc(label) + req + '</span>' + input + (opts.help ? '<span class="note">' + esc(opts.help) + '</span>' : '') + '</label>';
  }

  // ---------------- Biểu tượng (nét mảnh, 24×24) ----------------
  const ICON = {
    'tong-quan': '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    'don': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'de-tai': '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    'phong': '<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-6h6v6"/><path d="M9 8h.01M15 8h.01M9 11.5h.01M15 11.5h.01"/>',
    'tai-san': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
    'kiem-dinh': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    'hoa-chat': '<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
    'kho': '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    'kho-dl': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    'bien-ban': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    'bao-cao': '<path d="M3 3v18h18"/><path d="M8 17v-6"/><path d="M13 17V7"/><path d="M18 17v-4"/>',
    'so': '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M8 7h8M8 11h8"/>',
    'bieu-mau': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    'don-qr': '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    'cai-dat': '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    'can-bo': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    'nhat-ky': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    'tai-khoan': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    'menu': '<path d="M4 6h16M4 12h16M4 18h16"/>', 'thoat': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    'kiem': '<path d="M20 6 9 17l-5-5"/>', 'qr': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'
  };
  const icon = (k, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[k] || '') + '</svg>';

  // ---------------- Đăng nhập ----------------
  function logo() { return '<img src="../icon-192.png" alt="">'; }
  function manDangNhap(thongBao) {
    document.body.classList.remove('in');
    $('app').innerHTML = (DEMO ? '<div class="demo-bar">' + thanhDemo() + ' Admin: <b>nguyen.phu789@gmail.com</b> / <b>123456</b> · Thử phân quyền: <b>canbo.hoachat@gmail.com</b> / <b>HoaChat2026</b>, <b>canbo.xem@gmail.com</b> / <b>ChiXem2026</b>, <b>canbo.ptn@gmail.com</b> / <b>CanBo2026</b></div>' : '') +
      '<div class="login"><section class="login-hero"><div class="brand">' + logo() + '<div><small>Đại học Công nghiệp TP. Hồ Chí Minh</small><b>Khoa Khoa học Sức khỏe</b></div></div>' +
      '<div style="position:relative;z-index:1"><div class="vach"></div><h1>Hệ thống quản lý<br><span>Phòng thí nghiệm</span></h1><p>Tài sản – thiết bị, đơn đăng ký QR1 – QR8, hồ sơ đề tài, hóa chất – vật tư, biên bản bàn giao và báo cáo trên một nền tảng.</p>' +
      '<ul><li>' + icon('kiem') + 'Đơn đăng ký qua một mã QR tổng</li><li>' + icon('kiem') + 'Dự trù, biên bản bàn giao tự động theo thời khóa biểu</li><li>' + icon('kiem') + 'Theo dõi thiết bị, kho hóa chất – dược liệu theo thời gian thực</li></ul></div>' +
      '<small class="chan">© Khoa Khoa học Sức khỏe – IUH</small></section><div class="login-form"><form class="login-box" id="f-login" autocomplete="on">' +
      '<h2>Đăng nhập</h2><p class="note" style="margin:0 0 22px">Dành cho cán bộ phòng thí nghiệm: đăng nhập bằng <b>Gmail cá nhân</b> và <b>mật khẩu do admin cấp</b>.</p>' +
      o('email', 'Gmail cá nhân', { type: 'email', v: (DEMO ? 'nguyen.phu789@gmail.com' : ''), ph: 'ten.canbo@gmail.com', extra: ' autocomplete="username" required' }) +
      '<div class="mk-o">' + o('mat_khau', 'Mật khẩu', { type: 'password', v: (DEMO ? '123456' : ''), extra: ' autocomplete="current-password" required' }) + '<button type="button" class="mk-hien" title="Hiện / ẩn mật khẩu">👁</button></div>' +
      '<label class="check"><input type="checkbox" name="ghi_nho" checked> Ghi nhớ đăng nhập trên máy này</label>' +
      '<div class="err" id="login-err">' + esc(thongBao || '') + '</div>' +
      '<button class="btn">Đăng nhập</button>' +
      '<p class="note" style="margin-top:16px">Quên mật khẩu: liên hệ admin để được cấp lại. Máy dùng chung: bỏ chọn "Ghi nhớ" và bấm Thoát khi dùng xong.</p></form></div></div>';
    ganHienMatKhau($('f-login'));
    $('f-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = giaTri(e.target), btn = e.target.querySelector('button');
      $('login-err').textContent = '';
      try {
        const r = await chay(btn, () => api('dang_nhap', { email: v.email, mat_khau: v.mat_khau, ghi_nho: v.ghi_nho, may: tenMay() }));
        S.tk = r.tk; luuTk(r.tk, v.ghi_nho); await batDau();
      } catch (err) { $('login-err').textContent = err.message; }
    });
  }

  // nút 👁 hiện / ẩn mật khẩu trong một form
  function ganHienMatKhau(root) {
    root.querySelectorAll('.mk-hien').forEach(b => { b.onclick = () => { const i = b.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; i.focus(); }; });
  }

  async function batDau() {
    S.tk = S.tk || docTk();
    if (!S.tk) return manDangNhap();
    const apToi = (r) => { S.toi = r; S.dm = r.danh_muc; window.PTN_KY = Object.assign({ nguoi: r.nguoi.ten }, r.ky); luuToi(r); };
    const khoaQuyen = (r) => JSON.stringify([r.nguoi, r.quyen]);
    const daLuu = docToi();
    if (daLuu) { // hiện ngay theo lần trước; quyền / vai trò đổi thì vẽ lại khung
      apToi(daLuu); khung(); dieuHuong();
      api('toi').then(r => { const doi = khoaQuyen(r) !== khoaQuyen(S.toi); apToi(r); if (doi) { khung(); dieuHuong(); } }).catch(() => { /* lỗi phiên: api() đã đưa về màn đăng nhập */ });
      return;
    }
    $('app').innerHTML = '<div class="loading"><div class="spin"></div></div>';
    try { apToi(await api('toi')); } catch (e) { if (S.tk) $('app').innerHTML = '<div class="card" style="margin:40px">Không tải được: ' + esc(e.message) + ' <button class="btn sm" onclick="location.reload()">Thử lại</button></div>'; return; }
    khung(); dieuHuong();
  }

  // ---------------- Khung trang ----------------
  const MENU = [
    ['tong-quan', '◧', 'Hôm nay'], ['don', '✉', 'Đơn đăng ký QR1 – QR8'], ['de-tai', '✎', 'Hồ sơ đề tài KLTN – NCKH'], ['phong', '▦', 'Phòng thí nghiệm'], ['tai-san', '⚙', 'Tài sản'],
    ['kiem-dinh', '✓', 'Kiểm định – bảo dưỡng'], ['hoa-chat', '⚗', 'Hóa chất – vật tư'], ['kho', '▣', 'Kho hóa chất D11.01'], ['kho-dl', '❀', 'Kho dược liệu D11'],
    ['bien-ban', '▤', 'Biên bản bàn giao'], ['bao-cao', '▥', 'Báo cáo – thống kê'], ['so', '☷', 'Sổ theo dõi – in ấn'], ['bieu-mau', '⎙', 'Biểu mẫu PTN'],
    ['don-qr', '✉', 'Đơn cũ (Google Form)'], ['cai-dat', '⚑', 'Cài đặt – mã QR tổng', 1], ['can-bo', '☺', 'Cán bộ', 1], ['nhat-ky', '☰', 'Nhật ký', 1], ['tai-khoan', '⚿', 'Tài khoản']
  ];
  const NHOM_MENU = { 'tong-quan': 'Vận hành', 'hoa-chat': 'Hóa chất – kho', 'bao-cao': 'Báo cáo – tài liệu', 'don-qr': 'Hệ thống' };
  const TUYEN = {}; // trang do app-mo-rong.js đăng ký: { 'kho': (p) => … }
  // dòng báo chạy thử: demo liên thông (dữ liệu thử lưu trong trình duyệt, dùng chung với trang công khai) + làm lại dữ liệu mẫu
  function thanhDemo() {
    return window.PTN_DEMO_LIEN_THONG ? 'CHẠY THỬ – dữ liệu thử lưu trong trình duyệt này, <b>dùng chung với trang công khai</b> (đơn SV/GV gửi bên đó hiện ở đây). ' +
      '<a href="../chay-thu.html" target="_blank" rel="noopener">Mở trang công khai ↗</a> · <a href="#" onclick="if(confirm(\'Xóa mọi dữ liệu đã nhập thử và tạo lại dữ liệu mẫu (cả trang công khai)?\')){PTN_DEMO_LAM_LAI();location.reload()}return false">Làm lại dữ liệu mẫu</a>.'
      : 'CHẾ ĐỘ CHẠY THỬ – dữ liệu giả lập, mất khi tải lại trang.';
  }
  function laAdmin() { return S.toi && S.toi.nguoi.vai_tro === 'Admin'; }
  // Phân quyền: mỗi mục '' (không thấy) · 'xem' · 'xu_ly'. Admin toàn quyền; mục không phân quyền (Hôm nay, Tài khoản) ai cũng vào được
  function quyen(muc) {
    if (laAdmin()) return 'xu_ly';
    const q = S.toi && S.toi.quyen;
    if (!q || !(muc in q)) return ['cai-dat', 'can-bo', 'nhat-ky'].indexOf(muc) >= 0 ? '' : 'xu_ly';
    return q[muc] || '';
  }
  function coQuyen(muc, md) { const v = quyen(muc); return md === 'xu_ly' ? v === 'xu_ly' : !!v; }
  const MUC_TRANG = { 'ts-tong-quan': 'tai-san' }; // trang con → mục phân quyền
  function khung() {
    document.body.classList.add('in');
    const n = S.toi.nguoi;
    $('app').innerHTML = (DEMO ? '<div class="demo-bar">' + thanhDemo() + '</div>' : '') +
      '<div class="layout"><aside class="side" id="side"><div class="brand">' + logo() + '<div><small>KHOA KHOA HỌC SỨC KHỎE</small><b>Quản lý PTN</b></div></div>' +
      '<nav class="nav" id="nav">' + MENU.filter(m => m[3] ? laAdmin() : coQuyen(m[0], 'xem')).map(m => (NHOM_MENU[m[0]] ? '<div class="nav-nhom"><span>' + NHOM_MENU[m[0]] + '</span></div>' : '') +
        '<a href="#/' + m[0] + '" data-m="' + m[0] + '" title="' + esc(m[2]) + '"><span class="ico">' + icon(m[0]) + '</span>' + m[2] + '</a>').join('') + '</nav>' +
      '<div class="side-foot"><div class="av">' + esc((n.ten || '?').trim().split(' ').pop().charAt(0)) + '</div><div class="ai"><div class="who">' + esc(n.ten) + '</div><div class="role">' + esc(n.vai_tro) + ' · ' + esc(n.email) + '</div></div>' +
      '<button id="b-thoat" title="Thoát">' + icon('thoat') + '</button></div></aside>' +
      '<main class="main" id="main"></main></div>';
    $('b-thoat').onclick = async () => { if (!confirm('Thoát khỏi hệ thống trên máy này?')) return; try { await api('dang_xuat'); } catch (e) { /* phiên đã hết */ } xoaTk(); S.tk = null; manDangNhap(); };
    $('nav').addEventListener('click', () => $('side').classList.remove('open'));
  }
  // danh sách để đi Trước / Tiếp ở trang chi tiết (trang danh sách gọi ganDieuHuong với các liên kết đang hiển thị)
  function ganDieuHuong(ds, ten) { S.dh = { ds: ds.slice(), ten }; }
  function nutDieuHuong() {
    const h = location.hash.split('?')[0], d = S.dh, i = d ? d.ds.indexOf(h) : -1;
    const lui = location.hash.replace(/^#\/?/, '').split('/')[0] !== 'tong-quan' ? '<button class="btn o sm" id="b-lui" title="Quay lại trang trước">← Quay lại</button>' : '';
    if (i < 0) return lui;
    return lui + '<span class="nav-ds"><a class="btn o sm' + (i ? '' : ' tat') + '" href="' + (d.ds[i - 1] || '#') + '" title="Mục trước">‹ Trước</a><span class="note">' + (i + 1) + ' / ' + d.ds.length + (d.ten ? ' ' + esc(d.ten) : '') + '</span>' +
      '<a class="btn o sm' + (i < d.ds.length - 1 ? '' : ' tat') + '" href="' + (d.ds[i + 1] || '#') + '" title="Mục tiếp theo">Tiếp ›</a></span>';
  }
  function trang(tieuDe, nutPhai, crumb) {
    const muc = S.muc, chiXem = muc && quyen(muc) === 'xem';
    document.body.classList.toggle('chi-xem', !!chiXem);
    $('main').innerHTML = '<div class="dh-thanh">' + nutDieuHuong() + '</div>' + (chiXem ? '<div class="chi-xem-bar">👁 Bạn có quyền <b>chỉ xem</b> mục này (xem, in, tải file). Cần nhập / sửa / duyệt: liên hệ admin để được cấp quyền xử lý.</div>' : '') + '<div class="top"><div>' + (crumb ? '<div class="crumb">' + crumb + '</div>' : '') + '<h1>' + tieuDe + '</h1></div><div class="btns"><button class="btn o sm menu-btn" id="b-menu">' + icon('menu') + ' Menu</button>' + (nutPhai || '') +
      '<button class="btn o sm" id="b-xuat-trang" title="Bảng đang hiển thị theo biểu mẫu chuẩn: xem trước, in hoặc tải Excel" hidden>🖨 In / tải Excel</button></div></div><div id="nd"><div class="loading"><div class="spin"></div></div></div>';
    $('b-menu').onclick = () => $('side').classList.toggle('open');
    const nd = $('nd'), nutX = $('b-xuat-trang');
    new MutationObserver(() => { nutX.hidden = !nd.querySelector('table'); if (chiXem) anNutGhi(nd); }).observe(nd, { childList: true, subtree: true });
    if (chiXem) anNutGhi($('main'));
    nutX.onclick = (e) => chay(e.target, () => xuatBangTrang(nd));
    if ($('b-lui')) $('b-lui').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/tong-quan'; };
    window.scrollTo(0, 0);
    return $('nd');
  }
  // Chế độ chỉ xem: ẩn các nút nhập / sửa / duyệt… (máy chủ vẫn chặn nếu gọi thẳng); nút xem, in, tải file giữ nguyên
  const NUT_GHI = /^\s*(\+|⇪|Thêm|Sửa|Xóa|Lưu|Ghi|Nhập|Duyệt|Từ chối|Cấp|Tải lên|Tải file|Đặt|Xác nhận|Trả|Nhận|Hoàn|Chuyển|Tạo|Gán|Đổi|Xuất kho|Xuất \/|Hủy lô|Điều chỉnh|Kết thúc|Đánh dấu|Cập nhật|Đóng hồ sơ|Gia hạn|Bàn giao|Quét|Đồng bộ)/i;
  function anNutGhi(root) {
    root.querySelectorAll('button, a.btn').forEach(b => { if (!b.dataset.dong && !b.classList.contains('menu-btn') && b.id !== 'b-xuat-trang' && b.id !== 'b-lui' && NUT_GHI.test(b.textContent)) b.classList.add('an-ghi'); });
    root.querySelectorAll('input.o-sua, td input, td select').forEach(i => { i.disabled = true; });
    root.querySelectorAll('[data-ttt]').forEach(x => x.classList.add(x.textContent.trim() === 'đặt' ? 'an-ghi' : 'khoa-ghi')); // đặt tồn tối thiểu (kho): giữ số, bỏ liên kết
  }
  // Nút "In / tải Excel" ở mọi trang: mỗi bảng đang hiển thị thành một biểu mẫu chuẩn (đầu trang, tiêu đề, bảng kẻ ô, ngày lập, chữ ký) → xem trước, in, tải Excel
  function xuatBangTrang(nd) {
    const tieuDe = (($('main').querySelector('h1').firstChild || {}).textContent || 'Du lieu').trim(), dung = {};
    const trangTinh = [...nd.querySelectorAll('table')].filter(tb => tb.offsetParent !== null).map(tb => {
      const h2 = tb.closest('.card') && tb.closest('.card').querySelector('h2'), b = window.PTN_IN.tuBangHtml(tb), con = h2 ? h2.textContent.trim() : '';
      let ten = (con || tieuDe).replace(/[\\/?*[\]:]/g, '-').trim().slice(0, 28) || 'Du lieu', k = ten, i = 1;
      while (dung[k.toLowerCase()]) k = ten + ' ' + (++i);
      dung[k.toLowerCase()] = 1;
      const so = b.cot.map((_, j) => b.dong.some(r => typeof r[j] === 'number') && b.dong.every(r => r.length < 2 || typeof r[j] === 'number' || r[j] === ''));
      return window.PTN_IN.bieuMau({ ten: k, tieuDe: (con && con !== tieuDe ? tieuDe + ' – ' + con : tieuDe).toUpperCase(), phuDe: 'Khoa Khoa học Sức khỏe – ' + b.dong.length + ' dòng, lập ngày ' + ngayVN(homNay()),
        cot: b.cot.map((c, j) => ({ ten: c || ' ', so: so[j] })), dong: b.dong.map(r => r.length === 1 && b.cot.length > 1 ? { nhom: r[0] } : r), nguoiLap: S.toi.nguoi.ten });
    });
    if (!trangTinh.length) return toast('Trang này không có bảng dữ liệu', true);
    window.PTN_IN.xemTruoc({ ten: boDau(tieuDe).replace(/[^a-z0-9]+/gi, ' ').trim() + ' ' + homNay(), trang: trangTinh });
  }
  function dieuHuong() {
    if (!S.toi) return;
    const p = (location.hash.replace(/^#\/?/, '').split('?')[0] || 'tong-quan').split('/');
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.m === p[0]));
    const muc = MUC_TRANG[p[0]] || p[0];
    S.muc = (S.toi.muc_quyen || []).some(m => m[0] === muc) ? muc : '';
    if (S.muc && !coQuyen(S.muc, 'xem')) {
      const nd = trang('Không có quyền truy cập');
      nd.innerHTML = '<div class="card empty">Tài khoản của bạn chưa được cấp quyền xem mục <b>' + esc(((S.toi.muc_quyen || []).find(m => m[0] === muc) || [])[1] || muc) + '</b>. Liên hệ admin để được phân quyền.<br><br><a class="btn sm" href="#/tong-quan">Về trang Hôm nay</a></div>';
      return;
    }
    const r = {
      'tong-quan': manTongQuan, 'ts-tong-quan': manTongQuan, 'phong': () => p[1] ? manPhong(decodeURIComponent(p[1])) : manDsPhong(),
      'tai-san': () => p[1] ? manThietBi(decodeURIComponent(p[1])) : manTaiSan(), 'kiem-dinh': manKiemDinh,
      'can-bo': manCanBo, 'nhat-ky': manNhatKy, 'tai-khoan': manTaiKhoan,
      'don-qr': () => manDonQR(p[1] || 'QR1'), 'bieu-mau': manBieuMau,
      'de-tai': () => manSapCo('de-tai'), 'bao-cao': () => manSapCo('bao-cao'),
      'hoa-chat': () => manHoaChat(p[1] || 'hoc-ky', p[2] ? decodeURIComponent(p[2]) : ''),
    };
    Object.keys(TUYEN).forEach(k => { r[k] = () => TUYEN[k](p); });
    const f = r[p[0]] || r['tong-quan'];
    Promise.resolve(f()).catch(e => { const nd = $('nd'); if (nd) nd.innerHTML = '<div class="card">Lỗi: ' + esc(e.message) + '</div>'; });
  }
  window.addEventListener('hashchange', dieuHuong);
  const phongTen = (ma) => { const p = (S.dm.phong || []).find(x => x.ma === ma); return p ? p.ten : ''; };
  const dsPhongChon = (rong) => (rong ? [['', rong]] : []).concat((S.dm.phong || []).map(p => [p.ma, p.ma + ' – ' + p.ten]));

  // ---------------- Tổng quan ----------------
  async function manTongQuan() {
    const nd = trang('Tổng quan tài sản');
    const t = await api('tong_quan');
    const tt = t.theo_tinh_trang;
    const st = (n, l, cls, href) => '<div class="stat ' + (cls || '') + (href ? ' link" data-href="' + href : '') + '"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>';
    let h = '<div class="grid g4" style="margin-bottom:14px">' +
      st(t.tong_tb, 'Thiết bị đang quản lý', '', '#/tai-san') +
      st(tt['Đang cho mượn'] || 0, 'Đang cho mượn', '', '#/tai-san?tt=Đang cho mượn') +
      st((tt['Hỏng – chờ sửa'] || 0) + (tt['Đang sửa'] || 0), 'Hỏng / đang sửa', (tt['Hỏng – chờ sửa'] || tt['Đang sửa']) ? 'bad' : 'ok', '#/tai-san?tt=hong') +
      st(t.kiem_dinh.qua_han, 'Kiểm định quá hạn', t.kiem_dinh.qua_han ? 'bad' : 'ok', '#/kiem-dinh') +
      st(t.kiem_dinh.trong_30, 'Kiểm định trong 30 ngày', t.kiem_dinh.trong_30 ? 'warn' : '', '#/kiem-dinh') +
      st(t.bao_duong.qua_han + t.bao_duong.trong_30, 'Bảo dưỡng quá hạn / 30 ngày', (t.bao_duong.qua_han + t.bao_duong.trong_30) ? 'warn' : '', '#/kiem-dinh?bd=1') +
      st(t.thieu_ma_ts, 'Thiết bị chưa có mã tài sản', t.thieu_ma_ts ? 'warn' : 'ok', '#/tai-san?thieu=1') + '</div>';
    if (t.qua_han_tra.length || t.tu_qua_han.length) {
      h += '<div class="card"><h2>Cần xử lý</h2>';
      t.qua_han_tra.forEach(x => { h += '<div>⚠ <a href="#/tai-san/' + esc(x.id) + '">' + esc(x.ten) + '</a> – ' + esc(x.nguoi_muon) + ' quá hạn trả ' + hanTag(x.han_tra) + '</div>'; });
      t.tu_qua_han.forEach(x => { h += '<div>⚠ Tủ <a href="#/phong/' + esc(x.phong) + '">' + esc(x.phong) + ' – ' + esc(x.so) + '</a> – ' + esc(x.nguoi) + ' quá hạn ' + hanTag(x.han) + '</div>'; });
      h += '</div>';
    }
    h += '<h2 style="margin-top:6px">Phòng thí nghiệm</h2><div class="grid g3">' + t.phong.map(p =>
      '<div class="card room" data-href="#/phong/' + esc(p.ma) + '"><div class="code">' + esc(p.ma) + '</div><div>' + esc(p.ten) + '</div>' +
      '<div class="meta"><span>⚙ ' + p.tb + ' thiết bị</span><span>▣ Tủ: ' + p.tu_dung + ' đang dùng · ' + p.tu_trong + ' trống' + (p.tu_hong ? ' · ' + p.tu_hong + ' hỏng' : '') + '</span></div></div>').join('') + '</div>';
    nd.innerHTML = h;
    nd.querySelectorAll('[data-href]').forEach(el => { el.onclick = () => { location.hash = el.dataset.href; }; });
  }

  // ---------------- Đơn đăng ký QR ----------------
  const QR_TEN = { QR1: 'Mượn phòng, TB – DC trong ngày', QR2: 'Mượn TB từ 02 ngày', QR3: 'Cấp hóa chất bổ sung', QR4: 'Mượn chìa khóa (Bảo vệ)',
    QR5: 'Nhật ký sử dụng TB', QR6: 'Đăng ký tủ', QR7: 'Đăng ký KLTN – NCKH', QR8: 'Mượn thêm dụng cụ' };
  const QR_COT_CHINH = { QR1: [/^Phòng/, /^Nội dung đăng ký/], QR2: [/^Thiết bị/, /^Ngày dự kiến trả/], QR3: [/^Tên học phần/, /^Hóa chất/],
    QR4: [/^Phòng/, /^Giờ dự kiến/], QR5: [/^Phòng/, /^Thiết bị sử dụng/], QR6: [/^Phòng/, /^Ngày dự kiến trả/], QR7: [/^Tên đề tài/, /^Giảng viên hướng dẫn/] };
  const MAU_DON = { 'Mới': 't-info', 'Đang xử lý': 't-warn', 'Quá hạn': 't-bad', 'Hoàn tất': 't-ok' };
  const tagDon = (tt) => '<span class="tag ' + (MAU_DON[tt] || 't-gray') + '">' + esc(tt) + '</span>';
  const daXong = (c, v) => v && v !== 'FALSE' && v !== 'TRUE';

  async function manDonQR(qr) {
    const tabs = Object.keys(QR_TEN).filter(k => k !== 'QR8').map(k => '<a class="btn sm ' + (k === qr ? 'chon' : 'o') + '" href="#/don-qr/' + k + '" title="' + esc(QR_TEN[k]) + '">' + k + '</a>').join('');
    const nd = trang('Đơn cũ (Google Form) – ' + qr + ' · ' + esc(QR_TEN[qr] || ''), '', '<span class="btns">' + tabs + '</span>');
    const d = await api('qr_ds', { qr, n: 1000 });
    S.cache.qr = d;
    const cTen = d.cot.find(c => /^Họ và tên/.test(c.ten)), cMa = d.cot.find(c => /^(MSSV|Mã viên chức)/.test(c.ten));
    const cChinh = (QR_COT_CHINH[qr] || []).map(re => d.cot.find(c => c.loai === 'form' && re.test(c.ten))).filter(Boolean);
    const ptn = d.cot.filter(c => c.loai === 'ptn');
    const dem = (t) => d.hang.filter(h => h.tt === t).length;
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm tên, MSSV, phòng, nội dung…">' +
      '<select id="f-tt"><option value="chua">Chưa xong (' + (dem('Mới') + dem('Đang xử lý') + dem('Quá hạn')) + ')</option><option value="Mới">Mới (' + dem('Mới') + ')</option><option value="Đang xử lý">Đang xử lý (' + dem('Đang xử lý') + ')</option>' +
      '<option value="Quá hạn">Quá hạn (' + dem('Quá hạn') + ')</option><option value="Hoàn tất">Hoàn tất (' + dem('Hoàn tất') + ')</option><option value="">Tất cả (' + d.hang.length + ')</option></select>' +
      '<label class="check" style="margin:0"><input type="checkbox" id="f-nghi"> Nghi đăng ký thay</label>' +
      '<a class="btn o sm" href="' + esc(d.url) + '" target="_blank" rel="noopener">Mở Google Sheet</a></div><div id="kq"></div>' +
      '<p class="note">Đơn gửi qua Google Form trước khi chuyển sang hệ thống mới. Đơn mới xem ở mục <a href="#/don">Đơn đăng ký QR1 – QR8</a>. Các nút ghi giờ / xác nhận ghi thẳng vào Google Sheet.</p>';
    const ve = () => {
      const q = boDau($('q').value), tt = $('f-tt').value, nghi = $('f-nghi').checked;
      const l = d.hang.filter(h => (!q || boDau(h.gt.join(' ')).indexOf(q) >= 0) && (tt === '' ? true : tt === 'chua' ? h.tt !== 'Hoàn tất' : h.tt === tt) && (!nghi || h.nghi));
      $('kq').innerHTML = !l.length ? '<div class="card empty">Không có đơn nào.</div>' : '<div class="tbl-wrap"><table><thead><tr><th>Thời gian</th><th>Người đăng ký</th>' +
        cChinh.map(c => '<th>' + esc(c.ten.replace(/\s*\(.*$/, '')) + '</th>').join('') + '<th>Trạng thái</th><th>Xử lý của PTN</th></tr></thead><tbody>' +
        l.map(h => '<tr class="click" data-r="' + h.r + '"><td style="white-space:nowrap">' + ngayVN(h.tg) + '</td><td><b>' + esc(cTen ? h.gt[cTen.i] : '') + '</b><div class="note">' + esc(cMa ? h.gt[cMa.i] : '') + '</div>' +
          (h.nghi ? '<span class="tag t-bad" title="Một máy gửi cho nhiều người, hoặc một người gửi từ nhiều máy">⚠ nghi đăng ký thay</span>' : '') + '</td>' +
          cChinh.map(c => '<td>' + esc(String(h.gt[c.i]).slice(0, 120)) + '</td>').join('') + '<td>' + tagDon(h.tt) + '</td><td>' +
          ptn.map(c => {
            const v = h.gt[c.i];
            if (c.kieu === 'tick' || c.kieu === 'xac_nhan') return daXong(c, v) ? '<span class="tag t-ok" title="' + esc(c.ten) + '">✓ ' + esc(c.ten) + ' ' + esc(v.replace(/^Đã XN /, '')) + '</span> ' : '<button class="btn o sm" data-nhanh="' + h.r + ':' + c.i + '">' + esc(c.ten) + '</button> ';
            return v ? '<span class="tag t-gray" title="' + esc(c.ten) + '">' + esc(c.ten) + ': ' + esc(v) + '</span> ' : '';
          }).join('') + '</td></tr>').join('') + '</tbody></table></div>';
      $('kq').querySelectorAll('tr[data-r]').forEach(tr => { tr.onclick = () => hopDon(qr, +tr.dataset.r); });
      $('kq').querySelectorAll('[data-nhanh]').forEach(b => { b.onclick = async (e) => {
        e.stopPropagation();
        const [r, ci] = b.dataset.nhanh.split(':').map(Number), h = d.hang.find(x => x.r === r);
        await chay(e.target, () => api('qr_xu_ly', { qr, r, tg: h.tg, cot: ci })); toast('Đã ghi'); dieuHuong();
      }; });
    };
    ['q', 'f-tt', 'f-nghi'].forEach(id => { $(id).oninput = ve; $(id).onchange = ve; });
    ve();
  }

  function hopDon(qr, r) {
    const d = S.cache.qr, h = d.hang.find(x => x.r === r);
    if (!h) return;
    const form = d.cot.filter(c => c.loai === 'form' && h.gt[c.i] && !/^Cam kết/.test(c.ten) && !/email/i.test(c.ten));
    const may = d.cot.find(c => c.loai === 'ma_may');
    let html = '<h2>' + qr + ' – ' + esc(QR_TEN[qr]) + ' ' + tagDon(h.tt) + '</h2><p class="note">Gửi lúc ' + ngayVN(h.tg) + (may && h.gt[may.i] ? ' · Mã máy ' + esc(h.gt[may.i]) : ' · Không có mã máy (gửi trực tiếp Google Form)') + '</p>' +
      (h.nghi ? '<p class="err">⚠ Mã máy này đã gửi đơn cho người khác, hoặc người này gửi từ nhiều máy – kiểm tra giấy tờ khi giao đồ.</p>' : '') +
      '<dl class="kv" style="margin-bottom:14px">' + form.map(c => '<dt>' + esc(c.ten) + '</dt><dd>' + esc(h.gt[c.i]).replace(/\n/g, '<br>') + '</dd>').join('') + '</dl><h2>Xử lý của PTN</h2><div>';
    d.cot.filter(c => c.loai === 'ptn').forEach(c => {
      const v = h.gt[c.i], id = 'x' + c.i;
      html += '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #EEF1F6"><div style="width:170px;font-weight:600">' + esc(c.ten) + '</div><div style="flex:1">';
      if (c.kieu === 'tick' || c.kieu === 'xac_nhan') html += daXong(c, v) ? '<span class="tag t-ok">✓ ' + esc(v) + '</span> <button class="btn red sm" data-xoa="' + c.i + '">Hoàn tác</button>' : '<button class="btn sm" data-ghi="' + c.i + '">' + (c.kieu === 'xac_nhan' ? 'Xác nhận' : 'Ghi giờ') + '</button>';
      else if (c.kieu === 'chon') html += '<select id="' + id + '"><option value="">— chọn —</option>' + c.lua_chon.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select> <button class="btn o sm" data-luu="' + c.i + '">Lưu</button>';
      else html += '<input type="text" id="' + id + '" value="' + esc(v || (c.kieu === 'nguoi' ? S.toi.nguoi.ten : '')) + '" style="max-width:260px"> <button class="btn o sm" data-luu="' + c.i + '">Lưu</button>';
      html += '</div></div>';
    });
    html += '</div><div class="modal-foot">' + (qr === 'QR3' ? '<button class="btn o" id="b-vao-bb">Đưa vào biên bản hóa chất</button>' : '') +
      '<a class="btn o" href="' + esc(d.url) + '&range=A' + h.r + '" target="_blank" rel="noopener">Xem trong Google Sheet</a><button class="btn" data-dong>Đóng</button></div>';
    moHop(html);
    if ($('b-vao-bb')) $('b-vao-bb').onclick = () => hopDonVaoBB(d, h);
    const lam = async (btn, data) => {
      await chay(btn, () => api('qr_xu_ly', Object.assign({ qr, r: h.r, tg: h.tg }, data)));
      toast('Đã ghi vào Google Sheet');
      await manDonQR(qr); // tải lại danh sách rồi mở lại đơn đang xem
      hopDon(qr, r);
    };
    $('modal-body').querySelectorAll('[data-ghi]').forEach(b => { b.onclick = (e) => lam(e.target, { cot: +b.dataset.ghi }); });
    $('modal-body').querySelectorAll('[data-xoa]').forEach(b => { b.onclick = (e) => { if (confirm('Xóa giá trị đã ghi và trả lại ô tích?')) lam(e.target, { cot: +b.dataset.xoa, xoa: true }); }; });
    $('modal-body').querySelectorAll('[data-luu]').forEach(b => { b.onclick = (e) => { const v = $('x' + b.dataset.luu).value; if (!v) return toast('Chưa nhập giá trị', true); lam(e.target, { cot: +b.dataset.luu, gia_tri: v }); }; });
  }

  // ---------------- Hóa chất – vật tư ----------------
  const fmt = (n) => { const x = Math.round((+n || 0) * 100) / 100; return x ? x.toLocaleString('vi-VN') : ''; };
  const hkMacDinh = () => S.hk || (S.dm.hoc_ky || [])[0] || '';
  function chonHK(id) { return '<select id="' + id + '">' + (S.dm.hoc_ky || []).map(h => '<option' + (h === hkMacDinh() ? ' selected' : '') + '>' + esc(h) + '</option>').join('') + '</select>'; }
  async function capNhatDanhMuc() { const r = await api('toi'); S.toi = r; S.dm = r.danh_muc; luuToi(r); }
  // chọn file Excel → chọn trang tính → hàm xử lý nhận mảng hàng
  function hopFileExcel(tieuDe, huongDan, xuLy, sheetGoiY) {
    moHop('<h2>' + esc(tieuDe) + '</h2><p class="note">' + huongDan + '</p><label class="f"><span>File Excel</span><input type="file" id="x-file" accept=".xlsx,.xls,.xlsm"></label><div id="x-kq"></div>');
    $('x-file').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      $('x-kq').innerHTML = '<div class="loading"><div class="spin"></div></div>';
      try {
        const X = await napXlsx(), wb = X.read(await file.arrayBuffer(), { cellDates: true });
        const docSheet = (ten) => X.utils.sheet_to_json(wb.Sheets[ten], { header: 1, raw: true, defval: '' }); // đọc thêm trang tính khác (file nhiều môn)
        const chay1 = (ten) => { try { xuLy(docSheet(ten), ten, wb.SheetNames, docSheet); } catch (err) { $('x-kq').innerHTML = chonSheet(ten) + '<p class="err">' + esc(err.message) + '</p>'; ganSheet(); } };
        const chonSheet = (ten) => wb.SheetNames.length > 1 ? '<label class="f"><span>Trang tính</span><select id="x-sheet">' + wb.SheetNames.map(n => '<option' + (n === ten ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label>' : '';
        const ganSheet = () => { if ($('x-sheet')) $('x-sheet').onchange = (ev) => chay1(ev.target.value); };
        hopFileExcel.chonSheet = chonSheet; hopFileExcel.ganSheet = ganSheet;
        chay1(wb.SheetNames.find(n => sheetGoiY && sheetGoiY.test(n)) || wb.SheetNames[0]);
      } catch (err) { $('x-kq').innerHTML = '<p class="err">' + esc(err.message) + '</p>'; }
    };
  }

  async function manHoaChat(tab, phu) {
    if (!coQuyen('hoa-chat', 'xem')) { location.hash = '#/tong-quan'; return; }
    const TAB = [['hoc-ky', 'Học kỳ & thời khóa biểu'], ['mon', 'Môn & định mức'], ['vat-tu', 'Danh mục vật tư'], ['du-tru-mon', 'Dự trù của các môn học'], ['du-tru', 'Dự trù theo đợt']];
    const nd = trang('Hóa chất – vật tư', '', '<span class="btns">' + TAB.map(t => '<a class="btn sm ' + (t[0] === tab ? 'chon' : 'o') + '" href="#/hoa-chat/' + t[0] + '">' + t[1] + '</a>').join('') + '</span>');
    if (tab === 'mon') return phu ? manMon(nd, phu) : manDsMon(nd);
    if (tab === 'vat-tu') return manVatTu(nd);
    if (tab === 'du-tru' || tab === 'ke-hoach') return window.PTN_QL.manDuTru(nd);
    if (tab === 'du-tru-mon') return window.PTN_QL.manDuTruMon(nd);
    return manHocKy(nd);
  }

  async function manHocKy(nd) {
    if (!(S.dm.hoc_ky || []).length) {
      nd.innerHTML = '<div class="card"><h2>Chưa có học kỳ</h2><p>Bước 1: tạo học kỳ. Bước 2: nhập thời khóa biểu thực hành (file "TH & Phòng học"). Bước 3: nhập định mức ở thẻ "Môn & định mức".</p><button class="btn" id="b-hk">+ Tạo học kỳ</button></div>';
      $('b-hk').onclick = hopHocKy; return;
    }
    const hk = hkMacDinh(), [ds, mons] = await Promise.all([api('lop_ds', { hk }), api('mon_ds')]);
    const tenMon = {}; mons.forEach(m => { tenMon[m.ma] = m.ten; });
    const chua = ds.filter(l => !l.mon), nhomChua = {}; chua.forEach(l => { nhomChua[l.ten_mon] = (nhomChua[l.ten_mon] || 0) + 1; });
    nd.innerHTML = '<div class="tools"><b>Học kỳ</b> ' + chonHK('f-hk') + '<button class="btn o sm" id="b-hk">+ Học kỳ</button><button class="btn sm" id="b-tkb">Nhập thời khóa biểu (file "TH & Phòng học")</button></div>' +
      (chua.length ? '<div class="card" style="border-color:#E7B4B0"><h2 style="color:var(--bad)">' + chua.length + ' ca chưa khớp môn có định mức</h2>' + Object.keys(nhomChua).map(t => '<div class="btns" style="margin-bottom:6px"><span>• ' + esc(t) + ' (' + nhomChua[t] + ' ca)</span><button class="btn o sm" data-gan="' + esc(t) + '">Gán môn…</button></div>').join('') + '<p class="note">Ca chưa khớp sẽ không được tính dự trù và không có biên bản.</p></div>' : '') +
      (ds.length ? '<p class="note">' + ds.length + ' ca thực hành · ' + ds.reduce((a, l) => a + (+l.si_so || 0), 0) + ' lượt SV</p><div class="tbl-wrap"><table><thead><tr><th>Mã LHP</th><th>Môn (TKB)</th><th>Môn định mức</th><th>Lớp</th><th>Nhóm</th><th class="num">Sĩ số</th><th>Thứ – tiết</th><th>Thời gian</th><th>Phòng</th><th>Giảng viên</th></tr></thead><tbody>' +
        ds.map(l => '<tr><td class="mono">' + esc(l.ma_lhp) + '</td><td>' + esc(l.ten_mon) + '</td><td>' + (l.mon ? '<a href="#/hoa-chat/mon/' + esc(l.mon) + '">' + esc(tenMon[l.mon] || l.mon) + '</a>' : '<span class="tag t-bad">chưa khớp</span>') + '</td><td>' + esc(l.lop) + '</td><td>' + esc(l.nhom) + '</td><td class="num">' + esc(l.si_so) +
          '</td><td>' + esc(l.thu ? 'T' + l.thu + (l.tiet ? ' · ' + l.tiet : '') : '') + '</td><td style="white-space:nowrap">' + ngayVN(l.bat_dau) + ' → ' + ngayVN(l.ket_thuc) + '</td><td>' + esc(l.phong) + '</td><td>' + esc(l.gv) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="card empty">Học kỳ này chưa có thời khóa biểu. Bấm "Nhập thời khóa biểu".</div>');
    $('f-hk').onchange = (e) => { S.hk = e.target.value; dieuHuong(); };
    $('b-hk').onclick = hopHocKy;
    $('b-tkb').onclick = () => hopFileExcel('Nhập thời khóa biểu thực hành – ' + hk, 'Chọn file có trang "TH & Phòng học" (ví dụ "BBBG hoc chat HKI 26-27.xlsm"). Thời khóa biểu cũ của học kỳ này sẽ được thay.', (rows, ten, all) => {
      const l = docTKB(rows);
      $('x-kq').innerHTML = hopFileExcel.chonSheet(ten) + '<p>Đọc được <b>' + l.length + '</b> ca thực hành, ' + l.reduce((a, x) => a + x.si_so, 0) + ' lượt SV, ' + new Set(l.map(x => x.ma_lhp.slice(0, 10))).size + ' học phần.</p>' +
        '<div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="x-ok">Nhập vào ' + esc(hk) + '</button></div>';
      hopFileExcel.ganSheet();
      $('x-ok').onclick = async (e) => { const r = await chay(e.target, () => api('lop_nhap', { hk, ds: l, dong_bo: true })); dongHop();
        const tao = r.bien_ban ? r.bien_ban.reduce((a, b) => a + b.tao.length, 0) : 0, cn = r.bien_ban ? r.bien_ban.reduce((a, b) => a + b.cap_nhat.length, 0) : 0;
        toast('Đã nhập ' + r.them + ' ca' + (r.khong_khop_mon.length ? '; ' + r.khong_khop_mon.length + ' môn chưa khớp' : '') + (tao || cn ? ' · biên bản: ' + tao + ' tạo mới, ' + cn + ' cập nhật' : '')); dieuHuong(); };
    }, /ph[oò]ng/i);
    nd.querySelectorAll('[data-gan]').forEach(b => { b.onclick = () => {
      moHop('<h2>Gán môn cho "' + esc(b.dataset.gan) + '"</h2><form id="f">' + o('mon', 'Môn có định mức', { select: [['', '— Chọn môn —']].concat(mons.map(m => [m.ma, m.ten + ' (' + m.so_hc + ' dòng HC)'])) }) +
        '<label class="check"><input type="checkbox" name="ma_lhp_vao_mon" checked> Ghi nhớ mã học phần cho các học kỳ sau</label><p class="note">Môn chưa có trong danh sách: tạo ở thẻ "Môn & định mức".</p><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Gán</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); if (!v.mon) return toast('Chọn môn', true); await chay(e.submitter, () => api('lop_gan_mon', { hk, ten_mon: b.dataset.gan, mon: v.mon, ma_lhp_vao_mon: v.ma_lhp_vao_mon })); dongHop(); toast('Đã gán'); dieuHuong(); };
    }; });
  }
  function hopHocKy() {
    const y = new Date().getFullYear();
    moHop('<h2>Tạo học kỳ</h2><form id="f"><div class="form-grid">' + o('ky', 'Học kỳ', { select: ['HKI', 'HKII', 'HKH (hè)'] }) + o('nam', 'Năm học', { v: y + '-' + (y + 1), ph: '2026-2027' }) +
      o('bat_dau', 'Bắt đầu', { type: 'date' }) + o('ket_thuc', 'Kết thúc', { type: 'date' }) + '</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tạo</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(e.target);
      if (!/^\d{4}-\d{4}$/.test(v.nam)) return toast('Năm học dạng 2026-2027', true);
      const ma = v.ky.split(' ')[0] + ' ' + v.nam;
      await chay(e.submitter, () => api('hk_luu', { hk: { ma, bat_dau: v.bat_dau, ket_thuc: v.ket_thuc } }));
      await capNhatDanhMuc(); S.hk = ma; dongHop(); toast('Đã tạo ' + ma); dieuHuong();
    };
  }

  async function manDsMon(nd) {
    const ds = await api('mon_ds');
    nd.innerHTML = '<div class="tools"><button class="btn sm" id="b-kh">⇪ Tải file định mức hóa chất (một hay nhiều môn)</button><button class="btn sm" id="b-dc">⇪ Tải file dụng cụ của một môn</button><button class="btn o sm" id="b-mon">+ Môn</button></div>' +
      '<p class="note">Định mức hóa chất tính cho <b>1 sinh viên</b>; định mức dụng cụ tính cho <b>1 nhóm thực hành</b>. Đây là dữ liệu cốt lõi, dùng lại cho mọi học kỳ. Môn nào có file thì tải lên môn đó – biên bản bàn giao và dự trù của học kỳ đang chọn tự cập nhật.</p>' +
      (ds.length ? '<div class="tbl-wrap"><table><thead><tr><th>Mã</th><th>Môn thực hành</th><th>Mã học phần</th><th class="num">Dòng hóa chất</th><th class="num">Dòng dụng cụ</th></tr></thead><tbody>' +
        ds.map(m => '<tr class="click" data-ma="' + esc(m.ma) + '"><td class="mono">' + esc(m.ma) + '</td><td><b>' + esc(m.ten) + '</b></td><td class="mono">' + esc(m.ma_hp) + '</td><td class="num">' + (m.so_hc || '<span class="tag t-warn">0</span>') + '</td><td class="num">' + (m.so_dc || '—') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<div class="card empty">Chưa có môn. Bấm "Nhập định mức hóa chất" và chọn file kế hoạch vật tư (ví dụ "KSK. KH vat HKI 2026.xlsm").</div>');
    nd.querySelectorAll('tr[data-ma]').forEach(tr => { tr.onclick = () => { location.hash = '#/hoa-chat/mon/' + tr.dataset.ma; }; });
    $('b-mon').onclick = () => hopMon(null);
    $('b-kh').onclick = () => nhapFileHC();
    $('b-dc').onclick = () => nhapFileDC(ds);
  }
  // Tải file định mức của môn (hóa chất: file kế hoạch vật tư, một hay nhiều môn; dụng cụ: danh sách dụng cụ của một môn)
  // → cập nhật định mức và tự tạo / cập nhật biên bản bàn giao của học kỳ đang chọn
  function ketQuaDongBo(r, tieuDe) {
    const b = r.bien_ban || {}, cn = b.cap_nhat || [];
    moHop('<h2>' + esc(tieuDe) + '</h2><p>Đã cập nhật định mức <b>' + r.dong + '</b> dòng cho <b>' + r.mon.length + '</b> môn: ' + esc(r.mon.map(m => m.ten + (m.moi ? ' (môn mới)' : '')).join(', ')) + '.</p>' +
      (b.hk ? '<h2 style="margin-top:12px">Biên bản bàn giao ' + esc(b.hk) + '</h2>' +
        (b.khop_lop ? '<p class="note">Đã khớp thêm ' + b.khop_lop + ' ca thực hành với môn.</p>' : '') +
        (b.tao.length ? '<p>✓ Tạo mới ' + b.tao.length + ' biên bản: ' + b.tao.map(id => '<a href="#/bien-ban/' + encodeURIComponent(id) + '" data-dong>' + esc(id) + '</a>').join(', ') + '</p>' : '') +
        (cn.length ? '<p>✓ Cập nhật ' + cn.length + ' biên bản:</p><ul>' + cn.map(c => '<li><a href="#/bien-ban/' + encodeURIComponent(c.id) + '" data-dong>' + esc(c.id) + '</a> ' + esc(c.ten_mon) + ': ' +
          [c.them && '+' + c.them + ' dòng mới', c.sua && c.sua + ' dòng đổi định mức / dự trù', c.xoa && c.xoa + ' dòng bỏ (chưa giao)', c.giu && c.giu + ' dòng đã giao nhưng không còn trong định mức (giữ lại, ⚠)'].filter(Boolean).join(' · ') + '</li>').join('') + '</ul>' : '') +
        (!b.tao.length && !cn.length ? '<p class="note">Không có biên bản nào cần tạo / thay đổi (môn chưa có ca thực hành trong học kỳ này, hoặc định mức không đổi).</p>' : '')
        : '<p class="note">Chưa có học kỳ – biên bản sẽ được tạo khi nhập thời khóa biểu.</p>') +
      '<div class="modal-foot"><button class="btn" data-dong>Xong</button></div>');
    dieuHuong();
  }
  function nhapFileHC() {
    const hk = hkMacDinh();
    hopFileExcel('Tải file định mức hóa chất', 'Chọn file kế hoạch vật tư theo mẫu P.KHĐT (khối "1. TH …", cột QUI CÁCH VẬT TƯ, MÃ VT, ĐVỊ, SLG/1HS) – file có thể chỉ gồm <b>một vài môn</b>. Định mức hóa chất của các môn có trong file được thay; biên bản hóa chất ' + esc(hk) + ' của các môn đó tự tạo / cập nhật.', (rows, ten) => {
      const kh = docKeHoachVatTu(rows), tong = kh.reduce((a, m) => a + m.dm.length, 0);
      $('x-kq').innerHTML = hopFileExcel.chonSheet(ten) + '<p>Đọc được <b>' + kh.length + '</b> môn, <b>' + tong + '</b> dòng định mức (' + kh.reduce((a, m) => a + m.dm.filter(d => !/^\d+$/.test(d.ma_vt)).length, 0) + ' dòng chưa có mã VT).</p>' +
        '<div class="tbl-wrap" style="max-height:260px"><table><thead><tr><th>Môn</th><th>Mã HP</th><th class="num">Lớp</th><th class="num">Dòng</th></tr></thead><tbody>' + kh.map(m => '<tr><td>' + esc(m.ten) + '</td><td class="mono">' + esc(m.ma_hp.join(', ')) + '</td><td class="num">' + m.lop.length + '</td><td class="num">' + m.dm.length + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="x-ok">Cập nhật định mức + biên bản</button></div>';
      hopFileExcel.ganSheet();
      $('x-ok').onclick = async (e) => { const r = await chay(e.target, () => api('dm_nhap', { loai: 'HC', ds: kh, hk, dong_bo: true })); ketQuaDongBo(r, 'Đã cập nhật định mức hóa chất'); };
    }, /HK|KH/i);
  }
  async function nhapFileDC(ds) {
    ds = ds || await api('mon_ds');
    const hk = hkMacDinh();
    hopFileExcel('Tải file dụng cụ của một môn', 'Chọn biên bản / danh sách dụng cụ của môn (cột "Tên dụng cụ", "Số lượng" – nếu tiêu đề ghi "/ 2 nhóm" hệ thống tự chia ra 1 nhóm). Định mức dụng cụ của môn được thay; biên bản dụng cụ ' + esc(hk) + ' của môn tự tạo / cập nhật.', (rows, ten) => {
      const dc = docDungCu(rows), goiY = ds.find(m => boDau(m.ten).replace(/^th\s+/, '') === boDau(dc.ten).replace(/^th\s+/, ''));
      $('x-kq').innerHTML = hopFileExcel.chonSheet(ten) + '<p>Môn trong file: <b>' + esc(dc.ten || '(không ghi)') + '</b> · ' + dc.dm.length + ' dụng cụ' + (dc.chia > 1 ? ' (số lượng / ' + dc.chia + ' nhóm → quy về 1 nhóm)' : '') + '</p>' +
        o('mon', 'Gắn vào môn', { select: [['', '— Chọn môn —']].concat(dc.ten && !goiY ? [['~moi', '+ Tạo môn mới: ' + dc.ten]] : []).concat(ds.map(m => [m.ma, m.ten])), v: goiY ? goiY.ma : dc.ten ? '~moi' : '' }) +
        '<div class="tbl-wrap" style="max-height:220px"><table><thead><tr><th>Dụng cụ</th><th class="num">Định mức / nhóm</th></tr></thead><tbody>' + dc.dm.map(d => '<tr><td>' + esc(d.ten) + '</td><td class="num">' + fmt(d.dm) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="x-ok">Cập nhật định mức + biên bản</button></div>';
      hopFileExcel.ganSheet();
      $('x-ok').onclick = async (e) => {
        const ma = $('x-kq').querySelector('[name=mon]').value; if (!ma) return toast('Chọn môn', true);
        const tenMon = ma === '~moi' ? dc.ten : ds.find(m => m.ma === ma).ten;
        const r = await chay(e.target, () => api('dm_nhap', { loai: 'DC', ds: [{ ten: tenMon, ma_hp: [], dm: dc.dm }], hk, dong_bo: true })); ketQuaDongBo(r, 'Đã cập nhật định mức dụng cụ');
      };
    });
  }
  function hopMon(m) {
    m = m || {};
    moHop('<h2>' + (m.ma ? 'Sửa môn ' + esc(m.ma) : 'Thêm môn thực hành') + '</h2><form id="f">' + o('ten', 'Tên môn thực hành', { v: m.ten, req: 1 }) + o('ma_hp', 'Mã học phần (10 số, cách nhau dấu phẩy)', { v: m.ma_hp, help: 'Dùng để tự khớp với thời khóa biểu' }) +
      o('bo_mon', 'Bộ môn', { select: ['', 'Dược học', 'Dinh dưỡng', 'Khác'], v: m.bo_mon }) + o('ghi_chu', 'Ghi chú', { v: m.ghi_chu }) + '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); v.ma = m.ma; const r = await chay(e.submitter, () => api('mon_luu', { mon: v })); dongHop(); toast('Đã lưu'); location.hash = '#/hoa-chat/mon/' + r.ma; dieuHuong(); };
  }
  async function manMon(nd, ma) {
    const r = await api('mon_ct', { ma }), m = r.mon;
    $('main').querySelector('h1').innerHTML = esc(m.ten);
    const bang = (loai) => {
      const l = r.dinh_muc.filter(d => d.loai === loai);
      if (!l.length) return '<div class="note">Chưa có.</div>';
      let nhom = '';
      return '<div class="tbl-wrap"><table><thead><tr><th>STT</th><th>Tên – quy cách</th><th>Mã VT</th><th>NSX</th><th>ĐVT</th><th class="num">' + (loai === 'HC' ? 'ĐM / 1 SV' : 'ĐM / 1 nhóm') + '</th><th>Ghi chú</th><th></th></tr></thead><tbody>' +
        l.map(d => (d.nhom !== nhom ? (nhom = d.nhom, '<tr><td colspan="8" style="background:#F6F8FD;font-weight:600">' + esc(d.nhom) + '</td></tr>') : '') +
          '<tr><td>' + esc(d.stt) + '</td><td>' + esc(d.ten) + (d.kiem_soat ? ' <span class="tag t-bad">kiểm soát</span>' : '') + '</td><td class="mono">' + (d.ma_vt ? esc(d.ma_vt) : '<span class="tag t-warn">chưa MVT</span>') + '</td><td>' + esc(d.nsx) + '</td><td>' + esc(d.dvt) + '</td><td class="num">' + fmt(d.dm) + '</td><td class="note">' + esc(d.ghi_chu) + '</td>' +
          '<td class="btns"><button class="btn o sm" data-sua="' + esc(d.id) + '">Sửa</button><button class="btn red sm" data-xoa="' + esc(d.id) + '">Xóa</button></td></tr>').join('') + '</tbody></table></div>';
    };
    nd.innerHTML = '<div class="crumb" style="margin-top:-8px"><a href="#/hoa-chat/mon">Môn & định mức</a> ›</div><div class="card"><dl class="kv"><dt>Mã môn</dt><dd>' + esc(m.ma) + '</dd><dt>Mã học phần</dt><dd class="mono">' + esc(m.ma_hp || '—') + '</dd><dt>Bộ môn</dt><dd>' + esc(m.bo_mon || '—') + '</dd></dl>' +
      '<div class="btns" style="margin-top:10px"><button class="btn o sm" id="b-sua-mon">Sửa môn</button><button class="btn sm" id="b-them-dm">+ Thêm dòng định mức</button></div></div>' +
      '<div class="card"><h2>Hóa chất – vật tư (định mức / 1 sinh viên)</h2>' + bang('HC') + '</div><div class="card"><h2>Dụng cụ (định mức / 1 nhóm)</h2>' + bang('DC') + '</div>';
    $('b-sua-mon').onclick = () => hopMon(m);
    $('b-them-dm').onclick = () => hopDinhMuc({ mon: ma, loai: 'HC' });
    nd.querySelectorAll('[data-sua]').forEach(b => { b.onclick = () => hopDinhMuc(r.dinh_muc.find(d => d.id === b.dataset.sua)); });
    nd.querySelectorAll('[data-xoa]').forEach(b => { b.onclick = async (e) => { if (!confirm('Xóa dòng định mức này?')) return; await chay(e.target, () => api('dm_xoa', { id: b.dataset.xoa })); toast('Đã xóa'); dieuHuong(); }; });
  }
  function hopDinhMuc(d) {
    moHop('<h2>' + (d.id ? 'Sửa định mức' : 'Thêm định mức') + '</h2><form id="f"><div class="form-grid">' + o('loai', 'Loại', { select: [['HC', 'Hóa chất – vật tư (/1 SV)'], ['DC', 'Dụng cụ (/1 nhóm)']], v: d.loai }) + o('nhom', 'Nhóm', { v: d.nhom || 'Hóa chất', ph: 'Hóa chất, Dược liệu khô…' }) +
      o('ten', 'Tên – quy cách', { v: d.ten, req: 1, full: 1 }) + o('ma_vt', 'Mã VT', { v: d.ma_vt, ph: 'Để trống nếu chưa có mã' }) + o('nsx', 'NSX', { v: d.nsx }) + o('dvt', 'ĐVT', { v: d.dvt }) + o('dm', 'Định mức', { v: d.dm, req: 1 }) +
      o('stt', 'STT', { v: d.stt }) + o('ghi_chu', 'Ghi chú', { v: d.ghi_chu }) + '</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); v.id = d.id; v.mon = d.mon; await chay(e.submitter, () => api('dm_luu', { dm: v })); dongHop(); toast('Đã lưu'); dieuHuong(); };
  }

  async function manVatTu(nd) {
    const ds = await api('vt_ds');
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm mã VT, tên hóa chất – vật tư…"><label class="check" style="margin:0"><input type="checkbox" id="f-ks"> Chỉ hóa chất kiểm soát đặc biệt</label><button class="btn sm" id="b-nhap-vt">Nhập danh mục mã VT</button></div><div id="kq"></div>';
    const ve = () => {
      const q = boDau($('q').value), ks = $('f-ks').checked;
      const l = ds.filter(v => (!q || boDau(v.ma_vt + ' ' + v.ten).indexOf(q) >= 0) && (!ks || v.kiem_soat));
      $('kq').innerHTML = !ds.length ? '<div class="card empty">Chưa có danh mục. Bấm "Nhập danh mục mã VT" và chọn file "Ma vat tu- ma bai tap.xlsx".</div>' :
        '<p class="note">' + l.length + ' / ' + ds.length + ' mã' + (l.length > 300 ? ' – hiện 300 dòng đầu, gõ để tìm' : '') + '</p><div class="tbl-wrap"><table><thead><tr><th>Mã VT</th><th>Tên – quy cách</th><th>NSX</th><th>ĐVT</th><th>Nhóm</th><th>Kiểm soát đặc biệt</th></tr></thead><tbody>' +
        l.slice(0, 300).map(v => '<tr><td class="mono">' + esc(v.ma_vt) + '</td><td>' + esc(v.ten) + '</td><td>' + esc(v.nsx) + '</td><td>' + esc(v.dvt) + '</td><td>' + esc(v.nhom) + '</td><td><label class="check" style="margin:0"><input type="checkbox" data-ks="' + esc(v.ma_vt) + '"' + (v.kiem_soat ? ' checked' : '') + '> ' + (v.kiem_soat ? '<span class="tag t-bad">Có</span>' : '') + '</label></td></tr>').join('') + '</tbody></table></div>';
      $('kq').querySelectorAll('[data-ks]').forEach(c => { c.onchange = async () => { try { const r = await api('vt_sua', { vt: { ma_vt: c.dataset.ks, kiem_soat: c.checked } }); ds.find(v => v.ma_vt === r.ma_vt).kiem_soat = r.kiem_soat; toast(c.checked ? 'Đã đánh dấu kiểm soát đặc biệt' : 'Đã bỏ đánh dấu'); ve(); } catch (e) { toast(e.message, true); } }; });
    };
    $('q').oninput = ve; $('f-ks').onchange = ve; ve();
    $('b-nhap-vt').onclick = () => hopFileExcel('Nhập danh mục mã vật tư', 'Chọn file danh mục mã VT của Trường (cột "MÃ VẬT TƯ", "DANH MỤC VẬT TƯ", "ĐVỊ"…). Mã đã có được cập nhật, đánh dấu kiểm soát được giữ nguyên.', (rows, ten) => {
      const vt = docMaVT(rows);
      $('x-kq').innerHTML = hopFileExcel.chonSheet(ten) + '<p>Đọc được <b>' + vt.length + '</b> mã vật tư.</p><div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="x-ok">Nhập</button></div>';
      hopFileExcel.ganSheet();
      $('x-ok').onclick = async (e) => { const r = await chay(e.target, () => api('vt_nhap', { ds: vt })); dongHop(); toast(r.them + ' mã mới, ' + r.sua + ' cập nhật'); dieuHuong(); };
    }, /m[aã]\s*vt/i);
  }

  function napQR() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    return new Promise((ok, loi) => { const s = document.createElement('script'); s.src = 'qrcode.js'; s.onload = () => ok(window.qrcode); s.onerror = () => loi(new Error('Không tải được thư viện mã QR')); document.head.appendChild(s); });
  }
  // In theo bố cục biên bản bàn giao đang dùng (form chuẩn 1.7.6), có mã QR số biên bản ở góc để đối chiếu bản ký
  // Đơn QR3 → biên bản hóa chất của học phần
  async function hopDonVaoBB(d, h) {
    const lay = (re) => { const c = d.cot.find(x => re.test(x.ten)); return c ? h.gt[c.i] : ''; };
    const hk = hkMacDinh(); if (!hk) return toast('Chưa có học kỳ – tạo ở mục Hóa chất – vật tư', true);
    const ds = (await api('bb_ds', { hk })).filter(b => b.loai === 'HC'), hp = boDau(lay(/^Tên học phần/));
    const goiY = ds.find(b => hp && (boDau(b.ten_mon).indexOf(hp.replace(/^th\s+/, '')) >= 0 || hp.indexOf(boDau(b.ten_mon).replace(/^th\s+/, '')) >= 0));
    // tách "Tên – 500 ml; Tên 2 – 10 g" thành từng dòng
    const dong = String(lay(/^Hóa chất/)).split(/[;\n]+/).map(x => x.trim()).filter(Boolean).map(x => {
      const m = /^(.*?)\s*[–-]\s*([\d.,]+)\s*(.*)$/.exec(x); return m ? { ten: m[1].trim(), sl: m[2].replace(',', '.'), dvt: m[3].trim() } : { ten: x, sl: '', dvt: '' };
    });
    const nguoi = lay(/^Họ và tên/) + (lay(/^Giảng viên dạy/) ? ' (GVTH ' + lay(/^Giảng viên dạy/) + ')' : '');
    moHop('<h2>Đưa đơn QR3 vào biên bản hóa chất</h2><p class="note">Đơn ' + ngayVN(h.tg) + ' · ' + esc(nguoi) + ' · Học phần: ' + esc(lay(/^Tên học phần/)) + ' · Lớp HP: ' + esc(lay(/^Lớp học phần/)) + '</p><form id="f">' +
      o('bb', 'Biên bản (' + esc(hk) + ')', { select: [['', '— Chọn biên bản —']].concat(ds.map(b => [b.id, b.ten_mon + ' (' + b.id + ')'])), v: goiY ? goiY.id : '' }) +
      '<p class="note">Kiểm tra lại tên và số lượng tách từ đơn. Dòng trùng tên trong biên bản sẽ được cộng vào "Bổ sung"; hóa chất không có trong biên bản sẽ thêm dòng mới kèm ⚠.</p>' +
      '<div class="tbl-wrap"><table><thead><tr><th>Tên hóa chất – vật tư</th><th style="width:110px">Số lượng</th><th style="width:90px">ĐVT</th></tr></thead><tbody id="dong-qr3">' +
      dong.concat([{ ten: '', sl: '', dvt: '' }]).map(x => '<tr><td><input type="text" data-k="ten" value="' + esc(x.ten) + '"></td><td><input type="text" data-k="sl" value="' + esc(x.sl) + '"></td><td><input type="text" data-k="dvt" value="' + esc(x.dvt) + '"></td></tr>').join('') +
      '</tbody></table></div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Đưa vào biên bản</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const bb = e.target.querySelector('[name=bb]').value; if (!bb) return toast('Chọn biên bản', true);
      const ds2 = [...$('dong-qr3').querySelectorAll('tr')].map(tr => { const g = {}; tr.querySelectorAll('[data-k]').forEach(i => { g[i.dataset.k] = i.value.trim(); }); return g; }).filter(x => x.ten && +x.sl > 0);
      const r = await chay(e.submitter, () => api('bb_nhap_don', { id: bb, qr: 'QR3', tg: h.tg, r: h.r, nguoi_dk: nguoi, ds: ds2 }));
      dongHop(); toast('Đã cộng ' + r.ket_qua.length + ' dòng vào ' + bb + (r.ket_qua.some(k => k.dong_moi) ? ' (có dòng mới ⚠)' : ''));
    };
  }

  // ---------------- Biểu mẫu PTN (tải về) ----------------
  const BIEU_MAU = [
    ['Đơn KLTN – luận văn (Phụ lục 1, Quy định PTN 2026)', [['PL1A_Don-de-nghi-muon-dung-cu_KLTN_luan-van.docx', 'Phụ lục 1A – Đơn đề nghị mượn dụng cụ'], ['PL1B_Don-de-nghi-muon-phong-thi-nghiem_KLTN_luan-van.docx', 'Phụ lục 1B – Đơn đề nghị mượn phòng thí nghiệm'], ['PL1C_Don-de-nghi-muon-thiet-bi_KLTN_luan-van.docx', 'Phụ lục 1C – Đơn đề nghị mượn thiết bị']]],
    ['Đơn NCKH (Phụ lục 2)', [['PL2A_Don-de-nghi-muon-dung-cu_NCKH.docx', 'Phụ lục 2A – Đơn đề nghị mượn dụng cụ'], ['PL2B_Don-de-nghi-muon-phong-thi-nghiem_NCKH.docx', 'Phụ lục 2B – Đơn đề nghị mượn phòng thí nghiệm'], ['PL2C_Don-de-nghi-muon-thiet-bi_NCKH.docx', 'Phụ lục 2C – Đơn đề nghị mượn thiết bị']]],
    ['Sinh viên ngoài đơn vị (Phụ lục 3)', [['PL3_Don-dang-ky-su-dung-PTN_SV-ngoai-don-vi.docx', 'Phụ lục 3 – Đơn đăng ký sử dụng phòng thí nghiệm']]],
    ['Giảng viên – thiết bị', [['Don-de-nghi-muon-thiet-bi-dai-ngay_GV_Mau-QR2.docx', 'Đơn đề nghị mượn thiết bị dài ngày (mẫu QR2)'], ['Bieu-mau-bao-hong-thiet-bi.docx', 'Biểu mẫu báo hỏng thiết bị'], ['Phieu-de-nghi-sua-chua-thiet-bi.docx', 'Phiếu đề nghị sửa chữa thiết bị'], ['Phieu-de-nghi-bo-sung-thiet-bi.docx', 'Phiếu đề nghị bổ sung thiết bị'], ['Bien-ban-ban-giao-thiet-bi-PTN-cho-giang-vien.docx', 'Biên bản bàn giao thiết bị cho giảng viên']]]
  ];
  function manBieuMau() {
    const nd = trang('Biểu mẫu PTN');
    nd.innerHTML = '<p class="note">Các mẫu này cũng hiện ở trang công khai (mục Biểu mẫu PTN) cho sinh viên, giảng viên tải về. Sinh viên làm KLTN – NCKH dùng QR7 để có đơn Phụ lục 1A – 3 điền sẵn.</p>' +
      BIEU_MAU.map(g => '<div class="card"><h2>' + esc(g[0]) + '</h2><ul class="files">' + g[1].map(f => '<li><span>📄 ' + esc(f[1]) + '</span><a class="btn o sm" href="../bieu-mau/' + f[0] + '" download>Tải về (.docx)</a></li>').join('') + '</ul></div>').join('');
  }

  // ---------------- Các mục đang xây dựng ----------------
  const SAP_CO = {
    'de-tai': ['Hồ sơ đề tài KLTN – NCKH', 'Giai đoạn 3', ['QR7 mới: sinh viên khai đề tài, GVHD, danh sách nhóm, chọn đơn cần làm (mượn phòng / thiết bị / dụng cụ).',
      'Hệ thống tự điền và trả về file đơn đúng mẫu Phụ lục 1A – 3 để in, đề nghị GVHD ký, nộp PTN.', 'Cán bộ quét mã QR trên đơn giấy → mở đúng hồ sơ → "Đã nhận đơn ký" → Duyệt.',
      'Theo dõi dụng cụ, thiết bị, tủ, chìa khóa của từng nhóm; chỉ đóng hồ sơ khi đã trả đủ.', 'Minh chứng đề tài NCKH: upload (không bắt buộc). Phụ lục 3: in lệ phí + trạng thái "Đã thu phí".']],
    'hoa-chat': ['Hóa chất – vật tư', 'Giai đoạn 4', ['Danh mục vật tư theo mã VT của Trường (~3.600 mã, nhập từ file "Mã vật tư – mã bài tập"); đánh dấu hóa chất kiểm soát đặc biệt.',
      'Định mức theo bài thực hành (mã BT) – dữ liệu cốt lõi.', 'Upload thời khóa biểu thực hành → tự tính kế hoạch vật tư (theo học kỳ hoặc theo tháng) → xuất đúng mẫu gửi P.KHĐT.',
      'Kho hóa chất D11.01: nhập – xuất – tồn, cảnh báo sắp hết / hết hạn, lưu COA; sổ theo dõi tiền chất.']],
    'bien-ban': ['Biên bản bàn giao', 'Giai đoạn 4', ['Tự tạo biên bản hóa chất, dụng cụ cho từng lớp học phần theo form chuẩn; tải về in, soạn, giao lớp.',
      'Cây thư mục Năm học → Học kỳ → Môn → Lớp.', 'QR3 cấp bổ sung cộng thẳng vào biên bản hóa chất; hóa chất ngoài danh sách → thêm dòng + cảnh báo.',
      'Biên bản dụng cụ 2 nhánh: lớp thực hành và KLTN – NCKH; QR8 mượn thêm ghi thẳng vào biên bản, ghi chú người mượn; theo dõi trả – còn nợ.',
      'Upload bản đã ký (nhận đúng biên bản nhờ mã QR ở góc); đọc thử số trên bản scan, tô vàng ô khác với số trên web.']],
    'bao-cao': ['Báo cáo – thống kê', 'Giai đoạn 5', ['Dashboard riêng từng thiết bị: số lần, số giờ sử dụng, ai dùng nhiều, tỷ lệ khai thác, hỏng – sửa – kiểm định.',
      'Báo cáo tháng tự động (ngày 1 hằng tháng) – Excel và Word/PDF – lưu Drive theo năm học.', 'Tần suất dùng phòng; dự trù – thực cấp hóa chất; dụng cụ còn nợ; vi phạm; số liệu mẫu báo cáo KH&CN gửi P.QLKH.']],
    'qr8': ['QR8 – Đăng ký mượn thêm dụng cụ', 'Giai đoạn 3', ['Sinh viên / giảng viên chọn: Lớp thực hành (chọn lớp học phần) hoặc KLTN – NCKH (hệ thống nhận ra nhóm qua MSSV).',
      'Chọn dụng cụ từ biên bản dụng cụ của lớp / nhóm, nhập số lượng, ngày trả.', 'Cán bộ giao → ghi thẳng vào biên bản dụng cụ đúng nhánh, kèm ghi chú người mượn; nhận trả → tính còn nợ.']]
  };
  function sapCoHtml(k) {
    const s = SAP_CO[k];
    return '<div class="card"><span class="tag t-warn">Đang xây dựng – ' + esc(s[1]) + '</span><h2 style="margin-top:10px">' + esc(s[0]) + '</h2><p class="note">Theo Bản ý tưởng v4 (bản chốt), mục này sẽ gồm:</p><ul>' + s[2].map(x => '<li style="margin-bottom:6px">' + esc(x) + '</li>').join('') + '</ul></div>';
  }
  function manSapCo(k) { const nd = trang(esc(SAP_CO[k][0])); nd.innerHTML = sapCoHtml(k); }

  // ---------------- Phòng ----------------
  async function manDsPhong() {
    const nd = trang('Phòng thí nghiệm', laAdmin() ? '<button class="btn sm" id="b-them-phong">+ Thêm phòng</button>' : '');
    const ds = await api('phong_ds');
    nd.innerHTML = '<div class="grid g3">' + ds.map(p => '<div class="card room" data-href="#/phong/' + esc(p.ma) + '"><div class="code">' + esc(p.ma) + '</div><div>' + esc(p.ten) + '</div>' +
      '<div class="meta"><span>⚙ ' + p.so_tb + ' thiết bị</span><span>▣ ' + p.tu_dung + '/' + p.tu_tong + ' tủ đang dùng</span></div>' +
      (p.phu_trach ? '<div class="note" style="margin-top:6px">Phụ trách: ' + esc(p.phu_trach) + '</div>' : '') + '</div>').join('') + '</div>';
    nd.querySelectorAll('[data-href]').forEach(el => { el.onclick = () => { location.hash = el.dataset.href; }; });
    if ($('b-them-phong')) $('b-them-phong').onclick = () => hopPhong(null);
  }
  function hopPhong(p) {
    const moi = !p; p = p || { so_tu: 20 };
    moHop('<h2>' + (moi ? 'Thêm phòng' : 'Sửa thông tin phòng ' + esc(p.ma)) + '</h2><form id="f"><div class="form-grid">' +
      o('ma', 'Mã phòng', { v: p.ma, req: 1, ph: 'D11.02', extra: moi ? '' : ' readonly' }) + o('so_tu', 'Số tủ', { type: 'number', v: p.so_tu, help: 'Tăng số tủ sẽ tạo thêm tủ; không tự xóa tủ đang có' }) +
      o('ten', 'Tên phòng', { v: p.ten, req: 1, full: 1 }) + o('vi_tri', 'Vị trí', { v: p.vi_tri }) + o('dien_tich', 'Diện tích (m²)', { v: p.dien_tich }) +
      o('phu_trach', 'Cán bộ phụ trách', { v: p.phu_trach, full: 1 }) + o('chuc_nang', 'Chức năng', { v: p.chuc_nang, area: 1, full: 1 }) + o('ghi_chu', 'Ghi chú', { v: p.ghi_chu, full: 1 }) +
      '</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      await chay(e.submitter, () => api('phong_luu', { moi, phong: giaTri(e.target) }));
      S.dm = (await api('toi')).danh_muc; dongHop(); toast('Đã lưu phòng'); dieuHuong();
    };
  }
  async function manPhong(ma) {
    const nd = trang('Phòng ' + esc(ma), (laAdmin() ? '<button class="btn o sm" id="b-sua-phong">Sửa thông tin phòng</button>' : '') + '<button class="btn sm" id="b-them-tb">+ Thêm thiết bị vào phòng</button>',
      '<a href="#/phong">Phòng thí nghiệm</a> ›');
    const r = await api('phong_ct', { ma }), p = r.phong, hn = homNay();
    let h = '<div class="card"><h2>' + esc(p.ten) + '</h2><dl class="kv">' +
      [['Vị trí', p.vi_tri], ['Chức năng', p.chuc_nang], ['Cán bộ phụ trách', p.phu_trach], ['Diện tích', p.dien_tich ? p.dien_tich + ' m²' : ''], ['Ghi chú', p.ghi_chu]]
        .filter(x => x[1]).map(x => '<dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd>').join('') + '</dl></div>';
    h += '<div class="card"><h2>Sơ đồ tủ (' + r.tu.length + ')</h2><div class="lockers">' + r.tu.map(t =>
      '<div class="locker ' + (t.trang_thai === 'Đang dùng' ? 'dung' : t.trang_thai === 'Hỏng' ? 'hong' : '') + (t.trang_thai === 'Đang dùng' && t.han && t.han < hn ? ' qh' : '') + '" data-so="' + esc(t.so) + '" title="' + esc(t.trang_thai + (t.nguoi ? ' – ' + t.nguoi : '') + (t.han ? ' – hạn ' + ngayVN(t.han) : '')) + '">' +
      '<b>' + esc(t.so) + '</b><small>' + esc(t.trang_thai === 'Đang dùng' ? t.nguoi : t.trang_thai) + '</small></div>').join('') + '</div>' +
      '<div class="legend"><span><i></i>Trống</span><span><i style="background:var(--info-bg)"></i>Đang dùng</span><span><i style="background:var(--bad-bg)"></i>Hỏng</span><span><i style="outline:2px solid var(--warn)"></i>Quá hạn trả</span><span>Bấm vào tủ để giao / trả / báo hỏng</span></div></div>';
    h += '<div class="card"><h2>Thiết bị trong phòng (' + r.thiet_bi.filter(x => x.tinh_trang !== 'Đã thanh lý').length + ')</h2>' + bangTB(r.thiet_bi.filter(x => x.tinh_trang !== 'Đã thanh lý'), true) + '</div>';
    h += '<div id="lich-phong"></div>';
    nd.innerHTML = h;
    ganBangTB(nd);
    nd.querySelectorAll('.locker').forEach(el => { el.onclick = () => hopTu(r.tu.find(t => t.so === el.dataset.so)); });
    if (window.PTN_QL.lichPhong) window.PTN_QL.lichPhong(ma, $('lich-phong'));
    if ($('b-sua-phong')) $('b-sua-phong').onclick = () => hopPhong(p);
    $('b-them-tb').onclick = () => hopThietBi(null, ma);
  }
  function hopTu(t) {
    moHop('<h2>Tủ ' + esc(t.so) + ' – phòng ' + esc(t.phong) + '</h2><form id="f">' +
      o('trang_thai', 'Trạng thái', { select: S.dm.trang_thai_tu, v: t.trang_thai }) +
      '<div id="tu-dung"><div class="form-grid">' + o('nguoi', 'Người sử dụng (họ tên – MSSV/nhóm)', { v: t.nguoi, req: 1, full: 1 }) + o('sdt', 'Điện thoại', { v: t.sdt }) +
      o('tu_ngay', 'Từ ngày', { type: 'date', v: t.tu_ngay || homNay() }) + o('han', 'Hạn trả', { type: 'date', v: t.han }) + '</div></div>' +
      o('ghi_chu', 'Ghi chú', { v: t.ghi_chu }) +
      '<p class="note">Đơn QR6 khi cán bộ bấm "Giao chìa tủ" / "Trả tủ" sẽ tự cập nhật sơ đồ này.</p>' +
      '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>', (root) => {
      const sel = root.querySelector('[name=trang_thai]'), box = $('tu-dung');
      const doi = () => box.classList.toggle('hide', sel.value !== 'Đang dùng');
      sel.onchange = doi; doi();
    });
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const v = giaTri(e.target); v.phong = t.phong; v.so = t.so;
      await chay(e.submitter, () => api('tu_luu', { tu: v }));
      dongHop(); toast('Đã cập nhật tủ ' + t.so); dieuHuong();
    };
  }

  // ---------------- Tài sản ----------------
  function bangTB(ds, gon) {
    if (!ds.length) return '<div class="empty">Chưa có thiết bị.</div>';
    return '<div class="tbl-wrap"><table><thead><tr><th>Mã tài sản</th><th>Tên thiết bị</th>' + (gon ? '' : '<th>Phòng</th>') + '<th>Tình trạng</th><th>Kiểm định kế tiếp</th><th>Bảo dưỡng kế tiếp</th></tr></thead><tbody>' +
      ds.map(x => '<tr class="click" data-id="' + esc(x.id) + '"><td class="mono">' + (x.ma_ts ? esc(x.ma_ts) : '<span class="tag t-warn">chưa có</span>') + '</td><td><b>' + esc(x.ten) + '</b>' +
        (x.hang || x.model ? '<div class="note">' + esc([x.hang, x.model].filter(Boolean).join(' · ')) + '</div>' : '') + (x.nguoi_muon ? '<div class="note">Đang mượn: ' + esc(x.nguoi_muon) + '</div>' : '') + '</td>' +
        (gon ? '' : '<td>' + esc(x.phong || '—') + '</td>') + '<td>' + tag(x.tinh_trang) + '</td><td>' + hanTag(x.kd_ke) + '</td><td>' + hanTag(x.bd_ke) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function ganBangTB(root) { root.querySelectorAll('tr[data-id]').forEach(tr => { tr.onclick = () => { location.hash = '#/tai-san/' + tr.dataset.id; }; }); }

  async function manTaiSan() {
    const q = new URLSearchParams((location.hash.split('?')[1]) || '');
    const nd = trang('Tài sản Khoa', '<button class="btn o sm" id="b-xuat">Xem trước – in / Excel</button><button class="btn o sm" id="b-nhap">Nhập từ Excel</button><button class="btn sm" id="b-them">+ Thêm thiết bị</button>');
    const ds = await api('tb_ds'); S.cache.tb = ds;
    const ttMacDinh = q.get('tt') || '';
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm tên, mã tài sản, hãng, model, serial…">' +
      '<select id="f-phong"><option value="">Tất cả phòng</option>' + dsPhongChon().map(p => '<option value="' + esc(p[0]) + '">' + esc(p[0]) + '</option>').join('') + '<option value="-">Chưa xếp phòng</option></select>' +
      '<select id="f-tt"><option value="">Tình trạng (trừ đã thanh lý)</option><option value="*">Tất cả kể cả đã thanh lý</option><option value="hong">Hỏng / đang sửa</option>' + S.dm.tinh_trang_tb.map(t => '<option' + (t === ttMacDinh ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>' +
      '<label class="check" style="margin:0"><input type="checkbox" id="f-thieu"' + (q.get('thieu') ? ' checked' : '') + '> Chưa có mã TS</label></div><div id="kq"></div>';
    if (ttMacDinh === 'hong') $('f-tt').value = 'hong';
    const loc = () => {
      const tu = boDau($('q').value), ph = $('f-phong').value, tt = $('f-tt').value, thieu = $('f-thieu').checked;
      const l = ds.filter(x => (!tu || boDau([x.ten, x.ma_ts, x.hang, x.model, x.serial, x.id, x.loai].join(' ')).indexOf(tu) >= 0) &&
        (!ph || (ph === '-' ? !x.phong : x.phong === ph)) &&
        (tt === '*' || (tt === 'hong' ? (x.tinh_trang === 'Hỏng – chờ sửa' || x.tinh_trang === 'Đang sửa') : tt ? x.tinh_trang === tt : x.tinh_trang !== 'Đã thanh lý')) &&
        (!thieu || !x.ma_ts));
      $('kq').innerHTML = '<p class="note">' + l.length + ' / ' + ds.length + ' thiết bị</p>' + bangTB(l);
      ganDieuHuong(l.map(x => '#/tai-san/' + x.id), 'thiết bị');
      ganBangTB($('kq'));
    };
    ['q', 'f-phong', 'f-tt', 'f-thieu'].forEach(id => { $(id).oninput = loc; $(id).onchange = loc; });
    loc();
    $('b-them').onclick = () => hopThietBi(null);
    $('b-nhap').onclick = hopNhapExcel;
    $('b-xuat').onclick = () => xuatExcel(ds);
  }

  const TRUONG_TB = [
    ['ma_ts', 'Mã tài sản', { ph: 'Theo nhãn dán trên máy' }], ['ten', 'Tên thiết bị', { req: 1 }], ['loai', 'Loại thiết bị'], ['hang', 'Hãng sản xuất'],
    ['model', 'Model'], ['serial', 'Số serial'], ['xuat_xu', 'Xuất xứ'], ['nguon_von', 'Nguồn vốn'], ['nam_sx', 'Năm sản xuất'],
    ['ngay_nhan', 'Ngày nhận / đưa vào sử dụng', { type: 'date' }], ['nguyen_gia', 'Nguyên giá (VNĐ)', { ph: 'Chỉ nhập số' }],
    ['kd_gan', 'Kiểm định gần nhất', { type: 'date' }], ['kd_chu_ky', 'Chu kỳ kiểm định (tháng)', { type: 'number' }], ['kd_ke', 'Kiểm định kế tiếp', { type: 'date', help: 'Để trống: tự tính từ ngày gần nhất + chu kỳ' }],
    ['bd_gan', 'Bảo dưỡng gần nhất', { type: 'date' }], ['bd_chu_ky', 'Chu kỳ bảo dưỡng (tháng)', { type: 'number' }], ['bd_ke', 'Bảo dưỡng kế tiếp', { type: 'date' }],
    ['thong_so', 'Thông số kỹ thuật', { area: 1, full: 1 }], ['ghi_chu', 'Ghi chú', { full: 1 }]
  ];
  function hopThietBi(tb, phongMacDinh) {
    const moi = !tb; tb = tb || { phong: phongMacDinh || '' };
    let h = '<h2>' + (moi ? 'Thêm thiết bị' : 'Sửa thông tin – ' + esc(tb.ten)) + '</h2><form id="f"><div class="form-grid">';
    TRUONG_TB.forEach(f => {
      h += o(f[0], f[1], Object.assign({ v: tb[f[0]] }, f[2] || {}));
      if (f[0] === 'ten') h += moi ? o('phong', 'Phòng', { select: dsPhongChon('— Chưa xếp phòng —'), v: tb.phong }) : '<label class="f"><span>Phòng</span><input type="text" value="' + esc(tb.phong || '—') + '" readonly><span class="note">Đổi phòng: dùng "Điều chuyển"</span></label>';
    });
    h += '</div><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>';
    moHop(h);
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const v = giaTri(e.target); if (!moi) { v.id = tb.id; delete v.phong; }
      const r = await chay(e.submitter, () => api('tb_luu', { tb: v }));
      dongHop(); toast(moi ? 'Đã thêm ' + r.id : 'Đã lưu');
      if (moi) location.hash = '#/tai-san/' + r.id; else dieuHuong();
    };
  }

  async function manThietBi(id) {
    const nd = trang('Hồ sơ thiết bị', '', '<a href="#/tai-san">Tài sản</a> ›');
    const r = await api('tb_ct', { id }), x = r.tb, tl = x.tinh_trang === 'Đã thanh lý';
    $('main').querySelector('h1').innerHTML = esc(x.ten) + ' ' + tag(x.tinh_trang);
    const loai = S.dm.loai_su_kien.filter(l => !tl || l.ma === 'ghi_chu');
    let h = '<div class="btns" style="margin-bottom:14px"><select id="sk-loai"><option value="">+ Ghi sự kiện…</option>' + loai.map(l => '<option value="' + l.ma + '">' + esc(l.ten) + '</option>').join('') + '</select>' +
      '<button class="btn o sm" id="b-sua">Sửa thông tin</button><button class="btn o sm" id="b-tep">Đính kèm tệp</button><a class="btn o sm" href="#/bao-cao/tb/' + esc(x.id) + '">Dashboard sử dụng</a>' +
      '<button class="btn o sm" id="b-tem">In tem</button><button class="btn o sm" onclick="window.print()">In hồ sơ</button>' +
      (laAdmin() ? '<button class="btn red sm" id="b-xoa">Xóa (nhập nhầm)</button>' : '') + '</div>';
    const ttin = [['ID', x.id], ['Mã tài sản', x.ma_ts || '— chưa có —'], ['Phòng', x.phong ? x.phong + ' – ' + phongTen(x.phong) : '— chưa xếp phòng —'], ['Loại', x.loai],
      ['Hãng / model', [x.hang, x.model].filter(Boolean).join(' · ')], ['Số serial', x.serial], ['Xuất xứ', x.xuat_xu], ['Nguồn vốn', x.nguon_von], ['Năm SX', x.nam_sx],
      ['Ngày nhận', ngayVN(x.ngay_nhan)], ['Nguyên giá', tien(x.nguyen_gia)], ['Người đang mượn', x.nguoi_muon ? x.nguoi_muon + (x.han_tra ? ' – hạn ' + ngayVN(x.han_tra) : '') : ''],
      ['Thông số', x.thong_so], ['Ghi chú', x.ghi_chu], ['Cập nhật', x.cap_nhat ? ngayVN(x.cap_nhat) + ' – ' + x.nguoi_cap_nhat : '']].filter(k => k[1]);
    h += '<div class="grid g2"><div><div class="card"><h2>Thông tin</h2><dl class="kv">' + ttin.map(k => '<dt>' + k[0] + '</dt><dd>' + esc(k[1]) + '</dd>').join('') + '</dl></div>' +
      '<div class="card"><h2>Kiểm định – bảo dưỡng</h2><dl class="kv"><dt>Kiểm định gần nhất</dt><dd>' + (ngayVN(x.kd_gan) || '—') + (x.kd_chu_ky ? ' · chu kỳ ' + esc(x.kd_chu_ky) + ' tháng' : '') + '</dd><dt>Kiểm định kế tiếp</dt><dd>' + hanTag(x.kd_ke) + '</dd>' +
      '<dt>Bảo dưỡng gần nhất</dt><dd>' + (ngayVN(x.bd_gan) || '—') + (x.bd_chu_ky ? ' · chu kỳ ' + esc(x.bd_chu_ky) + ' tháng' : '') + '</dd><dt>Bảo dưỡng kế tiếp</dt><dd>' + hanTag(x.bd_ke) + '</dd></dl></div>' +
      '<div class="card"><h2>Tệp đính kèm (' + r.tep.length + ')</h2>' + (r.tep.length ? '<ul class="files">' + r.tep.map(f => '<li><span>📄 ' + esc(f.ten) + '<br><span class="note">' + esc((f.mo_ta ? f.mo_ta + ' · ' : '') + ngayVN(f.tao) + ' · ' + f.nguoi + ' · ' + Math.ceil(f.kich_thuoc / 1024) + ' KB') + '</span></span><span class="btns"><button class="btn o sm" data-tai="' + esc(f.id) + '">Tải về</button>' + (laAdmin() ? '<button class="btn red sm" data-xoa-tep="' + esc(f.id) + '">Xóa</button>' : '') + '</span></li>').join('') + '</ul>' : '<div class="note">Chưa có. Có thể đính kèm phiếu xuất kho, biên bản bàn giao, giấy kiểm định, hóa đơn sửa chữa…</div>') + '</div></div>' +
      '<div class="card"><h2>Dòng thời gian</h2><ul class="timeline">' + r.su_kien.map(s => '<li><div class="when">' + ngayVN(s.ngay) + ' · ' + esc(s.nguoi) + '</div><div class="what">' + esc(s.ten_loai) +
        (s.tu || s.den ? ' <span class="note">' + esc([s.tu, s.den].filter(Boolean).join(' → ')) + '</span>' : '') + '</div>' + (s.noi_dung ? '<div>' + esc(s.noi_dung) + '</div>' : '') + (s.chi_phi ? '<div class="note">Chi phí: ' + tien(s.chi_phi) + '</div>' : '') + '</li>').join('') + '</ul></div></div>';
    nd.innerHTML = h;
    $('sk-loai').onchange = (e) => { if (e.target.value) hopSuKien(x, e.target.value); e.target.value = ''; };
    $('b-sua').onclick = () => hopThietBi(x);
    $('b-tep').onclick = () => hopTep(x);
    $('b-tem').onclick = () => window.PTN_QL.inTem([x], 'tb');
    if ($('b-xoa')) $('b-xoa').onclick = async (e) => {
      const ly = prompt('Chỉ xóa khi nhập nhầm / trùng. Máy hỏng, bỏ đi → dùng sự kiện "Thanh lý".\nNhập lý do xóa:');
      if (!ly) return;
      await chay(e.target, () => api('tb_xoa', { id: x.id, ly_do: ly })); toast('Đã xóa'); location.hash = '#/tai-san';
    };
    nd.querySelectorAll('[data-tai]').forEach(b => { b.onclick = (e) => chay(e.target, () => taiVe(b.dataset.tai)); });
    nd.querySelectorAll('[data-xoa-tep]').forEach(b => { b.onclick = async (e) => { if (!confirm('Xóa tệp này?')) return; await chay(e.target, () => api('tep_xoa', { id: b.dataset.xoaTep })); toast('Đã xóa tệp'); dieuHuong(); }; });
  }

  function hopSuKien(x, loai) {
    const L = S.dm.loai_su_kien.find(l => l.ma === loai);
    let f = o('ngay', 'Ngày', { type: 'date', v: homNay(), req: 1 });
    if (loai === 'dieu_chuyen') f += o('den', 'Chuyển đến phòng', { select: dsPhongChon('— Chọn phòng —').filter(p => p[0] !== x.phong), req: 1 });
    if (loai === 'cho_muon') f += '<div class="form-grid">' + o('nguoi_muon', 'Người mượn (họ tên – đơn vị)', { req: 1 }) + o('han_tra', 'Hạn trả', { type: 'date' }) + '</div>';
    if (loai === 'nhan_tra') f += o('tinh_trang', 'Tình trạng máy khi nhận lại', { select: ['Đang sử dụng', 'Hỏng – chờ sửa'] });
    if (loai === 'kiem_dinh') f += '<div class="form-grid">' + o('ket_qua', 'Kết quả', { select: ['Đạt', 'Không đạt'] }) + o('chu_ky', 'Chu kỳ (tháng)', { type: 'number', v: x.kd_chu_ky }) +
      o('ke_tiep', 'Ngày kiểm định kế tiếp', { type: 'date', help: 'Để trống: tự tính theo chu kỳ' }) + o('tinh_trang', 'Tình trạng sau kiểm định', { select: [['', 'Giữ nguyên']].concat(S.dm.tinh_trang_tb.filter(t => t !== 'Đã thanh lý' && t !== 'Đang cho mượn').map(t => [t, t])) }) + '</div>';
    if (loai === 'bao_duong') f += '<div class="form-grid">' + o('chu_ky', 'Chu kỳ (tháng)', { type: 'number', v: x.bd_chu_ky }) + o('ke_tiep', 'Ngày bảo dưỡng kế tiếp', { type: 'date', help: 'Để trống: tự tính theo chu kỳ' }) + '</div>';
    if (['sua_chua', 'sua_xong', 'bao_duong', 'kiem_dinh', 'nhan_moi'].indexOf(loai) >= 0) f += o('chi_phi', 'Chi phí (VNĐ)', { ph: 'Nếu có' });
    const goiY = { bao_hong: 'Mô tả hư hỏng, người báo…', thanh_ly: 'Số quyết định / biên bản thanh lý…', nhan_moi: 'Số phiếu xuất kho, hợp đồng, đơn vị tài trợ…', sua_chua: 'Đơn vị sửa chữa, phiếu đề nghị…' }[loai] || '';
    f += o('noi_dung', 'Nội dung', { area: 1, ph: goiY, req: loai === 'ghi_chu' || loai === 'thanh_ly' }) +
      '<label class="f"><span>Đính kèm tệp (không bắt buộc)</span><input type="file" name="tep"></label>';
    const canhBao = loai === 'thanh_ly' ? '<p class="err">Sau khi thanh lý, máy chỉ còn thêm được ghi chú.</p>' : '';
    moHop('<h2>' + esc(L.ten) + ' – ' + esc(x.ten) + '</h2>' + canhBao + '<form id="f">' + f + '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const fileEl = e.target.querySelector('[name=tep]'), file = fileEl.files[0];
      const v = giaTri(e.target); delete v.tep; v.loai = loai;
      if ((loai === 'ghi_chu' || loai === 'thanh_ly') && !v.noi_dung) return toast('Nhập nội dung', true);
      await chay(e.submitter, async () => {
        await api('tb_su_kien', { id: x.id, sk: v });
        if (file) await guiTep(x.id, file, L.ten);
      });
      dongHop(); toast('Đã ghi: ' + L.ten); dieuHuong();
    };
  }

  function docB64(file) {
    return new Promise((ok, loi) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => loi(new Error('Không đọc được tệp')); r.readAsDataURL(file); });
  }
  async function guiTep(tbId, file, moTa) {
    if (file.size > 15 * 1024 * 1024) throw new Error('Tệp lớn hơn 15 MB');
    const b64 = await docB64(file);
    return api('tep_len', { lien_ket: tbId, ten: file.name, mime: file.type || 'application/octet-stream', b64, mo_ta: moTa || '' });
  }
  function hopTep(x) {
    moHop('<h2>Đính kèm tệp – ' + esc(x.ten) + '</h2><form id="f"><label class="f"><span>Chọn tệp (PDF, ảnh, Word, Excel – tối đa 15 MB) <em>*</em></span><input type="file" name="tep" required></label>' +
      o('mo_ta', 'Mô tả', { ph: 'VD: Phiếu xuất kho số …, Giấy chứng nhận kiểm định 2026' }) +
      '<p class="note">Tệp lưu trong Google Drive của Khoa, chỉ cán bộ đăng nhập mới tải được.</p><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tải lên</button></div></form>');
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const file = e.target.querySelector('[name=tep]').files[0]; if (!file) return;
      await chay(e.submitter, () => guiTep(x.id, file, e.target.querySelector('[name=mo_ta]').value.trim()));
      dongHop(); toast('Đã tải lên'); dieuHuong();
    };
  }
  async function taiVe(id) {
    const f = await api('tep_tai', { id });
    const bin = atob(f.b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: f.mime }));
    const a = document.createElement('a'); a.href = url; a.download = f.ten; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ---------------- Excel ----------------
  function napXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, loi) => { const s = document.createElement('script'); s.src = XLSX_URL; s.onload = () => ok(window.XLSX); s.onerror = () => loi(new Error('Không tải được thư viện Excel (cần mạng)')); document.head.appendChild(s); });
  }
  // Ghép tiêu đề cột trong file với trường dữ liệu (theo từ khóa, không dấu)
  const GHEP_COT = [
    ['ma_ts', ['ma tai san', 'ma ts', 'ma thiet bi']], ['ten', ['ten thiet bi', 'ten may', 'ten tai san', 'ten']], ['phong', ['ma phong', 'phong', 'vi tri dat', 'vi tri']],
    ['loai', ['loai']], ['hang', ['hang']], ['model', ['model', 'ky hieu']], ['serial', ['serial', 'so may']], ['xuat_xu', ['xuat xu', 'quoc gia']],
    ['nguon_von', ['nguon von']], ['nam_sx', ['nam san xuat', 'nam sx']], ['ngay_nhan', ['ngay dua vao su dung', 'ngay nhan', 'ngay mua']],
    ['nguyen_gia', ['nguyen gia']], ['kd_gan', ['kiem dinh gan nhat']], ['kd_ke', ['kiem dinh ke tiep']], ['kd_chu_ky', ['chu ky kiem dinh', 'chu ky kd']],
    ['thong_so', ['thong so']], ['ghi_chu', ['ghi chu']]
  ];
  function ghepCot(tieuDe) {
    const map = {}, daDung = {};
    GHEP_COT.forEach(([k, tu]) => {
      for (const t of tu) {
        const i = tieuDe.findIndex((h, j) => !daDung[j] && boDau(h).indexOf(t) >= 0);
        if (i >= 0) { map[k] = i; daDung[i] = 1; return; }
      }
    });
    return map;
  }
  function chuanNgay(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
    const s = String(v).trim();
    let m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s); if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    if (/^\d{4}$/.test(s)) return s + '-01-01';
    return s; // máy chủ sẽ báo dòng sai ngày
  }
  function chuanPhong(v) { const m = /([A-Z])\s?(\d{1,2})\.(\d{2})/i.exec(String(v || '')); return m ? (m[1].toUpperCase() + m[2].padStart(2, '0') + '.' + m[3]) : ''; }
  // ---- Bộ đọc các file Excel của PTN (mảng hàng như SheetJS sheet_to_json header:1) ----
  const so1 = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const chu = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const tim = (row, re) => row.findIndex(c => re.test(boDau(chu(c)))); // tiêu đề có thể xuống dòng
  // File "Kế hoạch vật tư" (KSK. KH vat HKx …): khối theo môn "1. TH …", danh sách lớp (mã lớp, mã HP, sĩ số), vật tư + SLG/1HS (+ SLG nếu có)
  // tuy.monKhongSo: tên môn có thể ghi không đánh số (file dự trù của môn: "Công nghiệp dược" cùng dòng lớp, STT 1)
  function docKeHoachVatTu(rows, tuy) {
    tuy = tuy || {};
    const h = rows.findIndex(r => r.some(c => /qu[iy] cach/.test(boDau(chu(c)))) && r.some(c => /slg/.test(boDau(chu(c)))));
    if (h < 0) throw new Error('Không thấy dòng tiêu đề (cần cột "QUI CÁCH VẬT TƯ", "SLG/1HS")');
    const H = rows[h], C = {
      a: 0, lop: tim(H, /ma so lop|^lop$/), lhp: tim(H, /ma hoc phan|ma lhp/), ss: tim(H, /si so|sy so/), stt: tim(H, /^stt$/),
      ten: tim(H, /qu[iy] cach/), ma: tim(H, /^ma\s*vt$|ma vat tu/), nsx: tim(H, /^nsx$/), dvt: tim(H, /^dv|don vi/), dm: tim(H, /slg\s*\/\s*1|\/\s*1\s*(hs|sv)/), gc: tim(H, /ghi chu/),
      sl: tim(H, /^slg$|^so luong$|^tong slg?$/)
    };
    const mon = []; let m = null, sec = 0, sttTruoc = 0; const nhan = {};
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i] || [], a = chu(r[0]);
      if (/hieu truong|nguoi lap|truong khoa/.test(boDau(a))) break;
      const dauMon = /^\d+\s*[.)]\s*\S/.test(a) || (tuy.monKhongSo && a && so1(r[C.stt]) === 1 && C.lop >= 0 && (chu(r[C.lop]) || chu(r[C.lhp])));
      if (dauMon) { m = { ten: a.replace(/^\d+\s*[.)]\s*/, ''), ma_hp: [], lop: [], dm: [] }; mon.push(m); sec++; sttTruoc = 0; }
      if (!m) continue;
      const stt = so1(r[C.stt]);
      if (stt && stt <= sttTruoc) sec++;
      if (stt) sttTruoc = stt;
      if (a && !dauMon) nhan[sec] = a.charAt(0) + a.slice(1).toLowerCase();
      if (C.lop >= 0 && (chu(r[C.lop]) || chu(r[C.lhp])) && (/\d/.test(chu(r[C.lhp])) || so1(r[C.ss]) > 0)) { // bỏ dòng tiêu đề lặp lại, dòng nhãn "PHẦN HÓA CHẤT"
        const lhp = chu(r[C.lhp]);
        m.lop.push({ lop: chu(r[C.lop]), ma_lhp: lhp, si_so: so1(r[C.ss]) });
        if (/^\d{10}/.test(lhp) && m.ma_hp.indexOf(lhp.slice(0, 10)) < 0) m.ma_hp.push(lhp.slice(0, 10));
      }
      const ten = chu(r[C.ten]);
      if (ten && stt) m.dm.push({ _sec: sec, stt, ten, ma_vt: chu(r[C.ma]), nsx: chu(r[C.nsx]), dvt: chu(r[C.dvt]), dm: so1(r[C.dm]), sl: C.sl >= 0 ? so1(r[C.sl]) : 0, ghi_chu: C.gc >= 0 ? chu(r[C.gc]) : '' });
    }
    mon.forEach(x => x.dm.forEach(d => { d.nhom = nhan[d._sec] || 'Hóa chất'; delete d._sec; }));
    return mon.filter(x => x.dm.length);
  }
  // Phiếu dự trù hóa chất – vật tư của một môn (mẫu PHIẾU DỰ TRÙ: tên môn, mã môn / mã HP, tổng số sinh viên; nhóm 1. Hóa chất · 2. Dược liệu · 3. Vật tư tiêu hao;
  // cột TÊN NGUYÊN LIỆU – QUY CÁCH, CÔNG THỨC, MÃ VT, NSX, ĐVT, ĐM 1 SV, TỔNG SV, SL DỰ TRÙ, GHI CHÚ). Không phải phiếu → null
  function docPhieuDuTru(rows) {
    if (!rows.some(r => r.some(c => /phieu du tru/.test(boDau(chu(c)))))) return null;
    const sauNhan = (re) => { for (const r of rows) { const j = r.findIndex(c => re.test(boDau(chu(c)))); if (j >= 0) { for (let k = j + 1; k < r.length; k++) if (chu(r[k])) return r[k]; return ''; } } return ''; };
    const ten = chu(sauNhan(/^ten mon thuc hanh/)), maMon = chu(sauNhan(/^ma mon/)), ss = so1(sauNhan(/^tong so sinh vien/));
    const h = rows.findIndex(r => r.some(c => /ten nguyen lieu|qu[iy] cach/.test(boDau(chu(c)))) && r.some(c => /^dm/.test(boDau(chu(c)))));
    if (h < 0) throw new Error('Phiếu dự trù thiếu dòng tiêu đề danh mục (TÊN NGUYÊN LIỆU – QUY CÁCH, ĐM 1 SV…)');
    const H = rows[h], C = { stt: tim(H, /^stt$/), ten: tim(H, /ten nguyen lieu|qu[iy] cach/), ct: tim(H, /cong thuc/), ma: tim(H, /^ma\s*vt$/), nsx: tim(H, /^nsx$/), dvt: tim(H, /^dvt|^dv/),
      dm: tim(H, /^dm/), sl: tim(H, /^sl/), gc: tim(H, /ghi chu/) };
    const TEN_NHOM = ['Hóa chất', 'Dược liệu', 'Vật tư tiêu hao'], dm = []; let nhom = 'Hóa chất';
    for (let i = h + 1; i < rows.length; i++) {
      const r = rows[i] || [], t = chu(r[C.ten]), a = boDau(chu(r[0]) + ' ' + t);
      if (/tong so khoan|^ghi chu/.test(boDau(chu(r[0])))) break;
      const g = /^\s*([123])\s*[.)]\s*(hoa chat|duoc lieu|vat tu)/.exec(boDau(t)); if (g) { nhom = TEN_NHOM[+g[1] - 1]; continue; }
      if (!t || /^(stt|ten nguyen lieu)/.test(a.trim())) continue;
      dm.push({ stt: so1(r[C.stt]) || dm.length + 1, nhom, nhom_dt: String(TEN_NHOM.indexOf(nhom) + 1), ten: t, cong_thuc: C.ct >= 0 ? chu(r[C.ct]) : '', ma_vt: chu(r[C.ma]), nsx: chu(r[C.nsx]), dvt: chu(r[C.dvt]), dm: so1(r[C.dm]), sl: C.sl >= 0 ? so1(r[C.sl]) : 0, ghi_chu: C.gc >= 0 ? chu(r[C.gc]) : '' });
    }
    const hp = (maMon.match(/\d{10}/g) || []), m = /\bM\d+\b/.exec(maMon);
    return { ten, mon: m ? m[0] : '', ma_hp: hp, lop: [{ lop: '', ma_lhp: '', si_so: ss }], dm };
  }
  // File "TH & Phòng học" (thời khóa biểu thực hành)
  function docTKB(rows) {
    const h = rows.findIndex(r => r.some(c => /ma lhp/.test(boDau(chu(c)))) && r.some(c => /ten mon/.test(boDau(chu(c)))));
    if (h < 0) throw new Error('Không thấy dòng tiêu đề (cần cột "MÃ LHP", "TÊN MÔN HỌC")');
    const H = rows[h], C = { lhp: tim(H, /ma lhp/), mon: tim(H, /ten mon/), lop: tim(H, /^lop hoc$/), lopdk: tim(H, /lop du kien/), thu: tim(H, /^thu$/),
      tu: tim(H, /tu tiet/), den: tim(H, /den tiet/), nhom: tim(H, /^nhom$/), ss: tim(H, /si so/), bd: tim(H, /bat dau/), kt: tim(H, /ket thuc/), phong: tim(H, /phong/), gv: tim(H, /giang vien/) };
    return rows.slice(h + 1).filter(r => r && /^\d{6,}/.test(chu(r[C.lhp]))).map(r => ({
      ma_lhp: chu(r[C.lhp]), ten_mon: chu(r[C.mon]), lop: chu(r[C.lopdk]) || chu(r[C.lop]), nhom: chu(r[C.nhom]), si_so: so1(r[C.ss]), thu: chu(r[C.thu]),
      tiet: [chu(r[C.tu]), chu(r[C.den])].filter(Boolean).join('–'), bat_dau: chuanNgay(r[C.bd]), ket_thuc: chuanNgay(r[C.kt]), phong: chu(r[C.phong]), gv: chu(r[C.gv]) }));
  }
  // File danh mục mã vật tư của Trường
  function docMaVT(rows) {
    const h = rows.findIndex(r => r.some(c => /ma vat tu/.test(boDau(chu(c)))) && r.some(c => /danh muc/.test(boDau(chu(c)))));
    if (h < 0) throw new Error('Không thấy dòng tiêu đề (cần cột "MÃ VẬT TƯ", "DANH MỤC VẬT TƯ")');
    const H = rows[h], C = { ma: tim(H, /ma vat tu/), ten: tim(H, /danh muc/), loai: tim(H, /^loai$/), nsx: tim(H, /^nsx$/), dvt: tim(H, /^dv|don vi/), eff: tim(H, /effect/), nhom: tim(H, /^nhom$/) };
    return rows.slice(h + 1).filter(r => r && /^\d+$/.test(chu(r[C.ma])) && chu(r[C.ten])).map(r => ({
      ma_vt: chu(r[C.ma]), ten: chu(r[C.ten]), loai: chu(r[C.loai]), nsx: chu(r[C.nsx]), dvt: chu(r[C.dvt]), ma_effect: C.eff >= 0 ? chu(r[C.eff]) : '', nhom: C.nhom >= 0 ? chu(r[C.nhom]) : '' }));
  }
  // Biên bản dụng cụ theo môn (MÔN: …; STT | Tên dụng cụ | NSX | Số lượng[/ n nhóm] …) → định mức DC / 1 nhóm
  function docDungCu(rows) {
    const h = rows.findIndex(r => r && r.some(c => /ten dung cu/.test(boDau(chu(c)))));
    if (h < 0) throw new Error('Không thấy dòng tiêu đề (cần cột "Tên dụng cụ")');
    const H = rows[h], C = { stt: tim(H, /^stt$/), ten: tim(H, /ten dung cu/), nsx: tim(H, /^nsx/), dvt: tim(H, /^dvt|don vi/), sl: tim(H, /so luong/), gc: tim(H, /ghi chu/) };
    const chia = (/\/\s*(\d+)\s*nhom/.exec(boDau(chu(H[C.sl]))) || [])[1] || 1;
    const dongMon = rows.slice(0, h).map(r => (r || []).map(chu).join(' ')).find(t => /^mon\s*:/.test(boDau(t)));
    const ten = dongMon ? dongMon.replace(/^m[oô]n\s*:\s*/i, '').replace(/\s{2,}.*$/, '').trim() : '';
    const dm = rows.slice(h + 1).filter(r => r && chu(r[C.ten]) && so1(r[C.sl])).map((r, i) => ({ stt: so1(r[C.stt]) || i + 1, ten: chu(r[C.ten]), nsx: chu(r[C.nsx]),
      dvt: C.dvt >= 0 ? chu(r[C.dvt]) : 'cái', dm: Math.round(so1(r[C.sl]) / chia * 100) / 100, ghi_chu: C.gc >= 0 ? chu(r[C.gc]) : '', nhom: 'Dụng cụ' }));
    return { ten, dm, chia: +chia };
  }
  window.__PTN_TEST = { ghepCot, chuanNgay, chuanPhong, boDau, docKeHoachVatTu, docPhieuDuTru, docTKB, docMaVT, docDungCu };

  function hopNhapExcel() {
    moHop('<h2>Nhập thiết bị từ Excel</h2><p class="note">Chọn file Excel danh mục thiết bị (ví dụ "Danh muc thiet bi - K.KHSK.xlsx"). Hệ thống tự nhận cột theo tiêu đề; anh/chị kiểm tra lại trước khi nhập. Dòng trùng mã tài sản sẽ bị bỏ qua.</p>' +
      '<label class="f"><span>File Excel (.xlsx, .xls)</span><input type="file" id="x-file" accept=".xlsx,.xls,.xlsm,.csv"></label><div id="x-kq"></div>');
    $('x-file').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      $('x-kq').innerHTML = '<div class="loading"><div class="spin"></div></div>';
      try {
        const X = await napXlsx();
        const wb = X.read(await file.arrayBuffer(), { cellDates: true });
        veBuocGhep(X, wb, wb.SheetNames[0]);
      } catch (err) { $('x-kq').innerHTML = '<p class="err">' + esc(err.message) + '</p>'; }
    };
  }
  function veBuocGhep(X, wb, tenSheet) {
    const rows = X.utils.sheet_to_json(wb.Sheets[tenSheet], { header: 1, raw: true, defval: '' });
    let hd = rows.findIndex(r => r.some(c => /t[eê]n/i.test(String(c)) && /(thi[eế]t b[iị]|t[aà]i s[aả]n|m[aá]y)/i.test(String(c))));
    if (hd < 0) hd = rows.findIndex(r => r.filter(c => c !== '').length >= 2);
    if (hd < 0) { $('x-kq').innerHTML = '<p class="err">Không tìm thấy dòng tiêu đề.</p>'; return; }
    const tieuDe = rows[hd].map(c => String(c).replace(/\s+/g, ' ').trim());
    const map = ghepCot(tieuDe);
    const du = rows.slice(hd + 1).map((r, i) => ({ r, dong: hd + i + 2 })).filter(x => x.r.some(c => c !== '' && c != null));
    const chonCot = (k) => '<select data-k="' + k + '"><option value="">— bỏ qua —</option>' + tieuDe.map((t, i) => t ? '<option value="' + i + '"' + (map[k] === i ? ' selected' : '') + '>' + esc(t) + '</option>' : '').join('') + '</select>';
    $('x-kq').innerHTML = (wb.SheetNames.length > 1 ? '<label class="f"><span>Trang tính</span><select id="x-sheet">' + wb.SheetNames.map(n => '<option' + (n === tenSheet ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label>' : '') +
      '<p><b>' + du.length + '</b> dòng có dữ liệu (tiêu đề ở dòng ' + (hd + 1) + ').</p><div class="tbl-wrap" style="max-height:300px"><table class="import-map"><thead><tr><th>Trường trong hệ thống</th><th>Lấy từ cột</th></tr></thead><tbody>' +
      TRUONG_TB.map(f => '<tr><td>' + esc(f[1]) + (f[0] === 'ten' ? ' <em style="color:var(--bad)">*</em>' : '') + '</td><td>' + chonCot(f[0]) + '</td></tr>').join('') +
      '<tr><td>Phòng (lấy mã dạng D11.02 trong ô)</td><td>' + chonCot('phong') + '</td></tr></tbody></table></div>' +
      '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn" id="x-nhap">Nhập ' + du.length + ' dòng</button></div>';
    if ($('x-sheet')) $('x-sheet').onchange = (e) => veBuocGhep(X, wb, e.target.value);
    $('x-nhap').onclick = async (e) => {
      const m = {}; $('x-kq').querySelectorAll('select[data-k]').forEach(s => { if (s.value !== '') m[s.dataset.k] = +s.value; });
      if (m.ten === undefined) return toast('Chọn cột "Tên thiết bị"', true);
      const ds = du.map(({ r, dong }) => {
        const o2 = { _dong: dong };
        Object.keys(m).forEach(k => { let v = r[m[k]]; if (['ngay_nhan', 'kd_gan', 'kd_ke', 'bd_gan', 'bd_ke'].indexOf(k) >= 0) v = chuanNgay(v); else if (k === 'phong') v = chuanPhong(v); else v = v instanceof Date ? chuanNgay(v) : String(v == null ? '' : v).trim(); o2[k] = v; });
        if (o2.nguyen_gia) o2.nguyen_gia = String(o2.nguyen_gia).replace(/[^\d]/g, '');
        return o2;
      }).filter(x => x.ten);
      const r = await chay(e.target, () => api('tb_nhap', { ds }));
      $('x-kq').innerHTML = '<div class="card"><b>Đã thêm ' + r.them + ' thiết bị.</b>' + (r.bo_qua.length ? '<p>Bỏ qua ' + r.bo_qua.length + ' dòng:</p><ul>' + r.bo_qua.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '') + '</div><div class="modal-foot"><button class="btn" data-dong>Đóng</button></div>';
      if (location.hash.indexOf('#/tai-san') === 0) setTimeout(dieuHuong, 300);
    };
  }
  // Danh mục thiết bị: bảng A4 ngang có định dạng (xem trước → in / tải Excel)
  function xuatExcel(ds) {
    const ten = (ma) => (S.dm.phong.find(p => p.ma === ma) || {}).ma || ma || '';
    window.PTN_IN.xemTruoc({ ten: 'Danh muc thiet bi KHSK ' + homNay(), trang: [window.PTN_IN.bang({ ten: 'Danh muc thiet bi', huong: 'ngang', tieuDe: 'DANH MỤC THIẾT BỊ PHÒNG THÍ NGHIỆM',
      phuDe: 'Khoa Khoa học Sức khỏe – cập nhật ngày ' + ngayVN(homNay()), ngay: 'TP. HCM, ngày ' + homNay().slice(8) + ' tháng ' + homNay().slice(5, 7) + ' năm ' + homNay().slice(0, 4),
      cot: [{ ten: 'STT', rong: 5, can: 'c' }, { ten: 'MÃ TÀI SẢN', rong: 13 }, { ten: 'TÊN THIẾT BỊ', rong: 34 }, { ten: 'PHÒNG', rong: 9, can: 'c' }, { ten: 'HÃNG – MODEL', rong: 20 }, { ten: 'SỐ SERIAL', rong: 13 },
        { ten: 'NĂM SD', rong: 8, can: 'c' }, { ten: 'NGUYÊN GIÁ (đ)', rong: 14, dd: '0' }, { ten: 'TÌNH TRẠNG', rong: 14 }, { ten: 'KĐ KẾ TIẾP', rong: 11, can: 'c' }, { ten: 'GHI CHÚ', rong: 22 }],
      dong: ds.map((x, i) => [i + 1, x.ma_ts, x.ten, ten(x.phong), [x.hang, x.model].filter(Boolean).join(' – '), x.serial, (x.ngay_nhan || '').slice(0, 4), +x.nguyen_gia || '', x.tinh_trang, ngayVN(x.kd_ke), x.ghi_chu]),
      tong: ['', '', 'Tổng: ' + ds.length + ' thiết bị', '', '', '', '', ds.reduce((a, x) => a + (+x.nguyen_gia || 0), 0) || '', '', '', ''],
      ky: [['NGƯỜI LẬP', '(Ký, ghi rõ họ tên)'], ['TRƯỞNG KHOA', '(Ký, ghi rõ họ tên)']] })] }); // họ tên người ký tự điền (PTN_KY)
  }


  // ---------------- Kiểm định – bảo dưỡng ----------------
  async function manKiemDinh() {
    const bd = /bd=1/.test(location.hash);
    const nd = trang('Kiểm định – bảo dưỡng', '<div class="btns"><a class="btn ' + (bd ? 'o ' : '') + 'sm" href="#/kiem-dinh">Kiểm định</a><a class="btn ' + (bd ? '' : 'o ') + 'sm" href="#/kiem-dinh?bd=1">Bảo dưỡng</a></div>');
    const ds = (await api('tb_ds')).filter(x => x.tinh_trang !== 'Đã thanh lý');
    const k = bd ? 'bd_ke' : 'kd_ke', hn = homNay(), d30 = congNgay(30), d60 = congNgay(60), ten = bd ? 'bảo dưỡng' : 'kiểm định';
    const nhom = [['Quá hạn', x => x[k] && x[k] < hn], ['Trong 30 ngày', x => x[k] >= hn && x[k] <= d30], ['Trong 31 – 60 ngày', x => x[k] > d30 && x[k] <= d60],
      ['Sau 60 ngày', x => x[k] > d60], ['Chưa có lịch ' + ten, x => !x[k]]];
    nd.innerHTML = nhom.map(([t, f]) => {
      const l = ds.filter(f).sort((a, b) => (a[k] || '').localeCompare(b[k] || ''));
      return '<div class="card"><h2>' + t + ' (' + l.length + ')</h2>' + (l.length ? '<div class="tbl-wrap"><table><thead><tr><th>Thiết bị</th><th>Mã TS</th><th>Phòng</th><th>Gần nhất</th><th>Kế tiếp</th><th></th></tr></thead><tbody>' +
        l.map(x => '<tr><td><a href="#/tai-san/' + esc(x.id) + '">' + esc(x.ten) + '</a></td><td class="mono">' + esc(x.ma_ts) + '</td><td>' + esc(x.phong) + '</td><td>' + ngayVN(bd ? x.bd_gan : x.kd_gan) + '</td><td>' + hanTag(x[k]) + '</td>' +
          '<td><button class="btn o sm" data-ghi="' + esc(x.id) + '">Ghi ' + ten + '</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="note">Không có.</div>') + '</div>';
    }).join('');
    nd.querySelectorAll('[data-ghi]').forEach(b => { b.onclick = () => hopSuKien(ds.find(x => x.id === b.dataset.ghi), bd ? 'bao_duong' : 'kiem_dinh'); });
  }

  // ---------------- Cán bộ (admin): tài khoản Gmail + mật khẩu, phân quyền theo mục ----------------
  const MUC_DO = [['', 'Không'], ['xem', 'Xem'], ['xu_ly', 'Xử lý']];
  function tomTatQuyen(q) {
    if (!q) return '<span class="tag t-ok">Toàn quyền</span>';
    const M = S.toi.muc_quyen || [], xl = M.filter(m => q[m[0]] === 'xu_ly').length, xem = M.filter(m => q[m[0]] === 'xem').length;
    const mau = (S.toi.mau_quyen || []).find(m => M.every(x => (m.quyen[x[0]] || '') === (q[x[0]] || '')));
    return (mau ? '<b>' + esc(mau.ten) + '</b><br>' : '') + '<span class="note">' + xl + ' mục xử lý · ' + xem + ' mục chỉ xem · ' + (M.length - xl - xem) + ' mục ẩn</span>';
  }
  // bảng chọn quyền: mỗi mục một dòng, 3 mức Không / Xem / Xử lý
  function bangQuyen(q) {
    return '<div class="tbl-wrap"><table class="bang-quyen"><thead><tr><th>Mục trên trang quản lý</th>' + MUC_DO.map(m => '<th>' + m[1] + '</th>').join('') + '</tr></thead><tbody>' +
      (S.toi.muc_quyen || []).map(m => '<tr><td>' + esc(m[1]) + '</td>' + MUC_DO.map(d => '<td><input type="radio" name="q_' + m[0] + '" value="' + d[0] + '"' + ((q[m[0]] || '') === d[0] ? ' checked' : '') + ' aria-label="' + esc(m[1] + ': ' + d[1]) + '"></td>').join('') + '</tr>').join('') +
      '</tbody></table></div><p class="note">Xem: xem, in, tải file. Xử lý: xem và nhập, sửa, duyệt, cấp phát. Hôm nay và Tài khoản luôn mở. Cài đặt, Cán bộ, Nhật ký, xóa dữ liệu: chỉ admin.</p>';
  }
  function docBangQuyen(root) { const q = {}; (S.toi.muc_quyen || []).forEach(m => { const r = root.querySelector('[name="q_' + m[0] + '"]:checked'); q[m[0]] = r ? r.value : ''; }); return q; }
  function ganMauQuyen(root) {
    root.querySelectorAll('[data-mau]').forEach(b => { b.onclick = () => { const m = (S.toi.mau_quyen || []).find(x => x.ma === b.dataset.mau);
      Object.keys(m.quyen).forEach(k => { const r = root.querySelector('[name="q_' + k + '"][value="' + (m.quyen[k] || '') + '"]'); if (r) r.checked = true; }); }; });
  }
  const nutMau = () => '<div class="btns mau-quyen"><span class="note">Mẫu nhanh:</span>' + (S.toi.mau_quyen || []).map(m => '<button type="button" class="btn o sm" data-mau="' + esc(m.ma) + '">' + esc(m.ten) + '</button>').join('') + '</div>';
  const oMatKhau = (ten, nhan, help) => '<div class="mk-o">' + o(ten, nhan, { type: 'password', extra: ' autocomplete="new-password"', help }) + '<button type="button" class="mk-hien" title="Hiện / ẩn mật khẩu">👁</button></div>';

  async function manCanBo() {
    if (!laAdmin()) { location.hash = '#/tong-quan'; return; }
    const nd = trang('Cán bộ', '<button class="btn sm" id="b-them-cb">+ Thêm cán bộ</button>');
    const ds = await api('canbo_ds');
    nd.innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>Họ tên</th><th>Gmail đăng nhập</th><th>Vai trò</th><th>Quyền</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr></thead><tbody>' +
      ds.map(c => '<tr><td><b>' + esc(c.ten) + '</b>' + (c.ghi_chu ? '<div class="note">' + esc(c.ghi_chu) + '</div>' : '') + '</td><td>' + esc(c.email) + '</td><td>' + esc(c.vai_tro) + '</td><td>' + tomTatQuyen(c.quyen) + '</td><td>' +
        (c.trang_thai === 'Hoạt động' ? '<span class="tag t-ok">Hoạt động</span>' : '<span class="tag t-gray">Khóa</span>') + '</td><td>' + ngayVN(c.ngay_tao) + '</td>' +
        '<td class="btns">' + (c.quyen ? '<button class="btn sm" data-quyen="' + esc(c.email) + '">Phân quyền</button>' : '') + '<button class="btn o sm" data-sua="' + esc(c.email) + '">Sửa</button><button class="btn o sm" data-pin="' + esc(c.email) + '">Cấp lại mật khẩu</button></td></tr>').join('') + '</tbody></table></div>' +
      '<p class="note">Cán bộ đăng nhập bằng <b>Gmail cá nhân</b> + <b>mật khẩu do admin cấp</b>. Mật khẩu chỉ hiện một lần khi tạo / cấp lại; cán bộ nên đổi mật khẩu ở mục Tài khoản. Khóa tài khoản hoặc cấp lại mật khẩu sẽ đăng xuất cán bộ khỏi mọi máy. Bấm <b>Phân quyền</b> để chọn mục cán bộ được xem / xử lý.</p>';
    $('b-them-cb').onclick = () => {
      moHop('<h2>Thêm cán bộ</h2><form id="f">' + o('ten', 'Họ tên', { req: 1 }) + o('email', 'Gmail cá nhân (dùng để đăng nhập)', { type: 'email', req: 1, ph: 'ten.canbo@gmail.com' }) +
        oMatKhau('mat_khau', 'Mật khẩu', 'Để trống: hệ thống tự tạo mật khẩu 8 ký tự. Tự đặt: 8 – 32 ký tự, có cả chữ và số.') +
        o('vai_tro', 'Vai trò', { select: [['Cán bộ PTN', 'Cán bộ PTN'], ['Admin', 'Admin (toàn quyền: quản lý cán bộ, cài đặt, xóa dữ liệu)']] }) +
        o('mau_quyen', 'Phân quyền ban đầu (sửa chi tiết sau bằng nút Phân quyền)', { select: (S.toi.mau_quyen || []).map(m => [m.ma, m.ten]) }) + o('ghi_chu', 'Ghi chú', {}) +
        '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Tạo tài khoản</button></div></form>');
      ganHienMatKhau($('f'));
      $('f').onsubmit = async (e) => { e.preventDefault(); const r = await chay(e.submitter, () => api('canbo_them', { cb: giaTri(e.target) })); hienPin(r); };
    };
    nd.querySelectorAll('[data-pin]').forEach(b => { b.onclick = () => {
      moHop('<h2>Cấp lại mật khẩu – ' + esc(b.dataset.pin) + '</h2><form id="f">' + oMatKhau('mat_khau', 'Mật khẩu mới', 'Để trống: hệ thống tự tạo. Tự đặt: 8 – 32 ký tự, có cả chữ và số.') +
        '<p class="note">Mật khẩu cũ hết hiệu lực, cán bộ bị đăng xuất khỏi các máy.</p><div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Cấp mật khẩu</button></div></form>');
      ganHienMatKhau($('f'));
      $('f').onsubmit = async (e) => { e.preventDefault(); hienPin(await chay(e.submitter, () => api('canbo_cap_pin', { email: b.dataset.pin, mat_khau: giaTri(e.target).mat_khau }))); };
    }; });
    nd.querySelectorAll('[data-quyen]').forEach(b => { b.onclick = () => {
      const c = ds.find(x => x.email === b.dataset.quyen);
      moHop('<h2>Phân quyền – ' + esc(c.ten) + '</h2><p class="note" style="margin-top:-6px">' + esc(c.email) + '</p><form id="f">' + nutMau() + bangQuyen(c.quyen) +
        '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu phân quyền</button></div></form>');
      ganMauQuyen($('f'));
      $('f').onsubmit = async (e) => { e.preventDefault(); await chay(e.submitter, () => api('canbo_quyen', { email: c.email, quyen: docBangQuyen(e.target) })); dongHop(); toast('Đã lưu phân quyền. Cán bộ thấy thay đổi khi tải lại trang.'); dieuHuong(); };
    }; });
    nd.querySelectorAll('[data-sua]').forEach(b => { b.onclick = () => {
      const c = ds.find(x => x.email === b.dataset.sua);
      moHop('<h2>Sửa – ' + esc(c.email) + '</h2><form id="f">' + o('ten', 'Họ tên', { v: c.ten, req: 1 }) + o('vai_tro', 'Vai trò', { select: ['Cán bộ PTN', 'Admin'], v: c.vai_tro }) +
        o('trang_thai', 'Trạng thái', { select: ['Hoạt động', 'Khóa'], v: c.trang_thai }) + o('ghi_chu', 'Ghi chú', { v: c.ghi_chu }) +
        '<div class="modal-foot"><button type="button" class="btn o" data-dong>Hủy</button><button class="btn">Lưu</button></div></form>');
      $('f').onsubmit = async (e) => { e.preventDefault(); const v = giaTri(e.target); v.email = c.email; await chay(e.submitter, () => api('canbo_sua', { cb: v })); dongHop(); toast('Đã lưu'); dieuHuong(); };
    }; });
  }
  function hienPin(r) {
    moHop('<h2>Mật khẩu của ' + esc(r.email) + '</h2><div class="pin-show">' + esc(r.pin) + '</div><p class="note">Ghi lại và gửi riêng cho cán bộ (tin nhắn / email cá nhân). Mật khẩu sẽ <b>không hiện lại</b>. Cán bộ đăng nhập bằng Gmail này rồi đổi mật khẩu ở mục Tài khoản.</p>' +
      '<div class="modal-foot"><button class="btn o" id="b-copy">Sao chép</button><button class="btn" data-dong>Xong</button></div>');
    $('b-copy').onclick = () => { try { navigator.clipboard.writeText(r.pin); toast('Đã sao chép'); } catch (e) { /* trình duyệt chặn */ } };
    $('modal').addEventListener('click', function f(e) { if (e.target.dataset && e.target.dataset.dong !== undefined) { $('modal').removeEventListener('click', f); dieuHuong(); } });
  }

  // ---------------- Nhật ký (admin) ----------------
  async function manNhatKy() {
    if (!laAdmin()) { location.hash = '#/tong-quan'; return; }
    const nd = trang('Nhật ký thao tác');
    const ds = await api('nhatky_ds', { n: 1000 });
    nd.innerHTML = '<div class="tools"><input type="search" id="q" placeholder="Tìm người, hành động, đối tượng…"></div><div id="kq"></div>';
    const ve = () => {
      const q = boDau($('q').value), l = ds.filter(x => !q || boDau([x.email, x.hanh_dong, x.doi_tuong, x.chi_tiet].join(' ')).indexOf(q) >= 0).slice(0, 500);
      $('kq').innerHTML = '<div class="tbl-wrap"><table><thead><tr><th>Thời gian</th><th>Người</th><th>Hành động</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead><tbody>' +
        l.map(x => '<tr><td style="white-space:nowrap">' + ngayVN(x.tg) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.hanh_dong) + '</td><td>' + (/^TB\d+$/.test(x.doi_tuong) ? '<a href="#/tai-san/' + esc(x.doi_tuong) + '">' + esc(x.doi_tuong) + '</a>' : esc(x.doi_tuong)) + '</td><td class="note">' + esc(String(x.chi_tiet).slice(0, 300)) + '</td></tr>').join('') + '</tbody></table></div>';
    };
    $('q').oninput = ve; ve();
  }

  // ---------------- Tài khoản ----------------
  async function manTaiKhoan() {
    const nd = trang('Tài khoản');
    const ph = await api('phien_ds'), q = S.toi.quyen;
    const quyenToi = q ? '<div class="tbl-wrap"><table><thead><tr><th>Mục</th><th>Quyền</th></tr></thead><tbody>' + (S.toi.muc_quyen || []).map(m => '<tr><td>' + esc(m[1]) + '</td><td>' +
      (q[m[0]] === 'xu_ly' ? '<span class="tag t-ok">Xem và xử lý</span>' : q[m[0]] === 'xem' ? '<span class="tag t-info">Chỉ xem</span>' : '<span class="tag t-gray">Không</span>') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<p><span class="tag t-ok">Admin – toàn quyền</span></p>';
    nd.innerHTML = '<div class="grid g2"><div class="card"><h2>Đổi mật khẩu</h2><p class="note" style="margin-top:-4px">Đăng nhập: <b>' + esc(S.toi.nguoi.email) + '</b></p><form id="f">' +
      oMatKhau('cu', 'Mật khẩu hiện tại') + oMatKhau('moi', 'Mật khẩu mới (8 – 32 ký tự, có cả chữ và số)') + oMatKhau('lai', 'Nhập lại mật khẩu mới') +
      '<button class="btn">Đổi mật khẩu</button><p class="note">Đổi mật khẩu sẽ đăng xuất các máy khác. Quên mật khẩu: liên hệ admin để được cấp lại.</p></form></div>' +
      '<div class="card"><h2>Quyền của tôi</h2>' + quyenToi + (q ? '<p class="note">Cần thêm quyền: liên hệ admin.</p>' : '') + '</div>' +
      '<div class="card" style="grid-column:1/-1"><h2>' + (laAdmin() ? 'Các máy đang đăng nhập (tất cả cán bộ)' : 'Các máy đang đăng nhập') + '</h2>' +
      (ph.length ? '<ul class="files">' + ph.map(p => '<li><span><b>' + esc(p.may || 'Không rõ') + '</b>' + (p.hien_tai ? ' <span class="tag t-ok">máy này</span>' : '') + '<br><span class="note">' + esc((laAdmin() ? p.email + ' · ' : '') + 'đăng nhập ' + ngayVN(p.tao) + ' · hoạt động ' + ngayVN(p.cuoi) + (p.ghi_nho === 'Có' ? ' · ghi nhớ' : '')) + '</span></span>' +
        (p.hien_tai ? '' : '<button class="btn red sm" data-huy="' + esc(p.ma) + '">Đăng xuất</button>') + '</li>').join('') + '</ul>' : '<div class="note">Không có.</div>') + '</div></div>';
    ganHienMatKhau($('f'));
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(e.target);
      if (v.moi !== v.lai) return toast('Mật khẩu nhập lại không khớp', true);
      await chay(e.submitter, () => api('doi_pin', { cu: v.cu, moi: v.moi })); e.target.reset(); toast('Đã đổi mật khẩu'); dieuHuong();
    };
    nd.querySelectorAll('[data-huy]').forEach(b => { b.onclick = async (e) => { if (!confirm('Đăng xuất phiên này?')) return; await chay(e.target, () => api('phien_huy', { ma: b.dataset.huy })); toast('Đã đăng xuất phiên'); dieuHuong(); }; });
  }

  // địa chỉ trang quản lý / trang công khai (để in mã QR: điện thoại quét là mở đúng trang)
  function lienKet(duong) { return location.href.split('#')[0].replace(/[?].*$/, '') + '#/' + duong; }
  function trangCongKhai() { return location.href.split('#')[0].replace(/[?].*$/, '').replace(/quan-ly\/(index\.html|chay-thu\.html)?$/, ''); }
  // dùng chung cho app-mo-rong.js
  window.PTN_QL = { S, $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, homNay, congNgay, boDau, tien, fmt, tag, hanTag, laAdmin, quyen, coQuyen, dieuHuong, napXlsx, napQR,
    guiTep, taiVe, docB64, dsPhongChon, phongTen, capNhatDanhMuc, lienKet, trangCongKhai, MENU, TUYEN, DEMO, ganDieuHuong, hopDonVaoBB, nhapFileHC, nhapFileDC, icon, docKeHoachVatTu, docPhieuDuTru, hopFileExcel };
  document.addEventListener('DOMContentLoaded', batDau);
})();
