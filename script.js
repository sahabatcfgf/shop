const API_URL = 'https://script.google.com/macros/s/AKfycbw8UnyTI7z-sRx6iFpUX2kcUW2dsq9iP4P7ud2DL5oUGazD2eXVBd-0ik3zwt1XXyNfYw/exec';
const DEFAULT_SHIPPING_PRICE = 15000;

let products = [];
let shippingData = []; // Data referensi lokasi ekspedisi
let cart = [];
let tempEmailAuth = '';

// Pengaturan Voucher
let discountPercent = 0;
let maxVoucherDiscount = 0; // Batas maksimal potongan
let appliedVoucherCode = '';

// Sistem Navigasi & Tampilan Gambar Produk
let activeCategory = 'Semua';
let currentImages = [];
let currentImgIndex = 0;
let currentShippingRate = DEFAULT_SHIPPING_PRICE; 

window.onload = () => {
    if(sessionStorage.getItem('id_user')) {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('main-store').style.display = 'block';
        loadInitData();
    }
};

// --- AUTENTIKASI ---
function openAuth(type) {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('form-login').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
    document.getElementById('form-otp').style.display = 'none';
}
function closeAuth() { document.getElementById('auth-modal').style.display = 'none'; }

async function doRegister() {
    let nama = document.getElementById('reg-nama').value;
    let email = document.getElementById('reg-email').value;
    let no_hp = document.getElementById('reg-nohp').value;
    let username = document.getElementById('reg-username').value;
    let password = document.getElementById('reg-password').value;

    if (!nama || !email || !username || !password || !no_hp) return Swal.fire('Error', 'Harap lengkapi form pendaftaran!', 'warning');

    let passHash = CryptoJS.SHA256(password).toString();
    tempEmailAuth = email;
    Swal.fire({ title: 'Mendaftarkan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'registerUser', nama, email, no_hp, username, password_hash: passHash }) });
        let json = await res.json();
        if (json.status === 'success') {
            Swal.close();
            document.getElementById('form-register').style.display = 'none';
            document.getElementById('form-otp').style.display = 'block';
        } else Swal.fire('Gagal', json.message, 'error');
    } catch (e) { Swal.fire('Error', 'Koneksi terputus', 'error'); }
}

async function verifyOTP() {
    let otp = document.getElementById('otp-code').value;
    if (!otp) return Swal.fire('Peringatan', 'Masukkan OTP!', 'warning');
    Swal.fire({ title: 'Memverifikasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'verifyOTP', email: tempEmailAuth, otp }) });
        let json = await res.json();
        if (json.status === 'success') {
            Swal.fire('Berhasil!', 'Akun aktif, silakan login.', 'success').then(() => openAuth('login'));
        } else Swal.fire('Gagal', json.message, 'error');
    } catch (e) { Swal.fire('Error', 'Koneksi terputus', 'error'); }
}

async function doLogin() {
    let username = document.getElementById('log-username').value;
    let password = document.getElementById('log-password').value;
    if (!username || !password) return Swal.fire('Peringatan', 'Username & Password wajib diisi.', 'warning');

    let passHash = CryptoJS.SHA256(password).toString();
    Swal.fire({ title: 'Memverifikasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'loginUser', username, password_hash: passHash }) });
        let json = await res.json();
        if (json.status === 'success') {
            sessionStorage.setItem('id_user', json.user.id_user);
            sessionStorage.setItem('nama_user', json.user.nama);
            sessionStorage.setItem('email_user', json.user.email);
            sessionStorage.setItem('nohp_user', json.user.no_hp);
            
            closeAuth();
            document.getElementById('landing-page').style.display = 'none';
            document.getElementById('main-store').style.display = 'block';
            loadInitData();
        } else Swal.fire('Gagal Login', json.message, 'error');
    } catch (e) { Swal.fire('Error', 'Koneksi terputus', 'error'); }
}
function logout() { sessionStorage.clear(); location.reload(); }

// --- INISIALISASI DATA (Produk & Shipping Data) ---
async function loadInitData() {
    Swal.fire({ title: 'Menyiapkan Toko...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitData' }) });
        let json = await res.json();
        if (json.status === 'success') {
            products = json.products;
            shippingData = json.shipping;
            
            renderCategories();
            renderGrid();
            populateKota();
            Swal.close();
        }
    } catch (err) { Swal.fire('Error', 'Gagal menarik data', 'error'); }
}

