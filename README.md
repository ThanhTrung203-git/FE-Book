# FE-Book · Trang quản trị

React + Vite frontend cho API trong ../BE-Book.

Chạy backend tại http://localhost:3000, đặt CORS_ORIGIN=http://localhost:5173. Trong FE-Book chạy npm install, Copy-Item .env.example .env, npm run dev. Có thể đổi VITE_API_URL trong .env.

Giao diện đăng nhập admin, kiểm tra phiên, liệt kê/tìm/lọc/phân trang sách và thêm, sửa, xoá sách. Danh mục được đọc từ backend.

## Giao diện sáng/tối và ngôn ngữ

Cụm điều khiển cố định ở góc dưới bên phải có nút mặt trăng/mặt trời và hai lựa chọn VI / EN.
Hiển thị ở mọi trang, gồm đăng nhập/đăng ký, cửa hàng, tài khoản, quản trị và các form/portal.

- Lần đầu dùng màu theo hệ thống; bấm nút để chọn sáng/tối.
- Lựa chọn giao diện lưu trong localStorage với khóa book-theme; ngôn ngữ vẫn dùng book-language.
- Giữ lựa chọn sau tải lại/chuyển trang và đồng bộ giữa các tab.
- Nếu trình duyệt chặn lưu trữ, đổi giao diện/ngôn ngữ vẫn hoạt động trong phiên hiện tại.
- Ảnh bìa và ảnh thật không bị đảo màu; màu trạng thái xanh/đỏ vẫn phân biệt.
- Áp dụng giao diện đã lưu từ head trước khi React tải để giảm chớp nền sáng.

Bảng màu darkPalette.css được tạo từ stylesheet nguồn bằng npm run theme:generate.
Chỉnh quy tắc màu tại scripts/theme-colors.mjs hoặc stylesheet gốc rồi tạo lại.
Lệnh npm run dev và npm run build tự tạo bảng màu trước khi chạy.
theme.css chứa cụm điều khiển và các chi tiết bổ sung theo giao diện.

Kiểm thử:
- node --test tests/theme-preferences.test.js tests/theme-colors.test.js
- npm run build
- scripts/check-theme-browser.mjs: kiểm tra Edge headless, dùng frontend thử cổng 5175 và API giả lập hoàn toàn; BROWSER_PATH có thể đổi đường dẫn trình duyệt. Profile và ảnh thử lưu trong thư mục tạm hệ thống.
