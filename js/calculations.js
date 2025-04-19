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
  "Титанит": [
    { ore: "Железная руда", amount: 40 },
    { ore: "Полиэлементная руда", amount: 40 },
    { ore: "Полиорганическая руда", amount: 40 }
  ],
  "Брадий": [
    { ore: "Железная руда", amount: 20 },
    { ore: "Полиэлементная руда", amount: 20 },
    { ore: "Полиорганическая руда", amount: 20 }
  ],
  "Крокит": [
    { ore: "Железная руда", amount: 6 },
    { ore: "Полиэлементная руда", amount: 6 },
    { ore: "Полиорганическая руда", amount: 6 }
  ],
  "Митрацит": [
    { ore: "Железная руда", amount: 4 },
    { ore: "Полиэлементная руда", amount: 4 },
    { ore: "Полиорганическая руда", amount: 4 }
  ],
  "Иридиум": [
    { ore: "Железная руда", amount: 4 },
    { ore: "Полиэлементная руда", amount: 4 },
    { ore: "Полиорганическая руда", amount: 4 }
  ]
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
  let produced = {}; // чтобы не зациклиться
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
        produced[material] = true;
        // ВАЖНО: сначала вычитаем из available, потом из minerals!
        Object.entries(recipe).forEach(([mat, qty]) => {
          let need = qty * canMake;
          let fromAvailable = Math.min(available[mat] || 0, need);
          available[mat] = (available[mat] || 0) - fromAvailable;
          let leftNeed = need - fromAvailable;
          if (leftNeed > 0) {
            minerals[mat] = (minerals[mat] || 0) - leftNeed;
          }
        });
      }
    });
  }
  // Для тех материалов, которые не были произведены, явно ставим 0
  Object.keys(recipes).forEach(material => {
    if (result[material] === undefined) result[material] = 0;
  });
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
      oreConversions[mineral].forEach(conv => {
        usedOres[conv.ore] = (usedOres[conv.ore] || 0) + Math.ceil(amount * conv.amount * 1.1);
      });
    }
    if (uraniumConversions[mineral]) {
      usedOres["Уран"] = (usedOres["Уран"] || 0) + Math.ceil(amount * uraniumConversions[mineral].amount * 1.1);
    }
  });
  return {conversions, usedOres};
}

// Подсчёт максимального количества минералов, которые можно преобразовать из руды/урана
function updateConverterLimits(available = null) {
  // Собираем все включённые руды для преобразования
  const enabledOres = [];
  ["Железная руда", "Полиэлементная руда", "Полиорганическая руда", "Уран"].forEach(ore => {
    const cb = document.getElementById('convert-' + ore.replace(/ /g, '-'));
    if (!cb || cb.checked) enabledOres.push(ore);
  });

  Object.keys(oreConversions).concat(Object.keys(uraniumConversions)).forEach(mineral => {
    let max = 0;
    // Суммируем максимум по всем включённым рудам
    if (oreConversions[mineral]) {
      oreConversions[mineral].forEach(conv => {
        if (enabledOres.includes(conv.ore)) {
          // Используем available если передан, иначе stock
          let oreInput = document.getElementById('stock-' + conv.ore.replace(/ /g, '-'));
          let oreHave = available ? (available[conv.ore] || 0) : (oreInput ? parseInputNumber(oreInput.value) : 0);
          max += Math.floor(oreHave / (conv.amount * 1.1));
        }
      });
    }
    if (enabledOres.includes("Уран") && uraniumConversions[mineral]) {
      let uraniumInput = document.getElementById('stock-Уран');
      let uraniumHave = available ? (available["Уран"] || 0) : (uraniumInput ? parseInputNumber(uraniumInput.value) : 0);
      max += Math.floor(uraniumHave / (uraniumConversions[mineral].amount * 1.1));
    }
    // Обновить поле ввода (ограничить максимум)
    const input = document.getElementById('convert-amount-' + mineral);
    if (input) {
      input.max = max;
      if (parseInputNumber(input.value) > max) input.value = formatNumber(max);
    }
    // Визуальный UX-фидбэк для максимума минералов
    const maxSpan = document.getElementById('max-convert-' + mineral);
    if (maxSpan) maxSpan.textContent = max > 0 ? `(макс: ${max})` : '';
  });
}

