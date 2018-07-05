const express = require('express');
const exphbs = require('express-handlebars');
const compression = require('compression');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const nodemailer = require('nodemailer');
const meta = require('./views/site.metadata.json');
const smtp = require('./config/smtp');
const recaptcha = require('./config/recaptcha');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

app.use(express.static('assets'));

let css = fs.readFileSync(__dirname + '/assets/css/materialize.min.css', {encoding: 'utf-8'});
css += fs.readFileSync(__dirname + '/assets/css/styles.css');

const hbs = exphbs.create({
    defaultLayout: "main",
    extname: ".hbs",
    helpers: {
        section: function(name, options) {
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});

app.engine('hbs', hbs.engine);
app.set('view engine', '.hbs');

let transporter = nodemailer.createTransport(smtp);
transporter.verify(function(error, success) {
    if (error) {
         console.log(error);
    } else {
         console.log('G Suite Works');
    }
});

const baseRef = "http://120.0.0.1/";

// Site Links
app.get('/', function (req, res) {
    res.render('home', {data: {baseRef, css, meta: meta.home}});
});
app.get('/about-us', function(req, res) {
    res.render('about-us', {data: {baseRef, css, meta: meta.aboutUs}});
});
app.get('/care-programs', function(req,res) {
    res.render('care-programs', {data: {baseRef, css, meta: meta.carePrograms}});
});
app.get('/referral-sources', function (req, res) {
    res.render('referral-sources', {data: {baseRef, css, meta: meta.referralSources}});
});
app.get('/service-area', function (req, res) {
    res.render('service-area', {data: {baseRef, css, meta: meta.serviceArea}});
});
app.get('/contact-us', function (req, res) {
    res.render('contact-us', {data: {baseRef, css, meta: meta.contactUs}});
});
app.post('/contact-us', function (req, res) {
    if(req.body.token === null || req.body.token === undefined || req.body.token === '') {
        return res.json({success: false, message: 'Missing Captcha Token'});
    }
    // Secret Key
    const secretKey = recaptcha.secret;
    // Verification URL
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.token}&remoteip=${req.connection.remoteAddress}`;
    // Make request to verify URL
    request(verificationUrl, (err, response, body) => {
        body = JSON.parse(body);
        // Unsuccessful
        if(body.success !== undefined && !body.success) {
            return res.json({'success': false, 'message': 'Captcha Failed'});
        }
        // Success
        // send some mail
        transporter.sendMail({
            from: 'chriswilson@annieshavens.ca',
            to: 'chriswilson@annieshavens.ca',
            replyTo: req.body.email,
            subject: 'Contact Us Submission re: ' + req.body.subject,
            text: `
                From: ${req.body.firstName} ${req.body.lastName}
                Subject: ${req.body.subject}
                Message: ${req.body.message}
            `,
            html: `
                <p><strong>Sender's Name:</strong> ${req.body.firstName} ${req.body.lastName}</p>
                <p><strong>Subject:</strong> ${req.body.subject}</p>
                <p><strong>Question:</strong><br>
                ${req.body.message}</p>
            `
        }, (err, info) => {
            if(err) {
                return res.json({'success': false, 'message': 'We had some trouble...'})
            }
            console.log(info.envelope);
            console.log(info.messageId);
            res.json({'success': true, 'delivered': true, 'message': 'Your query has been submitted.'});
            transporter.sendMail({
                from: 'chriswilson@annieshavens.ca',
                to: req.body.email,
                subject: "Annie's Havens has received your message",
                text: "Your message has been sent. Please allow up to 24-hours for a response.",
                html: `
                    <h1>Thanks for getting in touch!</h1>
                    <p>We'll do our very reply as quickly as possible. It may take up to 24-hours for us to respond.</p>
                    <p>While you're waiting, have a look at the rest of <a href="https://www.annieshavens.ca">our site</a>.</p>
                    <br><p>Sincerely,</p>
                    <p>Chris Wilson<br>Program Supervisor</p>
                `
            }, (err, info) => {
                console.log(info.envelope);
                console.log(info.messageId);
            })
        });
    })
});
app.get('/foster-parenting/foster-care-in-ontario', function (req, res) {
    res.render('foster-care-in-ontario', {data: {baseRef, css, meta: meta.fosterOntario}});
});
app.get('/foster-parenting/what-is-foster-parenting', function (req, res) {
    res.render('what-is-foster-parenting', {data: {baseRef, css, meta: meta.whatIsFosterParenting}});
});
app.get('/foster-parenting/faq', function (req, res) {
    res.render('faq', {data: {baseRef, css, meta: meta.faq}});
});
app.post('/foster-parenting/faq', function (req, res) {
    if(req.body.token === null || req.body.token === undefined || req.body.token === '') {
        return res.json({success: false, message: 'Missing Captcha Token'});
    }
    // Secret Key
    const secretKey = recaptcha.secret;
    // Verification URL
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.token}&remoteip=${req.connection.remoteAddress}`;
    // Make request to verify URL
    request(verificationUrl, (err, response, body) => {
        body = JSON.parse(body);
        // Unsuccessful
        if(body.success !== undefined && !body.success) {
            return res.json({'success': false, 'message': 'Captcha Failed'});
        }
        // Success
        // send some mail
        transporter.sendMail({
            from: 'chriswilson@annieshavens.ca',
            to: 'chriswilson@annieshavens.ca',
            replyTo: req.body.email,
            subject: 'FAQ Submission',
            text: `
                From: ${req.body.firstName} ${req.body.lastName}
                Question: ${req.body.question}
            `,
            html: `
                <p><strong>Sender's Name:</strong> ${req.body.firstName} ${req.body.lastName}</p>
                <p><strong>Question:</strong><br>
                ${req.body.question}</p>
            `
        }, (err, info) => {
            if(err) {
                return res.json({'success': false, 'message': 'We had some trouble delivering your question...'})
            }
            console.log(info.envelope);
            console.log(info.messageId);
            res.json({'success': true, 'delivered': true, 'message': 'Your question has been submitted.'});
            transporter.sendMail({
                from: 'chriswilson@annieshavens.ca',
                to: req.body.email,
                subject: "Question to Annie's Havens Submitted",
                text: "Your question has been submitted. Please allow up to 24-hours for a response.",
                html: `
                    <h1>Thanks for your question!</h1>
                    <p>We'll do our very best to answer your question as quickly as possible. It may take up to 24-hours for us to respond.</p>
                    <p>While you're waiting, have a look at the rest of <a href="https://www.annieshavens.ca">our site</a>.</p>
                    <br><p>Sincerely,</p>
                    <p>Chris Wilson<br>Program Supervisor</p>
                `
            }, (err, info) => {
                console.log(info.envelope);
                console.log(info.messageId);
            })
        });
    })
});
app.get('/foster-parenting/children-in-care', function (req, res) {
    res.render('children-in-care', {data: {baseRef, css, meta: meta.childrenInCare}});
});
app.get('/foster-parenting/family-involvement', function (req, res) {
    res.render('family-involvement', {data: {baseRef, css, meta: meta.familyInvolvement}});
});
app.get('/foster-parenting/foster-parent-application-process', function (req, res) {
    res.render('foster-parent-application-process', {data: {baseRef, css, meta: meta.fosterParentApplicationProcess}});
});
app.get('/foster-parenting/foster-home-quiz', function (req, res) {
    res.render('foster-home-quiz', {data: {baseRef, css, meta: meta.fosterHomeQuiz}});
});
app.get('/news', function (req, res) {
    res.render('news', {data: {baseRef, css, meta: meta.news}});
});
app.get('/news/urgent-need-for-foster-parents-in-ontario', function (req, res) {
    res.render('urgent-need-for-foster-parents-in-ontario', {data: {baseRef, css, meta: meta.urgentNeedForFosterParentsInOntario}});
});
// Redirect from old site links
app.get('/care-program', function (req, res) {
    return res.redirect(301, '/care-programs');
});
app.get('/care-program/mission-statement', function (req, res) {
    return res.redirect(301, '/care-programs#mission-statement');
});
app.get('/care-program/special-needs-homes', function (req, res) {
    return res.redirect(301, '/care-programs#special-needs');
});
app.get('/care-program/trauma-focused/homes', function (req, res) {
    return res.redirect(301, '/care-programs#trauma-focused');
});
app.get('/care-program/childrens-aid-service-partners', function (req, res) {
    return res.redirect(301, '/referral-sources');
});
app.get('/care-program/service-regions', function (req, res) {
    return res.redirect(301, '/service-area');
});
app.get('/becoming-foster-parent/faq', function (req, res) {
    return res.redirect(301, '/foster-parenting/faq');
});
app.get('/becoming-foster-parent/do-i-qualify', function (req, res) {
    return res.redirect(301, '/foster-parenting/foster-home-quiz');
});
app.get('/becoming-foster-parent/children-in-care', function (req, res) {
    return res.redirect(301, '/foster-parenting/children-in-care');
});
app.get('/becoming-foster-parent/what-is-foster-parenting', function (req, res) {
    return res.redirect(301, '/foster-parenting/what-is-foster-parenting');
});
app.get('/becoming-foster-parent/family-involvement', function (req, res) {
    return res.redirect(301, '/foster-parenting/family-involvement');
});
app.get('/becoming-foster-parent/application-process', function (req, res) {
    return res.redirect(301, '/foster-parenting/foster-parent-application-process');
});
app.get('/our-story', function (req, res) {
    return res.redirect(301, '/about-us');
});
app.get('/contact', function (req, res) {
    return res.redirect(301, '/contact-us');
});
app.get('/urgent-need-for-foster-parents', function (req, res) {
    return res.redirect(301, '/news/urgent-need-for-foster-parents-in-ontario');
});
// Page Not Found
app.get('*', function (req, res) {
    res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>404 Page Not Found</title>
            <style>
                .error {
                    width: 100vw;
                    height: 100vh;
                }
                h1 {
                    font-family: sans-serif;
                    text-align: center;
                }
                p {
                    font-family: sans-serif;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>Page Not Found</h1>
                <p>Redirecting in <span class="timer">3</span></p>
            </div>
            <script>
                const timer = document.querySelector('.timer');
                let countdown = 3;
                setInterval(()=>{
                    countdown--;
                    timer.innerHTML = countdown;
                }, 1000);
                setTimeout(()=> {
                    window.history.back();
                }, 2900);
            </script>
        </body>
        </html>
    `);
});

 
app.listen(3000, function() {
    console.log(`Server started on port ${PORT}`);
});