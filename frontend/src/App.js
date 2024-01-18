// src/App.js in your React project
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [bookmarkletUrl, setBookmarkletUrl] = useState("");
  const [showNotesButtonUrl, setShowNotesButtonUrl] = useState("");

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/generate_bookmarklet")
      .then((response) => {
        setBookmarkletUrl(response.data.bookmarklet_url);
      })
      .catch((error) => console.error("Error fetching bookmarklet URL", error));
    axios
      .get("http://127.0.0.1:5000/generate_notes_bookmarklet")
      .then((response) => {
        setShowNotesButtonUrl(response.data.notes_bookmarklet_url);
      })
      .catch((error) =>
        console.error("Error fetching Show Notes button URL", error)
      );
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("Bookmarklet URL copied to clipboard!"))
      .catch((err) => console.error("Error in copying text: ", err));
  };

  return (
    <div className="App">
      <header className="App-header">
        <p>Bookmarklet URL:</p>
        <textarea value={bookmarkletUrl} readOnly rows={4} cols={50} />
        <button onClick={() => copyToClipboard(bookmarkletUrl)}>Copy</button>
        <p>ShowNotemarklet URL:</p>
        <textarea value={showNotesButtonUrl} readOnly rows={4} cols={50} />
        <button onClick={() => copyToClipboard(showNotesButtonUrl)}>
          Copy
        </button>
      </header>
    </div>
  );
}

export default App;
