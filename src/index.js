const express = require("express");
const { mdToPdf } = require("md-to-pdf");

const app = express();
app.use(express.json());

app.post("/generate-pdf", async (req, res) => {
  const { data } = req.body;

  // Create a new PDF document

  // Set the response headers for PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=table.pdf");

  const table = (await import("markdown-table")).markdownTable([
    Object.keys(data[0]),
    [...data.slice(1).map((x) => Object.values(x))],
  ]);

  console.log(table);

  const pdf = await mdToPdf({ content: table });
  // Create a new page

  // Send the PDF as the response
  res.send(pdf.content);
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
