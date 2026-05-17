const API_URL = 'https://script.google.com/macros/s/AKfycbzE2kqIUoW5I618jn1L3F2UNo8UwKi3AWjd_7aTaST0hAFl9Pm3Pm24CELQL9iJV0vsZg/exec';
let products = [], cart = [], user = JSON.parse(localStorage.getItem('sahabat_user')) || null;
let discountVoucher = 0, tempId = null;

// Konfigurasi Notifikasi Sudut Atas
const Toast = Swal.mixin({ 
    toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, 
    timerProgressBar: true, customClass: { popup: 'colored-toast' }
});

// Cek status login saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => { 
    if (user) showStore(); 
});

/* ================== AUTENTIKASI ================== */
function openAuth(type) {
    document.getElementById('modal-auth').style.display = 'flex';
    document.getElementById('form-login').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('form-reg').style.display = type === 'register' ? 'block' : 'none';
    document.getElementById('form-otp').style.display = 'none';
}

async function handleLogin() {
    const userStr = document.getElementById('l-user').value;
    const passStr = document.getElementById('l-pass').value;
    if(!userStr || !passStr) return Swal.fire('Error', 'Isi username dan password', 'warning');

    Swal.fire({ title: 'Mengecek data...', didOpen: () => { Swal.showLoading() } });

    const payload = { username: userStr, password: CryptoJS.SHA256(passStr).toString() };
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', payload }) });
        const data = await res.json();
        
        if(data.status === 'success') { 
            user = data.data; 
            localStorage.setItem('sahabat_user', JSON.stringify(user)); 
            Swal.fire('Berhasil', 'Selamat datang!', 'success').then(() => location.reload());
        } else {
            Swal.fire('Gagal', data.message, 'error');
        }
    } catch(err) { Swal.fire('Error', 'Gagal terhubung ke server', 'error'); }
}

async function handleRegister() {
    const nama = document.getElementById('r-nama').value;
    const email = document.getElementById('r-email').value;
    const tel = document.getElementById('r-tel').value;
    const userStr = document.getElementById('r-user').value;
    const pass = document.getElementById('r-pass').value;

    if(!nama || !email || !tel || !userStr || !pass) {
        return Swal.fire('Oops!', 'Semua kolom pendaftaran wajib diisi.', 'warning');
    }

    Swal.fire({ title: 'Mendaftarkan Akun...', text:'Mohon tunggu sebentar', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });

    const payload = {
        nama_lengkap: nama, email: email, nomor_telepon: tel, username: userStr,
        password: CryptoJS.SHA256(pass).toString()
    };

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'register', payload }) });
        const data = await res.json();

        if(data.status === 'success') {
            tempId = data.id_user; // Simpan ID sementara untuk OTP
            Swal.fire('Berhasil!', 'Silakan cek Inbox/Spam Email Anda untuk kode OTP.', 'success');
            document.getElementById('form-reg').style.display = 'none';
            document.getElementById('form-otp').style.display = 'block';
        } else {
            Swal.fire('Gagal', data.message, 'error');
        }
    } catch(err) { Swal.fire('Error', 'Gagal terhubung ke server', 'error'); }
}

async function handleVerify() {
    const otp = document.getElementById('v-otp').value;
    if(!otp) return Swal.fire('Oops', 'Masukkan kode OTP dari email.', 'warning');

    Swal.fire({ title: 'Verifikasi...', didOpen: () => { Swal.showLoading() } });

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'verify', payload: { id_user: tempId, otp: otp } }) });
        const data = await res.json();

        if(data.status === 'success') {
            Swal.fire('Aktif!', 'Akun berhasil diverifikasi. Silahkan Login.', 'success').then(() => {
                document.getElementById('form-otp').style.display = 'none';
                document.getElementById('form-login').style.display = 'block';
            });
        } else {
            Swal.fire('Gagal', data.message, 'error');
        }
    } catch(err) { Swal.fire('Error', 'Gagal terhubung ke server', 'error'); }
}

function doLogout() { 
    localStorage.removeItem('sahabat_user'); 
    location.reload(); 
}

/* ================== STORE & PRODUK ================== */
function showStore() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-store').style.display = 'block';
    loadData();
}

// async function loadData() {
//     Swal.fire({ title: 'Memuat Produk...', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });
//     try {
//         const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) });
//         const json = await res.json();
//         products = json.data;
//         Swal.close();
//         renderGrid();
//     } catch(err) { Swal.fire('Error', 'Gagal memuat data produk.', 'error'); }
// }

