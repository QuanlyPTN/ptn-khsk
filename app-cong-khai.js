/* Trang chủ công khai PTN Khoa KHSK: một mã QR tổng → 8 biểu mẫu, Biểu mẫu PTN, Đơn của tôi. Giai đoạn 2 – 3. */
(function () {
  'use strict';
  const DEMO = typeof window.PTN_DEMO === 'function';
  const $ = (id) => document.getElementById(id);
  const S = { dm: null, hs: null, bb: {} };
  const QR_TEN = { QR1: 'Mượn phòng; mượn – trả thiết bị, dụng cụ trong ngày', QR2: 'Giảng viên mượn thiết bị dài ngày', QR3: 'Cấp hóa chất – vật tư bổ sung',
    QR4: 'Mượn chìa khóa tại phòng Bảo vệ', QR5: 'Nhật ký sử dụng phòng, thiết bị', QR6: 'Đăng ký sử dụng tủ', QR7: 'Hồ sơ đề tài KLTN – NCKH', QR8: 'Đăng ký mượn thêm dụng cụ' };
  // đối tượng dùng mã (nhãn góc ô); QR2, QR3, QR4 nằm ở nhóm "Giảng viên – thiết bị"
  const QR_AI = { QR1: 'Giảng viên, Sinh viên', QR5: 'Giảng viên, Sinh viên', QR6: 'Giảng viên, Sinh viên', QR8: 'Giảng viên, Sinh viên', QR7: 'Sinh viên', QR2: 'Giảng viên', QR3: 'Giảng viên', QR4: 'Giảng viên' };
  const QR_GV = ['QR2', 'QR3', 'QR4'];
  const BIEU = { DT: '<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 14h10"/>', QR1: '<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-6h6v6"/>', QR2: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2z"/>',
    QR3: '<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>', QR4: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    QR5: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', QR6: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18"/><path d="M9 12h.01M15 12h.01"/>',
    QR7: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>', QR8: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 12v6M9 15h6"/>',
    mau: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    'GV-BH': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    'GV-SC': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    'GV-BS': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
    'GV-BG': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    'GV-TS': '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.3a1 1 0 0 0-.2-.6L18.3 9H14v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>', cua_toi: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>' };
  const bieu = (k) => '<span class="bieu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + BIEU[k] + '</svg></span>';
  const DOI_TUONG = ['Sinh viên', 'Học viên', 'Giảng viên', 'Khác'];
  const BO_MON = ['Dược học', 'Dinh dưỡng', 'Điều dưỡng', 'Khác'];
  const BM_KHOA = ['Dược học – KSK', 'Dinh dưỡng – KSK']; // QR7: bộ môn – khoa (khác thì tự nhập tay)
  const BIEU_MAU = [
    ['Đơn KLTN – luận văn (Phụ lục 1)', [['PL1A_Don-de-nghi-muon-dung-cu_KLTN_luan-van.docx', 'Phụ lục 1A – Đơn đề nghị mượn dụng cụ'], ['PL1B_Don-de-nghi-muon-phong-thi-nghiem_KLTN_luan-van.docx', 'Phụ lục 1B – Đơn đề nghị mượn phòng thí nghiệm'], ['PL1C_Don-de-nghi-muon-thiet-bi_KLTN_luan-van.docx', 'Phụ lục 1C – Đơn đề nghị mượn thiết bị']]],
    ['Đơn NCKH (Phụ lục 2)', [['PL2A_Don-de-nghi-muon-dung-cu_NCKH.docx', 'Phụ lục 2A – Đơn đề nghị mượn dụng cụ'], ['PL2B_Don-de-nghi-muon-phong-thi-nghiem_NCKH.docx', 'Phụ lục 2B – Đơn đề nghị mượn phòng thí nghiệm'], ['PL2C_Don-de-nghi-muon-thiet-bi_NCKH.docx', 'Phụ lục 2C – Đơn đề nghị mượn thiết bị']]],
    ['Sinh viên ngoài đơn vị (Phụ lục 3)', [['PL3_Don-dang-ky-su-dung-PTN_SV-ngoai-don-vi.docx', 'Phụ lục 3 – Đơn đăng ký sử dụng phòng thí nghiệm']]],
    ['Giảng viên – thiết bị', [['Don-de-nghi-muon-thiet-bi-dai-ngay_GV_Mau-QR2.docx', 'Đơn đề nghị mượn thiết bị dài ngày (mẫu QR2)'], ['Bieu-mau-bao-hong-thiet-bi.docx', 'Biểu mẫu báo hỏng thiết bị'], ['Phieu-de-nghi-sua-chua-thiet-bi.docx', 'Phiếu đề nghị sửa chữa thiết bị'], ['Phieu-de-nghi-bo-sung-thiet-bi.docx', 'Phiếu đề nghị bổ sung thiết bị'], ['Bien-ban-ban-giao-thiet-bi-PTN-cho-giang-vien.docx', 'Biên bản bàn giao thiết bị PTN cho giảng viên'], ['Giay-bao-mang-tai-san-vao-ra-co-quan_TCHC-mau-28.docx', 'Giấy báo mang tài sản vào / ra cơ quan (mẫu của Trường – TCHC mẫu số 28)'], ['Phieu-de-nghi-giai-quyet-cong-viec_mang-tai-san-ra.docx', 'Phiếu đề nghị giải quyết công việc (tờ trình BGH) – kèm giấy báo mang tài sản ra']]]
  ];

  // ---------------- Tiện ích ----------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const homNay = (n) => { const d = new Date(Date.now() + (n || 0) * 864e5); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // giờ hiện tại + phut (không vượt sang ngày hôm sau: tối muộn thì giờ trả mặc định là 23:59)
  const gioNay = (phut) => { const n = new Date(), d = new Date(n.getTime() + (phut || 0) * 6e4); return d.getDate() !== n.getDate() ? '23:59' : pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const ngayVN = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(s || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] + m[4] : (s || ''); };
  const boDau = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  function doc(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function ghi(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* trình duyệt chặn lưu trữ */ } }
  function M(h) { $('m').innerHTML = h; window.scrollTo(0, 0); }
  // nút ← Quay lại ở đầu trang (trừ trang chủ)
  // nút ‹ Quay lại / › Tiếp (cần khi cài ra màn hình chính – không có thanh trình duyệt): hiện khi đã đi qua trang khác
  function nutLui(hien) { const co = hien || history.length > 1; $('hl').classList.toggle('hide', !co); $('hn').classList.toggle('hide', !co); }
  function toast(t, bad) { const x = $('toast'); x.textContent = t; x.className = 'toast' + (bad ? ' bad' : ''); clearTimeout(toast._t); toast._t = setTimeout(() => { x.className = 'toast hide'; }, bad ? 5000 : 2600); }

  // hồ sơ cá nhân (chuyển từ bản cũ nếu có) + mã máy và khóa bí mật của máy
  // hồ sơ gửi lên máy chủ: đối tượng "Khác" kèm phần ghi rõ ("Khác – Nhân viên …")
  function ngGui() { const p = Object.assign({}, hoSo()); if (p.doi_tuong === 'Khác' && p.doi_tuong_khac) p.doi_tuong = 'Khác – ' + p.doi_tuong_khac; delete p.doi_tuong_khac; return p; }
  function hoSo() {
    let p = doc('khsk_ho_so');
    if (!p) {
      const c = doc('khsk_profile');
      if (c && c.hoTen) { p = { ho_ten: c.hoTen, doi_tuong: /giảng/i.test(c.doiTuong) ? 'Giảng viên' : /học viên/i.test(c.doiTuong) ? 'Học viên' : 'Sinh viên', ma_so: c.ma || '', lop: c.lop || '', bo_mon: c.boMon || '', sdt: c.sdt || '', email: '' }; ghi('khsk_ho_so', p); }
    }
    return p;
  }
  function may() {
    let ma = doc('khsk_dev');
    if (!/^TB-[A-Z0-9]{6}$/.test(ma || '')) { ma = 'TB-' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); ghi('khsk_dev', ma); }
    let k = doc('khsk_khoa');
    if (!/^[a-f0-9]{32}$/.test(k || '')) {
      const b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((x, i) => { b[i] = Math.floor(Math.random() * 256); });
      k = Array.from(b, x => (x + 256).toString(16).slice(1)).join(''); ghi('khsk_khoa', k);
    }
    return { ma, khoa: k };
  }

  async function api(act, data) {
    const body = Object.assign({ act }, data || {});
    let j;
    if (DEMO) j = window.PTN_DEMO(body);
    else {
      if (!window.PTN_API || window.PTN_API.indexOf('http') !== 0) throw new Error(location.protocol === 'file:' ? 'Đang mở tệp trên máy nhưng không ở chế độ chạy thử – mở tệp chay-thu.html (hoặc thêm ?demo=1 vào địa chỉ).' : 'Hệ thống đang được cài đặt, vui lòng quay lại sau');
      let r;
      try { r = await fetch(window.PTN_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' }); }
      catch (e) { throw new Error(navigator.onLine === false ? 'Không có kết nối mạng' : 'Không kết nối được máy chủ, thử lại sau ít phút'); }
      j = await r.json();
    }
    if (!j.ok) throw new Error(j.err || 'Lỗi máy chủ');
    return j.r;
  }
  async function danhMuc(moi) {
    if (S.dm && !moi) return S.dm;
    const nap = () => api('ck_danh_muc').then(r => { S.dm = r; ghi('khsk_dm', r); window.PTN_KY = r.ky || {}; return r; });
    const cu = !moi && !DEMO && doc('khsk_dm');
    if (cu && cu.phong) { S.dm = cu; window.PTN_KY = cu.ky || {}; nap().catch(() => { /* giữ bản đã lưu */ }); return S.dm; } // hiện ngay bản đã lưu, nạp bản mới phía sau
    return nap();
  }
  async function hoSoCuaToi() { // hồ sơ đề tài đang thực hiện mà MSSV của tôi là thành viên
    const p = hoSo(); if (!p || !p.ma_so) return [];
    if (S.hs && S.hs.ma === p.ma_so) return S.hs.ds;
    const ds = await api('ck_ho_so_mssv', { ma_so: p.ma_so }); S.hs = { ma: p.ma_so, ds }; return ds;
  }

  // ---------------- Thành phần biểu mẫu ----------------
  const truong = (nhan, inner, o) => '<div class="f' + (o && o.cls ? ' ' + o.cls : '') + '"' + (o && o.id ? ' id="' + o.id + '"' : '') + '><label class="t">' + nhan + (o && o.req ? ' <span class="req">*</span>' : '') + '</label>' + (o && o.h ? '<div class="h">' + o.h + '</div>' : '') + inner + '</div>';
  const nhap = (name, nhan, o) => { o = o || {}; return truong(nhan, o.area ? '<textarea name="' + name + '" placeholder="' + esc(o.ph || '') + '">' + esc(o.v || '') + '</textarea>'
    : '<input type="' + (o.type || 'text') + '" name="' + name + '" value="' + esc(o.v == null ? '' : o.v) + '" placeholder="' + esc(o.ph || '') + '"' + (o.extra || '') + '>', o); };
  const chon = (name, nhan, ds, o) => { o = o || {}; const kieu = o.nhieu ? 'checkbox' : 'radio';
    return truong(nhan, ds.map(x => { const v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x, tat = Array.isArray(x) && x[2];
      const on = o.nhieu ? (o.v || []).indexOf(v) >= 0 : String(o.v) === String(v);
      return '<label class="opt' + (on ? ' on' : '') + (tat ? ' tat' : '') + '"><input type="' + kieu + '" name="' + name + '" value="' + esc(v) + '"' + (on ? ' checked' : '') + (tat ? ' disabled' : '') + (o.nhieu ? ' data-nhieu="1"' : '') + '><span>' + t + '</span></label>'; }).join('') || '<div class="note">Không có lựa chọn.</div>', o); };
  const chonO = (name, nhan, ds, o) => { o = o || {}; return truong(nhan, '<select name="' + name + '"><option value="">– Chọn –</option>' + ds.map(x => '<option value="' + esc(x[0]) + '"' + (String(o.v) === String(x[0]) ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>', o); };
  function giaTri(root) {
    const o = {};
    root.querySelectorAll('[name]').forEach(el => {
      if (el.type === 'checkbox') { if (el.dataset.nhieu) { o[el.name] = o[el.name] || []; if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; else if (!(el.name in o)) o[el.name] = ''; }
      else o[el.name] = el.value.trim();
    });
    return o;
  }
  function danhDau(root) { root.addEventListener('change', (e) => { const n = e.target.name; if (!n || !e.target.closest('.opt')) return; root.querySelectorAll('[name="' + n + '"]').forEach(i => i.closest('.opt').classList.toggle('on', i.checked)); }); }
  const camKet = (qr) => '<div class="warn">' + (qr === 'QR5' ? '⚠ BẮT BUỘC quét mã QR5 TRƯỚC KHI sử dụng thiết bị. Tự ý sử dụng thiết bị mà không quét mã, nếu bị phát hiện sẽ bị buộc ngừng sử dụng và lập biên bản.\n' : '') +
    'Đăng ký thay / mạo danh người khác bị xử lý như vi phạm nội quy.</div>' +
    '<label class="opt"><input type="checkbox" name="cam_ket"><span>Tôi cam kết thông tin trên là đúng; thực hiện đúng nội quy, quy định của PTN Khoa KHSK và chịu trách nhiệm bồi thường nếu làm hư hỏng, mất mát tài sản.</span></label>';
  const MON_TAY = '__tay'; // QR3: chọn "Môn khác – nhập thủ công"
  const PHONG_TB_QR2 = 'D11.01'; // QR2: chỉ cho mượn thiết bị đặt tại phòng này
  const dsPhong = () => S.dm.phong.map(p => [p.ma, '<b>' + esc(p.ma) + '</b> – ' + esc(p.ten)]);
  const dsTB = (phong) => S.dm.thiet_bi.filter(t => !phong || t.phong === phong).map(t => [t.id, esc(t.ten) + (t.ma_ts ? ' <span class="note">' + esc(t.ma_ts) + '</span>' : '') + (phong ? '' : ' <span class="note">· ' + esc(t.phong || '—') + '</span>') + (t.ban ? ' <span class="note">(đang bận / hỏng)</span>' : ''), t.ban]);
  // QR2, QR3: môn thực hành – giảng viên (gộp các lớp / nhóm cùng môn, cùng GV; giá trị = một lớp học phần đại diện)
  // QR3 (loai 'hc'): chỉ môn đã có biên bản hóa chất → số liệu ghi vào biên bản của môn
  const dsMonGV = (loai) => { const da = {}, out = []; S.dm.lop.filter(l => !loai || l['bb_' + loai]).forEach(l => { const k = l.ten_mon + '|' + (l.gv || ''); if (da[k]) return; da[k] = 1;
    out.push([l.ma_lhp, l.ten_mon + (l.gv ? ' – ' + l.gv : '')]); }); return out.sort((a, b) => a[1].localeCompare(b[1], 'vi')); };

  // bảng chọn dòng (hóa chất / dụng cụ) từ biên bản + dòng gõ thêm
  function bangDong(id, dong, them) {
    return '<div id="' + id + '">' + (dong.length ? dong.map(d => '<div class="dong" data-dong="' + esc(d.id) + '"><span>' + esc(d.ten) + (d.dvt ? ' <span class="note">(' + esc(d.dvt) + ')</span>' : '') + '</span><input type="number" min="0" step="any" inputmode="decimal" placeholder="SL"></div>').join('')
      : '<div class="note">Biên bản chưa có dòng nào – gõ thêm ở dưới.</div>') +
      '<div class="sec" style="margin-top:12px">' + them + '</div><div class="them"></div><button type="button" class="lnk" data-them-dong>+ Thêm dòng</button></div>';
  }
  function ganBangDong(root, id, coQuyCach) {
    const box = $(id); if (!box) return;
    const add = () => { const r = document.createElement('div'); r.className = 'dong tu-do';
      r.innerHTML = '<input type="text" placeholder="Tên – quy cách" data-k="ten">' + (coQuyCach ? '<input type="text" placeholder="Đặc điểm, NSX" data-k="quy_cach">' : '') + '<input type="number" min="0" step="any" placeholder="SL" data-k="sl" style="max-width:80px"><input type="text" placeholder="ĐVT" data-k="dvt" style="max-width:70px">';
      r.querySelectorAll('input').forEach(i => i.setAttribute('autocomplete', 'off')); box.querySelector('.them').appendChild(r); };
    box.querySelector('[data-them-dong]').onclick = add; add();
  }
  function docBangDong(id) {
    const box = $(id); if (!box) return [];
    const a = [...box.querySelectorAll('[data-dong]')].map(r => ({ dong: r.dataset.dong, sl: +r.querySelector('input').value || 0 })).filter(x => x.sl > 0);
    const b = [...box.querySelectorAll('.tu-do')].map(r => { const o = {}; r.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = i.value.trim(); }); o.sl = +o.sl || 0; return o; }).filter(x => x.ten && x.sl > 0);
    return a.concat(b);
  }

  // ---------------- Trang chủ ----------------
  const MAU_TT = { 'Chờ duyệt': 'c', 'Đã duyệt': 'i', 'Đang xử lý': 'w', 'Hoàn tất': 'o', 'Đang mượn': 'w', 'Đang dùng': 'w', 'Đã trả – hoàn tất': 'o', 'Đã cấp phát': 'o', 'Từ chối': 'b', 'Chờ nộp bản ký': 'c', 'Đã nhận đơn ký': 'i',
    'Đã duyệt – đang thực hiện': 'w', 'Gia hạn': 'w', 'Chờ trả đồ': 'w', 'Đã đóng': 'o' };
  const tagTT = (t, qh) => '<span class="tag t-' + (qh ? 'b' : MAU_TT[t] || 'c') + '">' + esc(qh ? 'Quá hạn' : t) + '</span>';
  const oQR = (q) => '<a class="tile" href="#/' + q + '">' + bieu(q) + (QR_AI[q] ? '<span class="ai">' + QR_AI[q] + '</span>' : '') + '<span class="q">' + q + '</span>' + QR_TEN[q] + '</a>';
  // thông báo hạn trả cho người đăng ký: đơn đang mượn / đang dùng quá hạn hoặc đến hạn hôm nay – ngày mai; hồ sơ đề tài quá hạn
  function canhBaoHan(r) {
    const hn = homNay(), mai = homNay(1), qua = (s) => Math.max(1, Math.round((new Date(hn) - new Date(String(s).slice(0, 10))) / 864e5));
    const ten = (d) => [d.qr + ' ' + d.id, (d.ten_tb || []).join(', ') || (d.tu ? 'tủ ' + d.tu + ' (' + d.phong + ')' : '') || (d.nd.dong || []).map(x => x.ten).join(', ') || (d.phong ? 'phòng ' + d.phong : '')].filter(Boolean).join(' – ');
    const dang = r.don.filter(d => (d.trang_thai === 'Đang mượn' || d.trang_thai === 'Đang dùng') && d.den_ngay && d.qr !== 'QR5');
    const hs = r.ho_so.filter(x => ['Đã duyệt – đang thực hiện', 'Gia hạn', 'Chờ trả đồ'].indexOf(x.trang_thai) >= 0 && x.den_ngay && x.den_ngay < hn);
    return dang.filter(d => d.qua_han).map(d => '<div class="warn han-qua">⚠ <b>Quá hạn trả</b>: ' + esc(ten(d)) + ' – hạn ' + esc(ngayVN(d.den_ngay)) + ' (quá ' + qua(d.den_ngay) + ' ngày)' +
        (d.nd.so_lan_doi ? '. PTN đã nhắc ' + d.nd.so_lan_doi + ' lần' : '') + '. Vui lòng trả ngay cho PTN hoặc liên hệ PTN để gia hạn.</div>').join('') +
      hs.map(x => '<div class="warn han-qua">⚠ <b>Hồ sơ đề tài quá hạn</b>: ' + esc(x.id + ' – ' + x.ten) + ' – hết hạn ' + esc(ngayVN(x.den_ngay)) + '. Gia hạn ở mục "Sửa hồ sơ" hoặc trả đồ cho PTN.</div>').join('') +
      dang.filter(d => !d.qua_han && d.den_ngay.slice(0, 10) <= mai).map(d => '<div class="warn han-sap" style="background:#FFF8E1;border-color:#F2D58A;color:#6B4A00">⏰ <b>Sắp đến hạn trả</b>: ' + esc(ten(d)) + ' – hạn ' +
        (d.den_ngay.slice(0, 10) === hn ? 'hôm nay' : 'ngày mai') + ' ' + esc(ngayVN(d.den_ngay)) + '.</div>').join('');
  }
  async function trangChu() {
    $('hb').classList.add('hide'); nutLui(false);
    const p = hoSo();
    let h = '<div class="card prof"><div class="av">' + esc((p.ho_ten || '?').trim().split(' ').pop().charAt(0)) + '</div><div class="i"><b>' + esc(p.ho_ten) + '</b><span>' + esc([p.ma_so, ngGui().doi_tuong, p.lop].filter(Boolean).join(' · ')) +
      '</span></div><a class="lnk" href="#/ho-so">Sửa</a></div><div id="tb"></div><div class="tieu-de-nhom">Đăng ký – biểu mẫu</div><div class="grid">' +
      Object.keys(QR_TEN).filter(q => QR_GV.indexOf(q) < 0).map(oQR).join('') +
      '</div><div class="tieu-de-nhom">Giảng viên – thiết bị</div><div class="grid">' + QR_GV.map(oQR).join('') +
      Object.keys(GV().LOAI).filter(q => !GV().LOAI[q].ngung).map(q => '<a class="tile" href="#/' + q + '">' + bieu(q) + '<span class="qv">' + q + '</span>' + esc(GV().LOAI[q].ten) + '</a>').join('') +
      '<a class="tile" href="#/DT">' + bieu('DT') + '<span class="qv">DT</span>Dự trù hóa chất môn học<span class="note" style="font-size:12px">Nhập bằng mã PTN cấp</span></a>' +
      '</div><div class="tieu-de-nhom">Tiện ích</div><div class="grid"><a class="tile t2" href="#/don-cua-toi">' + bieu('cua_toi') + '<span><b>Đơn của tôi</b><br><span class="note" id="dem-don">Trạng thái các đơn đã gửi</span></span></a>' +
      '<a class="tile t2" href="#/bieu-mau">' + bieu('mau') + '<span><b>Biểu mẫu PTN</b><br><span class="note">Mẫu đơn, phiếu trống</span></span></a></div>' +
      (navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ? '' : '<div class="card note" style="margin-top:14px"><b>Cài như ứng dụng:</b> iPhone (Safari): bấm Chia sẻ → <i>Thêm vào MH chính</i>. Android (Chrome): bấm ⋮ → <i>Thêm vào màn hình chính</i>.</div>') +
      '<p class="note" style="text-align:center;margin-top:18px"><a href="' + (DEMO ? 'quan-ly/chay-thu.html' : 'quan-ly/') + '">Cán bộ PTN đăng nhập</a></p>';
    M(h);
    try {
      const dm = await danhMuc(true);
      if (dm.thong_bao && $('tb')) $('tb').innerHTML = '<div class="warn" style="background:#FFF8E1;border-color:#F2D58A;color:#6B4A00">📢 ' + esc(dm.thong_bao) + '</div>';
      const r = await api('ck_cua_toi', { khoa: may().khoa });
      const mo = r.don.filter(d => ['Chờ duyệt', 'Đã duyệt', 'Đang mượn', 'Đang dùng', 'Đang xử lý'].indexOf(d.trang_thai) >= 0).length + r.ho_so.filter(x => ['Đã đóng', 'Từ chối'].indexOf(x.trang_thai) < 0).length;
      const dang = r.don.find(d => d.qr === 'QR5' && d.trang_thai === 'Đang dùng');
      if ($('dem-don')) $('dem-don').innerHTML = mo ? '<b style="color:var(--b)">' + mo + ' đơn đang xử lý</b>' : 'Trạng thái các đơn đã gửi';
      if ($('tb')) $('tb').insertAdjacentHTML('beforeend', canhBaoHan(r));
      if (dang && $('tb')) $('tb').insertAdjacentHTML('beforeend', '<div class="warn">⏱ Bạn đang sử dụng ' + esc(dang.ten_tb.join(', ') || 'phòng ' + dang.phong) + ' từ ' + esc(dang.tu_ngay.slice(11)) + '. <a href="#/don-cua-toi">Bấm "Kết thúc sử dụng" khi xong</a>.</div>');
    } catch (e) { if ($('tb')) $('tb').innerHTML = '<div class="warn">' + esc(e.message) + '</div>'; }
  }

  // ---------------- Hồ sơ cá nhân ----------------
  function trangHoSo(lanDau) {
    nutLui(!lanDau);
    const p = hoSo() || {}, bmKhac = !!p.bo_mon && BO_MON.indexOf(p.bo_mon) < 0; // bộ môn đã nhập tay trước đó
    M('<div class="card"><h2>' + (lanDau ? 'Thông tin cá nhân (nhập một lần)' : 'Sửa thông tin cá nhân') + '</h2><p class="note">Thông tin lưu trên điện thoại này và tự điền vào mọi biểu mẫu.</p><form id="f">' +
      nhap('ho_ten', 'Họ và tên', { v: p.ho_ten, req: 1, extra: ' autocomplete="name"' }) + chon('doi_tuong', 'Đối tượng', DOI_TUONG, { v: p.doi_tuong || 'Sinh viên', req: 1 }) +
      nhap('ma_so', 'MSSV / mã học viên / mã viên chức', { v: p.ma_so, req: 1 }) + nhap('lop', 'Lớp (sinh viên, học viên)', { v: p.lop }) +
      '<div id="o-dt-khac" class="' + (p.doi_tuong === 'Khác' ? '' : 'hide') + '">' + nhap('doi_tuong_khac', 'Đối tượng khác (ghi rõ)', { v: p.doi_tuong_khac, ph: 'VD: Nhân viên, nghiên cứu viên, khách mời…', req: 1 }) + '</div>' +
      chon('bo_mon', 'Bộ môn / ngành', BO_MON, { v: bmKhac ? 'Khác' : p.bo_mon || 'Dược học', req: 1 }) +
      '<div id="o-bm-khac" class="' + (bmKhac ? '' : 'hide') + '">' + nhap('bo_mon_khac', 'Bộ môn / ngành khác (ghi rõ)', { v: bmKhac ? p.bo_mon : '', ph: 'VD: Công nghệ sinh học – Khoa CNSH', req: 1 }) + '</div>' + nhap('sdt', 'Số điện thoại', { type: 'tel', v: p.sdt, req: 1, extra: ' inputmode="tel" autocomplete="tel"' }) +
      nhap('email', 'Email', { type: 'email', v: p.email, extra: ' autocomplete="email"' }) +
      '<div class="err" id="err"></div><button class="btn g">Lưu thông tin</button>' + (lanDau ? '' : '<a class="btn o" href="#/">Hủy</a>') + '</form></div>');
    danhDau($('f'));
    $('f').addEventListener('change', (e) => {
      if (e.target.name === 'doi_tuong') $('o-dt-khac').classList.toggle('hide', e.target.value !== 'Khác');
      if (e.target.name === 'bo_mon') $('o-bm-khac').classList.toggle('hide', e.target.value !== 'Khác');
    });
    $('f').onsubmit = (e) => {
      e.preventDefault(); const v = giaTri(e.target);
      v.sdt = v.sdt.replace(/\s/g, ''); v.ma_so = v.ma_so.toUpperCase();
      if (v.doi_tuong !== 'Khác') delete v.doi_tuong_khac; else if (!v.doi_tuong_khac) { $('err').textContent = 'Ghi rõ đối tượng khác'; return; }
      if (v.bo_mon === 'Khác') { if (!v.bo_mon_khac) { $('err').textContent = 'Ghi rõ bộ môn / ngành'; return; } v.bo_mon = v.bo_mon_khac; } delete v.bo_mon_khac;
      const loi = !v.ho_ten ? 'Nhập họ và tên' : !v.ma_so ? 'Nhập MSSV / mã viên chức' : !/^0\d{9,10}$/.test(v.sdt) ? 'Số điện thoại gồm 10 – 11 chữ số, bắt đầu bằng 0' : v.email && !/^\S+@\S+\.\S+$/.test(v.email) ? 'Email không hợp lệ' : '';
      if (loi) { $('err').textContent = loi; return; }
      ghi('khsk_ho_so', v); S.hs = null; toast('Đã lưu'); location.hash = '#/';
      if (lanDau) dieuHuong();
    };
  }

  // ---------------- Biểu mẫu QR1 – QR8 ----------------
  async function trangQR(qr) {
    $('hb').classList.remove('hide'); nutLui(true);
    M('<div class="spin"></div>');
    await danhMuc();
    const p = hoSo(), gv = p.doi_tuong === 'Giảng viên';
    if (qr === 'QR7') return trangQR7();
    let h = '<h2>' + qr + ' – ' + esc(QR_TEN[qr]) + '</h2><div class="pre"><b>✓ Người đăng ký:</b> ' + esc(p.ho_ten + ' · ' + p.ma_so + ' · ' + p.sdt) + ' <a class="lnk" href="#/ho-so">Sửa</a></div>';
    if ((qr === 'QR2' || qr === 'QR4') && !gv) h += '<div class="warn">' + qr + ' dành cho giảng viên. Nếu bạn là giảng viên, sửa "Đối tượng" trong thông tin cá nhân.</div>';
    const ds = await hoSoCuaToi().catch(() => []);
    const chonHS = ds.length ? chonO('hs', 'Thuộc hồ sơ đề tài (nếu có)', ds.map(x => [x.id, x.id + ' – ' + x.ten])) : '';
    let f = '';
    switch (qr) {
      case 'QR1':
        f = chon('noi_dung', 'Nội dung đăng ký', ['Mượn phòng', 'Mượn thiết bị – dụng cụ', 'Mượn phòng + thiết bị – dụng cụ'], { v: 'Mượn phòng', req: 1 }) +
          chon('phong', 'Phòng (chọn được nhiều phòng)', dsPhong(), { nhieu: 1, req: 1 }) + nhap('ngay', 'Ngày sử dụng', { type: 'date', v: homNay(), req: 1 }) +
          '<div class="hai">' + nhap('gio_bd', 'Giờ bắt đầu', { type: 'time', v: gioNay(), req: 1 }) + nhap('gio_kt', 'Giờ trả', { type: 'time', v: gioNay(180), req: 1 }) + '</div>' +
          '<div id="o-tb"></div>' + truong('Thiết bị, dụng cụ cần mượn thêm', '<div class="h">Tên, số lượng (bắt buộc), ghi chú – mỗi thứ một khung.</div><div id="dc-them"></div><button type="button" class="lnk" id="them-dc">+ Thêm thiết bị, dụng cụ</button>') + nhap('muc_dich', 'Mục đích sử dụng', { req: 1 }) +
          nhap('gvhd', 'Giảng viên hướng dẫn / giảng viên dạy thực hành');
        break;
      case 'QR2':
        { // thiết bị phòng D11.01 (kho thiết bị cho mượn) + gõ tay thiết bị ngoài danh sách; Dùng cho thay cho "Mục đích sử dụng"
          const tb = dsTB(PHONG_TB_QR2), mon = dsMonGV('');
          f = truong('Thiết bị cần mượn (phòng ' + PHONG_TB_QR2 + ')', tb.length ? '<input type="search" id="tim-tb" placeholder="Tìm tên thiết bị…">' : '<div class="h">Phòng ' + PHONG_TB_QR2 + ' chưa có thiết bị trong danh mục – nhập ở ô dưới.</div>', { req: 1 }) +
            '<div id="o-tb2">' + (tb.length ? chon('thiet_bi', '', tb, { nhieu: 1 }) : '') + '</div>' +
            truong('Thiết bị khác (ngoài danh sách)', '<div class="h">Không có trong danh sách trên thì ghi vào đây. Có tên thiết bị thì phải nhập số lượng.</div><div id="tb-khac"></div><button type="button" class="lnk" id="them-tb-khac">+ Thêm thiết bị</button>') +
            '<div class="hai">' + nhap('tu_ngay', 'Ngày mượn', { type: 'date', v: homNay(), req: 1 }) + nhap('den_ngay', 'Ngày dự kiến trả', { type: 'date', req: 1, h: 'Tối đa 03 tháng kể từ ngày mượn' }) + '</div>' +
            chon('dung_cho', 'Dùng cho', [['lop', 'Lớp thực hành'], ['hs', 'Đồ án / đề tài của sinh viên (hồ sơ QR7)'], ['ca_nhan', 'Đề tài cá nhân']], { v: 'lop', req: 1 }) +
            '<div id="o-lop">' + (mon.length ? chonO('lop_hp', 'Môn thực hành – giảng viên', mon, { h: 'Mỗi môn – giảng viên một dòng (GV dạy nhiều nhóm chỉ chọn một lần)' })
              : nhap('mon_tu_nhap', 'Môn thực hành – giảng viên', { ph: 'VD: TH Bào chế 1 – ThS. Nguyễn Văn A', h: 'Chưa có thời khóa biểu học kỳ trên hệ thống – gõ tên môn và giảng viên' })) + '</div>' +
            '<div id="o-hs" class="hide">' + nhap('hs', 'Mã hồ sơ đề tài', { ph: 'VD: KL-2627-015' }) + '</div>' +
            '<div id="o-ca-nhan" class="hide">' + nhap('de_tai', 'Tên đề tài (không bắt buộc)') + '</div>' +
            nhap('noi_su_dung', 'Nơi sử dụng thiết bị', { ph: 'Phòng / địa điểm' });
        }
        break;
      case 'QR3':
        f = chonO('lop_hp', 'Môn thực hành – giảng viên', dsMonGV('hc').concat([[MON_TAY, '✎ Môn khác – nhập thủ công (không có trong thời khóa biểu)']]), { req: 1, h: 'Mỗi môn – giảng viên một dòng (GV dạy nhiều nhóm chỉ chọn một lần); số liệu ghi vào biên bản bàn giao hóa chất của môn, học kỳ ' + esc(S.dm.hk) }) + '<div id="o-mon-tay" class="hide">' + nhap('mon_tu_nhap', 'Tên môn thực hành – giảng viên', { ph: 'VD: TH Hóa phân tích – ThS. Nguyễn Văn A', req: 1 }) + '</div>' + '<div id="o-dong"></div>' +
          nhap('ngay_can', 'Ngày cần nhận', { type: 'date', v: homNay() }) +
          nhap('gvhd', 'Giảng viên dạy thực hành', { h: 'Sinh viên đăng ký thay giảng viên: ghi tên giảng viên' });
        break;
      case 'QR4':
        f = chon('phong', 'Phòng mượn chìa khóa (chọn được nhiều phòng)', dsPhong(), { nhieu: 1, req: 1 }) + nhap('ngay', 'Ngày', { type: 'date', v: homNay(), req: 1 }) +
          '<div class="hai">' + nhap('gio_bd', 'Giờ nhận', { type: 'time', v: gioNay() }) + nhap('gio_tra', 'Giờ dự kiến trả chìa khóa', { type: 'time', req: 1 }) + '</div>' +
          nhap('muc_dich', 'Mục đích', { req: 1 }) + nhap('hoc_phan', 'Học phần / lớp (nếu có)');
        break;
      case 'QR5':
        f = chon('phong', 'Phòng sử dụng (chọn được nhiều phòng)', dsPhong(), { nhieu: 1, req: 1 }) + '<div id="o-tb"></div>' + nhap('muc_dich', 'Mục đích sử dụng', { req: 1 }) +
          nhap('gvhd', 'Giảng viên hướng dẫn / giảng viên dạy thực hành') + nhap('so_nguoi', 'Số người sử dụng', { type: 'number', v: 1 }) +
          chon('tinh_trang_truoc', 'Tình trạng thiết bị trước khi sử dụng', ['Bình thường', 'Bất thường'], { v: 'Bình thường' }) + nhap('ghi_chu', 'Ghi chú / bất thường (nếu có)') + chonHS;
        break;
      case 'QR6':
        f = chon('phong', 'Phòng đề nghị sử dụng tủ (chọn được nhiều phòng – mỗi phòng một tủ)', dsPhong(), { nhieu: 1, req: 1 }) + '<div id="o-tu"></div>' +
          '<div class="hai">' + nhap('tu_ngay', 'Ngày bắt đầu', { type: 'date', v: homNay(), req: 1 }) + nhap('den_ngay', 'Ngày dự kiến trả tủ', { type: 'date', req: 1 }) + '</div>' +
          nhap('muc_dich', 'Mục đích sử dụng tủ', { req: 1 }) + nhap('do_dung', 'Đồ dùng cất trong tủ') + nhap('gvhd', 'Giảng viên hướng dẫn') + chonHS;
        break;
      case 'QR8': // hai nhánh: lớp thực hành (biên bản dụng cụ của lớp) / Đồ án – KLTN – NCKH (biên bản dụng cụ của hồ sơ QR7)
        f = chon('nhanh', 'Mượn thêm dụng cụ cho', [['lop', '<b>Lớp học thực hành</b><br><span class="note">Theo lớp học phần – ghi vào biên bản dụng cụ của lớp</span>'],
          ['hs', '<b>Đồ án / KLTN / NCKH</b><br><span class="note">Theo hồ sơ đề tài (QR7) – ghi vào biên bản dụng cụ của đề tài</span>']], { v: ds.length && !gv ? 'hs' : 'lop', req: 1 }) +
          '<div id="o-lop">' + chonO('lop_hp', 'Lớp học phần thực hành', S.dm.lop.map(l => [l.ma_lhp, l.ten_mon + ' – ' + l.lop + (l.nhom ? ' nhóm ' + l.nhom : '') + (l.gv ? ' – ' + l.gv : '') + (l.bb_dc ? '' : ' (chưa có biên bản dụng cụ)')]).concat([[MON_TAY, '✎ Lớp khác – nhập tay (không có trong thời khóa biểu)']]), { req: 1 }) + '<div id="o-lop-tay" class="hide">' + nhap('lop_tu_nhap', 'Môn – lớp – giảng viên', { ph: 'VD: TH Vi sinh – DHDUOC18A nhóm 2 – ThS. Nguyễn Văn A', req: 1 }) +
            nhap('phong_tu_nhap', 'Phòng sử dụng', { ph: 'VD: D11.02' }) + '</div></div>' +
          '<div id="o-hs" class="hide">' + (ds.length ? chonO('hs_chon', 'Hồ sơ đề tài của bạn', ds.map(x => [x.id, x.id + ' – ' + x.ten]), { v: ds[0].id }) : '') +
          nhap('hs_ma', ds.length ? 'Hoặc nhập mã hồ sơ khác' : 'Mã hồ sơ đề tài', { ph: 'VD: KL-2627-015', h: gv ? 'Giảng viên nhập mã hồ sơ của nhóm mình hướng dẫn (in trên đơn QR7).' : ds.length ? '' : 'Không thấy hồ sơ đã duyệt có MSSV của bạn – nhập mã hồ sơ in trên đơn QR7.', req: !ds.length }) +
          '<div id="hs-tb" class="note" style="margin-bottom:12px"></div></div><div id="o-dong"></div>' +
          nhap('den_ngay', 'Ngày trả', { type: 'date', v: homNay(1), req: 1 }) + nhap('muc_dich', 'Mục đích') ;
        break;
    }
    M(h + '<form class="card" id="f" autocomplete="off">' + f + camKet(qr) + '<div id="err" class="err"></div><button class="btn" id="sb">Gửi đăng ký</button></form>');
    const form = $('f'); danhDau(form);
    const phongChon = () => [...form.querySelectorAll('[name=phong]:checked')].map(i => i.value);
    // thiết bị của các phòng đã chọn (giữ lựa chọn cũ khi đổi phòng)
    const veTB = () => { if (!$('o-tb')) return; const ps = phongChon(), cu = [...form.querySelectorAll('[name=thiet_bi]:checked')].map(i => i.value);
      $('o-tb').innerHTML = ps.length ? chon('thiet_bi', 'Thiết bị sử dụng (nếu có)', [].concat(...ps.map(p => dsTB(p).map(t => [t[0], (ps.length > 1 ? '<span class="note">' + esc(p) + ' · </span>' : '') + t[1], t[2]]))), { nhieu: 1, v: cu }) : ''; };
    // mỗi phòng đã chọn một sơ đồ tủ (chọn một tủ trống / phòng)
    const veTu = () => {
      const cu = {}; form.querySelectorAll('[name^="tu_"]:checked').forEach(i => { cu[i.name] = i.value; });
      $('o-tu').innerHTML = phongChon().map(v => { const ph = S.dm.phong.find(x => x.ma === v); if (!ph) return '';
        const trong = S.dm.tu_trong[v] || [], n = +ph.so_tu || 20, ten = 'tu_' + v;
        return truong('Chọn tủ – phòng ' + v + ' (chỉ tủ trống)', '<div class="tu">' + Array.from({ length: n }, (_, i) => { const so = pad(i + 1), ok = trong.indexOf(so) >= 0;
          return '<label class="' + (ok ? '' : 'tat') + '"><input type="radio" name="' + ten + '" value="' + so + '"' + (ok ? '' : ' disabled') + (cu[ten] === so ? ' checked' : '') + '><span>' + so + '</span></label>'; }).join('') + '</div><div class="note">' + trong.length + ' tủ trống / ' + n + '</div>', { req: 1 }); }).join('');
    };
    const veDong = async () => {
      const box = $('o-dong'); if (!box) return;
      const nh = (form.querySelector('[name=nhanh]:checked') || {}).value || 'lop';
      if ($('o-lop')) $('o-lop').classList.toggle('hide', nh !== 'lop');
      if ($('o-hs')) $('o-hs').classList.toggle('hide', nh !== 'hs');
      let dong = [], ten = '';
      if (nh === 'hs') {
        const ma = ((form.querySelector('[name=hs_ma]') || {}).value || (form.querySelector('[name=hs_chon]') || {}).value || '').trim().toUpperCase();
        if (!ma) { $('hs-tb').innerHTML = ''; return veBang('Dụng cụ cần mượn thêm', 'Nhập mã hồ sơ đề tài ở trên (in trên đơn QR7) để hiện dụng cụ trong biên bản của đề tài; hoặc gõ dụng cụ cần mượn ở dưới.', []); }
        let x = ds.find(y => y.id === ma);
        if (!x) { $('hs-tb').innerHTML = '<div class="spin"></div>';
          try { x = await api('ck_ho_so_ma', { ma, ma_so: p.ma_so, doi_tuong: p.doi_tuong }); $('hs-tb').innerHTML = '✓ ' + esc(x.id + ' – ' + x.ten); }
          catch (err) { $('hs-tb').innerHTML = '<div class="warn">' + esc(err.message) + '</div>'; delete form.dataset.hs; return veBang('Dụng cụ cần mượn thêm', 'Chưa dùng được mã hồ sơ này (xem thông báo ở trên).', []); } }
        else $('hs-tb').innerHTML = '';
        form.dataset.hs = x.id; dong = x.dung_cu; ten = x.dung_cu.length ? 'Dụng cụ trong biên bản đề tài ' + x.id : 'Hồ sơ ' + x.id + ' chưa có biên bản dụng cụ – gõ dụng cụ cần mượn';
      } else {
        const l = S.dm.lop.find(x => x.ma_lhp === (form.querySelector('[name=lop_hp]') || {}).value), bb = l && (qr === 'QR3' ? l.bb_hc : l.bb_dc);
        if (qr === 'QR3') { const tay = (form.querySelector('[name=lop_hp]') || {}).value === MON_TAY; $('o-mon-tay').classList.toggle('hide', !tay);
          if (tay) return veBang('Hóa chất – vật tư cần cấp', 'Môn không có trong thời khóa biểu: gõ tên hóa chất, số lượng, đơn vị tính.', []); }
        if (qr === 'QR8') { const tay = (form.querySelector('[name=lop_hp]') || {}).value === MON_TAY; $('o-lop-tay').classList.toggle('hide', !tay);
          if (tay) return veBang('Dụng cụ cần mượn', 'Lớp không có trong thời khóa biểu: gõ tên dụng cụ, số lượng, đơn vị tính. PTN lập biên bản bàn giao riêng theo danh sách này.', []); }
        if (!l) return qr === 'QR8' ? veBang('Dụng cụ cần mượn thêm', 'Chọn lớp học phần ở trên để hiện dụng cụ trong biên bản của lớp; hoặc gõ dụng cụ cần mượn ở dưới.', []) : (box.innerHTML = '');
        if (!bb && qr === 'QR8') ten = 'Lớp chưa có biên bản dụng cụ – gõ dụng cụ cần mượn, PTN sẽ ghi vào biên bản của lớp';
      }
      if (nh === 'lop' && !ten) {
        const l = S.dm.lop.find(x => x.ma_lhp === (form.querySelector('[name=lop_hp]') || {}).value), bb = l && (qr === 'QR3' ? l.bb_hc : l.bb_dc);
        if (!bb) { box.innerHTML = ''; return; }
        box.innerHTML = '<div class="spin"></div>';
        S.bb[bb] = S.bb[bb] || await api('ck_bien_ban', { id: bb }); dong = S.bb[bb].dong; ten = (qr === 'QR3' ? 'Hóa chất – vật tư trong biên bản ' : 'Dụng cụ trong biên bản ') + S.bb[bb].ten_mon;
        if (qr === 'QR3' && l.gv && form.querySelector('[name=gvhd]') && !form.querySelector('[name=gvhd]').value) form.querySelector('[name=gvhd]').value = l.gv;
      }
      veBang(ten, 'Nhập số lượng ở dòng cần ' + (qr === 'QR3' ? 'cấp bổ sung' : 'mượn thêm') + '.', dong);
    };
    // bảng nhập số lượng (luôn hiện ở QR8 – kể cả khi chưa chọn lớp / hồ sơ – để thấy ngay ô nhập dụng cụ)
    function veBang(ten, hd, dong) {
      const box = $('o-dong'); if (!box) return;
      box.innerHTML = truong(ten, '<div class="h">' + esc(hd) + '</div>' + (dong.length ? bangDong('bang-dong', dong, qr === 'QR3' ? 'Hóa chất ngoài danh sách' : 'Dụng cụ khác')
        : bangDong('bang-dong', [], qr === 'QR3' ? 'Hóa chất cần cấp' : 'Dụng cụ cần mượn').replace(/<div class="note">Biên bản chưa có dòng nào – gõ thêm ở dưới.<\/div>/, '')), { req: 1 });
      ganBangDong(form, 'bang-dong');
    }
    form.addEventListener('change', (e) => {
      if (e.target.name === 'phong') { if (qr === 'QR6') veTu(); else veTB(); }
      if (e.target.name === 'lop_hp' || e.target.name === 'nhanh' || e.target.name === 'hs_chon' || e.target.name === 'hs_ma') veDong();
      if (e.target.name === 'dung_cho') { $('o-lop').classList.toggle('hide', e.target.value !== 'lop'); $('o-hs').classList.toggle('hide', e.target.value !== 'hs'); if ($('o-ca-nhan')) $('o-ca-nhan').classList.toggle('hide', e.target.value !== 'ca_nhan'); }
    });
    // khung nhập từng thiết bị / dụng cụ: tên, số lượng (bắt buộc), [tình trạng], ghi chú – QR1 "mượn thêm", QR2 "ngoài danh sách"
    const khungDong = (hop, nut, tenGoiY, coTinhTrang) => {
      if (!$(hop)) return;
      const them = () => { const r = document.createElement('div'); r.className = 'tb-khac';
        r.innerHTML = '<input type="text" data-k="ten" placeholder="' + tenGoiY + '"><div class="hai"><input type="number" min="0" step="any" inputmode="decimal" data-k="sl" placeholder="Số lượng *">' +
          (coTinhTrang ? '<input type="text" data-k="tinh_trang" placeholder="Tình trạng thiết bị"></div><input type="text" data-k="ghi_chu" placeholder="Ghi chú">' : '<input type="text" data-k="ghi_chu" placeholder="Ghi chú"></div>');
        khongTuDien(r); $(hop).appendChild(r); };
      them(); $(nut).onclick = them;
    };
    // tắt tự điền / gợi ý của trình duyệt (điện thoại hay chép dữ liệu đã gõ trước vào ô mới)
    function khongTuDien(root) { root.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea').forEach(i => { i.setAttribute('autocomplete', 'off'); i.setAttribute('autocorrect', 'off'); i.setAttribute('spellcheck', 'false'); }); }
    khongTuDien(form);
    const docDong = (hop) => [...document.querySelectorAll('#' + hop + ' .tb-khac')].map(r => { const o = {}; r.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = i.value.trim(); }); return o; }).filter(x => x.ten);
    khungDong('tb-khac', 'them-tb-khac', 'Tên thiết bị (model, hãng)', true);
    khungDong('dc-them', 'them-dc', 'Tên thiết bị / dụng cụ');
    if ($('tim-tb')) $('tim-tb').oninput = (e) => { const q = boDau(e.target.value); $('o-tb2').querySelectorAll('.opt').forEach(o => { o.style.display = !q || boDau(o.textContent).indexOf(q) >= 0 ? '' : 'none'; }); };
    if (qr === 'QR8') {
      veDong();
      // mã hồ sơ: tự tra khi gõ đủ mã (không cần rời ô nhập)
      const o = form.querySelector('[name=hs_ma]'); let hen;
      if (o) o.addEventListener('input', () => { clearTimeout(hen); if (o.value.trim().length >= 8 || !o.value.trim()) hen = setTimeout(veDong, 450); });
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      const v = giaTri(form), d = Object.assign({}, v);
      if (qr === 'QR3' || qr === 'QR8') d.dong = docBangDong('bang-dong');
      if (qr === 'QR3') { if (v.lop_hp === MON_TAY) { delete d.lop_hp; if (!v.mon_tu_nhap) { $('err').textContent = 'Nhập tên môn thực hành – giảng viên'; return; } } else delete d.mon_tu_nhap; }
      if (qr === 'QR8' && v.nhanh !== 'hs') { if (v.lop_hp === MON_TAY) { delete d.lop_hp; if (!v.lop_tu_nhap) { $('err').textContent = 'Nhập môn – lớp – giảng viên'; return; } } else { delete d.lop_tu_nhap; delete d.phong_tu_nhap; } }
      if (qr === 'QR8') { if (v.nhanh === 'hs') { d.hs = form.dataset.hs || (v.hs_ma || v.hs_chon || '').toUpperCase(); delete d.lop_hp; if (!d.hs) { $('err').textContent = 'Chọn hoặc nhập mã hồ sơ đề tài'; return; } } else delete d.hs; delete d.hs_chon; delete d.hs_ma; d.nhanh = v.nhanh; }
      if (qr === 'QR2') {
        if (v.dung_cho !== 'lop') { delete d.lop_hp; delete d.mon_tu_nhap; } if (v.dung_cho !== 'hs') delete d.hs; if (v.dung_cho !== 'ca_nhan') delete d.de_tai;
        d.tb_khac = docDong('tb-khac'); const thieuSL = d.tb_khac.find(x => !(+x.sl > 0));
        if (thieuSL) { $('err').textContent = 'Nhập số lượng cho thiết bị "' + thieuSL.ten + '"'; return; }
        if (!(v.thiet_bi || []).length && !d.tb_khac.length) { $('err').textContent = 'Chọn thiết bị cần mượn hoặc nhập thiết bị ngoài danh sách'; return; }
        if (v.dung_cho === 'hs' && !v.hs) { $('err').textContent = 'Nhập mã hồ sơ đề tài'; return; }
        if (v.tu_ngay && v.den_ngay) { const d = new Date(v.tu_ngay + 'T00:00:00'); d.setMonth(d.getMonth() + 3); const max = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
          if (v.den_ngay > max) { $('err').textContent = 'Mượn thiết bị dài ngày tối đa 03 tháng – ngày trả muộn nhất ' + max.split('-').reverse().join('/'); return; } }
        if (v.dung_cho === 'lop' && !v.lop_hp && !v.mon_tu_nhap) { $('err').textContent = 'Chọn (hoặc gõ) môn thực hành – giảng viên'; return; }
      }
      if (qr === 'QR1') { d.dung_cu = docDong('dc-them'); const thieu = d.dung_cu.find(x => !(+x.sl > 0)); if (thieu) { $('err').textContent = 'Nhập số lượng cho "' + thieu.ten + '"'; return; } }
      if (['QR1', 'QR4', 'QR5', 'QR6'].indexOf(qr) >= 0 && !(v.phong || []).length) { $('err').textContent = 'Chọn ít nhất một phòng'; return; }
      if (qr === 'QR6') { // mỗi phòng một tủ
        d.tu_ds = v.phong.map(p => ({ phong: p, so: v['tu_' + p] || '' })); Object.keys(d).filter(k => /^tu_[A-Z]/.test(k)).forEach(k => delete d[k]);
        const thieuTu = d.tu_ds.find(x => !x.so); if (thieuTu) { $('err').textContent = 'Chọn tủ cho phòng ' + thieuTu.phong; return; }
      }
      if (qr !== 'QR8') delete d.nhanh; if (qr !== 'QR2') delete d.dung_cho;
      const thieu = !v.cam_ket ? 'Đánh dấu ô cam kết' : (qr === 'QR3' || qr === 'QR8') && !d.dong.length ? 'Nhập số lượng ít nhất một dòng' : '';
      if (thieu) { $('err').textContent = thieu; return; }
      $('sb').disabled = true; $('sb').textContent = 'Đang gửi…'; $('err').textContent = '';
      try {
        const r = await api('ck_gui_don', { qr, ng: ngGui(), may: may(), d });
        M('<div class="card msg"><div class="ok">✓</div><h2>Đã gửi ' + qr + '</h2><p>Mã đơn <b>' + esc(r.id) + '</b> · ' + tagTT(r.trang_thai) + '</p><p class="note">' +
          (qr === 'QR5' ? 'Bắt đầu tính giờ sử dụng từ ' + esc(r.tg.slice(11)) + '. Dùng xong, vào <b>Đơn của tôi</b> bấm <b>Kết thúc sử dụng</b>.' : 'Cán bộ PTN sẽ xử lý; theo dõi trạng thái ở <b>Đơn của tôi</b>. Mang theo thẻ SV / CCCD khi nhận đồ.') + '</p>' +
          '<a class="btn" href="#/don-cua-toi">Đơn của tôi</a><a class="btn o" href="#/">Về trang chủ</a></div>');
      } catch (err) { $('sb').disabled = false; $('sb').textContent = 'Gửi đăng ký'; $('err').textContent = err.message; }
    };
  }

  // ---------------- Phiếu giảng viên: báo hỏng, đề nghị sửa chữa / bổ sung, biên bản bàn giao TB, giấy báo mang tài sản (phieu-gv.js) ----------------
  const GV = () => window.PTN_PHIEU_GV;
  async function trangGV(qr) {
    $('hb').classList.remove('hide'); nutLui(true);
    M('<div class="spin"></div>');
    await danhMuc();
    const p = hoSo(), L = GV().LOAI[qr];
    M('<h2>' + esc(L.ten) + '</h2><div class="pre"><b>✓ Người đề nghị:</b> ' + esc([p.ho_ten, p.ma_so, p.bo_mon, p.sdt].filter(Boolean).join(' · ')) + ' <a class="lnk" href="#/ho-so">Sửa</a></div>' +
      (p.doi_tuong === 'Giảng viên' ? '' : '<div class="warn">Biểu mẫu dành cho giảng viên. Nếu bạn là giảng viên, sửa "Đối tượng" trong thông tin cá nhân.</div>') +
      '<form class="card" id="f" autocomplete="off"><div id="pg"></div><label class="opt"><input type="checkbox" name="cam_ket"><span>Tôi xác nhận thông tin trên là đúng.</span></label>' +
      '<div id="err" class="err"></div><button class="btn" id="sb">Gửi phiếu</button></form><p class="note">Cần bản trống để in viết tay: <a href="bieu-mau/' + esc(L.mau) + '" download>tải mẫu Word</a>.</p>');
    GV().ve($('pg'), qr, { dm: S.dm });
    danhDau($('f'));
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const x = GV().doc($('pg'), qr), loi = x.loi || ($('f').querySelector('[name=cam_ket]').checked ? '' : 'Đánh dấu ô xác nhận');
      if (loi) { $('err').textContent = loi; return; }
      $('sb').disabled = true; $('sb').textContent = 'Đang gửi…'; $('err').textContent = '';
      try {
        const r = await api('ck_gui_gv', { qr, ng: ngGui(), may: may(), d: Object.assign({ cam_ket: true }, x.d) });
        M('<div class="card msg"><div class="ok">✓</div><h2>Đã gửi ' + esc(L.ten.toLowerCase()) + '</h2><p>Mã phiếu <b>' + esc(r.id) + '</b> · ' + tagTT(r.trang_thai) + '</p>' +
          '<p class="note">Cán bộ PTN sẽ tiếp nhận, xử lý; theo dõi trạng thái và in phiếu ở <b>Đơn của tôi</b>.</p>' +
          '<div class="dong-don" style="justify-content:center;gap:8px"><button type="button" class="nho" id="in-ngay">Xem – in phiếu</button><button type="button" class="nho o" id="word-ngay">Word</button></div>' +
          '<a class="btn" href="#/don-cua-toi">Đơn của tôi</a><a class="btn o" href="#/">Về trang chủ</a></div>');
        const mo = async (word) => { const t = await api('ck_cua_toi', { khoa: may().khoa }), d = t.don.find(y => y.id === r.id); if (d) inDon(d, word); };
        $('in-ngay').onclick = () => mo(false).catch(err => toast(err.message, true)); $('word-ngay').onclick = () => mo(true).catch(err => toast(err.message, true));
      } catch (err) { $('sb').disabled = false; $('sb').textContent = 'Gửi phiếu'; $('err').textContent = err.message; }
    };
  }

  // ---------------- QR7: hồ sơ đề tài ----------------
  async function trangQR7(sua) {
    $('hb').classList.remove('hide'); nutLui(true);
    await danhMuc();
    const p = hoSo(), x = sua || { loai: 'kltn', nhom: [], don: 'PB', dung_cu: [] }, tv = (x.nhom || []).filter(m => !m.truong_nhom);
    const dsLoai = S.dm.loai_de_tai.map(l => [l.ma, l.ten]);
    // bộ môn – khoa: theo hồ sơ đang sửa, không thì đoán theo bộ môn của người đăng ký
    const bmChon = x.bo_mon ? (BM_KHOA.indexOf(x.bo_mon) >= 0 ? x.bo_mon : '~khac') : (BM_KHOA.find(b => p.bo_mon && b.indexOf(p.bo_mon) === 0) || '');
    const h = '<h2>QR7 – ' + (sua ? 'Sửa hồ sơ ' + esc(sua.id) : 'Hồ sơ đề tài KLTN – NCKH') + '</h2>' +
      '<div class="card note">Điền một lần → hệ thống tạo sẵn đơn đúng mẫu Phụ lục (1A – 3) → tải về, in, ký, đề nghị GVHD ký → nộp bản giấy cho PTN. Cán bộ quét mã trên đơn để mở đúng hồ sơ.</div>' +
      '<form class="card" id="f" autocomplete="off"><div class="sec">Đề tài</div>' + (sua ? '<input type="hidden" name="loai" value="' + esc(x.loai) + '"><p><b>Loại:</b> ' + esc(x.ten_loai) + '</p>' : chon('loai', 'Loại đề tài', dsLoai, { v: x.loai, req: 1 })) +
      nhap('ten', 'Tên đề tài', { v: x.ten, req: 1, area: 1 }) + nhap('gvhd', 'Giảng viên hướng dẫn', { v: x.gvhd, req: 1 }) +
      chon('bm_chon', 'Bộ môn – khoa', BM_KHOA.map(b => [b, b]).concat([['~khac', 'Khoa khác (tự nhập tay)']]), { v: bmChon, req: 1 }) +
      '<div id="o-bm-khac">' + nhap('bm_khac', 'Ghi rõ bộ môn – khoa', { v: bmChon === '~khac' ? x.bo_mon : '', ph: 'VD: Bộ môn Hóa phân tích – Khoa Công nghệ Hóa học' }) + '</div>' +
      '<div id="o-pl3">' + nhap('muc_dich', 'Mục đích làm thí nghiệm – nghiên cứu', { v: x.muc_dich, area: 1, h: 'Phụ lục 3 (SV không thuộc đơn vị quản lý). Lệ phí: ' + esc(S.dm.le_phi_ngoai || 'theo quy định') }) + '</div>' +
      '<div id="o-mc">' + (sua ? '' : truong('Minh chứng đề tài NCKH (không bắt buộc)', '<input type="file" id="mc" accept=".pdf,image/*">', { h: 'Quyết định / thuyết minh – ảnh hoặc PDF, tối đa 5 MB' })) + '</div>' +
      '<div class="sec">Nhóm thực hiện</div><div class="pre"><b>Trưởng nhóm:</b> ' + esc(p.ho_ten + ' · ' + p.ma_so + ' · ' + p.sdt) + '</div><div id="tv">' +
      tv.map(m => dongTV(m)).join('') + '</div><button type="button" class="lnk" id="them-tv">+ Thêm thành viên</button>' +
      '<div id="o-don"><div class="sec">Đơn cần làm</div>' + chon('don', '', [['PB', 'Mượn phòng thí nghiệm'], ['TB', 'Mượn thiết bị'], ['DC', 'Mượn dụng cụ']], { nhieu: 1, v: String(x.don || '').split(',') }) + '</div>' +
      '<div id="o-phong"><div class="sec">Phòng – thời gian</div>' + chon('phong', 'Phòng (chọn được nhiều phòng)', dsPhong(), { nhieu: 1, v: String(x.phong || '').split(/\s*,\s*/), req: 1 }) +
      '<div class="hai">' + nhap('tu_ngay', 'Từ ngày', { type: 'date', v: x.tu_ngay || homNay(), req: 1 }) + nhap('den_ngay', 'Đến ngày', { type: 'date', v: x.den_ngay, req: 1 }) + '</div>' +
      '<label class="opt"><input type="checkbox" name="ngoai_gio"' + (x.ngoai_gio === 'Có' ? ' checked' : '') + '><span>Có làm ngoài giờ hành chính</span></label></div>' +
      '<div id="o-tb"><div class="sec">Thiết bị</div><input type="search" id="tim-tb" placeholder="Tìm thiết bị…" style="margin-bottom:8px"><div id="ds-tb">' + chon('thiet_bi', '', dsTB(''), { nhieu: 1, v: String(x.thiet_bi || '').split(',') }) + '</div></div>' +
      '<div id="o-dc"><div class="sec">Dụng cụ</div><div id="bang-dc"><div class="them">' + (x.dung_cu || []).map(d => dongDC(d)).join('') + '</div><button type="button" class="lnk" data-them-dc>+ Thêm dụng cụ</button></div></div>' +
      '<div class="sec">Cam kết</div>' + camKet('QR7') + '<div id="err" class="err"></div><button class="btn" id="sb">' + (sua ? 'Lưu & tạo lại đơn' : 'Hoàn thành') + '</button>' + (sua ? '<a class="btn o" href="#/don-cua-toi">Hủy</a>' : '') + '</form>';
    M(h);
    const form = $('f'); danhDau(form);
    const capNhat = () => {
      const loai = (form.querySelector('[name=loai]:checked') || form.querySelector('[name=loai]') || {}).value, pl3 = loai === 'ngoai', nckh = /^nckh/.test(loai);
      const don = [...form.querySelectorAll('[name=don]:checked')].map(i => i.value);
      $('o-pl3').classList.toggle('hide', !pl3); $('o-mc').classList.toggle('hide', !nckh); $('o-don').classList.toggle('hide', pl3);
      $('o-phong').classList.toggle('hide', !pl3 && don.indexOf('PB') < 0 && don.indexOf('TB') < 0);
      $('o-tb').classList.toggle('hide', pl3 || don.indexOf('TB') < 0); $('o-dc').classList.toggle('hide', pl3 || don.indexOf('DC') < 0);
      $('o-bm-khac').classList.toggle('hide', (form.querySelector('[name=bm_chon]:checked') || {}).value !== '~khac');
    };
    form.addEventListener('change', capNhat); capNhat();
    $('them-tv').onclick = () => $('tv').insertAdjacentHTML('beforeend', dongTV({}));
    form.querySelector('[data-them-dc]').onclick = () => $('bang-dc').querySelector('.them').insertAdjacentHTML('beforeend', dongDC({}));
    if (!(x.dung_cu || []).length) $('bang-dc').querySelector('.them').insertAdjacentHTML('beforeend', dongDC({}));
    $('tim-tb').oninput = (e) => { const q = boDau(e.target.value); $('ds-tb').querySelectorAll('.opt').forEach(o => { o.style.display = !q || boDau(o.textContent).indexOf(q) >= 0 ? '' : 'none'; }); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const v = giaTri(form), loai = v.loai, pl3 = loai === 'ngoai';
      const bo_mon = v.bm_chon === '~khac' ? v.bm_khac : v.bm_chon;
      const hs = { cam_ket: v.cam_ket, loai, ten: v.ten, gvhd: v.gvhd, bo_mon, muc_dich: pl3 ? v.muc_dich : '', don: pl3 ? ['PB'] : (v.don || []),
        phong: v.phong, tu_ngay: v.tu_ngay, den_ngay: v.den_ngay, ngoai_gio: v.ngoai_gio, thiet_bi: v.thiet_bi || [],
        nhom: [...$('tv').querySelectorAll('.tv')].map(r => { const o = {}; r.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = i.value.trim(); }); return o; }).filter(m => m.ho_ten),
        dung_cu: [...$('bang-dc').querySelectorAll('.tu-do')].map(r => { const o = {}; r.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = i.value.trim(); }); o.sl = +o.sl || 0; return o; }).filter(d => d.ten && d.sl > 0) };
      if (!hs.don.includes('TB')) hs.thiet_bi = [];
      if (!hs.don.includes('DC')) hs.dung_cu = [];
      if (!bo_mon) { $('err').textContent = v.bm_chon === '~khac' ? 'Ghi rõ bộ môn – khoa' : 'Chọn bộ môn – khoa'; return; }
      if (!$('o-phong').classList.contains('hide') && !(v.phong || []).length) { $('err').textContent = 'Chọn ít nhất một phòng'; return; }
      if (!v.cam_ket) { $('err').textContent = 'Đánh dấu ô cam kết'; return; }
      if (hs.nhom.some(m => !m.ma_so)) { $('err').textContent = 'Nhập MSSV cho mọi thành viên'; return; }
      $('sb').disabled = true; $('sb').textContent = 'Đang lưu…'; $('err').textContent = '';
      try {
        const r = sua ? await api('ck_sua_hs', { id: sua.id, khoa: may().khoa, ng: ngGui(), hs }) : await api('ck_gui_hs', { ng: ngGui(), may: may(), hs });
        const mc = $('mc') && $('mc').files[0];
        if (mc) { try { await guiMinhChung(r.id, mc); } catch (err) { toast('Chưa tải được minh chứng: ' + err.message, true); } }
        S.hs = null; xongQR7(r);
      } catch (err) { $('sb').disabled = false; $('sb').textContent = sua ? 'Lưu & tạo lại đơn' : 'Hoàn thành'; $('err').textContent = err.message; }
    };
  }
  const dongTV = (m) => '<div class="dong tv"><input type="text" placeholder="Họ và tên" data-k="ho_ten" value="' + esc(m.ho_ten) + '"><input type="text" placeholder="MSSV" data-k="ma_so" value="' + esc(m.ma_so) + '" style="max-width:110px">' +
    '<input type="tel" placeholder="Điện thoại" data-k="sdt" value="' + esc(m.sdt) + '" style="max-width:120px"><input type="email" placeholder="Email" data-k="email" value="' + esc(m.email) + '"></div>';
  const dongDC = (d) => '<div class="dong tu-do"><input type="text" placeholder="Tên dụng cụ" data-k="ten" value="' + esc(d.ten) + '"><input type="text" placeholder="Quy cách, NSX" data-k="quy_cach" value="' + esc(d.quy_cach) + '">' +
    '<input type="number" min="0" step="any" placeholder="SL" data-k="sl" value="' + esc(d.sl) + '" style="max-width:70px"><input type="text" placeholder="ĐVT" data-k="dvt" value="' + esc(d.dvt) + '" style="max-width:64px"></div>';
  function docB64(file) { return new Promise((ok, loi) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => loi(new Error('Không đọc được tệp')); r.readAsDataURL(file); }); }
  async function guiMinhChung(id, file) {
    if (file.size > 5 * 1024 * 1024) throw new Error('Tệp lớn hơn 5 MB');
    return api('ck_tep_hs', { id, khoa: may().khoa, ten: file.name, mime: file.type || 'application/octet-stream', b64: await docB64(file) });
  }
  function xongQR7(hs) {
    M('<div class="card msg"><div class="ok">✓</div><h2>Hồ sơ ' + esc(hs.id) + '</h2><p>' + tagTT(hs.trang_thai) + '</p></div>' + khoiDon(hs) +
      '<div class="card note"><b>Bước tiếp theo:</b><ol style="margin:6px 0 0 18px;padding:0"><li>Tải / in các đơn ở trên (in được trên máy tính hoặc lưu PDF).</li><li>Ký tên, đề nghị GVHD ký xác nhận.</li><li>Nộp bản giấy cho PTN – cán bộ quét mã trên đơn để mở đúng hồ sơ.</li></ol></div>' +
      '<a class="btn" href="#/don-cua-toi">Đơn của tôi</a><a class="btn o" href="#/">Về trang chủ</a>');
    ganKhoiDon(hs);
  }
  // nút tải các đơn Phụ lục của một hồ sơ
  const khoiDon = (hs) => '<div class="card"><b>Đơn cần in</b>' + window.PTN_PHU_LUC.danhSach(hs).map(d => '<div class="dong-don"><span>📄 ' + esc(d.ten) + '</span><span><button type="button" class="nho" data-in="' + d.ma + '" data-hs="' + esc(hs.id) + '">Xem – in</button><button type="button" class="nho o" data-word="' + d.ma + '" data-hs="' + esc(hs.id) + '">Word</button></span></div>').join('') + '</div>';
  async function anhQRHoSo(hs) {
    try { await napQR(); const q = window.qrcode(0, 'M'); q.addData(new URL('quan-ly/#/de-tai/' + hs.id, location.href.split('#')[0]).href); q.make(); return q.createDataURL(4, 1); } catch (e) { return ''; } // in không có mã QR
  }
  function ganKhoiDon(hs, root) {
    (root || document).querySelectorAll('[data-hs="' + hs.id + '"]').forEach(b => {
      b.onclick = async () => {
        const qr = await anhQRHoSo(hs);
        if (!window.PTN_KY) { try { await danhMuc(true); } catch (e) { /* in không có tên người ký */ } }
        if (b.dataset.word) { try { await window.PTN_PHU_LUC.taiWord([b.dataset.word], hs, qr); } catch (e) { toast(e.message, true); } return; }
        window.PTN_PHU_LUC.xemTruoc([b.dataset.in], hs, qr);
      };
    });
  }
  function napQR() {
    if (window.qrcode) return Promise.resolve();
    return new Promise((ok, loi) => { const s = document.createElement('script'); s.src = 'quan-ly/qrcode.js'; s.onload = ok; s.onerror = () => loi(new Error('qr')); document.head.appendChild(s); });
  }

  // ---------------- Đơn của tôi ----------------
  async function trangDonCuaToi() {
    $('hb').classList.remove('hide'); nutLui(true);
    M('<h2>Đơn của tôi</h2><div class="spin"></div>');
    let r;
    try { r = await api('ck_cua_toi', { khoa: may().khoa }); } catch (e) { M('<h2>Đơn của tôi</h2><div class="warn">' + esc(e.message) + '</div>'); return; }
    const chiTiet = (d) => /^GV-/.test(d.qr) ? GV().tomTat(d) : [d.phong && 'Phòng ' + d.phong, d.tu && 'Tủ ' + d.tu, d.ten_tb.length && d.ten_tb.join(', '), d.lop_hp && 'LHP ' + d.lop_hp, d.hs && 'Đề tài ' + d.hs,
      (d.nd.dong || []).length && d.nd.dong.map(x => x.ten + ' ' + x.sl + (x.dvt ? ' ' + x.dvt : '')).join('; '), d.tu_ngay && 'Từ ' + ngayVN(d.tu_ngay), d.den_ngay && (d.qr === 'QR5' ? 'đến ' : 'hạn ') + ngayVN(d.den_ngay)].filter(Boolean).join(' · ');
    let h = '<h2>Đơn của tôi</h2><p class="note">Các đơn gửi từ điện thoại này (mã máy ' + esc(may().ma) + ').</p>' + canhBaoHan(r);
    if (r.ho_so.length) h += '<div class="sec">Hồ sơ đề tài (QR7)</div>' + r.ho_so.map(x => '<div class="card"><div class="dong-don"><b>' + esc(x.id) + '</b>' + tagTT(x.trang_thai) + '</div><div>' + esc(x.ten) + '</div><div class="note">' +
      esc(x.ten_loai + ' · GVHD ' + x.gvhd + ' · ' + x.nhom.length + ' thành viên' + (x.phong ? ' · ' + x.phong : '') + (x.den_ngay ? ' · đến ' + ngayVN(x.den_ngay) : '')) + '</div>' +
      (x.le_phi ? '<div class="note">Lệ phí: ' + esc(x.le_phi) + (x.thu_phi ? ' – <b>đã thu ' + Number(x.thu_phi.so_tien).toLocaleString('vi-VN') + ' đ</b>' : ' – chưa thu') + '</div>' : '') +
      (x.tep.length ? '<div class="note">Minh chứng: ' + x.tep.map(t => esc(t.ten)).join(', ') + '</div>' : '') + khoiDon(x).replace('<div class="card">', '<div>') +
      (['Đã đóng', 'Từ chối'].indexOf(x.trang_thai) < 0 ? '<div class="dong-don"><a class="lnk" href="#/QR7/' + esc(x.id) + '">Sửa hồ sơ / gia hạn / thêm thành viên</a>' + (x.pl === 2 ? '<label class="lnk">+ Minh chứng<input type="file" data-mc="' + esc(x.id) + '" accept=".pdf,image/*" hidden></label>' : '') + '</div>' : '') + '</div>').join('');
    const dsQR = r.don.filter(d => !/^GV-/.test(d.qr)), dsGV = r.don.filter(d => /^GV-/.test(d.qr));
    const the = (d) => '<div class="card"><div class="dong-don"><span><span class="q">' + d.qr + '</span> <b>' + esc(d.id) + '</b></span>' + tagTT(d.trang_thai, d.qua_han) + '</div>' +
      '<div>' + esc(d.ten_qr) + '</div><div class="note">' + esc(chiTiet(d)) + '</div><div class="note">Gửi ' + ngayVN(d.tg) + (d.nguoi_xu_ly ? ' · xử lý: ' + esc(d.nguoi_xu_ly) : '') + '</div>' +
      (d.ly_do ? '<div class="err">Lý do: ' + esc(d.ly_do) + '</div>' : '') +
      (d.qr === 'QR5' && d.trang_thai === 'Đang dùng' ? '<button class="btn g" data-kt="' + esc(d.id) + '" style="margin-top:8px">Kết thúc sử dụng</button>' : '') +
      (window.PTN_DON_QR && window.PTN_DON_QR.coMau(d.qr) && d.trang_thai !== 'Từ chối' ? '<div class="dong-don"><span>📄 ' + esc(window.PTN_DON_QR.TEN[d.qr]) + '</span><span><button type="button" class="nho" data-in-don="' + esc(d.id) + '">Xem – in</button><button type="button" class="nho o" data-word-don="' + esc(d.id) + '">Word</button></span></div>' : '') + '</div>';
    h += '<div class="sec">Đơn QR1 – QR8 (' + dsQR.length + ')</div>' + (dsQR.length ? dsQR.map(the).join('') : '<div class="card note">Chưa có đơn nào.</div>');
    if (dsGV.length) h += '<div class="sec">Phiếu giảng viên – thiết bị (' + dsGV.length + ')</div>' + dsGV.map(the).join('');
    M(h);
    r.ho_so.forEach(x => ganKhoiDon(x));
    document.querySelectorAll('[data-mc]').forEach(i => { i.onchange = async () => { const f = i.files[0]; if (!f) return; try { await guiMinhChung(i.dataset.mc, f); toast('Đã tải minh chứng'); trangDonCuaToi(); } catch (e) { toast(e.message, true); } }; });
    document.querySelectorAll('[data-kt]').forEach(b => { b.onclick = () => hopKetThuc(b.dataset.kt); });
    document.querySelectorAll('[data-in-don],[data-word-don]').forEach(b => { b.onclick = () => inDon(r.don.find(x => x.id === (b.dataset.inDon || b.dataset.wordDon)), !!b.dataset.wordDon); });
  }
  // đơn / phiếu điền sẵn (QR1 – QR6, QR8, phiếu giảng viên): mã QR trên đơn dẫn tới đơn ở trang quản lý (cán bộ quét để mở đúng đơn)
  async function qrDon(d) { try { await napQR(); const q = window.qrcode(0, 'M'); q.addData(new URL('quan-ly/#/don/' + d.qr + '/' + d.id, location.href.split('#')[0]).href); q.make(); return q.createDataURL(4, 1); } catch (e) { return ''; } }
  async function inDon(d, word) {
    const q = await qrDon(d);
    if (!window.PTN_KY) { try { await danhMuc(true); } catch (e) { /* in không có tên người ký */ } }
    if (word) { try { await window.PTN_DON_QR.taiWord(d, q); } catch (e) { toast(e.message, true); } } else window.PTN_DON_QR.xemTruoc(d, q);
  }
  function hopKetThuc(id) {
    M('<h2>Kết thúc sử dụng – ' + esc(id) + '</h2><form class="card" id="f" autocomplete="off">' + chon('tinh_trang', 'Tình trạng thiết bị / phòng sau khi sử dụng', ['Bình thường', 'Bất thường – hư hỏng'], { v: 'Bình thường', req: 1 }) +
      nhap('ghi_chu', 'Mô tả bất thường (nếu có)', { area: 1 }) + '<div id="err" class="err"></div><button class="btn g" id="sb">Xác nhận kết thúc</button><a class="btn o" href="#/don-cua-toi">Quay lại</a></form>');
    danhDau($('f'));
    $('f').onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(e.target); $('sb').disabled = true;
      try { await api('ck_ket_thuc', { id, khoa: may().khoa, tinh_trang: v.tinh_trang, ghi_chu: v.ghi_chu }); toast('Đã kết thúc sử dụng'); location.hash = '#/don-cua-toi'; trangDonCuaToi(); }
      catch (err) { $('sb').disabled = false; $('err').textContent = err.message; }
    };
  }

  // ---------------- Biểu mẫu PTN ----------------
  function trangBieuMau() {
    $('hb').classList.remove('hide'); nutLui(true);
    M('<h2>Biểu mẫu PTN</h2><p class="note">Mẫu đơn trống theo Quy định quản lý, sử dụng PTN Khoa KHSK 2026. Sinh viên làm KLTN / NCKH nên dùng <a href="#/QR7">QR7</a> để có đơn điền sẵn.</p>' +
      BIEU_MAU.map(g => '<div class="card"><b>' + esc(g[0]) + '</b>' + g[1].map(f => '<div class="dong-don"><span>📄 ' + esc(f[1]) + '</span><a class="nho" href="bieu-mau/' + f[0] + '" download>Tải</a></div>').join('') + '</div>').join(''));
  }

  // ---------------- Dự trù hóa chất môn học (GV mở bằng mã PTN cấp cho đúng môn – học kỳ; gửi đề nghị, PTN duyệt) ----------------
  async function trangDTM(ma) {
    $('hb').classList.remove('hide'); nutLui(true);
    if (!ma) {
      M('<h2>Dự trù hóa chất môn học</h2><p class="note">PTN cấp cho mỗi môn một <b>mã dự trù</b> (gửi qua Zalo / email hoặc mã QR). Nhập mã để mở dự trù của môn – chỉ sửa được môn của mã đó; bản gửi đi sẽ được PTN duyệt trước khi áp dụng.</p>' +
        '<form class="card" id="f-ma"><label class="f"><span>Mã dự trù</span><input name="ma" placeholder="VD: DTAB12CD34" autocomplete="off" style="text-transform:uppercase"></label><button class="btn">Mở dự trù</button></form>');
      $('f-ma').onsubmit = (e) => { e.preventDefault(); const v = e.target.ma.value.trim().toUpperCase(); if (v) location.hash = '#/DT/' + v; };
      return;
    }
    M('<div class="spin"></div>');
    const r = await api('ck_dtm_mo', { ma }), p = hoSo(), NH = ['Hóa chất', 'Dược liệu', 'Vật tư tiêu hao'], r3 = (n) => Math.round((+n || 0) * 1000) / 1000;
    let ds = r.dong.map(d => ({ nhom: Math.max(0, Math.min(2, (+d.nhom_dt || 1) - 1)), ten: d.ten || '', cong_thuc: d.cong_thuc || '', ma_vt: d.ma_vt || '', nsx: d.nsx || '', dvt: d.dvt || '', dm: d.dm === '' || d.dm == null ? '' : +d.dm, sl: +d.sl || '', ghi_chu: d.ghi_chu || '' }));
    let ss = +r.si_so || 0, goiY = [];
    const slCua = (d) => d.dm === '' ? (+d.sl || '') : r3(d.dm * ss);
    const dn = r.de_nghi, tt = !dn ? '' : dn.trang_thai === 'Chờ duyệt' ? '<div class="pre">⏳ Bản đề nghị gửi ' + esc(ngayVN(dn.tg)) + ' đang <b>chờ PTN duyệt</b> – bảng dưới là bản đó; gửi lại sẽ thay bản này.</div>'
      : dn.trang_thai === 'Trả lại' ? '<div class="warn">↩ PTN đã <b>trả lại</b> bản gửi ' + esc(ngayVN(dn.tg)) + ': ' + esc(dn.ly_do) + '. Sửa rồi gửi lại.</div>'
      : dn.trang_thai === 'Đã duyệt' ? '<div class="pre">✓ Bản gửi ' + esc(ngayVN(dn.tg)) + ' đã được PTN duyệt – bảng dưới là dự trù hiện hành của môn.</div>' : '';
    const oN = (i, k, w, so) => '<input data-i="' + i + '" data-k="' + k + '"' + (so ? ' type="number" step="any" min="0" inputmode="decimal"' : '') + (k === 'ten' ? ' list="dtm-goi-y"' : '') + ' value="' + esc(ds[i][k] === '' || ds[i][k] == null ? '' : ds[i][k]) + '" style="width:' + w + ';padding:6px">';
    const ve = () => {
      M('<h2>Dự trù hóa chất – ' + esc(r.mon.ten) + '</h2><div class="pre"><b>' + esc(r.hk) + '</b> · mã ' + esc(r.ma) + ' (hạn ' + esc(ngayVN(r.han)) + ')<br><b>Người đề nghị:</b> ' + esc([p.ho_ten, p.ma_so, p.sdt].filter(Boolean).join(' · ')) + ' <a class="lnk" href="#/ho-so">Sửa</a></div>' + tt +
        '<p class="note">Sửa / thêm / bỏ dòng theo 3 nhóm. Ghi <b>ĐM 1 SV</b> thì SL = ĐM × tổng SV; không ghi ĐM thì nhập thẳng SL. Gõ tên để chọn từ danh mục vật tư (tự điền mã VT, ĐVT).</p>' +
        '<form class="card" id="f" autocomplete="off"><label class="f"><span>Tổng số sinh viên (cả học kỳ)</span><input type="number" min="0" id="dtm-ss" value="' + ss + '"></label><datalist id="dtm-goi-y"></datalist>' +
        NH.map((n, k) => '<div class="tieu-de-nhom" style="margin-top:12px">' + (k + 1) + '. ' + n.toUpperCase() + '</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left"><th>Tên – quy cách</th><th>ĐVT</th><th>ĐM 1 SV</th><th>SL</th><th>Ghi chú</th><th>Nhóm</th><th></th></tr></thead><tbody>' +
          ds.map((d, i) => [d, i]).filter(([d]) => d.nhom === k).map(([d, i]) => '<tr><td>' + oN(i, 'ten', '100%') + '</td><td>' + oN(i, 'dvt', '64px') + '</td><td>' + oN(i, 'dm', '70px', 1) + '</td><td>' +
            (d.dm === '' ? oN(i, 'sl', '80px', 1) : '<b data-sl="' + i + '">' + slCua(d) + '</b>') + '</td><td>' + oN(i, 'ghi_chu', '110px') + '</td><td><select data-i="' + i + '" data-k="nhom">' + NH.map((x, j) => '<option value="' + j + '"' + (j === d.nhom ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></td>' +
            '<td><button type="button" class="nho o" data-xoa="' + i + '">✕</button></td></tr>').join('') + '</tbody></table></div><button type="button" class="nho o" data-them="' + k + '" style="margin-top:6px">+ Thêm dòng ' + n.toLowerCase() + '</button>').join('') +
        '<label class="f" style="margin-top:12px"><span>Ghi chú gửi PTN</span><textarea id="dtm-gc" rows="2"></textarea></label><label class="opt"><input type="checkbox" name="cam_ket"><span>Tôi xác nhận dự trù trên là của môn tôi phụ trách.</span></label>' +
        '<div id="err" class="err"></div><button class="btn" id="sb">Gửi PTN duyệt</button></form>');
      const f = $('f');
      f.addEventListener('input', (e) => { const el = e.target, i = el.dataset.i, k = el.dataset.k; if (i === undefined || k === 'nhom') return;
        ds[i][k] = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
        if (k === 'dm') { const b = f.querySelector('[data-sl="' + i + '"]'); if (b) b.textContent = slCua(ds[i]); else if (ds[i].dm !== '') ve(); }
        if (k === 'ten' && el.value.trim().length >= 2) { clearTimeout(ve.t); ve.t = setTimeout(async () => { try { goiY = await api('ck_dtm_goi_y', { ma: r.ma, q: el.value.trim() }); const dl = $('dtm-goi-y'); if (dl) dl.innerHTML = goiY.map(v => '<option value="' + esc(v.ten) + '">' + esc((v.ma_vt ? 'MVT ' + v.ma_vt : 'Chưa MVT') + ' · ' + (v.dvt || '')) + '</option>').join(''); } catch (err) { /* bỏ qua gợi ý */ } }, 300); } });
      f.addEventListener('change', (e) => { const el = e.target, i = el.dataset.i, k = el.dataset.k; if (i === undefined) return;
        if (k === 'nhom') { ds[i].nhom = +el.value; ve(); }
        else if (k === 'ten') { const v = goiY.find(x => x.ten === el.value); if (v) { ds[i].ma_vt = v.ma_vt || ''; ds[i].dvt = ds[i].dvt || v.dvt || ''; ds[i].nsx = ds[i].nsx || v.nsx || ''; ve(); } }
        else if (k === 'dm' && el.value === '') ve(); });
      f.querySelectorAll('[data-them]').forEach(b => { b.onclick = () => { ds.push({ nhom: +b.dataset.them, ten: '', cong_thuc: '', ma_vt: '', nsx: '', dvt: '', dm: '', sl: '', ghi_chu: '' }); ve(); }; });
      f.querySelectorAll('[data-xoa]').forEach(b => { b.onclick = () => { ds.splice(+b.dataset.xoa, 1); ve(); }; });
      $('dtm-ss').oninput = (e) => { ss = +e.target.value || 0; f.querySelectorAll('[data-sl]').forEach(b => { b.textContent = slCua(ds[+b.dataset.sl]); }); };
      f.onsubmit = async (e) => {
        e.preventDefault();
        const dm = ds.filter(d => String(d.ten).trim()).map(d => ({ nhom_dt: String(d.nhom + 1), ten: String(d.ten).trim(), cong_thuc: d.cong_thuc, ma_vt: d.ma_vt, nsx: d.nsx, dvt: d.dvt, dm: d.dm, sl: slCua(d), ghi_chu: d.ghi_chu }));
        const loi = !dm.length ? 'Chưa có dòng dự trù nào' : !f.querySelector('[name=cam_ket]').checked ? 'Đánh dấu ô xác nhận' : '';
        if (loi) { $('err').textContent = loi; return; }
        $('sb').disabled = true; $('sb').textContent = 'Đang gửi…'; $('err').textContent = '';
        try {
          const k = await api('ck_dtm_gui', { ma: r.ma, ng: ngGui(), may: may(), si_so: ss, dm, ghi_chu: $('dtm-gc').value.trim() });
          M('<div class="card msg"><div class="ok">✓</div><h2>Đã gửi đề nghị dự trù</h2><p>Mã đề nghị <b>' + esc(k.id) + '</b> · ' + k.so_dong + ' dòng · môn ' + esc(r.mon.ten) + '</p>' +
            '<p class="note">PTN sẽ xem và duyệt. Mở lại bằng mã ' + esc(r.ma) + ' để xem trạng thái (chờ duyệt / trả lại / đã duyệt) hoặc gửi lại bản sửa.</p><a class="btn" href="#/DT/' + esc(r.ma) + '">Mở lại dự trù</a><a class="btn o" href="#/">Về trang chủ</a></div>');
        } catch (err) { $('sb').disabled = false; $('sb').textContent = 'Gửi PTN duyệt'; $('err').textContent = err.message; }
      };
    };
    ve();
  }

  // ---------------- Điều hướng ----------------
  async function dieuHuong() {
    const qrCu = (/[?&]qr=(QR[1-8])/i.exec(location.search) || [])[1];
    if (qrCu && !location.hash) { history.replaceState(null, '', location.pathname + (DEMO ? '?demo=1' : '') + '#/' + qrCu.toUpperCase()); }
    const p = (location.hash.replace(/^#\/?/, '') || '').split('/');
    if (!hoSo() || !hoSo().ma_so) return trangHoSo(true);
    try {
      if (/^QR[1-8]$/.test(p[0])) {
        if (p[0] === 'QR7' && p[1]) { const r = await api('ck_cua_toi', { khoa: may().khoa }), x = r.ho_so.find(h => h.id === p[1]); return x ? trangQR7(x) : trangDonCuaToi(); }
        return await trangQR(p[0]);
      }
      if (/^GV-(BH|SC|BS|TS)$/.test(p[0])) return await trangGV(p[0]); // GV-BG: đã bỏ (25/10/2026)
      if (p[0] === 'DT') return await trangDTM(p[1]);
      if (p[0] === 'ho-so') return trangHoSo(false);
      if (p[0] === 'don-cua-toi') return await trangDonCuaToi();
      if (p[0] === 'bieu-mau') return trangBieuMau();
      return await trangChu();
    } catch (e) { M('<div class="warn">' + esc(e.message) + '</div><a class="btn o" href="#/">Về trang chủ</a>'); }
  }
  window.addEventListener('hashchange', dieuHuong);
  $('hl').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/'; };
  $('hn').onclick = () => history.forward();
  if (DEMO) document.body.insertAdjacentHTML('afterbegin', '<div class="demo-bar">' + (window.PTN_DEMO_LIEN_THONG ? 'CHẠY THỬ – dữ liệu lưu trong trình duyệt, <b>dùng chung với trang quản lý</b>. ' +
    '<a href="quan-ly/chay-thu.html" target="_blank" rel="noopener">Mở trang quản lý ↗</a> · <a href="#" id="demo-lam-lai">Làm lại dữ liệu mẫu</a>' : 'CHẠY THỬ – dữ liệu giả lập, mất khi tải lại trang') + '</div>');
  if ($('demo-lam-lai')) $('demo-lam-lai').onclick = (e) => { e.preventDefault(); if (confirm('Xóa mọi dữ liệu đã nhập thử và tạo lại dữ liệu mẫu (cả trang quản lý)?')) { window.PTN_DEMO_LAM_LAI(); location.reload(); } };
  dieuHuong();
})();
