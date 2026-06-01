const API_URL = 'https://script.google.com/macros/s/AKfycbw8UnyTI7z-sRx6iFpUX2kcUW2dsq9iP4P7ud2DL5oUGazD2eXVBd-0ik3zwt1XXyNfYw/exec';
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

function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
}

async function handleLogin() {
    const userStr = document.getElementById('l-user').value;
    const passStr = document.getElementById('l-password').value;
    if(!userStr || !passStr) return Swal.fire('Error', 'Isi username dan password', 'warning');

    Swal.fire({ title: 'Mengecek data...', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });

    const payload = { username: userStr, password: CryptoJS.SHA256(passStr).toString() };
    
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', payload }) 
        });
        const data = await res.json();
        
        if(data.status === 'success') { 
            user = data.data; 
            localStorage.setItem('sahabat_user', JSON.stringify(user)); 
            Swal.fire('Berhasil', 'Selamat datang kembali!', 'success').then(() => location.reload());
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
    const pass = document.getElementById('r-password').value;

    if(!nama || !email || !tel || !userStr || !pass) {
        return Swal.fire('Oops!', 'Semua kolom pendaftaran wajib diisi.', 'warning');
    }

    Swal.fire({ title: 'Mendaftarkan Akun...', text:'Mohon tunggu sebentar', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });

    const payload = {
        nama_lengkap: nama, email: email, nomor_telepon: tel, username: userStr,
        password: CryptoJS.SHA256(pass).toString()
    };

    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'register', payload }) 
        });
        const data = await res.json();

        if(data.status === 'success') {
            tempId = data.id_user; 
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

    Swal.fire({ title: 'Verifikasi...', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });

    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'verify', payload: { id_user: tempId, otp: otp } }) 
        });
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

async function loadData() {
    Swal.fire({ title: 'Memuat Produk...', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getProducts' }) 
        });
        const json = await res.json();
        
        if (json.status === 'success') {
            products = json.data;
            Swal.close();
            renderGrid();
        } else {
            Swal.fire('Error Backend', json.message, 'error');
        }
    } catch(err) { 
        Swal.fire('Error Network', 'Gagal terhubung ke server.', 'error'); 
    }
}

function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => {
        const pics = p.url_gambar.split(';').map(u => u.trim());
        const isPromo = p.harga_promo && p.harga_promo > 0 && p.harga_promo < p.harga_asli;
        const disc = isPromo ? Math.round((p.harga_asli - p.harga_promo) / p.harga_asli * 100) : 0;
        const isHabis = p.stok_produk < 1;
        
        const btnHtml = isHabis
            ? `<button disabled style="background:#ccc; color:#666; cursor:not-allowed; border:none; padding:10px; border-radius:10px; width:calc(100% - 30px); margin:0 auto; display:flex; justify-content:center; font-weight:bold;">Stok Habis</button>`
            : `<button class="btn-add-stock" onclick="addToCart('${p.kode_produk}')">
                    <span><i class="fas fa-cart-plus"></i> Beli</span>
                    <span class="stock-label">Stok: ${p.stok_produk}</span>
               </button>`;
        
        return `
            <div class="card animate__animated animate__fadeInUp">
                ${isPromo ? `<div class="badge-disc">-${disc}%</div>` : ''}
                <img src="${pics[0] || 'https://placehold.co/400'}" onclick="viewDetail('${p.kode_produk}')" alt="${p.nama_produk}" onerror="this.src='https://placehold.co/400'">
                <h4 style="cursor:pointer;" onclick="viewDetail('${p.kode_produk}')">${p.nama_produk}</h4>
                <p style="font-size:0.85rem; color:#777; padding: 0 15px;">${p.kategori}</p>
                <div class="price-container">
                    ${isPromo ? `<span class="price-old">Rp ${Number(p.harga_asli).toLocaleString('id-ID')}</span>` : ''}
                    <div class="price-new">Rp ${Number(isPromo ? p.harga_promo : p.harga_asli).toLocaleString('id-ID')}</div>
                </div>
                ${btnHtml}
            </div>`;
    }).join('');
}

function viewDetail(kode) {
    const p = products.find(i => i.kode_produk === kode);
    if (!p) return;
    const pics = p.url_gambar.split(';').map(u => u.trim());
    
    let imgs = `<div style="display:flex; gap:10px; overflow-x:auto; padding:10px; margin-bottom:15px; scrollbar-width: thin;">`;
    pics.forEach(u => {
        if(u) imgs += `<img src="${u}" style="width:160px; height:160px; object-fit:cover; border-radius:10px; border:1px solid #ddd;" onerror="this.src='https://placehold.co/400'">`;
    });
    imgs += `</div>`;

    const hargaTampil = (p.harga_promo && p.harga_promo > 0) ? p.harga_promo : p.harga_asli;

    Swal.fire({
        title: p.nama_produk,
        html: `
            ${imgs}
            <div style="text-align:left; max-height:200px; overflow-y:auto; padding-right:5px;">
                <h3 style="color:var(--accent); margin-bottom:10px;">Rp ${Number(hargaTampil).toLocaleString('id-ID')}</h3>
                <p style="color:#555; font-size:0.9rem; line-height:1.5; white-space: pre-line;">${p.keterangan_produk || 'Tidak ada deskripsi produk.'}</p>
            </div>
        `,
        showCloseButton: true,
        confirmButtonText: '<i class="fas fa-cart-plus"></i> Tambah Keranjang',
        confirmButtonColor: '#4A90E2',
        width: '550px'
    }).then(res => { 
        if(res.isConfirmed && p.stok_produk > 0) addToCart(kode); 
    });
}

