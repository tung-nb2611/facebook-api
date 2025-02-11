const dotenv = require("dotenv");
dotenv.config();
// const fs = require("fs");
// const formidable = require("formidable");
// const { getVideoDurationInSeconds } = require("get-video-duration");
// const mongoose = require("mongoose");

const Post = require("../models/post.model.js");
const User = require("../models/user.model.js");
const ReportPost = require("../models/report.post.model.js");
const Comment = require("../models/comment.model");
const Notification = require("../models/notification.model");
// const cloud = require("../helpers/cloud.helper.js");
const formidableHelper = require("../helpers/formidable.helper");
const cloudHelper = require("../helpers/cloud.helper.js");

const statusCode = require("./../constants/statusCode.constant.js");
const statusMessage = require("./../constants/statusMessage.constant.js");
const { Mongoose } = require("mongoose");
// const { uploadImage } = require("../helpers/cloud.helper.js");
const deletePostAll = async (req, res)=>{
  var userAll = await User.find({});
  await Promise.all(userAll.map(userData=>{
    return User.findByIdAndUpdate(userData._id, {
      $set:{
        postIds: []
      }
    })
  }))
  // userAll.save();
  await Post.deleteMany({_id:{$ne: null}});
  res.status(200).json({
    message: "drop ok"
  })
}
const addPost = async (req, res) => {
  console.log(req.files)
  const { token, described, state, can_edit, status } = req.query;
  const { _id } = req.userDataPass;
  // validate input
  try {
    var newPost;
    var result = await formidableHelper.parse(req);
    if (result.type == "video") {
      var result2 = await cloudHelper.upload(result.data[0], "video");
      newPost = await new Post({
        described: described,
        state: state,
        status: status,
        video: result2,
        // thumbnail: {url: result2.url.slice(0, result2.length-3)+"png"},
        created: Date.now(),
        modified: Date.now(),
        like: 0,
        is_liked: false,
        comment: 0,
        author: _id,
      }).save();
     
    } else if (result.type == "image") {
      var result2 = await Promise.all(
        result.data.map((element) => {
          return cloudHelper.upload(element);
        })
      );
      newPost = await new Post({
        described: described,
        state: state,
        status: status,
        image: result2,
        created: Date.now(),
        modified: Date.now(),
        like: 0,
        is_liked: false,
        comment: 0,
        author: _id,
      }).save();
      
    } else {
      newPost = await new Post({
        described: described,
        state: state,
        status: status,
        created: Date.now(),
        modified: Date.now(),
        like: 0,
        is_liked: false,
        comment: 0,
        author: _id,
      }).save();
      
    }
    var userData= await User.findOneAndUpdate(
      { _id: _id },
      {
        $push: {
          postIds: newPost._id,
        },
      }
    );
    res.status(200).json({
      code: statusCode.OK,
      message: statusMessage.OK,
      data: newPost,
      // user: userData
    });
    try {
      var newNotification = await new Notification({
        type: "get post",
        object_id: newPost._id,
        title: userData.username+" đã thêm một bài viết mới",
        avatar: userData.avatar,
        group: "1",
        created: Date.now(),
        read: "0",
        userData: _id,
        postData: newPost._id
      }).save();
    } catch (error) {
      console.log(err)
    }
    
    try {
      await Promise.all(userData.friends.map(async element =>{
        return await User.findByIdAndUpdate(element, {
          $push:{
            notifications: {id: newNotification._id, read: "0"}
          }
        })
      }));
    } catch (error) {
      console.log(error)
    }
    
    
  } catch (error) {
    console.log("error")
    if (error == statusCode.FILE_SIZE_IS_TOO_BIG) {
      return res.status(200).json({
        code: statusCode.FILE_SIZE_IS_TOO_BIG,
        message: statusMessage.FILE_SIZE_IS_TOO_BIG,
        server: "file qua lon hoac qua nhieu file",
      });
    } else {
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
      });
    }
  }
};

const getPost = async (req, res) => {
  const { token, id } = req.query;
  const { _id } = req.userDataPass;
  try {
    if (!id) {
      throw Error("PARAMETER_VALUE_IS_INVALID");
    }
    var result = await Post.findOne({ _id: id }).populate({
      path: "author",
      select: "_id username avatar",
          }).populate({
            path: "like_list",
            select:"username avatar"
          }).populate({
            path: "comment_list",
            populate:{
              path: "poster",
              select: "username avatar"
            }
          });
    // console.log(result);
    if (!result || result.is_blocked) {
      // không tìm thấy bài viết hoặc vi phạm tiêu chuẩn cộng đồng
      throw Error("POST_IS_NOT_EXISTED");
    }
    var resultUser = await User.findOne({ _id: result.author._id });
    if (resultUser.blockedIds.includes(_id)) {
      return res.status(200).json({
        code: statusCode.OK,
        message: statusMessage.OK,
        data: {
          isblocked: 1,
        },
      });
    } else {
      return res.status(200).json({
        code: statusCode.OK,
        message: statusMessage.OK,
        data: result,
      });
    }
    // }
  } catch (error) {
    console.log(error.message);
    if (error.message == "POST_IS_NOT_EXISTED") {
      return res.status(200).json({
        code: statusCode.POST_IS_NOT_EXISTED,
        message: statusMessage.POST_IS_NOT_EXISTED,
      });
    } else {
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
      });
    }
  }
};

