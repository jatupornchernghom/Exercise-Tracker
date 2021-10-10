require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

const mongoose = require('mongoose');
const { Schema } = mongoose;
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const personSchema = new Schema({
  username:  { type: String, required: true },
  count: Number,
  log: [Object]
});

const Person = mongoose.model('Person', personSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  Person.find({}, (error, personsFound) => {
    if (error) {
      return console.log(error);
    }
    const list = personsFound.map(object => {
      const {_id, username} = object;
      return {_id, username};
    });
    res.json(list);
  });
});

app.post('/api/users', (req, res) => {
  const {username} = req.body;
  const person = new Person({username});
  person.save((error, data) => {
    if (error) {
      return console.error(error);
    }
    const {_id} = data;
    res.json({username, _id});
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const {_id} = req.params;
  const {description, duration, date} = req.body;
  const dateString = date
    ? new Date(date).toDateString() : new Date().toDateString();
  const durationNumber = Number(duration);
  const newLog = {description, duration: durationNumber, 'date': dateString};
  Person.findById(_id, (error, personFound) => {
    if (!personFound) {
      res.setHeader('Content-Type', 'text/plain');
      res.write('error');
      return res.end();
    }
    personFound.log.push(newLog);
    personFound.save((error, updatedPerson) => {
      if(error) {
        return console.log(error);
      }
      const {username} = updatedPerson;
      const response = {
        _id, username, date: dateString, duration: durationNumber, description
      };
      res.json(response);
    });
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const {from, to, limit = 0} = req.query;
  const {_id} = req.params;
  Person.findById(_id, (error, personFound) => {
    if (!personFound) {
      res.setHeader('Content-Type', 'text/plain');
      res.write('error');
      return res.end();
    }
    const {username, log} = personFound;
    if (!from && !to) {
      const limitedLog = !limit
        ? log : log.filter((object, index) => index < limit);
      const count = limitedLog.length;
      return res.json({_id, username, from, to, count, log: limitedLog});
    }
    const min = new Date(from).valueOf();
    const max = new Date(to).valueOf();
    const limitedLog = log.filter(object => {
      const {date} = object;
      const value = new Date(date).valueOf();
      const pass = value >= min && value <= max;
      return pass;
    }).filter((value, index) => {
      return !limit ? value : index < limit;
    });
    const count = limitedLog.length;
    return res.json({
      _id, username, from: new Date(from).toDateString(),
      to: new Date(to).toDateString(), count, log: limitedLog
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})