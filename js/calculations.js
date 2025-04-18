// Рецепты материалов
const recipes = {
  "Электронные компоненты": { "Железная руда": 1, "Полиэлементная руда": 1, "Крокит": 1 },
  "Алюминий": { "Железная руда": 1, "Полиэлементная руда": 2, "Иридиум": 1 },
  "Сталь": { "Железная руда": 2, "Полиэлементная руда": 1, "Митрацит": 1 },
  "Титановый сплав": { "Железная руда": 1, "Полиэлементная руда": 1, "Титанит": 1 },
  "Нановолокно": { "Железная руда": 1, "Полиэлементная руда": 1, "Брадий": 1 },
  "Полимеры": { "Полиорганическая руда": 2, "Полиэлементная руда": 1 },
  "Композиты": {
    "Полиорганическая руда": 2,
    "Полиэлементная руда": 1,
    "Железная руда": 1,
    "Иридиум": 1,
    "Митрацит": 1
  }
};

// Преобразования руды/урана в минералы (+10%)
const oreConversions = {
  "Титанит": { ore: "Железная руда", amount: 40 },
  "Брадий": { ore: "Железная руда", amount: 20 },
  "Крокит": { ore: "Железная руда", amount: 6 },
  "Митрацит": { ore: "Железная руда", amount: 4 },
  "Иридиум": { ore: "Железная руда", amount: 4 }
};
const uraniumConversions = {
  "Митрацит": { amount: 2 },
  "Иридиум": { amount: 2 },
  "Крокит": { amount: 3 },
  "Брадий": { amount: 10 },
  "Титанит": { amount: 20 }
};

// Список базовых руд
const baseOres = [
  "Железная руда",
  "Полиэлементная руда",
  "Полиорганическая руда",
  "Уран"
];

// Получить потребности по рецепту
function getRecipeNeeds(product, count) {
  const recipe = recipes[product];
  if (!recipe) return {};
  const needs = {};
  for (const [mat, qty] of Object.entries(recipe)) {
    needs[mat] = (needs[mat] || 0) + qty * count;
  }
  return needs;
}

// Жадный расчёт максимального количества каждого материала из запасов
function getMaxMaterialsFromStock(stock, conversions = {}) {
  const result = {};
  // Копируем запасы, чтобы не портить оригинал
  let available = {...stock};

  // Для каждого материала считаем, сколько можно сделать
  Object.entries(recipes).forEach(([material, recipe]) => {
    let canMake = Infinity;
    // Для каждого ингредиента в рецепте
    Object.entries(recipe).forEach(([mat, qty]) => {
      let have = available[mat] || 0;
      // Если минерал выбран для преобразования, добавляем к запасу то, что можно получить из руды/урана
      if (conversions[mat]) {
        have += conversions[mat];
      }
      canMake = Math.min(canMake, Math.floor(have / qty));
    });
    result[material] = canMake > 0 ? canMake : 0;
    // После расчёта вычитаем использованные ресурсы
    if (canMake > 0) {
      Object.entries(recipe).forEach(([mat, qty]) => {
        let used = qty * canMake;
        if (available[mat] >= used) {
          available[mat] -= used;
        } else {
          // Если часть минерала была преобразована, сначала тратим свой запас, потом преобразованный
          let fromConversion = conversions[mat] || 0;
          let needFromConversion = used - (available[mat] || 0);
          available[mat] = 0;
          conversions[mat] = Math.max(0, fromConversion - needFromConversion);
        }
      });
    }
  });
  return result;
}