const editPost = async (req, res) => {
  const {
    id,
    described,
    status,
    state,
    image,
    image_del,
    image_sort,
    video,
    thumb,
    auto_block,
    auto_accept,
  } = req.query;
  try {
    // console.log(image_del, image_del.length, typeof image_del)
    if (
      !id ||
      (described && described.length > 500) ||
      (image_del && typeof image_del == "object" && image_del.length > 4) ||
      (image_sort && image_sort.length > 4)
    ) {
      throw Error("params");
    }
    const postData = await Post.findOne({ _id: id });
    formidableHelper
      .parse(req, postData)
      .then(async (result) => {
        var updateData = {};
        if (described) {
          postData.described = described;
        }
        if (status) {
          postData.status = status;
        }
        if (state) {
          postData.state = state;
        }
        if (status) {
          postData.status = status;
        }
        if (image_del && image_del.length > 0) {
          postData.image = postData.image.filter((element) => {
            if (image_del.includes(String(element._id))) {
              return false;
            } else {
              return true;
            }
          });
          // postData.image= data2;
          // console.log(image_del, postData.image)
        }
        if (result.type == "video") {
          cloudHelper
            .upload(result.data[0])
            .then(async (result2) => {
              updateData.video = result2;
              var editPost = await postData.save();
              return res.status(200).json({
                code: statusCode.OK,
                message: statusMessage.OK,
                data: editPost,
              });
            })
            .catch((err) => {
              throw err;
            });
        } else if (result.type == "image") {
          Promise.all(
            result.data.map((element) => {
              return cloudHelper.upload(element);
            })
          ).then(async (result2) => {
            // console.log(result2)
            postData.image =
              postData.image && postData.length == 0
                ? result2
                : postData.image.concat(result2);
            var editPost = await postData.save();
            return res.status(200).json({
              code: statusCode.OK,
              message: statusMessage.OK,
              data: editPost,
            });
          });
        } else if (result.type == "null") {
          var editPost = await postData.save();
          return res.status(200).json({
            code: statusCode.OK,
            message: statusMessage.OK,
            data: editPost,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return res.status(200).json({
          code: statusCode.FILE_SIZE_IS_TOO_BIG,
          message: statusMessage.FILE_SIZE_IS_TOO_BIG,
        });
      });
  } catch (error) {
    console.log(error);
    if (error.message == "params") {
      return res.status(200).json({
        code: statusCode.PARAMETER_VALUE_IS_INVALID,
        message: statusMessage.PARAMETER_VALUE_IS_INVALID,
      });
    } else if (error.message == "FILE_SIZE_IS_TOO_BIG") {
      return res.status(200).json({
        code: statusCode.FILE_SIZE_IS_TOO_BIG,
        message: statusMessage.FILE_SIZE_IS_TOO_BIG,
      });
    } else {
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
      });
    }
  }
};

const deletePost = async (req, res) => {
  const { id } = req.query;
  const { _id } = req.userDataPass;
  try {
    var result = await Post.findOneAndDelete({
      _id: id,
      author: _id,
    });
    if (!result) {
      console.log("Khong tim thay bai viet");
      throw Error("Post is not existed");
    }
    return res.status(200).json({
      code: statusCode.OK,
      message: statusMessage.OK,
    });
  } catch (error) {
    if (error.message == "Post is not existed") {
      return res.status(200).json({
        code: statusCode.POST_IS_NOT_EXISTED,
        message: statusMessage.POST_IS_NOT_EXISTED,
        server: "khong tim thay bai viet",
      });
    } else {
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
      });
    }
  }
};

const reportPost = async (req, res) => {
  const { id, subject, details } = req.query;
  try {
    var result = await Post.findOne({ _id: id });
    if (!result) {
      throw Error("notfound");
    } else if (result.is_blocked) {
      throw Error("blocked");
    }
    await new ReportPost({
      id: id,
      subject: subject,
      details: details,
    }).save();
    return res.status(200).json({
      code: statusCode.OK,
      message: statusMessage.OK,
    });
  } catch (error) {
    if (error.message == "notfound") {
      return res.status(200).json({
        code: statusCode.POST_IS_NOT_EXISTED,
        message: statusMessage.POST_IS_NOT_EXISTED,
        server: "khong tim thay bai viet",
      });
    } else if (error.message == "blocked") {
      return res.status(200).json({
        code: statusCode.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
        message: statusMessage.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
        server: "biet viet da bi block",
      });
    } else {
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
        server: "loi khong xac dinh",
      });
    }
  }
};

