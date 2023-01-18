const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const formidable = require("formidable");
const { getVideoDurationInSeconds } = require('get-video-duration')
const mongoose = require("mongoose");

const Post = require("../models/post.model.js");
const User = require("../models/user.model.js");
const ReportPost = require("../models/report.post.model.js");
const Comment = require("../models/comment.model")

const cloud = require("../helpers/cloud.helper.js");

const statusCode = require("../constants/statusCode.constant.js");
const statusMessage = require("../constants/statusMessage.constant.js");

const search = async (req, res) => {
    var { keyword, index, count } = req.query;
    const { _id } = req.userDataPass;
    // check params
    try {
        index = index ? index : 0;
        count = count ? count : 20;
        if (!keyword) {
            throw Error("params");
        }
        // var savedSearchList = req.userDataPass.
        
        // mo ta
        // 
        // Ưu tiên đứng đầu danh sách là các kết quả có chứa đủ các từ và đúng thứ tự
        // var postData1 =await Post.find({ described: new RegExp(keyword, "i") });
        // Tiếp theo là các kết quả đủ từ nhưng không đúng thứ tự
        var postData1 =await Post.find({$or: [
            { described: new RegExp(keyword, "i") },
            { described: new RegExp(keyword.replace(" ", "|"), "i") }
        ]}).populate({
            path: "author",
            select:"username avatar"
        });
        res.status(200).json({
            code: statusCode.OK,
            message: statusMessage.OK,
            data: postData1
        })
        await User.findByIdAndUpdate(_id,{
            $pull:{
                savedSearch: {
                    keyword: keyword,
                }
            }
        })
        await User.findByIdAndUpdate(_id,{
            $push:{
                savedSearch: {
                    keyword: keyword,
                    created: Date.now(),
                }
            }
        })
    } catch (error) {
        if (error.message == "params") {
            return res.status(500).json({
                code: statusCode.PARAMETER_VALUE_IS_INVALID,
                message: statusMessage.PARAMETER_VALUE_IS_INVALID
            })
        } else if (error.message == "nodata") {
            return res.status(500).json({
                code: statusCode.NO_DATA_OR_END_OF_LIST_DATA,
                message: statusMessage.NO_DATA_OR_END_OF_LIST_DATA
            })
        } else {
            return res.status(500).json({
                code: statusCode.UNKNOWN_ERROR,
                message: statusMessage.UNKNOWN_ERROR
            })
        }
    }
}

const getSavedSearch = async (req, res) => {
    var { token, index, count } = req.query;
    const { _id } = req.userDataPass;
    // check params
    try {
        index = index ? index : 0;
    count = count ? count : 20;
        var userData = req.userDataPass;
        if (!userData) {
            throw Error("nodata");
        }
        return res.status(200).json({
            code: statusCode.OK,
            message: statusMessage.OK,
            data: userData.savedSearch.sort((a,b)=>b.created-a.created).slice(Number(index),Number(index)+Number(count) ),
        })
    } catch (error) {
        if (error.message == "params") {
            return res.status(200).json({
                code: statusCode.PARAMETER_VALUE_IS_INVALID,
                message: statusMessage.PARAMETER_VALUE_IS_INVALID
            })
        } else if (error.message == "nodata") {
            return res.status(200).json({
                code: statusCode.NO_DATA_OR_END_OF_LIST_DATA,
                message: statusMessage.NO_DATA_OR_END_OF_LIST_DATA
            })
        } else {
            return res.status(200).json({
                code: statusCode.UNKNOWN_ERROR,
                message: statusMessage.UNKNOWN_ERROR
            })
        }
    }
}

const delSavedSearch = async (req, res) => {
    const { token, search_id, all } = req.query;
    const { _id } = req.userDataPass;
    // check params
    try {
        if(Number(all)==1){
            await User.findByIdAndUpdate(_id, {
                $set: {
                    savedSearch: []
                }
            });
            return res.status(200).json({
                code: statusCode.OK,
                message: statusMessage.OK
            })
        }
        else if (Number(all)==0&&search_id) {
            await User.findByIdAndUpdate(_id,{
                $pull:{
                    savedSearch:{
                        _id: search_id
                    }
                }
            });
            return res.status(200).json({
                code: statusCode.OK,
                message: statusMessage.OK
            })
        } else {
            throw Error("params");
        }
    } catch (error) {
        if (error.message == "params") {
            return res.status(200).json({
                code: statusCode.PARAMETER_VALUE_IS_INVALID,
                message: statusMessage.PARAMETER_VALUE_IS_INVALID
            })
        } else if (error.message == "nodata") {
            return res.status(200).json({
                code: statusCode.NO_DATA_OR_END_OF_LIST_DATA,
                message: statusMessage.NO_DATA_OR_END_OF_LIST_DATA
            })
        } else {
            return res.status(200).json({
                code: statusCode.UNKNOWN_ERROR,
                message: statusMessage.UNKNOWN_ERROR
            })
        }
    }
}


module.exports = {
    search,
    getSavedSearch,
    delSavedSearch
};
