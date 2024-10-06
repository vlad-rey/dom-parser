const express = require("express");
const { getDomTree } = require("./modules/scraper");

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
	try {
		const url = req.query.url || "https://example.com"; // URL можно передавать через query params
		const domTree = await getDomTree(url);
		res.send(`<ul>${domTree}</ul>`);
	} catch (error) {
		res.status(500).send("Error occurred while fetching DOM tree");
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