const like = async (req, res) => {
  const { id} = req.query;
  const { _id } = req.userDataPass._id;
  if(id){
    try {
      // tim post theo id
      var result = await Post.findOne({ _id: id });
      // neu khong co thi bao loi
      if (!result) {
        throw Error("notfound");
      }
      // kiem tra post có bị block không
      if (result.is_blocked) {
        throw Error("isblocked");
      }
      // nếu user đã like
      if (result.like_list.includes(String(_id))) {
        // xoá user id khỏi danh sách đã like của post
        var isLiked = false;
        await Post.findByIdAndUpdate(id, {
          $pull: {
            like_list: _id,
          },
          $set: {
            like: result.like - 1,
            // is_liked: isLiked
          },
        });
        res.status(200).json({
          code: statusCode.OK,
          message: statusMessage.OK,
          data: {
            like: result.like - 1,
            is_liked: isLiked
          },
        });
        
        
      } else {
        // nếu user chưa like thì thêm user id vào danh sách post
        var isLiked = true;
        await Post.findByIdAndUpdate(id, {
          $push: {
            like_list: _id,
          },
          $set: {
            like: result.like + 1,
            is_liked: false
          },
        });
        res.status(200).json({
          code: statusCode.OK,
          message: statusMessage.OK,
          data: {
            like: result.like + 1,
            is_liked: isLiked
          },
        });
        try {
          if(result.author==_id){
            throw Error("khong can thong bao cho mk");
          }
          var newNotification = await new Notification({
            type: "get post",
            object_id: id,
            title: req.userDataPass.username+" đã like bài viết cuả bạn",
            avatar: req.userDataPass.avatar,
            group: "1",
            created: Date.now(),
            // read: "0",
          }).save();
          await User.findByIdAndUpdate(result.author,{
            $push:{
              notifications: {
                id: newNotification._id,
                read: "0"
              }
            }
          })
        } catch (error) {
          console.log(error)
        }
      }
    } catch (error) {
      console.log(error.message);
      if (error.message == "isblocked") {
        return res.status(200).json({
          code: statusCode.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
          message: statusMessage.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
        });
      } else if (error.message == "notfound") {
        return res.status(200).json({
          code: statusCode.POST_IS_NOT_EXISTED,
          message: statusMessage.POST_IS_NOT_EXISTED,
        });
      } else {
        return res.status(200).json({
          code: statusCode.UNKNOWN_ERROR,
          message: statusMessage.UNKNOWN_ERROR,
          server: "loi khong xac dinh",
        });
      }
    }
  }else{
    return res.status(200).json({
      code: statusCode.PARAMETER_IS_NOT_ENOUGHT,
      message: statusMessage.PARAMETER_IS_NOT_ENOUGHT,
    });
  }
  
};

