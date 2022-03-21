const User = require('../../models/user')

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
    }
}