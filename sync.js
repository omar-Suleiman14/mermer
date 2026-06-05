fetch("http://localhost:8080/instance/fetchInstances?instanceName=clinic_jh7ayjjh72tv6xytfzfkkf85bx8735qs", { headers: { apikey: "B6D711FCDE4D4FD5936544120E7139D5" } })
  .then(r => r.json())
  .then(async (d) => {
    if(d && d[0] && d[0].ownerJid) {
       const phone = d[0].ownerJid.split("@")[0];
       console.log("OWNER PHONE IS:", phone);
       // we can update it in the frontend easily if they refresh, 
       // but it's fine, my Convex backend update covers this already for new fetches
    }
  });
