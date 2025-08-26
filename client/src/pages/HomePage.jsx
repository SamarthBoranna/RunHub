import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useActivities } from "../components/ActivitiesContext";
import { Card, CardBody } from "@heroui/react";
import runhubLogo from "../assets/runhub2.png";
import connectWithStravaBtn from "../assets/strava_connect_btn.svg";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function HomePage() {
  const { isAuthorized } = useActivities();
  const navigate = useNavigate();

  // If already logged in, redirect to runs page
  useEffect(() => {
    if (isAuthorized) {
      navigate("/runs");
    }
  }, [isAuthorized, navigate]);

  const handleLoginClick = () => {
    window.location.href = `${API_BASE}/authorize`;
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center mb-20">
        <div className="mb-8">
          <img src={runhubLogo} alt="RunHub" className="h-24 md:h-32 w-auto" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Track. Visualize. Improve.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-10">
          Connect your Strava account to unlock your running analytics and
          discover your progress.
        </p>
        <div
          onClick={handleLoginClick}
          className="cursor-pointer transition-transform hover:scale-105"
        >
          <img
            src={connectWithStravaBtn}
            alt="Connect with Strava"
            style={{ height: "48px" }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-20">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-none shadow-md overflow-hidden">
          <CardBody className="p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardBody className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-blue-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                      <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Automatic Strava Sync
                  </h3>
                  <p className="text-gray-600">
                    Seamlessly connect and sync all your run data from Strava.
                  </p>
                </CardBody>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardBody className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-orange-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Weekly Metrics & Heatmap
                  </h3>
                  <p className="text-gray-600">
                    Visualize your runs with powerful analytics and interactive
                    maps.
                  </p>
                </CardBody>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardBody className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-green-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="8" r="7"></circle>
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Achievements and Badges
                  </h3>
                  <p className="text-gray-600">
                    Earn badges and track your progress as you reach new
                    milestones.
                  </p>
                </CardBody>
              </Card>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* How it Works Section */}
      <section className="mb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          How it Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
              1
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Strava</h3>
            <p className="text-gray-600">
              Link your Strava account with just one click.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
              2
            </div>
            <h3 className="text-lg font-semibold mb-2">Sync Activities</h3>
            <p className="text-gray-600">
              Automatically import all your running data.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
              3
            </div>
            <h3 className="text-lg font-semibold mb-2">Visualize History</h3>
            <p className="text-gray-600">
              See your runs on maps and in detailed charts.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
              4
            </div>
            <h3 className="text-lg font-semibold mb-2">Track Achievements</h3>
            <p className="text-gray-600">
              Earn badges and track your progress over time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center mb-16">
        <div className="max-w-3xl mx-auto p-8 md:p-12 bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Elevate Your Running?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Start tracking your progress today with RunHub.
          </p>
          <div
            onClick={handleLoginClick}
            className="cursor-pointer inline-block transition-transform hover:scale-105"
          >
            <img
              src={connectWithStravaBtn}
              alt="Connect with Strava"
              style={{ height: "48px" }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
