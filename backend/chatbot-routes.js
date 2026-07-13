const express = require('express');
const router = express.Router();
const { db } = require('./firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue } = require('firebase-admin/firestore');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

const tools = [
  {
    functionDeclarations: [
      {
        name: 'getPetReminder',
        description: 'Gets the next scheduled reminder for a specific pet, like medication or vet visits.',
        parameters: {
          type: 'object',
          properties: {
            petName: {
              type: 'string',
              description: 'The name of the pet, e.g. Milo'
            }
          },
          required: ['petName']
        }
      },
      {
        name: 'getMedicalRecords',
        description: 'Gets the medical history for a specific pet, including vaccinations, surgeries, diagnoses, and treatments.',
        parameters: {
          type: 'object',
          properties: {
            petName: {
              type: 'string',
              description: 'The name of the pet, e.g. Milo'
            }
          },
          required: ['petName']
        }
      },
      {
        name: 'createReminder',
        description: 'Creates a new reminder for a specific pet, such as medication, vet appointments, or grooming.',
        parameters: {
          type: 'object',
          properties: {
            petName: {
              type: 'string',
              description: 'The name of the pet, e.g. Milo'
            },
            reminderTitle: {
              type: 'string',
              description: 'Short title for the reminder, e.g. "Give heartworm medication"'
            },
            reminderType: {
              type: 'string',
              enum: ['Vaccination', 'Medicine', 'Vet Appointment', 'Other'],
              description: 'The category of reminder. Use Vaccination for vaccine boosters, Medicine for pills/medication, "Vet Appointment" for clinic visits, or Other for anything else.'
            },
            dueDate: {
              type: 'string',
              description: 'The date the reminder is due, in YYYY-MM-DD format, e.g. 2026-07-20'
            }
          },
          required: ['petName', 'reminderTitle', 'reminderType', 'dueDate']
        }
      },
      {
        name: 'findFeatureLocation',
        description: 'Answers questions about where to find features in the PawTrace app, or how to use them — like adding a pet, listing for adoption, finding a vet, or adding a caregiver.',
        parameters: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'What the user is trying to find or do, e.g. "add a caregiver" or "list pet for adoption"'
            }
          },
          required: ['topic']
        }
      }
    ]
  }
];

async function getPetReminder(petName, ownerUid) {
  const petsSnapshot = await db.collection('pets')
    .where('name', '==', petName)
    .where('ownerId', '==', ownerUid)
    .limit(1)
    .get();

  if (petsSnapshot.empty) {
    return { error: `No pet named "${petName}" was found in your account.` };
  }

  const petDoc = petsSnapshot.docs[0];

  const remindersSnapshot = await petDoc.ref.collection('reminders')
    .orderBy('dueDate', 'asc')
    .limit(1)
    .get();

  if (remindersSnapshot.empty) {
    return { petName, reminder: 'No upcoming reminders found.' };
  }

  const reminder = remindersSnapshot.docs[0].data();
  return { petName, ...reminder };
}

async function getMedicalRecords(petName, ownerUid) {
  const petsSnapshot = await db.collection('pets')
    .where('name', '==', petName)
    .where('ownerId', '==', ownerUid)
    .limit(1)
    .get();

  if (petsSnapshot.empty) {
    return { error: `No pet named "${petName}" was found in your account.` };
  }

  const petDoc = petsSnapshot.docs[0];

  const recordsSnapshot = await petDoc.ref.collection('medical_records')
    .orderBy('date', 'desc')
    .limit(5)
    .get();

  if (recordsSnapshot.empty) {
    return { petName, records: 'No medical records found.' };
  }

  const records = recordsSnapshot.docs.map(doc => doc.data());
  return { petName, records };
}

