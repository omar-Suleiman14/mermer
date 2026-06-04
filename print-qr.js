const fetch = require("node-fetch"); // you may need to install this: npm i node-fetch@2 qrcode-terminal
const qrcode = require("qrcode-terminal");

const API_URL = "http://localhost:8080";
const GLOBAL_API_KEY = "B6D711FCDE4D4FD5936544120E7139D5";

async function fetchAndPrintQR() {
  try {
    console.log("Fetching instances...");
    const res = await fetch(`${API_URL}/instance/fetchInstances`, {
      headers: { apikey: GLOBAL_API_KEY }
    });
    const instances = await res.json();
    
    if (!instances || instances.length === 0) {
      console.log("No instances found. Create one from your web UI first.");
      return;
    }

    const instanceName = instances[0].name;
    console.log(`Found instance: ${instanceName}. Fetching connection state...`);

    const stateRes = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
      headers: { apikey: GLOBAL_API_KEY }
    });
    const stateData = await stateRes.json();

    if (stateData.instance?.state === "open") {
      console.log("WhatsApp is already connected!");
      return;
    }

    console.log("Fetching QR code...");
    const qrRes = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
      headers: { apikey: GLOBAL_API_KEY }
    });
    const qrData = await qrRes.json();

    if (qrData.base64 || qrData.qrcode) {
      console.log("Here is your QR Code:");
      // The API returns the raw text data in qrData.code or similar, 
      // but usually we just want to generate it from the base64 or code text.
      // qrData.code contains the raw string for the QR.
      if (qrData.code) {
        qrcode.generate(qrData.code, { small: true });
      } else {
        console.log("Please copy this base64 and decode it, or use the web UI.");
      }
    } else {
      console.log("QR Code not ready yet. Try running the script again in a few seconds.");
    }
  } catch (error) {
    console.error("Error communicating with Evolution API:", error.message);
  }
}

fetchAndPrintQR();
