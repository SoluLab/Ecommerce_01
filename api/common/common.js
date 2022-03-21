const User = require('../../models/user'),
    mongoose = require('mongoose'),
    express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken'),
    Validator = require('validatorjs'),
    uuidv1 = require('uuid').v1,
    bcrypt = require('bcryptjs'),
    xAccessToken = require('../../middlewares/xAccessToken'),
    config = require('../../config'),
    event = require('../function/function.js')
_ = require('lodash');



router.post('/signUp', async (req, res, next) => {
    var rules = {
        name: 'required',
        contact_no: 'required',
        // email: 'required',
        password: 'required',
        role: 'required'
    };
    var validation = new Validator(req.body, rules);
    if (validation.fails()) {
        res.status(422).json({
            responseCode: 422,
            responseMessage: "Validation Error",
            responseData: validation.errors.all()
        })
    } else {
        let role = req.body.role;
        let contact_no = await User.find({ contact_no: req.body.contact_no, "account_info.role": role }).exec();
        if (contact_no.length == 0) {
            bcrypt.hash(req.body.password, 10, async (err, hashPassword) => {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Error Occured",
                        responseData: {}
                    });
                }
                await User.create({
                    name: req.body.name,
                    contact_no: req.body.contact_no,
                    country_code: req.body.country_code,
                    email: req.body.email,
                    password: hashPassword,
                    account_info: {
                        status: "Active",
                        role: role
                    },
                    created_at: new Date(),
                    updated_at: new Date(),
                }).then(async () => {
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "Registered Successfully",
                        responseData: {}
                    })
                });
            })
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: role + " Account Already Exist with this contact no.",
                responseData: {}
            });
        }
    }
});

router.post('/login', async (req, res, next) => {
    let contact_no = req.body.contact_no;
    let password = req.body.password;
    let role = req.body.role
    // var uniqueId=req.body.unique_id

    let user = await User.findOne({ contact_no: contact_no, "account_info.role": role }).exec();
    if (user) {
        if (!bcrypt.compareSync(password, user.password)) {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "Authentication failed. Wrong password",
                responseData: {},
            });
        }
        else {
            const payload = {
                user: user._id
            };
            let token = jwt.sign(payload, config.secret);
            let uuid = uuidv1()
            // console.log("uuid= ", uuid)
            let deviceInfo = [];
            deviceInfo = _.filter(user.device, device => device.uuid != uuid);
            deviceInfo.push({
                uuid: uuid,
                token: token,
            });
            await User.findByIdAndUpdate({ _id: user._id, 'account_info.role': role }, { $set: { device: deviceInfo } }, { new: false }, async function (err, doc) {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Something wrong when updating data",
                        responseData: {}
                    });
                }
                else {
                    let userDetails = await User.findOne({ _id: user._id, 'account_info.role': role }).exec();
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "LoggedIn Successfully",
                        responseData: {
                            token: token,
                            uuid: userDetails.device[0].uuid,
                            userId: userDetails._id
                        }
                    });
                }
            }).clone().catch(function (err) { console.log(err) })
        }

    } else {
        res.status(400).json({
            responseCode: 400,
            responseMessage: "Account not found",
            responseData: {}
        });
    }
});

router.post('/forgot/password', async function (req, res, next) {
    var rules = {
        contact_no: 'required',
        role: 'required'
    };

    var validation = new Validator(req.body, rules);
    if (validation.fails()) {
        res.status(422).json({
            responseCode: 422,
            responseMessage: "Error Occured!",
            responseData: validation.errors.all()
        })
    }
    else {
        let otp = Math.floor(Math.random() * 900000) + 100000;
        var data = {
            otp: otp,
        };
        var user = await User.findOne({ contact_no: req.body.contact_no, "account_info.role": req.body.role }).exec();
        if (user) {
            if (user.account_info.status == "Active") {
                await User.findOneAndUpdate({ _id: user._id }, { $set: data }, { new: true }, async (err, doc) => {
                    if (err) {
                        res.status(400).json({
                            responseCode: 400,
                            responseMessage: "Error occured",
                            responseData: {}
                        });
                    }
                    await event.sendOtp(`your two step authentication ${otp}`, `${user.country_code}${user.contact_no}`);
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "OTP sent successfully",
                        responseData: {
                            id: user._id
                        }
                    });
                }).clone();
            }
            else {
                res.status(400).json({
                    responseCode: 400,
                    responseMessage: "Account is not Active!",
                    responseData: {}
                })
            }
        }
        else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "User Not Found",
                responseData: {}
            })
        }
    }
});

router.post('/otp/verification', async function (req, res, next) {
    let rules = {
        userId: "required",
        otp: "required",
    };

    let validation = new Validator(req.body, rules);
    if (validation.fails()) {
        res.status(422).json({
            responseCode: 422,
            responseMessage: "Error Occured!",
            responseData: validation.errors.all()
        });
    }
    else {
        let user = await User.findOne({ _id: req.body.userId, otp: parseInt(req.body.otp) }).exec();
        if (user) {
            await User.findOneAndUpdate({ _id: user._id }, { $set: { otp: null } }, { newe: true }, async (err, doc) => {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Error Occured!",
                        responseData: err
                    });
                } else {
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "OTP verified successfully",
                        responseData: {
                            user: user._id
                        }
                    });
                }
            }).clone();
        }
        else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "Invalid OTP",
                responseData: {}
            })
        }
    }
});


router.put('/reset/password', xAccessToken.token, async (req, res, next) => {
    var rules = {
        userId: 'required',
        password: 'required'
    };
    var validation = new Validator(req.body, rules);
    if (validation.fails()) {
        res.status(422).json({
            responseCode: 422,
            responseMessage: "Validation Error",
            responseData: validation.errors.all()
        });
    } else {
        let token = req.headers['x-access-token'];
        let secret = config.secret;
        let decoded = jwt.verify(token, secret);
        let user = decoded.user;
        let userId = req.body.userId;
        let password = req.body.password;
        let userDetails = await User.findOne({ _id: userId }).exec();

        if (userDetails) {
            bcrypt.hash(password, 10, async (err, hashPassword) => {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Error Occured while generating hash!",
                        responseData: {}
                    });
                } else {
                    await User.findOneAndUpdate({ _id: userId }, { $set: { password: hashPassword } }, { new: true }, async (err, doc) => {
                        if (err) {
                            res.status(422).json({
                                responseCode: 422,
                                responseMessage: "Error Occured!",
                                responseData: {}
                            });
                        } else {
                            res.status(200).json({
                                responseCode: 200,
                                responseMessage: "Password Reset Successfully",
                                responseData: {}
                            });
                        }
                    }).clone();
                }
            });

        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "Account not found",
                responseData: {}
            });
        }
    }
});



module.exports = router