// Включение/отключение полей преобразования минералов по чекбоксам
function toggleMineralInputs(oreName) {
  // Для каждой руды определяем, какие минералы можно из неё преобразовать
  const oreToMinerals = {
    "Железная руда": ["Митрацит", "Иридиум", "Крокит", "Брадий", "Титанит"],
    "Уран": ["Митрацит", "Иридиум", "Крокит", "Брадий", "Титанит"],
    "Полиэлементная руда": ["Митрацит", "Иридиум", "Крокит", "Брадий", "Титанит"],
    "Полиорганическая руда": ["Митрацит", "Иридиум", "Крокит", "Брадий", "Титанит"]
  };
  const minerals = oreToMinerals[oreName] || [];
  const isChecked = document.getElementById('convert-' + oreName.replace(/ /g, '-'))?.checked;
  minerals.forEach(mineral => {
    const input = document.getElementById('convert-amount-' + mineral);
    if (input) {
      // Разрешаем редактирование только если хотя бы один чекбокс включён
      // Если хотя бы один чекбокс включён, поле должно быть доступно для ввода
      // Проверяем все чекбоксы
      let enabled = false;
      ["Железная руда", "Уран", "Полиэлементная руда", "Полиорганическая руда"].forEach(ore => {
        const cb = document.getElementById('convert-' + ore.replace(/ /g, '-'));
        if (cb && cb.checked) enabled = true;
      });
      input.disabled = !enabled;
      if (!enabled) input.value = "-";
      else if (input.value === "-") input.value = "0";
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

// Форматирование числа в короткую строку (k, kk, kkk, т)
function shortNumber(num) {
  num = typeof num === "string" ? parseInputNumber(num) : num;
  if (!isFinite(num) || isNaN(num)) return "0";
  if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(3).replace(/\.?0+$/, '') + 'т';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(3).replace(/\.?0+$/, '') + 'ккк';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(3).replace(/\.?0+$/, '') + 'кк';
  if (num >= 1_000) return (num / 1_000).toFixed(3).replace(/\.?0+$/, '') + 'к';
  return Math.floor(num).toString();
}

// Парсинг короткой строки обратно в число
function parseShortNumber(str) {
  if (typeof str !== "string") return 0;
  str = str.trim().replace(/\s+/g, '');
  if (str === "") return 0;
  let m;
  if ((m = str.match(/^([\d.,]+)т$/i))) return Math.round(parseFloat(m[1].replace(',', '.')) * 1_000_000_000_000);
  if ((m = str.match(/^([\д.,]+)ккк$/i))) return Math.round(parseFloat(m[1].replace(',', '.')) * 1_000_000_000);
  if ((m = str.match(/^([\д.,]+)кк$/i))) return Math.round(parseFloat(m[1].replace(',', '.')) * 1_000_000);
  if ((m = str.match(/^([\д.,]+)к$/i))) return Math.round(parseFloat(m[1].replace(',', '.')) * 1_000);
  return parseInt(str, 10) || 0;
}

// Парсинг строки с "трлн", "т", "к", "кк", "ккк" или пробелами в целое число
function parseInputNumber(str) {
  if (typeof str !== "string") return 0;
  str = str.trim().replace(/\s+/g, ''); // удаляем все пробелы
  if (str === "") return 0;

  // Унифицируем буквы: рус/англ
  str = str
    .replace(/trln/gi, 'трлн')
    .replace(/t/gi, 'т')
    .replace(/k/gi, 'к');

  // "трлн" или "т" (триллионы)
  const trlnMatch = str.match(/^([\d.,]+)(т|трлн)$/i);
  if (trlnMatch) {
    let val = trlnMatch[1].replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000_000_000);
    return 0;
  }
  if (str.toLowerCase().includes('трлн') || str.toLowerCase().endsWith('т')) {
    let val = str.replace(/трлн|т/gi, '').replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000_000_000);
    return 0;
  }

  // "ккк" (миллиард)
  const kkkMatch = str.match(/^([\д.,]+)ккк$/i);
  if (kkkMatch) {
    let val = kkkMatch[1].replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000_000);
    return 0;
  }
  if (str.toLowerCase().endsWith('ккк')) {
    let val = str.replace(/ккк/gi, '').replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000_000);
    return 0;
  }

  // "кк" (миллионы)
  const kkMatch = str.match(/^([\д.,]+)кк$/i);
  if (kkMatch) {
    let val = kkMatch[1].replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000);
    return 0;
  }
  if (str.toLowerCase().endsWith('кк')) {
    let val = str.replace(/кк/gi, '').replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000_000);
    return 0;
  }

  // "к" (тысячи)
  const kMatch = str.match(/^([\д.,]+)к$/i);
  if (kMatch) {
    let val = kMatch[1].replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000);
    return 0;
  }
  if (str.toLowerCase().endsWith('к')) {
    let val = str.replace(/к/gi, '').replace(',', '.');
    let num = parseFloat(val);
    if (!isNaN(num)) return Math.round(num * 1_000);
    return 0;
  }

  // Обычное число
  return parseInt(str, 10) || 0;
}

