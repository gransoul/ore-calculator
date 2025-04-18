
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

function getEfficiency(select) {
  if (!select) return 1;
  const value = select.value.replace('%', '');
  return parseInt(value, 10) / 100;
}

function copyRowValue(name, input) {
  const value = input.value;
  const parsed = parseInputToNumber(value);
  navigator.clipboard.writeText(`${formatNumberWithSpaces(parsed)}`);
}

function copyMaterialValue(name, outputSpan) {
  const raw = outputSpan.dataset.raw || "0";
  navigator.clipboard.writeText(`${formatNumberWithSpaces(raw)}`);
}

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

const conversionRates = {
  "Железная руда": { "Митрацит": 4.4, "Иридиум": 4.4, "Крокит": 6.6, "Брадий": 22, "Титанит": 44 },
  "Полиэлементная руда": { "Митрацит": 4.4, "Иридиум": 4.4, "Крокит": 6.6, "Брадий": 22, "Титанит": 44 },
  "Полиорганическая руда": { "Митрацит": 4.4, "Иридиум": 4.4, "Крокит": 6.6, "Брадий": 22, "Титанит": 44 },
  "Уран": { "Митрацит": 2.2, "Иридиум": 2.2, "Крокит": 3.3, "Брадий": 11, "Титанит": 22 }
};

function updateMineralInputsState() {
  const anyChecked = Array.from(document.querySelectorAll(".convert-checkbox"))
    .some(cb => cb.checked);

  document.querySelectorAll(".mineral-input").forEach(input => {
    if (anyChecked) {
      input.disabled = false;
      if (input.value === "-" || input.value === "") input.value = "0";
    } else {
      input.value = "-";
      input.disabled = true;
    }
  });
}

function calculateMaterials() {
  updateMineralInputsState();
  const oreInputs = getOreValues();
  const oreAvailable = { ...oreInputs };
  const oreUsed = {};

  // 1. Производство материалов
  document.querySelectorAll("#right-block .material-output").forEach(output => {
    const row = output.closest("tr");
    const name = row.querySelector("td:nth-child(2)").textContent.trim();
    const recipe = recipes[name];
    const select = row.querySelector("select");
    const efficiency = getEfficiency(select);
    if (!recipe) return;

    let maxPossible = Infinity;
    for (const [res, amount] of Object.entries(recipe)) {
      const available = oreAvailable[res] || 0;
      maxPossible = Math.min(maxPossible, Math.floor(available / amount));
    }

    const result = Math.floor(maxPossible * efficiency);
    output.dataset.raw = result;
    output.textContent = formatTrillions(result);

    for (const [res, amount] of Object.entries(recipe)) {
      const used = amount * maxPossible;
      oreUsed[res] = (oreUsed[res] || 0) + used;
      oreAvailable[res] -= used;
    }
  });

  // 2. Преобразование руды / урана в минералы
  document.querySelectorAll(".mineral-input").forEach(input => {
    const row = input.closest("tr");
    const mineralName = row.querySelector("td:nth-child(2)").textContent.trim();
    const desired = parseInputToNumber(input.value);
    let remaining = desired;

    for (const checkbox of document.querySelectorAll(".convert-checkbox:checked")) {
      const base = checkbox.dataset.ore;
      const rate = conversionRates[base]?.[mineralName];
      if (!rate || oreAvailable[base] <= 0 || remaining <= 0) continue;

      const possible = Math.floor(oreAvailable[base] / rate);
      const toConvert = Math.min(possible, remaining);
      oreUsed[base] = (oreUsed[base] || 0) + toConvert * rate;
      oreAvailable[base] -= toConvert * rate;
      remaining -= toConvert;
    }

    const uraniumRate = conversionRates["Уран"]?.[mineralName];
    if (uraniumRate && oreAvailable["Уран"] > 0 && remaining > 0) {
      const possible = Math.floor(oreAvailable["Уран"] / uraniumRate);
      const toConvert = Math.min(possible, remaining);
      oreUsed["Уран"] = (oreUsed["Уран"] || 0) + toConvert * uraniumRate;
      oreAvailable["Уран"] -= toConvert * uraniumRate;
      remaining -= toConvert;
    }

    if (remaining > 0) input.classList.add("red");
    else input.classList.remove("red");
  });

  // 3. Остатки
  document.querySelectorAll(".left-remaining").forEach(span => {
    const name = span.dataset.ore;
    const left = Math.floor(oreAvailable[name] || 0);
    if (left > 0) {
      span.textContent = formatTrillions(left);
      span.classList.add("red");
    } else {
      span.textContent = "-";
      span.classList.remove("red");
    }
  });
}

function attachCalcListeners() {
  document.querySelectorAll(".ore-input, .mineral-input").forEach(input => {
    input.addEventListener("input", calculateMaterials);
    input.addEventListener("blur", () => {
      const parsed = parseInputToNumber(input.value);
      input.value = (input.disabled ? "-" : formatTrillions(parsed));
      calculateMaterials();
    });
  });

  document.querySelectorAll("select").forEach(select => {
    select.addEventListener("change", calculateMaterials);
  });

  document.querySelectorAll(".convert-checkbox").forEach(cb => {
    cb.addEventListener("change", calculateMaterials);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  attachCalcListeners();
  calculateMaterials();
});
