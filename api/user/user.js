const User = require('../../models/user'),
    Product = require('../../models/products'),
    Orders = require('../../models/orders'),
    mongoose = require('mongoose'),
    express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken'),
    Validator = require('validatorjs'),
    uuidv1 = require('uuid').v1,
    bcrypt = require('bcryptjs'),
    xAccessToken = require('../../middlewares/xAccessToken'),
    config = require('../../config');

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
        { $match: { publish: { $eq: true } } },
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

        var product = await Product.findOne({ _id: req.query.id }).exec();
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
                    { user: { $eq: mongoose.Types.ObjectId(req.query.id) } },
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
                created_at: product.created_at,
                updated_at: product.updated_at

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

        var order = await Orders.findOne({ _id: mongoose.Types.ObjectId(req.query.id) }).exec();
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
            })

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
