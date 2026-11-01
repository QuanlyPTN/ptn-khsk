/* Bàn giao thiết bị cho phòng (PTN → giảng viên quản lý phòng): danh sách biên bản, lập / sửa nháp, xác nhận bàn giao, in theo mẫu, bản ký, bàn giao lại, nhận trả thiết bị.
   Máy chủ: apps-script/22_BanGiaoTB.gs. Trang: #/ban-giao-tb (danh sách), #/ban-giao-tb/moi, #/ban-giao-tb/<mã>, #/ban-giao-tb/<mã>/sua. Phân quyền theo mục Tài sản. */
(function () {
  'use strict';
  const Q = window.PTN_QL;
  const { S, $, api, chay, trang, moHop, dongHop, o, giaTri, esc, toast, ngayVN, homNay, boDau, coQuyen, dieuHuong, napQR, napXlsx, guiTep, taiVe, lienKet, laAdmin } = Q;
  const MAU = { 'Nháp': 't-gray', 'Đã bàn giao': 't-info', 'Đã nhận bản ký': 't-ok', 'Đã thay thế': 't-gray', 'Đã trả': 't-gray' };
  const tagTT = (t) => '<span class="tag ' + (MAU[t] || 't-gray') + '">' + esc(t) + '</span>';
  const xl = () => coQuyen('tai-san', 'xu_ly');
  async function anhQR(id) { try { const QR = await napQR(), q = QR(0, 'M'); q.addData(lienKet('ban-giao-tb/' + id)); q.make(); return q.createDataURL(4, 1); } catch (e) { return ''; } }
  const inBB = async (bb, word) => { const qr = await anhQR(bb.id); return word ? window.PTN_DON_QR.banGiaoTB.taiWord(bb, qr) : window.PTN_DON_QR.banGiaoTB.xemTruoc(bb, qr); };

  async function manBanGiao(p) {
    if (p[1] === 'moi') return manForm(null);
    if (p[1] && p[2] === 'sua') return manForm(decodeURIComponent(p[1]));
    if (p[1]) return manChiTiet(decodeURIComponent(p[1]));
    const nd = trang('Bàn giao thiết bị cho phòng', (xl() ? '<a class="btn sm" href="#/ban-giao-tb/moi">+ Lập biên bản</a>' : ''), '<a href="#/tai-san">Tài sản</a> ›');
    const ds = await api('bgtb_ds');
    const phong = [...new Set(ds.map(b => b.phong))].sort();
    nd.innerHTML = '<p class="note">Biên bản bàn giao thiết bị từ Phòng thí nghiệm cho giảng viên quản lý phòng. Xác nhận bàn giao thì thiết bị tự chuyển về phòng nhận (thiết bị mới được tạo trong Tài sản), in ký giấy, đính kèm bản scan rồi bấm "Đã nhận bản ký" – giảng viên nhận được thông báo kèm biên bản và bản scan ở Đơn của tôi.</p>' +
      '<div class="tools"><input type="search" id="q" placeholder="Tìm mã biên bản, bên nhận, thiết bị…"><select id="f-ph"><option value="">Mọi phòng</option>' + phong.map(x => '<option>' + esc(x) + '</option>').join('') + '</select>' +
      '<select id="f-tt"><option value="">Trừ biên bản đã thay thế</option><option value="*">Tất cả</option>' + Object.keys(MAU).map(t => '<option>' + t + '</option>').join('') + '</select></div><div id="kq"></div>';
    const ve = () => {
      const q = boDau($('q').value), ph = $('f-ph').value, tt = $('f-tt').value;
      const l = ds.filter(b => (!q || boDau([b.id, b.ben_nhan, b.phong, b.ten_phong, b.dong.map(d => d.ten).join(' ')].join(' ')).indexOf(q) >= 0) && (!ph || b.phong === ph) &&
        (tt === '*' || (tt ? b.trang_thai === tt : b.trang_thai !== 'Đã thay thế')));
      $('kq').innerHTML = !l.length ? '<div class="card empty">Chưa có biên bản bàn giao thiết bị.' + (xl() ? ' Bấm "+ Lập biên bản".' : '') + '</div>' :
        '<div class="tbl-wrap"><table><thead><tr><th>Mã</th><th>Ngày</th><th>Phòng</th><th>Bên nhận</th><th class="num">Số thiết bị</th><th>Trạng thái</th></tr></thead><tbody>' +
        l.map(b => '<tr class="click" data-href="#/ban-giao-tb/' + esc(b.id) + '"><td class="mono"><b>' + esc(b.id) + '</b></td><td>' + ngayVN(b.ngay) + '</td><td><b>' + esc(b.phong) + '</b> <span class="note">' + esc(b.ten_phong) + '</span></td>' +
          '<td>' + esc(b.ben_nhan) + '</td><td class="num">' + b.so_tb + '</td><td>' + tagTT(b.trang_thai) + '</td></tr>').join('') + '</tbody></table></div>';
      $('kq').querySelectorAll('[data-href]').forEach(r => { r.onclick = () => { location.hash = r.dataset.href; }; });
    };
    $('q').oninput = ve; $('f-ph').onchange = ve; $('f-tt').onchange = ve; ve();
  }

  async function manChiTiet(id) {
    const nd = trang('Biên bản ' + esc(id), '', '<a href="#/tai-san">Tài sản</a> › <a href="#/ban-giao-tb">Bàn giao thiết bị</a> ›');
    const b = await api('bgtb_ct', { id }), nhap = b.trang_thai === 'Nháp', daGiao = ['Đã bàn giao', 'Đã nhận bản ký'].indexOf(b.trang_thai) >= 0;
    $('main').querySelector('h1').innerHTML = 'Biên bản ' + esc(b.id) + ' ' + tagTT(b.trang_thai);
    const tbs = [].concat(...b.dong.map(d => d.tb_ct)), conLai = tbs.filter(t => !t.tra && t.ten !== '(đã xóa)');
    nd.innerHTML = '<div class="btns" style="margin-bottom:12px"><button class="btn o sm" id="b-in">🖨 Xem trước – in</button><button class="btn o sm" id="b-word">Tải Word</button>' +
      (xl() && nhap ? '<a class="btn o sm" href="#/ban-giao-tb/' + esc(b.id) + '/sua">✎ Sửa nháp</a><button class="btn sm" id="b-xn">✓ Xác nhận bàn giao</button><button class="btn red sm" id="b-xoa">Xóa nháp</button>' : '') +
      (xl() && daGiao ? '<label class="btn o sm">Đính kèm bản ký<input type="file" id="tep-bb" hidden></label>' + (b.trang_thai === 'Đã bàn giao' ? '<button class="btn sm" id="b-ky">Đã nhận bản ký</button>' : '') +
        (conLai.length ? '<button class="btn sm" id="b-tra" title="GV trả thiết bị: máy lấy từ phòng khác về phòng cũ, máy nhập tay về kho PTN">↩ Nhận trả thiết bị</button>' : '') +
        (b.thay_bang ? '' : '<button class="btn o sm" id="b-lai" title="Đổi GV quản lý phòng / điều chuyển: lập biên bản mới kế thừa danh mục">Bàn giao lại</button>') : '') +
      (!nhap && laAdmin() ? '<button class="btn red o sm" id="b-xoa" title="Chỉ admin: xóa biên bản và bản scan; thiết bị giữ nguyên trong Tài sản">🗑 Xóa biên bản</button>' : '') + '</div>' +
      (nhap ? '<div class="card" style="border-color:#E8C77A;background:#FFFBEF">Biên bản <b>nháp</b>: kiểm tra danh mục rồi bấm <b>✓ Xác nhận bàn giao</b> – thiết bị mới được tạo trong Tài sản, thiết bị chuyển về phòng ' + esc(b.phong) + '. Sau đó in ký giấy, đính kèm bản scan rồi bấm <b>Đã nhận bản ký</b>' + (b.ma_so_nhan ? ' – giảng viên nhận được thông báo ở Đơn của tôi' : '') + '.</div>' : '') +
      '<div class="grid g2"><div class="card"><dl class="kv">' + [['Ngày bàn giao', ngayVN(b.ngay)], ['Phòng nhận', b.phong + ' – ' + b.ten_phong], ['Bên giao', b.ben_giao + ' (Quản lý PTN)'],
        ['Bên nhận', b.ben_nhan + (b.ma_so_nhan ? ' · ' + b.ma_so_nhan : ' · chưa gắn tài khoản trang dùng chung') + ' – ' + b.chuc_vu_nhan], ['Số thiết bị', b.so_tb + (b.tra.length ? ' (GV đã trả ' + b.tra.length + ')' : '')], ['Ghi chú', b.ghi_chu],
        ['Thay cho biên bản', b.thay_cho], ['Thay bằng biên bản', b.thay_bang]].filter(x => x[1] !== '' && x[1] != null).map(x => '<dt>' + x[0] + '</dt><dd>' + esc(String(x[1])) + '</dd>').join('') +
        '</dl></div>' +
      '<div class="card"><h2>Bản ký, tệp (' + b.tep.length + ')</h2>' + (b.tep.length ? '<ul class="files">' + b.tep.map(f => '<li><span>📄 ' + esc(f.ten) + '</span><button class="btn o sm" data-tai="' + esc(f.id) + '">Tải về</button></li>').join('') + '</ul>' : '<div class="note">Chưa có.</div>') +
      '<h2 style="margin-top:12px">Lịch sử</h2>' + b.xu_ly.slice().reverse().map(x => '<div class="note">' + ngayVN(x.tg) + ' ' + String(x.tg).slice(11, 16) + ' · <b>' + esc(x.hd) + '</b> · ' + esc(x.nguoi) + (x.nd ? ' – ' + esc(x.nd) : '') + '</div>').join('') + '</div></div>' +
      (b.tra.length ? '<div class="card"><h2>Thiết bị GV đã trả (' + b.tra.length + ')</h2><div class="tbl-wrap"><table><thead><tr><th>Ngày trả</th><th>Thiết bị</th><th>Trả về</th><th>Tình trạng khi trả</th><th>Ghi chú</th><th>Người nhận</th></tr></thead><tbody>' +
        b.tra.map(x => '<tr><td>' + ngayVN(x.ngay) + '</td><td><a href="#/tai-san/' + esc(x.tb) + '">' + esc(x.ten) + '</a></td><td>' + esc(x.ve) + '</td><td>' + esc(x.tinh_trang) + '</td><td>' + esc(x.ghi_chu) + '</td><td>' + esc(x.nguoi) + '</td></tr>').join('') + '</tbody></table></div></div>' : '') +
      '<div class="card"><h2>Danh mục thiết bị bàn giao</h2><div class="tbl-wrap"><table><thead><tr><th>STT</th><th>Tên thiết bị</th><th>Model</th><th>ĐVT</th><th class="num">SL</th><th>Tình trạng lúc bàn giao</th><th>Ghi chú</th><th>Thiết bị trong Tài sản</th></tr></thead><tbody>' +
      b.dong.map((d, i) => '<tr><td>' + (i + 1) + '</td><td><b>' + esc(d.ten) + '</b></td><td>' + esc(d.model) + '</td><td>' + esc(d.dvt) + '</td><td class="num">' + esc(d.sl) + '</td><td>' + esc(d.tinh_trang) + '</td><td>' + esc(d.ghi_chu) + '</td><td>' +
        (d.tb_ct.length ? d.tb_ct.map(t => '<a href="#/tai-san/' + esc(t.id) + '">' + esc(t.id) + '</a>' + (t.ma_ts ? ' · ' + esc(t.ma_ts) : '') + ' <span class="note">' + esc(t.phong || 'Kho PTN') + '</span>' + (t.tra ? ' <span class="tag t-gray">đã trả ' + ngayVN(t.tra.ngay) + '</span>' : '')).join('<br>') : '<span class="note">Thiết bị mới – tạo khi xác nhận</span>') + '</td></tr>').join('') +
      '</tbody></table></div></div>';
    nd.querySelectorAll('[data-tai]').forEach(x => { x.onclick = (e) => chay(e.target, () => taiVe(x.dataset.tai)); });
    $('b-in').onclick = (e) => chay(e.target, () => inBB(b));
    $('b-word').onclick = (e) => chay(e.target, () => inBB(b, 1));
    if ($('b-xoa')) $('b-xoa').onclick = async (e) => { if (!confirm(nhap ? 'Xóa biên bản nháp ' + b.id + '?' : 'Xóa biên bản ' + b.id + ' (' + b.trang_thai + ')?\n\n• Thiết bị giữ nguyên trong Tài sản, phòng không đổi – chuyển về "chưa bàn giao"' +
      (b.thay_cho ? ' (hoặc về lại biên bản cũ ' + b.thay_cho + ')' : '') + '.\n• Bản scan đính kèm bị xóa, thông báo đã gửi GV được gỡ.\n• Không khôi phục được.')) return; await chay(e.target, () => api('bgtb_xoa', { id: b.id })); toast('Đã xóa'); location.hash = '#/ban-giao-tb'; };
    if ($('b-xn')) $('b-xn').onclick = async () => {
      const dm = await api('bgtb_dm'), ph = dm.phong.find(x => x.ma === b.phong) || {}, can = !ph.phu_trach || b.thay_cho || ph.phu_trach.indexOf(b.ben_nhan) < 0;
      moHop('<h2>Xác nhận bàn giao ' + esc(b.id) + '</h2><p>Bàn giao <b>' + b.so_tb + '</b> thiết bị cho phòng <b>' + esc(b.phong) + '</b> – ' + esc(b.ben_nhan) + '. Sau khi xác nhận:</p><ul class="note">' +
        '<li>Thiết bị mới được tạo trong Tài sản (SL nhiều → mỗi máy một hồ sơ "Tên #1, #2…").</li><li>Thiết bị có sẵn chuyển về phòng ' + esc(b.phong) + '; dòng thời gian từng máy ghi số biên bản.</li>' +
        (b.thay_cho ? '<li>Biên bản ' + esc(b.thay_cho) + ' chuyển "Đã thay thế".</li>' : '') + '</ul>' +
        '<label class="check"><input type="checkbox" id="cap-gv"' + (can ? ' checked' : '') + '> Ghi <b>' + esc(b.ben_nhan) + '</b> là GV quản lý phòng ' + esc(b.phong) + (ph.phu_trach ? ' (hiện ghi: ' + esc(ph.phu_trach) + ')' : ' (phòng chưa ghi GV quản lý)') + '</label>' +
        '<div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="b-xn-ok">Xác nhận bàn giao</button></div>');
      $('b-xn-ok').onclick = async (e) => { await chay(e.target, () => api('bgtb_xac_nhan', { id: b.id, cap_nhat_gv: $('cap-gv').checked ? 1 : 0 })); dongHop(); toast('Đã bàn giao ' + b.so_tb + ' thiết bị'); dieuHuong(); };
    };
    if ($('b-tra')) $('b-tra').onclick = () => {
      const tt = (t) => '<select data-tt="' + esc(t.id) + '"><option value="">Giữ nguyên (' + esc(t.tinh_trang || '') + ')</option>' + b.tinh_trang_tb.map(x => '<option>' + esc(x) + '</option>').join('') + '</select>';
      moHop('<h2>Nhận trả thiết bị – ' + esc(b.id) + '</h2><p class="note">' + esc(b.ben_nhan) + ' trả thiết bị phòng ' + esc(b.phong) + '. Đánh dấu máy được trả, kiểm tra tình trạng. Máy lấy từ phòng khác tự về phòng cũ, máy nhập tay về kho PTN (chưa xếp phòng) – ra khỏi danh sách tài sản phòng ' + esc(b.phong) + '.</p>' +
        '<label class="f"><span>Ngày trả</span><input type="date" id="tra-ngay" value="' + homNay() + '"></label>' +
        '<div class="tbl-wrap"><table><thead><tr><th><input type="checkbox" id="tra-het" checked></th><th>Thiết bị</th><th>Trả về</th><th>Tình trạng khi trả</th><th>Ghi chú</th></tr></thead><tbody>' +
        conLai.map(t => { const kho = /Đang cho mượn|Đã thanh lý/.test(t.tinh_trang); return '<tr><td><input type="checkbox" data-tra="' + esc(t.id) + '"' + (kho ? ' disabled' : ' checked') + '></td><td><b>' + esc(t.ten) + '</b>' + (t.ma_ts ? ' <span class="note">' + esc(t.ma_ts) + '</span>' : '') + (kho ? '<br><span class="err">' + esc(t.tinh_trang) + (/mượn/.test(t.tinh_trang) ? ' – nhận trả máy mượn trước' : '') + '</span>' : '') + '</td><td>' + esc(t.ve || '') + '</td><td>' + tt(t) + '</td><td><input type="text" data-gc="' + esc(t.id) + '" placeholder="Thiếu phụ kiện, hư hỏng…"></td></tr>'; }).join('') +
        '</tbody></table></div><div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="b-tra-ok">Nhận trả</button></div>');
      $('tra-het').onchange = (e) => document.querySelectorAll('[data-tra]:not(:disabled)').forEach(x => { x.checked = e.target.checked; });
      $('b-tra-ok').onclick = async (e) => {
        const ds = [...document.querySelectorAll('[data-tra]:checked')].map(x => ({ tb: x.dataset.tra, tinh_trang: document.querySelector('[data-tt="' + x.dataset.tra + '"]').value, ghi_chu: document.querySelector('[data-gc="' + x.dataset.tra + '"]').value }));
        if (!ds.length) return toast('Chọn thiết bị giảng viên trả', true);
        const r = await chay(e.target, () => api('bgtb_tra', { id: b.id, ngay: $('tra-ngay').value, ds })); dongHop();
        toast('Đã nhận trả ' + ds.length + ' thiết bị' + (r.trang_thai === 'Đã trả' ? ' – biên bản đã trả hết' : '')); dieuHuong();
      };
    };
    if ($('b-ky')) $('b-ky').onclick = async (e) => { if (!b.tep.length) return toast('Đính kèm bản scan biên bản đã ký trước', true); if (!confirm('Ghi "Đã nhận bản ký"? ' + (b.ma_so_nhan ? 'Giảng viên ' + b.ben_nhan + ' nhận được thông báo kèm biên bản và bản scan.' : '')))  return; await chay(e.target, () => api('bgtb_ban_ky', { id: b.id })); toast('Đã ghi nhận bản ký'); dieuHuong(); };
    if ($('b-lai')) $('b-lai').onclick = async (e) => {
      if (!confirm('Lập biên bản bàn giao lại cho phòng ' + b.phong + '? Biên bản mới kế thừa các thiết bị còn sử dụng (ghi tình trạng hiện tại); sửa bên nhận rồi xác nhận.')) return;
      const m = await chay(e.target, () => api('bgtb_lai', { id: b.id })); location.hash = '#/ban-giao-tb/' + m.id + '/sua';
    };
    if ($('tep-bb')) $('tep-bb').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; await chay(null, () => guiTep(b.id, f, 'Bản ký biên bản ' + b.id)); toast('Đã tải lên'); dieuHuong(); };
  }

  // ---- lập / sửa nháp ----
  const COT_FILE = [['ten', 'Tên thiết bị *', /^ten|thiet bi|danh muc/], ['model', 'Model', /model|kieu/], ['hang', 'Hãng', /hang|nha san xuat|nsx/], ['serial', 'Serial', /serial|so may/], ['ma_ts', 'Mã tài sản', /ma ts|ma tai san/],
    ['dvt', 'ĐVT', /^dv|don vi/], ['sl', 'SL', /^sl|so luong/], ['tinh_trang', 'Tình trạng lúc bàn giao', /tinh trang/], ['ghi_chu', 'Ghi chú', /ghi chu/]];
  async function manForm(id) {
    const nd = trang(id ? 'Sửa nháp ' + esc(id) : 'Lập biên bản bàn giao thiết bị', '', '<a href="#/tai-san">Tài sản</a> › <a href="#/ban-giao-tb">Bàn giao thiết bị</a> ›');
    if (!xl()) { nd.innerHTML = '<div class="card empty">Cần quyền xử lý mục Tài sản.</div>'; return; }
    const [dm, tbs, cu] = await Promise.all([api('bgtb_dm'), api('tb_ds'), id ? api('bgtb_ct', { id }) : null]);
    const b = cu || { ngay: homNay(), phong: '', ben_giao: dm.ben_giao, ben_nhan: '', ma_so_nhan: '', chuc_vu_nhan: 'Giảng viên quản lý phòng', ghi_chu: '', dong: [] };
    let dong = b.dong.map(d => Object.assign({}, d, { tb: d.tb || [] }));
    nd.innerHTML = '<form id="f" class="card"><div class="form-grid">' + o('ngay', 'Ngày bàn giao', { type: 'date', v: b.ngay, req: 1 }) +
      o('phong', 'Phòng nhận', { select: [['', '— Chọn phòng —']].concat(dm.phong.map(p => [p.ma, p.ma + ' – ' + p.ten])), v: b.phong, req: 1 }) +
      o('ben_giao', 'Bên giao (Quản lý PTN)', { v: b.ben_giao, req: 1 }) +
      o('gv', 'Bên nhận – chọn giảng viên đã đăng ký trang dùng chung', { select: [['', '— Chưa đăng ký / nhập tay bên dưới —']].concat(dm.gv.map(g => [g.ma_so, g.ho_ten + ' · ' + g.ma_so + (g.bo_mon ? ' · ' + g.bo_mon : '')])), v: b.ma_so_nhan }) +
      o('ben_nhan', 'Họ tên bên nhận (in trên biên bản)', { v: b.ben_nhan, req: 1, ph: 'VD: TS. Nguyễn Văn A' }) + o('chuc_vu_nhan', 'Chức vụ bên nhận', { v: b.chuc_vu_nhan }) +
      o('ghi_chu', 'Ghi chú', { v: b.ghi_chu, full: 1 }) + '</div><p class="note" id="goi-y-gv"></p>' +
      '<h2 style="margin-top:10px">Danh mục thiết bị bàn giao</h2><div class="btns" style="margin-bottom:8px"><button type="button" class="btn o sm" id="b-chon">+ Chọn thiết bị có sẵn</button><button type="button" class="btn o sm" id="b-moi">+ Thêm thiết bị mới</button>' +
      '<label class="btn o sm">⇪ Tải file Excel<input type="file" id="f-file" accept=".xlsx,.xls,.csv" hidden></label><a href="#" id="mau-file" class="btn o sm">Tải file mẫu</a></div>' +
      '<div id="ds-tb"></div><p class="note">Thiết bị mới: SL nhiều → khi xác nhận bàn giao, mỗi máy một hồ sơ trong Tài sản (Tên #1, #2…); mã tài sản / serial ghi riêng từng máy sau. Thiết bị có sẵn: mỗi dòng một máy.</p>' +
      '<div class="modal-foot"><a class="btn o" href="#/ban-giao-tb' + (id ? '/' + esc(id) : '') + '">Hủy</a><button class="btn">Lưu nháp</button></div></form>';
    const f = $('f');
    const goiYGV = () => { const p = dm.phong.find(x => x.ma === f.phong.value); $('goi-y-gv').innerHTML = p && p.phu_trach ? 'GV quản lý phòng hiện ghi: <b>' + esc(p.phu_trach) + '</b>' : (p ? 'Phòng ' + esc(p.ma) + ' chưa ghi GV quản lý.' : ''); };
    f.phong.onchange = () => { const p = dm.phong.find(x => x.ma === f.phong.value); if (p && p.phu_trach && !f.ben_nhan.value) f.ben_nhan.value = p.phu_trach.split(' / ')[0]; goiYGV(); };
    f.gv.onchange = () => { const g = dm.gv.find(x => x.ma_so === f.gv.value); if (g) f.ben_nhan.value = g.ho_ten; };
    goiYGV();
    const oNhap = (k, i, v, x) => '<input data-k="' + k + '" data-i="' + i + '" value="' + esc(v == null ? '' : v) + '"' + (x || '') + '>';
    const ve = () => {
      $('ds-tb').innerHTML = !dong.length ? '<div class="card empty">Chưa có thiết bị.</div>' : '<div class="tbl-wrap"><table class="bang-bg"><thead><tr><th>STT</th><th>Tên thiết bị *</th><th>Model</th><th>Hãng</th><th>Mã TS / serial</th><th>ĐVT</th><th>SL</th><th>Tình trạng lúc bàn giao</th><th>Ghi chú</th><th></th></tr></thead><tbody>' +
        dong.map((d, i) => { const san = d.tb.length > 0; return '<tr><td>' + (i + 1) + '</td><td>' + oNhap('ten', i, d.ten) + (san ? '<div class="note">' + d.tb.map(t => esc(t)).join(', ') + ' · có sẵn</div>' : '<div class="note">thiết bị mới</div>') + '</td><td>' + oNhap('model', i, d.model) + '</td><td>' + oNhap('hang', i, d.hang) + '</td>' +
          '<td>' + (san ? '<span class="note">' + esc(d.ma_ts || '') + '</span>' : oNhap('ma_ts', i, d.ma_ts, ' placeholder="Mã TS"') + oNhap('serial', i, d.serial, ' placeholder="Serial"')) + '</td><td>' + oNhap('dvt', i, d.dvt || 'Cái', ' style="width:60px"') + '</td>' +
          '<td>' + (san ? d.tb.length : oNhap('sl', i, d.sl || 1, ' type="number" min="1" max="200" style="width:64px"')) + '</td><td>' + oNhap('tinh_trang', i, d.tinh_trang || 'Hoạt động tốt') + '</td><td>' + oNhap('ghi_chu', i, d.ghi_chu) + '</td>' +
          '<td><button type="button" class="btn red sm" data-bo="' + i + '">✕</button></td></tr>'; }).join('') + '</tbody></table></div>';
      $('ds-tb').querySelectorAll('[data-k]').forEach(x => { x.oninput = () => { dong[+x.dataset.i][x.dataset.k] = x.value; }; });
      $('ds-tb').querySelectorAll('[data-bo]').forEach(x => { x.onclick = () => { dong.splice(+x.dataset.bo, 1); ve(); }; });
    };
    ve();
    $('b-moi').onclick = () => { dong.push({ tb: [], ten: '', dvt: 'Cái', sl: 1, tinh_trang: 'Hoạt động tốt' }); ve(); const l = $('ds-tb').querySelectorAll('[data-k=ten]'); l[l.length - 1].focus(); };
    $('b-chon').onclick = () => {
      const da = [].concat(...dong.map(d => d.tb)), l = tbs.filter(t => t.tinh_trang !== 'Đã thanh lý' && da.indexOf(t.id) < 0);
      moHop('<h2>Chọn thiết bị có sẵn</h2><div class="tools"><input type="search" id="q-tb" placeholder="Tìm tên, mã TS, phòng…"><label class="check" style="margin:0"><input type="checkbox" id="chua-bg" checked> Chỉ thiết bị chưa bàn giao</label></div><div id="ds-chon" style="max-height:50vh;overflow:auto"></div>' +
        '<div class="modal-foot"><button class="btn o" data-dong>Hủy</button><button class="btn" id="b-chon-ok">Thêm vào biên bản</button></div>');
      const veChon = () => { const q = boDau($('q-tb').value), cb = $('chua-bg').checked;
        $('ds-chon').innerHTML = l.filter(t => (!cb || !t.bgtb) && (!q || boDau([t.ten, t.ma_ts, t.phong, t.model, t.id].join(' ')).indexOf(q) >= 0)).map(t => '<label class="check"><input type="checkbox" value="' + esc(t.id) + '"> <b>' + esc(t.ten) + '</b> <span class="note">' +
          esc([t.id, t.ma_ts, t.model, t.phong ? 'phòng ' + t.phong : 'chưa xếp phòng', t.tinh_trang, t.bgtb ? 'đã bàn giao ' + t.bgtb : ''].filter(Boolean).join(' · ')) + '</span></label>').join('') || '<div class="note">Không có thiết bị phù hợp.</div>'; };
      $('q-tb').oninput = veChon; $('chua-bg').onchange = veChon; veChon();
      $('b-chon-ok').onclick = () => { const ids = [...document.querySelectorAll('#ds-chon input:checked')].map(i => i.value); if (!ids.length) return toast('Chọn ít nhất một thiết bị', true);
        ids.forEach(i => { const t = tbs.find(x => x.id === i); dong.push({ tb: [t.id], ten: t.ten, model: t.model, hang: t.hang, ma_ts: t.ma_ts, dvt: 'Cái', sl: 1, tinh_trang: t.tinh_trang === 'Đang sử dụng' ? 'Hoạt động tốt' : t.tinh_trang }); }); dongHop(); ve(); };
    };
    $('mau-file').onclick = (e) => { e.preventDefault(); chay(null, () => window.PTN_IN.taiExcel({ ten: 'Mau danh muc ban giao thiet bi', trang: [{ ten: 'Danh muc', cot: COT_FILE.map(c => Math.max(12, c[1].length + 2)), dongBang: 1,
      hang: [{ cao: 30, o: COT_FILE.map(c => ({ v: c[1].replace(' *', ''), b: 1, can: 'c', vien: 1, nen: c[1].indexOf('*') > 0 ? '#FCE4D6' : '#D9E2F3' })) }, { cao: 18, o: COT_FILE.map(c => ({ v: { ten: 'Cân phân tích 4 số lẻ', model: 'AX224', hang: 'Ohaus', dvt: 'Cái', sl: 2, tinh_trang: 'Mới 100%' }[c[0]] || '', vien: 1, i: 1 })) }]
        .concat(Array.from({ length: 50 }, () => ({ cao: 18, o: COT_FILE.map(() => ({ v: '', vien: 1 })) }))) }] })); };
    $('f-file').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const X = await napXlsx(), wb = X.read(await file.arrayBuffer()), rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }), bd = (v) => boDau(String(v).replace(/\s+/g, ' ').trim());
        let hd = rows.findIndex(r => r.filter(c => COT_FILE.some(k => k[2].test(bd(c)))).length >= 2); if (hd < 0) throw new Error('Không thấy dòng tiêu đề (Tên thiết bị, Model, SL…)');
        const map = {}; COT_FILE.forEach(k => { const j = rows[hd].findIndex((c, j2) => c && k[2].test(bd(c)) && Object.values(map).indexOf(j2) < 0); if (j >= 0) map[k[0]] = j; });
        if (map.ten === undefined) throw new Error('Không thấy cột Tên thiết bị');
        let n = 0;
        rows.slice(hd + 1).forEach(r => { const g = (k) => map[k] === undefined ? '' : String(r[map[k]] == null ? '' : r[map[k]]).trim(); if (!g('ten')) return;
          dong.push({ tb: [], ten: g('ten'), model: g('model'), hang: g('hang'), serial: g('serial'), ma_ts: g('ma_ts'), dvt: g('dvt') || 'Cái', sl: parseInt(g('sl'), 10) || 1, tinh_trang: g('tinh_trang') || 'Hoạt động tốt', ghi_chu: g('ghi_chu') }); n++; });
        ve(); toast('Đã thêm ' + n + ' dòng từ file – kiểm tra rồi Lưu nháp');
      } catch (err) { toast(err.message, true); }
      e.target.value = '';
    };
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = giaTri(f);
      const bb = { id: id || '', ngay: v.ngay, phong: v.phong, ben_giao: v.ben_giao, ben_nhan: v.ben_nhan, ma_so_nhan: v.gv, chuc_vu_nhan: v.chuc_vu_nhan, ghi_chu: v.ghi_chu, thay_cho: b.thay_cho || '', dong };
      const r = await chay(e.submitter, () => api('bgtb_luu', { bb })); toast('Đã lưu nháp ' + r.id); location.hash = '#/ban-giao-tb/' + r.id;
    };
  }
  Object.assign(Q.TUYEN, { 'ban-giao-tb': manBanGiao });
})();
