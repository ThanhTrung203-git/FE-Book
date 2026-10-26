import { useState } from 'react';
import { BookOpen, ShieldCheck, TriangleAlert } from 'lucide-react';

export function AuthPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'register') {
        await onRegister({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password });
        setMode('login'); setRole('customer'); setForm((old) => ({ ...old, password: '' }));
        setMessage('Đăng ký thành công. Bạn có thể đăng nhập.');
      } else await onLogin(form.email.trim(), form.password, role);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login">
    <section className="art"><b className="brand"><i><BookOpen /></i> mộc<span>.</span></b>
      <div><small>✦　KHÔNG GIAN CỦA NHỮNG CÂU CHUYỆN</small><h1>Mỗi cuốn sách<br />mở ra một <em>thế giới.</em></h1><p>Chăm chút từng trang sách, kết nối những tâm hồn yêu đọc.</p></div>
      <small>Đọc chậm. Sống sâu.　·　EST. 2024</small>
    </section>
    <section className="loginbox"><small>●　HỆ THỐNG NHÀ SÁCH MỘC</small>
      <div className="loginform"><i className="lock"><ShieldCheck /></i>
        <small className="purple">{mode === 'register' ? 'TẠO TÀI KHOẢN KHÁCH HÀNG' : 'CHÀO MỪNG TRỞ LẠI'}</small>
        <h2>{mode === 'register' ? 'Đăng ký' : 'Đăng nhập'}</h2>
        {mode === 'login' && <div className="auth-switch"><button type="button" className={role === 'customer' ? 'chosen' : ''} onClick={() => setRole('customer')}>Khách hàng</button><button type="button" className={role === 'admin' ? 'chosen' : ''} onClick={() => setRole('admin')}>Quản trị viên</button></div>}
        <p>{mode === 'register' ? 'Tạo tài khoản để quản lý thông tin thành viên.' : role === 'admin' ? 'Đăng nhập bằng tài khoản quản trị viên.' : 'Đăng nhập để cập nhật hồ sơ của bạn.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <><label htmlFor="register-name">Họ và tên</label><input id="register-name" autoComplete="name" maxLength="255" placeholder="Nguyễn Văn An" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required /></>}
          <label htmlFor="auth-email">Địa chỉ email</label><input id="auth-email" type="email" autoComplete="username" placeholder="ban@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          <label htmlFor="auth-password">Mật khẩu</label><input id="auth-password" type="password" minLength={mode === 'register' ? 8 : undefined} maxLength="200" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu'} value={form.password} onChange={(e) => set('password', e.target.value)} required />
          {error && <p className="error"><TriangleAlert size={15} />{error}</p>}
          {message && <p className="notice">{message}</p>}
          <button className="primary wide" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}　→</button>
        </form>
        <div className="auth-links">{mode === 'login' && role === 'customer' && <button type="button" onClick={() => { setMode('register'); setError(''); setMessage(''); }}>Chưa có tài khoản? <b>Đăng ký</b></button>}{(mode === 'register' || role === 'admin') && <button type="button" onClick={() => { setMode('login'); setRole('customer'); setError(''); setMessage(''); }}>Quay lại đăng nhập</button>}</div>
        <p className="secure"><ShieldCheck size={15} /> Thông tin tài khoản được bảo vệ an toàn</p>
      </div><small>© 2025 Mộc Bookstore</small>
    </section>
  </main>;
}