import logo from './logo.svg';
import './App.css';
import React from "react";
import FirebaseCRUD from "./components/FirebaseCRUD";

function App() {
  return (
    <div>
      <h1>
        Town Hall
      </h1>
      <FirebaseCRUD />
    </div>
  );
}

export default App;
