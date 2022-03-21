const User = require('../../models/user'),
    Product = require('../../models/products')

module.exports = {
    sendOtp: async (msg, number) => {
        const accountId = accountSid;
        const authTokens = authToken;

        const client = require('twilio')(accountId, authTokens);
        return await client.messages
            .create({ body: msg, from: trailNumber, to: number })
            .then((message) => {
                return true;
            }).catch((err) => {
                console.log(err); return err;
            });
    },

    stockEntry: async (id, quantity) => {
        var product = await Product.findById(id).exec();
        var consumed = product.stock.total - quantity
        var available = product.stock.total - consumed
        var stock = {
            total: product.stock.total,
            consumed: consumed,
            available: available
        }

        await Product.findOneAndUpdate({ _id: id }, { $set: { 'product.stock': stock } }, { new: true }, async (err, doc) => {
            if (err) {
                res.status(422).json({
                    responseCode: 422,
                    responseMessage: "Error Occured!",
                    responseData: {}
                });
            } else {

            }
        }).clone();
        return true;
    }
}