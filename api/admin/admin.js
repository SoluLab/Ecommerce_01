const User = require('../../models/user'),
    Product = require('../../models/products'),
    Orders = require('../../models/orders'),
    mongoose = require('mongoose'),
    express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken'),
    Validator = require('validatorjs'),
    moment = require('moment-timezone'),
    xAccessToken = require('../../middlewares/xAccessToken'),
    config = require('../../config');

router.get('/user/list/get', xAccessToken.token, async (req, res, next) => {
    let token = req.headers['x-access-token'];
    let secret = config.secret;
    let decoded = jwt.verify(token, secret);
    let user = decoded.user;

    let users = []
    let page = 0
    if (req.query.page) {
        page = req.query.page
    }
    let limit = 10
    if (req.query.limit) {
        limit = parseInt(req.query.limit)
    }
    let status = "Active"
    if (req.query.status) {
        status = req.query.status
    }
    let filters = [
        {
            $match: {
                $and: [
                    { 'account_info.role': { $eq: "User" } },
                    { 'account_info.status': { $eq: status } }
                ]
            }
        },
        { $sort: { created_at: -1 } },
        { $skip: config.perPage * page },
        { $limit: limit }
    ]
    if (req.query.query) {
        req.query.query = req.query.query.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        filters.push({
            $match: {
                $or:
                    [
                        { 'name': { $regex: req.query.query, $options: 'i' } },
                        { 'contact_no': { $regex: req.query.query, $options: 'i' } },
                    ]
            }
        })

    }
    await User.aggregate(filters).allowDiskUse(true).cursor({ batchSize: 10 })
        .eachAsync(async (user) => {
            users.push({
                id: user._id,
                name: user.name,
                contact_no: user.contact_no,
                email: user.email,
                account_info: user.account_info,
                gender: user.gender,
                created_at: moment(user.created_at).tz(req.headers['tz']).format('lll'),
                updated_at: moment(user.updated_at).tz(req.headers['tz']).format('lll')

            })
            // console.log("users= ", JSON.stringify(users))
        });

    res.status(200).json({
        responseCode: 200,
        responseMessage: "Success",
        responseData: users
    });
});

router.put('/user/accountStatus/update', xAccessToken.token, async (req, res, next) => {
    let token = req.headers['x-access-token'];
    let secret = config.secret;
    let decoded = jwt.verify(token, secret);
    let user = decoded.user;
    var rules = {
        userId: 'required',
        status: 'required'
    };
    var validation = new Validator(req.body, rules);
    if (validation.fails()) {
        res.status(422).json({
            responseCode: 422,
            responseMessage: "Validation Error",
            responseData: validation.errors.all()
        });
    } else {
        let user = await User.findOne({ _id: mongoose.Types.ObjectId(req.body.userId), 'account_info.role': "User" }).exec();
        if (user) {
            await User.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.userId), 'account_info.role': "User" }, { $set: { 'account_info.status': req.body.status } }, { new: true }, async (err, doc) => {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Error Occured",
                        responseData: {}
                    });
                } else {
                    var status = req.body.status
                    if (req.body.status == "Active") {
                        status = "Activated"
                    }
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "User Account " + status + " Successfully",
                        responseData: {}
                    });
                }
            }).clone().catch(function (err) { console.log(err) });
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "No user found",
                responseData: {}
            });
        }
    }
});


