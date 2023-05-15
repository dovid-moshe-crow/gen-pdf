import express, { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';

const app = express();

app.get('/generate-pdf', (req: Request, res: Response) => {
  const text = req.query.text as string; // Assuming the string is passed as a query parameter 'text'

  // Create a new PDF document
  const doc = new PDFDocument();

  // Set the response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=generated.pdf');

  // Register a Hebrew font
  doc.registerFont('HebrewFont', './fonts/Rubik-Regular.ttf'); // Replace 'path/to/hebrew-font.ttf' with the actual path to your Hebrew font file

  // Set the font to the Hebrew font
  doc.font('HebrewFont');

  // Pipe the PDF document to the response
  doc.pipe(res);

  // Write the Hebrew text to the PDF
  doc.text(text, 50, 50); // You can adjust the position (50, 50) according to your needs

  // End the PDF document
  doc.end();
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
