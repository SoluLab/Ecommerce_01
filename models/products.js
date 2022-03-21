const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PriceSchema = new Schema({
    //(mrp=amount)
    mrp: {
        type: Number,
        default: 0
    },
    //(rate=base+margin)
    rate: {
        type: Number,
        default: 0
    },
    //(amount=rate+GST)
    amount: {
        type: Number,
        default: 0
    },
    amount_is_tax: {
        type: String,
        enum: ['inclusive', 'exclusive'],
    },
    //(selling_price=rate+GST)
    selling_price: {
        type: Number,
        default: 0
    },
    margin_total: {
        type: Number,
        default: 0

    },
    discount: {
        type: Number,
        default: 0,
    },
    tax_amount: {
        type: Number,
        default: 0
    },
    base: {
        type: Number,
        default: 0

    },
    tax_rate: {
        type: String,
        default: "18% GST"
    },
    //(purchase_price=base+GST)
    purchase_price: {
        type: Number,
        default: 0.00
    }
});
const StockSchema = new Schema({
    total: {
        type: Number,
        default: 0
    },
    consumed: {
        type: Number,
        default: 0
    },
    available: {
        type: Number,
        default: 0
    },
});
const ProductSchema = new Schema({
    title: {
        type: String
    },
    product_no: {
        type: String
    },
    description: {
        type: String
    },
    unit: {
        type: String,
        enum: ['kg', 'mg', 'g', 'piece', 'l', 'ml', 'pack'],
        default: 'piece'
    },
    hsn_sac: {
        type: String,
        default: ""
    },
    type: {
        type: String
    },
    product_brand: {
        type: String,
        default: ""
    },
    publish: {
        type: Boolean,
        default: false
    },
    product_model: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        default: ""
    },
    subcategory: {
        type: String,
        default: ""
    },
    admin: {
        type: Schema.ObjectId,
        ref: 'User',
    },
    price: PriceSchema,
    stock: StockSchema,
});

ProductSchema.set('toObject', { virtuals: true });
ProductSchema.set('toJSON', { virtuals: true });

const Product = mongoose.model('Product', ProductSchema, 'Product');

module.exports = Product;