// Форматирование ввода: разрешить только числа, пробелы, точку, запятую и "трлн", форматировать только при потере фокуса
function formatLeftInputs() {
  document.querySelectorAll('.ore-input, .mineral-input').forEach(el => {
    // Фильтрация ввода: только цифры, пробелы, точка, запятая, "трлн", "т", "к", "k", "t", "trln"
    el.addEventListener('input', function () {
      let filtered = this.value.replace(/[^0-9.,\sтрлнткkKТТLlNn]/gi, '');
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
    // При вставке из буфера: поддержка "17.646 трлн", "10kk", "10k", "10trln"
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      let text = (e.clipboardData || window.clipboardData).getData('text');
      let filtered = text.replace(/[^0-9.,\sтрлнткkKТТLlNn]/gi, '');
      let val = parseInputNumber(filtered);
      this.value = formatNumber(val);
      this.title = val > 0 ? val.toLocaleString('ru-RU') : '';
      if (typeof calculateMaterials === "function") calculateMaterials();
      if (typeof updateConverterLimits === "function") updateConverterLimits();
    });
  });
}

// === Новый алгоритм расчёта по шагам ===

function calculateMaterials() {
  // --- Сбор данных ---
  // 1. Исходные запасы
  const ores = ["Железная руда", "Полиэлементная руда", "Полиорганическая руда", "Уран"];
  const minerals = ["Митрацит", "Иридиум", "Крокит", "Брадий", "Титанит"];
  const stock = {};
  ores.concat(minerals).forEach(mat => {
    const el = document.getElementById('stock-' + mat.replace(/ /g, '-'));
    stock[mat] = el ? parseInputNumber(el.value) : 0;
  });

  // 2. Чекбоксы преобразования
  const enabledConvert = {};
  ores.forEach(ore => {
    const cb = document.getElementById('convert-' + ore.replace(/ /g, '-'));
    enabledConvert[ore] = cb ? cb.checked : false;
  });

  // 3. Желаемое преобразование минералов
  const convertAmounts = {};
  minerals.forEach(mineral => {
    const el = document.getElementById('convert-amount-' + mineral);
    convertAmounts[mineral] = el ? parseInputNumber(el.value) : 0;
  });

  // --- Шаг 1. Производство материалов из ресурсов ---
  // Копия запасов для резервирования
  let available = {...stock};
  // Сколько потрачено руды/минералов на материалы
  let usedForMaterials = {};
  // Сколько произведено материалов
  let producedMaterials = {};
  Object.entries(recipes).forEach(([material, recipe]) => {
    let canMake = Infinity;
    Object.entries(recipe).forEach(([mat, qty]) => {
      canMake = Math.min(canMake, Math.floor((available[mat] || 0) / qty));
    });
    if (canMake > 0 && canMake !== Infinity) {
      producedMaterials[material] = canMake;
      Object.entries(recipe).forEach(([mat, qty]) => {
        usedForMaterials[mat] = (usedForMaterials[mat] || 0) + qty * canMake;
        available[mat] -= qty * canMake;
      });
    } else {
      producedMaterials[material] = 0;
    }
  });

  // --- Шаг 2. Преобразование руды/урана в минералы ---
  // Сколько реально можно преобразовать каждого минерала
  let maxConvert = {};
  minerals.forEach(mineral => {
    let maxByOres = [];
    // Считаем максимум по каждой разрешённой руде/урану
    if (oreConversions[mineral]) {
      oreConversions[mineral].forEach(conv => {
        if (enabledConvert[conv.ore]) {
          let oreLeft = available[conv.ore] || 0;
          maxByOres.push(Math.floor(oreLeft / (conv.amount * 1.1)));
        }
      });
    }
    if (enabledConvert["Уран"] && uraniumConversions[mineral]) {
      let oreLeft = available["Уран"] || 0;
      maxByOres.push(Math.floor(oreLeft / (uraniumConversions[mineral].amount * 1.1)));
    }
    maxConvert[mineral] = maxByOres.length ? Math.min(...maxByOres) : 0;
    // Ограничиваем ввод пользователя
    if (convertAmounts[mineral] > maxConvert[mineral]) {
      convertAmounts[mineral] = maxConvert[mineral];
      const el = document.getElementById('convert-amount-' + mineral);
      if (el) el.value = shortNumber(maxConvert[mineral]);
    }
  });

  // --- Распределение руды на преобразование (пропорционально) ---
  // Сколько руды реально потрачено на преобразование
  let usedForConvert = {};
  minerals.forEach(mineral => {
    let need = convertAmounts[mineral];
    if (need <= 0) return;
    // Считаем сколько источников (разрешённых чекбоксом)
    let sources = [];
    if (oreConversions[mineral]) {
      oreConversions[mineral].forEach(conv => {
        if (enabledConvert[conv.ore]) sources.push({ore: conv.ore, amount: conv.amount});
      });
    }
    if (enabledConvert["Уран"] && uraniumConversions[mineral]) {
      sources.push({ore: "Уран", amount: uraniumConversions[mineral].amount});
    }
    if (sources.length === 0) return;
    // Если только один источник — всё берём из него
    if (sources.length === 1) {
      let ore = sources[0].ore;
      let amount = sources[0].amount;
      let needOre = Math.ceil(need * amount * 1.1);
      usedForConvert[ore] = (usedForConvert[ore] || 0) + needOre;
      available[ore] -= needOre;
    } else {
      // Пропорционально делим между источниками
      let total = sources.reduce((sum, s) => sum + 1, 0);
      let leftNeed = need;
      sources.forEach((src, idx) => {
        let part = idx === sources.length - 1 ? leftNeed : Math.floor(need / sources.length);
        let needOre = Math.ceil(part * src.amount * 1.1);
        usedForConvert[src.ore] = (usedForConvert[src.ore] || 0) + needOre;
        available[src.ore] -= needOre;
        leftNeed -= part;
      });
    }
    // Добавляем минералы к запасу (перенесено до создания availableAfterConvert)
    if (sources.length > 0 && need > 0) {
      available[mineral] = (available[mineral] || 0) + need;
    }
  });

  // После преобразования: второй проход по производству материалов из новых минералов
  let availableAfterConvert = {...available};
  let usedForMaterials2 = {};
  let producedMaterials2 = {};
  Object.entries(recipes).forEach(([material, recipe]) => {
    let canMake = Infinity;
    Object.entries(recipe).forEach(([mat, qty]) => {
      canMake = Math.min(canMake, Math.floor((availableAfterConvert[mat] || 0) / qty));
    });
    if (canMake > 0 && canMake !== Infinity) {
      producedMaterials2[material] = canMake;
      Object.entries(recipe).forEach(([mat, qty]) => {
        usedForMaterials2[mat] = (usedForMaterials2[mat] || 0) + qty * canMake;
        availableAfterConvert[mat] -= qty * canMake;
      });
    } else {
      producedMaterials2[material] = 0;
    }
  });

  // --- Шаг 3. Остатки ---
  ores.concat(minerals).forEach(mat => {
    const leftSpan = document.getElementById('left-' + mat.replace(/ /g, '-'));
    let left = availableAfterConvert[mat] || 0;
    if (leftSpan) {
      // UX: title с предупреждением если чекбокс снят
      if (ores.includes(mat) && !enabledConvert[mat] && left > 0) {
        leftSpan.title = "Осталась руда, но чекбокс не активен — не переработается!";
        leftSpan.style.color = 'red';
      } else if (left > 0) {
        leftSpan.title = left.toLocaleString('ru-RU');
        leftSpan.style.color = '';
      } else {
        leftSpan.title = '';
        leftSpan.style.color = '';
      }
      leftSpan.textContent = left > 0 ? formatNumber(left) : '-';
      leftSpan.setAttribute('data-raw', left);
    }
  });

  // --- Обновляем UI для материалов (нижняя таблица) ---
  Object.keys(recipes).forEach(material => {
    const total = (producedMaterials[material] || 0) + (producedMaterials2[material] || 0);
    const el = document.getElementById('material-output-' + material.replace(/ /g, '-'));
    if (el) {
      el.textContent = formatNumber(total);
      el.setAttribute('data-raw', total);
      el.title = total > 0 ? total.toLocaleString('ru-RU') : '';
    }
  });

  // Только один вызов, и с передачей availableAfterConvert для лимитов
  updateConverterLimits(availableAfterConvert);
  updateExchangeStringInput();
}

