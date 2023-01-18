const dotenv = require("dotenv");
dotenv.config();
const md5 = require("md5");

const User = require("../models/user.model.js");

const jwtHelper = require("../helpers/jwt.helper.js");

const statusCode = require("./../constants/statusCode.constant.js");
const statusMessage = require("./../constants/statusMessage.constant.js");
const commonConstant = require("../constants/common.constant.js");

// const tokenList = {};

const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || commonConstant.ACCESS_TOKEN_LIFE;
const accessTokenSecret =
  process.env.ACCESS_TOKEN_SECRET || "accessTokenSecret";

// const refreshTokenLife = process.env.REFRESH_TOKEN_LIFE || "3650d";
// const refreshTokenSecret =
//   process.env.REFRESH_TOKEN_SECRET || "refreshTokenSecret";
function validationPhonenumber(phonenumber) {
  if (
    !phonenumber ||
    phonenumber.length != 10 ||
    phonenumber[0] != "0" ||
    phonenumber.match(/[^0-9]/g)
  ) {
    return 1;
  }
  else {
    return 0;
  }
}
function validationPasword(password, phonenumber) {
  if (
    !password ||
    password.length < 6 ||
    password.length > 10 ||
    password === phonenumber ||
    password.match(/[^a-z|A-Z|0-9]/g)
  ) {
    return 1;
  }
  else {
    return 0;
  }
}


const signup = async (req, res) => {
  // const { phonenumber, password, uuid } = req.body;
  const { phonenumber, password, uuid, username } = req.query;
  // phonenumber không tồn tại, độ dài khác 10, không có số không đầu tiên,
  // chứa kí tự không phải số
  try {
    if (validationPhonenumber(phonenumber) ||
      validationPasword(password, phonenumber) ||
      !uuid
    ) {
      throw Error("PARAMETER_VALUE_IS_INVALID");
    } else {
      const userData = await User.findOne({ phonenumber: phonenumber });
      if (!userData) {
        //chưa có phonenumber đã được đăng kí
        const hashedPassword = md5(password);
        
        const user = new User({
          phonenumber: phonenumber,
          password: hashedPassword,
          username: username,
          active: -1, 
        });
        const accessToken = await jwtHelper.generateToken(
          {_id: user._id, phonenumber: user.phonenumber},
          accessTokenSecret,
          accessTokenLife
        );
        user.token = accessToken;
        await user.save();
        return res.status(200).json({
          code: statusCode.OK,
          message: statusMessage.OK,
          data: {
            id: user._id,
            token: accessToken,
          }
        });
      } else {
        // phonenumber đã được đăng kí từ trước
        return res.status(200).json({
          code: statusCode.USER_EXISTED,
          message: statusMessage.USER_EXISTED,
        });
      }
    }
  } catch (error) {
    if (error.message == "PARAMETER_VALUE_IS_INVALID") {
      console.log(error)
      return res.status(200).json({
        code: statusCode.PARAMETER_VALUE_IS_INVALID,
        message: statusMessage.PARAMETER_VALUE_IS_INVALID,
      });
    } else {
      console.log(error)
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
      });
    }
  }

};
//doing here
const login = async (req, res) => {
  const { phonenumber, password } = req.query;// gửi bằng query params

  try {
    if (validationPhonenumber(phonenumber) || validationPasword(password)) {
      throw Error("PARAMETER_VALUE_IS_INVALID");
    } else {// nhập đúng định dạng phonenumber và password
      // tìm dữ liệu user qua phonenumber
      const userData = await User.findOne({ phonenumber: phonenumber });
      if (userData) {
        // tìm được user có trong hệ thống
        const hashedPassword = md5(password);// mã hoá password
        if (hashedPassword == userData.password) {
          // kiểm tra password
          // tạo token
          const accessToken = await jwtHelper.generateToken(
            {_id: userData._id, phonenumber: userData.phonenumber},
            accessTokenSecret,
            accessTokenLife
          );
          // const refreshToken = await jwtHelper.generateToken(
          //   userData,
          //   refreshTokenSecret,
          //   refreshTokenLife
          // );
          // lưu token tương ứng vs user, nếu đã tốn tại token thì thay thế token
          await User.findOneAndUpdate(
            { _id: userData._id },
            {
              $set: {
                token: accessToken,
              },
            });
          return res.status(200).json({
            code: statusCode.OK,
            message: statusMessage.OK,
            data: {
              id: userData._id,
              username: userData.username,
              token: accessToken,
              // refreshToken: refreshToken, // chưa cần dùng
              avatar: userData.avatar,
            },
          });
        } else {
          // password không hợp lệ
          console.log("password không hợp lệ")
          return res.status(200).json({
            code: statusCode.USER_IS_NOT_VALIDATED,
            message: statusMessage.USER_IS_NOT_VALIDATED,
            server: "password không hợp lệ"
          });
        }
      } else {
        // phonenumber chưa được đăng kí
        console.log("phonenumber chưa được đăng kí")
        res.status(200).json({
          code: statusCode.USER_IS_NOT_VALIDATED,
          message: statusMessage.USER_IS_NOT_VALIDATED,
          server: "phonenumber chưa được đăng kí"
        });
      }
    }
  } catch (error) {
    console.log(error)
    if (error.message == "PARAMETER_VALUE_IS_INVALID") {
      return res.status(200).json({
        code: statusCode.PARAMETER_VALUE_IS_INVALID,
        message: statusMessage.PARAMETER_VALUE_IS_INVALID,
      });
    } else {
      return res.status(200).json({
        code: statusCode.UNKNOWN_ERROR,
        message: statusMessage.UNKNOWN_ERROR,
      });
    }
  }
};


const getVerifyCode = async (req, res) => {
  const { phonenumber } = req.body;
  if (
    !phonenumber ||
    phonenumber.length != 10 ||
    phonenumber[0] != "0" ||
    phonenumber.match(/[^0-9]/g)
  ) {
    return res.status(200).json({
      code: statusCode.PARAMETER_VALUE_IS_INVALID,
      message: statusMessage.PARAMETER_VALUE_IS_INVALID,
    });
  } else {
    //neu duoi 120s khi da gui request nay thi bao loi 1010 1009

    return res.status(200).json({
      code: statusCode.OK,
      message: statusMessage.OK,
    });
  }
};

const checkVerifyCode = async (req, res) => {
  const { phonenumber, code_verify } = req.body;
  if (
    !phonenumber ||
    phonenumber.length != 10 ||
    phonenumber[0] != "0" ||
    phonenumber.match(/[^0-9]/g)
  ) {
    return res.status(200).json({
      code: statusCode.PARAMETER_VALUE_IS_INVALID,
      message: statusMessage.PARAMETER_VALUE_IS_INVALID,
    });
  } else {
    //neu duoi 120s khi da gui request nay thi bao loi 1010 1009

    return res.status(200).json({
      code: statusCode.OK,
      message: statusMessage.OK,
      data: {
        token: "token",
        id: "id",
      },
    });
  }
};



module.exports = {
  login,
  signup,
  getVerifyCode,
  checkVerifyCode,
};
