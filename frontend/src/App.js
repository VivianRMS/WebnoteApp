// src/App.js in your React project
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const COLORS = [
  "#3b82f6",
  "#16a34a",
  "#ef4444",
  "#eab308",
  "#db2777",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
];

function App() {
  const [showGuide, setShowGuide] = useState(false);
  const [bookmarkletUrl, setBookmarkletUrl] = useState("");
  const [showNotesButtonUrl, setShowNotesButtonUrl] = useState("");
  const [currentPath, setCurrentPath] = useState("Add");
  const [allCategories, setAllCategories] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [allLinks, setAllLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    setIsLoadingCategories(true);

    const fetchBookmarkletUrls = async () => {
      try {
        const bookmarkletResponse = await axios.get(
          "http://127.0.0.1:5000/generate_bookmarklet"
        );
        setBookmarkletUrl(bookmarkletResponse.data.bookmarklet_url);

        const notesButtonResponse = await axios.get(
          "http://127.0.0.1:5000/generate_notes_bookmarklet"
        );
        setShowNotesButtonUrl(notesButtonResponse.data.notes_bookmarklet_url);
      } catch (error) {
        console.error("Error fetching bookmarklet URLs", error);
      }
    };
    const fetchCategories = async () => {
      try {
        const response = await axios.get(
          "http://127.0.0.1:5000/get_info/get_categories"
        );
        setAllCategories(response.data.categories_list || []);
      } catch (error) {
        console.error("Error fetching all categories", error);
      }
    };

    Promise.all([fetchBookmarkletUrls(), fetchCategories()]).then(() => {
      setIsLoadingCategories(false);
    });
  }, []);

  return (
    <>
      <Header showGuide={showGuide} setShowForm={setShowGuide} />
      {showGuide ? (
        <Guide
          bookmarkletUrl={bookmarkletUrl}
          showNotesButtonUrl={showNotesButtonUrl}
        />
      ) : null}
      <main className="main">
        {isLoadingCategories ? null : (
          <CategoryFilter
            allCategories={allCategories}
            setCurrentPath={setCurrentPath}
          />
        )}
        <div className="content">
          {currentPath === "Add" ? (
            <AddCategory
              allCategories={allCategories}
              setAllCategories={setAllCategories}
            />
          ) : (
            <div>
              <BackButton
                currentPath={currentPath}
                setCurrentPath={setCurrentPath}
              />
              <Folders
                currentPath={currentPath}
                allFolders={allFolders}
                setAllFolders={setAllFolders}
                setIsLoading={setIsLoading}
                isLoading={isLoading}
                setCurrentPath={setCurrentPath}
              />
              <Links
                currentPath={currentPath}
                allLinks={allLinks}
                setAllLinks={setAllLinks}
                setIsLoading={setIsLoading}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Loader() {
  return <p className="message">Loading ...</p>;
}

function Header({
  showGuide,
  setShowForm,
  bookmarkletUrl,
  showNotesButtonUrl,
}) {
  const appTitle = "Web Notes";
  return (
    <header className="header">
      <div className="logo">
        <img src="logo.png" height="68" width="68" alt="Make Web Notes" />
        <h1>{appTitle}</h1>
      </div>
      <button
        className="btn btn-large btn-open"
        onClick={() => setShowForm((show) => !show)}
      >
        {showGuide ? "Close" : "Guide"}
      </button>
    </header>
  );
}

function Guide({ bookmarkletUrl, showNotesButtonUrl }) {
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("Bookmarklet URL copied to clipboard!"))
      .catch((err) => console.error("Error in copying text: ", err));
  };
  return (
    <div className="bookmarklet-generator">
      <div className="bookmarklet-guide">
        <p>Step 1: Create a bookmarklet and name it as you want!</p>
        <p>Step 2: Click the copy button to paste the bookmarklet URL need!</p>
      </div>
      <div className="bookmarklet-container">
        <div className="bookmarklet">
          <h2>HIGHLIGHT</h2>
          <button
            className="btn btn-copy btn-open"
            onClick={() => copyToClipboard(bookmarkletUrl)}
          >
            Copy
          </button>
          <p>Select text, click to highlight!</p>
        </div>
        <div className="bookmarklet">
          <h2>RESTORE</h2>
          <button
            className="btn btn-copy btn-open"
            onClick={() => copyToClipboard(showNotesButtonUrl)}
          >
            Copy
          </button>
          <p>Click to get previous notes!</p>
        </div>
      </div>
    </div>
  );
}

function CategoryFilter({ allCategories, setCurrentPath }) {
  return (
    <aside>
      <ul>
        <li className="category">
          <button
            className="btn btn-all-categories"
            onClick={() => setCurrentPath("Add")}
          >
            Add
          </button>
        </li>
        {allCategories.map((cat) => (
          <li key={cat.category_name} className="category">
            <button
              className="btn btn-category"
              style={{ backgroundColor: cat.color }}
              onClick={() => {
                setCurrentPath(cat.category_name);
              }}
            >
              {cat.category_name}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function AddCategory({ allCategories, setAllCategories }) {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [isUpLoading, setIsUpLoading] = useState(false);
  const textLength = text.length;

  async function handleSubmit(e) {
    //1. Prevent browser reload
    e.preventDefault();
    console.log(text, color);

    //2. Check if data is valid. If so, create a new fact
    if (text && textLength <= 200) console.log("there is valid data");

    //3. Create a new fact object

    const data = {
      category_name: text,
      color: color,
      description: description,
    };

    //3. Upload Facts to Supabase and receive the new fact object
    setIsUpLoading(true);

    fetch("http://127.0.0.1:5000/add_category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Category inserted into MongoDB.");
        } else {
          console.error("Failed to insert category into MongoDB.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    setIsUpLoading(false);

    //4. Add the new category to the UI
    setAllCategories([...allCategories, data]);

    //5. Reset input fields
    setText("");
    setColor("");
  }

  return (
    <form className="fact-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Create a new category..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isUpLoading}
      />
      <span>{200 - textLength}</span>
      <input
        type="text"
        placeholder="Description of this category..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isUpLoading}
      />
      <div className="color-picker">
        {COLORS.map((col) => (
          <div
            key={col}
            className={`color-circle ${color === col ? "selected" : ""}`}
            style={{ backgroundColor: col }}
            onClick={() => setColor(col)}
          />
        ))}
      </div>
      <button className="btn btn-large" disabled={isUpLoading}>
        Post
      </button>
    </form>
  );
}

function BackButton({ currentPath, setCurrentPath }) {
  if (!currentPath.includes("/")) return null;
  function getParentPath() {
    setCurrentPath(currentPath.substring(0, currentPath.lastIndexOf("/")));
  }
  return (
    <button className="btn btn-back" onClick={getParentPath}>
      Back
    </button>
  );
}

function Folders({
  currentPath,
  allFolders,
  setAllFolders,
  setIsLoading,
  isLoading,
  setCurrentPath,
}) {
  const [showAddFolder, setShowAddFolder] = useState(false);
  const clickFolder = (folder_name) => {
    setCurrentPath(currentPath + "/" + folder_name);
  };
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setIsLoading(true);
        console.log(`http://127.0.0.1:5000/get_info/${currentPath}/folders`);
        const response = await axios.get(
          `http://127.0.0.1:5000/get_info/${currentPath}/folders`
        );
        setAllFolders(response.data.folders_list);
      } catch (error) {
        console.error("Error fetching folders", error);
      } finally {
        setIsLoading(false);
        setShowAddFolder(false);
      }
    };

    fetchFolders();
  }, [currentPath, setIsLoading, setAllFolders]); // Depend on currentPath

  console.log(allFolders);
  console.log(isLoading);

  if (allFolders.length === 0) {
    return (
      <p className="message">
        No folders for this category yet! Create the first one 🤩
      </p>
    );
  }

  return isLoading ? (
    <Loader />
  ) : (
    <section className="links-section">
      <p>
        There {allFolders.length > 1 ? "are" : "is"} {allFolders.length}{" "}
        {allFolders.length > 1 ? "folders" : "folder"} in the database. Add
        another!
      </p>
      <button
        className="btn btn-back"
        onClick={() => setShowAddFolder(!showAddFolder)}
      >
        {showAddFolder ? "Close" : "Add"}
      </button>
      {showAddFolder ? (
        <NewFolderForm
          setAllFolders={setAllFolders}
          setShowAddFolder={setShowAddFolder}
          allFolders={allFolders}
          currentPath={currentPath}
        />
      ) : null}
      <ul className="links-list">
        {allFolders.map((folder) => (
          <div
            key="folder"
            className="link"
            onClick={() => clickFolder(folder)}
          >
            <p className="source">{folder}</p>
          </div>
        ))}
      </ul>
    </section>
  );
}

function NewFolderForm({
  setAllFolders,
  setShowAddFolder,
  allFolders,
  currentPath,
}) {
  const [text, setText] = useState("");
  const [isUpLoadingFolder, setIsUpLoadingFolder] = useState(false);
  const [description, setDescription] = useState("");
  const textLength = text.length;
  const category_name = currentPath.split("/")[0];

  async function handleSubmitFolder(e) {
    //1. Prevent browser reload
    e.preventDefault();
    console.log(text);

    //2. Check if data is valid. If so, create a new fact
    if (text && textLength <= 200) console.log("there is valid data");

    //3. Create a new fact object
    const data = {
      name: text,
      folder_path: currentPath,
    };

    //3. Upload Facts to Supabase and receive the new fact object
    setIsUpLoadingFolder(true);
    fetch(`http://127.0.0.1:5000/add_folder/${category_name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Category inserted into MongoDB.");
        } else {
          console.error("Failed to insert category into MongoDB.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    //4. Add the new fact to the UI: add the fact to state
    setAllFolders([...allFolders, data.name]);

    //5. Reset input fields
    setText("");
    setDescription("");

    //6. Close the form
    setShowAddFolder(false);
  }

  return (
    <form className="fact-form" onSubmit={handleSubmitFolder}>
      <input
        type="text"
        placeholder="Add a folder..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isUpLoadingFolder}
      />
      <span>{200 - textLength}</span>
      <input
        type="text"
        placeholder="Description of this folder..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isUpLoadingFolder}
      />

      <button className="btn btn-large" disabled={isUpLoadingFolder}>
        Post
      </button>
    </form>
  );
}

function Links({
  currentPath,
  allLinks,
  setAllLinks,
  setIsLoading,
  isLoading,
}) {
  const [showAddLink, setShowAddLink] = useState(false);
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `http://127.0.0.1:5000/get_info/${currentPath}/links`
        );
        setAllLinks(response.data.links_list);
      } catch (error) {
        console.error("Error fetching links", error);
      } finally {
        setIsLoading(false);
        setShowAddLink(false);
      }
    };

    fetchLinks();
  }, [currentPath, setIsLoading, setAllLinks]); // Depend on currentPath

  console.log(allLinks);
  console.log(isLoading);

  if (allLinks.length === 0) {
    return (
      <p className="message">
        No Links for this category yet! Create the first one 🤩
      </p>
    );
  }

  return isLoading ? (
    <Loader />
  ) : (
    <section className="links-section">
      <p>There are {allLinks.length} links in the database. Add another!</p>
      <button
        className="btn btn-back"
        onClick={() => setShowAddLink(!showAddLink)}
      >
        {showAddLink ? "Close" : "Add"}
      </button>
      {showAddLink ? (
        <NewLinkForm
          setAllLinks={setAllLinks}
          setShowAddLink={setShowAddLink}
          allLinks={allLinks}
          currentPath={currentPath}
        />
      ) : null}
      <ul className="links-list">
        {allLinks.map((link) => (
          <div key={link.href} className="link">
            <a className="source" href={link.opened_url}>
              {link.name}
            </a>
          </div>
        ))}
      </ul>
    </section>
  );
}