router.post('/item/create', xAccessToken.token, async function (req, res, next) {
    var rules = {
        title: 'required',
        product_no: 'required',
        base_price: 'required',
        quantity: 'required',
        tax: 'required'
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

        let product_no = req.body.product_no;
        product_no = (product_no.replace(/,/g, ", ")).toUpperCase();
        // product_no = product_no.toUpperCase();
        let unit = req.body.unit;
        let loggedInDetails = await User.findById(user).exec();
        let product = await Product.find({ product_no: product_no, admin: user }).exec();
        if (product.length == 0) {
            let quantity = req.body.quantity
            let tax_slab = req.body.tax
            let remark = req.body.remark;
            let margin = req.body.margin
            let base_price = parseFloat(req.body.base_price)
            let mrp = parseFloat(req.body.mrp)
            let category = req.body.category
            let subcategory = req.body.subcategory
            let title = req.body.title
            let hsn_sac = req.body.hsn_sac
            let discount = parseFloat(req.body.discount).toFixed(2)
            let product_brand = req.body.product_brand
            // var discount_type = req.body.discount_type;
            // var isDiscount = req.body.isDiscount;
            // tax_type
            // var tax_info = await Tax.findOne({ tax: tax_slab }).exec();  //products[p].tax = "28.0% GST"
            // var rate = parseFloat(purchase_price);    //sale price
            // var amount = parseFloat(purchase_price);
            let tax = tax_slab.split('% ');
            let tax_rate = tax[0]
            let margin_total = 0
            if (margin) {
                margin_total = parseFloat(margin)
            }
            // if (discount) {
            //     amount = amount - discount
            // }

            let amount_is_tax = "exclusive";
            let tax_amount = 0;
            let amount = base_price
            if (discount) {
                amount = amount - discount
            }
            if (amount_is_tax == "exclusive") {
                if (tax_rate) {
                    tax_amount = amount * (tax_rate / 100);
                    amount = amount + tax_amount;
                }
            }
            //Base  Rate GST amount purc selling 
            let rate = parseFloat(base_price) + parseFloat(margin_total) - discount;
            let selling_price = rate;
            if (tax_rate) {
                let t = rate * (tax_rate / 100);
                selling_price = rate + t;
            }

            let stock = {
                total: quantity,
                consumed: 0,
                available: quantity,

            };

            let price = {
                base: base_price, //base price with GST
                tax_amount: tax_amount, //Tax Amount
                purchase_price: amount,  //base + GST on base
                rate: rate,
                amount_is_tax: amount_is_tax,
                amount: selling_price,
                mrp: mrp,
                discount: discount,
                selling_price: selling_price,
                margin_total: margin_total,
            }

            var data = {
                admin: user,
                product_no: product_no,
                product_brand: product_brand,
                category: category,
                subcategory: subcategory,
                title: title,
                publish: true,
                description: "",
                hsn_sac: hsn_sac,
                unit: unit,
                stock: stock,
                price: price,
                created_at: new Date(),
                updated_at: new Date()
            };
            await Product.create(data).then(async (result) => {
            });
            res.status(200).json({
                responseCode: 200,
                responseMessage: "Product Added Successfully",
                responseData: {}
            });
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "Product Already Exist",
                responseData: {}
            });
        }
    }
});

router.get('/products/list/get', xAccessToken.token, async (req, res, next) => {
    let token = req.headers['x-access-token'];
    let secret = config.secret;
    let decoded = jwt.verify(token, secret);
    let user = decoded.user;

    let products = []
    let page = 0
    if (req.query.page) {
        page = req.query.page
    }
    let limit = 10
    if (req.query.limit) {
        limit = parseInt(req.query.limit)
    }
    let filters = [
        { $match: { admin: { $eq: mongoose.Types.ObjectId(user) } } },
        { $sort: { created_at: -1 } },
        { $skip: config.perPage * page },
        { $limit: limit }
    ]
    if (req.query.query) {
        req.query.query = req.query.query.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        filters.push({
            $match: {
                $or:
                    [
                        { 'title': { $regex: req.query.query, $options: 'i' } },
                        { 'product_no': { $regex: req.query.query, $options: 'i' } },
                        { 'product_brand': { $regex: req.query.query, $options: 'i' } },
                        { 'category': { $regex: req.query.query, $options: 'i' } },
                        { 'subcategory': { $regex: req.query.query, $options: 'i' } },
                    ]
            }
        })

    }
    await Product.aggregate(filters).allowDiskUse(true).cursor({ batchSize: 10 })
        .eachAsync(async (product) => {
            products.push({
                id: product._id,
                title: product.title,
                product_no: product.product_no,
                description: product.description,
                unit: product.unit,
                hsn_sac: product.hsn_sac,
                product_brand: product.product_brand,
                category: product.category,
                subcategory: product.subcategory,
                price: product.price,
                stock: product.stock,
                admin: product.admin,
                created_at: product.created_at,
                updated_at: product.updated_at

            });
        });
    res.status(200).json({
        responseCode: 200,
        responseMessage: "Success",
        responseData: products
    });
});

router.get('/product/details/get', xAccessToken.token, async (req, res, next) => {
    var rules = {
        id: 'required'
    };
    var validation = new Validator(req.query, rules);
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

        var product = await Product.findOne({ _id: req.query.id, admin: mongoose.Types.ObjectId(user) }).exec();
        if (product) {
            res.status(200).json({
                responseCode: 200,
                responseMessage: "Success",
                responseData: product
            });
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "product not found",
                responseData: {}
            });
        }

    }
});

router.delete('/product/delete', xAccessToken.token, async (req, res, next) => {
    var rules = {
        id: 'required'
    };
    var validation = new Validator(req.query, rules);
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

        var product = await Product.findOne({ _id: req.query.id, admin: mongoose.Types.ObjectId(user) }).exec();
        if (product) {
            await Product.findOneAndDelete({ _id: req.query.id, admin: mongoose.Types.ObjectId(user) }).then(async (result) => {
                res.status(200).json({
                    responseCode: 200,
                    responseMessage: "Successfully deleted",
                    responseData: {}
                });
            });
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "product not found",
                responseData: {}
            });
        }
    }
});

