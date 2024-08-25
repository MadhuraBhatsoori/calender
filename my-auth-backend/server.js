const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 5000;

const anthropic = new Anthropic({
  apiKey: 'ANTHROPIC_API_KEY',
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect('mongodb://localhost:27017/calendar', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
});

 
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true }, 
  image: String,
  imageAnalysis: String,
});

const Event = mongoose.model('Event', eventSchema);

app.get('/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).send('Error fetching events');
  }
});

app.post('/events', upload.single('image'), async (req, res) => {
  try {
    console.log('Received event data:', req.body);
    let { title, date } = req.body; 
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    let imageAnalysis = null;
    if (imageUrl) {
      imageAnalysis = await analyzeImageWithClaude(req.file.path);
      console.log('Image Analysis Result:', imageAnalysis);

      const analysisResult = JSON.parse(imageAnalysis);
      title = analysisResult.title;
      
       
      const parsedDate = new Date(analysisResult.date);
      parsedDate.setDate(parsedDate.getDate());  
      date = parsedDate.toISOString().split('T')[0];  
    } else {
      if (!title || !date) {
        return res.status(400).json({ error: 'Missing required event information' });
      }
     
      date = new Date(date).toISOString().split('T')[0];
    }

    const newEvent = new Event({
      title,
      date,
      image: imageUrl,
      imageAnalysis
    });

    console.log('New event object:', newEvent);

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).send('Error creating event');
  }
});

app.delete('/events/:id', async (req, res) => {
  try {
    const result = await Event.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).send('Event not found');
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).send('Error deleting event');
  }
});

async function analyzeImageWithClaude(imagePath) {
  try {
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

    const messages = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imageBase64
            }
          },
          {
            type: "text",
            text: "Extract the event title and date from this image. Provide ONLY a JSON object with keys 'title' and 'date'. The date should be in the format YYYY-MM-DD. Do not include any other text in your response."
          }
        ]
      }
    ];

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: messages
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Error in Claude API call:', error);
    throw error;
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});