async function loadData() {
    Swal.fire({ title: 'Memuat Produk...', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getProducts' }) });
        const json = await res.json();
        
        if (json.status === 'success') {
            products = json.data;
            Swal.close();
            renderGrid();
        } else {
            // Tampilkan pesan error asli dari Google Script
            Swal.fire('Error Backend', json.message, 'error');
        }
    } catch(err) { 
        Swal.fire('Error Network', 'Gagal terhubung ke server atau URL salah.', 'error'); 
    }
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => {
        // Logika Gambar (Ambil gambar pertama) & Diskon
        const pics = p.url_gambar.split(';').map(u => u.trim());
        const isPromo = p.harga_promo && p.harga_promo > 0 && p.harga_promo < p.harga_asli;
        const disc = isPromo ? Math.round((p.harga_asli - p.harga_promo) / p.harga_asli * 100) : 0;
        
        return `
            <div class="card animate__animated animate__fadeInUp">
                ${isPromo ? `<div class="badge-disc">-${disc}%</div>` : ''}
                <img src="${pics[0]}" onclick="viewDetail('${p.kode_produk}')" alt="${p.nama_produk}">
                <h4 style="margin:10px 0; font-size:1.1rem; cursor:pointer;" onclick="viewDetail('${p.kode_produk}')">${p.nama_produk}</h4>
                <div style="margin-bottom:10px">
                    ${isPromo ? `<span class="price-old">Rp ${Number(p.harga_asli).toLocaleString('id-ID')}</span>` : ''}
                    <div class="price-new">Rp ${Number(isPromo ? p.harga_promo : p.harga_asli).toLocaleString('id-ID')}</div>
                </div>
                <button class="btn-add-stock" onclick="addToCart('${p.kode_produk}')">
                    <span><i class="fas fa-cart-plus"></i> Beli</span>
                    <span class="stock-label">Stok: ${p.stok_produk}</span>
                </button>
            </div>`;
    }).join('');
}

function viewDetail(kode) {
    const p = products.find(i => i.kode_produk === kode);
    const pics = p.url_gambar.split(';').map(u => u.trim());
    
    // Looping gambar untuk di modal
    let imgs = `<div style="display:flex; gap:10px; overflow-x:auto; padding:10px; margin-bottom:15px;">`;
    pics.forEach(u => imgs += `<img src="${u}" style="width:180px; height:180px; object-fit:cover; border-radius:10px; border:1px solid #ddd;">`);
    imgs += `</div>`;

    const hargaTampil = p.harga_promo > 0 ? p.harga_promo : p.harga_asli;

    Swal.fire({
        title: p.nama_produk,
        html: `
            ${imgs}
            <div style="text-align:left;">
                <h3 style="color:var(--success); margin-bottom:10px;">Rp ${Number(hargaTampil).toLocaleString('id-ID')}</h3>
                <p style="color:#666; font-size:0.9rem; line-height:1.5;">${p.keterangan_produk || 'Tidak ada deskripsi'}</p>
            </div>
        `,
        showCloseButton: true,
        confirmButtonText: '<i class="fas fa-cart-plus"></i> Tambah Keranjang',
        confirmButtonColor: '#3498db',
        width: '600px'
    }).then(res => { if(res.isConfirmed) addToCart(kode); });
}

/* ================== KERANJANG & CHECKOUT ================== */
function addToCart(kode) {
    const p = products.find(i => i.kode_produk === kode);
    const price = (p.harga_promo && p.harga_promo > 0) ? p.harga_promo : p.harga_asli;
    
    const exist = cart.find(i => i.kode_produk === kode);
    if(exist) {
        if(exist.qty >= p.stok_produk) return Swal.fire('Oops', 'Stok tidak mencukupi!', 'warning');
        exist.qty++; 
    } else {
        if(p.stok_produk < 1) return Swal.fire('Oops', 'Stok Habis!', 'warning');
        cart.push({...p, price, qty: 1});
    }
    
    updateCartUI();
    Toast.fire({ icon: 'success', title: 'Berhasil Masuk Keranjang!' });
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    let total = 0;
    
    document.getElementById('cart-list-items').innerHTML = cart.map((item, idx) => {
        const sub = item.price * item.qty;
        total += sub;
        return `
        <div class="cart-item">
            <div>
                <strong>${item.nama_produk}</strong> <br>
                <small>Rp ${Number(item.price).toLocaleString('id-ID')} x ${item.qty}</small>
            </div>
            <div>
                <strong>Rp ${Number(sub).toLocaleString('id-ID')}</strong>
                <i class="fas fa-trash" onclick="removeCart(${idx})" style="color:#ff4757; cursor:pointer; margin-left:15px;"></i>
            </div>
        </div>`;
    }).join('');
    
    const finalTotal = total - (total * (discountVoucher/100));
    document.getElementById('cart-total').innerText = "Rp " + finalTotal.toLocaleString('id-ID');
}

