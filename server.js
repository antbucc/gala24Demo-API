const express = require('express');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');  

const cors = require('cors');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

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
const learningNodeStatusesCollection = database.collection('learningNodeStatuses');
const adaptationsCollection = database.collection('adaptations');
const questionsCollection = database.collection('questions');
const skillsCollection = database.collection('skills');


// SET OF THE BACKEND APIs
// Endpoint to save a new learning activity pair for a specific topic
app.post('/save-activity', async (req, res) => {
  const { topic, learningObjective, activityType, assignment, correctSolutions, distractors, easilyDiscardableDistractors, feedback, readingMaterial, bloomLevel, skillIDs } = req.body;

  const newActivity = {
    id: uuidv4(), // Generate a unique ID
    readingMaterial: readingMaterial,
    learningObjective: learningObjective,
    activityType: activityType,
    assignment: assignment,
    correctSolutions: correctSolutions,
    distractors: distractors,
    easilyDiscardableDistractors: easilyDiscardableDistractors,
    feedback: feedback,
    bloomLevel: bloomLevel,
    skillIDs: skillIDs
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


// endpoint to save topics
app.post('/save-topics', async (req, res) => {
  const { materialUrl, themeName, topics } = req.body;
  try {
      const existingTheme = await topicsCollection.findOne({ themeName });
      if (existingTheme) {
          // Update the existing document with new topics
          const result = await topicsCollection.updateOne(
              { themeName },
              { $set: { materialUrl, topics } }
          );
          res.status(200).send(result);
      } else {
          // Insert a new document
          const result = await topicsCollection.insertOne({ materialUrl, themeName, topics });
          res.status(201).send(result);
      }
  } catch (error) {
      console.error('Error saving topics:', error);
      res.status(500).send('Error saving topics');
  }
});



// Endpoint to get all the skills
app.get('/skills', async (req, res) => {
  try {
    const skills = await skillsCollection.find().toArray();
    const response = { skills };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).send('Error fetching skills');
  }
});



// Endpoint to get topics for a certain theme
app.get('/get-topics', async (req, res) => {
  const { themeName } = req.query;
  try {
    const topics = await topicsCollection.find({ themeName }).toArray();
    if (topics.length > 0) {
      res.status(200).json(topics);
    } else {
      res.status(404).send('No topics found for the specified theme');
    }
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).send('Error fetching topics');
  }
});

// Endpoint to get all quizzes
app.get('/questions', async (req, res) => {
  try {
    const questions = await activitiesCollection.find().toArray();

    // Extract activities from each question
    const activities = questions.flatMap(question => question.activities);

    const response = { activities };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).send('Error fetching questions');
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





// Endpoint to save the learning node status for a student
app.post('/learning-node-status', async (req, res) => {
  const { studentID, eligible, currentTopic, currentBloomLevel } = req.body;

  if (typeof studentID !== 'string' || typeof eligible !== 'boolean' || typeof currentTopic !== 'string' || typeof currentBloomLevel !== 'string') {
    return res.status(400).send('Invalid input types');
  }

  const learningNodeStatus = {
    studentID: studentID,
    eligible: eligible,
    currentTopic: currentTopic,
    currentBloomLevel: currentBloomLevel,
    timestamp: new Date()  // Add the current date and time
  };

  try {
    // Update or insert the learning node status for the student
    await learningNodeStatusesCollection.updateOne(
      { studentID: studentID },
      { $set: learningNodeStatus },
      { upsert: true }
    );

    res.status(201).send('Learning node status saved successfully');
  } catch (error) {
    console.error('Error saving learning node status:', error);
    res.status(500).send('Internal server error');
  }
});

// Endpoint to retrieve the list of eligible students
app.get('/eligible-students', async (req, res) => {
  try {
    // Retrieve all eligible students from the collection
    const eligibleStudents = await learningNodeStatusesCollection.find({ eligible: true }).toArray();

    res.status(200).json(eligibleStudents);
  } catch (error) {
    console.error('Error retrieving eligible students:', error);
    res.status(500).send('Internal server error');
  }
});


// Endpoint to save a student's action
app.post('/save-student-action', async (req, res) => {
  const { studentID, topicID, question, questionID, answer, correct } = req.body;

  // Validate input types
  if (typeof studentID !== 'string' || typeof topicID !== 'string' || typeof question !== 'string' || typeof questionID !== 'string' || typeof answer !== 'string' || typeof correct !== 'boolean') {
    return res.status(400).send('Invalid input types');
  }

  try {
    // Convert questionID to ObjectId
    const questionObjectId = new ObjectId(questionID);

    // Fetch the question from the database to get the SkillIDs
    const questionData = await questionsCollection.findOne({ _id: questionObjectId });

    if (!questionData) {
      return res.status(404).send('Question not found');
    }

    const newResponse = {
      responseID: new ObjectId(),  // Generate a new ObjectId for the responseID
      topicID: topicID,
      question: question,
      questionID: questionID,
      answer: answer,
      correct: correct,
      SkillIDs: questionData.SkillIDs || [],  // Fetch the SkillIDs from the question data
      timestamp: new Date()  // Add the current date and time
    };

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


app.get('/firstActivity/:skillID', async (req, res) => {
  const { skillID } = req.params;

  try {
    // Fetch all documents and filter activities based on skillID
    const activitiesDocs = await activitiesCollection.find({}, { projection: { activities: 1 } }).toArray();

    if (activitiesDocs && activitiesDocs.length > 0) {
      let filteredActivities = [];

      // Iterate over all documents to filter activities
      activitiesDocs.forEach(doc => {
        filteredActivities = filteredActivities.concat(doc.activities.filter(activity => activity.skillIDs.includes(skillID)));
      });

      if (filteredActivities.length > 0) {
        // Select one activity randomly
        const randomActivity = filteredActivities[Math.floor(Math.random() * filteredActivities.length)];

        // Return the selected activity 
        res.status(200).json({ activity: randomActivity });
      } else {
        res.status(404).send('No activities found with the specified skillID');
      }
    } else {
      res.status(404).send('No activities found');
    }
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).send('Error fetching activities');
  }
});

// Endpoint to get the next 3 activities for a student
app.get('/next-activities/:studentID', async (req, res) => {
  const { studentID } = req.params;

  try {
    // Fetch the student's adaptation record
    const adaptation = await adaptationsCollection.findOne({ studentID });

    if (adaptation) {
      const { adaptationType, adaptationValue } = adaptation;

      if (adaptationType === 'change topic') {
        // Fetch activities for the assigned topic
        const activitiesDoc = await activitiesCollection.findOne({ topic: adaptationValue }, { projection: { _id: 1, topic: 1, activities: 1 } });

        if (activitiesDoc && activitiesDoc.activities) {
          const firstThreeActivities = activitiesDoc.activities.slice(0, 3);
          res.status(200).json({
            _id: activitiesDoc._id,
            topic: activitiesDoc.topic,
            activities: firstThreeActivities
          });
        } else {
          res.status(404).send('No activities found for the specified topic');
        }
      } else if (adaptationType === 'increase bloom level') {
        // Fetch activities for the assigned bloom level
        const activities = await activitiesCollection.find({ 'activities.bloomLevel': adaptationValue }).toArray();
        const filteredActivities = activities.flatMap(doc => doc.activities.filter(activity => activity.bloomLevel === adaptationValue));
        const firstThreeActivities = filteredActivities.slice(0, 3);
        
        res.status(200).json({
          studentID: studentID,
          activities: firstThreeActivities
        });
      }
    } else {
      // Student is not in the list of adaptations, proceed with the next topic
      const studentStatus = await learningNodeStatusesCollection.findOne({ studentID });

      if (!studentStatus) {
        return res.status(404).send('Student status not found');
      }

      const currentTopic = studentStatus.currentTopic;
      const nextTopicDoc = await topicsCollection.findOne({ topics: { $elemMatch: { $gt: currentTopic } } }, { projection: { topics: 1 } });

      if (nextTopicDoc && nextTopicDoc.topics) {
        const nextTopicIndex = nextTopicDoc.topics.indexOf(currentTopic) + 1;
        const nextTopic = nextTopicDoc.topics[nextTopicIndex];

        if (nextTopic) {
          const activitiesDoc = await activitiesCollection.findOne({ topic: nextTopic }, { projection: { _id: 1, topic: 1, activities: 1 } });

          if (activitiesDoc && activitiesDoc.activities) {
            const firstThreeActivities = activitiesDoc.activities.slice(0, 3);
            res.status(200).json({
              _id: activitiesDoc._id,
              topic: activitiesDoc.topic,
              activities: firstThreeActivities
            });
          } else {
            res.status(404).send('No activities found for the specified topic');
          }
        } else {
          res.status(404).send('No next topic found');
        }
      } else {
        res.status(404).send('No next topic found');
      }
    }
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).send('Error fetching activities');
  }
});




// Endpoint to save adaptations for the eligible and selected students 
app.post('/save-adaptations', async (req, res) => {
  const { adaptations } = req.body;

  if (!Array.isArray(adaptations)) {
    return res.status(400).send('Invalid input type: adaptations should be an array');
  }

  const validAdaptations = adaptations.every(adaptation => 
    typeof adaptation.studentID === 'string' && 
    typeof adaptation.adaptationType === 'string' && 
    typeof adaptation.adaptationValue === 'string'
  );

  if (!validAdaptations) {
    return res.status(400).send('Invalid input: each adaptation should have studentID, adaptationType, and adaptationValue as strings');
  }

  try {
    const result = await Promise.all(adaptations.map(async adaptation => {
      const { studentID, adaptationType, adaptationValue } = adaptation;
      const adaptationRecord = {
        studentID,
        adaptationType,
        adaptationValue,
        timestamp: new Date() // Add the current date and time
      };

      // Insert the adaptation record into the collection
      return await adaptationsCollection.insertOne(adaptationRecord);
    }));

    res.status(201).send('Adaptations saved successfully');
  } catch (error) {
    console.error('Error saving adaptations:', error);
    res.status(500).send('Internal server error');
  }
});






app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
