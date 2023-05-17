const express = require("express");
const { mdToPdf } = require("md-to-pdf");
const { ArgumentParser } = require('argparse');


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
    [...data.slice(1).map((x) => Object.values(x))],
  ], { align: "c" });


  const pdf = await mdToPdf({ content: table });
  // Create a new page

  // Send the PDF as the response
  res.send(pdf.content);
});


const port  = parser.parse_args().port;

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
