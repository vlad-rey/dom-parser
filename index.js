const express = require("express");
const puppeteer = require("puppeteer");
const Diff = require("diff");
const beautify = require("js-beautify").html; // Подключаем js-beautify для форматирования HTML

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function fetchHtmlContent(url) {
	const browser = await puppeteer.launch({
		executablePath:
			"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", // Путь к Edge
		headless: true, // Убедитесь, что браузер работает в фоновом режиме
	});
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle0" });

	const htmlContent = await page.content();
	await browser.close();

	return htmlContent;
}

async function getHtmlContent(url) {
	if (!url) {
		throw new Error("URL не может быть undefined или пустым.");
	}

	console.log(`Загрузка HTML с ${url}.`);
	return await fetchHtmlContent(url);
}

app.get("/", (req, res) => {
	res.send(`
    <html>
    <head>
      <title>Сравнение HTML-страниц</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <style>
        html, body {
          font-family: 'Inter', sans-serif;
          max-width: 100vw;
          overflow-x: hidden;
          margin: 0;
          padding: 20px;
          background-color: #f5f7fa;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        h1, h2 {
          color: #4a4a4a;
          text-align: center;
        }
        form {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
        }
        input, button {
          width: 100%;
          padding: 12px;
          margin: 10px 0;
          border-radius: 8px;
          border: 1px solid #cbd5e0;
          font-size: 16px;
        }
        input {
          background-color: #edf2f7;
        }
        button {
          background-color: #a0e5b9;
          color: #4a4a4a;
          border: none;
          cursor: pointer;
        }
        button:hover {
          background-color: #8fd3a6;
        }
        .result {
          margin-top: 20px;
          max-width: 800px;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        pre {
          white-space: pre-wrap;
          color: #333;
        }
        .nav-button {
          position: fixed;
          bottom: 20px;
          padding: 10px 20px;
          background-color: #a0e5b9;
          color: #4a4a4a;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          width: max-content;
        }
        .prev-button {
          left: 20px;
        }
        .next-button {
          right: 20px;
        }
        .added {
          background-color: #4caf50; /* Зелёный фон для добавленных элементов */
          color: white;
        }
        .removed {
          background-color: #f44336; /* Красный фон для удалённых элементов */
          color: white;
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

      <button class="nav-button prev-button" id="prevButton">Назад</button>
      <button class="nav-button next-button" id="nextButton">Далее</button>

      <script>
        let currentIndex = -1;
        let differences = [];

        const form = document.getElementById('urlForm');
        form.onsubmit = async (e) => {
          e.preventDefault();

          const prodUrl = document.getElementById('prodUrl').value;
          const devUrl = document.getElementById('devUrl').value;

          const response = await fetch('/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prodUrl, devUrl })
          });

          const resultHtml = await response.text();
          document.getElementById('resultContainer').innerHTML = resultHtml;
          
          // После получения данных и вывода ищем различия
          differences = document.querySelectorAll('.added, .removed');
          if (differences.length > 0) {
            currentIndex = 0;
            highlightCurrent();
          }
        };

        function highlightCurrent() {
          // Снимаем выделение с предыдущих элементов
          differences.forEach(el => el.style.backgroundColor = '');

          if (currentIndex >= 0 && currentIndex < differences.length) {
            const currentElement = differences[currentIndex];
            currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            currentElement.style.backgroundColor = '#10182829'; // Подсвечиваем текущий элемент
          }
        }

        document.getElementById('prevButton').onclick = () => {
          if (currentIndex > 0) {
            currentIndex--;
            highlightCurrent();
          }
        };

        document.getElementById('nextButton').onclick = () => {
          if (currentIndex < differences.length - 1) {
            currentIndex++;
            highlightCurrent();
          }
        };
      </script>
    </body>
    </html>
  `);
});

app.post("/", async (req, res) => {
	const { prodUrl, devUrl } = req.body;

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

		let htmlOutput = `
      <div class="report">
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
			const color = part.added ? "#4caf50" : part.removed ? "#f44336" : "black";
			const formattedPart = beautify(part.value, {
				indent_size: 2,
				wrap_line_length: 80,
			}); // Форматируем HTML перед выводом
			const diffClass = part.added ? "added" : part.removed ? "removed" : "";
			htmlOutput += `<span class="${diffClass}" style="color:${
				color === "black" ? "black" : "white"
			}; background: ${color === "black" ? "white" : color}; font-size: ${
				color === "black" ? "14px" : "18px"
			}">${formattedPart.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`;
		});

		htmlOutput += "</pre></div>";

		res.send(htmlOutput);
	} catch (error) {
		console.error(error);
		res.status(500).send("Произошла ошибка при получении HTML-контента.");
	}
});

app.listen(port, () => {
	console.log(`Сервер запущен на http://localhost:${port}`);
});
