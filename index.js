require('dotenv').config();

const http = require('http');
const express = require('express');
const session = require('express-session');
const { MessagingResponse } = require('twilio').twiml;
const bodyParser = require('body-parser');

const mysql = require('promise-mysql');
const moment = require('moment');

const Cryptr = require('cryptr');

const app = express();

console.log('ENV', process.env);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SESSION_SECRET }));

const cryptr = new Cryptr(process.env.ENCRYPT_SECRET);

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

const pool = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: 'utc', // <-here this line was missing,
    connectionLimit: 10,
  });
  // .then(function(returned_conn) {
  //  console.log("Connected!");
  //  con = returned_conn;
  // })
  // .catch(function(error) {
  //  console.log(error);
  //  // if (connection && connection.end) connection.end();
  //  //logs out the error
  // });


const loadResponseIntoDatabase = function (datetime, type, route, stop, phone_hash, phone_city, phone_state, phone_zip, followup) {
  const datetime_for_sql = moment.utc(datetime).format('YYYY-MM-DD HH:mm:ss');

  const sql = `
    INSERT INTO busalert_user_response (datetime, type, route, stop, phone_hash, phone_city, phone_state, phone_zip, followup) 
    VALUES ('${datetime_for_sql}', '${type}', '${route}', ${stop}, '${phone_hash}', '${phone_city}', '${phone_state}', '${phone_zip}', ${followup} )
  `;
  console.log(sql);

  return pool
    .query(sql)
    .then((result) => {
      console.log(result);
      if (result && result.length == 1) {
        // console.log('Success');
      } else {
        // console.log('BAD CHECK SQL RESULT');
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

// loadResponseIntoDatabase(moment(), 'LATE', 'W1', 123, 0);

app.post('/', (req, res) => {
  const smsCount = req.session.counter || 0;
  const lastMessage = req.session.lastMessage || '';
  const step = req.session.step || 0;
  const type = req.session.type || '';

  let message = '';

  const twiml = new MessagingResponse();

  console.log('message received', req.body);
  console.log('current session', req.session);

  if (step === 0) {
    req.body.Body = req.body.Body.toUpperCase();
    if (req.body.Body === 'NOBUS') {
      message = 'Thank you for letting us know! Is your bus late, did you see it arrive and leave early, or did it just pass you by? Please reply with LATE, EARLY, or PASS.';
      req.session.step = 1;
      req.session.start_time = moment();
      req.session.phone_hash = cryptr.encrypt(req.body.From);
      req.session.phone_city = req.body.FromCity;
      req.session.phone_state = req.body.FromState;
      req.session.phone_zip = req.body.FromZip;
    } else {
      message = 'I did not understand that response. Please text NOBUS to get started.';
    }
  } else if (step === 1) {
    req.body.Body = req.body.Body.toUpperCase();
    if (req.body.Body === 'LATE') {
      message = 'What stop are you at? The bus stop sign should have a 3-digit number on it. Please type that number.';
      req.session.type = req.body.Body;
      req.session.step = 2;
    } else if (req.body.Body === 'EARLY') {
      message = 'What stop are you at? The bus stop sign should have a 3-digit number on it. Please type that number.';
      req.session.type = req.body.Body;
      req.session.step = 2;
    } else if (req.body.Body === 'PASS') {
      message = 'What stop are you at? The bus stop sign should have a 3-digit number on it. Please type that number.';
      req.session.type = req.body.Body;
      req.session.step = 2;
    } else {
      message = "I'm sorry, I didn't understand that response.\n\n Is your bus late, did you see it arrive and leave early, or did it just pass you by? Please reply with LATE, EARLY, or PASS.";
    }
  } else if (step === 2) {
    // console.log(req.body.Body, req.body.Body.length, isNumeric(req.body.Body));
    if (req.body.Body.length === 3 && isNumeric(req.body.Body)) {
      message = 'What bus route were you trying to take?';
      req.session.stop = req.body.Body;
      req.session.step = 3;
    } else {
      message = "I'm sorry, I didn't understand that response.\n\n What stop are you at? The bus stop sign should have a 3-digit number on it. Please type that number.";
    }
  } else if (step === 3) {
    if (req.body.Body.length > 1) {
      message = "Thank you! We'll use your replies to help hold the bus company accountable for better service. For more information, please check the Better Buses Together group on Facebook.\n\n https://www.facebook.com/groups/130601857706447/";
      req.session.route = req.body.Body;
      req.session.step = 0;

      loadResponseIntoDatabase(
        req.session.start_time,
        req.session.type,
        req.session.route,
        req.session.stop,
        req.session.phone_hash,
        req.session.phone_city,
        req.session.phone_state,
        req.session.phone_zip,
        0,
      );
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
