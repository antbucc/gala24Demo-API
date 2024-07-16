const express = require('express');
const { MongoClient } = require('mongodb');

const cors = require('cors');
require('dotenv').config();



const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5002; 


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
const actionsCollection = database.collection('actions');



// SET OF THE BACKEND APIs
// Endpoint to save a new learning activity pair for a specific topic
app.post('/save-activity', async (req, res) => {
  const { topic, learningObjective, activityType, assignment, correctSolutions, distractors, easilyDiscardableDistractors, feedback, readingMaterial, level } = req.body;
  
  const newActivity = {     
    readingMaterial: readingMaterial,
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
    learningActivity.activities.push(newActivity);

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
    const response = { topics: activities };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).send('Error fetching activities');
  }
});

const { ObjectId } = require('mongodb');

const { ObjectId } = require('mongodb');

// Endpoint to save a student's action
app.post('/save-student-action', async (req, res) => {
  const { studentID, topicID, answer, correct } = req.body;

  if (typeof studentID !== 'string' || typeof topicID !== 'string' || typeof answer !== 'string' || typeof correct !== 'boolean') {
    return res.status(400).send('Invalid input types');
  }

  const newResponse = {
    responseID: new ObjectId(),  // Generate a new ObjectId for the responseID
    topicID: topicID,
    answer: answer,
    correct: correct,
    timestamp: new Date()  // Add the current date and time
  };

  try {
    // Find the student data by studentID
    let studentData = await actionsCollection.findOne({ studentID: studentID });

    if (!studentData) {
      // If no document is found, create a new one
      studentData = { studentID: studentID, responses: [] };
    }

    // Add the new response to the responses array
    studentData.responses.push(newResponse);

    // Update or insert the document
    await actionsCollection.updateOne(
      { studentID: studentID },
      { $set: studentData },
      { upsert: true }
    );

    res.status(201).send('Student action saved successfully');
  } catch (error) {
    console.error('Error saving student action:', error);
    res.status(500).send('Internal server error');
  }
});


// Endpoint to retrieve the actions of all students
app.get('/student-actions', async (req, res) => {
  try {
    // Retrieve all student actions from the collection
    const studentActions = await actionsCollection.find({}).toArray();

    res.status(200).json(studentActions);
  } catch (error) {
    console.error('Error retrieving student actions:', error);
    res.status(500).send('Internal server error');
  }
});





app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