// Расчёт сколько минералов можно получить из руды/урана (по чекбоксам)
function getConversionsFromInputs() {
  // Пример: ищем чекбоксы и поля ввода преобразования
  // Ожидается: <input type="checkbox" id="convert-Железная руда"> и <input id="convert-amount-Крокит">
  const conversions = {};
  Object.keys(oreConversions).concat(Object.keys(uraniumConversions)).forEach(mineral => {
    const input = document.getElementById('convert-amount-' + mineral);
    if (input && !isNaN(parseInt(input.value, 10))) {
      conversions[mineral] = parseInt(input.value, 10) || 0;
    }
  });
  // Преобразуем минералы в руду/уран для вычитания из запасов
  const usedOres = {};
  Object.entries(conversions).forEach(([mineral, amount]) => {
    if (oreConversions[mineral]) {
      const {ore, amount: orePerMineral} = oreConversions[mineral];
      usedOres[ore] = (usedOres[ore] || 0) + Math.ceil(amount * orePerMineral * 1.1);
    }
    if (uraniumConversions[mineral]) {
      usedOres["Уран"] = (usedOres["Уран"] || 0) + Math.ceil(amount * uraniumConversions[mineral].amount * 1.1);
    }
  });
  return {conversions, usedOres};
}

// Основная функция расчёта
function calculateMaterials() {
  // Получаем запасы пользователя
  const userStock = {};
  baseOres.concat(Object.keys(oreConversions)).forEach(mat => {
    // id в разметке: stock-Железная-руда, stock-Полиэлементная-руда и т.д.
    const id = 'stock-' + mat.replace(/ /g, '-');
    const el = document.getElementById(id);
    if (el) userStock[mat] = parseInt(el.value, 10) || 0;
  });
  userStock["Уран"] = parseInt(document.getElementById('stock-Уран')?.value, 10) || 0;

  // Получаем преобразования из UI
  const {conversions, usedOres} = getConversionsFromInputs();

  // Вычитаем руду/уран, потраченную на преобразования
  const stockAfterConversion = {...userStock};
  Object.entries(usedOres).forEach(([ore, used]) => {
    stockAfterConversion[ore] = Math.max(0, (stockAfterConversion[ore] || 0) - used);
  });

  // Добавляем преобразованные минералы к запасам
  const mineralsFromConversion = {...conversions};
  Object.keys(mineralsFromConversion).forEach(mineral => {
    stockAfterConversion[mineral] = (stockAfterConversion[mineral] || 0) + mineralsFromConversion[mineral];
  });

  // Считаем максимальное количество каждого материала
  const maxMaterials = getMaxMaterialsFromStock(stockAfterConversion);

  // Обновляем UI для материалов (нижняя таблица)
  Object.keys(recipes).forEach(material => {
    const el = document.getElementById('material-output-' + material.replace(/ /g, '-'));
    if (el) {
      el.textContent = maxMaterials[material] || 0;
      el.setAttribute('data-raw', maxMaterials[material] || 0);
    }
  });
}

// Привязка событий
function attachCalcListeners() {
  // Привязываем к инпутам руды/минералов
  document.querySelectorAll('.ore-input').forEach(el => {
    el.addEventListener('input', () => {
      calculateMaterials();
    });
    el.addEventListener('change', () => {
      calculateMaterials();
    });
  });
  // Привязываем к инпутам преобразования минералов
  document.querySelectorAll('.mineral-input').forEach(el => {
    el.addEventListener('input', () => {
      calculateMaterials();
    });
    el.addEventListener('change', () => {
      calculateMaterials();
    });
  });
  // Привязываем к чекбоксам преобразования
  document.querySelectorAll('.convert-checkbox').forEach(cb => {
    cb.addEventListener('change', function() {
      if (window.toggleMineralInputs) window.toggleMineralInputs(this.getAttribute('data-ore'));
      calculateMaterials();
    });
  });
  // Привязываем к кнопке "Убрать остатки"
  const clearBtn = document.getElementById('clear-remainders');
  if (clearBtn) clearBtn.addEventListener('click', function() {
    if (window.clearRemainders) window.clearRemainders();
    calculateMaterials();
  });
}

// Форматирование ввода (пример)
function formatLeftInputs() {
  // ...реализуйте по необходимости...
}

// Экспортируем функции для index.html
window.attachCalcListeners = attachCalcListeners;
window.calculateMaterials = calculateMaterials;
window.formatLeftInputs = formatLeftInputs;