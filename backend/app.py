import urllib.parse
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

uri = "mongodb+srv://kunlin:password1234567@webnote-app.aiu2k.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(uri)
db = client["webnote-app"]

collectionNameNotes = "notes"
collectionNamePages = "webpages"

if collectionNameNotes not in db.list_collection_names():
    db.create_collection(collectionNameNotes)
collectionNotes = db[collectionNameNotes]

if collectionNamePages not in db.list_collection_names():
    db.create_collection(collectionNamePages)
collectionPages = db[collectionNamePages]

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
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();
  const xpath = generateXPath(range.commonAncestorContainer);
  alert("Selected Text: " + selectedText + "\nXPath: " + xpath);
  if (!selectedText.trim()) return; 
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;

  let absoluteStartOffset = range.startOffset;
  let node = startContainer;
  while (node.previousSibling) {
    node = node.previousSibling;
    absoluteStartOffset += (node.textContent || '').length;
  }

  let absoluteEndOffset = absoluteStartOffset + selectedText.length;

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
  console.log("Start Container XPath: " + startContainerXPath);
  
  const data = {
    "selected_text": selectedText,
    "highlighted_html": span.outerHTML,
    "opened_url": window.location.href,
    "range_start_offset": absoluteStartOffset,
    "range_end_offset": absoluteEndOffset,
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
    existing_data = collectionNotes.find_one({"opened_url": opened_url})
    
    if existing_data:
        # If the document already exists, append the new data to the 'texts' list
        collectionNotes.update_one({"opened_url": opened_url}, {"$push": {"texts": data}})
    else:
        # If the document doesn't exist, create a new one with the 'texts' list
        collectionNotes.insert_one({"opened_url": opened_url, "texts": [data]})
    return jsonify(message="Data inserted into MongoDB")

@app.route('/generate_notes_bookmarklet', methods=['GET'])
def generate_notes_bookmarklet():
    js_code = """
function getNotes() {
    fetch('http://127.0.0.1:5000/get_notes/' + encodeURIComponent(window.location.href))
    .then(response => response.json())
    .then(notes => {
        console.log('Notes retrieved:', notes);
        notes.sort((a, b) => a.range_start_offset - b.range_start_offset);
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

            if (!startContainer) continue;

            let found = false;
            let cumulativeLength = 0;
            let startNode, endNode, startOffset, endOffset;
            for (const node of startContainer.childNodes) {
                if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.className === 'highlighted-text')) {
                    const nodeLength = node.textContent.length;

                    if (!found && cumulativeLength + nodeLength >= note.range_start_offset) {
                        startNode = node;
                        startOffset = note.range_start_offset - cumulativeLength;
                        found = true;
                    }

                    if (found && cumulativeLength + nodeLength >= note.range_end_offset) {
                        endNode = node;
                        endOffset = note.range_end_offset - cumulativeLength;
                        break;
                    }

                    cumulativeLength += nodeLength;
                }
            }

            if (!startNode || !endNode) continue;

            console.log('Start container:', startContainer);
            console.log('Start node:', startNode);
            console.log('End node:', endNode);
            console.log('Start offset:', startOffset);
            console.log('End offset:', endOffset);

            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);

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
        notes = collectionNotes.find_one({"opened_url": opened_url})
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
    
@app.route('/get_info/<path:folder_path>/folders', methods=['GET'])
def get_folders(folder_path):
    try:
        category_name = folder_path.split('/')[0]
        result = collectionPages.find_one({"category_name": category_name}, {"folders": 1, "_id": 0})
        folders_list = []
        if result and "folders" in result :
            folders = result["folders"]
            folders_list = [folder["name"] for folder in folders if folder.get("folder_path") == folder_path]
        return jsonify(folders_list = folders_list)
    except Exception as e:
        return jsonify(error=f"An error occurred: {e}")
    
@app.route('/get_info/<path:folder_path>/links', methods=['GET'])
def get_links(folder_path):
    try:
        category_name = folder_path.split('/')[0]
        parts = folder_path.rsplit('/', 1)
        link_path = parts[0] if len(parts) > 1 else folder_path
        links_list = []
        folder_name = folder_path.split('/')[-1]
        if(link_path == folder_path):
            result = collectionPages.find_one({"category_name": category_name}, {"links": 1, "_id": 0})
            if result and "links" in result :
                links_list = result["links"]
        else:
            result = collectionPages.find_one({"category_name": category_name}, {"folders": 1, "_id": 0})
            if result and "folders" in result :
                folders = result["folders"]
                links_list_list = [folder["links"] for folder in folders if (folder.get("folder_path") == link_path) and (folder.get("name") == folder_name) and ("links" in folder)]
                links_list = links_list_list[0] if len(links_list_list) > 0 else []
        return jsonify(links_list=links_list)
    except Exception as e:
        return jsonify(error=f"An error occurred: {e}")
    
@app.route('/get_info/get_categories', methods=['GET'])
def get_categories():
    try:
        categories = collectionPages.find()
        categories_list = []
        for category in categories :
            categories_list.append({"category_name": category.get("category_name"), "color": category.get("color")})
        return jsonify(categories_list=categories_list)
    except Exception as e:
        return jsonify(error=f"An error occurred: {e}")
    
@app.route('/add_category', methods=['GET','POST'])
def add_category():
    data = request.json
    collectionPages.insert_one(data)
    return jsonify(message="Category inserted into MongoDB")
  
@app.route('/add_folder/<path:category_name>', methods=['GET','POST'])
def add_folder(category_name):
    try:
        data = request.json
        collectionPages.update_one(
        {"category_name": category_name},
        {"$push": {"folders": data}}
    )
        return jsonify(message="Folder inserted into MongoDB")
    except Exception as e:
        return jsonify(error=f"An error occurred: {e}")
    
@app.route('/add_link/<path:folder_path>', methods=['GET','POST'])
def add_link(folder_path):
    try:
        data = request.json
        category_name = folder_path.split('/')[0]
        if folder_path == category_name:
            collectionPages.update_one({"category_name": category_name},{"$push": {"links": data}})
        else:
            collectionPages.update_one({"category_name": category_name}, {"folders.folder_path": folder_path},{"$push": {"folders.$.links": data}})
        return jsonify(message="Link inserted into MongoDB")
    except Exception as e:
        return jsonify(error=f"An error occurred: {e}")

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
