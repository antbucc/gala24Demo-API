const express = require('express');
const { MongoClient } = require('mongodb');

const cors = require('cors');
require('dotenv').config();



const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5001; 


const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

//DB Connection
client.connect(err => {
  if (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }  
});

const database = client.db('GALA2024');
const activitiesCollection = database.collection('activities');
const topicsCollection = database.collection('topics');



// SET OF THE BACKEND APIs
// Endpoint to save a new learning activity pair for a specific topic
app.post('/save-activity', async (req, res) => {
 // console.log(JSON.stringify(req.body));
  const { topic, learningObjective, activityType, assignment, correctSolutions, distractors, easilyDiscardableDistractors, feedback, readingMaterial, level } = req.body;
  
  const quiz =
{   
      learningObjective: learningObjective,
      activityType: activityType,
      assignment: assignment,
      correctSolutions: correctSolutions,
      distractors: distractors,
      easilyDiscardableDistractors: easilyDiscardableDistractors,
      feedback: feedback,
      level: level,
  };

  

  try {

    // Find the learning activity by topic
    let learningActivity = await activitiesCollection.findOne({ topic: topic });

    if (!learningActivity) {
      // If no document is found, create a new one
      learningActivity = { topic: topic, activities: [] };
    }

    // Add the new activity to the activities array
    learningActivity.activities.push({
      readingMaterial: readingMaterial,
      activity: quiz
    });

    // Update or insert the document
    await activitiesCollection.updateOne(
      { topic: topic },
      { $set: learningActivity },
      { upsert: true }
    );

    res.status(201).send('Learning activity saved successfully');
  } catch (error) {
    console.error('Error saving learning activity:', error);
    res.status(500).send('Internal server error');
  }
});

// endpoint to save material and topics
app.post('/save-topics', async (req, res) => {
    const { materialUrl, themeName, topics } = req.body;
    try {
      const result = await topicsCollection.insertOne({ materialUrl, themeName, topics });
      res.status(201).send(result);
    } catch (error) {
      console.error('Error saving topics:', error);
      res.status(500).send('Error saving topics');
    }
  });

// Endpoint to get all activities
app.get('/get-activities', async (req, res) => {
  try {
    const activities = await activitiesCollection.find().toArray();
    res.status(200).json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).send('Error fetching activities');
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
