const User = require('../../models/user'),
    Product = require('../../models/products'),
    Orders = require('../../models/orders'),
    Cart = require('../../models/cart'),
    mongoose = require('mongoose'),
    express = require('express'),
    router = express.Router(),
    jwt = require('jsonwebtoken'),
    Validator = require('validatorjs'),
    event = require('../function/function.js'),
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

router.post('/order/create', xAccessToken.token, async function (req, res, next) {
    var token = req.headers['x-access-token'];
    var secret = config.secret;
    var decoded = jwt.verify(token, secret);
    var date = new Date();
    var loggedInDetails = decoded.user;
    var product = [];
    var discount = 0;
    var total = 0;
    var due = {
        due: 0
    };
    // var user = await User.findById(decoded.user).exec();
    var user = await User.findById(req.body.user).exec();

    if (user) {
        let products = req.body.products;
        for (var i = 0; i < products.length; i++) {
            var productDetails = await Product.findById(products[i].product_id).exec();
            if (productDetails) {
                if (products[i].quantity <= productDetails.stock.available) {
                    var base_price = parseFloat(products[i].base_price);
                    var quantity = parseFloat(products[i].quantity);
                    var margin_total = parseFloat(products[i].margin);
                    var discount_total = parseFloat(products[i].discount);
                    var rate = (base_price - discount_total) + margin_total;
                    var tax_slab = (products[i].tax).split('% ');
                    let tax_rate = tax_slab[0]
                    var amount = base_price;

                    if (!isNaN(discount_total) && discount_total > 0) {
                        amount = amount - parseFloat(discount_total.toFixed(2))
                    }
                    if (!isNaN(margin_total) && margin_total > 0) {
                        amount = amount + parseFloat(margin_total.toFixed(2))
                    }
                    var tax_amount = 0
                    if (tax_rate) {
                        var tax_amount = amount * (tax_rate / 100);
                        amount = amount + tax_amount;
                    }

                    if (!isNaN(quantity) && quantity > 0) {
                        amount = amount * parseFloat(quantity.toFixed(2))
                    }

                    var issued = await event.stockEntry(productDetails._id, products[i].quantity);

                    product = {
                        seller_id: productDetails.admin,
                        product: productDetails._id,
                        product_no: products[i].product_no,
                        title: products[i].title,
                        mrp: products[i].mrp,
                        rate: rate,
                        quantity: products[i].quantity,
                        base_price: parseFloat(base_price.toFixed(2)),
                        // amount: amount,
                        discount: parseFloat(discount_total.toFixed(2)),
                        amount_is_tax: 'exclusive',
                        tax_amount: parseFloat(tax_amount.toFixed(2)),
                        amount: parseFloat(amount.toFixed(2)),
                        tax_rate: tax_rate,
                        issued: issued,
                        created_at: new Date(),
                        updated_at: new Date(),
                    }


                    var payment = {
                        payment_mode: "",
                        payment_status: "",
                        discount_type: "",
                        coupon_type: "",
                        coupon: "",
                        transaction_id: "",
                        transaction_date: "",
                        transaction_status: "",
                        discount_applied: false,
                        total: total,
                        discount_total: discount,
                        paid_total: 0,
                    };

                    var orderCount = await Orders.find({ user: req.body.user }).count().exec();
                    var data = {
                        admin: productDetails.admin,
                        user: user._id,
                        order_no: orderCount + 1,
                        reamrk: '',
                        status: {
                            status: "Confirmed"
                        },
                        delivery_date: new Date(),
                        tracking_no: Math.round(+new Date() / 1000) + "-" + Math.ceil((Math.random() * 90000) + 10000),
                        product: product,
                        payment: payment,
                        logs: [],
                        isInvoice: false,
                        created_at: new Date(),
                        updated_at: new Date(),

                    };

                    await Orders.create(data).then(async (order) => {
                        // await event.sendOtp(`Order Created Successfully, tracking_no-${data.tracking_no}`, `${user.country_code}${user.contact_no}`);

                    });
                } else {
                    res.status(400).json({
                        responseCode: 400,
                        responseMessage: "Insufficient Quantity in the stock for product " + products[i].title,
                        responseData: {}
                    });
                }
            }
        }
        res.status(200).json({
            responseCode: 200,
            responseMessage: "Order Created Successfully",
            responseData: {}
        });

    }
    else {
        res.status(400).json({
            responseCode: 400,
            responseMessage: "User not found",
            responseData: {}
        });
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
                    { user: { $eq: mongoose.Types.ObjectId(user) } },
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

router.put('/cancel/order', xAccessToken.token, async (req, res, next) => {
    var rules = {
        id: 'required',
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
            await Orders.findOneAndUpdate({ _id: mongoose.Types.ObjectId(req.body.id) }, { $set: { 'status.status': "Cancelled" } }, { new: true }, async (err, doc) => {
                if (err) {
                    res.status(422).json({
                        responseCode: 422,
                        responseMessage: "Error Occured!",
                        responseData: err
                    });
                } else {
                    res.status(200).json({
                        responseCode: 200,
                        responseMessage: "Order Cancelled Successfully",
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

router.post('/add/to/cart', xAccessToken.token, async (req, res, next) => {
    var rules = {
        product_id: 'required',
        quantity: 'required',
        price: 'required',
        discount: 'required'
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

        let product = await Product.findById(req.body.product_id).exec();
        if (product) {
            if (product.stock.available >= req.body.quantity) {
                let data = {
                    user: user,
                    product: product._id,
                    quantity: req.body.quantity,
                    price: req.body.price,
                    discount: req.body.discount,
                    admin: product.admin,
                    created_at: new Date(),
                    updated_at: new Date(),
                }
                let id
                await Cart.create(data).then(async (cart) => {
                    id = cart._id
                });
                res.status(200).json({
                    responseCode: 200,
                    responseMessage: "product added to cart successfully",
                    responseData: {
                        product: {
                            id: id,
                            product_id: product._id,
                            title: product.title,
                            product_no: product.product_no,
                            product_brand: product.product_brand,
                            quantity: req.body.quantity,
                            price: req.body.price,
                            discount: req.body.discount,
                            created_at: new Date(),
                            updated_at: new Date(),
                        }
                    }
                });
            } else {
                res.status(400).json({
                    responseCode: 400,
                    responseMessage: "Insufficient Quantity in stock.",
                    responseData: {}
                });
            }
        } else {
            res.status(400).json({
                responseCode: 400,
                responseMessage: "product not found",
                responseData: {}
            });
        }
    }
});

router.get('/cart/list/get', xAccessToken.token, async (req, res, next) => {
    let token = req.headers['x-access-token'];
    let secret = config.secret;
    let decoded = jwt.verify(token, secret);
    let user = decoded.user;

    let cart_list = []
    let page = 0
    if (req.query.page) {
        page = req.query.page
    }
    let limit = 10
    if (req.query.limit) {
        limit = parseInt(req.query.limit)
    }
    let filters = [
        { $sort: { created_at: -1 } },
        { $skip: config.perPage * page },
        { $limit: limit }
    ]
    if (req.query.query) {
        req.query.query = req.query.query.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        filters.push({
            $lookup: {
                from: "Product",
                localField: "product",
                foreignField: "_id",
                as: "product",
            }
        },
            {
                $match: {
                    $or:
                        [
                            { 'product.title': { $regex: req.query.query, $options: 'i' } },
                            { 'product.product_no': { $regex: req.query.query, $options: 'i' } },
                            { 'product.product_brand': { $regex: req.query.query, $options: 'i' } },
                        ]
                }
            }
        )

    }
    await Cart.aggregate(filters).allowDiskUse(true).cursor({ batchSize: 10 })
        .eachAsync(async (cart) => {
            cart_list.push(cart);
        });
    res.status(200).json({
        responseCode: 200,
        responseMessage: "Success",
        responseData: cart_list
    });
});

router.delete('/remove/from/cart', xAccessToken.token, async (req, res, next) => {
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

        var product = await Cart.findOne({ _id: req.query.id }).exec();
        if (product) {
            await Cart.findOneAndDelete({ _id: req.query.id }).then(async (result) => {
                res.status(200).json({
                    responseCode: 200,
                    responseMessage: "Successfully Removed from Cart",
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


module.exports = router
