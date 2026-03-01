<h1 align="center">🦅 Talon</h1>

<p align="center">
  <strong>Trợ lý Windows cá nhân, điều khiển từ xa qua Telegram.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-ES%20Modules-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/AI-Groq%20(LLaMA%203.1)-f55036" alt="Groq AI">
  <img src="https://img.shields.io/badge/Nền_tảng-Windows-0078D6?logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/Giấy_phép-MIT-blue.svg" alt="License">
</p>

---

Talon là một agent tự trị chạy trực tiếp trên máy tính Windows của bạn. Nó hoạt động như một hệ thống hoạch định (planner) thông minh, diễn dịch ngôn ngữ tự nhiên qua Telegram để quyết định cách tương tác với màn hình desktop. Talon có khả năng mở ứng dụng, điều khiển chuột/bàn phím trực tiếp, quản lý tập tin và nghiên cứu web mà không cần phụ thuộc vào các công cụ build C++ nặng nề.

*Dành cho một người dùng. Hoạt động trên một máy tính. Toàn quyền kiểm soát từ điện thoại của bạn.*

> **🌐 [Read documentation in English (Đọc tài liệu bằng Tiếng Anh)](README.md)**

## 📋 Mục lục

- [Kiến trúc & Luồng hoạt động](#kiến-trúc--luồng-hoạt-động)
- [Các tính năng cốt lõi](#các-tính-năng-cốt-lõi)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Bắt đầu](#bắt-đầu)
- [Các biến cấu hình](#các-biến-cấu-hình)
- [Giấy phép](#giấy-phép)

---

## 🏗 Kiến trúc & Luồng hoạt động

Talon được thiết kế xoay quanh một vòng lặp hành động đa bước (multi-step action loop). AI không chỉ trả lời câu hỏi; nó chủ động sử dụng công cụ, quan sát kết quả và quyết định bước tiếp theo.

    Người dùng (Telegram) ──▶ Lớp Bot ──▶ AI Planner (Groq) ──▶ Action Engine ──▶ Windows OS
                                                ▲                                      │
                                                │ (Ngữ cảnh: 30 tin nhắn)              │
                                                └─────── [ Phản hồi Kết quả ] ─────────┘
                                                Tối đa 6 vòng lặp cho mỗi yêu cầu

**Nguyên tắc thiết kế:**
1. **Trả về dữ liệu thô:** Các hành động (action) thực thi và chỉ trả về dữ liệu thô. AI sẽ tổng hợp dữ liệu này thành một câu trả lời tiếng Việt tự nhiên.
2. **Không phụ thuộc Native (Zero Native Dependencies):** Điều khiển chuột/bàn phím chạy hoàn toàn bằng PowerShell + Win32 API thông qua .NET interop. Không yêu cầu `node-gyp` hay trình biên dịch C++.
3. **Khả năng mở rộng dạng Module:** Mỗi action là một module độc lập được tự động tải bởi hệ thống registry.

## ✨ Các tính năng cốt lõi

### Lên kế hoạch & Thực thi bằng AI
* **Suy luận đa bước:** Xử lý được các chuỗi phức tạp (ví dụ: *Tìm kiếm chủ đề → Đọc URL cụ thể → Trích xuất dữ liệu → Trả lời*).
* **Ghi nhớ ngữ cảnh:** Duy trì lịch sử trò chuyện gồm 30 tin nhắn gần nhất.

### Tự động hóa & Điều khiển Desktop
* **Hệ thống Lưới (Grid):** Màn hình được chia thành lưới 16x18 (Từ A1 đến P18). Cho phép click chuột chính xác, chụp ảnh một vùng, và OCR theo khu vực cụ thể.
* **Chế độ điều khiển trực tiếp:** Bàn phím ảo nội tuyến (inline) trên Telegram để điều hướng D-Pad, click chuột và cuộn trang thủ công.
* **Hiển thị trực quan:** Tự động chèn hồng tâm màu đỏ vào ảnh chụp màn hình để báo hiệu vị trí chuột hiện tại.
* **Giả lập Bàn phím:** Gửi các phím bấm thông qua `SendKeys`.

### Tìm kiếm & Kết nối mạng
* **Vượt rào Anti-Bot:** Tích hợp `Jina.ai Reader` để vượt qua Cloudflare khi thu thập dữ liệu từ Medium, mô tả YouTube và các trang tin tức.
* **Tìm kiếm dự phòng (Fallback):** Định tuyến 3 lớp (`SearchAPI.io` → `SerpAPI` → `DuckDuckGo`).
* **Bộ nhớ đệm hình ảnh (Caching):** Lưu đệm các kết quả tìm kiếm đa phương tiện. Khi người dùng yêu cầu "ảnh khác", bot lập tức gửi ảnh tiếp theo mà không cần fetch lại từ đầu.

### Quản lý Hệ thống & Tập tin
* **Khởi chạy ứng dụng thông minh:** Thực thi qua bí danh (ví dụ: "Mở Discord") kết hợp phương án dự phòng dùng `Get-StartApps` của PowerShell.
* **Tự động cài đặt (Auto-Provisioning):** Phát hiện các gói thư viện Python/Node còn thiếu và tự động cài đặt qua `pip` hoặc `npm`.
* **I/O An toàn:** Giới hạn việc tải xuống, di chuyển và liệt kê tập tin nghiêm ngặt trong các thư mục Desktop, Documents và Downloads của người dùng.

## 🛠 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Môi trường chạy** | Node.js (ES Modules) |
| **Bộ não AI** | Groq SDK (LLaMA 3.1 8B) |
| **Giao diện** | Telegram Bot API |
| **Điều khiển I/O** | PowerShell + Win32 API |
| **Thị giác / OCR** | `screenshot-desktop`, `sharp`, `Tesseract.js` |
| **Dữ liệu Web** | SearchAPI.io, SerpAPI, DuckDuckGo, Jina.ai |

## 📁 Cấu trúc dự án

    talon/
    ├── data/                     # Dữ liệu xuất ra khi chạy (ảnh chụp, log)
    │   └── _mouse.ps1            # Kịch bản PowerShell tự tạo để điều khiển I/O
    ├── src/
    │   ├── actions/              # Các kịch bản action dạng module
    │   │   ├── registry.js       # Tự động nhận diện & phân phối action
    │   │   ├── webSearch.js      # Tìm kiếm DuckDuckGo / SearchAPI.io
    │   │   ├── serpSearch.js     # Tìm kiếm SerpAPI (ảnh/tin tức/video)
    │   │   ├── fetchUrl.js       # Đọc URL qua Jina.ai (bypass Cloudflare)
    │   │   ├── runCommand.js     # Thực thi lệnh shell (có kiểm soát)
    │   │   ├── openApp.js        # Mở app qua bí danh & StartApps
    │   │   ├── openBrowser.js    # Mở URL bằng trình duyệt mặc định
    │   │   ├── screenshot.js     # Chụp toàn màn hình + vẽ lưới
    │   │   ├── gridClick.js      # Click chuột tại tọa độ lưới
    │   │   ├── gridScreenshot.js # Chụp cắt vùng theo lưới
    │   │   ├── gridOcr.js        # OCR đọc chữ trên vùng lưới
    │   │   ├── typeText.js       # Nhập văn bản qua SendKeys
    │   │   ├── controlModeOn.js  # Bật chế độ điều khiển thủ công
    │   │   ├── controlModeOff.js # Tắt chế độ điều khiển thủ công
    │   │   ├── getFileList.js    # Xem danh sách file (thư mục an toàn)
    │   │   ├── downloadFile.js   # Tải file HTTP về (thư mục an toàn)
    │   │   ├── moveFile.js       # Di chuyển file (thư mục an toàn)
    │   │   ├── detectEnv.js      # Nhận diện phiên bản node/python
    │   │   └── installPackage.js # Tự động phát hiện và cài pip/npm
    │   ├── grid/                 # Tính toán lưới, parse (A1:C3), tạo ảnh SVG
    │   ├── planner/              # Groq client, prompt AI, logic vòng lặp
    │   ├── telegram/             # Lắng nghe bot, UI chế độ điều khiển
    │   ├── utils/                # Các wrapper PowerShell (mouse.js)
    │   ├── config.js             # Xác thực biến môi trường
    │   └── index.js              # Điểm khởi chạy chính
    ├── .env.example
    ├── package.json
    └── README_vi.md

## 🚀 Bắt đầu

### Điều kiện tiên quyết
* Windows 10/11
* Node.js v18+
* Bot Token Telegram từ [@BotFather](https://t.me/BotFather)

### Cài đặt

1. **Clone repository:**
   `git clone https://github.com/Konmeo22122/Talon.git`
   `cd talon`

2. **Cài đặt thư viện:**
   `npm install`

3. **Thiết lập Môi trường:**
   `cp .env.example .env`
   
   Điền các khóa (key) cần thiết vào file `.env` của bạn (xem mục Cấu hình bên dưới).

4. **Khởi động Talon:**
   `npm start`

## ⚙ Các biến cấu hình

Chỉnh sửa file `.env` của bạn trước khi khởi động ứng dụng:

| Biến số | Trạng thái | Mô tả |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Bắt buộc** | Lấy từ BotFather. |
| `TELEGRAM_OWNER_ID` | **Bắt buộc** | ID Người dùng Telegram cá nhân của bạn. Chỉ ID này mới có thể ra lệnh. |
| `GROQ_API_KEY` | **Bắt buộc** | Mã xác thực cho bộ não AI LLaMA. |
| `SEARCHAPI_KEY` | Tùy chọn | Dùng để tăng cường khả năng tìm kiếm Google. |
| `SERPAPI_API_KEY` | Tùy chọn | Dùng cho tìm kiếm hình ảnh, tin tức và video. |

## 📄 Giấy phép

Dự án này được cấp phép theo Giấy phép MIT.
