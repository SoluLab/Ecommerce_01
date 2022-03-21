const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const AddressSchema = new Schema({
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    address: {
        type: String,
        default: "",
    },
    area: {
        type: String,
        default: "",
    },
    landmark: {
        type: String,
        default: "",
    },
    zip: {
        type: String,
        default: "",
    },
    city: {
        type: String,
    },
    state: {
        type: String,
        default: "",
    },
    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
    },
});

AddressSchema.set('toObject', { virtuals: true });
AddressSchema.set('toJSON', { virtuals: true });

const Address = mongoose.model('Address', AddressSchema, 'Address');
module.exports = Address;
