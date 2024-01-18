import urllib.parse
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

uri = "mongodb+srv://kunlin:password1234567@webnote-app.aiu2k.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(uri)
db = client["webnote-app"]

collectionName = "notes"

if collectionName not in db.list_collection_names():
    db.create_collection(collectionName)
collection = db[collectionName]

@app.route('/generate_bookmarklet', methods=['GET', 'POST'])
def generate_bookmarklet():
    # JavaScript code as a string
    js_code = """
function generateXPath(element) {
  if (!element || !(element instanceof Element)) {
    return '';
  }

  if (element.id !== "") {
    return 'id("' + element.id + '")';
  }
  if (element === document.body) {
    return element.tagName.toLowerCase();
  }

  let ix = 1;
  const siblings = element.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      const xpath = generateXPath(element.parentNode) + '/' + element.tagName.toLowerCase();
      return siblings.length > 1 ? xpath + '[' + ix + ']' : xpath;
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

function getSelectedText() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();
  const xpath = generateXPath(range.commonAncestorContainer);
  alert("Selected Text: " + selectedText + "\nXPath: " + xpath);
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  const style = document.createElement('style');
  style.innerHTML = `
    .highlighted-text {
      background-color: yellow; /* Define your desired highlighting style */
    }
  `;

  document.head.appendChild(style);

  const span = document.createElement('span');
  span.className = 'highlighted-text';
  range.surroundContents(span);

  const startContainerXPath = generateXPath(range.startContainer);

  const data = {
    "selected_text": selectedText,
    "highlighted_html": span.outerHTML,
    "opened_url": window.location.href,
    "range_start_offset": startOffset,
    "range_end_offset": endOffset,
    "startContainer_xpath": startContainerXPath,
  };

  fetch('http://127.0.0.1:5000/insert_data/' + encodeURIComponent(window.location.href), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  .then(response => {
    if (response.ok) {
      console.log("Data inserted into MongoDB.");
    } else {
      console.error("Failed to insert data into MongoDB.");
    }
  })
  .catch(error => {
    console.error("Error:", error);
  });
}

getSelectedText();
    """
    compressed_js = js_code.replace('\n', '').replace('  ', '')
    encoded_js = urllib.parse.quote(compressed_js)
    bookmarklet_url = f"javascript:{encoded_js}"
    print("Bookmarklet URL:")
    print(bookmarklet_url)
    return jsonify(bookmarklet_url=bookmarklet_url)

@app.route('/insert_data/<path:opened_url>', methods=['GET','POST'])
def insert_data(opened_url):
    data = request.json
    # Check if the document exists for the given opened_url
    existing_data = collection.find_one({"opened_url": opened_url})
    
    if existing_data:
        # If the document already exists, append the new data to the 'texts' list
        collection.update_one({"opened_url": opened_url}, {"$push": {"texts": data}})
    else:
        # If the document doesn't exist, create a new one with the 'texts' list
        collection.insert_one({"opened_url": opened_url, "texts": [data]})
    return jsonify(message="Data inserted into MongoDB")

@app.route('/generate_notes_bookmarklet', methods=['GET'])
def generate_notes_bookmarklet():
    js_code = """
function getNotes() {
    fetch('http://127.0.0.1:5000/get_notes/' + encodeURIComponent(window.location.href))
    .then(response => response.json())
    .then(notes => {
        console.log('Notes retrieved:', notes);
        for (const note of notes) {
            const selected_text = note["selected_text"];
            const start_offset = note["range_start_offset"];
            const end_offset = note["range_end_offset"];
            const startContainerXPath = note["startContainer_xpath"];

            const startContainer = document.evaluate(
              startContainerXPath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;

            let textNode = null;
            for (let node = startContainer.firstChild; node; node = node.nextSibling) {
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== "") {
                    textNode = node;
                    break;
                }
            }

            console.log('Start container:', startContainer);
            console.log('Text node:', textNode);

            const range = document.createRange();
            range.setStart(textNode, start_offset);
            range.setEnd(textNode, end_offset);

            const style = document.createElement('style');
            style.innerHTML = `
              .highlighted-text {
                background-color: yellow; /* Define your desired highlighting style */
              }
            `;

            document.head.appendChild(style);

            const span = document.createElement('span');
            span.className = 'highlighted-text';
            range.surroundContents(span);
        }
    })
    .catch(error => {
        console.error('Error fetching notes:', error);
    });
};
getNotes();
    """
    compressed_js = js_code.replace('\n', '').replace('  ', '')
    encoded_js = urllib.parse.quote(compressed_js)
    bookmarklet_url = f"javascript:{encoded_js}"
    return jsonify(notes_bookmarklet_url=bookmarklet_url)

@app.route('/get_notes/<path:opened_url>', methods=['GET'])
def get_notes(opened_url):
    try:
        # Filter notes based on the opened URL
        notes = collection.find_one({"opened_url": opened_url})
        texts = notes.get("texts", [])
        notes_list = []
        for note in texts:
            if 'highlighted_html' in note:
                notes_list.append({
                    "highlighted_html": note["highlighted_html"],
                    "selected_text": note["selected_text"],
                    # "xpath": note["xpath"],
                    "range_start_offset": note["range_start_offset"],
                    "range_end_offset": note["range_end_offset"],
                    "startContainer_xpath": note["startContainer_xpath"]
                })
        return jsonify(notes_list)
    except Exception as e:
        return jsonify(error=f"An error occurred: {e}")
    
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
