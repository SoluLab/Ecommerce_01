const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    seller_id: {
        type: Schema.ObjectId,
        ref: 'Product',
        default: null
    },
    product: {
        type: Schema.ObjectId,
        ref: 'Product',
        default: null
    },
    product_no: {
        type: String,
        default: ""
    },
    title: {
        type: String,
        default: ""
    },
    mrp: {
        type: Number,
        default: 0
    },
    base: {
        type: Number,
        default: 0
    },
    rate: {
        type: Number,
        default: 0
    },
    tax_amount: {
        type: Number,
        default: 0
    },
    issued: {
        type: Boolean,
        default: false
    },
    quantity: {
        type: Number
    },
    amount_is_tax: {
        type: String,
        default: 'exclusive'
    },
    tax_rate: {
        type: String,
        default: ""
    },
    amount: {
        type: Number,
        default: 0
    },

    discount: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
    },
});
const PaymentSchema = new Schema({
    payment_mode: {
        type: String,
        enum: ['Online', 'COD', ''],
        default: ''
    },
    payment_status: {
        type: String,
        enum: ['', 'Success', 'Failure'],
        default: ''
    },
    total: {
        type: Number,
    },
    terms: {
        type: String,
        default: "REFUND POLICY \n"
    },
    discount_type: {
        type: String,
        default: ""
    },
    coupon_type: {
        type: String,
        default: ""
    },
    coupon: {
        type: String,
        default: ""
    },
    discount: {
        type: Number,
        default: 0
    },
    discount_total: {
        type: Number,
        default: 0
    },
    paid_total: {
        type: Number,
        default: 0
    },
    discount_applied: {
        type: Boolean,
        default: false
    },
    transaction_id: {
        type: String,
        default: ""
    },
    transaction_date: {
        type: String,
        default: ""
    },
    transaction_status: {
        type: String,
        default: ""
    },
    transaction_response: {
        type: String,
        default: ""
    }
});
const StatusSchema = new Schema({
    status: {
        type: String,
        enum: ['Cancelled', 'Ordered', 'Shipped', 'Confirmed', 'Delivered', 'Returned', 'Open'],
        default: 'Confirmed',
    },
    remark: {
        type: String,
        default: ""
    },
    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
    }
});
const logs = new Schema({
    admin: {
        type: Schema.ObjectId,
        ref: 'User',
        // required: [true, 'Business ObjectId field is required'],
    },
    activity_by: {
        type: String
    },
    time: {
        type: String
    },
    activity: {
        type: String
    },
    remark: {
        type: String
    },
    status: {
        type: String
    },
    created_at: {
        type: Date
    }
})
const OrderSchema = new Schema({
    user: {
        type: Schema.ObjectId,
        ref: 'User',
    },
    admin: {
        type: Schema.ObjectId,
        ref: 'User',
    },
    address: {
        type: Schema.ObjectId,
        ref: 'Address',
        default: null
    },
    delivery_date: {
        type: Date,
        default: null
    },
    order_no: {
        type: String,
        default: ''
    },
    remark: {
        type: String,
        default: ""
    },
    tracking_no: {
        type: String,
        default: ""
    },
    status: StatusSchema,
    // status: {
    //     type: String,
    //     enum: ['Cancelled', 'Ordered', 'Shipped', 'Confirmed', 'Delivered', 'Returned', 'Open'],
    //     default: 'Ordered',

    // },
    // log: [StatusSchema],
    payment: PaymentSchema,

    product: [ProductSchema],
    isInvoice: {
        type: Boolean,
        default: false
    },
    // invoice: {
    //     type: Schema.ObjectId,
    //     ref: 'OrderInvoice',
    //     null: true
    // },
    logs: [logs],
    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
    },
});

OrderSchema.set('toObject', { virtuals: true });
OrderSchema.set('toJSON', { virtuals: true });
const Order = mongoose.model('Order', OrderSchema, 'Order');
module.exports = Order;