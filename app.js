const express = require('express');
const app = express();

app.use(express.static('public', { hidden: true }));
app.listen(process.env.PORT || 8080);