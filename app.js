const express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require('body-parser'),
    app = express(),
    compression = require('compression'),
    cors = require('cors');

require('dotenv').config();

//Database Connectivity
var connectDBWithRetry = () => {
    return mongoose.connect(`${process.env.databaseURL}`, (err) => {
        if (err) {
            console.error('Failed to connect to mongo on startup - retrying in 5 sec \n', err);
            setTimeout(connectDBWithRetry, 5000);
        } else {
            console.log("Database Connected")
        }
    });
};
connectDBWithRetry();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
mongoose.Promise = global.Promise;
app.use(cors());
app.use(compression());

//Server Listining
app.listen(`${process.env.PORT}`, () => {
    console.log('Listening on port ', `${process.env.PORT}`)
});

//API Routes
app.use('/admin', require('./api/admin/admin.js'));
app.use('/user', require('./api/user/user.js'));
app.use('/', require('./api/common/common.js'));