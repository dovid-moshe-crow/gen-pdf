import express, { Request, Response } from 'express';
import PDFDocument from 'pdfkit';

const app = express();
app.use(express.json());

app.post('/generate-pdf', (req: Request, res: Response) => {
  const { data } = req.body;

  // Create a new PDF document
  const doc = new PDFDocument();

  // Set the response headers for PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=table.pdf');

  // Pipe the PDF document to the response
  doc.pipe(res);

  // Retrieve the keys from the first object to use as table headers
  const keys = Object.keys(data[0]);

  const tableWidth = keys.length * 100;
  const startX = (doc.page.width - tableWidth) / 2;

  // Create table headers
  doc.font('./fonts/Rubik-Bold.ttf').fontSize(12);
  let x = startX;
  let y = 50;

  keys.forEach((key) => {
    doc.text(key, x, y);
    x += 100;
  });

  // Create table rows with data
  doc.font('./fonts/Rubik-Regular.ttf').fontSize(10);
  y = 70;

  data.forEach((item: Record<string, any>) => {
    x = startX;

    keys.forEach((key) => {
      doc.text(item[key].toString(), x, y);
      x += 100;
    });

    y += 20;
  });

  // Finalize the PDF and end the response
  doc.end();
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
