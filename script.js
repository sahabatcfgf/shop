const API_URL = 'https://script.google.com/macros/s/AKfycbw8UnyTI7z-sRx6iFpUX2kcUW2dsq9iP4P7ud2DL5oUGazD2eXVBd-0ik3zwt1XXyNfYw/exec';

let products = [];
let cart = [];
let tempEmailAuth = '';

// --- CEK SESI LOGIN SAAT HALAMAN DIMUAT ---
window.onload = () => {
    if (sessionStorage.getItem('id_user')) {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('main-store').style.display = 'block';
        loadData(); // Otomatis load produk jika sudah login
    }
};

// --- AUTHENTICATION FLOW ---
function openAuth(type) {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('form-login').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = type === 'register' ? 'block' : 'none';
    document.getElementById('form-otp').style.display = 'none';
}

function closeAuth() { 
    document.getElementById('auth-modal').style.display = 'none'; 
}

async function doRegister() {
    let nama = document.getElementById('reg-nama').value;
    let email = document.getElementById('reg-email').value;
    let no_hp = document.getElementById('reg-nohp').value;
    let username = document.getElementById('reg-username').value;
    let password = document.getElementById('reg-password').value;

    if (!nama || !email || !username || !password) return Swal.fire('Error', 'Harap isi kolom penting!', 'error');

    let passHash = CryptoJS.SHA256(password).toString();
    tempEmailAuth = email; // Simpan untuk verifikasi OTP

    Swal.fire({ title: 'Mendaftarkan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let res = await fetch(API_URL, { method: 'POST', headers: {
        'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'registerUser', nama, email, no_hp, username, password_hash: passHash }) });
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
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'verifyOTP', email: tempEmailAuth, otp }) });
        let json = await res.json();
        
        if (json.status === 'success') {
            Swal.fire('Berhasil!', 'Akun Anda aktif. Silakan Login.', 'success').then(() => { openAuth('login'); });
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
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'loginUser', username, password_hash: passHash }) });
        let json = await res.json();

        if (json.status === 'success') {
            sessionStorage.setItem('id_user', json.user.id_user);
            sessionStorage.setItem('nama_user', json.user.nama);
            sessionStorage.setItem('email_user', json.user.email);
            
            closeAuth();
            document.getElementById('landing-page').style.display = 'none';
            document.getElementById('main-store').style.display = 'block';
            loadData(); // Load produk
        } else {
            Swal.fire('Gagal Login', json.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Koneksi terputus', 'error'); }
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

// --- STORE & PRODUCTS ---
async function loadData() {
    Swal.fire({ title: 'Memuat Produk...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) });
        let json = await res.json();
        if (json.status === 'success') {
            products = json.data;
            renderGrid();
            Swal.close();
        } else {
            Swal.fire('Error Backend', json.message, 'error');
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
            : `<button onclick="addToCart('${p.kode_produk}')" class="btn-glow w-100" style="margin-top:10px;">Tambah Keranjang</button>`;

        let hargaTampil = `<span class="price-promo">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
        if (p.harga_promo && p.harga_promo > 0) {
            hargaTampil = `<span class="price-promo">Rp ${p.harga_promo.toLocaleString('id-ID')}</span> <span class="price-coret">Rp ${p.harga_asli.toLocaleString('id-ID')}</span>`;
        }

        // --- FITUR PENANGANAN MULTIPLE IMAGE URLS (DENGAN PEMISAH KOMA) ---
        let gambarUtama = 'https://via.placeholder.com/300'; // Default jika kosong
        if (p.url_gambar && p.url_gambar.toString().trim() !== '') {
            // Memisahkan string berdasarkan koma, lalu mengambil url index pertama [0]
            let arrayGambar = p.url_gambar.toString().split(',');
            gambarUtama = arrayGambar[0].trim(); 
        }

        grid.innerHTML += `
            <div class="card animate__animated animate__fadeIn">
                <img src="${gambarUtama}" alt="${p.nama_produk}" onerror="this.src='https://via.placeholder.com/300'">
                <div class="card-body">
                    <h3>${p.nama_produk}</h3>
                    <p style="font-size:0.9rem; color:#777; margin-bottom:10px;">${p.kategori}</p>
                    ${hargaTampil}
                    ${btnHtml}
                </div>
            </div>`;
    });
}

// --- CART LOGIC ---
function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    if (modal.style.display === 'flex') renderCart();
}

function addToCart(kode) {
    const p = products.find(x => x.kode_produk === kode);
    if (!p) return;

    let opsiVarian = '';
    if (p.varian_produk && p.varian_produk.trim() !== '-' && p.varian_produk !== '') {
        p.varian_produk.split(',').forEach(v => {
            opsiVarian += `<option value="${v.trim()}">${v.trim()}</option>`;
        });
    } else {
        opsiVarian = `<option value="Original">Original</option>`;
    }

    Swal.fire({
        title: p.nama_produk,
        html: `
            <div style="text-align: left;">
                <label>Pilih Varian:</label>
                <select id="swal-varian" class="swal2-input" style="display:flex; width:100%; font-size:16px;">${opsiVarian}</select>
                <label style="margin-top: 15px; display:block;">Jumlah (Sisa stok: ${p.stok_produk}):</label>
                <input type="number" id="swal-qty" class="swal2-input" value="1" min="1" max="${p.stok_produk}" style="display:flex; width:100%;">
            </div>
        `,
        showCancelButton: true, confirmButtonText: 'Masukkan Keranjang',
        preConfirm: () => ({ varian: document.getElementById('swal-varian').value, qty: parseInt(document.getElementById('swal-qty').value) })
    }).then((res) => {
        if (res.isConfirmed) {
            let { varian, qty } = res.value;
            if (qty > p.stok_produk) return Swal.fire('Gagal', `Maksimal stok ${p.stok_produk}`, 'error');
            if (qty < 1) qty = 1;

            let exist = cart.findIndex(c => c.kode_produk === kode && c.varian === varian);
            if (exist > -1) {
                if (cart[exist].qty + qty > p.stok_produk) Swal.fire('Peringatan', 'Melebihi stok', 'warning');
                else cart[exist].qty += qty;
            } else {
                cart.push({ ...p, varian: varian, qty: qty });
            }
            updateCartCount();
            Swal.fire({ icon: 'success', title: 'Masuk Keranjang', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        }
    });
}

function renderCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let total = 0;

    cart.forEach((c, index) => {
        let harga = (c.harga_promo && c.harga_promo > 0) ? c.harga_promo : c.harga_asli;
        let subtotal = harga * c.qty;
        total += subtotal;

        list.innerHTML += `
            <div class="cart-item">
                <div>
                    <h4>${c.nama_produk}</h4>
                    <p>Varian: ${c.varian} | Rp ${harga.toLocaleString('id-ID')}</p>
                </div>
                <input type="number" value="${c.qty}" onchange="changeCartQty(${index}, this.value)">
            </div>
        `;
    });
    document.getElementById('cart-total').innerText = total.toLocaleString('id-ID');
}

function changeCartQty(index, newQty) {
    let qty = parseInt(newQty);
    let item = cart[index];
    if (qty < 1) {
        Swal.fire({ title: 'Hapus Produk?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus' })
        .then((res) => { if (res.isConfirmed) { cart.splice(index, 1); renderCart(); updateCartCount(); } else renderCart(); });
    } else if (qty > item.stok_produk) {
        Swal.fire('Terbatas', `Maksimal stok ${item.stok_produk}`, 'warning');
        renderCart();
    } else {
        cart[index].qty = qty;
        renderCart();
    }
}

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
}

// --- CHECKOUT PROCESS ---
async function checkout() {
    if (cart.length === 0) return Swal.fire('Kosong', 'Pilih produk dulu yuk!', 'warning');

    let totalAll = 0;
    let rincianWA = '';
    let rincianHTML = '<ul style="list-style:none; padding:0;">';
    let cartPayload = [];

    cart.forEach((c, i) => {
        let harga = (c.harga_promo && c.harga_promo > 0) ? c.harga_promo : c.harga_asli;
        let subtotal = harga * c.qty;
        totalAll += subtotal;
        
        rincianWA += `${i+1}. ${c.nama_produk} (${c.varian})\n   ${c.qty}x Rp ${harga.toLocaleString('id-ID')} = Rp ${subtotal.toLocaleString('id-ID')}\n`;
        rincianHTML += `<li style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px;"><b>${c.nama_produk}</b> <span style="color:#888;">(${c.varian})</span><br>${c.qty} x Rp ${harga.toLocaleString('id-ID')} = <b>Rp ${subtotal.toLocaleString('id-ID')}</b></li>`;
        
        // Data bersih untuk dikirim ke Spreadsheet
        cartPayload.push({ kode_produk: c.kode_produk, nama_produk: c.nama_produk, varian: c.varian, qty: c.qty, subtotal: subtotal });
    });
    rincianHTML += '</ul>';

    let idTransaksi = 'CFGF-' + Date.now();
    let namaCust = sessionStorage.getItem('nama_user');
    let emailCust = sessionStorage.getItem('email_user');
    let idUser = sessionStorage.getItem('id_user');
    let nomorAdminWA = '628999833375'; 

    let pesanWA = `Halo Admin SahabatCFGF, saya ingin memesan:\n\n*ID Transaksi:* ${idTransaksi}\n*Nama:* ${namaCust}\n\n*Rincian Pesanan:*\n${rincianWA}\n*Total Bayar: Rp ${totalAll.toLocaleString('id-ID')}*\n\nMohon info total ongkir. Terima kasih!`;
    let linkWA = `https://wa.me/${nomorAdminWA}?text=${encodeURIComponent(pesanWA)}`;

    Swal.fire({ title: 'Memproses Pesanan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        let payloadData = {
            action: 'checkout', email: emailCust, nama_lengkap: namaCust, id_user: idUser,
            id_transaksi: idTransaksi, rincian_html: rincianHTML, total_harga: totalAll.toLocaleString('id-ID'),
            wa_link: linkWA, cart_items: cartPayload
        };

        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payloadData) });

        Swal.fire('Pesanan Disiapkan!', 'Salinan dikirim ke email. Melanjutkan ke WhatsApp...', 'success').then(() => {
            cart = []; renderCart(); updateCartCount(); toggleCart();
            window.open(linkWA, '_blank');
        });
    } catch (err) { Swal.fire('Error', 'Gagal memproses pesanan.', 'error'); }
}