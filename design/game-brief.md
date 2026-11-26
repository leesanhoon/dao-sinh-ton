# Game Brief: Đảo Sinh Tồn

## In your words
Làm cho tôi game chơi góc nhìn thứ nhất giống pubg

**Pitch:** Nhảy dù xuống một hòn đảo cùng 24 đối thủ máy, nhặt súng trong nhà hoang, chạy trước vòng bo đang thu hẹp và là người cuối cùng còn đứng. *(provisional)*

**Genre:** bắn súng góc nhìn thứ nhất sinh tồn (FPS battle royale) với đối thủ máy *(provisional)*

**Controls:** Chuột: nhìn quanh; chuột trái: bắn; chuột phải: ngắm; WASD: đi; Shift: chạy; Space: nhảy (nhảy khỏi máy bay); C: ngồi; R: nạp đạn; E: nhặt đồ; 1/2: đổi súng; Q: dùng băng cứu thương; M: bản đồ lớn; P: dừng. Điện thoại cầm ngang: cần đi bên trái, kéo bên phải để nhìn, nút bắn/ngắm/nhảy/nạp/nhặt. *(provisional)*

**Question:** Một game bắn súng góc nhìn thứ nhất sinh tồn (battle royale) chơi trên web có vui không?

**Hooks:** Một trận ngắn 6–10 phút: nhảy dù chọn chỗ đáp, nhặt đồ hồi hộp, vòng bo ép đánh nhau, đối thủ máy cũng nhặt súng và bắn nhau với nhau. *(provisional)*

**Intent:** a run that ends — provisional: chết là hết trận, xếp hạng #N/25, chơi trận mới.

## Look and references
- Look: 3D low-poly màu tươi kiểu đảo nhiệt đới Việt Nam: đồi cỏ, bãi cát, biển xanh, cây dừa và cây thông khối, nhà mái ngói đỏ, kho container, tháp nước; ánh nắng chiều, sương xa. Súng và nhân vật dựng bằng khối hình học, không emoji, không mô hình tải về. *(provisional)*
- References: ý tưởng thể loại PUBG (nhảy dù, nhặt đồ, vòng bo, người cuối cùng thắng) — không chép bản đồ, tên, súng thương hiệu, giao diện hay câu chữ của PUBG. *(you said)*
- View: 3D · Camera: góc nhìn thứ nhất (first-person), có tay và súng trước mặt. *(you said)*

## First minute
Máy bay bay ngang đảo, bản đồ chỉ đường bay. Bấm Space nhảy ra, rơi tự do rồi bung dù, lái hướng tới làng gần nhất. Chạm đất tay không, chạy vào nhà, thấy súng lục và đạn trên sàn, bấm E nhặt. Nghe tiếng súng phía xa: hai bot đang đánh nhau. Vòng bo đầu tiên hiện trên bản đồ nhỏ.

## Challenge
Bot nhặt súng, đi tìm người, bắn có sai số và phản ứng trễ; bot gần và có súng tốt thì nguy hiểm. Vòng bo thu nhỏ 6 lần, ngoài bo bị mất máu ngày càng nhanh. Càng về cuối càng ít chỗ nấp, bot còn lại là bot đã nhặt đồ tốt.

## Core loop
- Đáp xuống → nhặt súng, đạn, giáp, băng cứu thương
- Chạy vào bo → gặp đối thủ → bắn hoặc né
- Hạ đối thủ → nhặt đồ của họ → tiếp tục tới bo mới

## Goal & fail state
- Thắng: người cuối cùng còn sống (TOP 1). Thua: hết máu → hiện hạng và số mạng hạ, chơi trận mới.

## Features
- [ ] Máy bay, nhảy dù chọn chỗ đáp
- [ ] Đảo 3D có địa hình, biển, cây, làng, nhà vào được, kho container
- [ ] 4 loại súng: súng lục, súng trường, súng săn (shotgun), súng bắn tỉa có ống ngắm; giật, nạp đạn, ngắm
- [ ] Nhặt đồ: súng, đạn, giáp, băng cứu thương
- [ ] 24 đối thủ máy: nhặt súng, đi vào bo, bắn người chơi và bắn nhau
- [ ] Vòng bo thu hẹp, mất máu ngoài bo
- [ ] HUD: máu, giáp, đạn, la bàn, bản đồ nhỏ, số người còn sống, bảng hạ gục
- [ ] Phím cảm ứng cho điện thoại

## Your systems
- vòng bo · in the slice *(guessed)*
- đối thủ máy · in the slice *(guessed)*

## Keep
-

## Avoid
- Không chép PUBG: không tên, bản đồ, súng thương hiệu, giao diện, câu "Winner winner chicken dinner" *(you said)*
- Không máu me (trúng đạn chỉ có tia lửa và số sát thương) *(guessed)*

## Out of scope
- Chơi online nhiều người thật, xe cộ, bơi lặn, lưu tiến trình, skin

## Build order
1. Nhảy dù + nhặt đồ + 4 súng + 24 bot + vòng bo; thua khi chết, thắng khi còn một mình.

---
**Kill condition:** nếu bắn bot vẫn không thấy đã tay sau hai lần chỉnh. *(guessed)*

**Who it's for / what they feel:** người thích PUBG, muốn đánh một trận nhanh 10 phút trên trình duyệt, không cần cài. *(guessed)*

**Games you love / don't:** PUBG (lối chơi) *(you said)*
