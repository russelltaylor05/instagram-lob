var express       = require('express');
var cookieParser  = require('cookie-parser');
var instaApi      = require('instagram-node').instagram();
var fs            = require('fs');
var Bluebird      = require('bluebird');
var router        = express.Router();
var Lob           = require('lob')('test_0dc8d51e0acffcb1880e0f19c79b2f5b0cc');

Bluebird.promisifyAll(instaApi);


var redirect_uri = 'http://localhost:3000/handleauth';
var instaCredentials = {
  client_id: 'cafa57d508434e64954fbea2dc1a3f70',
  client_secret: 'ce6bb775338b4747bcd03805edffb374'
}



/* Redirect user to Instagram for authenitcation */
router.get('/authorize-user', function (req, res) {
  instaApi.use(instaCredentials);
  res.redirect(instaApi.get_authorization_url(redirect_uri));
});


/* Set cookie once Instagram send access code */
router.get('/handleauth', function (req, res) {
  instaApi.authorize_user(req.query.code, redirect_uri, function(err, result) {
    if (err) {
      console.log(err.body);
    } else {
      res.cookie('instaToken',result.access_token, { maxAge: 900000, httpOnly: true });
      res.redirect('/');
    }
  });
});

/* Index page */
router.get('/', function (req, res) {

  var instaToken = req.cookies.instaToken;

  if (req.cookies.instaToken) {
    instaApi.use({ access_token: instaToken });
    return instaApi.user_self_media_recentAsync(50)
    .spread(function (medias, pagination, remaining, limit) {

      return Bluebird.all([
        instaApi.mediaAsync(medias[Math.floor(Math.random() * medias.length -1) + 1].id),
        instaApi.mediaAsync(medias[Math.floor(Math.random() * medias.length -1) + 1].id),
        instaApi.mediaAsync(medias[Math.floor(Math.random() * medias.length -1) + 1].id)
      ]);
    })
    .spread(function (image1, image2, image3) {
      res.render('insta', {
        title: 'Send this Postcard',
        image1: image1[0].images.standard_resolution.url,
        image2: image2[0].images.standard_resolution.url,
        image3: image3[0].images.standard_resolution.url,
        access_token: instaToken
      });
    })
    .catch(function (errors) {
      console.log(errors);
    });
  } else {
    res.render('index', { title: 'Instagram + Lob' });
  }
});





/* Create Postcard and Send to Lob */
router.post('/send-postcard', function (req, res) {

  var postcardTemplate = fs.readFileSync(__dirname + '/views/postcard.html').toString();
  return Lob.postcards.create({
    description: 'Demo Postcard job',
    to: {
      name: req.body.name,
      address_line1: req.body.address,
      address_city: req.body.city,
      address_state: req.body.state,
      address_zip: req.body.zip,
      address_country: 'US',
    },
    front: postcardTemplate,
    message: req.body.message,
    data: {
      image1: req.body.image1,
      image2: req.body.image2,
      image3: req.body.image3
    }
  })
  .then(function (results) {
    console.log(results);
    res.render('complete', {
      url: results.url
    });
  })
  .catch(function (errors){
    res.render('complete', { error: errors.message });
  });

})



module.exports = router;