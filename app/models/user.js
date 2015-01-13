var db = require('../config');
var Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');

// probably have to fill this out
var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function(){
    this.on("creating", this.createPasswordHash, this);
  },

  createPasswordHash: function(){
    var that = this;

    // var password = this.get('password');
    // return bcrypt.genSalt(10, function(err, salt) {
    //   return bcrypt.hash(password, salt, null, function(err,hash) {
    //     that.set('password', hash);
    //     callback();
    //   });
    // });

    var promiseHash = Promise.promisify(bcrypt.hash);
    return promiseHash(this.get("password"), null, null)
      .then(function(hash){
        that.set("password", hash)
      })

  },

  checkPasswordHash: function(nonHashedPassword, callback){
    bcrypt.compare(nonHashedPassword, this.get("password"), function(err, res){
      if(res === true){
        callback(res);
        // sending back true boolean. write if statement to create session if true. else redirect to login
      } else {
        console.log("password not found, error: " + err );
      }
    })
  }
});

module.exports = User;
