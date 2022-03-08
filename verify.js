const express = require('express');
const app = express();
app.use(express.json());
app.post('/slack/events', (req, res) => {
    res.send({
        challenge: req.body.challenge
    })
});
app.listen(3000, () => {
    console.log(`Listening`);
});