// --- FILTER KATEGORI ---
function renderCategories() {
    const container = document.getElementById('category-container');
    let categories = ['Semua', ...new Set(products.map(p => p.kategori))];
    
    container.innerHTML = '';
    categories.forEach(cat => {
        let btn = document.createElement('button');
        btn.className = `cat-pill ${cat === activeCategory ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            activeCategory = cat;
            document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGrid();
        };
        container.appendChild(btn);
    });
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    
    let filtered = activeCategory === 'Semua' ? products : products.filter(p => p.kategori === activeCategory);
    
    if(filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#999; padding:20px;">Produk tidak ditemukan.</p>`;
        return;
    }

    filtered.forEach(p => {
        let isHabis = p.stok_produk < 1;
        let btnHtml = isHabis 
            ? `<button disabled class="btn-disabled">Stok Habis</button>` 
            : `<button onclick="openProductModal('${p.kode_produk}')" class="btn-glow w-100" style="margin-top:10px;">Beli Sekarang</button>`;

        let hargaTampil = `<span class="price-promo">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
        if (p.harga_promo && p.harga_promo > 0) {
            hargaTampil = `<span class="price-promo">Rp ${p.harga_promo.toLocaleString('id-ID')}</span> <span class="price-coret">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
        }
        let gambarUtama = (p.url_gambar && p.url_gambar.trim() !== '') ? p.url_gambar.split(',')[0].trim() : 'https://placehold.co/400?text=No+Image';

        grid.innerHTML += `
            <div class="card animate__animated animate__fadeIn">
                <img src="${gambarUtama}" onclick="openProductModal('${p.kode_produk}')" onerror="this.src='https://placehold.co/400?text=Error'">
                <div class="card-body">
                    <h3 onclick="openProductModal('${p.kode_produk}')">${p.nama_produk}</h3>
                    <p style="font-size:0.85rem; color:#64748b; margin-bottom:8px;">${p.kategori} (${p.berat}g)</p>
                    ${hargaTampil}
                    ${btnHtml}
                </div>
            </div>`;
    });
}

