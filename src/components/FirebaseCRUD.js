import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, get, set, update, remove, child } from "firebase/database";

const FirebaseCRUD = () => {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [searchId, setSearchId] = useState("");
  const [foundData, setFoundData] = useState(null);
  const [databaseRecords, setDatabaseRecords] = useState([]);
  const [showTable, setShowTable] = useState(false);

  // Insert Data
  const insertData = () => {
    if (!id || !name || !age) {
      alert("Please fill all fields");
      return;
    }
    set(ref(db, "People/" + id), { Name: name, ID: id, Age: age })
      .then(() => {
        alert("Data added successfully");
        clearFields();
        showDatabase();
      })
      .catch((error) => alert(error));
  };

  // Find Data
  const findData = () => {
    if (!searchId) {
      alert("Please enter an ID to find");
      return;
    }
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
    if (!id || !name || !age) {
      alert("Please fill all fields");
      return;
    }
    update(ref(db, "People/" + id), { Name: name, Age: age })
      .then(() => {
        alert("Data updated successfully");
        clearFields();
        showDatabase();
      })
      .catch((error) => alert(error));
  };

  // Remove Data
  const removeData = () => {
    if (!id) {
      alert("Please enter an ID to remove");
      return;
    }
    remove(ref(db, "People/" + id))
      .then(() => {
        alert("Data deleted successfully");
        clearFields();
        showDatabase();
      })
      .catch((error) => alert(error));
  };

  // Show Database Records
  const showDatabase = () => {
    const dbRef = ref(db);
    get(child(dbRef, "People"))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const records = [];
          snapshot.forEach((childSnapshot) => {
            records.push(childSnapshot.val());
          });
          setDatabaseRecords(records);
        } else {
          setDatabaseRecords([]);
        }
      })
      .catch((error) => alert(error));
  };

  // Clear Input Fields
  const clearFields = () => {
    setId("");
    setName("");
    setAge("");
  };

  useEffect(() => {
    setShowTable(false); // Initially hide the table
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          backgroundColor: "darkslategray",
          color: "floralwhite",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <h2>Enter Details</h2>
        <input type="text" placeholder="ID" value={id} onChange={(e) => setId(e.target.value)} /> <br />
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} /> <br />
        <input type="number" placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} /> <br /><br />
        <button onClick={insertData}>INSERT</button>
        <button onClick={updateData}>UPDATE</button>
        <button onClick={removeData}>REMOVE</button>
      </div>

      <div
        style={{
          backgroundColor: "floralwhite",
          color: "darkslategray",
          padding: "20px",
          marginTop: "20px",
          borderRadius: "10px",
        }}
      >
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

      <div
        style={{
          backgroundColor: "whitesmoke",
          padding: "20px",
          marginTop: "20px",
          borderRadius: "10px",
        }}
      >
        <h2>Database Records</h2>
        <button
          onClick={() => {
            if (!showTable) showDatabase();
            setShowTable(!showTable);
          }}
        >
          {showTable ? "HIDE DATABASE" : "SHOW DATABASE"}
        </button>
        {showTable && (
          <table style={{ width: "80%", margin: "auto", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {databaseRecords.map((record, index) => (
                <tr key={index}>
                  <td>{record.ID}</td>
                  <td>{record.Name}</td>
                  <td>{record.Age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FirebaseCRUD;
