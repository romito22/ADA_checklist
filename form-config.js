<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ADA Restroom Inspection</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f4f4;
      padding: 40px;
    }

    .container {
      max-width: 1100px;
      margin: auto;
      background: white;
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 6px 18px rgba(0,0,0,.08);
    }

    h1 {
      margin: 0;
      color: #0f3fb8;
    }

    p {
      margin-top: 6px;
      color: #555;
    }

    .meta {
      background: #f8f9fc;
      padding: 20px;
      border-radius: 14px;
      margin: 25px 0;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .meta-field {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 220px;
    }

    .meta-field label {
      font-weight: bold;
      margin-bottom: 6px;
      color: #1e5eff;
    }

    input, select, textarea {
      padding: 8px;
      border-radius: 8px;
      border: 1px solid #ccc;
      font-size: 14px;
    }

    #form {
      margin-top: 20px;
    }

    .button-group {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    button {
      padding: 10px 18px;
      border-radius: 10px;
      border: none;
      font-weight: bold;
      cursor: pointer;
      font-size: 14px;
    }

    #submitBtn {
      background: black;
      color: white;
    }

    #resetBtn {
      background: #ddd;
    }

    #preview {
      margin-top: 25px;
      background: #efefef;
      padding: 15px;
      border-radius: 12px;
      font-family: monospace;
      white-space: pre-wrap;
      font-size: 12px;
    }
  </style>
</head>

<body>
  <div class="container">

    <h1 id="title"></h1>
    <p id="description"></p>

    <!-- META DATA -->
    <div class="meta">
      <div class="meta-field">
        <label for="floorSelect">Floor (1–6)</label>
        <select id="floorSelect">
          <option value="">Select...</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
        </select>
      </div>

      <div class="meta-field">
        <label for="roomInput">Room / Area</label>
        <input id="roomInput" type="text" placeholder="e.g. WC 101">
      </div>

      <div class="meta-field">
        <label for="restroomType">Restroom Type</label>
        <select id="restroomType">
          <option value="">Select...</option>
          <option value="Men">Men</option>
          <option value="Women">Women</option>
          <option value="Family">Family</option>
        </select>
      </div>
    </div>

    <!-- FORM QUESTIONS -->
    <form id="form"></form>

    <!-- BUTTONS -->
    <div class="button-group">
      <button id="resetBtn" type="button">Reset</button>
      <button id="submitBtn" type="button">Submit</button>
    </div>

    <!-- DEBUG / PREVIEW -->
    <div id="preview"></div>

  </div>

  <!-- IMPORTANT -->
  <script type="module" src="./app.js"></script>

</body>
</html>
