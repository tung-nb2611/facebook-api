/set_read_message
    1. Người dùng truyền đúng mã phiên đăng nhập và các tham số khác
    Kết quả mong đợi: 1000 | OK (Thông báo thành công), gửi cho ứng dụng các
    thông tin cần thiết.

    2. Người dùng gửi sai mã phiên đăng nhập (mã bị trống hoặc quá ngắn hoặc mã
    phiên đăng nhập cũ).
    Kết quả mong đợi: ứng dụng sẽ phải đẩy người dùng sang trang đăng nhập.
    Xem lại test case 3 của change_info_after_signup
    // middle
    3. Người dùng truyền đúng mã phiên đăng nhập nhưng hệ thống không thể thiết
    lập việc xử lý yêu cầu (do lỗi truy cập CSDL chẳng hạn)
    Kết quả mong đợi: thông báo cho người dùng, chẳng hạn như “Không thể kết
    nối Internet”
    message: unknown
    4. Người dùng truyền đúng mã phiên đăng nhập. Nhưng người dùng đã bị khóa
    tài khoản (do hệ thống khóa đi).
    Kết quả mong đợi: ứng dụng sẽ phải đẩy người dùng sang trang đăng nhập.
    Xem lại test case 3 của change_info_after_signup
    // middle
    5. Người dùng truyền đúng mã phiên đăng nhập, và partner_id nhưng hệ thống
    không thấy id của đối tác.
    Kết quả mong đợi: Hệ thống báo lỗi cho ứng dụng. Ứng dụng vẫn hiện
    conversation nhưng hiểu rằng đối tác đã bị khóa hoặc xóa tài khoản. Nên
    người dùng không gửi tiếp tin nhắn được (giao diện khóa phần nhập)
    // FE xu li 
    6. Người dùng truyền đúng mã phiên đăng nhập, và conversation_id nhưng hệ
    thống không thấy conversation_id.
    Kết quả mong đợi: hệ thống báo lỗi cho client, client vẫn cho phép hội thoại
    nhưng lần sau gửi partner_id.
    // message: post is not existed
    7. Người dùng truyền đúng mã phiên đăng nhập, và các tham số khác nhưng hệ
    thống phát hiện ra rằng một trong hai phía đã block người kia.
    Kết quả mong đợi: Ứng dụng vẫn hiện ra cho 2 người rằng vẫn được phép
    nhắn tin nhưng server không gửi tin nhắn cho cho client. Nếu người dùng gọi
    API get_conversation thì sẽ nhận được trường is_blocked (nếu bị chặn) hoặc
    gặp lỗi 9994 (nếu là người chủ động chặn).
    code: 9994
    message: no data