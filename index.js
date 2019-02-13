const http = require('http');
const express = require('express');
const session = require('express-session');
const { MessagingResponse } = require('twilio').twiml;
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: '$asdfl;kjas43asdfggcxbverwerF%;fkasdfl' }));

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

app.get('/healthcheck', async (req, res) => {
  res.send('All Good');
});

app.post('/', (req, res) => {
  const smsCount = req.session.counter || 0;
  const lastMessage = req.session.lastMessage || '';
  const step = req.session.step || 0;
  const type = req.session.type || '';

  let message = '';

  const twiml = new MessagingResponse();

  console.log('message received', req.body);


  if (step === 0) {
    req.body.Body = req.body.Body.toUpperCase();
    if (req.body.Body === 'NOBUS') {
      message = 'Thank you for letting us know! Is your bus late, did you see it arrive and leave early, or did it just pass you by? Please reply with LATE, EARLY, or PASS.';
      req.session.step = 1;
    } else {
      message = 'I did not understand that response. Please text NOBUS to get started.';
    }
  } else if (step === 1) {
    req.body.Body = req.body.Body.toUpperCase();
    if (req.body.Body === 'LATE') {
      message = 'What stop are you at? The bus stop sign should have a 5-digit number on it. Please type that number.';
      req.session.type = req.body.Body;
      req.session.step = 2;
    } else if (req.body.Body === 'EARLY') {
      message = 'What stop are you at? The bus stop sign should have a 5-digit number on it. Please type that number.';
      req.session.type = req.body.Body;
      req.session.step = 2;
    } else if (req.body.Body === 'PASS') {
      message = 'What stop are you at? The bus stop sign should have a 5-digit number on it. Please type that number.';
      req.session.type = req.body.Body;
      req.session.step = 2;
    } else {
      message = "I'm sorry, I didn't understand that response.\n\n Is your bus late, did you see it arrive and leave early, or did it just pass you by? Please reply with LATE, EARLY, or PASS.";
    }
  } else if (step === 2) {
    // console.log(req.body.Body, req.body.Body.length, isNumeric(req.body.Body));
    if (req.body.Body.length == 5 && isNumeric(req.body.Body)) {
      message = 'What bus route were you trying to take?';
      req.session.stop = req.body.Body;
      req.session.step = 3;
    } else {
      message = "I'm sorry, I didn't understand that response.\n\n What stop are you at? The bus stop sign should have a 5-digit number on it. Please type that number.";
    }
  } else if (step === 3) {
    if (req.body.Body.length > 1) {
      message = "Thank you! We'll use your replies to help hold the bus company accountable for better service. For more information, please check the Better Buses Together group on Facebook.\n\n https://www.facebook.com/groups/130601857706447/";
      req.session.route = req.body.Body;
      req.session.step = 0;
    } else {
      message = "I'm sorry, I didn't understand that response.\n\n What bus route were you trying to take?";
    }
  }

  req.session.counter = smsCount + 1;

  // const nextLast = message;

  // message += `\nStep:\n${req.session.step}`;
  // message += `\nType:\n${req.session.type}`;
  // message += `\nRoute:\n${req.session.route}`;
  // message += `\nStop:\n${req.session.stop}`;
  // message += `\nLastMessage:\n${lastMessage}`;
  // req.session.lastMessage = nextLast;

  twiml.message(message);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

http.createServer(app).listen(1337, () => {
  console.log('Express server listening on port 1337');
});
