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
    head: Object.keys(jsonArray[0]),
    body: jsonArray.slice(1).map((x) => Object.values(x)),
  };
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

const timeoutMiddleware = (req, res, next) => {
  req.setTimeout(180000); // 3 minutes in milliseconds
  next();
};

app.use(timeoutMiddleware);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

app.post("/pdf-table", async (req, res) => {
  const { data, headers } = req.body;

  // Create a new PDF document

  // Set the response headers for PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=table.pdf");

  const table = (await import("markdown-table")).markdownTable(
    [
      Object.keys(data[0]).map((x) => headers[x]),
      ...data.map((x) => [...Object.values(x)]),
    ],
    { align: "c" }
  );

  const pdf = await mdToPdf({ content: table });
  // Create a new page

  // Send the PDF as the response
  res.send(pdf.content);
});

app.post("/convert", upload.single("file"), async (req, res) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=table.pdf");

  let filePath = path.join(__dirname, "../uploads/", req.file.filename);
  const outputPath = path.join(__dirname, "../output/", Date.now() + ".pdf");
  const ext = req.file.filename.split(".")[1];

  if (ext == "csv") {
    console.log("csv");

    const csv = await parseCSV(fs.readFileSync(filePath).toString());

    const doc = new jsPDF();

    doc.addFileToVFS("Rubik-normal.ttf", font);
    doc.addFont("Rubik-normal.ttf", "Rubik", "normal");

   

    doc.setFont("Rubik");


    doc.setFontSize(12)

    doc.autoTable({...csv,styles:{"font":"Rubik"}});

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

    // let doc = new PDFDocument({ margin: 30, size: "A4" });
    // doc.font("./fonts/Rubik-Regular.ttf");

    ///const csv = await createPDFFromCSV(fs.readFileSync(filePath).toString());
    // fs.unlinkSync(filePath);

    // await doc.table(csv, {
    //   prepareHeader: () => doc.font("./fonts/Rubik-Regular.ttf"),
    //   prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
    //     doc.font("./fonts/Rubik-Regular.ttf");
    //   },
    // });

    // doc.pipe(res);
    // //done!
    // doc.end();
    return; //res.send(csv);
  }

  const extend = ".pdf";

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
      <button type="submit">Convert to PDF</button>
    </form>
  `);
});

const port = parser.parse_args().port;

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
