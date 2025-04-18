// Форматирование чисел
function formatNumberWithSpaces(value) {
  const str = value.toString().replace(/\D/g, '');
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function parseInputToNumber(value) {
  const cleaned = value.replace(/\s+/g, '').replace(/,/g, '.');
  if (cleaned.toLowerCase().includes('трлн')) {
    const num = parseFloat(cleaned.replace(/[^\d\.]/g, ''));
    return Math.round(num * 1_000_000_000_000);
  }
  return parseInt(cleaned) || 0;
}

function formatTrillions(value) {
  const num = typeof value === 'number' ? value : parseInputToNumber(value);
  if (num >= 1_000_000_000_000) {
    const trillions = num / 1_000_000_000_000;
    let result = trillions.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return result + ' трлн';
  }
  return formatNumberWithSpaces(num);
}

// Копирование
function copyRowValue(name, input) {
  const value = input.value;
  const parsed = parseInputToNumber(value);
  const text = `${name}: ${formatNumberWithSpaces(parsed)} шт.`;
  navigator.clipboard.writeText(text);
}

function copyMaterialValue(name, outputSpan) {
  const raw = outputSpan.dataset.raw || "0";
  const text = `${name}: ${formatNumberWithSpaces(raw)} шт.`;
  navigator.clipboard.writeText(text);
}

// Получение значений руды и минералов
function getOreValues() {
  const inputs = document.querySelectorAll(".ore-input, .mineral-input");
  const oreValues = {};
  inputs.forEach(input => {
    const row = input.closest("tr");
    const oreName = row.querySelector("td:nth-child(2)").textContent.trim();
    oreValues[oreName] = parseInputToNumber(input.value);
  });
  return oreValues;
}

// Получение процента эффективности
function getEfficiency(select) {
  if (!select) return 1;
  const value = select.value.replace('%', '');
  return parseInt(value, 10) / 100;
}

// Рецепты производства
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

// Правила преобразования
const conversionRules = {
  "Уран": { base: 4, bonus: 0.1 },
  "Митрацит": { base: 4, bonus: 0.1 },
  "Иридиум": { base: 4, bonus: 0.1 },
  "Крокит": { base: 6, bonus: 0.1 },
  "Брадий": { base: 20, bonus: 0.1 },
  "Титанит": { base: 40, bonus: 0.1 },
};

// Основная функция расчёта
function calculateMaterials() {
  const ores = getOreValues();
  const baseOres = ["Железная руда", "Полиэлементная руда", "Полиорганическая руда"];
  const availableOres = { ...ores };

  // Преобразование базовой руды в минералы
  for (const [mineral, { base, bonus }] of Object.entries(conversionRules)) {
    const requiredPerUnit = base * (1 + bonus);

    for (const baseOre of baseOres) {
      const baseAvailable = availableOres[baseOre] || 0;
      const convertCount = Math.floor(baseAvailable / requiredPerUnit);
      if (convertCount > 0) {
        availableOres[mineral] = (availableOres[mineral] || 0) + convertCount;
        availableOres[baseOre] -= convertCount * requiredPerUnit;
        break;
      }
    }
  }

  // Вывод результатов в правом блоке
  document.querySelectorAll("#right-block .material-output").forEach(output => {
    const row = output.closest("tr");
    const name = row.querySelector("td:nth-child(2)").textContent.trim();
    const recipe = recipes[name];
    const select = row.querySelector("select");
    const efficiency = getEfficiency(select);

    if (!recipe) return;

    let maxOutput = Infinity;
    for (const [ore, required] of Object.entries(recipe)) {
      const available = availableOres[ore] || 0;
      maxOutput = Math.min(maxOutput, Math.floor(available / required));
    }

    const result = Math.floor(maxOutput * efficiency);
    output.dataset.raw = result;
    output.textContent = formatTrillions(result);
  });

  // Обновление остатков
  document.querySelectorAll("#left-block .left-remaining").forEach(span => {
    const name = span.dataset.ore;
    const left = Math.floor(availableOres[name] || 0);
    if (left > 0) {
      span.textContent = formatTrillions(left);
      span.classList.add("red");
    } else {
      span.textContent = "-";
      span.classList.remove("red");
    }
  });
}

// Форматирование и обработка ввода в рудах и минералах
function formatLeftInputs() {
  document.querySelectorAll(".ore-input, .mineral-input").forEach(input => {
    let lastRawValue = input.value;

    input.addEventListener("focus", () => {
      input.value = lastRawValue;
    });

    input.addEventListener("input", () => {
      lastRawValue = input.value;
    });

    input.addEventListener("blur", () => {
      const parsed = parseInputToNumber(input.value);
      lastRawValue = formatTrillions(parsed);
      input.value = lastRawValue;
    });

    const parsed = parseInputToNumber(input.value);
    input.value = formatTrillions(parsed);
  });
}

// ✅ Исправлено: включение минералов только по нужным чекбоксам
function updateMineralInputsState() {
  const checkboxes = document.querySelectorAll(
    '.convert-checkbox[data-ore="Железная руда"], ' +
    '.convert-checkbox[data-ore="Полиэлементная руда"], ' +
    '.convert-checkbox[data-ore="Полиорганическая руда"]'
  );
  const anyChecked = Array.from(checkboxes).some(cb => cb.checked);

  setTimeout(() => {
    document.querySelectorAll(".mineral-input").forEach(input => {
      input.disabled = !anyChecked;
    });
  }, 10);
}

// Обработчики событий
function attachCalcListeners() {
  document.querySelectorAll(".ore-input").forEach(input => {
    input.addEventListener("input", calculateMaterials);
    input.addEventListener("blur", calculateMaterials);
  });

  document.querySelectorAll(".mineral-input").forEach(input => {
    input.addEventListener("input", calculateMaterials);
    input.addEventListener("blur", calculateMaterials);
  });

  document.querySelectorAll("select").forEach(select => {
    select.addEventListener("change", calculateMaterials);
  });

  document.querySelectorAll(".convert-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      calculateMaterials();
      updateMineralInputsState(); // ← важный вызов
    });
  });

  updateMineralInputsState();
}
