const prodUrl =
	"https://usmutualfunds.rbcgam.com/us/mutual-funds/funds?share-class=iShares&tab=overview";
const devUrl =
	"https://inter.rbc-gam-dev.dotcms.cloud/us/mutual-funds/funds?share-class=iShares&tab=overview";

const express = require("express");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio"); // Импортируем cheerio
const app = express();
const path = require("path");
const fs = require("fs");
const port = 3000;
import { v4 as uuidv4 } from "uuid";

async function fetchAndSaveHtmlContent(url, filePath) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle0" });

	// Получаем HTML-контент страницы
	const htmlContent = await page.content();
	await browser.close();

	// Сохраняем HTML в файл
	fs.writeFileSync(filePath, htmlContent, "utf-8");

	return htmlContent;
}

async function getHtmlContent(url) {
	// Определяем имя файла для сохранения HTML на основе URL
	const urlFileName = url.replace(/[^a-zA-Z0-9]/g, "_") + ".html";
	const filePath = path.join(__dirname, "saved_html", urlFileName);

	// Проверяем, существует ли файл с сохранённым HTML
	if (fs.existsSync(filePath)) {
		console.log(`Файл ${filePath} существует. Чтение из файла.`);
		return fs.readFileSync(filePath, "utf-8");
	}

	// Если файл не найден, загружаем HTML с сайта и сохраняем его
	console.log(`Файл ${filePath} не найден. Загрузка HTML.`);
	return await fetchAndSaveHtmlContent(url, filePath);
}

// Функция для извлечения DOM-дерева с помощью cheerio
function extractDomTree(html) {
	const $ = cheerio.load(html);

	function traverseElement(elem) {
		const tagName = elem.tagName;
		const attribs = elem.attribs || {};
		const children = [];

		$(elem)
			.children()
			.each((_, childElem) => {
				children.push(traverseElement(childElem));
			});

		return {
			id: uuidv4(),
			tag: tagName,
			attributes: attribs,
			content: $(elem).html().trim(),
			children: children.length ? children : null,
		};
	}

	const rootElement = $("html").get(0);
	return traverseElement(rootElement);
}

function saveDomTree(url, domTree) {
	const urlFileName = url.replace(/[^a-zA-Z0-9]/g, "_") + "_dom.json";
	const filePath = path.join(__dirname, "saved_dom", urlFileName);
	fs.writeFileSync(filePath, JSON.stringify(domTree, null, 2), "utf-8");
}

app.get("/", async (req, res) => {
	try {
		const prodHtml = await getHtmlContent(prodUrl);
		const devHtml = await getHtmlContent(devUrl);

		// Извлекаем DOM-дерево для prodUrl и devUrl
		const prodDomTree = extractDomTree(prodHtml);
		const devDomTree = extractDomTree(devHtml);

		// Сохраняем DOM-дерево и HTML для prodUrl
		saveDomTree(prodUrl, prodDomTree);
		saveDomTree(devUrl, devDomTree);

		// Устанавливаем тип контента как JSON и отправляем результат
		res.set("Content-Type", "application/json");
		res.send({ prodDomTree, devDomTree });
	} catch (error) {
		console.error(error);
		res.status(500).send("Произошла ошибка при получении HTML-контента.");
	}
});

app.listen(port, () => {
	console.log(`Сервер запущен на http://localhost:${port}`);
});
