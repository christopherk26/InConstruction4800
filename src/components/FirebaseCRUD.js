import React, { useState } from "react";
import { db } from "../firebase"; // ✅ Correct import
import { ref, get, set, update, remove, child } from "firebase/database"; // ✅ Import Firebase database functions

const FirebaseCRUD = () => {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [searchId, setSearchId] = useState("");
  const [foundData, setFoundData] = useState(null);

  // Insert Data
  const insertData = () => {
    set(ref(db, "People/" + id), { Name: name, ID: id, Age: age })
      .then(() => alert("Data added successfully"))
      .catch((error) => alert(error));
  };

  // Find Data
  const findData = () => {
    const dbRef = ref(db);
    get(child(dbRef, "People/" + searchId))
      .then((snapshot) => {
        if (snapshot.exists()) {
          setFoundData(snapshot.val());
        } else {
          alert("No data found");
          setFoundData(null);
        }
      })
      .catch((error) => alert(error));
  };

  // Update Data
  const updateData = () => {
    update(ref(db, "People/" + id), { Name: name, Age: age })
      .then(() => alert("Data updated successfully"))
      .catch((error) => alert(error));
  };

  // Remove Data
  const removeData = () => {
    remove(ref(db, "People/" + id))
      .then(() => alert("Data deleted successfully"))
      .catch((error) => alert(error));
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ backgroundColor: "darkslategray", color: "floralwhite", padding: "20px" }}>
        <h2>Enter Details</h2>
        <input type="text" placeholder="ID" value={id} onChange={(e) => setId(e.target.value)} /> <br />
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} /> <br />
        <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} /> <br /><br />
        <button onClick={insertData}>INSERT</button>
        <button onClick={updateData}>UPDATE</button>
        <button onClick={removeData}>REMOVE</button>
      </div>

      <div style={{ backgroundColor: "floralwhite", color: "darkslategray", padding: "20px", marginTop: "20px" }}>
        <h2>Find by ID</h2>
        <input type="text" placeholder="Search ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} /> <br /><br />
        <button onClick={findData}>FIND</button>
        {foundData && (
          <div>
            <h3>Name: {foundData.Name}</h3>
            <h3>Age: {foundData.Age}</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirebaseCRUD;
