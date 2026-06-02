const API_URL = 'https://script.google.com/macros/s/AKfycbw8UnyTI7z-sRx6iFpUX2kcUW2dsq9iP4P7ud2DL5oUGazD2eXVBd-0ik3zwt1XXyNfYw/exec';

let globalProducts = [];
let globalShippingData = [];
let cartList = [];
let currentLoggedUser = null;
let activeVoucherDiscount = 0;
let activeVoucherCode = '';
let activeShippingFee = 0;

// INITIAL LOAD
window.addEventListener('DOMContentLoaded', async () => {
    Swal.fire({ title: 'Memuat Toko...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await fetchProductsAndCategories();
    await fetchShippingDatabase();
    Swal.close();
});

// NAVIGATION CORE MANAGEMENT
function showSection(sectionName) {
    document.getElementById('home-section').style.display = sectionName === 'home' ? 'block' : 'none';
    document.getElementById('about-section').style.display = sectionName === 'about' ? 'block' : 'none';
    document.getElementById('contact-section').style.display = sectionName === 'contact' ? 'block' : 'none';
    
    if (window.innerWidth <= 768) {
        document.getElementById('navLinks').classList.remove('active');
    }
}

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

// AUTHENTICATION MODAL MANAGEMENT
function openAuth(mode) {
    document.getElementById('auth-modal').style.display = 'flex';
    switchAuthForm(mode);
}

function closeAuth() {
    document.getElementById('auth-modal').style.display = 'none';
}

function switchAuthForm(formName) {
    document.getElementById('form-login').style.display = formName === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = formName === 'register' ? 'block' : 'none';
}

async function doLoginProcess() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    if(!email || !pass) return Swal.fire('Gagal', 'Semua kolom wajib diisi!', 'error');

    Swal.showLoading();
    try {
        let res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'loginUser', email: email, password: pass })
        });
        let json = await res.json();
        if(json.status === 'success') {
            currentLoggedUser = json.user;
            document.getElementById('authNav').innerHTML = `<a href="#" onclick="processLogout()"><i class="fas fa-sign-out-alt"></i> ${currentLoggedUser.nama_lengkap}</a>`;
            closeAuth();
            Swal.fire('Berhasil', `Selamat datang kembali, ${currentLoggedUser.nama_lengkap}!`, 'success');
        } else {
            Swal.fire('Gagal', json.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', 'Gagal memproses login.', 'error');
    }
}

async function doRegisterProcess() {
    const nama = document.getElementById('reg-nama').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const pass = document.getElementById('reg-pass').value;

    if(!nama || !email || !phone || !pass) return Swal.fire('Gagal', 'Lengkapi seluruh data formulir!', 'error');

    Swal.showLoading();
    try {
        let res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'registerUser', nama_lengkap: nama, email: email, no_hp: phone, password: pass })
        });
        let json = await res.json();
        if(json.status === 'success') {
            switchAuthForm('login');
            Swal.fire('Sukses', json.message, 'success');
        } else {
            Swal.fire('Gagal', json.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', 'Gagal memproses pendaftaran.', 'error');
    }
}

function processLogout() {
    currentLoggedUser = null;
    document.getElementById('authNav').innerHTML = `<a href="#" onclick="openAuth('login')"><i class="fas fa-user"></i> Login</a>`;
    Swal.fire('Logged Out', 'Anda berhasil keluar akun.', 'success');
}

// PRODUCT LOADING & FILTER SYSTEM
async function fetchProductsAndCategories() {
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) });
        let json = await res.json();
        if(json.status === 'success') {
            globalProducts = json.data;
            renderCategoryNavigation(globalProducts);
            renderProductGrid(globalProducts);
        }
    } catch(e) {
        console.error("Gagal mendapatkan produk database.");
    }
}

