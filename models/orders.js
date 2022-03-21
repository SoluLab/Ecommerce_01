const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({

    category: {
        type: String
    },
    subcategory: {
        type: String
    },

    brand: {
        type: String,
    },
    model: {
        type: String
    },
    product: {
        type: Schema.ObjectId,
        ref: 'Product',
        default: null
    },
    unit: {
        type: String,
        enum: ['kg', 'mg', 'g', 'piece', 'l', 'ml', 'Pack'],
        default: 'piece'
    },
    product_no: {
        type: String,
        default: ""
    },
    title: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    mrp: {
        type: Number,
        default: 0
    },
    selling_price: {
        type: Number,
        default: 0
    },
    base: {
        type: Number,
        default: 0
    },
    unit_base_price: {
        type: Number,
        default: 0
    },
    unit_price: {
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
    tax: {
        type: String,
        default: ""
    },
    tax_rate: {
        type: Number,
        default: 0
    },
    tax_amount: {
        type: Number,
        default: 0
    },
    tax_info: {},
    status: {
        type: String,
        enum: ['Cancelled', 'Confirmed', 'Returned', 'Delivered'],
        default: 'Confirmed',
        required: [true, 'Status is required']
    },
    rate: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        default: 0
    },

    discount: {
        type: String,
    },

    discount_total: {
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
        default: 'Ordered',
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
    due_date: {
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
    reference_no: {
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