function removeCart(idx) { 
    cart.splice(idx, 1); 
    updateCartUI(); 
}

async function applyVoucher() {
    const code = document.getElementById('v-code').value;
    if(!code) return;

    Swal.fire({ title: 'Cek Voucher...', didOpen: () => { Swal.showLoading() } });

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkVoucher', payload: { code } }) });
        const data = await res.json();
        
        if(data.status === 'success') {
            discountVoucher = data.diskon;
            Swal.fire('Berhasil!', `Voucher diskon ${data.diskon}% diterapkan.`, 'success');
            updateCartUI();
        } else {
            Swal.fire('Gagal', data.message, 'error');
            discountVoucher = 0; updateCartUI();
        }
    } catch(err) { Swal.fire('Error', 'Koneksi bermasalah', 'error'); }
}

async function handleCheckout() {
    if(cart.length === 0) return Swal.fire('Keranjang Kosong', 'Pilih produk dulu yuk!', 'warning');

    Swal.fire({ title: 'Memproses Pesanan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

    // Siapkan data dengan total harga bersih setelah diskon voucher
    const items = cart.map(i => {
        let subtotal = i.price * i.qty;
        let subtotalFinal = subtotal - (subtotal * (discountVoucher/100));
        return {...i, total_final: subtotalFinal};
    });

    const payload = { id_user: user.id_user, items: items };

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkout', payload }) });
        const data = await res.json();
        
        if(data.status === 'success') {
            const finalPricetxt = document.getElementById('cart-total').innerText;
            const msg = window.encodeURIComponent(`Halo Admin SahabatCFGF!\nSaya ${user.nama_lengkap} sudah melakukan pesanan dengan ID: ${data.id_trx}.\nTotal Tagihan: ${finalPricetxt}\nMohon info rekening pembayaran.`);
            
            Swal.fire({
                icon: 'success', title: 'Pesanan Dibuat!',
                text: 'Akan diarahkan ke WhatsApp Admin untuk pembayaran.',
                confirmButtonText: 'Lanjut ke WhatsApp'
            }).then(() => {
                window.open(`https://wa.me/628999833375?text=${msg}`); // Ganti Nomor WA Admin di sini!
                cart = []; discountVoucher = 0; document.getElementById('v-code').value = '';
                updateCartUI(); closeModal('modal-cart'); loadData(); // Reload stok
            });
        }
    } catch(err) { Swal.fire('Error', 'Gagal memproses pesanan', 'error'); }
}

/* ================== RIWAYAT TRANSAKSI ================== */
async function toggleHistory() {
    document.getElementById('modal-history').style.display = 'flex';
    document.getElementById('history-list').innerHTML = '<p style="text-align:center;">Memuat riwayat...</p>';
    
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getHistory', payload: { id_user: user.id_user } }) });
        const data = await res.json();
        
        if(data.status === 'success') {
            if(data.data.length === 0) {
                document.getElementById('history-list').innerHTML = '<p style="text-align:center;">Belum ada riwayat transaksi.</p>';
                return;
            }
            
            document.getElementById('history-list').innerHTML = data.data.map(trx => {
                const tgl = new Date(trx[1]).toLocaleDateString('id-ID');
                return `
                <div style="border:1px solid #eee; border-radius:10px; padding:15px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <strong style="color:var(--primary);">${trx[0]}</strong>
                        <small>${tgl}</small>
                    </div>
                    <p style="margin:5px 0;">${trx[4]} (x${trx[5]})</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>Rp ${Number(trx[6]).toLocaleString('id-ID')}</strong>
                        <span style="background:#f1f2f6; padding:3px 8px; border-radius:5px; font-size:0.8rem; font-weight:bold;">${trx[7]}</span>
                    </div>
                </div>`;
            }).join('');
        }
    } catch(err) { document.getElementById('history-list').innerHTML = '<p>Gagal memuat riwayat.</p>'; }
}

function toggleCart() { document.getElementById('modal-cart').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
