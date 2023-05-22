const express = require("express");
const { mdToPdf } = require("md-to-pdf");
const { ArgumentParser } = require('argparse');
const multer = require('multer');
const libre = require('libreoffice-convert');
const { exec } = require('child_process');
const path = require('path');
const fs = require("fs");


const upload = multer({ dest: '../uploads/' });

const parser = new ArgumentParser({
  description: 'GEN PDF'
});

parser.add_argument("-p=", "--port", { help: 'the port number' });

const app = express();
app.use(express.json());



app.post("/pdf-table", async (req, res) => {
  const { data, headers } = req.body;

  // Create a new PDF document

  // Set the response headers for PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=table.pdf");

  const table = (await import("markdown-table")).markdownTable([
    Object.keys(data[0]).map(x => headers[x]),
    ...data.map((x) => [...Object.values(x)]),
  ], { align: "c" });


  const pdf = await mdToPdf({ content: table });
  // Create a new page

  // Send the PDF as the response
  res.send(pdf.content);
});

app.post('/convert', upload.single('file'), (req, res) => {
  const filePath = path.join(__dirname, '../uploads/', req.file.filename);
  const outputPath = path.join(__dirname, '../output/', Date.now() + '.pdf');
  const extend = '.pdf';

  const file = fs.readFileSync(filePath);
  libre.convert(file, extend, undefined, (err, done) => {
    if (err) {
      console.log(`Error converting file: ${err}`);
      res.status(500).send("Error converting file");
      return;
    }

    fs.writeFileSync(outputPath, done);

    // Once the file is converted, delete the original file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting original file:", err);
      }
    });

    res.download(outputPath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error downloading file");
        return;
      }

      // Delete the converted file after download
      res.on('finish', () => {
        fs.unlink(outputPath, (err) => {
          if (err) {
            console.error("Error deleting converted file:", err);
          }
        });
      });
    });
  });
});

app.get('/', (req, res) => {
  res.send(`
    <form action="/convert" method="post" enctype="multipart/form-data">
      <input type="file" name="file" accept=".pptx,.docx,.xlsx,.jpg,.png,.gif,.bmp,.tiff,.txt,.csv,.html,.rtf">
      <button type="submit">Convert to PDF</button>
    </form>
  `);
});




const port = parser.parse_args().port;

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