function NewLinkForm({ setAllLinks, setShowAddLink, allLinks, currentPath }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("http://example.com");
  const [isUpLoadingLink, setIsUpLoadingLink] = useState(false);
  const [description, setDescription] = useState("");
  const textLength = text.length;

  function isValidHttpUrl(string) {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }

  async function handleSubmitFolder(e) {
    //1. Prevent browser reload
    e.preventDefault();
    console.log(text);

    //2. Check if data is valid. If so, create a new fact
    if (text && textLength <= 200 && isValidHttpUrl(source))
      console.log("there is valid data");

    //3. Create a new fact object
    const data = {
      name: text,
      opened_url: source,
    };

    //3. Upload Facts to Supabase and receive the new fact object
    setIsUpLoadingLink(true);
    fetch(`http://127.0.0.1:5000/add_link/${currentPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Link inserted into MongoDB.");
        } else {
          console.error("Failed to insert link into MongoDB.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });

    //4. Add the new fact to the UI: add the fact to state
    setAllLinks([...allLinks, data]);

    //5. Reset input fields
    setText("");
    setSource("");
    setDescription("");

    //6. Close the form
    setShowAddLink(false);
  }

  return (
    <form className="fact-form" onSubmit={handleSubmitFolder}>
      <input
        type="text"
        placeholder="Add a link..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isUpLoadingLink}
      />
      <span>{200 - textLength}</span>
      <input
        type="text"
        placeholder="Trustworthy source..."
        value={source}
        onChange={(e) => setSource(e.target.value)}
        disabled={isUpLoadingLink}
      />
      <input
        type="text"
        placeholder="Description of this folder..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isUpLoadingLink}
      />

      <button className="btn btn-large" disabled={isUpLoadingLink}>
        Post
      </button>
    </form>
  );
}

export default App;
