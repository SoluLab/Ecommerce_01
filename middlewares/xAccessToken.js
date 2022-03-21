var config = require('./../config');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
var secret = config.secret;
// global.loggedInUser = null;
module.exports = {
    token: async function (req, res, next) {
        let token = req.headers['x-access-token'];
        let uuid = req.headers['uuid'];
        if (token && uuid) {
            jwt.verify(token, config.secret, async (err, decoded) => {
                if (err) {
                    return res.status(400).json({
                        responseCode: 400,
                        responseMessage: "Failed to authenticate token.",
                        responseData: {}
                    });
                } else {
                    new Promise(async (resolve, reject) => {
                        var authenticate = await User.findOne({ _id: decoded.user, device: { $elemMatch: { token: token } }, device: { $elemMatch: { uuid: uuid } }, }).exec();

                        if (authenticate) {
                            User.findOneAndUpdate({ _id: decoded.user }, { $set: { updated_at: new Date() } }, { new: true }, async function (err, doc) {
                                if (err) {
                                    return res.status(400).json({
                                        responseCode: 400,
                                        responseMessage: "Failed to authenticate token.",
                                        responseData: {}
                                    });
                                }
                            });

                            loggedInUser = decoded.user;
                            next();
                        }
                        else {
                            return res.status(400).json({
                                responseCode: 400,
                                responseMessage: "Session Expired! Login Again...",
                                responseData: {}
                            });
                        }

                    })
                }

            });
        }
        else {
            return res.status(400).json({
                responseCode: 400,
                responseMessage: "Failed to authenticate token.",
                responseData: {}
            });
        }
    }
};

