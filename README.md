# 🏃 RunHub - https://runhub.vercel.app/

A full-stack web app that integrates with the **Strava API** to let users:

- 🔓 Log in with Strava
- 🏃‍♂️ View recent running activities
- 📍 See heatmaps of their runs
- 🏅 Earn badges for accomplishments

Built using **React + Flask**, styled with **TailwindCSS** and **HeroUI** components.

---

## 🚀 Features

- **OAuth Login**: Secure login with your Strava account
- **Recent Activities Page**: View client-side paginated list of your recent runs
- **Interactive UI**: Built with HeroUI and TailwindCSS
- **React Context**: Utilizing React context to store/share information and limit repeated API requests

---

## 🛠️ Tech Stack

| Frontend        | Backend         | UI/Styling     |
|----------------|----------------|----------------|
| React + Vite   | Flask (Python)  | HeroUI + TailwindCSS     |

---

## ☁️ Hosting & Deployment

RunHub is deployed using a **server-client split** architecture:

- **Frontend**: Hosted on **Vercel** for fast, reliable static delivery and automatic CI/CD from GitHub  
- **Backend**: Deployed on **Render**, running a Flask server that handles API requests and Strava data retrieval  
- **Database**: **SQLite** on Render for temporary data storage and caching of activity information  

This setup ensures seamless integration between the React frontend and Flask backend while maintaining performance and scalability.

---

