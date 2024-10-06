const axios = require("axios");
const cheerio = require("cheerio");

async function getDomTree(url) {
	try {
		// Получаем HTML страницы
		const { data } = await axios.get(url);

		// Загружаем HTML в cheerio
		const $ = cheerio.load(data);

		// Создаём массив для хранения тегов
		let domList = "";

		// Итерируем по элементам и добавляем их в список
		$("*").each((index, element) => {
			const tagName = element.tagName;
			if (tagName) {
				domList += `<li>${tagName}</li>`;
			}
		});

		return domList;
	} catch (error) {
		console.error("Error fetching the DOM:", error);
		throw error;
	}
}

module.exports = { getDomTree };
