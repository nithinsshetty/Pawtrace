const firebase = require('firebase/compat/app');
require('firebase/compat/auth');
require('firebase/compat/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDJTcgxplZ2MgwHM7wtZmYUpqdAf1Ft3X0",
  authDomain: "pawtrace-2aa9a.firebaseapp.com",
  projectId: "pawtrace-2aa9a",
  storageBucket: "pawtrace-2aa9a.firebasestorage.app",
  messagingSenderId: "94706228788",
  appId: "1:94706228788:web:d663ee5e539ef1ef6b3461",
  measurementId: "G-Y4S78YQL7W"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

async function run() {
  const stamp = Date.now();
  const ngoEmail = `test_ngo_intake_${stamp}@example.com`;
  const password = "password123";
  let ngoUid;

  try {
    console.log("Creating test NGO...");
    const ngoCred = await auth.createUserWithEmailAndPassword(ngoEmail, password);
    ngoUid = ngoCred.user.uid;
    
    await db.collection('users').doc(ngoUid).set({
      uid: ngoUid,
      email: ngoEmail,
      displayName: "Test NGO Org",
      role: 'ngo'
    });
    console.log(`NGO created: ${ngoUid}`);

    // Try intake save with exact fields
    const newAnimalRef = db.collection('rescued_animals').doc();
    const animalId = newAnimalRef.id;

    const timelineEvent = {
      event: "Animal Intake Created",
      notes: `Animal successfully processed. PawTrace ID: PT-ABC123. Status set to SHELTERED. Notes: Initial intake notes.`,
      timestamp: new Date(),
      actor: "Test NGO Org"
    };

    console.log("Attempting newAnimalRef.set with full intake payload...");
    await newAnimalRef.set({
      orgId: ngoUid,
      orgName: "Test NGO Org",
      name: "Rocky Test",
      type: "Dog",
      breed: "Labrador Mix",
      gender: "Male",
      age: "2 Years",
      size: "Medium",
      vaccinated: true,
      specialNeeds: false,
      goodWithChildren: true,
      goodWithPets: true,
      intakeStatus: 'SHELTERED',
      status: 'SHELTERED',
      shelterLocation: "Shelter A",
      assignedQRTagId: '',
      ptId: "PT-ABC123",
      pawTraceId: "PT-ABC123",
      medicalNotes: "Initial intake notes.",
      photo: '',
      intakeDate: firebase.firestore.FieldValue.serverTimestamp(),
      timeline: [timelineEvent]
    });

    console.log("SUCCESS! Intake document created successfully.");

    // Clean up
    await newAnimalRef.delete();
    await db.collection('users').doc(ngoUid).delete();
    await auth.currentUser.delete();
    console.log("Cleanup done.");

  } catch (err) {
    console.error("Intake submission failed with error:", err);
  }
  process.exit(0);
}

run();
