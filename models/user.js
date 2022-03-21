const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bcrypt = require('bcrypt-nodejs');

// config = require('./../config');
// const uuidv1 = require('uuid/v1');

var uniqueValidator = require('mongoose-unique-validator');

var salt = bcrypt.genSaltSync(10);

const SocialiteSchema = new Schema({
    facebook: {
        type: String,
        default: ''
    },
    twitter: {
        type: String,
        default: ''
    },
    linkedin: {
        type: String,
        default: ''
    },
    instagram: {
        type: String,
        default: ''
    },
    googleplus: {
        type: String,
        default: ''
    },
    youtube: {
        type: String,
        default: ''
    },
    website: {
        type: String,
        default: ''
    },
    androidAppLink: {
        type: String,
        default: ''
    },
    iosAppLink: {
        type: String,
        default: ''
    },

});

const AccountInfoSchema = new Schema({
    status: {
        type: String,
        enum: ['Active', 'Terminate', 'Blocked', 'Unblocked', 'Deactivate', 'Deleted'],
        default: 'Active'
    },
    // type: {
    //     type: String,
    //     enum: ['user', 'business', 'deleted'],
    //     default: 'user'
    // },
    role: {
        type: String,
        enum: ['Admin', 'User'],
        default: 'User'
    },
});
const DeviceInfoSchema = new Schema({
    uuid: {
        type: String,
    },
    token: {
        type: String,
    },
    created_at: {
        type: Date
    }
});

const UserSchema = new Schema({
    name: {
        type: String,
        default: '',
    },
    email: {
        type: String,
        default: ""
    },
    contact_no: {
        type: String,
        required: [true, 'Contact field is required'],
        trim: true,
        min: 10,
        maxlength: 14
    },
    country_code: {
        type: String,
        default: "+91"
    },
    password: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        default: ''
    },
    avatar: {
        type: String,
        default: 'profile.png',
    },



    socialite: SocialiteSchema,

    account_info: AccountInfoSchema,


    device: [DeviceInfoSchema],

    otp: {
        type: Number,
        default: null,
    },

    // uuid: {
    //     type: String,
    //     default: ""
    // },
    logs: [],

    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
    },
});

// UserSchema.virtual('avatar_address').get(function () {
//     return 'https://s3.ap-south-1.amazonaws.com/' + config.BUCKET_NAME + '/avatar/' + this.avatar;
// });






// UserSchema.virtual('is_following').get(function () {
//     if (loggedInUser != null) {
//         var follow = this.follow;
//         var status = _.filter(follow, { user: mongoose.mongo.ObjectId(loggedInUser) }).length > 0 ? true : false;
//         return status;
//     }
//     else {
//         return false;
//     }
// });



// UserSchema.index({ username: -1 }, { collation: { locale: 'en', strength: 2 } });

UserSchema.set('toObject', { virtuals: true });

UserSchema.set('toJSON', { virtuals: true });

UserSchema.plugin(uniqueValidator);

// UserSchema.pre('save', function (next) {
//     var user = this;
//     var currentDate = new Date();
//     // console.log("User = " + user.optional_info.reg_by)
//     user.created_at = currentDate;
//     user.updated_at = currentDate;
//     bcrypt.hash(user.password, salt, null, function (err, hash) {
//         if (err) return next(err);
//         user.password = hash;
//         next();
//     });
// });

const User = mongoose.model('User', UserSchema, 'User');

module.exports = User;