function renderCategoryNavigation(products) {
    const categories = ['Semua', ...new Set(products.map(p => p.kategori))];
    
    // Navbar Dropdown filling
    const menu = document.getElementById('categoryMenu');
    menu.innerHTML = '';
    
    // Horizontal Pills filtering
    const pills = document.getElementById('categoryPills');
    pills.innerHTML = '';

    categories.forEach((cat, index) => {
        // Dropdown link
        let link = document.createElement('a');
        link.innerText = cat;
        link.href = "#";
        link.onclick = () => { filterProductByCategory(cat); showSection('home'); };
        menu.appendChild(link);

        // Pill button
        let pillBtn = document.createElement('button');
        pillBtn.className = `pill-item ${index === 0 ? 'active' : ''}`;
        pillBtn.innerText = cat;
        pillBtn.onclick = (e) => {
            document.querySelectorAll('.pill-item').forEach(p => p.classList.remove('active'));
            pillBtn.classList.add('active');
            filterProductByCategory(cat);
        };
        pills.appendChild(pillBtn);
    });
}

function filterProductByCategory(category) {
    if(category === 'Semua') {
        renderProductGrid(globalProducts);
    } else {
        const filtered = globalProducts.filter(p => p.kategori === category);
        renderProductGrid(filtered);
    }
}

