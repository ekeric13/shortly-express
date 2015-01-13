var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

// probably have to fill this out
var User = db.Model.extend({
});

module.exports = User;
