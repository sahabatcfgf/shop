const API_URL = 'https://script.google.com/macros/s/AKfycbw8UnyTI7z-sRx6iFpUX2kcUW2dsq9iP4P7ud2DL5oUGazD2eXVBd-0ik3zwt1XXyNfYw/exec';
const SHIPPING_PRICE_PER_KG = 15000; // Tarif dasar pengiriman per 1000 gram (Silakan ubah sesuai kebutuhan)

let products = [];
let cart = [];
let tempEmailAuth = '';
let discountPercent = 0;
let appliedVoucherCode = '';
let selectedProd = null;
let currentImages = [];
let currentImgIndex = 0;

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

    if (!nama || !email || !username || !password || !no_hp) return Swal.fire('Error', 'Harap lengkapi semua kolom!', 'error');

    let passHash = CryptoJS.SHA256(password).toString();
    tempEmailAuth = email;

    Swal.fire({ title: 'Mendaftarkan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'registerUser', nama, email, no_hp, username, password_hash: passHash }) 
        });
        let json = await res.json();
        
        if (json.status === 'success') {
            Swal.close();
            document.getElementById('form-register').style.display = 'none';
            document.getElementById('form-otp').style.display = 'block';
        } else {
            Swal.fire('Gagal', json.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Koneksi terputus', 'error'); }
}

async function verifyOTP() {
    let otp = document.getElementById('otp-code').value;
    if (!otp) return;
    
    Swal.fire({ title: 'Memverifikasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        let res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'verifyOTP', email: tempEmailAuth, otp }) 
        });
        let json = await res.json();
        
        if (json.status === 'success') {
            Swal.fire('Berhasil!', 'Akun aktif. Silakan Login.', 'success').then(() => { openAuth('login'); });
        } else {
            Swal.fire('Gagal', json.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Koneksi terputus', 'error'); }
}

async function doLogin() {
    let username = document.getElementById('log-username').value;
    let password = document.getElementById('log-password').value;
    if (!username || !password) return;

    let passHash = CryptoJS.SHA256(password).toString();
    Swal.fire({ title: 'Masuk...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'loginUser', username, password_hash: passHash }) 
        });
        let json = await res.json();

        if (json.status === 'success') {
            sessionStorage.setItem('id_user', json.user.id_user);
            sessionStorage.setItem('nama_user', json.user.nama);
            sessionStorage.setItem('email_user', json.user.email);
            sessionStorage.setItem('nohp_user', json.user.no_hp);
            
            closeAuth();
            if(document.getElementById('landing-page')) document.getElementById('landing-page').style.display = 'none';
            document.getElementById('main-store').style.display = 'block';
            loadData();
        } else {
            Swal.fire('Gagal Login', json.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Koneksi terputus', 'error'); }
}

function logout() { sessionStorage.clear(); location.reload(); }

async function loadData() {
    Swal.fire({ title: 'Memuat Produk...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        let res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getProducts' }) });
        let json = await res.json();
        if (json.status === 'success') {
            products = json.data;
            renderGrid();
            Swal.close();
        }
    } catch (err) { Swal.fire('Error', 'Gagal memuat data', 'error'); }
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    products.forEach(p => {
        let isHabis = p.stok_produk < 1;
        let btnHtml = isHabis 
            ? `<button disabled style="background:#ccc; color:#666; cursor:not-allowed; border:none; padding:10px; border-radius:5px; width:100%; margin-top:10px;">Stok Habis</button>` 
            : `<button onclick="openProductModal('${p.kode_produk}')" class="btn-glow w-100" style="margin-top:10px;">Lihat & Beli</button>`;

        let hargaTampil = `<span class="price-promo">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
        if (p.harga_promo && p.harga_promo > 0) {
            hargaTampil = `<span class="price-promo">Rp ${p.harga_promo.toLocaleString('id-ID')}</span> <span class="price-coret">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
        }

        let gambarUtama = 'https://placehold.co/400';
        if (p.url_gambar && p.url_gambar.trim() !== '') { 
            gambarUtama = p.url_gambar.split(',')[0].trim(); 
        }

        grid.innerHTML += `
            <div class="card">
                <img src="${gambarUtama}" onclick="openProductModal('${p.kode_produk}')" onerror="this.src='https://placehold.co/400'">
                <div class="card-body">
                    <h3 onclick="openProductModal('${p.kode_produk}')">${p.nama_produk}</h3>
                    <p style="font-size:0.85rem; color:#777; margin-bottom:8px;">${p.kategori} (${p.berat}g)</p>
                    ${hargaTampil}
                    ${btnHtml}
                </div>
            </div>`;
    });
}

function openProductModal(kode) {
    const p = products.find(x => x.kode_produk === kode);
    if (!p) return;

    currentImages = p.url_gambar ? p.url_gambar.split(',').map(u => u.trim()).filter(u => u !== '') : ['https://placehold.co/400'];
    currentImgIndex = 0;

    document.getElementById('modal-img').src = currentImages[0];
    document.getElementById('btn-prev').style.display = currentImages.length > 1 ? 'flex' : 'none';
    document.getElementById('btn-next').style.display = currentImages.length > 1 ? 'flex' : 'none';

    document.getElementById('modal-title').innerText = p.nama_produk;
    
    let hargaTampil = `Rp ${p.harga_asli.toLocaleString('id-ID')}`;
    if (p.harga_promo && p.harga_promo > 0) {
        hargaTampil = `Rp ${p.harga_promo.toLocaleString('id-ID')} <span class="price-coret">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
    }
    document.getElementById('modal-price').innerHTML = hargaTampil;
    document.getElementById('modal-weight').innerText = `Berat: ${p.berat || 0} gram`;
    
    let deskripsi = p.keterangan_produk ? p.keterangan_produk.replace(/\n/g, '<br>') : 'Tidak ada keterangan produk.';
    document.getElementById('modal-desc').innerHTML = deskripsi;
    
    document.getElementById('modal-stock-text').innerText = p.stok_produk;
    document.getElementById('modal-qty').max = p.stok_produk;
    document.getElementById('modal-qty').value = 1;
    document.getElementById('modal-kode').value = p.kode_produk;

    document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() { document.getElementById('product-modal').style.display = 'none'; }
function prevSlide() {
    if (currentImages.length <= 1) return;
    currentImgIndex = (currentImgIndex === 0) ? currentImages.length - 1 : currentImgIndex - 1;
    document.getElementById('modal-img').src = currentImages[currentImgIndex];
}
function nextSlide() {
    if (currentImages.length <= 1) return;
    currentImgIndex = (currentImgIndex === currentImages.length - 1) ? 0 : currentImgIndex + 1;
    document.getElementById('modal-img').src = currentImages[currentImgIndex];
}
function openLightbox() {
    document.getElementById('lightbox-img').src = currentImages[currentImgIndex];
    document.getElementById('lightbox').style.display = 'flex';
}
function closeLightbox() { document.getElementById('lightbox').style.display = 'none'; }

function confirmAddToCart() {
    const kode = document.getElementById('modal-kode').value;
    const qtyInput = parseInt(document.getElementById('modal-qty').value);
    const p = products.find(x => x.kode_produk === kode);

    if (!p) return;
    if (qtyInput > p.stok_produk || qtyInput < 1 || isNaN(qtyInput)) {
        return Swal.fire('Peringatan', 'Jumlah tidak valid atau melebihi sisa stok!', 'warning');
    }

    let exist = cart.findIndex(c => c.kode_produk === kode);
    if (exist > -1) { 
        if (cart[exist].qty + qtyInput > p.stok_produk) {
            return Swal.fire('Peringatan', `Total di keranjang melebihi batas stok (${p.stok_produk} pcs)`, 'warning');
        } else {
            cart[exist].qty += qtyInput; 
        }
    } else { 
        cart.push({ ...p, qty: qtyInput }); 
    }
    
    updateCartCount();
    closeProductModal();
    Swal.fire({ icon: 'success', title: 'Berhasil Masuk Keranjang', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    if (modal.style.display === 'flex') renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let subtotalAll = 0;
    let totalWeight = 0;

    cart.forEach((c, index) => {
        let harga = (c.harga_promo && c.harga_promo > 0) ? c.harga_promo : c.harga_asli;
        let subtotalItem = harga * c.qty;
        subtotalAll += subtotalItem;
        totalWeight += (c.berat || 0) * c.qty;

        list.innerHTML += `
            <div class="cart-item">
                <div>
                    <h4>${c.nama_produk}</h4>
                    <p style="color:var(--accent); font-weight:bold;">Rp ${subtotalItem.toLocaleString('id-ID')}</p>
                    <p style="font-size:0.8rem; color:#888;">Rp ${harga.toLocaleString('id-ID')} / pcs (${c.berat}g)</p>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                    <div class="qty-wrapper">
                        <button class="btn-qty" onclick="adjustQty(${index}, -1)">-</button>
                        <input type="number" value="${c.qty}" onchange="changeCartQty(${index}, this.value)">
                        <button class="btn-qty" onclick="adjustQty(${index}, 1)">+</button>
                    </div>
                    <i class="fas fa-trash" onclick="removeCartItem(${index})" style="color:var(--accent); cursor:pointer;"></i>
                </div>
            </div>`;
    });

    let shippingFee = 0;
    if (cart.length > 0) {
        let shippingMultiplier = Math.ceil(totalWeight / 1000);
        shippingFee = shippingMultiplier * SHIPPING_PRICE_PER_KG;
    }

    let totalPotongan = subtotalAll * (discountPercent / 100);
    let totalAkhir = subtotalAll - totalPotongan + shippingFee;

    document.getElementById('summary-subtotal').innerText = `Rp ${subtotalAll.toLocaleString('id-ID')}`;
    document.getElementById('summary-discount').innerText = `- Rp ${totalPotongan.toLocaleString('id-ID')} (${discountPercent}%)`;
    document.getElementById('summary-weight').innerText = `${totalWeight.toLocaleString('id-ID')} gram`;
    document.getElementById('summary-shipping').innerText = `Rp ${shippingFee.toLocaleString('id-ID')}`;
    document.getElementById('cart-total').innerText = `Rp ${totalAkhir.toLocaleString('id-ID')}`;
}

function adjustQty(index, amount) { changeCartQty(index, cart[index].qty + amount); }

function changeCartQty(index, newQty) {
    let qty = parseInt(newQty);
    if (isNaN(qty) || qty < 1) return removeCartItem(index);
    if (qty > cart[index].stok_produk) {
        Swal.fire('Terbatas', `Maksimal stok tersisa ${cart[index].stok_produk} pcs`, 'warning');
        qty = cart[index].stok_produk;
    }
    cart[index].qty = qty;
    renderCart();
    updateCartCount();
}

function removeCartItem(index) {
    cart.splice(index, 1);
    renderCart();
    updateCartCount();
}

function updateCartCount() { document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0); }

async function applyVoucher() {
    let codeInput = document.getElementById('voucher-input').value.trim();
    if (!codeInput) return;
    try {
        let res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'checkVoucher', code: codeInput }) });
        let json = await res.json();
        if (json.status === 'success') {
            discountPercent = json.diskon;
            appliedVoucherCode = codeInput;
            Swal.fire('Berhasil!', `Voucher hemat ${json.diskon}% terpasang.`, 'success');
            renderCart();
        } else {
            discountPercent = 0; appliedVoucherCode = '';
            Swal.fire('Gagal', 'Voucher tidak valid.', 'error');
            renderCart();
        }
    } catch (e) { Swal.fire('Error', 'Gagal cek voucher', 'error'); }
}

async function checkout() {
    if (cart.length === 0) return;

    let subtotalAll = 0;
    let totalWeight = 0;
    let rincianWA = '';
    
    let rincianHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:14px; margin-top:15px; color:#333;">
        <thead>
            <tr style="background-color:#4A90E2; color:white;">
                <th style="padding:10px; text-align:left; border-radius:5px 0 0 5px;">Produk</th>
                <th style="padding:10px; text-align:center;">Jumlah</th>
                <th style="padding:10px; text-align:right; border-radius:0 5px 5px 0;">Subtotal</th>
            </tr>
        </thead>
        <tbody>`;

    let cartPayload = [];

    cart.forEach((c, i) => {
        let harga = (c.harga_promo && c.harga_promo > 0) ? c.harga_promo : c.harga_asli;
        let subtotalItem = harga * c.qty;
        subtotalAll += subtotalItem;
        totalWeight += (c.berat || 0) * c.qty;
        
        let itemPotongan = subtotalItem * (discountPercent / 100);
        let subtotalFinalItem = subtotalItem - itemPotongan;
        let diskonTxtWA = discountPercent > 0 ? ` (diskon ${discountPercent}%)` : '';
        let diskonTxtHTML = discountPercent > 0 ? `<br><small style="color:#E74C3C;">Hemat ${discountPercent}% via Voucher</small>` : '';

        rincianWA += `${i+1}. ${c.nama_produk} [Qty: ${c.qty}] Rp ${subtotalFinalItem.toLocaleString('id-ID')}${diskonTxtWA}\n`;
        
        rincianHTML += `
            <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:12px 10px;"><b>${c.nama_produk}</b>${diskonTxtHTML}</td>
                <td style="padding:12px 10px; text-align:center;">${c.qty} pcs</td>
                <td style="padding:12px 10px; text-align:right; font-weight:bold;">Rp ${subtotalFinalItem.toLocaleString('id-ID')}</td>
            </tr>`;
        
        cartPayload.push({ kode_produk: c.kode_produk, nama_produk: c.nama_produk, qty: c.qty, subtotal: subtotalFinalItem });
    });

    let shippingMultiplier = Math.ceil(totalWeight / 1000);
    let shippingFee = shippingMultiplier * SHIPPING_PRICE_PER_KG;

    let totalPotonganGlobal = subtotalAll * (discountPercent / 100);
    let totalAkhirPemesanan = subtotalAll - totalPotonganGlobal + shippingFee;

    rincianHTML += `
        </tbody>
    </table>
    <div style="margin-top:15px; padding-top:10px; border-top:2px solid #4A90E2; text-align:right; font-size:14px; line-height:1.6;">
        <span style="color:#666;">Subtotal Produk: Rp ${subtotalAll.toLocaleString('id-ID')}</span><br>
        <span style="color:#E74C3C;">Potongan Voucher: -Rp ${totalPotonganGlobal.toLocaleString('id-ID')}</span><br>
        <span style="color:#666;">Total Berat: ${totalWeight.toLocaleString('id-ID')} gram</span><br>
        <span style="color:#666;">Ongkos Kirim (${shippingMultiplier} kg): Rp ${shippingFee.toLocaleString('id-ID')}</span><br>
        <h3 style="color:#2ECC71; margin-top:5px; font-size:18px;">Total Pembelian: Rp ${totalAkhirPemesanan.toLocaleString('id-ID')}</h3>
    </div>`;

    let idTransaksi = 'CFGF-' + Date.now();
    let namaCust = sessionStorage.getItem('nama_user') || '-';
    let emailCust = sessionStorage.getItem('email_user') || '-';
    let noHpCust = sessionStorage.getItem('nohp_user') || '-';
    let idUser = sessionStorage.getItem('id_user');

    let pesanWA = `Halo Sahabat CFGF, saya sudah melakukan pemesanan melalui Website.\n\n` +
                  `*ID Transaksi:* ${idTransaksi}\n` +
                  `*Nama Penerima:* ${namaCust}\n` +
                  `*Telp Penerima:* ${noHpCust}\n` +
                  `*Alamat Penerima:* Silahkan isi alamat lengkap Anda disini beserta kelurahan dan kecamatannya\n\n` +
                  `*Rincian pembelian:*\n${rincianWA}\n` +
                  `*Subtotal Produk:* Rp ${subtotalAll.toLocaleString('id-ID')}\n` +
                  `*Potongan Voucher:* -Rp ${totalPotonganGlobal.toLocaleString('id-ID')}\n` +
                  `*Total Berat:* ${totalWeight.toLocaleString('id-ID')} gram\n` +
                  `*Ongkos Kirim (${shippingMultiplier} kg):* Rp ${shippingFee.toLocaleString('id-ID')}\n\n` +
                  `*Total Akhir Pembayaran: Rp ${totalAkhirPemesanan.toLocaleString('id-ID')}*\n\n` +
                  `Mohon info rekening pembayaran dan ongkos kirim ke alamat saya.\n` +
                  `Terima kasih`;

    let linkWA = `https://wa.me/628999833375?text=${encodeURIComponent(pesanWA)}`;

    Swal.fire({ title: 'Memproses Pesanan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let payloadData = {
            action: 'checkout', email: emailCust, nama_lengkap: namaCust, id_user: idUser, no_hp: noHpCust,
            id_transaksi: idTransaksi, rincian_html: rincianHTML, total_harga: totalAkhirPemesanan.toLocaleString('id-ID'),
            wa_link: linkWA, cart_items: cartPayload
        };

        let res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payloadData) 
        });
        let json = await res.json();

        if (json.status === 'success') {
            Swal.fire('Pesanan Berhasil!', 'Nota telah dikirim ke email Anda. Membuka WhatsApp Admin...', 'success').then(() => {
                cart = []; discountPercent = 0; appliedVoucherCode = '';
                document.getElementById('voucher-input').value = '';
                renderCart(); updateCartCount(); toggleCart();
                window.open(linkWA, '_blank');
            });
        } else {
            Swal.fire('Gagal', json.message, 'error');
        }
    } catch (err) { Swal.fire('Error', 'Gagal memproses transaksi.', 'error'); }
}