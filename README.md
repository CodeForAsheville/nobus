# nobus

A simple system that allows Asheville residents to record when a bus does not arrive on time. 

This system is SMS-based, using Twilio for conversational communication with the user. Data is then recorded in a SQL database. 

If you need database access, please contact Patrick Conant on Slack or via email (patrick@prcapps.com). 

# Installation

1. Clone this repository
2. Install dependencies `yarn install`
3. Run it! `yarn start`

This will run the server on localhost, port 1337. To get it to work with Twilio, you'll need to use ngrok to route messages to your machine. 
