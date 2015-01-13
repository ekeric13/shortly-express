var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var flash = require('connect-flash');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(flash())
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));


app.get('/', util.checkSession, function(req, res) {
  res.render('index');
});

app.get('/create', util.checkSession, function(req, res) {
  res.render('index');
});

app.get('/links', util.checkSession ,function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get("/login", function(req, res){
  res.render("login", { message: req.flash('username') });
});


app.post('/login', function(req, res) {

    console.log('req.body -> ', req.body);
    var username = req.body.username;
    var password = req.body.password;
    new User({username: username}).fetch().then(function(user){
      if(!user){
        req.flash("username", "username is incorrect")
        // if not exisiting then render login and display error message
        res.redirect('/login');
      }else{
        user.checkPasswordHash(password, function(matches){
          if(matches){
            //create session
            util.setSession(req, res, user);
          }else{
            //TODO - error message p/w incorrect
            res.redirect('/login');
          }
        });
      }
    });
    // function that query the database to check if username exists
    // this will probably be using bookshelf
      // if is existing look at password. use bcrypt
        //if no password redirect to login and display error message
        // if password then generate session. redirect to root path.
});

app.get("/signup", function(req, res){
  res.render("signup");
});

app.post('/signup', function(req, res) {

    console.log('req.body -> ', req.body);
    var username = req.body.username;
    var password = req.body.password;

    // check to make sure if username is created
    new User({username: username}).fetch().then(function(user){
      if(!user){
          // if not exisiting then create a new user using bcrypt hash password
          var newUser = new User({
            username: username,
            password: password
          });

          // newUser.createPasswordHash(function(){
          //   newUser.save().then(function(sessionUser){
          //     util.setSession(req, res, sessionUser);
          //   });

          newUser.save().then(function(sessionUser){
            util.setSession(req, res, sessionUser);
          });

      } else {
        // if is existing render signup and throw error message
        res.redirect("/signup")
      }
    })
        //use bookshelf to create user w/req.body.username and bcrypt has password
        // generate session. redirect to root path.
});

app.get("/logout", function(req, res){
  // var username = req.body.username;
  // var password = req.body.password;
  console.log('logging you out');
  util.destroySession(req, res)
  console.log('req.session ->', req.session);
})

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
