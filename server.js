
const express = require('express');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');  

const axios = require('axios');

const cors = require('cors');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

let diagnose = null; // Global variable to store the diagnosis data




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
const difficultiesCollection = database.collection('difficulties');


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
    //const questionObjectId = new ObjectId(questionID);


    // Fetch the question from the database to get the SkillIDs
   const questionData = await activitiesCollection.findOne({
  activities: {
    $elemMatch: {
      id: questionID
    }
  }
});




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
      SkillIDs: questionData.activities[0].skillIDs || [],  // Fetch the SkillIDs from the question data
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


// Endpoint to get logs of all actions done by students
app.get('/student-actions', async (req, res) => {
  try {
      const actions = await actionsCollection.find({}).toArray();
      res.json(actions);
  } catch (error) {
      console.error('Error retrieving student actions:', error);
      res.status(500).send('Internal server error');
  }
});

// Endpoint to get logs of all actions done by students
app.get('/students-logs', async (req, res) => {
  try {
      const actions = await actionsCollection.find({}).toArray();

      const results = actions.flatMap(action => 
          action.responses.map(response => ({
              studentID: action.studentID,
              questionID: response.questionID,
              response: response.correct ? 'True' : 'False'
          }))
      );

      res.json(results);
  } catch (error) {
      console.error('Error retrieving student actions:', error);
      res.status(500).send('Internal server error');
  }
});



