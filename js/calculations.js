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
  let minerals = {...conversions};

  // Чтобы учесть вложенные рецепты (например, если минералы получаются из преобразования), 
  // нужно повторять цикл, пока что-то производится
  let changed = true;
  while (changed) {
    changed = false;
    Object.entries(recipes).forEach(([material, recipe]) => {
      // Если уже посчитали максимум для этого материала, пропускаем
      if (result[material] !== undefined) return;
      // Проверяем, хватает ли ресурсов (руды и минералов) на 1 материал
      let canMake = Infinity;
      Object.entries(recipe).forEach(([mat, qty]) => {
        let have = (available[mat] || 0) + (minerals[mat] || 0);
        canMake = Math.min(canMake, Math.floor(have / qty));
      });
      if (canMake > 0 && canMake !== Infinity) {
        result[material] = canMake;
        changed = true;
        // Вычитаем использованные ресурсы
        Object.entries(recipe).forEach(([mat, qty]) => {
          let need = qty * canMake;
          let fromAvailable = Math.min(available[mat] || 0, need);
          available[mat] = (available[mat] || 0) - fromAvailable;
          let leftNeed = need - fromAvailable;
          if (leftNeed > 0) {
            minerals[mat] = (minerals[mat] || 0) - leftNeed;
          }
        });
      } else {
        result[material] = 0;
      }
    });
  }
  return result;
}