// Очистка остатков: переносит остатки в поля преобразования и уменьшает количество руды/минералов
function clearRemainders() {
  // 1. Собираем все остатки руды и минералов (левая таблица)
  const remainders = {};
  baseOres.concat(Object.keys(oreConversions), Object.keys(uraniumConversions)).forEach(mat => {
    const leftSpan = document.getElementById('left-' + mat.replace(/ /g, '-'));
    remainders[mat] = leftSpan ? parseInputNumber(leftSpan.textContent) : 0;
  });

  // 2. Добавляем остатки в поля преобразования минералов (если это минерал)
  Object.keys(oreConversions).concat(Object.keys(uraniumConversions)).forEach(mineral => {
    const convertInput = document.getElementById('convert-amount-' + mineral);
    if (convertInput && remainders[mineral] > 0) {
      let prev = parseInputNumber(convertInput.value);
      let max = parseInt(convertInput.max, 10);
      if (isNaN(max)) max = Infinity;
      let sum = prev + remainders[mineral];
      if (sum > max) {
        convertInput.value = shortNumber(max);
      } else {
        convertInput.value = shortNumber(sum);
      }
    }
  });

  // 3. Обнуляем остатки руды и минералов в инпутах (левая таблица)
  baseOres.concat(Object.keys(oreConversions), Object.keys(uraniumConversions)).forEach(mat => {
    const stockInput = document.getElementById('stock-' + mat.replace(/ /g, '-'));
    const leftSpan = document.getElementById('left-' + mat.replace(/ /g, '-'));
    if (stockInput && leftSpan) {
      let current = parseInputNumber(stockInput.value);
      let left = parseInputNumber(leftSpan.textContent);
      if (left > 0) {
        stockInput.value = shortNumber(Math.max(0, current - left));
        leftSpan.textContent = '-';
        leftSpan.style.color = '';
      }
    }
  });

  // 4. Пересчитываем всё с новыми значениями
  calculateMaterials();
  updateConverterLimits(); // теперь всегда обновляем лимиты после очистки остатков
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

// Получить строку обмена (все данные)
function getExchangeString() {
  const parts = [];

  // Все значения руды и минералов (левый блок)
  document.querySelectorAll('.ore-input').forEach(el => {
    parts.push(shortNumber(el.value));
  });

  // Все чекбоксы преобразования (0/1)
  document.querySelectorAll('.convert-checkbox').forEach(cb => {
    parts.push(cb.checked ? "1" : "0");
  });

  // Все значения преобразователя минералов
  document.querySelectorAll('.mineral-input').forEach(el => {
    parts.push(shortNumber(el.value));
  });

  // Разделитель — запятая
  return parts.join(',');
}

// Загрузить данные из короткой строки обмена
function setExchangeString(str) {
  if (!str) return;
  const parts = str.trim().split(',');
  let idx = 0;

  // Восстановить значения руды и минералов
  document.querySelectorAll('.ore-input').forEach(el => {
    if (parts[idx] !== undefined) {
      el.value = shortNumber(parseShortNumber(parts[idx]));
      el.title = parseShortNumber(parts[idx]) > 0 ? parseShortNumber(parts[idx]).toLocaleString('ru-RU') : '';
    }
    idx++;
  });

  // Восстановить чекбоксы
  document.querySelectorAll('.convert-checkbox').forEach(cb => {
    if (parts[idx] !== undefined) {
      cb.checked = parts[idx] === "1";
      if (window.toggleMineralInputs) window.toggleMineralInputs(cb.getAttribute('data-ore'));
    }
    idx++;
  });

  // Восстановить значения преобразователя минералов
  document.querySelectorAll('.mineral-input').forEach(el => {
    if (parts[idx] !== undefined) {
      el.value = shortNumber(parseShortNumber(parts[idx]));
      el.title = parseShortNumber(parts[idx]) > 0 ? parseShortNumber(parts[idx]).toLocaleString('ru-RU') : '';
    }
    idx++;
  });

  calculateMaterials();
  updateConverterLimits();
  updateExchangeStringInput();
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
  // Привязываем обмен
  attachExchangeListeners();
  // Обновить строку обмена при инициализации
  updateExchangeStringInput();
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

// Обновление строки обмена
function updateExchangeStringInput() {
  const input = document.getElementById('exchange-string');
  if (input) {
    input.value = getExchangeString();
  }
}

function attachExchangeListeners() {
  // Кнопка "Копировать строку"
  const copyBtn = document.getElementById('copy-exchange-string');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      updateExchangeStringInput();
      const input = document.getElementById('exchange-string');
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
        try {
          document.execCommand('copy');
        } catch (e) {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(input.value);
          }
        }
      }
    });
  }
  // Кнопка "Загрузить"
  const loadBtn = document.getElementById('load-exchange-string');
  if (loadBtn) {
    loadBtn.addEventListener('click', function() {
      const input = document.getElementById('exchange-string');
      if (input) {
        setExchangeString(input.value);
        // После загрузки обновить строку обмена (на случай форматирования)
        updateExchangeStringInput();
      }
    });
  }
}

// Автоматическое обновление строки обмена при любом изменении инпутов
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    document.querySelectorAll('.ore-input, .mineral-input, .convert-checkbox').forEach(el => {
      el.addEventListener('input', updateExchangeStringInput);
      el.addEventListener('change', updateExchangeStringInput);
    });
  }, 0);
});