function renderProductGrid(products) {
    const container = document.getElementById('product-container');
    container.innerHTML = '';

    if(products.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#999;">Produk tidak ditemukan.</p>';
        return;
    }

    products.forEach(p => {
        let discountPercent = Math.round(((p.harga_normal - p.harga_promo) / p.harga_normal) * 100);
        let card = document.createElement('div');
        card.className = 'product-card animate__animated animate__fadeIn';
        
        card.innerHTML = `
            <div class="card-clickable-area" onclick="openProductDetail('${p.id}')">
                <div class="img-frame">
                    <img src="${p.images[0]}" alt="${p.nama}">
                </div>
                <div class="card-info">
                    <h4 class="prod-name">${p.nama}</h4>
                    <div class="price-box">
                        <span class="price-old">Rp ${p.harga_normal.toLocaleString('id-ID')}</span>
                        <div class="promo-flex">
                            <span class="price-new">Rp ${p.harga_promo.toLocaleString('id-ID')}</span>
                            <span class="discount-badge">${discountPercent}% Off</span>
                        </div>
                    </div>
                    <div class="meta-row">
                        <span class="rating-txt"><i class="fas fa-star" style="color:#F39C12;"></i> ${p.rating}</span>
                        <span class="sold-txt">Terjual ${p.terjual}+</span>
                    </div>
                    <p class="stock-status">Stok: ${p.stok}</p>
                </div>
            </div>
            <div class="card-action">
                <button class="btn-add-cart" ${p.stok <= 0 ? 'disabled' : ''} onclick="addItemToCart('${p.id}')">
                    ${p.stok <= 0 ? 'Habis' : '<i class="fas fa-shopping-cart"></i> + Keranjang'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// PRODUCT DETAIL (CAROUSEL OVERLAY)
function openProductDetail(productId) {
    const p = globalProducts.find(prod => prod.id === productId);
    if(!p) return;

    document.getElementById('detail-title').innerText = p.nama;
    document.getElementById('detail-desc').innerText = p.deskripsi;
    document.getElementById('detail-normal-price').innerText = `Rp ${p.harga_normal.toLocaleString('id-ID')}`;
    document.getElementById('detail-promo-price').innerText = `Rp ${p.harga_promo.toLocaleString('id-ID')}`;
    document.getElementById('detail-stock').innerText = `Ketersediaan Produk: ${p.stok} unit`;
    document.getElementById('detail-sold').innerHTML = `<i class="fas fa-box-open"></i> Terjual ${p.terjual} produk`;
    document.getElementById('detail-rating').innerHTML = `<i class="fas fa-star" style="color:#F39C12;"></i> ${p.rating} / 5.0`;
    
    let disc = Math.round(((p.harga_normal - p.harga_promo) / p.harga_normal) * 100);
    document.getElementById('detail-discount-tag').innerText = `Hemat ${disc}%`;

    // Setup Carousel images
    const mainImg = document.getElementById('detail-main-img');
    mainImg.src = p.images[0];

    const thumbsContainer = document.getElementById('carouselThumbs');
    thumbsContainer.innerHTML = '';
    
    p.images.forEach((imgSrc, i) => {
        let thumb = document.createElement('img');
        thumb.src = imgSrc;
        thumb.className = `thumb-item ${i === 0 ? 'active-thumb' : ''}`;
        thumb.onclick = () => {
            mainImg.src = imgSrc;
            document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active-thumb'));
            thumb.classList.add('active-thumb');
        };
        thumbsContainer.appendChild(thumb);
    });

    const cartBtn = document.getElementById('detail-cart-btn');
    cartBtn.disabled = p.stok <= 0;
    cartBtn.innerHTML = p.stok <= 0 ? 'Stok Habis' : '<i class="fas fa-cart-plus"></i> Masukkan Keranjang';
    cartBtn.onclick = () => { addItemToCart(p.id); closeDetail(); };

    document.getElementById('detail-modal').style.display = 'flex';
}

function closeDetail() {
    document.getElementById('detail-modal').style.display = 'none';
}

// CART MANAGEMENT
function toggleCart() {
    document.getElementById('cartDrawer').classList.toggle('open');
}

function addItemToCart(id) {
    const p = globalProducts.find(prod => prod.id === id);
    if (!p || p.stok <= 0) return;

    const exist = cartList.find(item => item.id === id);
    if(exist) {
        if(exist.qty >= p.stok) return Swal.fire('Batas Stok', 'Jumlah pesanan melebihi stok tersedia.', 'warning');
        exist.qty++;
    } else {
        cartList.push({ id: p.id, nama: p.nama, harga_promo: p.harga_promo, image: p.images[0], qty: 1 });
    }
    
    updateCartDOM();
    Swal.fire({ title: 'Ditambahkan!', text: `${p.nama} masuk keranjang.`, icon: 'success', timer: 1000, showConfirmButton: false });
}

function updateCartQty(id, delta) {
    const target = cartList.find(item => item.id === id);
    const origin = globalProducts.find(p => p.id === id);
    
    if(!target) return;
    target.qty += delta;

    if(target.qty > origin.stok) {
        target.qty = origin.stok;
        Swal.fire('Maksimal Stok', 'Jumlah dibatasi sesuai sisa stok.', 'info');
    }

    if(target.qty <= 0) {
        cartList = cartList.filter(item => item.id !== id);
    }
    updateCartDOM();
}

function updateCartDOM() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    
    let subtotal = 0;
    let countTotal = 0;

    cartList.forEach(item => {
        subtotal += (item.harga_promo * item.qty);
        countTotal += item.qty;

        let row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <img src="${item.image}" alt="${item.nama}">
            <div class="cart-item-info">
                <h5>${item.nama}</h5>
                <p>Rp ${item.harga_promo.toLocaleString('id-ID')} / unit</p>
                <div class="qty-control-box">
                    <button onclick="updateCartQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="updateCartQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <div class="cart-item-sub">Rp ${(item.harga_promo * item.qty).toLocaleString('id-ID')}</div>
        `;
        container.appendChild(row);
    });

    document.getElementById('cart-count').innerText = countTotal;
    
    let discountAmount = subtotal * (activeVoucherDiscount / 100);
    let grandTotal = Math.max(0, (subtotal - discountAmount) + activeShippingFee);

    document.getElementById('sum-subtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('sum-discount').innerText = `- Rp ${discountAmount.toLocaleString('id-ID')}`;
    document.getElementById('sum-shipping').innerText = `Rp ${activeShippingFee.toLocaleString('id-ID')}`;
    document.getElementById('sum-grand').innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
}

async function applyVoucherCode() {
    const code = document.getElementById('voucher-input').value.trim();
    if(!code) return;

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkVoucher', code: code }) });
        let json = await res.json();
        if(json.status === 'success') {
            activeVoucherDiscount = json.diskon_persen;
            activeVoucherCode = code.toUpperCase();
            updateCartDOM();
            Swal.fire('Voucher Diterapkan', `Diskon sebesar ${json.diskon_persen}% berhasil dipasang.`, 'success');
        } else {
            Swal.fire('Gagal', json.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', 'Gagal memvalidasi kode voucher.', 'error');
    }
}

// PROFESSIONAL AUTOMATED SHIPPING CALCULATOR SYSTEM
async function fetchShippingDatabase() {
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getShippingData' }) });
        let json = await res.json();
        if(json.status === 'success') {
            globalShippingData = json.data;
            populateShippingKota();
        }
    } catch(e) {
        console.error("Gagal menarik data ekspedisi.");
    }
}

function populateShippingKota() {
    const kotaSelect = document.getElementById('ship-kota');
    const unikKota = [...new Set(globalShippingData.map(d => d.kota))];
    unikKota.forEach(kota => {
        let opt = document.createElement('option');
        opt.value = kota;
        opt.innerText = kota;
        kotaSelect.appendChild(opt);
    });
}

function updateShippingDistricts() {
    const kota = document.getElementById('ship-kota').value;
    const kecSelect = document.getElementById('ship-kecamatan');
    const kelSelect = document.getElementById('ship-kelurahan');
    
    kecSelect.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
    kelSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
    kelSelect.disabled = true;
    activeShippingFee = 0;
    updateCartDOM();

    if(!kota) { kecSelect.disabled = true; return; }

    const filteredKec = [...new Set(globalShippingData.filter(d => d.kota === kota).map(d => d.kecamatan))];
    filteredKec.forEach(kec => {
        let opt = document.createElement('option');
        opt.value = kec;
        opt.innerText = kec;
        kecSelect.appendChild(opt);
    });
    kecSelect.disabled = false;
}

function updateShippingSubdistricts() {
    const kota = document.getElementById('ship-kota').value;
    const kec = document.getElementById('ship-kecamatan').value;
    const kelSelect = document.getElementById('ship-kelurahan');
    
    kelSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
    activeShippingFee = 0;
    updateCartDOM();

    if(!kec) { kelSelect.disabled = true; return; }

    const filteredKel = globalShippingData.filter(d => d.kota === kota && d.kecamatan === kec);
    filteredKel.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item.kelurahan;
        opt.innerText = item.kelurahan;
        kelSelect.appendChild(opt);
    });
    kelSelect.disabled = false;
}