// Расчёт сколько минералов можно получить из руды/урана (по чекбоксам)
function getConversionsFromInputs() {
  const conversions = {};
  Object.keys(oreConversions).concat(Object.keys(uraniumConversions)).forEach(mineral => {
    const input = document.getElementById('convert-amount-' + mineral);
    if (input) {
      conversions[mineral] = parseInputNumber(input.value);
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

// Подсчёт максимального количества минералов, которые можно преобразовать из руды/урана
function updateConverterLimits() {
  Object.keys(oreConversions).concat(Object.keys(uraniumConversions)).forEach(mineral => {
    let maxFromOre = 0, maxFromUran = 0;
    // Из руды
    if (oreConversions[mineral]) {
      const {ore, amount: orePerMineral} = oreConversions[mineral];
      const oreInput = document.getElementById('stock-' + ore.replace(/ /g, '-'));
      let oreHave = oreInput ? parseInputNumber(oreInput.value) : 0;
      maxFromOre = Math.floor(oreHave / (orePerMineral * 1.1));
    }
    // Из урана
    if (uraniumConversions[mineral]) {
      const uraniumInput = document.getElementById('stock-Уран');
      let uraniumHave = uraniumInput ? parseInputNumber(uraniumInput.value) : 0;
      maxFromUran = Math.floor(uraniumHave / (uraniumConversions[mineral].amount * 1.1));
    }
    // Итоговый максимум — сумма обоих способов
    const max = maxFromOre + maxFromUran;
    // Обновить поле ввода (ограничить максимум)
    const input = document.getElementById('convert-amount-' + mineral);
    if (input) {
      input.max = max;
      // Если текущее значение больше максимума — ограничить
      if (parseInputNumber(input.value) > max) input.value = formatNumber(max);
    }
    // Можно добавить отображение максимума (если есть отдельный элемент)
    const maxSpan = document.getElementById('max-convert-' + mineral);
    if (maxSpan) maxSpan.textContent = max;
  });
}

// Включение/отключение полей преобразования минералов по чекбоксам
function toggleMineralInputs(oreName) {
  // Для каждой руды определяем, какие минералы можно из неё преобразовать
  const oreToMinerals = {
    "Железная руда": ["Митрацит", "Иридиум", "Крокит", "Брадий", "Титанит"],
    "Уран": ["Митрацит", "Иридиум", "Крокит", "Брадий", "Титанит"],
    "Полиэлементная руда": [],
    "Полиорганическая руда": []
  };
  const minerals = oreToMinerals[oreName] || [];
  const isChecked = document.getElementById('convert-' + oreName.replace(/ /g, '-'))?.checked;
  minerals.forEach(mineral => {
    const input = document.getElementById('convert-amount-' + mineral);
    if (input) {
      input.disabled = !isChecked;
      input.value = isChecked ? (input.value === "-" ? "0" : input.value) : "-";
    }
  });
}

// Форматирование чисел с пробелами и сокращением до трлн (с учётом .000 → .0)
function formatNumber(num) {
  num = typeof num === "string" ? parseInputNumber(num) : num;
  if (!isFinite(num) || isNaN(num)) return "0";
  if (num >= 1_000_000_000_000) {
    let trillions = num / 1_000_000_000_000;
    // Если дробная часть .000, .100, .200 и т.д. — показываем 1 знак, иначе до 3 знаков
    let fixed = (trillions * 1000) % 10 === 0 ? 1 : 3;
    let str = trillions.toFixed(fixed).replace(/\.?0+$/, '');
    return str + ' трлн';
  }
  return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Парсинг строки с "трлн" или пробелами в целое число
function parseInputNumber(str) {
  if (typeof str !== "string") return 0;
  str = str.trim().replace(/\s+/g, ''); // удаляем все пробелы
  if (str === "") return 0;
  // Считаем "трлн" и "т" (в любом месте после числа) как триллионы
  const trlnMatch = str.match(/^([\d.,]+)(т|трлн)$/i);
  if (trlnMatch) {
    let val = trlnMatch[1].replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000_000_000);
    return 0;
  }
  // Также поддержка, если пользователь написал "18 трлн" с пробелом
  if (str.toLowerCase().includes('трлн') || str.toLowerCase().endsWith('т')) {
    let val = str.replace(/трлн|т/gi, '').replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000_000_000);
    return 0;
  }
  return parseInt(str, 10) || 0;
}

// Форматирование ввода: разрешить только числа, пробелы, точку, запятую и "трлн", форматировать только при потере фокуса
function formatLeftInputs() {
  document.querySelectorAll('.ore-input, .mineral-input').forEach(el => {
    // Фильтрация ввода: только цифры, пробелы, точка, запятая, "трлн"
    el.addEventListener('input', function () {
      // Оставляем только разрешённые символы
      let filtered = this.value.replace(/[^0-9.,\sтрлн]/gi, '');
      if (filtered !== this.value) {
        this.value = filtered;
      }
    });
    // При потере фокуса — форматируем
    el.addEventListener('blur', function () {
      let val = parseInputNumber(this.value);
      if (isNaN(val)) return;
      this.value = formatNumber(val);
      this.title = val > 0 ? val.toLocaleString('ru-RU') : '';
    });
    // При вставке из буфера: поддержка "17.646 трлн"
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      let text = (e.clipboardData || window.clipboardData).getData('text');
      // Оставляем только разрешённые символы
      let filtered = text.replace(/[^0-9.,\sтрлн]/gi, '');
      let val = parseInputNumber(filtered);
      this.value = formatNumber(val);
      this.title = val > 0 ? val.toLocaleString('ru-RU') : '';
      if (typeof calculateMaterials === "function") calculateMaterials();
      if (typeof updateConverterLimits === "function") updateConverterLimits();
    });
  });
}

// Основная функция расчёта
function calculateMaterials() {
  // Получаем запасы пользователя
  const userStock = {};
  baseOres.concat(Object.keys(oreConversions)).forEach(mat => {
    const id = 'stock-' + mat.replace(/ /g, '-');
    const el = document.getElementById(id);
    if (el) userStock[mat] = parseInputNumber(el.value);
  });
  userStock["Уран"] = parseInputNumber(document.getElementById('stock-Уран')?.value);

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

  // После расчёта maxMaterials
  const actuallyUsed = {};
  Object.entries(recipes).forEach(([material, recipe]) => {
    const count = maxMaterials[material] || 0;
    Object.entries(recipe).forEach(([mat, qty]) => {
      actuallyUsed[mat] = (actuallyUsed[mat] || 0) + qty * count;
    });
  });
  Object.entries(usedOres).forEach(([mat, qty]) => {
    actuallyUsed[mat] = (actuallyUsed[mat] || 0) + qty;
  });

  // === Обновляем остатки руды и минералов ===
  baseOres.concat(Object.keys(oreConversions), Object.keys(uraniumConversions)).forEach(mat => {
    const id = 'stock-' + mat.replace(/ /g, '-');
    const el = document.getElementById(id);
    let start = el ? parseInputNumber(el.value) : 0;
    let left = Math.max(0, start - (actuallyUsed[mat] || 0));
    let leftSpan = document.getElementById('left-' + mat.replace(/ /g, '-'));
    if (leftSpan) {
      leftSpan.textContent = left > 0 ? formatNumber(left) : '-';
      leftSpan.setAttribute('data-raw', left);
      leftSpan.title = left > 0 ? left.toLocaleString('ru-RU') : '';
      leftSpan.style.color = left > 0 ? 'red' : '';
    }
  });

  // Обновляем UI для материалов (нижняя таблица)
  Object.keys(recipes).forEach(material => {
    const el = document.getElementById('material-output-' + material.replace(/ /g, '-'));
    if (el) {
      const val = maxMaterials[material] || 0;
      el.textContent = formatNumber(val);
      el.setAttribute('data-raw', val);
      el.title = val > 0 ? val.toLocaleString('ru-RU') : '';
    }
  });

  updateConverterLimits();
}

// Очистка остатков: переносит остатки в поля преобразования и уменьшает количество руды/минералов
function clearRemainders() {
  baseOres.concat(Object.keys(oreConversions), Object.keys(uraniumConversions)).forEach(mat => {
    const leftSpan = document.getElementById('left-' + mat.replace(/ /g, '-'));
    const stockInput = document.getElementById('stock-' + mat.replace(/ /g, '-'));
    if (!leftSpan || !stockInput) return;
    let left = parseInputNumber(leftSpan.textContent);
    if (left > 0) {
      const convertInput = document.getElementById('convert-amount-' + mat);
      if (convertInput) {
        let prev = parseInputNumber(convertInput.value);
        convertInput.value = formatNumber(prev + left);
      }
      let current = parseInputNumber(stockInput.value);
      stockInput.value = formatNumber(Math.max(0, current - left));
      leftSpan.textContent = '-';
      leftSpan.style.color = '';
    }
  });
  calculateMaterials();
}

// Копировать значение из поля ввода руды/минерала (левая таблица)
function copyRowValue(name, inputEl) {
  let value = "";
  if (inputEl && inputEl.value !== undefined) {
    value = parseInputNumber(inputEl.value);
  } else {
    const id = 'stock-' + name.replace(/ /g, '-');
    const el = document.getElementById(id);
    if (el) value = parseInputNumber(el.value);
  }
  if (value !== undefined && value !== null) {
    navigator.clipboard.writeText(value.toString());
  }
}

// Копировать значение из ячейки материалов (правая таблица)
function copyMaterialValue(name, spanEl) {
  let value = "";
  if (spanEl && spanEl.textContent !== undefined) {
    value = parseInputNumber(spanEl.textContent);
  } else {
    const id = 'material-output-' + name.replace(/ /g, '-');
    const el = document.getElementById(id);
    if (el) value = parseInputNumber(el.textContent);
  }
  if (value !== undefined && value !== null) {
    navigator.clipboard.writeText(value.toString());
  }
}

// Привязка событий
function attachCalcListeners() {
  // Привязываем к инпутам руды/минералов
  document.querySelectorAll('.ore-input').forEach(el => {
    el.addEventListener('input', () => {
      calculateMaterials();
      updateConverterLimits(); // добавлено: обновлять лимиты преобразования при любом изменении руды
    });
    el.addEventListener('change', () => {
      calculateMaterials();
      updateConverterLimits();
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
      updateConverterLimits();
    });
    // Вызываем при инициализации для корректного состояния
    if (window.toggleMineralInputs) window.toggleMineralInputs(cb.getAttribute('data-ore'));
  });
  // Привязываем к кнопке "Убрать остатки"
  const clearBtn = document.getElementById('clear-remainders');
  if (clearBtn) clearBtn.addEventListener('click', function() {
    if (window.clearRemainders) window.clearRemainders();
    calculateMaterials();
    updateConverterLimits();
  });
}

// Экспортируем функции для index.html
window.attachCalcListeners = attachCalcListeners;
window.calculateMaterials = calculateMaterials;
window.formatLeftInputs = formatLeftInputs;
window.clearRemainders = clearRemainders;
window.updateConverterLimits = updateConverterLimits;
window.toggleMineralInputs = toggleMineralInputs;
window.copyRowValue = copyRowValue;
window.copyMaterialValue = copyMaterialValue;