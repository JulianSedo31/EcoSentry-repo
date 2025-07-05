import React from "react";
// CSS
import "./style.css";
import ecosentryLogo from "../assets/EcoSentryLogo.png";

function About() {
  const teamMembers = [
    { name: "Benz Barquilla" },
    { name: "Ivan Ric Rebato" },
    { name: "Philip Venje Beronio" },
    { name: "Julian Blaze Sedo" },
  ];
  return (
    <div className="about-container">
      <div className="about-content">
        {/* Left Section */}
        <div className="about-left">
          <img
            src={ecosentryLogo}
            alt="EcoSentry Logo"
            className="about-logo"
          />
          <h1>About EcoSentry</h1>
          <p>
            EcoSentry is a capstone project developed in collaboration with
            local environmental authorities to provide real-time monitoring and
            alert systems. It is built with the goal of supporting environmental
            operations through technology.
          </p>
        </div>

        {/* Right Section: Team */}
        <div className="about-right">
          <h2>Meet the Team</h2>
          <div className="team-grid">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="team-card">
                <div className="avatar">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <h4>{member.name}</h4>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
