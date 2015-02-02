
// NODE MODULES
var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var flash = require('connect-flash');

//Authentication
var session = require('express-session');
var cookieParser = require('cookie-parser');

//Passport and Oauth Authentication
var passport = require('passport');
// var LocalStrategy = require('passport-local').Strategy;
var GitHubStrategy = require('passport-github').Strategy;
var env = require('./env.js');

var app = express();

// CONFIGURING APP EXPRESS

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(cookieParser());
app.use(flash());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


// PASSPORT SESSION SETUP
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  new User({id: id}).fetch().then(function(found){
    if (found){
      done(null, user.id);
    }else{
      done(null, false, {message: "user not found"});
    }
  })
});

// // PASSPORT LOCAL STRATEGY
// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     process.nextTick(function(){
//       new User({ username: username }, function (err, user) {
//         if (err) { return done(err); }
//         if (!user) {
//           return done(null, false, { message: 'Incorrect username.' });
//         }
//         user.checkPasswordHash(password, function(matches){
//           if (matches) {
//             return done(null, user);
//           } else {
//             return done(null, false, { message: 'Incorrect password.' });
//           }
//         })
//       });
//     })
//   }
// ));

// USE GITHUB STRATEGY
passport.use(new GitHubStrategy({
    clientID: env.githubClientId,
    clientSecret: env.githubClientSecret,
    callbackURL: "http://127.0.0.1:4568/auth/github/callback"
    // write a get route for /auth/github/callback
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      new User({githubId: profile.id}).fetch().then(function(match){
        if (match){
            return done(null, match);
        } else {
          var newUser = new User({
            githubId: profile.id
          })
          newUser.save().then(function(newUser){
            done(null, newUser)
          })


        }
      })

      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
    });
  }
));


// ROUTES THAT ARE SESSION BASED
app.get('/', function(req, res) {
  res.render('index');
});

app.get('/create', util.ensureAuthenticated, function(req, res) {
  res.render('index');
});

app.get('/links', util.ensureAuthenticated ,function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', util.ensureAuthenticated,
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
  res.render("login", {user: req.user, message: ""});
  req.session.messages = null;
  // req.user gives us access to properties of user in the login view.
});

/*
app.post('/login', function(req, res) {

    var username = req.body.username;
    var password = req.body.password;
    new User({username: username}).fetch().then(function(user){
      if(!user){
        // req.flash("username", "username is incorrect")
        // if not exisiting then render login and display error message
        req.session.messages = info.message;
        // Where do we get info.message from?
        // can set message directly by doing:
          // req.session.messages = "Login successfully";
        res.redirect('/login');
      }else{
        user.checkPasswordHash(password, function(matches){
          if(matches){
            //create session
            util.setSession(req, res, user);
          }else{
            // req.flash("password", "password is incorrect");
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
*/

// app.post('/login', function(req, res, next) {
//   passport.authenticate('local',{ failureRedirect: '/login' },
//     function(err, user, info) {
//     if (err) { return next(err) }
//     if (!user) {

//       req.session.messages = info.messages;
//       return res.redirect('/login');
//     }
//     console.log("here is the req "+req);
//     req.logIn(user, function(err) {
//       if (err) { return next(err); }
//       return util.setSession(req, res, user);
//     });
//   })(req, res, next);
// });


app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login' , successRedirect: '/'})
);


app.get("/signup", function(req, res){
  res.render("signup", {message: req.session.messages});
});

app.post('/signup', function(req, res) {

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
          if (password !== ""){
            newUser.save().then(function(sessionUser){
              util.setSession(req, res, sessionUser);
              // res.redirect("/login")
            });
          } else {
            req.session.messages = "password cannot be blank";
            res.redirect("/signup");
          }

      } else {
        // if is existing render signup and throw error message
        req.session.messages = "username is taken"
        res.redirect("/signup")
      }
    })
        //use bookshelf to create user w/req.body.username and bcrypt has password
        // generate session. redirect to root path.
});



app.get("/logout", function(req, res){
  // var username = req.body.username;
  // var password = req.body.password;
  // console.log('logging you out');
  // util.destroySession(req, res)
  // console.log('req.session ->', req.session);
  req.logout();
  res.redirect("/")
  // ***** instead now do req.logut(); res.redirect("/")
});

// Make a get route for github-login and /auth/github/callback
app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

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