function calculateActiveShippingFee() {
    const kota = document.getElementById('ship-kota').value;
    const kec = document.getElementById('ship-kecamatan').value;
    const kel = document.getElementById('ship-kelurahan').value;

    const match = globalShippingData.find(d => d.kota === kota && d.kecamatan === kec && d.kelurahan === kel);
    if(match) {
        activeShippingFee = match.tarif;
    } else {
        activeShippingFee = 0;
    }
    updateCartDOM();
}

// CHECKOUT LOGIC & WORKSPACE COOPERATION
async function executeCheckout() {
    if(!currentLoggedUser) { toggleCart(); return openAuth('login'); }
    if(cartList.length === 0) return Swal.fire('Keranjang Kosong', 'Silahkan pilih produk belanja terlebih dahulu.', 'warning');
    
    const kota = document.getElementById('ship-kota').value;
    const kec = document.getElementById('ship-kecamatan').value;
    const kel = document.getElementById('ship-kelurahan').value;

    if(!kota || !kec || !kel) return Swal.fire('Alamat Belum Lengkap', 'Wajib melengkapi pilihan Kelurahan, Kecamatan, dan Kota untuk menghitung ekspedisi pengiriman.', 'warning');

    Swal.fire({ title: 'Memproses Pesanan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const txId = 'TRX-' + new Date().getTime();
    
    // Create HTML Invoice breakdown structure for dynamic mail
    let subtotal = 0;
    let tableRows = '';
    cartList.forEach(item => {
        subtotal += (item.harga_promo * item.qty);
        tableRows += `
            <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;">${item.nama}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">${item.qty}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">Rp ${(item.harga_promo * item.qty).toLocaleString('id-ID')}</td>
            </tr>`;
    });

    let discountAmount = subtotal * (activeVoucherDiscount / 100);
    let finalBill = (subtotal - discountAmount) + activeShippingFee;

    let rincianHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:14px; margin-top:10px;">
            <thead>
                <tr style="background-color:#4A90E2; color:white;">
                    <th style="padding:8px; text-align:left;">Produk</th>
                    <th style="padding:8px; text-align:center;">Qty</th>
                    <th style="padding:8px; text-align:right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
        <div style="text-align:right; margin-top:15px; font-size:14px; line-height:1.6;">
            <p style="margin:2px 0;">Subtotal Produk: <b>Rp ${subtotal.toLocaleString('id-ID')}</b></p>
            <p style="margin:2px 0; color:#E74C3C;">Potongan Voucher (${activeVoucherCode || '-'}): <b>- Rp ${discountAmount.toLocaleString('id-ID')}</b></p>
            <p style="margin:2px 0;">Ongkos Kirim: <b>Rp ${activeShippingFee.toLocaleString('id-ID')}</b></p>
            <h3 style="margin:5px 0; color:#4A90E2;">Total Tagihan: Rp ${finalBill.toLocaleString('id-ID')}</h3>
        </div>
    `;

    // WhatsApp Text Template Preparation
    let textWA = `Halo Admin SahabatCFGF, saya ingin konfirmasi pembayaran:\n\n` +
                 `*ID Transaksi:* ${txId}\n` +
                 `*Nama Customer:* ${currentLoggedUser.nama_lengkap}\n` +
                 `*Tujuan Kirim:* ${kel}, ${kec}, ${kota}\n\n` +
                 `*Rincian Belanja:*\n`;
    
    cartList.forEach(item => {
        textWA += `- ${item.nama} (x${item.qty}) : Rp ${(item.harga_promo * item.qty).toLocaleString('id-ID')}\n`;
    });
    
    textWA += `\nSubtotal: Rp ${subtotal.toLocaleString('id-ID')}\n` +
               `Potongan Voucher: - Rp ${discountAmount.toLocaleString('id-ID')}\n` +
               `Ongkos Kirim: Rp ${activeShippingFee.toLocaleString('id-ID')}\n` +
               `*Grand Total Pembayaran: Rp ${finalBill.toLocaleString('id-ID')}*\n\n` +
               `Mohon diinfokan nomor rekening pembayaran. Terima kasih!`;

    let waLink = `https://wa.me/628999833375?text=${encodeURIComponent(textWA)}`;

    let payload = {
        action: 'checkout',
        id_transaksi: txId,
        id_user: currentLoggedUser.id_user,
        nama_lengkap: currentLoggedUser.nama_lengkap,
        email: currentLoggedUser.email,
        no_hp: currentLoggedUser.no_hp,
        alamat: { kota: kota, kecamatan: kec, kelurahan: kel },
        cart_items: cartList,
        rincian_html: rincianHTML,
        wa_link: waLink
    };

    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        let json = await res.json();
        
        if(json.status === 'success') {
            Swal.fire({
                title: 'Pesanan Berhasil!',
                text: 'Invoice nota belanja otomatis terkirim ke email terdaftar Anda. Membuka WhatsApp Admin untuk langkah verifikasi...',
                icon: 'success'
            }).then(() => {
                cartList = [];
                activeVoucherDiscount = 0;
                activeVoucherCode = '';
                document.getElementById('voucher-input').value = '';
                updateCartDOM();
                toggleCart();
                window.open(waLink, '_blank');
            });
        } else {
            Swal.fire('Gagal', json.message, 'error');
        }
    } catch(e) {
        Swal.fire('Error', 'Terjadi kesalahan sistem saat menghubungi server.', 'error');
    }
}

// STATIC PAGES INTERACTIVE HANDLERS (ABOUT & CONTACT TEMPLATES)
function submitContact(method) {
    const nama = document.getElementById('contact-nama').value;
    const phone = document.getElementById('contact-phone').value;
    const msg = document.getElementById('contact-msg').value;

    if(!nama || !phone || !msg) return Swal.fire('Kolom Kosong', 'Harap lengkapi semua baris formulir sebelum mengirim pesan!', 'warning');

    let templateStr = `Halo Admin SahabatCFGF,\n\nNama: ${nama}\nNo. HP: ${phone}\nPesan: ${msg}`;

    if(method === 'wa') {
        let waUrl = `https://wa.me/628999833375?text=${encodeURIComponent(templateStr)}`;
        window.open(waUrl, '_blank');
    } else if(method === 'email') {
        let mailtoUrl = `mailto:sahabatcfgf@gmail.com?subject=Pertanyaan dari ${encodeURIComponent(nama)}&body=${encodeURIComponent(templateStr)}`;
        window.open(mailtoUrl, '_blank');
    }
}