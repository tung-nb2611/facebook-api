***
# Tuần 1:   
* signup done
* login done
* logout done
* get_verify_code ?
***
# Tuần 2:
* check_verify_code ?
* change_info_after_signup done
* add_post done
***
# Tuần 3:
* get_post done
* edit_post done ? thumb + index
***
# Tuần 4:
* delete_post done
* report_post done
* like done
* get_comment done
* set_comment ? chưa xử lí bỏ qua các comment mà author comment và sender block nhau
***
# Tuần 5
* get_list_posts 
* check_new_item
***
# Tuần 6:
* search done ? chưa xử lý tìm kiếm không dấu a=á=ă=â=ả=ã=à;
* get_saved_search done
* del_saved_search done
***
# Tuần 7:
* get_requested_friends done
* get_user_friends done
* get_list_videos done
***
# Tuần 8:
* set_accept_friend done
* get_list_suggested_friends done
* set_request_friend done
* get_list_blocks done
***
# Tuần 9:
* change_password ** mạnh làm
* get_push_settings done
* set_push_settings done
* set_block done  
* check_new_version ???????? đợi làm notification và message
***
# Tuần 10
* get_notification ????? 
* set_read_notification ?????
* set_devtoken
* get_user_info done
* set_user_info done ? cho thay đổi link nhưng chưa check 
***
# Tuần 11
* get_list_conversation done ? chưa test
* get_conversation done *** chưa test, chưa check params
* set_read_message done ? chưa test
* delete_message ? chưa test
* delete_conversation ? chưa test
# Api bonus
* set_conversation done params: user_id   tạo coversation giữa 2 người input: partner_id
* unfriend params: user_id
* not_suggest params: user_id cho vào danh sách không gợi ý

# Api socket
## Emit- gửi lên server
* joinchat data: {_id: "_id cua nguoi dung"}
* send: gửi tin nhắn  
    sender: "_id của người gửi"  
    receiver: "id của người nhận  
    message: "tin nhắn muốn gửi"  
    conversation_id: "_id của phòng chat"
* deletemessage: xoá tin nhắn  
    sender: "_id của người gửi"  
    receiver: "id của người nhận"  
    message_id: "_id của tin nhắn muốn xoá"  
    conversation_id: "_id của phòng chat"
## On- nhận từ server
* joinedchat data: {_id: "_id của phòng đã tham gia- id của người emit"}
* onmessage: nhận tin nhắn từ server  
    sender: "_id của người gửi"  
    receiver: "id của người nhận"  
    message: "nội dung nhận được"  
    conversation_id: "_id của phòng chat"