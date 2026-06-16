const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

const newHospitalCoords = {
  "hosp-01": { latitude: 25.186108, longitude: 62.332846 },
  "hosp-03": { latitude: 25.134696, longitude: 62.321995 }
};

if (fs.existsSync(dbPath)) {
  try {
    const rawData = fs.readFileSync(dbPath, 'utf8');
    if (rawData.trim()) {
      const data = JSON.parse(rawData);
      if (data.hospitals && Array.isArray(data.hospitals)) {
        data.hospitals.forEach(hosp => {
          const coords = newHospitalCoords[hosp.id];
          if (coords) {
            hosp.latitude = coords.latitude;
            hosp.longitude = coords.longitude;
            console.log(`Updated coordinates of hospital: ${hosp.name} (${hosp.id}) to ${hosp.latitude}, ${hosp.longitude}`);
          }
        });
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        console.log("Successfully updated database.json");
      } else {
        console.log("No hospitals array found in database.json");
      }
    } else {
      console.log("database.json is empty");
    }
  } catch (err) {
    console.error("Error migrating database.json:", err.message);
  }
} else {
  console.log("database.json does not exist yet.");
}