async function createReminder(petName, ownerUid, reminderTitle, reminderType, dueDate) {
  const petsSnapshot = await db.collection('pets')
    .where('name', '==', petName)
    .where('ownerId', '==', ownerUid)
    .limit(1)
    .get();

  if (petsSnapshot.empty) {
    return { error: `No pet named "${petName}" was found in your account. Reminder not created.` };
  }

  const petDoc = petsSnapshot.docs[0];

  const newReminder = {
    title: reminderTitle,
    type: reminderType,
    dueDate: dueDate,
    dueTime: '',
    completed: false,
    createdAt: FieldValue.serverTimestamp()
  };

  await petDoc.ref.collection('reminders').add(newReminder);

  return {
    success: true,
    petName,
    reminderTitle,
    reminderType,
    dueDate
  };
}

const faqEntries = [
  {
    keywords: ['add pet', 'new pet', 'register pet', 'create pet'],
    answer: 'To add a new pet, go to "My Companions" in the sidebar, then click "Add Pet" and fill in their details.'
  },
  {
    keywords: ['adoption', 'list for adoption', 'put up for adoption'],
    answer: 'To list a pet for adoption, open that pet\'s profile and use the "List for Adoption" toggle. This adds them to the Adoption Center for others to see.'
  },
  {
    keywords: ['caregiver', 'sitter', 'share access', 'temporary access'],
    answer: 'You can add a caregiver from your pet\'s profile page — look for the caregiver or sharing option to grant temporary access to a sitter or friend.'
  },
  {
    keywords: ['find vet', 'nearby vet', 'veterinarian near'],
    answer: 'Use "Find Care" in the sidebar to search for nearby vets and clinics.'
  },
  {
    keywords: ['lost pet', 'report lost', 'missing pet'],
    answer: 'If your pet is lost, go to that pet\'s profile and mark them as "LOST" — this activates their listing under Lost & Found.'
  },
  {
    keywords: ['medical record', 'vaccination log', 'health history'],
    answer: 'Medical records are under the "Medical Log" tab on your pet\'s profile page.'
  },
  {
    keywords: ['reminder', 'medication schedule', 'vet appointment reminder'],
    answer: 'Reminders live under the "Reminders" tab on your pet\'s profile — you can add or manage them there, or just ask me to set one for you.'
  },
  {
    keywords: ['smart tag', 'qr code', 'order tag'],
    answer: 'You can order a Smart Tag from the "Smart Tag Orders" page in the sidebar — it links a QR code to your pet\'s profile.'
  }
];

function findFeatureLocation(topic) {
  const lowerTopic = topic.toLowerCase();

  const match = faqEntries.find(entry =>
    entry.keywords.some(keyword => lowerTopic.includes(keyword))
  );

  if (match) {
    return { answer: match.answer };
  }

  return { answer: 'I\'m not sure about that specific feature. Try checking the sidebar menu, or let me know more about what you\'re trying to do.' };
}

router.post('/chat', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authentication token provided.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let uid;
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const { message } = req.body;

  try {
    const firstResponse = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: message }] }
        ],
        tools: tools
      })
    });

    const firstData = await firstResponse.json();
    console.log('First response:', JSON.stringify(firstData, null, 2));

    const parts = firstData.candidates?.[0]?.content?.parts ?? [];
    const functionCallPart = parts.find(p => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      console.log(`Gemini wants to call: ${name} with args:`, args);

      let functionResult;
      if (name === 'getPetReminder') {
        functionResult = await getPetReminder(args.petName, uid);
      } else if (name === 'getMedicalRecords') {
        functionResult = await getMedicalRecords(args.petName, uid);
      } else if (name === 'createReminder') {
        functionResult = await createReminder(args.petName, uid, args.reminderTitle, args.reminderType, args.dueDate);
      } else if (name === 'findFeatureLocation') {
        functionResult = findFeatureLocation(args.topic);
      }

      const secondResponse = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: message }] },
            { role: 'model', parts: [functionCallPart] },
            {
              role: 'user',
              parts: [{
                functionResponse: {
                  name: name,
                  response: functionResult
                }
              }]
            }
          ],
          tools: tools
        })
      });

      const secondData = await secondResponse.json();
      console.log('Second response:', JSON.stringify(secondData, null, 2));
      const finalText = secondData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';
      return res.json({ reply: finalText });
    }

    const reply = parts[0]?.text ?? 'No response';
    res.json({ reply });

  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Chatbot failed' });
  }
});

module.exports = router;