const express = require("express");
const { mdToPdf } = require("md-to-pdf");
const { ArgumentParser } = require("argparse");
const multer = require("multer");
const libre = require("libreoffice-convert");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit-table");
const font = require("./Rubik-normal");

const { jsPDF } = require("jspdf");
require("jspdf-autotable");

const csvtojson = require("csvtojson");

async function parseCSV(csv) {
  const jsonArray = await csvtojson().fromString(csv);

  return {
    head: [
      [
        ...Object.keys(jsonArray[0])
          .map((x) => (!hasHebrew(x) ? x.split("").reverse().join("") : x))
          .reverse(),
        " ",
      ],
    ],
    body: jsonArray.map((x, i) => [
      ...Object.values(x)
        .map((x) => (!hasHebrew(x) ? x.split("").reverse().join("") : x))
        .reverse(),
      (i + 1).toString().split("").reverse().join(""),
    ]),
  };
}

function hasHebrew(str) {
  // This regex matches any Hebrew character
  const hebrewCharRegex = /[\u0590-\u05FF]/;

  // Test the string against the regex
  return hebrewCharRegex.test(str);
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    let ext = file.originalname.substring(
      file.originalname.lastIndexOf("."),
      file.originalname.length
    );
    cb(null, Date.now() + ext);
  },
});
const upload = multer({
  storage: storage,
});

if (!fs.existsSync("output")) fs.mkdirSync("output");

const parser = new ArgumentParser({
  description: "GEN PDF",
});

parser.add_argument("-p=", "--port", { help: "the port number" });

const app = express();

// const timeoutMiddleware = (req, res, next) => {
//   req.setTimeout(180000); // 3 minutes in milliseconds
//   next();
// };

//app.use(timeoutMiddleware);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));



app.post("/convert", upload.single("file"), async (req, res) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=table.pdf");

  let filePath = path.join(__dirname, "../uploads/", req.file.filename);
  const outputPath = path.join(__dirname, "../output/", Date.now() + ".pdf");
  const ext = req.file.filename.split(".")[1];

  if (ext == "csv") {
    console.log("csv");

    const csv = await parseCSV(fs.readFileSync(filePath).toString());

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting origional file:", err);
      }
    });

    const doc = new jsPDF({
      orientation:
        req.body.orientation == "portrait" ? "portrait" : "landscape",
    });

    doc.setR2L(true);

    doc.addFileToVFS("Rubik-normal.ttf", font);
    doc.addFont("Rubik-normal.ttf", "Rubik", "normal");

    doc.setFont("Rubik");

    doc.setFontSize(12);

    doc.autoTable({
      ...csv,
      theme: "grid",
      styles: { font: "Rubik", halign: "center" },
      showHead: "everyPage",

      margin: !req.body.title ? undefined : { top: 30 },
      didDrawPage: function (data) {
        if (!req.body.title) return;

        var pageWidth =
          doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text(req.body.title, pageWidth / 2, 20, { align: "center" });
      },
    });

    doc.save(outputPath);

    res.sendFile(outputPath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error downloading file");
        return;
      }

      // Delete the converted file after download
      res.on("finish", () => {
        fs.unlink(outputPath, (err) => {
          if (err) {
            console.error("Error deleting converted file:", err);
          }
        });
      });
    });

    return;
  }

  const extend = ".pdf";

  const file = fs.readFileSync(filePath);
  console.log("starting to convert")
  libre.convert(file, extend, undefined, (err, done) => {
    
    if (err) {
      console.log(`Error converting file: ${err}`);
      res.status(500).send("Error converting file");
      return;
    }

    fs.writeFileSync(outputPath, done);
    console.log("output to file")

    // Once the file is converted, delete the original file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting original file:", err);
      }
    });

    res.sendFile(outputPath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error downloading file");
        return;
      }

      // Delete the converted file after download
      res.on("finish", () => {
        fs.unlink(outputPath, (err) => {
          if (err) {
            console.error("Error deleting converted file:", err);
          }
        });
      });
    });
  });
});

app.get("/", (req, res) => {
  res.send(`
    <form action="/convert" method="post" enctype="multipart/form-data">
      <input type="file" name="file" accept=".pptx,.docx,.xlsx,.jpg,.png,.gif,.bmp,.tiff,.txt,.csv,.html,.rtf">
      <input type="text" name="title" />
      <button type="submit">Convert to PDF</button>
    </form>
  `);
});

const port = parser.parse_args().port;

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