/* ================== KERANJANG & CHECKOUT ================== */
function toggleCart() { 
    const modal = document.getElementById('modal-cart');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    if(modal.style.display === 'flex') updateCartUI();
}

function addToCart(kode) {
    const p = products.find(i => i.kode_produk === kode);
    if(!p) return;
    const price = (p.harga_promo && p.harga_promo > 0) ? p.harga_promo : p.harga_asli;
    
    const exist = cart.find(i => i.kode_produk === kode);
    if(exist) {
        if(exist.qty >= p.stok_produk) return Swal.fire('Oops', 'Stok toko tidak mencukupi!', 'warning');
        exist.qty++; 
    } else {
        if(p.stok_produk < 1) return Swal.fire('Oops', 'Stok Habis!', 'warning');
        cart.push({...p, price, qty: 1});
    }
    
    updateCartUI();
    Toast.fire({ icon: 'success', title: 'Berhasil Masuk Keranjang!' });
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.reduce((sum, item) => sum + item.qty, 0);
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
            <div style="text-align:right;">
                <strong>Rp ${Number(sub).toLocaleString('id-ID')}</strong> <br>
                <i class="fas fa-trash" onclick="removeCart(${idx})" style="color:var(--accent); cursor:pointer; margin-top:5px; display:inline-block;"></i>
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
    const code = document.getElementById('v-code').value.trim();
    if(!code) return;

    Swal.fire({ title: 'Memverifikasi Voucher...', didOpen: () => { Swal.showLoading() }, allowOutsideClick: false });

    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'checkVoucher', payload: { code } }) 
        });
        const data = await res.json();
        
        if(data.status === 'success') {
            discountVoucher = data.diskon;
            Swal.fire('Berhasil!', `Voucher diskon ${data.diskon}% diterapkan.`, 'success');
            updateCartUI();
        } else {
            Swal.fire('Gagal', data.message, 'error');
            discountVoucher = 0; 
            updateCartUI();
        }
    } catch(err) { Swal.fire('Error', 'Koneksi bermasalah', 'error'); }
}

async function handleCheckout() {
    if(cart.length === 0) return Swal.fire('Keranjang Kosong', 'Pilih produk dulu yuk!', 'warning');

    Swal.fire({ title: 'Memproses Pesanan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

    const items = cart.map(i => {
        let subtotal = i.price * i.qty;
        let subtotalFinal = subtotal - (subtotal * (discountVoucher/100));
        return { kode_produk: i.kode_produk, nama_produk: i.nama_produk, qty: i.qty, subtotal: subtotalFinal };
    });

    const payload = { id_user: user.id_user, items: items };

    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'checkout', payload }) 
        });
        const data = await res.json();
        
        if(data.status === 'success') {
            const finalPricetxt = document.getElementById('cart-total').innerText;
            const msg = window.encodeURIComponent(`Halo Admin SahabatCFGF!\nSaya *${user.nama_lengkap}* sudah mengirimkan pesanan lewat Website.\n\n*ID Transaksi:* ${data.id_trx}\n*Total Pembayaran:* ${finalPricetxt}\n\nMohon info rekening pembayaran. Terima kasih!`);
            
            Swal.fire({
                icon: 'success', title: 'Pesanan Sukses!',
                text: 'Detail nota dikirim ke email. Melanjutkan ke WhatsApp Admin...',
                confirmButtonText: 'Lanjut ke WhatsApp'
            }).then(() => {
                window.open(`https://wa.me/628999833375?text=${msg}`, '_blank');
                cart = []; discountVoucher = 0; document.getElementById('v-code').value = '';
                updateCartUI(); closeModal('modal-cart'); loadData(); 
            });
        } else {
            Swal.fire('Gagal', data.message, 'error');
        }
    } catch(err) { Swal.fire('Error', 'Gagal memproses pesanan', 'error'); }
}

/* ================== RIWAYAT TRANSAKSI ================== */
async function toggleHistory() {
    document.getElementById('modal-history').style.display = 'flex';
    document.getElementById('history-list').innerHTML = '<p style="text-align:center; padding:20px;">Memuat riwayat transaksi...</p>';
    
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getHistory', payload: { id_user: user.id_user } }) 
        });
        const data = await res.json();
        
        if(data.status === 'success') {
            if(data.data.length === 0) {
                document.getElementById('history-list').innerHTML = '<p style="text-align:center; padding:20px; color:#888;">Belum ada riwayat transaksi.</p>';
                return;
            }
            
            document.getElementById('history-list').innerHTML = data.data.map(trx => {
                const tgl = new Date(trx[1]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                return `
                <div style="border:1px solid #eee; border-radius:10px; padding:15px; margin-bottom:10px; background:#fafafa;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <strong style="color:var(--primary); font-size:0.9rem;">${trx[0]}</strong>
                        <small style="color:#999;">${tgl}</small>
                    </div>
                    <p style="margin:8px 0; font-size:0.95rem; font-weight:500;">${trx[4]} (x${trx[5]})</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; border-top:1px dashed #eee; padding-top:8px;">
                        <strong>Rp ${Number(trx[6]).toLocaleString('id-ID')}</strong>
                        <span style="background:#e8f8f5; color:#1abc9c; padding:3px 8px; border-radius:5px; font-size:0.75rem; font-weight:bold;">${trx[7] || 'Sukses'}</span>
                    </div>
                </div>`;
            }).join('');
        }
    } catch(err) { document.getElementById('history-list').innerHTML = '<p style="text-align:center; padding:20px; color:var(--accent);">Gagal memuat riwayat.</p>'; }
}