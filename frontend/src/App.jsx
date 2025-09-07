import React, { useState, useEffect } from "react";
import "./App.css";

const exercises = {
  chill: [
    { name: "Neck rolls", duration: 30 },
    { name: "Shoulder shrugs", duration: 30 },
    { name: "Cat-cow stretch", duration: 30 },
    { name: "Child’s pose", duration: 30 },
    { name: "Seated forward fold", duration: 30 },
  ],
  stretch: [
    { name: "Standing hamstring stretch", duration: 40 },
    { name: "Quad stretch", duration: 40 },
    { name: "Cobra stretch", duration: 40 },
    { name: "Seated spinal twist", duration: 40 },
    { name: "Butterfly stretch", duration: 40 },
  ],
  regular: [
    { name: "Squats", duration: 45 },
    { name: "Push-ups", duration: 45 },
    { name: "Lunges", duration: 45 },
    { name: "Plank", duration: 45 },
    { name: "Mountain climbers", duration: 45 },
  ],
  intense: [
    { name: "Jump squats", duration: 50 },
    { name: "Burpees", duration: 50 },
    { name: "High knees", duration: 50 },
    { name: "Jump lunges", duration: 50 },
    { name: "Push-up to shoulder tap", duration: 50 },
  ],
  hardcore: [
    { name: "Pistol squats", duration: 60 },
    { name: "Clap push-ups", duration: 60 },
    { name: "One-arm plank hold", duration: 60 },
    { name: "Tuck jumps", duration: 60 },
    { name: "Plank to push-up", duration: 60 },
  ],
};

function App() {
  const [intensity, setIntensity] = useState("regular");
  const [workout, setWorkout] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [streak, setStreak] = useState(0);

  // Load streak from localStorage
  useEffect(() => {
    const savedStreak = localStorage.getItem("streak");
    if (savedStreak) setStreak(Number(savedStreak));
  }, []);

  // Timer logic
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Move to next exercise
  useEffect(() => {
    if (timeLeft === 0 && timerActive) {
      if (currentExercise < workout.length - 1) {
        setCurrentExercise((i) => i + 1);
        setTimeLeft(workout[currentExercise + 1].duration);
      } else {
        finishWorkout();
      }
    }
  }, [timeLeft, timerActive]);

  function generateWorkout() {
    const selected = exercises[intensity];
    const randomized = [...selected]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    setWorkout(randomized);
    setCurrentExercise(0);
    setTimeLeft(randomized[0].duration);
    setTimerActive(false);
  }

  function startWorkout() {
    if (workout.length > 0) {
      setTimerActive(true);
    }
  }

  function finishWorkout() {
    setTimerActive(false);
    setCurrentExercise(0);
    setTimeLeft(0);
    // Streak +1
    const today = new Date().toDateString();
    const lastDone = localStorage.getItem("lastWorkout");
    if (lastDone !== today) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("streak", newStreak);
      localStorage.setItem("lastWorkout", today);
    }
    alert("Workout complete! 🎉");
  }

  function shareApp() {
    const botUsername = "YourWorkoutBot_Bot"; // replace with your bot username
    const appUrl = `https://t.me/${botUsername}/app?startapp=ref_user`;

    if (window.Telegram?.WebApp?.shareLink) {
      window.Telegram.WebApp.shareLink(
        appUrl,
        "Hey! Check out this awesome 5-min workout bot!"
      );
    } else if (navigator.share) {
      navigator.share({
        title: "MicroCoach",
        text: "Quick workouts!",
        url: appUrl,
      });
    } else if (navigator.clipboard) {
      navigator.clipboard
        .writeText(appUrl)
        .then(() => alert("Link copied!"));
    } else {
      prompt("Copy this link:", appUrl);
    }
  }

  async function donate() {
    if (window.Telegram?.WebApp?.version >= 6.9 && window.ton) {
      try {
        const tx = {
          to: "YOUR_TON_WALLET_ADDRESS",
          value: 5000000000n,
        };
        const res = await window.ton.sendTransaction(tx);
        if (res) alert("Thank you for your support! 🎉");
      } catch (e) {
        console.error("TON Payment failed:", e);
        await donateViaInvoice();
      }
    } else {
      await donateViaInvoice();
    }
  }

  async function donateViaInvoice() {
    alert("Invoice donation coming soon 🙏");
  }

  return (
    <div className="App">
      <h1>🏋️ MicroCoach</h1>
      <p>Daily streak: {streak} 🔥</p>

      <div>
        <label>Pick intensity: </label>
        <select
          value={intensity}
          onChange={(e) => setIntensity(e.target.value)}
          disabled={timerActive}
        >
          <option value="chill">Chill</option>
          <option value="stretch">Stretch</option>
          <option value="regular">Regular</option>
          <option value="intense">Intense</option>
          <option value="hardcore">Hardcore</option>
        </select>
      </div>

      <button onClick={generateWorkout} disabled={timerActive}>
        Generate Workout
      </button>

      {workout.length > 0 && (
        <>
          <h2>Workout Plan</h2>
          <ol>
            {workout.map((ex, i) => (
              <li key={i}>
                {ex.name} – {ex.duration}s{" "}
                {i === currentExercise && timerActive && (
                  <progress
                    value={ex.duration - timeLeft}
                    max={ex.duration}
                  />
                )}
                {i < currentExercise && <span> ✅</span>}
              </li>
            ))}
          </ol>

          {!timerActive && (
            <button onClick={startWorkout}>Start</button>
          )}
          {timerActive && <p>⏱ {timeLeft}s left</p>}
        </>
      )}

      <hr />
      <button onClick={shareApp}>Share</button>
      <button onClick={donate}>Support ❤️</button>
    </div>
  );
}

export default App;
