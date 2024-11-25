import { useState, useEffect } from "react";
import "./App.css";

import haversineDistance from "./distanceCalculator";
import { getGlobUnversity, setGlobUniversity } from "./globalState";

const { GoogleGenerativeAI } = require("@google/generative-ai");
const API_KEY = "AIzaSyCw3A1xUQ_lp7AJ8xBVC2SCnHUgidyiATk";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });



const App = () => {
    const [ipAddress, setIpAddress] = useState("");
    const [geoInfo, setGeoInfo] = useState({});
    const [text, setText] = useState("");
    const [text2, setText2] = useState("");
    const [distance, setDistance] = useState("");
    const [university, setUniversity] = useState("");



    // Get IP when the app is run
    useEffect(() => {
        getVisitorIP();
    }, []);

    // Establishing a wait function
    function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }


    // Function to accquire the visitor's IP
    const getVisitorIP = async () => {
        try {
            const response = await fetch("https://api.ipify.org");
            const data = await response.text();
            setIpAddress(data); // Set the IP address in the state
        } catch (error) {
            alert("Failed to fetch IP: ", error);
        }
    };

    // Use geography API to get info based on IP
    const fetchIPInfo = async (ip) => {
        try {
            const response = await fetch(`http://ip-api.com/json/${ip}`);
            const data = await response.json();
            setGeoInfo(data);
        } catch (error) {
            console.error("Failed to Get Location Info: ", error);
        }
    };

    // Once the geoInfo comes in, send the responses to the Gemini prompts
    useEffect(() => {
        if (geoInfo.zip) {
            sendResponse();
        }
    }, [geoInfo]); // update each time geoInfo changes

    // Gemini stuff
    const sendResponse = async () => {
        if (!geoInfo.zip) {
            alert("Geo info is missing!");
            return;
        }

        try {
           

            const ruralPrompt = `Is the zip code ${geoInfo.zip} in a rural area? If it is, tell me the name of the closest town to that zip code. If it is not in a rural area, ONLY say "null"`; //make it so like if its liek 5000 miles from a university then itll not tweak the FUCK out and itll give a rural area
            console.log(ruralPrompt);
            const ruralResult = await model.generateContent(ruralPrompt);
            const ruralResultText = ruralResult.response;
            if (ruralResultText.text() === "null") {
                // Get university
                const prompt = `What is the university in the zip code ${geoInfo.zip}? Phrase your answer as just the university.`; //THIS PROMPT NEEDS TO BE CHANGED
                console.log(prompt);
                const result = await model.generateContent(prompt);
                const response = result.response;
                setUniversity(response.text());
               
                //setting the global variable for university
                setGlobUniversity(university);
                console.log(getGlobUnversity());


                // Get latitude/longitude
                const latPrompt = `What is the latitude of the ${university}? Frame your answer as JUST the number.`;
                const lonPrompt = `What is the longitude of the ${university}? Frame your answer as JUST the number.`;
                const latResult = await model.generateContent(latPrompt);
                const lonResult = await model.generateContent(lonPrompt);
                const latResponse = latResult.response;
                const lonResponse = lonResult.response;

                console.log(parseFloat(latResponse.text()));
                console.log(parseFloat(lonResponse.text()));

                const havDistance = haversineDistance(geoInfo.lat, geoInfo.lon, parseFloat(latResponse.text()), parseFloat(lonResponse.text())); 

                console.log(havDistance);

                if (havDistance < 1.5) {
                    getPoliceNum();
                    console.log("hello its detecting this hsit");
                } else {
                    setText("No Nearby Universities");
                    setText2("911");
                }

                setDistance(havDistance);

                setText(university);
            } else {
                setText(ruralResultText.text());
            }
        } catch (error) {
            //catch errors lol
            console.log(error);
            setText2("911");
        }
    };

    // Calling the police number function
    
    useEffect(() => {
        if (text) {
            getPoliceNum();
        }
    }, [text]); // update each time the text variable changes


    //gets the police number with gemini (YAYYYY)
    const getPoliceNum = async () => {
        try {
            await wait(1000);
            console.log(text);
            if(distance < 1.5) {
              const prompt2 = `What is the number of the ${university} police department?`;
              const result2 = await model.generateContent(prompt2);
              const response2 = result2.response;
              console.log(prompt2);
              setText2(response2.text());
            }
        } catch (error) {
            console.log(error);
        }
    };

    // Allows manual input of IP addresses
    const handleInputChange = (e) => {
        setIpAddress(e.target.value);
    };

    // Gets location info when the button is clicked
    const handleClick = () => {
        if (ipAddress) {
            // Resets the state cuz it kept causing errors
            setText("");
            setText2("");
            setGeoInfo({});

            fetchIPInfo(ipAddress); // Gets IP info for entered info
        } else {
            alert("Please enter an IP address");
        }
    };

    return (
        //frontend :sob:
        <div className="App">
            <h3>Get Location</h3>
            <div className="form-area">
                <input
                    type="text"
                    value={ipAddress}
                    onChange={handleInputChange}
                />
                <button onClick={handleClick}>
                    Reload Emergency Information
                </button>
            </div>
            {geoInfo.country && (
                <div className="result">
                    <strong>Country:</strong> {geoInfo.country} (
                    {geoInfo.countryCode})
                    <br />
                    <strong>Region:</strong> {geoInfo.regionName}
                    <br />
                    <strong>City:</strong> {geoInfo.city}
                    <br />
                    <strong>Zip:</strong> {geoInfo.zip}
                    <br />
                    <strong>Latitude:</strong> {geoInfo.lat}
                    <br />
                    <strong>Longitude:</strong> {geoInfo.lon}
                    <br />
                    <strong>Answer:</strong> {text}
                    <br />
                    <strong>PD: </strong> {text2}
                    <br />
                    <strong>Distance: </strong> {distance}
                </div>
            )}
        </div>
    );
};

export default App;