// --- MODAL PRODUK DETAIL ---
function openProductModal(kode) {
    const p = products.find(x => x.kode_produk === kode);
    if (!p) return;

    currentImages = p.url_gambar ? p.url_gambar.split(',').map(u => u.trim()).filter(u => u !== '') : ['https://placehold.co/400?text=No+Image'];
    currentImgIndex = 0;

    document.getElementById('modal-img').src = currentImages[0];
    document.getElementById('btn-prev').style.display = currentImages.length > 1 ? 'flex' : 'none';
    document.getElementById('btn-next').style.display = currentImages.length > 1 ? 'flex' : 'none';

    document.getElementById('modal-title').innerText = p.nama_produk;
    
    let hargaTampil = `Rp ${p.harga_asli.toLocaleString('id-ID')}`;
    if (p.harga_promo && p.harga_promo > 0) hargaTampil = `Rp ${p.harga_promo.toLocaleString('id-ID')} <span class="price-coret">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
    
    document.getElementById('modal-price').innerHTML = hargaTampil;
    document.getElementById('modal-weight').innerText = `Berat per unit: ${p.berat || 0} gram`;
    document.getElementById('modal-desc').innerHTML = p.keterangan_produk ? p.keterangan_produk.replace(/\n/g, '<br>') : 'Tidak ada keterangan produk.';
    document.getElementById('modal-stock-text').innerText = p.stok_produk;
    document.getElementById('modal-qty').max = p.stok_produk;
    document.getElementById('modal-qty').value = 1;
    document.getElementById('modal-kode').value = p.kode_produk;

    document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() { document.getElementById('product-modal').style.display = 'none'; }
function prevSlide() { if(currentImages.length>1) { currentImgIndex = (currentImgIndex === 0) ? currentImages.length - 1 : currentImgIndex - 1; document.getElementById('modal-img').src = currentImages[currentImgIndex]; } }
function nextSlide() { if(currentImages.length>1) { currentImgIndex = (currentImgIndex === currentImages.length - 1) ? 0 : currentImgIndex + 1; document.getElementById('modal-img').src = currentImages[currentImgIndex]; } }
function openLightbox() { document.getElementById('lightbox-img').src = currentImages[currentImgIndex]; document.getElementById('lightbox').style.display = 'flex'; }
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }

// --- KERANJANG (CART) ---
function confirmAddToCart() {
    const kode = document.getElementById('modal-kode').value;
    const qtyInput = parseInt(document.getElementById('modal-qty').value);
    const p = products.find(x => x.kode_produk === kode);
    if (!p) return;
    if (qtyInput > p.stok_produk || qtyInput < 1 || isNaN(qtyInput)) return Swal.fire('Warning', 'Jumlah melebihi stok.', 'warning');

    let exist = cart.findIndex(c => c.kode_produk === kode);
    if (exist > -1) { 
        if (cart[exist].qty + qtyInput > p.stok_produk) return Swal.fire('Warning', `Batas keranjang ${p.stok_produk} pcs`, 'warning');
        cart[exist].qty += qtyInput; 
    } else { 
        cart.push({ ...p, qty: qtyInput }); 
    }
    
    updateCartCount();
    closeProductModal();
    Swal.fire({ icon: 'success', title: 'Dimasukkan Keranjang', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    if (modal.style.display === 'flex') renderCart();
}

// --- LOGIK ADDRESS DROPDOWN & SHIPPING COST ---
function populateKota() {
    let kotaSelect = document.getElementById('ship-kota');
    let unikKota = [...new Set(shippingData.map(d => d.kota))].sort();
    kotaSelect.innerHTML = '<option value="">-- Pilih Kota --</option>';
    unikKota.forEach(k => kotaSelect.innerHTML += `<option value="${k}">${k}</option>`);
}

function updateKecamatan() {
    let kota = document.getElementById('ship-kota').value;
    let kecSelect = document.getElementById('ship-kec');
    let kelSelect = document.getElementById('ship-kel');
    
    kecSelect.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
    kelSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
    kecSelect.disabled = true; kelSelect.disabled = true;
    currentShippingRate = DEFAULT_SHIPPING_PRICE;
    renderCart();

    if(!kota) return;
    let filteredKec = [...new Set(shippingData.filter(d => d.kota === kota).map(d => d.kecamatan))].sort();
    filteredKec.forEach(k => kecSelect.innerHTML += `<option value="${k}">${k}</option>`);
    kecSelect.disabled = false;
}

function updateKelurahan() {
    let kota = document.getElementById('ship-kota').value;
    let kec = document.getElementById('ship-kec').value;
    let kelSelect = document.getElementById('ship-kel');
    
    kelSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
    kelSelect.disabled = true;
    currentShippingRate = DEFAULT_SHIPPING_PRICE;
    renderCart();

    if(!kec) return;
    let filteredKel = shippingData.filter(d => d.kota === kota && d.kecamatan === kec);
    filteredKel.forEach(k => kelSelect.innerHTML += `<option value="${k.kelurahan}">${k.kelurahan}</option>`);
    kelSelect.disabled = false;
}

function calculateShipping() {
    let kota = document.getElementById('ship-kota').value;
    let kec = document.getElementById('ship-kec').value;
    let kel = document.getElementById('ship-kel').value;
    
    let route = shippingData.find(d => d.kota === kota && d.kecamatan === kec && d.kelurahan === kel);
    if(route) currentShippingRate = route.tarif;
    else currentShippingRate = DEFAULT_SHIPPING_PRICE;
    
    renderCart();
}

// --- RENDER CART & CHECKOUT ---
function renderCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let subtotalAll = 0, totalWeight = 0;

    cart.forEach((c, index) => {
        let harga = (c.harga_promo && c.harga_promo > 0) ? c.harga_promo : c.harga_asli;
        let subtotalItem = harga * c.qty;
        subtotalAll += subtotalItem;
        totalWeight += (c.berat || 0) * c.qty;

        list.innerHTML += `
            <div class="cart-item">
                <div style="flex:1;">
                    <h4 style="font-size:14px; margin-bottom:4px;">${c.nama_produk}</h4>
                    <p style="color:var(--primary); font-weight:bold; font-size:13px;">Rp ${subtotalItem.toLocaleString('id-ID')}</p>
                    <p style="font-size:11px; color:#64748b;">@Rp ${harga.toLocaleString('id-ID')} (${c.berat}g)</p>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                    <div class="qty-wrapper">
                        <button class="btn-qty" onclick="adjustQty(${index}, -1)">-</button>
                        <input type="number" value="${c.qty}" onchange="changeCartQty(${index}, this.value)">
                        <button class="btn-qty" onclick="adjustQty(${index}, 1)">+</button>
                    </div>
                    <i class="fas fa-trash" onclick="removeCartItem(${index})" style="color:var(--accent); cursor:pointer;" title="Hapus Produk"></i>
                </div>
            </div>`;
    });

    let shippingMultiplier = Math.ceil(totalWeight / 1000);
    if(shippingMultiplier < 1 && totalWeight > 0) shippingMultiplier = 1; 
    let shippingFee = shippingMultiplier * currentShippingRate;

    // Logika MAX Diskon Voucher
    let totalPotongan = subtotalAll * (discountPercent / 100);
    if(maxVoucherDiscount > 0 && totalPotongan > maxVoucherDiscount) {
        totalPotongan = maxVoucherDiscount; 
    }

    let totalAkhir = (subtotalAll - totalPotongan) + shippingFee;

    document.getElementById('summary-subtotal').innerText = `Rp ${subtotalAll.toLocaleString('id-ID')}`;
    
    let textDiskon = `- Rp ${totalPotongan.toLocaleString('id-ID')}`;
    if(discountPercent > 0) textDiskon += ` (${discountPercent}%)`;
    if(maxVoucherDiscount > 0 && totalPotongan === maxVoucherDiscount) textDiskon += ` (Maksimal)`;
    
    document.getElementById('summary-discount').innerText = textDiskon;
    document.getElementById('summary-weight').innerText = `${totalWeight.toLocaleString('id-ID')} gram`;
    
    document.getElementById('ongkir-rate').innerText = `(${shippingMultiplier}kg x ${currentShippingRate.toLocaleString('id-ID')})`;
    document.getElementById('summary-shipping').innerText = `Rp ${shippingFee.toLocaleString('id-ID')}`;
    document.getElementById('cart-total').innerText = `Rp ${totalAkhir.toLocaleString('id-ID')}`;
}

function adjustQty(index, amount) { changeCartQty(index, cart[index].qty + amount); }
function changeCartQty(index, newQty) {
    let qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return removeCartItem(index);
    if (qty > cart[index].stok_produk) { Swal.fire('Terbatas', `Sisa stok: ${cart[index].stok_produk}`, 'warning'); qty = cart[index].stok_produk; }
    cart[index].qty = qty; renderCart(); updateCartCount();
}
function removeCartItem(index) { cart.splice(index, 1); renderCart(); updateCartCount(); }
function updateCartCount() { document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0); }

// --- VOUCHER ---
async function applyVoucher() {
    let codeInput = document.getElementById('voucher-input').value.trim();
    if (!codeInput) return;
    
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkVoucher', code: codeInput }) });
        let json = await res.json();
        
        if (json.status === 'success') {
            discountPercent = json.diskon;
            maxVoucherDiscount = json.max_diskon; // simpan data max
            appliedVoucherCode = codeInput;
            Swal.fire('Voucher Diterapkan!', `Diskon ${json.diskon}% berhasil dipasang.`, 'success');
            renderCart();
        } else {
            discountPercent = 0; maxVoucherDiscount = 0; appliedVoucherCode = '';
            Swal.fire('Gagal', json.message, 'error');
            renderCart();
        }
    } catch (e) { Swal.fire('Error', 'Gagal memvalidasi voucher', 'error'); }
}

// --- CHECKOUT ---
async function checkout() {
    if (cart.length === 0) return Swal.fire('Peringatan', 'Keranjang Belanja masih kosong!', 'warning');
    
    let address = document.getElementById('ship-address').value.trim();
    let kota = document.getElementById('ship-kota').value;
    let kec = document.getElementById('ship-kec').value;
    let kel = document.getElementById('ship-kel').value;

    if (!address || !kota || !kec || !kel) return Swal.fire('Alamat Tidak Lengkap', 'Lengkapi form Alamat Jalan, Kota, Kecamatan, dan Kelurahan untuk pengiriman!', 'warning');

    let stringAlamatPenuh = `${address}, Kel. ${kel}, Kec. ${kec}, ${kota}`;

    let subtotalAll = 0, totalWeight = 0;
    let rincianWA = '';
    let cartPayload = [];
    
    let rincianHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:15px;">
        <thead><tr style="background:#4A90E2; color:white;"><th style="padding:10px;text-align:left;">Produk</th><th style="padding:10px;">Qty</th><th style="padding:10px;text-align:right;">Subtotal</th></tr></thead>
        <tbody>`;

    cart.forEach((c, i) => {
        let harga = (c.harga_promo && c.harga_promo > 0) ? c.harga_promo : c.harga_asli;
        let subtotalItem = harga * c.qty;
        subtotalAll += subtotalItem;
        totalWeight += (c.berat || 0) * c.qty;
        
        rincianWA += `${i+1}. ${c.nama_produk} [Qty: ${c.qty}] Rp ${subtotalItem.toLocaleString('id-ID')}\n`;
        rincianHTML += `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px;">${c.nama_produk}</td><td style="padding:10px;text-align:center;">${c.qty}</td><td style="padding:10px;text-align:right;font-weight:bold;">Rp ${subtotalItem.toLocaleString('id-ID')}</td></tr>`;
        
        cartPayload.push({ kode_produk: c.kode_produk, nama_produk: c.nama_produk, qty: c.qty, subtotal: subtotalItem });
    });

    let shippingMultiplier = Math.ceil(totalWeight / 1000);
    if(shippingMultiplier < 1 && totalWeight > 0) shippingMultiplier = 1;
    let shippingFee = shippingMultiplier * currentShippingRate;

    let totalPotonganGlobal = subtotalAll * (discountPercent / 100);
    if(maxVoucherDiscount > 0 && totalPotonganGlobal > maxVoucherDiscount) totalPotonganGlobal = maxVoucherDiscount;

    let totalAkhirPemesanan = (subtotalAll - totalPotonganGlobal) + shippingFee;

    rincianHTML += `</tbody></table>
    <div style="margin-top:15px; padding-top:10px; border-top:2px solid #4A90E2; text-align:right; font-size:13px; line-height:1.6;">
        Subtotal Produk: Rp ${subtotalAll.toLocaleString('id-ID')}<br>
        <span style="color:#E74C3C;">Diskon Voucher: -Rp ${totalPotonganGlobal.toLocaleString('id-ID')}</span><br>
        Berat Paket: ${totalWeight.toLocaleString('id-ID')}g<br>
        Ongkos Kirim (${shippingMultiplier}kg): Rp ${shippingFee.toLocaleString('id-ID')}<br>
        <h3 style="color:#4A90E2; margin-top:5px; font-size:17px;">Total Tagihan Akhir: Rp ${totalAkhirPemesanan.toLocaleString('id-ID')}</h3>
    </div>`;

    let idTransaksi = 'TRX-' + Date.now();
    let namaCust = sessionStorage.getItem('nama_user');
    let emailCust = sessionStorage.getItem('email_user');
    let noHpCust = sessionStorage.getItem('nohp_user');
    let idUser = sessionStorage.getItem('id_user');

    let pesanWA = `Halo Admin SahabatCFGF, saya ingin melanjutkan pesanan dari Website:\n\n` +
                  `*ID Transaksi:* ${idTransaksi}\n` +
                  `*Pemesan:* ${namaCust} (${noHpCust})\n` +
                  `*Alamat Tujuan:* ${stringAlamatPenuh}\n\n` +
                  `*Rincian Belanja:*\n${rincianWA}\n` +
                  `*Subtotal:* Rp ${subtotalAll.toLocaleString('id-ID')}\n` +
                  `*Diskon Voucher:* -Rp ${totalPotonganGlobal.toLocaleString('id-ID')}\n` +
                  `*Ongkir (${shippingMultiplier}kg):* Rp ${shippingFee.toLocaleString('id-ID')}\n\n` +
                  `*TOTAL TAGIHAN: Rp ${totalAkhirPemesanan.toLocaleString('id-ID')}*\n\n` +
                  `_Screenshot pembayaran terlampir._\nTerimakasih!`;

    let linkWA = `https://wa.me/628999833375?text=${encodeURIComponent(pesanWA)}`;

    Swal.fire({ title: 'Memproses Pesanan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let payloadData = {
            action: 'checkout', email: emailCust, nama_lengkap: namaCust, id_user: idUser, no_hp: noHpCust,
            id_transaksi: idTransaksi, rincian_html: rincianHTML, total_harga: totalAkhirPemesanan, 
            alamat_lengkap: stringAlamatPenuh, wa_link: linkWA, cart_items: cartPayload
        };

        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payloadData) });
        let json = await res.json();

    if (json.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Sukses!',
                    html: `
                        <div style="text-align: center;">
                            <p>Scan kode berikut untuk pembayaran:</p>
                            <img src="QRIS_SahabatCFGF.jpeg" alt="QRIS" class="qris-img" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px;">
                            <br>
                            <a href="QRIS_SahabatCFGF.jpeg" download="QRIS_ahabatCFGF.jpeg" class="btn-glow">
                            Download QRIS
                            </a>
                            <p style="margin-bottom: 5px;">Atau Transfer Bank:</p>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #eee;">
                                <h4 style="margin: 0; color: #0056b3;">BCA</h4>
                                <h3 style="margin: 5px 0;">7015306700</h3>
                                <p style="margin: 0 0 10px 0;">a.n Fiky Alannuari</p>
                                <button onclick="copyText('7015306700')" class="btn-ghost">
                                    📋 Salin Rekening
                                </button>
                            </div>

                            <p style="font-size: 0.9em; color: #555;">
                                Nota belanja terkirim ke email.<br>
                                <strong>Harap screenshot bukti transfer Anda sebesar\nRp. ${totalAkhirPemesanan.toLocaleString('id-ID')}</strong>
                            </p>
                            <p style="font-size: 0.85em; color: #888; margin-top: 15px;">
                                Mengarahkan ke WhatsApp Admin...
                            </p>
                        </div>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: 'Lanjut ke WhatsApp',
                    confirmButtonColor: '#25D366',
                    timer: 60000,
                    timerProgressBar: true
                }).then(() => {
                    // Logika reset keranjang bawaan Anda
                    cart = []; 
                    discountPercent = 0; 
                    maxVoucherDiscount = 0; 
                    appliedVoucherCode = '';
                    document.getElementById('voucher-input').value = '';
                    
                    // Update tampilan UI
                    renderCart(); 
                    updateCartCount(); 
                    toggleCart();
                    
                    // Buka link WhatsApp
                    // window.open(linkWA, '_blank');

                    if (result.isConfirmed) {
                    // Jika user KLIK tombol "Lanjut ke WhatsApp" -> Buka di tab baru
                    window.open(linkWA, '_blank');
                    } else if (result.dismiss === Swal.DismissReason.timer) {
                    // Jika user DIAM SAJA sampai 5 detik habis -> Alihkan di tab yang sama (Anti-Blokir)
                    window.location.href = linkWA;
                    }

                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menyimpan',
                    text: json.message
                });
            }
        } catch (err) { 
            Swal.fire({
                icon: 'error',
                title: 'Error Server',
                text: 'Tidak dapat memproses transaksi.'
            }); 
        }
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Notifikasi kecil (Toast) di pojok kanan atas
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'No. Rekening '+ text +' berhasil disalin!',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
    }).catch(err => {
        // Antisipasi jika browser memblokir atau ada error
        console.error("Gagal menyalin teks: ", err);
        alert("Gagal menyalin otomatis. Silakan salin manual: " + text);
    });
}

// --- RIWAYAT TRANSAKSI (HISTORY) ---
async function openHistory() {
    let idUser = sessionStorage.getItem('id_user');
    if(!idUser) return Swal.fire('Perhatian', 'Silakan Login terlebih dahulu', 'warning');
    
    document.getElementById('history-modal').style.display = 'flex';
    document.getElementById('history-container').innerHTML = '<p style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Memuat Data...</p>';

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getHistory', id_user: idUser }) });
        let json = await res.json();
        
        if (json.status === 'success') {
            renderHistory(json.data);
        } else {
            document.getElementById('history-container').innerHTML = `<p style="text-align:center; color:red;">Gagal menarik histori.</p>`;
        }
    } catch(e) {
        document.getElementById('history-container').innerHTML = `<p style="text-align:center; color:red;">Terjadi kesalahan jaringan.</p>`;
    }
}

function closeHistory() { document.getElementById('history-modal').style.display = 'none'; }

function renderHistory(data) {
    const container = document.getElementById('history-container');
    if(data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 30px; color:#888;">Anda belum memiliki riwayat transaksi.</p>';
        return;
    }
    
    // Grouping Data berdasarkan ID Transaksi
    let grouped = {};
    data.forEach(item => {
        if(!grouped[item.id_transaksi]) {
            grouped[item.id_transaksi] = { 
                tanggal: new Date(item.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}), 
                status: item.status, 
                resi: item.resi,
                total_bayar: 0,
                items: []
            };
        }
        grouped[item.id_transaksi].items.push(`${item.nama_produk} (x${item.qty})`);
        grouped[item.id_transaksi].total_bayar += Number(item.subtotal);
    });

    container.innerHTML = '';
    for(const [trx_id, val] of Object.entries(grouped)) {
        let colorStatus = '#e67e22'; // Menunggu Pembayaran
        if (val.status === 'Proses Pengiriman') colorStatus = '#3498db';
        if (val.status === 'Selesai') colorStatus = '#2ecc71';
        
        let resiHtml = (val.resi && val.resi.trim() !== '') ? `<p style="font-size:13px; margin-top:5px; padding:5px; background:#f1f5f9; border-radius:5px; font-family:monospace; border:1px solid #cbd5e1;"><b>Resi:</b> ${val.resi}</p>` : '';

        container.innerHTML += `
            <div class="history-card">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
                    <div>
                        <span style="font-weight:bold; font-size:14px; color:var(--primary);">${trx_id}</span><br>
                        <span style="font-size:11px; color:#888;">${val.tanggal}</span>
                    </div>
                    <span style="background:${colorStatus}; color:white; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:bold;">${val.status}</span>
                </div>
                <div style="font-size:13px; color:#444; line-height:1.5;">
                    <ul style="margin-left:15px; margin-bottom:10px;">
                        ${val.items.map(x => `<li>${x}</li>`).join('')}
                    </ul>
                </div>
                ${resiHtml}
            </div>
        `;
    }
}