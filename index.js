const express = require("express");
const puppeteer = require("puppeteer");
const Diff = require("diff");

const app = express();
const port = 3000;

// Middleware для парсинга JSON и URL-кодированных данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function fetchHtmlContent(url) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle0" });

	// Получаем HTML-контент страницы
	const htmlContent = await page.content();
	await browser.close();

	return htmlContent;
}

async function getHtmlContent(url) {
	if (!url) {
		throw new Error("URL не может быть undefined или пустым.");
	}

	// Загружаем HTML с сайта
	console.log(`Загрузка HTML с ${url}.`);
	return await fetchHtmlContent(url);
}

app.get("/", (req, res) => {
	// Возвращаем HTML-форму для ввода URL-адресов
	res.send(`
    <html>
    <head>
      <title>Сравнение HTML-страниц</title>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        input {
          width: 50%;
          display: block;
          margin: 10px 0;
        }
        .result {
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Сравнение HTML-страниц</h1>
      <form id="urlForm">
        <label for="prodUrl">Prod URL:</label>
        <input type="text" id="prodUrl" name="prodUrl" required>
        
        <label for="devUrl">Dev URL:</label>
        <input type="text" id="devUrl" name="devUrl" required>
        
        <button type="submit">Сравнить</button>
      </form>
      <div class="result" id="resultContainer"></div>

      <script>
        const form = document.getElementById('urlForm');
        form.onsubmit = async (e) => {
          e.preventDefault(); // Отключаем стандартное поведение формы

          // Получаем значения инпутов
          const prodUrl = document.getElementById('prodUrl').value;
          const devUrl = document.getElementById('devUrl').value;

          // Отправляем данные как JSON
          const response = await fetch('/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json' // Указываем, что отправляем JSON
            },
            body: JSON.stringify({ prodUrl, devUrl }) // Отправляем данные как JSON
          });

          const resultHtml = await response.text();
          document.getElementById('resultContainer').innerHTML = resultHtml;
        };
      </script>
    </body>
    </html>
  `);
});

app.post("/", async (req, res) => {
	const { prodUrl, devUrl } = req.body;

	// Добавление отладочного вывода
	console.log("Полученные данные:", req.body);

	if (!prodUrl || !devUrl) {
		return res.status(400).send("Оба URL должны быть указаны.");
	}

	try {
		const prodHtml = await getHtmlContent(prodUrl);
		const devHtml = await getHtmlContent(devUrl);

		const diff = Diff.diffChars(prodHtml, devHtml);

		let addedCount = 0;
		let removedCount = 0;
		diff.forEach((part) => {
			if (part.added) {
				addedCount++;
			} else if (part.removed) {
				removedCount++;
			}
		});

		// Создаём HTML-контент для вывода различий
		let htmlOutput = `
      <h2>Отчет</h2>
      <pre>
      {
        "addedCount": ${addedCount},
        "removedCount": ${removedCount}
      }
      </pre>
      <h2>Различия</h2>
      <pre>`;

		diff.forEach((part) => {
			// Добавляем цвет в зависимости от типа изменений
			const color = part.added ? "#24b703" : part.removed ? "#fc8385" : "black";
			htmlOutput += `<span style="color:${
				color === "black" ? "black" : "white"
			}; background: ${color === "black" ? "white" : color}; font-size: ${
				color === "black" ? "14px" : "18px"
			}">${part.value.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`;
		});

		htmlOutput += "</pre>";

		// Отправляем результат обратно на ту же страницу
		res.send(htmlOutput);
	} catch (error) {
		console.error(error);
		res.status(500).send("Произошла ошибка при получении HTML-контента.");
	}
});

app.listen(port, () => {
	console.log(`Сервер запущен на http://localhost:${port}`);
});