const getComment = async (req, res) => {
  var { id, count, index } = req.query;
  const { _id } = req.userDataPass;
  try {
    // kiểm tra input có null không
    if (!id) {
      throw Error("params");
    }
    index = index ? index : 0;
    count = count ? count : 20;
    // tìm post theo id
    var postData = await Post.findOne({ _id: id }).populate({
      path: "comment_list",
      populate: {
        path: "poster",
        select: "_id username avatar",
      },
    });
    if (!postData) {
      // neu bai viet khong ton tai
      console.log("not found");
      throw Error("notfound");
    } else if (postData.is_blocked) {
      // bai viet bi khoa
      throw Error("blocked");
    } else {
      // neu khong co loi gi
      // kiem tra author bai viet cos block user khong
      var authorData = await User.findOne({ _id: postData.author });
      if (authorData.blockedIds.includes(String(_id))) {
        throw Error("authorblock");
      }
      // kiểm tra user có block author bai viet không
      var userData = await User.findOne({ _id: _id });
      if (userData.blockedIds.includes(String(postData.author))) {
        throw Error("userblock");
      }
      // nếu all ok
      var result3 = await Promise.all(
        postData.comment_list.map(async (element) => {
          const authorDataComment = await User.findOne({
            _id: element.poster,
          }).select("blockedIds");
          if (
            (authorDataComment.blockedIds &&
              authorDataComment.blockedIds.includes(String(_id))) ||
            userData.blockedIds.includes(String(element.poster._id))
          ) {
            return null;
          } else {
            return Promise.resolve(element);
          }
        })
      );
      return res.status(200).json({
        code: statusCode.OK,
        message: statusMessage.OK,
        data: result3.slice(Number(index),Number(index)+Number(count) ),
      });
    }
  } catch (err) {
    console.log(err);
    if (err.message == "params") {
      // console.log("loi tham so");
      return res.status(200).json({
        code: statusCode.PARAMETER_VALUE_IS_INVALID,
        message: statusMessage.PARAMETER_VALUE_IS_INVALID,
        server: "loi tham so"
      });
    } else if (err.message == "notfound") {
      console.log("notfound");
      return res.status(200).json({
        code: statusCode.POST_IS_NOT_EXISTED,
        message: statusMessage.POST_IS_NOT_EXISTED,
        server: "bai viet khong ton tai"
      });
    } else if (err.message == "blocked") {
      console.log("post is blocked");
      return res.status(200).json({
        code: statusCode.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
        message: statusMessage.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
        server: "bai viet bi khoa"
      });
    } else if (err.message == "authorblock") {
      console.log("authorblock");
      return res.status(200).json({
        code: statusCode.NOT_ACCESS,
        message: statusMessage.NOT_ACCESS,
        server: "ban bi chu bai viet block"
      });
    } else if (err.message == "userblock") {
      console.log("userblock");
      return res.status(200).json({
        code: statusCode.NOT_ACCESS,
        message: statusMessage.NOT_ACCESS,
        server: "ban block chu bai viet"
      });
    } else {
      console.log("unknown error");
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
        server: "loi khong xac dinh"
      });
    }
  }

  // res.status(200)
};

const setComment = async (req, res) => {
  var { id, comment, index, count } = req.query;
  const { _id } = req.userDataPass;

  // check params
  try {
    // if (!comment || !id ) {
    //   throw Error("params");
    // }
    index = index ? index : 0;
    count = count ? count : 20;
    // tim bai viet
    var result = await Post.findOne({ _id: id });
    // neu khong tim thay bai viet
    if (!result) {
      throw Error("notfound");
    }
    // neu bai viet bi block
    if (result.is_blocked) {
      throw Error("action");
    }
    // tim author
    var authorData = await User.findOne({ _id: result.author });
    if (authorData.blockedIds.includes(String(_id))) {
      // neu author block user
      throw Error("blocked");
    }
    // tim user co block author k
    // tim user
    var userData = await User.findOne({ _id: _id });
    if (userData.blockedIds.includes(String(result.author))) {
      // neu user block author
      throw Error("notaccess");
    }
    var newcomment = new Comment({
      // _id: mongoose.Schema.Types.ObjectId,
      poster: _id,
      comment: comment,
      created: Date.now(),
    });
    result.comment_list.push(newcomment._id);
    result.comment++;
    await result.save();
    await newcomment.save();
    console.log(newcomment);
    var result2 = await Post.findOne({ _id: id }).populate({
      path: "comment_list",
      // skip: index||1,
      options: { sort: { created: -1 } },

      populate: {
        path: "poster",
        select: "_id avatar username",
      },
    });

    res.status(200).json({
      code: statusCode.OK,
      message: statusMessage.OK,
      data: result2.comment_list.slice(Number(index),Number(index)+Number(count) ),
    });

    try {
      if(result.author==_id){
        throw Error("khong can thong bao cho minh")
      }
      var newNotification = await new Notification({
        type: "get post",
        object_id: id,
        title: userData.username+" đã comment bài viết cuả bạn",
        avatar: userData.avatar,
        group: "1",
        created: Date.now(),
        // read: "0",
      }).save();
      await User.findByIdAndUpdate(result.author,{
        $push:{
          notifications: {
            id: newNotification._id,
            read: "0"
          }
        }
      })
    } catch (error) {
      console.log(error)
    }

  } catch (error) {
    console.log(error);
    if (error.message == "params") {
      return res.status(200).json({
        code: statusCode.PARAMETER_VALUE_IS_INVALID,
        message: statusMessage.PARAMETER_VALUE_IS_INVALID,
      });
    } else if (error.message == "notfound") {
      return res.status(200).json({
        code: statusCode.POST_IS_NOT_EXISTED,
        message: statusMessage.POST_IS_NOT_EXISTED,
      });
    } else if (error.message == "action") {
      return res.status(200).json({
        code: statusCode.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
        message: statusMessage.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
      });
    } else if (error.message == "blocked") {
      return res.status(200).json({
        code: statusCode.NOT_ACCESS,
        message: statusMessage.NOT_ACCESS,
      });
    } else {
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
      });
    }
  }
};

module.exports = {
  addPost,
  getPost,
  editPost,
  deletePost,
  reportPost,
  like,
  getComment,
  setComment,
  deletePostAll
};
