const express = require("express");
const { mdToPdf } = require("md-to-pdf");
const { ArgumentParser } = require('argparse');
const multer = require('multer');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const upload = multer({ dest: 'uploads/' });

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

app.post('/convert-to-pdf', upload.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const fileType = originalname.split('.').pop().toLowerCase();
  const pdfPath = `converted/${originalname}.pdf`;

  try {
    const pdfDoc = await PDFDocument.create();

    if (fileType === 'doc' || fileType === 'docx') {
      // Convert Word document to PDF
      const docBytes = fs.readFileSync(path);
      const docPdf = await pdfDoc.embedFont(docBytes);
      const docPage = pdfDoc.addPage();
      docPage.setFont(docPdf);
      docPage.drawText('Converted from Word document');

    } else if (fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png') {
      // Convert image to PDF
      const image = await pdfDoc.embedJpg(fs.readFileSync(path));
      const imagePage = pdfDoc.addPage();
      imagePage.drawImage(image, { x: 0, y: 0 });

    } else if (fileType === 'xlsx' || fileType === 'xls') {
      // Convert Excel file to PDF (sample implementation)
      const excelText = fs.readFileSync(path, 'utf-8');
      const excelPage = pdfDoc.addPage();
      excelPage.drawText('Converted from Excel file');
      excelPage.drawText(excelText, { y: 500 });

    } else {
      throw new Error('Invalid file format');
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(pdfPath, pdfBytes);

    const pdfData = fs.readFileSync(pdfPath);
    res.contentType('application/pdf');
    res.send(pdfData);
  } catch (error) {
    res.status(500).send({ error: error.message });
  } finally {
    // Delete the uploaded file and the converted PDF file
    fs.unlinkSync(path);
    fs.unlinkSync(pdfPath);
  }
});



const port  = parser.parse_args().port;

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
