var request = require('request');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/

exports.setSession = function(req, res, user){
  // user.get("username")

  // request.session.destroy(function(){
  //       response.redirect('/');r
  //   r});
  req.session.regenerate(function(){
    req.session.user = user.get("username");
    console.log('request.session ->', req.session);
    res.redirect("/");
  });

};


// make a function that checks to see if a user is in a session
exports.checkSession = function(req, res, next){
  // if(req.session.user) exists then render index. else redirect to login
  if (req.session.user !== undefined){
    next();
  } else {
    res.redirect("/login");
  }

};

exports.destroySession = function(req, res){
  req.session.destroy(function(){
        res.redirect('/');
  });
};