router.put('/product/activate/deacivate', xAccessToken.token, async (req, res, next) => {
    let token = req.headers['x-access-token'];
    let secret = config.secret;
    let decoded = jwt.verify(token, secret);
    let user = decoded.user;
    var rules = {
        id: 'required',
        status: 'required'
    };
    var validation = new Validator(req.body, rules);
    if (validation.fails()) {
        res.status(422).json({
            responseCode: 422,
            responseMessage: "Validation Error",
            responseData: validation.errors.all()
        });
    } else {
        let product = await Product.findOne({ _id: mongoose.Types.ObjectId(req.body.id), admin: mongoose.Types.ObjectId(user) }).exec();
        if (product) {
            let publish = false
            if (req.body.status == "Deactivated") {
                publish = false
            }
            if (req.body.status == "Activated") {
                publish = true
            }
            await Product.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.id), admin: mongoose.Types.ObjectId(user) }, { $set: { publish: publish } }, { new: true }, async (err, doc) => {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Error Occured",
                        responseData: {}
                    });
                } else {
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "product " + req.body.status + " Successfully",
                        responseData: {}
                    });
                }
            }).clone().catch(function (err) { console.log(err) });
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "product not found",
                responseData: {}
            });
        }
    }
});

router.get('/orders/list/get', xAccessToken.token, async (req, res, next) => {
    let token = req.headers['x-access-token'];
    let secret = config.secret;
    let decoded = jwt.verify(token, secret);
    let user = decoded.user;

    let orders = []
    let page = 0
    if (req.query.page) {
        page = req.query.page
    }
    let limit = 10
    if (req.query.limit) {
        limit = parseInt(req.query.limit)
    }
    let filters = [
        {
            $match: {
                $and: [
                    { admin: { $eq: mongoose.Types.ObjectId(user) } },
                    { 'status.status': { $eq: req.query.status } }
                ]
            }
        },
        { $sort: { created_at: -1 } },
        { $skip: config.perPage * page },
        { $limit: limit }
    ]
    if (req.query.query) {
        req.query.query = req.query.query.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        filters.push(
            {
                $lookup: {
                    $and: [
                        {
                            from: "User",
                            localField: "user",
                            foreignField: "_id",
                            as: "user",
                        },
                        // {
                        //     from: "Product",
                        //     localField: "product",
                        //     foreignField: "_id",
                        //     as: "product",
                        // },
                    ]
                }
            },
            {
                $match: {
                    $or:
                        [
                            { 'order_no': { $regex: req.query.query, $options: 'i' } },
                            { 'user.name': { $regex: req.query.query, $options: 'i' } },
                            { 'user.contact_no': { $regex: req.query.query, $options: 'i' } },
                            // { 'product.category': { $regex: req.query.query, $options: 'i' } },
                            // { 'product.subcategory': { $regex: req.query.query, $options: 'i' } },
                        ]
                }
            }
        )

    }
    await Orders.aggregate(filters).allowDiskUse(true).cursor({ batchSize: 10 })
        .eachAsync(async (order) => {
            orders.push({
                id: order._id,
                user: order.user,
                admin: order.admin,
                address: order.address,
                delivery_date: order.delivery_date,
                due_date: order.due_date,
                order_no: order.order_no,
                remark: order.remark,
                status: order.status,
                payment: order.payment,
                product: order.product,
                isInvoice: order.isInvoice,
                created_at: order.created_at,
                updated_at: order.updated_at

            });
        });
    res.status(200).json({
        responseCode: 200,
        responseMessage: "Success",
        responseData: orders
    });
});

router.get('/order/details/get', xAccessToken.token, async (req, res, next) => {
    var rules = {
        id: 'required'
    };
    var validation = new Validator(req.query, rules);
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

        var order = await Orders.findOne({ _id: req.query.id, admin: mongoose.Types.ObjectId(user) }).exec();
        if (order) {
            res.status(200).json({
                responseCode: 200,
                responseMessage: "Success",
                responseData: order
            });
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "order not found",
                responseData: {}
            });
        }
    }
});

router.put('/order/status/update', xAccessToken.token, async (req, res, next) => {
    var rules = {
        id: 'required',
        status: 'required'
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

        var order = await Orders.findOne({ _id: mongoose.Types.ObjectId(req.body.id) }).exec();
        if (order) {
            await Orders.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.id) }, { $set: { 'status.status': req.body.status } }, { new: true }, async (err, doc) => {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Error Occured!",
                        responseData: err
                    });
                } else {
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "Order " + req.body.status + " Successfully",
                        responseData: {}
                    });
                }
            }).clone();

        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "order not found",
                responseData: {}
            });
        }
    }
});

module.exports = router