app.get('/firstActivity', async (req, res) => {
  // returns the first activity in the "Plastic" Skill
  const skillID  = "66ab571cc92cc90278b759a1";

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

// Route to get the next activity for a single student ID
app.post('/next-activity/:studentID', async (req, res) => {
  const { studentID } = req.params;

  if (!studentID || typeof studentID !== 'string') {
    return res.status(400).json({ error: 'Invalid input: studentID is required and should be a string' });
  }

  console.log("Received student ID:", studentID);

  try {
    // Step 1: Fetch the current idealDifficulty for the student from the database
    const studentRecord = await difficultiesCollection.findOne({ studentID });

    let threshold;
    
    if (!studentRecord) {
      console.log(`No record found for studentID: ${studentID}. Using default threshold: 5.0`);
      threshold = 5.0; // Use default threshold if no record is found
    } else {
      threshold = studentRecord.idealDifficulty;
      console.log(`Using idealDifficulty for student ${studentID}: ${threshold}`);
    }

    // Step 2: Call the train API
    const trainData = await Train();
    console.log("Train:", JSON.stringify(trainData));

    // Step 3: Call the diagnosis API
    const diagnoseData = await Diagnose([studentID]); // Wrap studentID in an array for compatibility
    console.log("Diagnosis API Response Data:", JSON.stringify(diagnoseData));

    // Step 4: Identify the weakest skill for the student
    const skills = diagnoseData[0].skills;

    // Find the skill with the lowest value
    const weakestSkill = Object.keys(skills).reduce((a, b) => skills[a] < skills[b] ? a : b);

    const recommendationsInput = [
      {
        studentID,
        skill: weakestSkill,
        threshold: threshold // Use the threshold from the DB or default value
      }
    ];

    console.log("Recommendations Input:", JSON.stringify(recommendationsInput));

    // Step 5: Call the recommend API
    const recommendResponse = await axios.post('https://gala24-cogdiagnosis-production.up.railway.app/recommend', recommendationsInput);
    console.log("Recommend API Response Status:", recommendResponse.status);
    console.log("Recommend API Response Data:", JSON.stringify(recommendResponse.data));

    const recommendation = recommendResponse.data[0]; // Assuming the response is an array with one recommendation
    const activityID = recommendation.recommendations[0].activity; // Assuming the first recommendation contains an activityID

    // Step 6: Retrieve the activity document from the database using the activityID
    const activitiesDocs = await activitiesCollection.find({}, { projection: { activities: 1 } }).toArray();

    // Find the activity within the retrieved documents
    const activity = activitiesDocs.flatMap(doc => doc.activities).find(act => act.activityID === activityID);

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Step 7: Return the activity to the client
    res.status(200).json({ activity });

  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Error Response Status:", error.response.status);
      console.error("Error Response Data:", JSON.stringify(error.response.data));
    }
    res.status(500).json({ error: "An error occurred while processing your request." });
  }
});




const Diagnose = async (studentIDs) => {
  const apiClient = axios.create({
    baseURL: 'https://gala24demo-api-production.up.railway.app/',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  try {
    const response = await apiClient.post('/diagnose', { studentID: studentIDs });
    console.log("Diagnosis API Response:", response.data);
    return response.data; // Return the API response data
  } catch (error) {
    if (error.response) {
      console.error('Server responded with a status other than 2xx:', error.response.statusText);
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
      
      throw {
        message: 'Server Error',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      console.error('No response received:', error.request);
      console.error('Request details:', error.config);
      
      throw {
        message: 'No response received from server',
        request: error.request,
      };
    } else {
      console.error('Error setting up request:', error.message);
      
      throw {
        message: 'Request setup error',
        error: error.message,
      };
    }
  }
};

const Train = async () => {
  const apiClient = axios.create({
    baseURL: 'https://gala24demo-api-production.up.railway.app/',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  try {
    const response = await apiClient.get('/train');
    console.log("Train API Response:", response.data);
    return response.data; // Return the API response data
  } catch (error) {
    if (error.response) {
      console.error('Server responded with a status other than 2xx:', error.response.statusText);
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
      
      throw {
        message: 'Server Error',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      console.error('No response received:', error.request);
      console.error('Request details:', error.config);
      
      throw {
        message: 'No response received from server',
        request: error.request,
      };
    } else {
      console.error('Error setting up request:', error.message);
      
      throw {
        message: 'Request setup error',
        error: error.message,
      };
    }
  }
};

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


// Endpoint to save or update difficulties with studentID and idealDifficulty
app.post('/save-difficulties', async (req, res) => {
  const { difficulties } = req.body;

  // Validate that `difficulties` is an array
  if (!Array.isArray(difficulties)) {
    return res.status(400).send('Invalid input type: difficulties should be an array');
  }

  // Validate each difficulty object
  const validDifficulties = difficulties.every(difficulty => 
    typeof difficulty.studentID === 'string' && 
    typeof difficulty.idealDifficulty === 'number'
  );

  if (!validDifficulties) {
    return res.status(400).send('Invalid input: each difficulty should have studentID as a string and idealDifficulty as a number');
  }

  try {
    const result = await Promise.all(difficulties.map(async difficulty => {
      const { studentID, idealDifficulty } = difficulty;
      const difficultyRecord = {
        studentID,
        idealDifficulty,
        timestamp: new Date() // Add the current date and time
      };

      // Check if a difficulty for this studentID already exists
      const existingRecord = await difficultiesCollection.findOne({ studentID });

      if (existingRecord) {
        // Update the existing record with the new idealDifficulty and timestamp
        return await difficultiesCollection.updateOne(
          { studentID },
          { $set: difficultyRecord }
        );
      } else {
        // Insert a new record if no existing record is found
        console.log("here we define a new entry");
        return await difficultiesCollection.insertOne(difficultyRecord);
      }
    }));

    res.status(201).send('Difficulties saved or updated successfully');
  } catch (error) {
    console.error('Error saving difficulties:', error);
    res.status(500).send('Internal server error');
  }
});



// API client configuration for cognitive services
const apiClient = axios.create({
  baseURL: 'https://gala24-cogdiagnosis-production.up.railway.app',
  headers: {
    'Content-Type': 'application/json',
  }
});


// Endpoint to trigger model training
app.get('/train', async (req, res) => {
  try {
    console.log("Sending request to train model...");
    const response = await apiClient.get('/train'); // Using relative path since baseURL is set
    console.log("Model training successful:", response.data);
    
    // Send the successful response data back to the client
    res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      console.error('Server responded with a status other than 2xx:', error.response.statusText);
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
      
      // Send the error response back to the client
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
      console.error('Request details:', error.config);
      
      // Send a 500 status with a custom message back to the client
      res.status(500).send('No response received from the API');
    } else {
      console.error('Error setting up request:', error.message);
      
      // Send a 500 status with the error message back to the client
      res.status(500).send('Error setting up request: ' + error.message);
    }
  }
});

// Endpoint to execute a diagnose with the provided student IDs
app.post('/diagnose', async (req, res) => {
  const { studentID } = req.body;
  

  // Validate that studentID is an array
  if (!Array.isArray(studentID)) {
    return res.status(400).send('Invalid input: studentID should be an array');
  }

  try {
    console.log("Sending diagnose request for student IDs:", studentID);
    
    // Send the POST request to the external API with the student IDs
    const response = await apiClient.post('/diagnose', { studentID });

    console.log("Diagnose successful:", response.data);

    // Send the successful response data back to the client
    res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      console.error('Server responded with a status other than 2xx:', error.response.statusText);
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
      
      // Send the error response back to the client
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
      console.error('Request details:', error.config);
      
      // Send a 500 status with a custom message back to the client
      res.status(500).send('No response received from the API');
    } else {
      console.error('Error setting up request:', error.message);
      
      // Send a 500 status with the error message back to the client
      res.status(500).send('Error setting up request: ' + error.message);
    }
  }
});


// Endpoint to get recommendations based on provided student skill thresholds
app.post('/recommend', async (req, res) => {
  const recommendationsRequest = req.body;


  // Validate that the request body is an array of objects
  if (!Array.isArray(recommendationsRequest) || recommendationsRequest.some(item => typeof item !== 'object')) {
    return res.status(400).send('Invalid input: Request body should be an array of objects');
  }

  try {
    console.log("Sending recommend request with the following data:", recommendationsRequest);
    
    // Send the POST request to the external API with the recommendation data
    const response = await apiClient.post('/recommend', recommendationsRequest);

    console.log("Recommendation successful:", response.data);

    // Send the successful response data back to the client
    res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      console.error('Server responded with a status other than 2xx:', error.response.statusText);
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
      
      // Send the error response back to the client
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
      console.error('Request details:', error.config);
      
      // Send a 500 status with a custom message back to the client
      res.status(500).send('No response received from the API');
    } else {
      console.error('Error setting up request:', error.message);
      
      // Send a 500 status with the error message back to the client
      res.status(500).send('Error setting up request: ' + error.message);
    }
  }
});





app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
